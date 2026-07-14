import type {
  ArenaMap,
  DraftMode,
  MatchMode,
  TourneyMode,
  BattlePayload,
  BracketRound,
  DraftOffer,
  Item,
  LuckCard,
  LuckOffer,
  LeagueStanding,
  Phase,
  RoomSnapshot,
  Slot,
  TimelineEntry
} from "@/lib/game/types";
import { ARENA_MAPS, CHAOS_TIME_MS, DRAFT_MODES, DRAFT_TIME_MS, EVENT_REVEAL_MS, LUCK_TIME_MS, MATCH_MODES, RARITY_ORDER, SLOTS, TOTAL_DRAFT_ROUNDS, TOURNEY_MODES } from "@/lib/game/types";
import { rollChaosConsolation, rollChaosPool, rollDraftHand, rollLuckHand, applyBuildCard } from "@/lib/game/draft";
import { LUCK_CARDS } from "@/lib/game/luckCards";
import { AVATAR_IDS, avatarIdForSeed } from "@/lib/game/avatars";
import { CHAOS_EVENTS, EVENTS, type EventDef } from "@/lib/game/events";
import { simulateBattle, type Build } from "@/lib/game/battle";

const BATTLE_GAP_MS = 2500;
const LEAGUE_TABLE_MS = 5500;
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
  spectator?: boolean;
}

interface StateBracketMatch {
  a: string | null;
  b: string | null;
  winner: string | null;
  legWinsA?: number;
  legWinsB?: number;
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
  defScore?: number | null;
  atkScore?: number | null;
  defPass?: boolean | null;
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
  matchMode?: MatchMode;
  tourneyMode?: TourneyMode;
  draftMode?: DraftMode;
  chaosPool?: { item: Item; claimedBy: string | null }[] | null;
  chaosLuckPool?: { card: LuckCard; claimedBy: string | null }[] | null;
  chaosRevealAt?: number | null;
  leagueStage?: "league" | "semis" | "final" | null;
  recentEventIds?: string[];
  shout?: { by: string; at: number } | null;
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
    arenaMap: "colosseum",
    matchMode: "single",
    tourneyMode: "knockout",
    draftMode: "classic",
    chaosPool: null,
    chaosLuckPool: null,
    chaosRevealAt: null,
    leagueStage: null
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
  if (state.players.some((p) => p.nickname.toLowerCase() === nickname.toLowerCase())) return "err_taken";
  if (state.phase !== "lobby") {
    if (state.players.length >= 12) return "err_full";
    const watcher = makePlayer(playerId, nickname, false, now);
    watcher.spectator = true;
    watcher.offerPicked = true;
    state.players.push(watcher);
    return null;
  }
  if (state.players.length >= 8) return "err_full";
  state.players.push(makePlayer(playerId, nickname, false, now));
  if (!state.hostId) state.hostId = playerId;
  return null;
}

export function kickPlayer(state: RoomState, playerId: string, targetId: string): string | null {
  if (state.phase !== "lobby") return null;
  if (state.hostId !== playerId) return "err_host_start";
  if (targetId === playerId) return null;
  const target = findPlayer(state, targetId);
  if (!target || target.isBot) return null;
  state.players = state.players.filter((p) => p.id !== targetId);
  return null;
}

