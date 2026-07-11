import type {
  ArenaMap,
  BattlePayload,
  BracketRound,
  DraftOffer,
  Item,
  LuckCard,
  LuckOffer,
  Phase,
  RoomSnapshot,
  Slot,
  TimelineEntry
} from "@/lib/game/types";
import { ARENA_MAPS, DRAFT_TIME_MS, LUCK_TIME_MS, SLOTS, TOTAL_DRAFT_ROUNDS } from "@/lib/game/types";
import { rollDraftHand, rollLuckHand, applyBuildCard } from "@/lib/game/draft";
import { AVATAR_IDS, avatarIdForSeed } from "@/lib/game/avatars";
import { EVENTS, type EventDef } from "@/lib/game/events";
import { simulateBattle, type Build } from "@/lib/game/battle";

const EVENT_REVEAL_MS = 7000;
const BATTLE_GAP_MS = 2500;
const POST_BATTLE_MS = 5000;
const HUMAN_AWAY_MS = 20000;
const LOBBY_PRUNE_MS = 60000;
const REACT_EXTRA_MS = 6500;

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

export interface StatePlayer {
  id: string;
  nickname: string;
  avatar?: string;
  isBot: boolean;
  lastSeen: number;
  equipment: Partial<Record<Slot, Item>>;
  offer: Item[] | null;
  offerPicked: boolean;
  luckOffer: LuckCard[] | null;
  luckCard: LuckCard | null;
  eliminated: boolean;
  wins: number;
  botPickAt: number | null;
}

interface StateBracketMatch {
  a: string | null;
  b: string | null;
  winner: string | null;
}

export interface StateBattleRecord {
  roundIndex: number;
  playerA: string;
  playerB: string;
  winner: string;
  log: TimelineEntry[];
}

export interface StateBattle extends BattlePayload {
  startedAt: number;
  endsAt: number;
  winnerId: string;
  loserId: string;
  seed: number;
  reactions: boolean[];
  aPlayerId: string;
  bPlayerId: string;
  aCanReact: boolean;
  bCanReact: boolean;
  aBuild: Build;
  bBuild: Build;
  pendingSide: "a" | "b" | null;
  pendingDeadline: number | null;
  pausedAtMs: number;
  waitedMs: number;
  recorded: boolean;
}

export interface RoomState {
  code: string;
  hostId: string | null;
  phase: Phase;
  players: StatePlayer[];
  draftRound: number;
  deadline: number | null;
  eventId: string | null;
  bracket: StateBracketMatch[][];
  currentRound: number;
  currentMatch: number;
  battle: StateBattle | null;
  nextBattleAt: number | null;
  champion: string | null;
  records: StateBattleRecord[];
  persisted: boolean;
  matchCounter: number;
  arenaMap?: ArenaMap;
  recentEventIds?: string[];
}

function makePlayer(id: string, nickname: string, isBot: boolean, now: number): StatePlayer {
  return {
    id,
    nickname,
    avatar: avatarIdForSeed(id + nickname),
    isBot,
    lastSeen: now,
    equipment: {},
    offer: null,
    offerPicked: false,
    luckOffer: null,
    luckCard: null,
    eliminated: false,
    wins: 0,
    botPickAt: null
  };
}

export function createState(code: string, playerId: string, nickname: string, now: number): RoomState {
  return {
    code,
    hostId: playerId,
    phase: "lobby",
    players: [makePlayer(playerId, nickname, false, now)],
    draftRound: 0,
    deadline: null,
    eventId: null,
    bracket: [],
    currentRound: 0,
    currentMatch: 0,
    battle: null,
    nextBattleAt: null,
    champion: null,
    records: [],
    persisted: false,
    matchCounter: 0,
    arenaMap: "colosseum"
  };
}

function findPlayer(state: RoomState, playerId: string): StatePlayer | undefined {
  return state.players.find((p) => p.id === playerId);
}

function isConnected(p: StatePlayer, now: number): boolean {
  return p.isBot || now - p.lastSeen < HUMAN_AWAY_MS;
}

