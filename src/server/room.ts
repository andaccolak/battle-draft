import type { Server } from "socket.io";
import type {
  BattlePayload,
  BracketRound,
  Item,
  LuckCard,
  Phase,
  RoomSnapshot,
  Slot,
  TimelineEntry
} from "@/lib/game/types";
import { DRAFT_TIME_MS, LUCK_TIME_MS, SLOTS, TOTAL_DRAFT_ROUNDS } from "@/lib/game/types";
import { rollDraftHand, rollLuckHand, applyBuildCard } from "@/lib/game/draft";
import { randomEvent, type EventDef } from "@/lib/game/events";
import { simulateBattle } from "@/lib/game/battle";
import { persistMatch } from "./persistence";

export interface ServerPlayer {
  id: string;
  socketId: string | null;
  nickname: string;
  isBot: boolean;
  connected: boolean;
  equipment: Partial<Record<Slot, Item>>;
  currentOffer: Item[] | null;
  offerPicked: boolean;
  luckOffer: LuckCard[] | null;
  luckCard: LuckCard | null;
  luckNote: string | null;
  eliminated: boolean;
  wins: number;
}

interface BracketMatchInternal {
  a: string | null;
  b: string | null;
  winner: string | null;
}

export interface BattleRecord {
  roundIndex: number;
  playerA: string;
  playerB: string;
  winner: string;
  log: TimelineEntry[];
}

const EVENT_REVEAL_MS = 7000;
const BATTLE_GAP_MS = 5000;

const BOT_NAMES = [
  "Bot Kemal",
  "Bot Ayşe",
  "Bot Şahin",
  "Bot Zeynep",
  "Bot Rambo",
  "Bot Cengiz",
  "Bot Elif",
  "Bot Baron",
  "Bot Pala",
  "Bot Fırtına"
];

export class GameRoom {
  code: string;
  io: Server;
  phase: Phase = "lobby";
  players = new Map<string, ServerPlayer>();
  hostId: string | null = null;
  draftRound = 0;
  deadline: number | null = null;
  timer: NodeJS.Timeout | null = null;
  event: EventDef | null = null;
  bracket: BracketMatchInternal[][] = [];
  currentRound = 0;
  currentMatch = 0;
  battle: BattlePayload | null = null;
  battleRecords: BattleRecord[] = [];
  champion: string | null = null;
  matchCounter = 0;

  constructor(code: string, io: Server) {
    this.code = code;
    this.io = io;
  }

  get channel(): string {
    return `room:${this.code}`;
  }

  addPlayer(playerId: string, socketId: string, nickname: string): ServerPlayer {
    const player: ServerPlayer = {
      id: playerId,
      socketId,
      nickname,
      isBot: false,
      connected: true,
      equipment: {},
      currentOffer: null,
      offerPicked: false,
      luckOffer: null,
      luckCard: null,
      luckNote: null,
      eliminated: false,
      wins: 0
    };
    this.players.set(playerId, player);
    if (!this.hostId) this.hostId = playerId;
    return player;
  }

  removeFromLobby(playerId: string): void {
    if (this.phase !== "lobby") return;
    this.players.delete(playerId);
    if (this.hostId === playerId) {
      const humans = [...this.players.values()].filter((p) => !p.isBot);
      this.hostId = humans[0]?.id ?? [...this.players.keys()][0] ?? null;
    }
  }