export function renamePlayer(state: RoomState, playerId: string, nickname: string): string | null {
  if (state.phase !== "lobby") return null;
  const p = findPlayer(state, playerId);
  if (!p) return null;
  if (state.players.some((pl) => pl.id !== playerId && pl.nickname.toLowerCase() === nickname.toLowerCase())) return "err_taken";
  p.nickname = nickname;
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

export function setMatchMode(state: RoomState, playerId: string, modeId: string): string | null {
  if (state.phase !== "lobby") return null;
  if (state.hostId !== playerId) return "err_host_start";
  if (!MATCH_MODES.includes(modeId as MatchMode)) return null;
  state.matchMode = modeId as MatchMode;
  return null;
}

export function setTourneyMode(state: RoomState, playerId: string, modeId: string): string | null {
  if (state.phase !== "lobby") return null;
  if (state.hostId !== playerId) return "err_host_start";
  if (!TOURNEY_MODES.includes(modeId as TourneyMode)) return null;
  state.tourneyMode = modeId as TourneyMode;
  return null;
}

export function setDraftMode(state: RoomState, playerId: string, modeId: string): string | null {
  if (state.phase !== "lobby") return null;
  if (state.hostId !== playerId) return "err_host_start";
  if (!DRAFT_MODES.includes(modeId as DraftMode)) return null;
  state.draftMode = modeId as DraftMode;
  return null;
}

function isChaos(state: RoomState): boolean {
  return (state.draftMode ?? "classic") === "chaos";
}

function isLeague(state: RoomState): boolean {
  return (state.tourneyMode ?? "knockout") === "league";
}

function homeAwayActive(state: RoomState): boolean {
  if ((state.matchMode ?? "single") !== "homeAway") return false;
  if (!isLeague(state)) return true;
  return state.leagueStage === "league" || state.leagueStage === "semis";
}

function lotHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

function headToHeadDiff(state: RoomState, xa: string, xb: string, roundLimit = state.bracket.length): number {
  let xWins = 0;
  let yWins = 0;
  for (const round of state.bracket.slice(0, roundLimit)) {
    for (const m of round) {
      const pair = (m.a === xa && m.b === xb) || (m.a === xb && m.b === xa);
      if (!pair) continue;
      const aIsX = m.a === xa;
      const wa = m.legWinsA ?? (m.winner !== null && m.winner === m.a ? 1 : 0);
      const wb = m.legWinsB ?? (m.winner !== null && m.winner === m.b ? 1 : 0);
      xWins += aIsX ? wa : wb;
      yWins += aIsX ? wb : wa;
    }
  }
  return yWins - xWins;
}

function leagueRoundCount(state: RoomState): number {
  const count = state.players.filter((player) => !player.spectator).length;
  if (count <= 2) return 0;
  return count % 2 === 0 ? count - 1 : count;
}

function leagueTableFor(state: RoomState): LeagueStanding[] {
  if (!isLeague(state)) return [];
  const players = state.players.filter((player) => !player.spectator);
  const rows = new Map(
    players.map((player) => [
      player.id,
      {
        playerId: player.id,
        nickname: player.nickname,
        avatar: player.avatar ?? avatarIdForSeed(player.id + player.nickname),
        rank: 0,
        played: 0,
        won: 0,
        lost: 0,
        points: 0,
        qualified: false
      } satisfies LeagueStanding
    ])
  );
  const roundCount = leagueRoundCount(state);
  for (const round of state.bracket.slice(0, roundCount)) {
    for (const match of round) {
      if (!match.a || !match.b) continue;
      const rowA = rows.get(match.a);
      const rowB = rows.get(match.b);
      if (!rowA || !rowB) continue;
      const winsA = match.legWinsA ?? (match.winner === match.a ? 1 : 0);
      const winsB = match.legWinsB ?? (match.winner === match.b ? 1 : 0);
      const played = winsA + winsB;
      if (played === 0) continue;
      rowA.played += played;
      rowA.won += winsA;
      rowA.lost += winsB;
      rowB.played += played;
      rowB.won += winsB;
      rowB.lost += winsA;
    }
  }
  const ordered = [...rows.values()].sort(
    (a, b) =>
      b.won - a.won ||
      headToHeadDiff(state, a.playerId, b.playerId, roundCount) ||
      lotHash(state.code + b.playerId) - lotHash(state.code + a.playerId)
  );
  const qualifierCount = players.length >= 6 ? 4 : Math.min(2, players.length);
  return ordered.map((row, index) => ({
    ...row,
    rank: index + 1,
    points: row.won * 3,
    qualified: players.length > 2 && index < qualifierCount
  }));
}

function battleGapMs(state: RoomState): number {
  return isLeague(state) ? LEAGUE_TABLE_MS : BATTLE_GAP_MS;
}

function roundRobinRounds(ids: string[]): StateBracketMatch[][] {
  const list = [...ids];
  if (list.length % 2 === 1) list.push("");
  const n = list.length;
  const rounds: StateBracketMatch[][] = [];
  const arr = [...list];
  for (let r = 0; r < n - 1; r++) {
    const matches: StateBracketMatch[] = [];
    for (let i = 0; i < n / 2; i++) {
      const x = arr[i];
      const y = arr[n - 1 - i];
      if (x && y) matches.push({ a: x, b: y, winner: null });
    }
    if (matches.length > 0) rounds.push(matches);
    const last = arr.pop();
    if (last !== undefined) arr.splice(1, 0, last);
  }
  return rounds;
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

function chaosSlotsMissing(p: StatePlayer): Slot[] {
  return SLOTS.filter((slot) => !p.equipment[slot]);
}

function chaosClaimable(state: RoomState, p: StatePlayer): { item: Item; claimedBy: string | null }[] {
  return (state.chaosPool ?? []).filter((entry) => entry.claimedBy === null && !p.equipment[entry.item.slot]);
}

function beginDraftRound(state: RoomState, now: number): void {
  state.phase = "draft";
  state.draftRound++;
  state.chaosRevealAt = null;
  if (isChaos(state)) {
    const alive = state.players.filter((p) => !p.spectator);
    state.deadline = now + CHAOS_TIME_MS;
    state.chaosPool = rollChaosPool(alive.map(chaosSlotsMissing), state.draftRound).map((item) => ({ item, claimedBy: null }));
    for (const p of state.players) {
      p.offer = null;
      p.offerPicked = p.spectator ?? false;
      p.botPickAt = p.isBot ? now + 2500 + Math.random() * (CHAOS_TIME_MS * 0.55) : null;
    }
    return;
  }
  state.chaosPool = null;
  state.deadline = now + DRAFT_TIME_MS;
  for (const p of state.players) {
    if (p.spectator) {
      p.offer = null;
      p.offerPicked = true;
      continue;
    }
    p.offer = rollDraftHand((Object.keys(p.equipment) as Slot[]).filter((slot) => p.equipment[slot]), state.draftRound);
    p.offerPicked = false;
    p.botPickAt = p.isBot ? now : null;
  }
}

export function pickItem(state: RoomState, playerId: string, itemId: string | null): string | null {
  if (state.phase !== "draft") return null;
  const p = findPlayer(state, playerId);
  if (isChaos(state)) {
    if (!p || p.offerPicked || !state.chaosPool) return null;
    if (itemId === null) {
      if (chaosClaimable(state, p).length > 0) return null;
      p.offerPicked = true;
      return null;
    }
    const entry = state.chaosPool.find((e) => e.item.id === itemId);
    if (!entry || p.equipment[entry.item.slot]) return null;
    if (entry.claimedBy !== null) return "err_item_taken";
    entry.claimedBy = p.id;
    p.equipment[entry.item.slot] = entry.item;
    p.offerPicked = true;
    return null;
  }
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
  if (isChaos(state)) {
    for (const p of state.players) {
      if (p.spectator) continue;
      const claimed = (state.chaosPool ?? []).some((e) => e.claimedBy === p.id);
      if (claimed) {
        p.offerPicked = true;
        continue;
      }
      const options = chaosClaimable(state, p);
      const pick = options[Math.floor(Math.random() * options.length)];
      if (pick) {
        pick.claimedBy = p.id;
        p.equipment[pick.item.slot] = pick.item;
      } else {
        const missing = chaosSlotsMissing(p);
        const slot = missing[Math.floor(Math.random() * missing.length)];
        const consolation = slot ? rollChaosConsolation(slot, state.draftRound, new Set((state.chaosPool ?? []).map((e) => e.item.id))) : null;
        if (slot && consolation) p.equipment[slot] = consolation;
      }
      p.offerPicked = true;
    }
    state.chaosPool = null;
  }
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
  state.chaosRevealAt = null;
  if (isChaos(state)) {
    const deck = [...LUCK_CARDS];
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const x = deck[i];
      const y = deck[j];
      if (x !== undefined && y !== undefined) {
        deck[i] = y;
        deck[j] = x;
      }
    }
    state.chaosLuckPool = deck.slice(0, 10).map((card) => ({ card, claimedBy: null }));
    for (const p of state.players) {
      p.luckOffer = null;
      p.luckCard = null;
      p.botPickAt = p.isBot && !p.spectator ? now + 2500 + Math.random() * (LUCK_TIME_MS * 0.45) : null;
    }
    return;
  }
  state.chaosLuckPool = null;
  for (const p of state.players) {
    if (p.spectator) {
      p.luckOffer = null;
      continue;
    }
    p.luckOffer = rollLuckHand();
    p.luckCard = null;
    p.botPickAt = p.isBot ? now : null;
  }
}

export function pickLuck(state: RoomState, playerId: string, cardId: string): string | null {
  if (state.phase !== "luck") return null;
  const p = findPlayer(state, playerId);
  if (isChaos(state)) {
    if (!p || p.spectator || p.luckCard || !state.chaosLuckPool) return null;
    const entry = state.chaosLuckPool.find((e) => e.card.id === cardId);
    if (!entry) return null;
    if (entry.claimedBy !== null) return "err_item_taken";
    entry.claimedBy = p.id;
    p.luckCard = entry.card;
    p.equipment = applyBuildCard(p.equipment, entry.card.id).equipment;
    return null;
  }
  if (!p || p.luckCard || !p.luckOffer) return null;
  const card = p.luckOffer.find((c) => c.id === cardId);
  if (!card) return null;
  p.luckCard = card;
  p.equipment = applyBuildCard(p.equipment, card.id).equipment;
  return null;
}

function finishLuckPhase(state: RoomState, now: number): void {
  if (isChaos(state)) {
    for (const p of state.players) {
      if (p.spectator || p.luckCard) continue;
      const open = (state.chaosLuckPool ?? []).filter((e) => e.claimedBy === null);
      const entry = open[Math.floor(Math.random() * open.length)];
      if (entry) {
        entry.claimedBy = p.id;
        p.luckCard = entry.card;
        p.equipment = applyBuildCard(p.equipment, entry.card.id).equipment;
      }
    }
    state.chaosLuckPool = null;
  }
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
  const source = isChaos(state) ? CHAOS_EVENTS : EVENTS;
  const pool = source.filter((e) => !recent.includes(e.id));
  const candidates = pool.length > 0 ? pool : source;
  const event = candidates[Math.floor(Math.random() * candidates.length)];
  state.eventId = event ? event.id : "rain";
  state.recentEventIds = [...recent, state.eventId].slice(-4);
  state.deadline = now + EVENT_REVEAL_MS;
  const ids = state.players.filter((p) => !p.spectator).map((p) => p.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = ids[i];
    const b = ids[j];
    if (a !== undefined && b !== undefined) {
      ids[i] = b;
      ids[j] = a;
    }
  }
  if (isLeague(state) && ids.length > 2) {
    state.bracket = roundRobinRounds(ids);
    state.leagueStage = "league";
  } else if (isLeague(state)) {
    state.bracket = [[{ a: ids[0] ?? null, b: ids[1] ?? null, winner: null }]];
    state.leagueStage = "final";
  } else {
    const size = ids.length <= 2 ? 2 : 2 ** Math.ceil(Math.log2(ids.length));
    const byes = size - ids.length;
    const round: StateBracketMatch[] = [];
    for (let i = byes; i < ids.length; i += 2) {
      round.push({ a: ids[i] ?? null, b: ids[i + 1] ?? null, winner: null });
    }
    for (let i = 0; i < byes; i++) {
      round.push({ a: ids[i] ?? null, b: null, winner: null });
    }
    state.bracket = [round];
    state.leagueStage = null;
  }
  state.currentRound = 0;
  state.currentMatch = 0;
}

function eventDef(state: RoomState): EventDef {
  return EVENTS.find((e) => e.id === state.eventId) ?? (EVENTS[0] as EventDef);
}

function equipmentPersists(state: RoomState): boolean {
  const hooks = eventDef(state).hooks;
  return !hooks.swapBuilds && !hooks.swapWeapons && !hooks.fistsOnly;
}

function advanceBattles(state: RoomState, now: number): void {
  for (;;) {
    const round = state.bracket[state.currentRound];
    if (!round) return;
    if (state.currentMatch >= round.length) {
      if (isLeague(state) && state.leagueStage === "league") {
        if (state.currentRound < state.bracket.length - 1) {
          state.currentRound++;
          state.currentMatch = 0;
          continue;
        }
        const standings = state.players.filter((pl) => !pl.spectator).sort(
          (x, y) =>
            y.wins - x.wins ||
            headToHeadDiff(state, x.id, y.id) ||
            lotHash(state.code + y.id) - lotHash(state.code + x.id)
        );
        const qualifiers = standings.slice(0, standings.length >= 6 ? 4 : 2);
        const qualified = new Set(qualifiers.map((p) => p.id));
        for (const p of state.players) {
          if (!qualified.has(p.id)) p.eliminated = true;
        }
        if (qualifiers.length >= 4) {
          state.bracket.push([
            { a: qualifiers[0]?.id ?? null, b: qualifiers[3]?.id ?? null, winner: null },
            { a: qualifiers[1]?.id ?? null, b: qualifiers[2]?.id ?? null, winner: null }
          ]);
          state.leagueStage = "semis";
        } else {
          state.bracket.push([{ a: qualifiers[0]?.id ?? null, b: qualifiers[1]?.id ?? null, winner: null }]);
          state.leagueStage = "final";
        }
        state.currentRound++;
        state.currentMatch = 0;
        continue;
      }
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
      if (isLeague(state) && state.leagueStage === "semis") state.leagueStage = "final";
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
    const homeAway = homeAwayActive(state);
    const legsPlayed = (match.legWinsA ?? 0) + (match.legWinsB ?? 0);
    const swapSides = homeAway && legsPlayed % 2 === 1;
    const pa = findPlayer(state, swapSides ? match.b : match.a);
    const pb = findPlayer(state, swapSides ? match.a : match.b);
    if (!pa || !pb) {
      match.winner = pa ? (swapSides ? match.b : match.a) : swapSides ? match.a : match.b;
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
    const roundSize = round.length;
    const roundKey = isLeague(state)
      ? state.leagueStage === "final"
        ? "final"
        : state.leagueStage === "semis"
          ? "semifinal"
          : "round"
      : roundSize === 1
        ? "final"
        : roundSize === 2
          ? "semifinal"
          : roundSize <= 4
            ? "quarterfinal"
            : "round";
    state.battle = {
      roundIndex: state.currentRound,
      matchIndex: state.currentMatch,
      roundLabel: roundKey,
      roundKey,
      legNumber: homeAway ? legsPlayed + 1 : undefined,
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
      if (equipmentPersists(state)) {
        pa.equipment = result.aEquipment;
        pb.equipment = result.bEquipment;
      }
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
    if (equipmentPersists(state)) {
      if (pa) pa.equipment = result.aEquipment;
      if (pb) pb.equipment = result.bEquipment;
    }
    finalizeBattleResult(state, result.winner, result.timeline);
  }
}

function maybeResolveDuel(state: RoomState, now: number, force: boolean): void {
  const battle = state.battle;
  if (!battle || !battle.pendingSide) return;
  const attackerHuman = battle.pendingSide === "a" ? battle.bCanReact : battle.aCanReact;
  const defReady = battle.defScore !== undefined && battle.defScore !== null;
  const atkReady = !attackerHuman || (battle.atkScore !== undefined && battle.atkScore !== null);
  if (!force && (!defReady || !atkReady)) return;
  const PERFECT = 0.015;
  const GOOD = 0.1;
  let dodged = false;
  if (defReady) {
    const defO = battle.defScore as number;
    const atkO = attackerHuman ? (battle.atkScore ?? 1) : 1;
    const atkPerfect = attackerHuman && atkO <= PERFECT;
    if (defO <= PERFECT) dodged = true;
    else if (atkPerfect) dodged = false;
    else dodged = defO <= GOOD;
  }
  battle.defScore = null;
  battle.atkScore = null;
  battle.defPass = null;
  resolveReaction(state, dodged, now);
}

export function reactBattle(state: RoomState, playerId: string, pass: boolean, now: number, score?: number): string | null {
  const battle = state.battle;
  if (state.phase !== "battle" || !battle || !battle.pendingSide) return null;
  const defenderId = battle.pendingSide === "a" ? battle.aPlayerId : battle.bPlayerId;
  const attackerId = battle.pendingSide === "a" ? battle.bPlayerId : battle.aPlayerId;
  const attackerHuman = battle.pendingSide === "a" ? battle.bCanReact : battle.aCanReact;
  const clamped = Math.min(1, Math.max(0, score ?? (pass ? 0.05 : 1)));
  if (playerId === defenderId) {
    if (battle.defScore === undefined || battle.defScore === null) {
      battle.defScore = clamped;
      battle.defPass = pass;
    }
  } else if (playerId === attackerId && attackerHuman) {
    if (battle.atkScore === undefined || battle.atkScore === null) {
      battle.atkScore = clamped;
    }
  } else {
    return null;
  }
  maybeResolveDuel(state, now, false);
  return null;
}

function finishBattle(state: RoomState, now: number): void {
  const battle = state.battle;
  if (!battle) return;
  const round = state.bracket[state.currentRound];
  const match = round?.[state.currentMatch];
  const winner = findPlayer(state, battle.winnerId);
  if (winner) winner.wins++;
  if (isLeague(state) && state.leagueStage === "league") {
    if (match && homeAwayActive(state)) {
      if (battle.winnerId === match.a) match.legWinsA = (match.legWinsA ?? 0) + 1;
      else match.legWinsB = (match.legWinsB ?? 0) + 1;
      const winsA = match.legWinsA ?? 0;
      const winsB = match.legWinsB ?? 0;
      if (winsA + winsB < 2) {
        state.battle = null;
        state.nextBattleAt = now + battleGapMs(state);
        return;
      }
      match.winner = winsA > winsB ? match.a : winsB > winsA ? match.b : battle.winnerId;
    } else if (match) {
      match.winner = battle.winnerId;
    }
    state.battle = null;
    state.currentMatch++;
    state.nextBattleAt = now + battleGapMs(state);
    return;
  }
  const homeAway = homeAwayActive(state);
  if (homeAway && match) {
    if (battle.winnerId === match.a) match.legWinsA = (match.legWinsA ?? 0) + 1;
    else match.legWinsB = (match.legWinsB ?? 0) + 1;
    const winsA = match.legWinsA ?? 0;
    const winsB = match.legWinsB ?? 0;
    if (winsA < 2 && winsB < 2) {
      state.battle = null;
      state.nextBattleAt = now + battleGapMs(state);
      return;
    }
    match.winner = winsA >= 2 ? match.a : match.b;
    const loserId = winsA >= 2 ? match.b : match.a;
    const loser = loserId ? findPlayer(state, loserId) : undefined;
    if (loser) loser.eliminated = true;
    state.battle = null;
    state.currentMatch++;
    state.nextBattleAt = now + battleGapMs(state);
    return;
  }
  if (match) match.winner = battle.winnerId;
  const loser = findPlayer(state, battle.loserId);
  if (loser) loser.eliminated = true;
  state.battle = null;
  state.currentMatch++;
  state.nextBattleAt = now + battleGapMs(state);
}

export function shoutHost(state: RoomState, playerId: string, now: number): string | null {
  if (state.phase !== "champion" && state.phase !== "lobby") return null;
  if (state.hostId === playerId) return null;
  const p = findPlayer(state, playerId);
  if (!p) return null;
  if (state.shout && now - state.shout.at < 30000) return null;
  state.shout = { by: p.nickname, at: now };
  return null;
}

export function playAgain(state: RoomState, playerId: string, now: number): string | null {
  if (state.phase !== "champion") return null;
  if (state.hostId !== playerId) return "err_host_restart";
  state.phase = "lobby";
  state.players = state.players.filter((p) => !p.isBot).slice(0, 8);
  for (const p of state.players) {
    p.spectator = false;
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
  state.leagueStage = null;
  reassignHost(state);
  return null;
}

export function tick(state: RoomState, now: number): boolean {
  let changed = false;
  const host = state.hostId ? findPlayer(state, state.hostId) : undefined;
  if (!host || (!host.isBot && now - host.lastSeen > 60000)) {
    const candidate = state.players.find((p) => !p.isBot && !p.spectator && isConnected(p, now));
    if (candidate && candidate.id !== state.hostId) {
      state.hostId = candidate.id;
      changed = true;
    }
  }
  if (state.phase === "lobby") {
    const before = state.players.length;
    state.players = state.players.filter((p) => p.isBot || now - p.lastSeen < LOBBY_PRUNE_MS);
    if (state.players.length !== before) {
      reassignHost(state);
      changed = true;
    }
  }
  if (state.phase === "draft") {
    if (isChaos(state)) {
      const humansDone = state.players.every((p) => p.isBot || p.spectator || p.offerPicked || !isConnected(p, now));
      if (humansDone) {
        for (const p of state.players) {
          if (p.isBot && !p.offerPicked && p.botPickAt !== null && p.botPickAt > now + 1100) {
            p.botPickAt = now + 250 + Math.random() * 850;
          }
        }
      }
    }
    for (const p of state.players) {
      if (!p.isBot || p.offerPicked || p.botPickAt === null || now < p.botPickAt) continue;
      if (isChaos(state)) {
        const options = chaosClaimable(state, p);
        if (options.length === 0) {
          p.offerPicked = true;
          changed = true;
          continue;
        }
        const best = Math.max(...options.map((o) => RARITY_ORDER[o.item.rarity]));
        const top = options.filter((o) => RARITY_ORDER[o.item.rarity] >= Math.max(0, best - 1));
        const pick = top[Math.floor(Math.random() * top.length)] ?? options[0];
        if (pick) {
          pick.claimedBy = p.id;
          p.equipment[pick.item.slot] = pick.item;
        }
        p.offerPicked = true;
        changed = true;
        continue;
      }
      if (p.offer) {
        const pickable = p.offer.filter((i) => !p.equipment[i.slot]);
        const pick = pickable[Math.floor(Math.random() * pickable.length)];
        if (pick) p.equipment[pick.slot] = pick;
        p.offerPicked = true;
        changed = true;
      }
    }
    const allDone = state.players.every((p) => p.spectator || p.offerPicked || !isConnected(p, now));
    const deadlineHit = state.deadline !== null && now >= state.deadline;
    if (deadlineHit || (allDone && !isChaos(state))) {
      finishDraftRound(state, now);
      changed = true;
    } else if (allDone && isChaos(state)) {
      if (!state.chaosRevealAt) {
        state.chaosRevealAt = now + 1200;
        changed = true;
      } else if (now >= state.chaosRevealAt) {
        finishDraftRound(state, now);
        changed = true;
      }
    }
  }
  if (state.phase === "luck") {
    if (isChaos(state)) {
      const humansDone = state.players.every((p) => p.isBot || p.spectator || p.luckCard !== null || !isConnected(p, now));
      if (humansDone) {
        for (const p of state.players) {
          if (p.isBot && !p.luckCard && p.botPickAt !== null && p.botPickAt > now + 1100) {
            p.botPickAt = now + 250 + Math.random() * 850;
          }
        }
      }
    }
    for (const p of state.players) {
      if (!p.isBot || p.luckCard || p.botPickAt === null || now < p.botPickAt) continue;
      if (isChaos(state)) {
        const open = (state.chaosLuckPool ?? []).filter((e) => e.claimedBy === null);
        const entry = open[Math.floor(Math.random() * open.length)];
        if (entry) {
          entry.claimedBy = p.id;
          p.luckCard = entry.card;
          p.equipment = applyBuildCard(p.equipment, entry.card.id).equipment;
        }
        changed = true;
        continue;
      }
      if (p.luckOffer) {
        const card = p.luckOffer[Math.floor(Math.random() * p.luckOffer.length)];
        if (card) {
          p.luckCard = card;
          p.equipment = applyBuildCard(p.equipment, card.id).equipment;
        }
        changed = true;
      }
    }
    const allDone = state.players.every((p) => p.spectator || p.luckCard !== null || !isConnected(p, now));
    const deadlineHit = state.deadline !== null && now >= state.deadline;
    if (deadlineHit || (allDone && !isChaos(state))) {
      finishLuckPhase(state, now);
      changed = true;
    } else if (allDone && isChaos(state)) {
      if (!state.chaosRevealAt) {
        state.chaosRevealAt = now + 1200;
        changed = true;
      } else if (now >= state.chaosRevealAt) {
        finishLuckPhase(state, now);
        changed = true;
      }
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
      maybeResolveDuel(state, now, true);
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
      defScore,
      atkScore,
      defPass,
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
            nickname: pendingSide === "a" ? sb.a.nickname : sb.b.nickname,
            attackerId: (pendingSide === "a" ? sb.bCanReact : sb.aCanReact) ? (pendingSide === "a" ? bPlayerId : aPlayerId) : null
          }
        : null
    };
  }
  const snapshot: RoomSnapshot = {
    code: state.code,
    phase: state.phase,
    hostId: state.hostId ?? "",
    arenaMap: state.arenaMap ?? "colosseum",
    matchMode: state.matchMode ?? "single",
    tourneyMode: state.tourneyMode ?? "knockout",
    draftMode: state.draftMode ?? "classic",
    leagueStage: state.leagueStage ?? null,
    leagueTable: leagueTableFor(state),
    shout: state.shout && now - state.shout.at < 6000 ? state.shout : null,
    players: state.players.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      avatar: p.avatar ?? avatarIdForSeed(p.id + p.nickname),
      isHost: p.id === state.hostId,
      isBot: p.isBot,
      connected: isConnected(p, now),
      hasPicked: p.spectator ? true : state.phase === "draft" ? p.offerPicked : state.phase === "luck" ? p.luckCard !== null : false,
      spectator: p.spectator ?? false,
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
  if (state.phase === "draft" && isChaos(state) && state.chaosPool && me && !me.spectator) {
    const lockedSlots = SLOTS.filter((s) => me.equipment[s]);
    offer = {
      round: state.draftRound,
      items: state.chaosPool.map((e) => e.item),
      lockedSlots,
      picked: me.offerPicked,
      canPickAny: chaosClaimable(state, me).length > 0,
      mode: "chaos",
      claims: state.chaosPool
        .filter((e) => e.claimedBy !== null)
        .map((e) => ({
          id: e.item.id,
          by: findPlayer(state, e.claimedBy as string)?.nickname ?? "?",
          mine: e.claimedBy === me.id
        }))
    };
  } else if (state.phase === "draft" && me?.offer) {
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
  if (state.phase === "luck" && isChaos(state) && state.chaosLuckPool && me && !me.spectator) {
    luckOffer = {
      cards: state.chaosLuckPool.map((e) => e.card),
      picked: me.luckCard !== null,
      mode: "chaos",
      claims: state.chaosLuckPool
        .filter((e) => e.claimedBy !== null)
        .map((e) => ({
          id: e.card.id,
          by: findPlayer(state, e.claimedBy as string)?.nickname ?? "?",
          mine: e.claimedBy === me.id
        }))
    };
  } else if (state.phase === "luck" && me?.luckOffer) {
    luckOffer = { cards: me.luckOffer, picked: me.luckCard !== null };
  }
  return { snapshot, offer, luckOffer };
}