export function joinState(state: RoomState, playerId: string, nickname: string, now: number): string | null {
  const existing = findPlayer(state, playerId);
  if (existing) {
    existing.lastSeen = now;
    return null;
  }
  if (state.phase !== "lobby") return "err_started";
  if (state.players.length >= 8) return "err_full";
  if (state.players.some((p) => p.nickname.toLowerCase() === nickname.toLowerCase())) return "err_taken";
  state.players.push(makePlayer(playerId, nickname, false, now));
  if (!state.hostId) state.hostId = playerId;
  return null;
}

export function setAvatar(state: RoomState, playerId: string, avatarId: string): string | null {
  if (state.phase !== "lobby") return null;
  const p = findPlayer(state, playerId);
  if (!p || !AVATAR_IDS.includes(avatarId)) return null;
  p.avatar = avatarId;
  return null;
}

export function setArenaMap(state: RoomState, playerId: string, mapId: string): string | null {
  if (state.phase !== "lobby") return null;
  if (state.hostId !== playerId) return "err_host_start";
  if (!ARENA_MAPS.includes(mapId as ArenaMap)) return null;
  state.arenaMap = mapId as ArenaMap;
  return null;
}

export function touch(state: RoomState, playerId: string, now: number): boolean {
  const p = findPlayer(state, playerId);
  if (!p) return false;
  if (now - p.lastSeen > 10000) {
    p.lastSeen = now;
    return true;
  }
  return false;
}

export function leaveState(state: RoomState, playerId: string, now: number): void {
  const p = findPlayer(state, playerId);
  if (!p) return;
  if (state.phase === "lobby") {
    state.players = state.players.filter((pl) => pl.id !== playerId);
    reassignHost(state);
  } else {
    p.lastSeen = now - HUMAN_AWAY_MS - 1;
  }
}

function reassignHost(state: RoomState): void {
  if (state.hostId && findPlayer(state, state.hostId)) return;
  const human = state.players.find((p) => !p.isBot);
  state.hostId = human?.id ?? state.players[0]?.id ?? null;
}

function addBots(state: RoomState, count: number, now: number): void {
  const taken = new Set(state.players.map((p) => p.nickname.toLowerCase()));
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
  for (let i = 0; i < count && state.players.length < 8; i++) {
    const nickname = pool[i] ?? `Bot ${i + 1}`;
    state.players.push(makePlayer(`bot_${state.code}_${state.matchCounter}_${i}`, nickname, true, now));
  }
}

export function startGame(state: RoomState, playerId: string, now: number): string | null {
  if (state.phase !== "lobby") return null;
  if (state.hostId !== playerId) return "err_host_start";
  state.matchCounter++;
  if (state.players.length === 1) addBots(state, 3, now);
  if (state.players.length < 2) return "err_nickname";
  state.draftRound = 0;
  state.eventId = null;
  state.bracket = [];
  state.currentRound = 0;
  state.currentMatch = 0;
  state.battle = null;
  state.nextBattleAt = null;
  state.champion = null;
  state.records = [];
  state.persisted = false;
  for (const p of state.players) {
    p.equipment = {};
    p.offer = null;
    p.offerPicked = false;
    p.luckOffer = null;
    p.luckCard = null;
    p.eliminated = false;
    p.wins = 0;
    p.botPickAt = null;
  }
  beginDraftRound(state, now);
  return null;
}

function beginDraftRound(state: RoomState, now: number): void {
  state.phase = "draft";
  state.draftRound++;
  state.deadline = now + DRAFT_TIME_MS;
  for (const p of state.players) {
    p.offer = rollDraftHand((Object.keys(p.equipment) as Slot[]).filter((slot) => p.equipment[slot]), state.draftRound);
    p.offerPicked = false;
    p.botPickAt = p.isBot ? now : null;
  }
}

export function pickItem(state: RoomState, playerId: string, itemId: string | null): string | null {
  if (state.phase !== "draft") return null;
  const p = findPlayer(state, playerId);
  if (!p || p.offerPicked || !p.offer) return null;
  if (itemId === null) {
    const pickable = p.offer.filter((i) => !p.equipment[i.slot]);
    if (pickable.length > 0) return null;
    p.offerPicked = true;
  } else {
    const item = p.offer.find((i) => i.id === itemId);
    if (!item || p.equipment[item.slot]) return null;
    p.equipment[item.slot] = item;
    p.offerPicked = true;
  }
  return null;
}