  addBots(count: number): void {
    const taken = new Set([...this.players.values()].map((p) => p.nickname.toLowerCase()));
    const pool = BOT_NAMES.filter((n) => !taken.has(n.toLowerCase()));
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const x = pool[i];
      const y = pool[j];
      if (x !== undefined && y !== undefined) {
        pool[i] = y;
        pool[j] = x;
      }
    }
    for (let i = 0; i < count && this.players.size < 8; i++) {
      const nickname = pool[i] ?? `Bot ${i + 1}`;
      const bot: ServerPlayer = {
        id: `bot_${this.code}_${this.matchCounter}_${i}`,
        socketId: null,
        nickname,
        isBot: true,
        connected: true,
        equipment: {},
        currentOffer: null,
        offerPicked: false,
        luckOffer: null,
        luckCard: null,
        luckNote: null,
        eliminated: false,
        wins: 0
      };
      this.players.set(bot.id, bot);
    }
  }

  removeBots(): void {
    for (const [id, p] of this.players) {
      if (p.isBot) this.players.delete(id);
    }
  }

  scheduleBotDraftPicks(): void {
    const round = this.draftRound;
    for (const p of this.players.values()) {
      if (!p.isBot) continue;
      const delay = 1500 + Math.random() * 5000;
      setTimeout(() => {
        if (this.phase !== "draft" || this.draftRound !== round || p.offerPicked || !p.currentOffer) return;
        const pickable = p.currentOffer.filter((i) => !p.equipment[i.slot]);
        const pick = pickable[Math.floor(Math.random() * pickable.length)];
        this.pickItem(p.id, pick ? pick.id : null);
      }, delay);
    }
  }

  scheduleBotLuckPicks(): void {
    for (const p of this.players.values()) {
      if (!p.isBot) continue;
      const delay = 1500 + Math.random() * 5000;
      setTimeout(() => {
        if (this.phase !== "luck" || p.luckCard || !p.luckOffer) return;
        const card = p.luckOffer[Math.floor(Math.random() * p.luckOffer.length)];
        if (card) this.pickLuckCard(p.id, card.id);
      }, delay);
    }
  }

  clearTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.deadline = null;
  }

  setTimer(ms: number, fn: () => void): void {
    this.clearTimer();
    this.deadline = Date.now() + ms;
    this.timer = setTimeout(fn, ms);
  }

  snapshot(): RoomSnapshot {
    return {
      code: this.code,
      phase: this.phase,
      hostId: this.hostId ?? "",
      players: [...this.players.values()].map((p) => ({
        id: p.id,
        nickname: p.nickname,
        isHost: p.id === this.hostId,
        isBot: p.isBot,
        connected: p.connected,
        hasPicked: this.phase === "draft" ? p.offerPicked : this.phase === "luck" ? p.luckCard !== null : false,
        equipment: p.equipment,
        luckCard: this.phase === "lobby" || this.phase === "draft" ? null : p.luckCard,
        eliminated: p.eliminated,
        wins: p.wins
      })),
      draftRound: this.draftRound,
      totalDraftRounds: TOTAL_DRAFT_ROUNDS,
      deadline: this.deadline,
      event: this.event ? { id: this.event.id, name: this.event.name, emoji: this.event.emoji, description: this.event.description } : null,
      bracket: this.publicBracket(),
      battle: this.battle,
      champion: this.champion
    };
  }

  publicBracket(): BracketRound[] | null {
    if (this.bracket.length === 0) return null;
    const nameOf = (id: string | null) => (id ? this.players.get(id)?.nickname ?? null : null);
    return this.bracket.map((round) => ({
      matches: round.map((m) => ({ a: nameOf(m.a), b: nameOf(m.b), winner: nameOf(m.winner) }))
    }));
  }

  broadcast(): void {
    this.io.to(this.channel).emit("room:state", this.snapshot());
  }

  sendPrivate(): void {
    for (const p of this.players.values()) {
      if (!p.socketId || !p.connected) continue;
      if (this.phase === "draft" && p.currentOffer) {
        const lockedSlots = SLOTS.filter((s) => p.equipment[s]);
        this.io.to(p.socketId).emit("draft:offer", {
          round: this.draftRound,
          items: p.currentOffer,
          lockedSlots,
          picked: p.offerPicked,
          canPickAny: p.currentOffer.some((i) => !lockedSlots.includes(i.slot))
        });
      }
      if (this.phase === "luck" && p.luckOffer) {
        this.io.to(p.socketId).emit("luck:offer", { cards: p.luckOffer, picked: p.luckCard !== null });
      }
    }
  }

  startGame(): void {
    if (this.phase !== "lobby") return;
    this.matchCounter++;
    if (this.players.size === 1) this.addBots(3);
    if (this.players.size < 2) return;
    this.draftRound = 0;
    this.battleRecords = [];
    this.champion = null;
    this.event = null;
    this.bracket = [];
    this.battle = null;
    for (const p of this.players.values()) {
      p.equipment = {};
      p.currentOffer = null;
      p.offerPicked = false;
      p.luckOffer = null;
      p.luckCard = null;
      p.luckNote = null;
      p.eliminated = false;
      p.wins = 0;
    }
    this.startDraftRound();
  }

  startDraftRound(): void {
    this.phase = "draft";
    this.draftRound++;
    for (const p of this.players.values()) {
      p.currentOffer = rollDraftHand();
      p.offerPicked = false;
    }
    this.setTimer(DRAFT_TIME_MS, () => this.finishDraftRound());
    this.scheduleBotDraftPicks();
    this.broadcast();
    this.sendPrivate();
  }

  pickItem(playerId: string, itemId: string | null): void {
    if (this.phase !== "draft") return;
    const p = this.players.get(playerId);
    if (!p || p.offerPicked || !p.currentOffer) return;
    if (itemId === null) {
      const pickable = p.currentOffer.filter((i) => !p.equipment[i.slot]);
      if (pickable.length > 0) return;
      p.offerPicked = true;
    } else {
      const item = p.currentOffer.find((i) => i.id === itemId);
      if (!item || p.equipment[item.slot]) return;
      p.equipment[item.slot] = item;
      p.offerPicked = true;
    }
    this.broadcast();
    this.sendPrivate();
    if ([...this.players.values()].every((pl) => pl.offerPicked || !pl.connected)) {
      this.finishDraftRound();
    }
  }

  finishDraftRound(): void {
    if (this.phase !== "draft") return;
    this.clearTimer();
    for (const p of this.players.values()) {
      if (p.offerPicked || !p.currentOffer) continue;
      const pickable = p.currentOffer.filter((i) => !p.equipment[i.slot]);
      const pick = pickable[Math.floor(Math.random() * pickable.length)];
      if (pick) p.equipment[pick.slot] = pick;
      p.offerPicked = true;
    }
    if (this.draftRound >= TOTAL_DRAFT_ROUNDS) {
      this.startLuckPhase();
    } else {
      this.startDraftRound();
    }
  }

  startLuckPhase(): void {
    this.phase = "luck";
    for (const p of this.players.values()) {
      p.luckOffer = rollLuckHand();
      p.luckCard = null;
    }
    this.setTimer(LUCK_TIME_MS, () => this.finishLuckPhase());
    this.scheduleBotLuckPicks();
    this.broadcast();
    this.sendPrivate();
  }

  pickLuckCard(playerId: string, cardId: string): void {
    if (this.phase !== "luck") return;
    const p = this.players.get(playerId);
    if (!p || p.luckCard || !p.luckOffer) return;
    const card = p.luckOffer.find((c) => c.id === cardId);
    if (!card) return;
    p.luckCard = card;
    const applied = applyBuildCard(p.equipment, card.id);
    p.equipment = applied.equipment;
    p.luckNote = applied.note;
    if (p.socketId) this.io.to(p.socketId).emit("luck:offer", { cards: p.luckOffer, picked: true });
    this.broadcast();
    if ([...this.players.values()].every((pl) => pl.luckCard !== null || !pl.connected)) {
      this.finishLuckPhase();
    }
  }

  finishLuckPhase(): void {
    if (this.phase !== "luck") return;
    this.clearTimer();
    for (const p of this.players.values()) {
      if (p.luckCard || !p.luckOffer) continue;
      const card = p.luckOffer[Math.floor(Math.random() * p.luckOffer.length)];
      if (card) {
        p.luckCard = card;
        const applied = applyBuildCard(p.equipment, card.id);
        p.equipment = applied.equipment;
        p.luckNote = applied.note;
      }
    }
    this.startEventPhase();
  }

  startEventPhase(): void {
    this.phase = "event";
    this.event = randomEvent();
    this.buildBracket();
    this.broadcast();
    this.setTimer(EVENT_REVEAL_MS, () => this.startTournament());
  }

  buildBracket(): void {
    const ids = [...this.players.keys()];
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const a = ids[i];
      const b = ids[j];
      if (a !== undefined && b !== undefined) {
        ids[i] = b;
        ids[j] = a;
      }
    }
    const round: BracketMatchInternal[] = [];
    for (let i = 0; i < ids.length; i += 2) {
      round.push({ a: ids[i] ?? null, b: ids[i + 1] ?? null, winner: null });
    }
    this.bracket = [round];
    this.currentRound = 0;
    this.currentMatch = 0;
  }

  startTournament(): void {
    this.phase = "battle";
    this.playNextBattle();
  }

  playNextBattle(): void {
    const round = this.bracket[this.currentRound];
    if (!round) return;
    if (this.currentMatch >= round.length) {
      const winners = round.map((m) => m.winner).filter((w): w is string => w !== null);
      if (winners.length <= 1) {
        this.finishTournament(winners[0] ?? null);
        return;
      }
      const next: BracketMatchInternal[] = [];
      for (let i = 0; i < winners.length; i += 2) {
        next.push({ a: winners[i] ?? null, b: winners[i + 1] ?? null, winner: null });
      }
      this.bracket.push(next);
      this.currentRound++;
      this.currentMatch = 0;
      this.playNextBattle();
      return;
    }
    const match = round[this.currentMatch];
    if (!match) return;
    if (!match.a || !match.b) {
      match.winner = match.a ?? match.b;
      this.currentMatch++;
      this.broadcast();
      setTimeout(() => this.playNextBattle(), 1500);
      return;
    }
    const pa = this.players.get(match.a);
    const pb = this.players.get(match.b);
    const event = this.event;
    if (!pa || !pb || !event) return;
    const result = simulateBattle(
      { nickname: pa.nickname, equipment: pa.equipment, luckCard: pa.luckCard },
      { nickname: pb.nickname, equipment: pb.equipment, luckCard: pb.luckCard },
      event
    );
    pa.equipment = result.aEquipment;
    pb.equipment = result.bEquipment;
    const winnerId = result.winner === "a" ? pa.id : pb.id;
    const loser = result.winner === "a" ? pb : pa;
    const remaining = [...this.players.values()].filter((p) => !p.eliminated).length;
    const roundKey = remaining <= 2 ? "final" : remaining <= 4 ? "semifinal" : "round";
    const roundLabel = roundKey === "final" ? "GRAND FINAL" : roundKey === "semifinal" ? "Semifinal" : `Round ${this.currentRound + 1}`;
    this.battle = {
      roundIndex: this.currentRound,
      matchIndex: this.currentMatch,
      roundLabel,
      roundKey,
      roundNumber: this.currentRound + 1,
      a: {
        nickname: pa.nickname,
        maxHp: result.aMaxHp,
        equipment: result.aEquipment,
        luckCard: pa.luckCard,
        disabledItems: result.aDisabled
      },
      b: {
        nickname: pb.nickname,
        maxHp: result.bMaxHp,
        equipment: result.bEquipment,
        luckCard: pb.luckCard,
        disabledItems: result.bDisabled
      },
      winner: result.winner,
      timeline: result.timeline,
      stepMs: result.stepMs
    };
    this.battleRecords.push({
      roundIndex: this.currentRound,
      playerA: pa.nickname,
      playerB: pb.nickname,
      winner: result.winner === "a" ? pa.nickname : pb.nickname,
      log: result.timeline
    });
    this.broadcast();
    const duration = result.timeline.length * result.stepMs + BATTLE_GAP_MS;
    this.setTimer(duration, () => {
      match.winner = winnerId;
      loser.eliminated = true;
      const winnerPlayer = this.players.get(winnerId);
      if (winnerPlayer) winnerPlayer.wins++;
      this.battle = null;
      this.currentMatch++;
      this.broadcast();
      setTimeout(() => this.playNextBattle(), 2500);
    });
  }

  finishTournament(championId: string | null): void {
    this.phase = "champion";
    this.clearTimer();
    this.battle = null;
    if (championId) {
      const champ = this.players.get(championId);
      this.champion = champ?.nickname ?? null;
    }
    this.broadcast();
    void persistMatch(this);
  }

  playAgain(): void {
    if (this.phase !== "champion") return;
    this.phase = "lobby";
    this.clearTimer();
    this.removeBots();
    for (const p of this.players.values()) {
      p.equipment = {};
      p.currentOffer = null;
      p.offerPicked = false;
      p.luckOffer = null;
      p.luckCard = null;
      p.luckNote = null;
      p.eliminated = false;
      p.wins = 0;
    }
    this.event = null;
    this.bracket = [];
    this.battle = null;
    this.champion = null;
    this.broadcast();
  }
}
