export type Slot = "weapon" | "helmet" | "armor" | "boots" | "accessory";

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export interface ItemStats {
  attack?: number;
  defense?: number;
  hp?: number;
  speed?: number;
  critChance?: number;
  critDamage?: number;
  accuracy?: number;
  dodge?: number;
  initiative?: number;
}

export type PassiveType =
  | "firstStrike"
  | "lifesteal"
  | "reflect"
  | "poisonOnHit"
  | "extraAttack"
  | "healPerTurn"
  | "executioner"
  | "berserk"
  | "ignoreDefense"
  | "stunChance"
  | "critResist"
  | "lastStand"
  | "block"
  | "chaos"
  | "shield"
  | "sturdy"
  | "momentum";

export interface Passive {
  type: PassiveType;
  value: number;
  label: string;
}

export interface Item {
  id: string;
  name: string;
  emoji: string;
  slot: Slot;
  rarity: Rarity;
  stats: ItemStats;
  passive?: Passive;
  tags?: string[];
}

export interface LuckCard {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

export interface GameEvent {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

export type Phase = "lobby" | "draft" | "luck" | "event" | "battle" | "champion";

export interface PublicPlayer {
  id: string;
  nickname: string;
  avatar: string;
  isHost: boolean;
  isBot: boolean;
  connected: boolean;
  hasPicked: boolean;
  equipment: Partial<Record<Slot, Item>>;
  luckCard: LuckCard | null;
  eliminated: boolean;
  wins: number;
  spectator?: boolean;
}

export interface BracketMatch {
  a: string | null;
  b: string | null;
  winner: string | null;
}

export interface BracketRound {
  matches: BracketMatch[];
}

export type TimelineEntryType =
  | "intro"
  | "showcase"
  | "event"
  | "card"
  | "windup"
  | "attack"
  | "miss"
  | "dodge"
  | "quirk"
  | "passive"
  | "poison"
  | "death"
  | "victory";

export interface TimelineEntry {
  t: TimelineEntryType;
  actor: "a" | "b" | "none";
  text: string;
  ms?: number;
  key?: string;
  params?: Record<string, string | number>;
  dmg?: number;
  heal?: number;
  crit?: boolean;
  blocked?: boolean;
  absorbed?: number;
  extra?: boolean;
  hpA: number;
  hpB: number;
  fx?: string;
}

export interface FighterView {
  nickname: string;
  avatar?: string;
  maxHp: number;
  equipment: Partial<Record<Slot, Item>>;
  luckCard: LuckCard | null;
  disabledItems: string[];
}

export interface PendingReaction {
  side: "a" | "b";
  playerId: string;
  nickname: string;
  attackerId: string | null;
}

export interface BattlePayload {
  roundIndex: number;
  matchIndex: number;
  roundLabel: string;
  roundKey: "final" | "semifinal" | "quarterfinal" | "round";
  legNumber?: number;
  roundNumber: number;
  elapsedMs?: number;
  pending?: PendingReaction | null;
  a: FighterView;
  b: FighterView;
  winner: "a" | "b";
  timeline: TimelineEntry[];
  stepMs: number;
}

export const ARENA_MAPS = ["colosseum", "dungeon"] as const;
export type ArenaMap = (typeof ARENA_MAPS)[number];

export const MATCH_MODES = ["single", "homeAway"] as const;
export type MatchMode = (typeof MATCH_MODES)[number];

export const TOURNEY_MODES = ["knockout", "league"] as const;
export type TourneyMode = (typeof TOURNEY_MODES)[number];

export interface RoomSnapshot {
  code: string;
  phase: Phase;
  hostId: string;
  arenaMap: ArenaMap;
  matchMode: MatchMode;
  tourneyMode: TourneyMode;
  players: PublicPlayer[];
  draftRound: number;
  totalDraftRounds: number;
  deadline: number | null;
  event: GameEvent | null;
  bracket: BracketRound[] | null;
  battle: BattlePayload | null;
  champion: string | null;
  shout?: { by: string; at: number } | null;
  serverNow: number;
}

export interface DraftOffer {
  round: number;
  items: Item[];
  lockedSlots: Slot[];
  picked: boolean;
  canPickAny: boolean;
}

export interface LuckOffer {
  cards: LuckCard[];
  picked: boolean;
}

export const SLOTS: Slot[] = ["weapon", "helmet", "armor", "boots", "accessory"];

export const SLOT_META: Record<Slot, { label: string; emoji: string }> = {
  weapon: { label: "Weapon", emoji: "⚔️" },
  helmet: { label: "Helmet", emoji: "🪖" },
  armor: { label: "Armor", emoji: "🛡️" },
  boots: { label: "Boots", emoji: "👞" },
  accessory: { label: "Accessory", emoji: "💍" }
};

export const RARITY_ORDER: Record<Rarity, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4
};

export const TOTAL_DRAFT_ROUNDS = 5;
export const DRAFT_TIME_MS = 35000;
export const LUCK_TIME_MS = 25000;