function finishDraftRound(state: RoomState, now: number): void {
  for (const p of state.players) {
    if (p.offerPicked || !p.offer) continue;
    const pickable = p.offer.filter((i) => !p.equipment[i.slot]);
    const pick = pickable[Math.floor(Math.random() * pickable.length)];
    if (pick) p.equipment[pick.slot] = pick;
    p.offerPicked = true;
  }
  if (state.draftRound >= TOTAL_DRAFT_ROUNDS) {
    beginLuckPhase(state, now);
  } else {
    beginDraftRound(state, now);
  }
}

function beginLuckPhase(state: RoomState, now: number): void {
  state.phase = "luck";
  state.deadline = now + LUCK_TIME_MS;
  for (const p of state.players) {
    p.luckOffer = rollLuckHand();
    p.luckCard = null;
    p.botPickAt = p.isBot ? now : null;
  }
}

export function pickLuck(state: RoomState, playerId: string, cardId: string): string | null {
  if (state.phase !== "luck") return null;
  const p = findPlayer(state, playerId);
  if (!p || p.luckCard || !p.luckOffer) return null;
  const card = p.luckOffer.find((c) => c.id === cardId);
  if (!card) return null;
  p.luckCard = card;
  p.equipment = applyBuildCard(p.equipment, card.id).equipment;
  return null;
}

function finishLuckPhase(state: RoomState, now: number): void {
  for (const p of state.players) {
    if (p.luckCard || !p.luckOffer) continue;
    const card = p.luckOffer[Math.floor(Math.random() * p.luckOffer.length)];
    if (card) {
      p.luckCard = card;
      p.equipment = applyBuildCard(p.equipment, card.id).equipment;
    }
  }
  beginEventPhase(state, now);
}

function beginEventPhase(state: RoomState, now: number): void {
  state.phase = "event";
  const recent = state.recentEventIds ?? [];
  const pool = EVENTS.filter((e) => !recent.includes(e.id));
  const candidates = pool.length > 0 ? pool : EVENTS;
  const event = candidates[Math.floor(Math.random() * candidates.length)];
  state.eventId = event ? event.id : "rain";
  state.recentEventIds = [...recent, state.eventId].slice(-4);
  state.deadline = now + EVENT_REVEAL_MS;
  const ids = state.players.map((p) => p.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = ids[i];
    const b = ids[j];
    if (a !== undefined && b !== undefined) {
      ids[i] = b;
      ids[j] = a;
    }
  }
  const round: StateBracketMatch[] = [];
  for (let i = 0; i < ids.length; i += 2) {
    round.push({ a: ids[i] ?? null, b: ids[i + 1] ?? null, winner: null });
  }
  state.bracket = [round];
  state.currentRound = 0;
  state.currentMatch = 0;
}

function eventDef(state: RoomState): EventDef {
  return EVENTS.find((e) => e.id === state.eventId) ?? (EVENTS[0] as EventDef);
}

function advanceBattles(state: RoomState, now: number): void {
  for (;;) {
    const round = state.bracket[state.currentRound];
    if (!round) return;
    if (state.currentMatch >= round.length) {
      const winners = round.map((m) => m.winner).filter((w): w is string => w !== null);
      if (winners.length <= 1) {
        state.phase = "champion";
        state.battle = null;
        state.nextBattleAt = null;
        state.deadline = null;
        const champ = winners[0] ? findPlayer(state, winners[0]) : undefined;
        state.champion = champ?.nickname ?? null;
        return;
      }
      const next: StateBracketMatch[] = [];
      for (let i = 0; i < winners.length; i += 2) {
        next.push({ a: winners[i] ?? null, b: winners[i + 1] ?? null, winner: null });
      }
      state.bracket.push(next);
      state.currentRound++;
      state.currentMatch = 0;
      continue;
    }
    const match = round[state.currentMatch];
    if (!match) return;
    if (!match.a || !match.b) {
      match.winner = match.a ?? match.b;
      state.currentMatch++;
      continue;
    }
    const pa = findPlayer(state, match.a);
    const pb = findPlayer(state, match.b);
    if (!pa || !pb) {
      match.winner = pa ? match.a : match.b;
      state.currentMatch++;
      continue;
    }
    const seed = Math.floor(Math.random() * 2147483647);
    const aBuild: Build = { nickname: pa.nickname, equipment: pa.equipment, luckCard: pa.luckCard };
    const bBuild: Build = { nickname: pb.nickname, equipment: pb.equipment, luckCard: pb.luckCard };
    const result = simulateBattle(aBuild, bBuild, eventDef(state), {
      seed,
      reactions: [],
      aCanReact: !pa.isBot,
      bCanReact: !pb.isBot
    });
    const remaining = state.players.filter((p) => !p.eliminated).length;
    const roundKey = remaining <= 2 ? "final" : remaining <= 4 ? "semifinal" : "round";
    state.battle = {
      roundIndex: state.currentRound,
      matchIndex: state.currentMatch,
      roundLabel: roundKey,
      roundKey,
      roundNumber: state.currentRound + 1,
      a: {
        nickname: pa.nickname,
        avatar: pa.avatar ?? avatarIdForSeed(pa.id + pa.nickname),
        maxHp: result.aMaxHp,
        equipment: result.aEquipment,
        luckCard: pa.luckCard,
        disabledItems: result.aDisabled
      },
      b: {
        nickname: pb.nickname,
        avatar: pb.avatar ?? avatarIdForSeed(pb.id + pb.nickname),
        maxHp: result.bMaxHp,
        equipment: result.bEquipment,
        luckCard: pb.luckCard,
        disabledItems: result.bDisabled
      },
      winner: result.winner,
      timeline: result.timeline,
      stepMs: result.stepMs,
      startedAt: now,
      endsAt: now + result.totalMs + POST_BATTLE_MS,
      winnerId: result.winner === "a" ? pa.id : pb.id,
      loserId: result.winner === "a" ? pb.id : pa.id,
      seed,
      reactions: [],
      aPlayerId: pa.id,
      bPlayerId: pb.id,
      aCanReact: !pa.isBot,
      bCanReact: !pb.isBot,
      aBuild,
      bBuild,
      pendingSide: result.pendingSide,
      pendingDeadline: result.pendingSide ? now + result.totalMs + REACT_EXTRA_MS : null,
      pausedAtMs: result.totalMs,
      waitedMs: 0,
      recorded: false
    };
    if (!result.pendingSide) {
      pa.equipment = result.aEquipment;
      pb.equipment = result.bEquipment;
      finalizeBattleResult(state, result.winner, result.timeline);
    }
    state.nextBattleAt = null;
    return;
  }
}

function finalizeBattleResult(state: RoomState, winner: "a" | "b", timeline: TimelineEntry[]): void {
  const battle = state.battle;
  if (!battle || battle.recorded) return;
  battle.winner = winner;
  battle.winnerId = winner === "a" ? battle.aPlayerId : battle.bPlayerId;
  battle.loserId = winner === "a" ? battle.bPlayerId : battle.aPlayerId;
  battle.recorded = true;
  state.records.push({
    roundIndex: battle.roundIndex,
    playerA: battle.a.nickname,
    playerB: battle.b.nickname,
    winner: winner === "a" ? battle.a.nickname : battle.b.nickname,
    log: timeline
  });
}

function resolveReaction(state: RoomState, pass: boolean, now: number): void {
  const battle = state.battle;
  if (!battle || !battle.pendingSide) return;
  battle.reactions.push(pass);
  const result = simulateBattle(battle.aBuild, battle.bBuild, eventDef(state), {
    seed: battle.seed,
    reactions: battle.reactions,
    aCanReact: battle.aCanReact,
    bCanReact: battle.bCanReact
  });
  const arrival = battle.startedAt + battle.waitedMs + battle.pausedAtMs;
  battle.waitedMs += Math.max(0, now - arrival);
  battle.timeline = result.timeline;
  battle.pendingSide = result.pendingSide;
  battle.pausedAtMs = result.totalMs;
  if (result.pendingSide) {
    battle.pendingDeadline = battle.startedAt + battle.waitedMs + result.totalMs + REACT_EXTRA_MS;
  } else {
    battle.pendingDeadline = null;
    battle.endsAt = battle.startedAt + battle.waitedMs + result.totalMs + POST_BATTLE_MS;
    const pa = findPlayer(state, battle.aPlayerId);
    const pb = findPlayer(state, battle.bPlayerId);
    if (pa) pa.equipment = result.aEquipment;
    if (pb) pb.equipment = result.bEquipment;
    finalizeBattleResult(state, result.winner, result.timeline);
  }
}

export function reactBattle(state: RoomState, playerId: string, pass: boolean, now: number): string | null {
  const battle = state.battle;
  if (state.phase !== "battle" || !battle || !battle.pendingSide) return null;
  const pendingId = battle.pendingSide === "a" ? battle.aPlayerId : battle.bPlayerId;
  if (pendingId !== playerId) return null;
  resolveReaction(state, pass, now);
  return null;
}

function finishBattle(state: RoomState, now: number): void {
  const battle = state.battle;
  if (!battle) return;
  const round = state.bracket[state.currentRound];
  const match = round?.[state.currentMatch];
  if (match) match.winner = battle.winnerId;
  const winner = findPlayer(state, battle.winnerId);
  const loser = findPlayer(state, battle.loserId);
  if (winner) winner.wins++;
  if (loser) loser.eliminated = true;
  state.battle = null;
  state.currentMatch++;
  state.nextBattleAt = now + BATTLE_GAP_MS;
}

export function playAgain(state: RoomState, playerId: string, now: number): string | null {
  if (state.phase !== "champion") return null;
  if (state.hostId !== playerId) return "err_host_restart";
  state.phase = "lobby";
  state.players = state.players.filter((p) => !p.isBot);
  for (const p of state.players) {
    p.equipment = {};
    p.offer = null;
    p.offerPicked = false;
    p.luckOffer = null;
    p.luckCard = null;
    p.eliminated = false;
    p.wins = 0;
    p.botPickAt = null;
    p.lastSeen = Math.max(p.lastSeen, now - HUMAN_AWAY_MS + 5000);
  }
  state.deadline = null;
  state.eventId = null;
  state.bracket = [];
  state.battle = null;
  state.nextBattleAt = null;
  state.champion = null;
  state.records = [];
  reassignHost(state);
  return null;
}

export function tick(state: RoomState, now: number): boolean {
  let changed = false;
  if (state.phase === "lobby") {
    const before = state.players.length;
    state.players = state.players.filter((p) => p.isBot || now - p.lastSeen < LOBBY_PRUNE_MS);
    if (state.players.length !== before) {
      reassignHost(state);
      changed = true;
    }
  }
  if (state.phase === "draft") {
    for (const p of state.players) {
      if (p.isBot && !p.offerPicked && p.botPickAt !== null && now >= p.botPickAt && p.offer) {
        const pickable = p.offer.filter((i) => !p.equipment[i.slot]);
        const pick = pickable[Math.floor(Math.random() * pickable.length)];
        if (pick) p.equipment[pick.slot] = pick;
        p.offerPicked = true;
        changed = true;
      }
    }
    const allDone = state.players.every((p) => p.offerPicked || !isConnected(p, now));
    if ((state.deadline !== null && now >= state.deadline) || allDone) {
      finishDraftRound(state, now);
      changed = true;
    }
  }
  if (state.phase === "luck") {
    for (const p of state.players) {
      if (p.isBot && !p.luckCard && p.botPickAt !== null && now >= p.botPickAt && p.luckOffer) {
        const card = p.luckOffer[Math.floor(Math.random() * p.luckOffer.length)];
        if (card) {
          p.luckCard = card;
          p.equipment = applyBuildCard(p.equipment, card.id).equipment;
        }
        changed = true;
      }
    }
    const allDone = state.players.every((p) => p.luckCard !== null || !isConnected(p, now));
    if ((state.deadline !== null && now >= state.deadline) || allDone) {
      finishLuckPhase(state, now);
      changed = true;
    }
  }
  if (state.phase === "event") {
    if (state.deadline !== null && now >= state.deadline) {
      state.phase = "battle";
      state.deadline = null;
      state.nextBattleAt = now;
      changed = true;
    }
  }
  if (state.phase === "battle") {
    if (!state.battle && state.nextBattleAt !== null && now >= state.nextBattleAt) {
      advanceBattles(state, now);
      changed = true;
    }
    if (state.battle && state.battle.pendingSide && state.battle.pendingDeadline !== null && now >= state.battle.pendingDeadline) {
      resolveReaction(state, false, now);
      changed = true;
    }
    if (state.battle && !state.battle.pendingSide && now >= state.battle.endsAt) {
      finishBattle(state, now);
      changed = true;
      if (state.nextBattleAt !== null && now >= state.nextBattleAt) {
        advanceBattles(state, now);
      }
    }
  }
  return changed;
}

export function snapshotFor(
  state: RoomState,
  playerId: string,
  now: number
): { snapshot: RoomSnapshot; offer: DraftOffer | null; luckOffer: LuckOffer | null } {
  const me = findPlayer(state, playerId);
  const nameOf = (id: string | null) => (id ? findPlayer(state, id)?.nickname ?? null : null);
  const event = state.eventId ? EVENTS.find((e) => e.id === state.eventId) : null;
  const bracket: BracketRound[] | null =
    state.bracket.length > 0
      ? state.bracket.map((round) => ({
          matches: round.map((m) => ({ a: nameOf(m.a), b: nameOf(m.b), winner: nameOf(m.winner) }))
        }))
      : null;
  let battle: BattlePayload | null = null;
  if (state.battle) {
    const sb = state.battle;
    const {
      startedAt,
      endsAt,
      winnerId,
      loserId,
      seed,
      reactions,
      aPlayerId,
      bPlayerId,
      aCanReact,
      bCanReact,
      aBuild,
      bBuild,
      pendingSide,
      pendingDeadline,
      pausedAtMs,
      waitedMs,
      recorded,
      ...payload
    } = sb;
    const waited = waitedMs ?? 0;
    let elapsed = Math.max(0, now - startedAt - waited);
    if (pendingSide) elapsed = Math.min(elapsed, pausedAtMs ?? elapsed);
    battle = {
      ...payload,
      elapsedMs: elapsed,
      pending: pendingSide
        ? {
            side: pendingSide,
            playerId: pendingSide === "a" ? aPlayerId : bPlayerId,
            nickname: pendingSide === "a" ? sb.a.nickname : sb.b.nickname
          }
        : null
    };
  }
  const snapshot: RoomSnapshot = {
    code: state.code,
    phase: state.phase,
    hostId: state.hostId ?? "",
    arenaMap: state.arenaMap ?? "colosseum",
    players: state.players.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      avatar: p.avatar ?? avatarIdForSeed(p.id + p.nickname),
      isHost: p.id === state.hostId,
      isBot: p.isBot,
      connected: isConnected(p, now),
      hasPicked: state.phase === "draft" ? p.offerPicked : state.phase === "luck" ? p.luckCard !== null : false,
      equipment: p.equipment,
      luckCard: state.phase === "lobby" || state.phase === "draft" ? null : p.luckCard,
      eliminated: p.eliminated,
      wins: p.wins
    })),
    draftRound: state.draftRound,
    totalDraftRounds: TOTAL_DRAFT_ROUNDS,
    deadline: state.phase === "draft" || state.phase === "luck" || state.phase === "event" ? state.deadline : null,
    event: event ? { id: event.id, name: event.name, emoji: event.emoji, description: event.description } : null,
    bracket,
    battle,
    champion: state.champion,
    serverNow: now
  };
  let offer: DraftOffer | null = null;
  if (state.phase === "draft" && me?.offer) {
    const lockedSlots = SLOTS.filter((s) => me.equipment[s]);
    offer = {
      round: state.draftRound,
      items: me.offer,
      lockedSlots,
      picked: me.offerPicked,
      canPickAny: me.offer.some((i) => !lockedSlots.includes(i.slot))
    };
  }
  let luckOffer: LuckOffer | null = null;
  if (state.phase === "luck" && me?.luckOffer) {
    luckOffer = { cards: me.luckOffer, picked: me.luckCard !== null };
  }
  return { snapshot, offer, luckOffer };
}
