import type { Item, LuckCard, Slot, TimelineEntry } from "./types";
import { RARITY_ORDER, SLOTS } from "./types";
import { weaponKindFor } from "./items";
import type { EventDef } from "./events";

export interface Build {
  nickname: string;
  equipment: Partial<Record<Slot, Item>>;
  luckCard: LuckCard | null;
}

export interface SimOptions {
  seed?: number;
  reactions?: boolean[];
  aCanReact?: boolean;
  bCanReact?: boolean;
}

export interface BattleResult {
  winner: "a" | "b";
  timeline: TimelineEntry[];
  stepMs: number;
  totalMs: number;
  pendingSide: "a" | "b" | null;
  aEquipment: Partial<Record<Slot, Item>>;
  bEquipment: Partial<Record<Slot, Item>>;
  aDisabled: string[];
  bDisabled: string[];
  aMaxHp: number;
  bMaxHp: number;
}

interface Combatant {
  key: "a" | "b";
  nickname: string;
  hp: number;
  maxHp: number;
  shield: number;
  attack: number;
  defense: number;
  critChance: number;
  critDamage: number;
  accuracy: number;
  dodge: number;
  speed: number;
  initiative: number;
  lifesteal: number;
  reflect: number;
  poisonOnHit: number;
  extraAttack: number;
  healPerTurn: number;
  executioner: number;
  berserk: number;
  ignoreDefense: number;
  stunChance: number;
  critResist: number;
  block: number;
  lastStandValue: number;
  lastStandUsed: boolean;
  firstStrike: boolean;
  firstCritReady: boolean;
  poison: number;
  stunned: boolean;
  weaponName: string;
  weaponId: string;
  windupKey: string;
  weaponless: boolean;
  hasBoots: boolean;
  hasHelmet: boolean;
  hasArmor: boolean;
  bootsThrown: boolean;
  helmetLost: boolean;
  armorCracks: number;
  ankleTwisted: boolean;
  blinded: boolean;
  catchBuff: boolean;
  desperationUsed: boolean;
  challengeUsed: boolean;
}

interface PreEntry {
  text: string;
  key: string;
  params: Record<string, string | number>;
  fx?: string;
}

class ReactionPause {
  side: "a" | "b";
  constructor(side: "a" | "b") {
    this.side = side;
  }
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let rng: () => number = Math.random;
const rand = () => rng();
const roll = (pct: number) => rand() * 100 < pct;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function windupKeyFor(item: Item): string {
  const kind = weaponKindFor(item);
  if (kind === "ranged") return "windupRanged";
  if (kind === "heavy") return "windupHeavy";
  return "windupBlade";
}

function entryMs(e: Omit<TimelineEntry, "hpA" | "hpB">): number {
  switch (e.t) {
    case "intro":
      return 1600;
    case "showcase":
      return 2600;
    case "event":
      return 2400;
    case "card":
      return 1800;
    case "windup":
      return 1800;
    case "attack":
      return e.crit ? 2000 : 1500;
    case "miss":
    case "dodge":
      return 1500;
    case "quirk":
      return 1900;
    case "passive":
    case "poison":
      return 950;
    case "death":
      return 1700;
    case "victory":
      return 2600;
    default:
      return 1200;
  }
}

function itemPower(item: Item): number {
  const s = item.stats;
  const sum =
    Math.abs(s.attack ?? 0) * 2 +
    Math.abs(s.defense ?? 0) * 2 +
    Math.abs(s.hp ?? 0) * 0.6 +
    Math.abs(s.speed ?? 0) +
    Math.abs(s.critChance ?? 0) +
    Math.abs(s.dodge ?? 0);
  return sum + RARITY_ORDER[item.rarity] * 10 + (item.passive ? 15 : 0);
}

function strongestItemId(equipment: Partial<Record<Slot, Item>>, exclude: string[]): string | null {
  let best: Item | null = null;
  for (const slot of SLOTS) {
    const item = equipment[slot];
    if (!item || exclude.includes(item.id)) continue;
    if (!best || itemPower(item) > itemPower(best)) best = item;
  }
  return best ? best.id : null;
}

function ownsRarity(equipment: Partial<Record<Slot, Item>>, rarity: string, disabled: string[]): boolean {
  return SLOTS.some((s) => {
    const it = equipment[s];
    return !!it && it.rarity === rarity && !disabled.includes(it.id);
  });
}

function buildCombatant(
  key: "a" | "b",
  build: Build,
  event: EventDef,
  disabled: string[]
): Combatant {
  const h = event.hooks;
  const c: Combatant = {
    key,
    nickname: build.nickname,
    hp: 100,
    maxHp: 100,
    shield: 0,
    attack: 12,
    defense: 0,
    critChance: 10,
    critDamage: 50,
    accuracy: 90,
    dodge: 5,
    speed: 10,
    initiative: 0,
    lifesteal: 0,
    reflect: 0,
    poisonOnHit: 0,
    extraAttack: 0,
    healPerTurn: 0,
    executioner: 0,
    berserk: 0,
    ignoreDefense: 0,
    stunChance: 0,
    critResist: 0,
    block: 0,
    lastStandValue: 0,
    lastStandUsed: false,
    firstStrike: false,
    firstCritReady: false,
    poison: 0,
    stunned: false,
    weaponName: "fists",
    weaponId: "fists",
    windupKey: "windupBlade",
    weaponless: false,
    hasBoots: false,
    hasHelmet: false,
    hasArmor: false,
    bootsThrown: false,
    helmetLost: false,
    armorCracks: 0,
    ankleTwisted: false,
    blinded: false,
    catchBuff: false,
    desperationUsed: false,
    challengeUsed: false
  };

  for (const slot of SLOTS) {
    const item = build.equipment[slot];
    if (!item || disabled.includes(item.id)) continue;
    if (slot === "weapon") {
      c.weaponName = item.name;
      c.weaponId = item.id;
      c.windupKey = windupKeyFor(item);
    }
    if (slot === "boots") c.hasBoots = true;
    if (slot === "helmet") c.hasHelmet = true;
    if (slot === "armor") c.hasArmor = true;
    let atkMult = 1;
    let defMult = 1;
    for (const mod of h.statMods ?? []) {
      if (mod.requireOwned) continue;
      const hit =
        (mod.target === "rarity" && item.rarity === mod.match) ||
        (mod.target === "tag" && (item.tags ?? []).includes(mod.match)) ||
        (mod.target === "slot" && item.slot === mod.match);
      if (hit) {
        atkMult *= mod.attackMult ?? 1;
        defMult *= mod.defenseMult ?? 1;
      }
    }
    c.attack += (item.stats.attack ?? 0) * atkMult;
    c.defense += (item.stats.defense ?? 0) * defMult;
    c.maxHp += item.stats.hp ?? 0;
    c.speed += item.stats.speed ?? 0;
    c.critChance += item.stats.critChance ?? 0;
    c.critDamage += item.stats.critDamage ?? 0;
    c.accuracy += item.stats.accuracy ?? 0;
    c.dodge += item.stats.dodge ?? 0;
    c.initiative += item.stats.initiative ?? 0;
    const p = item.passive;
    if (p && !(h.silenceAccessories && slot === "accessory")) {
      if (p.type === "firstStrike") c.firstStrike = true;
      if (p.type === "lifesteal") c.lifesteal += p.value;
      if (p.type === "reflect") c.reflect += p.value;
      if (p.type === "poisonOnHit") c.poisonOnHit += p.value;
      if (p.type === "extraAttack") c.extraAttack += p.value;
      if (p.type === "healPerTurn") c.healPerTurn += p.value;
      if (p.type === "executioner") c.executioner += p.value;
      if (p.type === "berserk") c.berserk += p.value;
      if (p.type === "ignoreDefense") c.ignoreDefense += p.value;
      if (p.type === "stunChance") c.stunChance += p.value;
      if (p.type === "critResist") c.critResist += p.value;
      if (p.type === "lastStand") c.lastStandValue = Math.max(c.lastStandValue, p.value);
      if (p.type === "block") c.block += p.value;
      if (p.type === "shield") c.shield += p.value;
      if (p.type === "chaos") {
        const shift = () => 1 + (rand() * 2 - 1) * (p.value / 100);
        c.attack *= shift();
        c.defense *= shift();
        c.maxHp *= shift();
        c.speed *= shift();
        c.critChance *= shift();
        c.dodge *= shift();
      }
    }
  }

  for (const mod of h.statMods ?? []) {
    if (!mod.requireOwned) continue;
    if (mod.target === "rarity" && ownsRarity(build.equipment, mod.match, disabled)) {
      c.attack *= mod.ownedAttackMult ?? 1;
      c.defense *= mod.ownedDefenseMult ?? 1;
    }
  }

  const card = build.luckCard?.id;
  if (card === "lucky") c.critChance *= 2;
  if (card === "vampire") c.lifesteal += 20;
  if (card === "barrier") c.shield += 35;
  if (card === "phoenix") c.lastStandValue = Math.max(c.lastStandValue, 40);
  if (card === "assassin") c.firstCritReady = true;
  if (card === "titan") {
    c.maxHp += 40;
    c.speed *= 0.7;
  }

  c.maxHp *= h.hpMultiplier ?? 1;
  c.maxHp += h.flatHp ?? 0;
  c.attack *= h.attackMultiplier ?? 1;
  c.defense *= h.defenseMultiplier ?? 1;
  c.speed *= h.speedMultiplier ?? 1;
  c.critDamage += h.critDamageBonus ?? 0;
  c.critChance *= h.critChanceMultiplier ?? 1;
  c.accuracy += h.accuracyDelta ?? 0;
  c.dodge += h.dodgeDelta ?? 0;
  c.lifesteal += h.lifestealBonus ?? 0;
  c.healPerTurn += h.healPerTurnBonus ?? 0;
  c.extraAttack += h.extraAttackBonus ?? 0;
  if (h.zeroDodge) c.dodge = 0;
  if (h.swapAttackDefense) {
    const a = c.attack;
    c.attack = Math.max(8, c.defense * 1.6);
    c.defense = a * 0.6;
  }
  if (h.chaosAll) {
    const shift = () => 1 + (rand() * 2 - 1) * 0.3;
    c.attack *= shift();
    c.defense *= shift();
    c.maxHp *= shift();
    c.speed *= shift();
  }

  c.maxHp = Math.max(30, Math.round(c.maxHp));
  c.attack = Math.max(5, c.attack);
  c.defense = Math.max(0, c.defense);
  c.accuracy = clamp(c.accuracy, 30, 100);
  c.dodge = clamp(c.dodge, 0, 60);
  c.critChance = clamp(c.critChance, 0, 90);
  c.hp = c.maxHp;
  if (c.weaponId === "fists") {
    c.weaponless = true;
    c.windupKey = "windupImprov";
  }
  return c;
}

function randomEquippedSlot(equipment: Partial<Record<Slot, Item>>): Slot | null {
  const filled = SLOTS.filter((s) => equipment[s]);
  if (filled.length === 0) return null;
  return filled[Math.floor(rand() * filled.length)] ?? null;
}

function disarm(c: Combatant): void {
  c.weaponless = true;
  c.attack = Math.max(5, c.attack * 0.7);
  c.weaponName = "fists";
  c.weaponId = "fists";
  c.windupKey = "windupImprov";
}

export function simulateBattle(aBuild: Build, bBuild: Build, event: EventDef, opts?: SimOptions): BattleResult {
  const seed = opts?.seed ?? Math.floor(Math.random() * 2147483647);
  const reactions = opts?.reactions ?? [];
  const aCanReact = opts?.aCanReact ?? false;
  const bCanReact = opts?.bCanReact ?? false;
  rng = mulberry32(seed);
  let reactionIdx = 0;
  let pendingSide: "a" | "b" | null = null;

  const timeline: TimelineEntry[] = [];
  const aEquip: Partial<Record<Slot, Item>> = { ...aBuild.equipment };
  const bEquip: Partial<Record<Slot, Item>> = { ...bBuild.equipment };
  const aDisabled: string[] = [];
  const bDisabled: string[] = [];
  const pre: PreEntry[] = [];

  const applyCards = (
    self: Build,
    selfEquip: Partial<Record<Slot, Item>>,
    otherEquip: Partial<Record<Slot, Item>>,
    otherDisabled: string[],
    selfName: string,
    otherName: string
  ) => {
    const card = self.luckCard?.id;
    if (card === "pirate") {
      const slot = randomEquippedSlot(otherEquip);
      if (slot) {
        const stolen = otherEquip[slot];
        if (stolen) {
          delete otherEquip[slot];
          selfEquip[slot] = stolen;
          pre.push({
            text: `🏴‍☠️ ${selfName} activates Pirate and steals ${otherName}'s ${stolen.emoji} ${stolen.name}!`,
            key: "pirate",
            params: { p: selfName, o: otherName, item: stolen.id, emoji: stolen.emoji },
            fx: `steal:${slot}`
          });
        }
      }
    }
    if (card === "trade") {
      const slot = randomEquippedSlot(otherEquip) ?? randomEquippedSlot(selfEquip);
      if (slot) {
        const mine = selfEquip[slot];
        const theirs = otherEquip[slot];
        if (theirs) selfEquip[slot] = theirs;
        else delete selfEquip[slot];
        if (mine) otherEquip[slot] = mine;
        else delete otherEquip[slot];
        pre.push({
          text: `🎁 ${selfName} activates Trade! ${slot} items are swapped with ${otherName}!`,
          key: "trade",
          params: { p: selfName, o: otherName, slot },
          fx: `trade:${slot}`
        });
      }
    }
    if (card === "curse") {
      const id = strongestItemId(otherEquip, otherDisabled);
      if (id) {
        otherDisabled.push(id);
        const item = SLOTS.map((s) => otherEquip[s]).find((i) => i?.id === id);
        pre.push({
          text: `💀 ${selfName}'s Curse disables ${otherName}'s ${item?.emoji ?? ""} ${item?.name ?? "item"}!`,
          key: "curse",
          params: { p: selfName, o: otherName, item: item?.id ?? "", emoji: item?.emoji ?? "" },
          fx: "curse"
        });
      }
    }
    if (card === "magnet") {
      const weapon = otherEquip.weapon;
      if (weapon && !otherDisabled.includes(weapon.id)) {
        otherDisabled.push(weapon.id);
        pre.push({
          text: `🧲 ${selfName}'s Magnet rips ${otherName}'s ${weapon.emoji} ${weapon.name} away!`,
          key: "magnet",
          params: { p: selfName, o: otherName, item: weapon.id, emoji: weapon.emoji },
          fx: "magnet"
        });
      }
    }
  };

  applyCards(aBuild, aEquip, bEquip, bDisabled, aBuild.nickname, bBuild.nickname);
  applyCards(bBuild, bEquip, aEquip, aDisabled, bBuild.nickname, aBuild.nickname);

  const a = buildCombatant("a", { ...aBuild, equipment: aEquip }, event, aDisabled);
  const b = buildCombatant("b", { ...bBuild, equipment: bEquip }, event, bDisabled);

  if (event.hooks.underdogBoost) {
    const powerOf = (c: Combatant) => c.attack * 2 + c.defense * 2 + c.maxHp * 0.5 + c.speed;
    const weak = powerOf(a) < powerOf(b) ? a : b;
    const boost = 1 + event.hooks.underdogBoost / 100;
    weak.attack *= boost;
    weak.defense *= boost;
    weak.maxHp = Math.round(weak.maxHp * boost);
    weak.hp = weak.maxHp;
    pre.push({
      text: `🐕 Underdog Spirit empowers ${weak.nickname}!`,
      key: "underdog",
      params: { p: weak.nickname },
      fx: "underdog"
    });
  }

  const applyBattleStartCards = (self: Combatant, selfBuild: Build, other: Combatant) => {
    const card = selfBuild.luckCard?.id;
    if (card === "lightning") {
      other.maxHp = Math.round(other.maxHp * 0.75);
      other.hp = other.maxHp;
      pre.push({
        text: `⚡ ${self.nickname}'s Lightning strikes ${other.nickname} before the fight! -25% HP!`,
        key: "lightning",
        params: { p: self.nickname, o: other.nickname },
        fx: "lightning"
      });
    }
    if (card === "allin") {
      if (roll(50)) {
        self.attack *= 1.8;
        self.maxHp = Math.round(self.maxHp * 1.8);
        self.hp = self.maxHp;
        pre.push({
          text: `🎰 ${self.nickname} goes ALL IN... JACKPOT! Attack and HP surge!`,
          key: "jackpot",
          params: { p: self.nickname },
          fx: "jackpot"
        });
      } else {
        self.attack *= 0.55;
        self.maxHp = Math.max(30, Math.round(self.maxHp * 0.55));
        self.hp = self.maxHp;
        pre.push({
          text: `🎰 ${self.nickname} goes ALL IN... and BUSTS! Attack and HP crumble!`,
          key: "bust",
          params: { p: self.nickname },
          fx: "bust"
        });
      }
    }
  };
  applyBattleStartCards(a, aBuild, b);
  applyBattleStartCards(b, bBuild, a);

  const push = (e: Omit<TimelineEntry, "hpA" | "hpB">) => {
    timeline.push({ ms: entryMs(e), ...e, hpA: Math.max(0, Math.round(a.hp)), hpB: Math.max(0, Math.round(b.hp)) });
  };

  push({
    t: "intro",
    actor: "none",
    text: `⚔️ ${a.nickname} VS ${b.nickname}!`,
    key: "intro",
    params: { a: a.nickname, b: b.nickname }
  });
  push({
    t: "showcase",
    actor: "a",
    text: `🎺 ${a.nickname} enters the arena!`,
    key: "showcase",
    params: { p: a.nickname }
  });
  push({
    t: "showcase",
    actor: "b",
    text: `🎺 ${b.nickname} enters the arena!`,
    key: "showcase",
    params: { p: b.nickname }
  });
  push({
    t: "event",
    actor: "none",
    text: `${event.emoji} ${event.name}: ${event.description}`,
    key: "eventLine",
    params: { event: event.id, emoji: event.emoji },
    fx: `event:${event.id}`
  });
  for (const p of pre) push({ t: "card", actor: "none", text: p.text, key: p.key, params: p.params, fx: p.fx });

  const canReact = (c: Combatant) => (c.key === "a" ? aCanReact : bCanReact);

  const rawDamage = (att: Combatant, def: Combatant, mult: number): number => {
    let dmg = att.attack * (0.85 + rand() * 0.3) * 1.45 * mult;
    dmg -= def.defense * 0.5;
    return Math.max(3, Math.round(dmg));
  };

  const desperation = (att: Combatant, def: Combatant): boolean => {
    if (att.desperationUsed || att.hp <= 0 || att.hp >= att.maxHp * 0.18 || !roll(30)) return false;
    att.desperationUsed = true;
    const r = rand();
    if (r < 0.34) {
      const dmg = rawDamage(att, def, 1.6);
      def.hp -= dmg;
      att.defense *= 0.5;
      push({
        t: "quirk",
        actor: att.key,
        text: `💀 ${att.nickname} played dead... SURPRISE ATTACK! -${dmg}`,
        key: "quirkDead",
        params: { p: att.nickname, d: def.nickname, dmg },
        dmg
      });
    } else if (r < 0.67) {
      if (roll(50)) {
        const dmg = rawDamage(att, def, 2);
        def.hp -= dmg;
        push({
          t: "quirk",
          actor: att.key,
          text: `😤 ${att.nickname} went ALL OUT! -${dmg}!`,
          key: "quirkAllOutHit",
          params: { p: att.nickname, d: def.nickname, dmg },
          dmg
        });
      } else {
        push({
          t: "quirk",
          actor: att.key,
          text: `😤 ${att.nickname} went all out... and MISSED!`,
          key: "quirkAllOutMiss",
          params: { p: att.nickname }
        });
      }
    } else {
      const heal = Math.min(10, att.maxHp - att.hp);
      att.hp += heal;
      push({
        t: "quirk",
        actor: att.key,
        text: `🙏 ${att.nickname} prayed. The gods chuckled. +${heal}`,
        key: "quirkPrayer",
        params: { p: att.nickname, heal },
        heal
      });
    }
    return true;
  };

  const improvAttack = (att: Combatant, def: Combatant) => {
    const r = rand();
    if (r < 0.22) {
      const dmg = rawDamage(att, def, 1);
      def.hp -= dmg;
      push({
        t: "quirk",
        actor: att.key,
        text: `🪨 ${att.nickname} threw a rock! -${dmg}`,
        key: "quirkRock",
        params: { p: att.nickname, d: def.nickname, dmg },
        dmg
      });
    } else if (r < 0.37) {
      const dmg = rawDamage(att, def, 0.55);
      def.hp -= dmg;
      def.poison = Math.max(def.poison, 6);
      push({
        t: "quirk",
        actor: att.key,
        text: `🦷 ${att.nickname} BIT ${def.nickname}! Poisoned!`,
        key: "quirkBite",
        params: { p: att.nickname, d: def.nickname, dmg },
        dmg
      });
    } else if (r < 0.47 && att.hasBoots && !att.bootsThrown) {
      att.bootsThrown = true;
      att.dodge *= 0.75;
      const dmg = rawDamage(att, def, 1.4);
      def.hp -= dmg;
      push({
        t: "quirk",
        actor: att.key,
        text: `🥾 ${att.nickname} threw a boot! -${dmg}`,
        key: "quirkBoot",
        params: { p: att.nickname, d: def.nickname, dmg },
        dmg
      });
    } else if (r < 0.6) {
      const dmg = rawDamage(att, def, 0.6);
      def.hp -= dmg;
      const stun = roll(35);
      if (stun) def.stunned = true;
      push({
        t: "quirk",
        actor: att.key,
        text: `🩴 SLAP! ${att.nickname} hit with a slipper! -${dmg}`,
        key: "quirkSlipper",
        params: { p: att.nickname, d: def.nickname, dmg },
        dmg
      });
      if (stun) {
        push({
          t: "passive",
          actor: att.key,
          text: `💫 ${def.nickname} is stunned and will miss a turn!`,
          key: "stunApplied",
          params: { d: def.nickname }
        });
      }
    } else if (r < 0.72) {
      def.blinded = true;
      push({
        t: "quirk",
        actor: att.key,
        text: `💨 ${att.nickname} threw sand in ${def.nickname}'s eyes!`,
        key: "quirkSand",
        params: { p: att.nickname, d: def.nickname }
      });
    } else if (r < 0.84) {
      def.defense *= 0.88;
      push({
        t: "quirk",
        actor: att.key,
        text: `🗣️ ${att.nickname} insulted ${def.nickname}! Defense drops!`,
        key: "quirkInsult",
        params: { p: att.nickname, d: def.nickname }
      });
    } else {
      const dmg = rawDamage(att, def, 1.1);
      def.hp -= dmg;
      att.hp -= 4;
      push({
        t: "quirk",
        actor: att.key,
        text: `🤕 ${att.nickname} headbutted! Both hurt!`,
        key: "quirkHeadbutt",
        params: { p: att.nickname, d: def.nickname, dmg },
        dmg
      });
    }
  };

  const fumble = (att: Combatant, def: Combatant): void => {
    if (att.windupKey === "windupRanged" && roll(35)) {
      disarm(att);
      push({
        t: "quirk",
        actor: att.key,
        text: `🏹 ${att.nickname}'s bowstring SNAPPED!`,
        key: "quirkString",
        params: { p: att.nickname }
      });
      return;
    }
    const r = rand();
    if (r < 0.34) {
      att.hp -= 5;
      push({
        t: "quirk",
        actor: att.key,
        text: `🦶 ${att.nickname} dropped the ${att.weaponName} on their foot!`,
        key: "quirkDropFoot",
        params: { p: att.nickname, weapon: att.weaponId },
        dmg: 5
      });
    } else if (r < 0.67) {
      def.catchBuff = true;
      push({
        t: "quirk",
        actor: att.key,
        text: `😱 ${def.nickname} CAUGHT ${att.nickname}'s ${att.weaponName}!`,
        key: "quirkCaught",
        params: { p: att.nickname, d: def.nickname, weapon: att.weaponId }
      });
    } else {
      push({
        t: "quirk",
        actor: att.key,
        text: `🪤 ${att.nickname}'s ${att.weaponName} is stuck in the ground!`,
        key: "quirkStuck",
        params: { p: att.nickname, weapon: att.weaponId }
      });
    }
  };

  const attackOnce = (att: Combatant, def: Combatant, extra: boolean) => {
    if (att.hp <= 0 || def.hp <= 0) return;
    if (!extra && desperation(att, def)) return;
    const prefix = extra ? "⚡ Extra attack! " : "";
    if (!extra) {
      push({
        t: "windup",
        actor: att.key,
        text: `⏳ ${att.nickname} readies the ${att.weaponName}...`,
        key: att.windupKey,
        params: { p: att.nickname, weapon: att.weaponId }
      });
    }
    if (att.weaponless) {
      improvAttack(att, def);
      return;
    }
    if (!extra && roll(5)) {
      fumble(att, def);
      return;
    }
    if (!extra && canReact(def) && !def.challengeUsed && roll(55)) {
      def.challengeUsed = true;
      const decision = reactions[reactionIdx];
      reactionIdx++;
      if (decision === undefined) throw new ReactionPause(def.key);
      if (decision) {
        push({
          t: "dodge",
          actor: att.key,
          text: `🌀 ${def.nickname} pulls off a PERFECT DODGE!`,
          key: "qteDodge",
          params: { p: att.nickname, d: def.nickname }
        });
        return;
      }
    }
    let acc = att.accuracy;
    if (att.blinded) {
      att.blinded = false;
      acc -= 30;
    }
    const dodgeUsed = def.ankleTwisted ? 0 : def.dodge;
    if (def.ankleTwisted) def.ankleTwisted = false;
    const hitChance = clamp(acc - dodgeUsed, 15, 100);
    if (!roll(hitChance)) {
      if (roll(50)) {
        push({
          t: "miss",
          actor: att.key,
          text: `${prefix}💨 ${att.nickname} swings the ${att.weaponName}... and misses!`,
          key: "miss",
          params: { p: att.nickname, weapon: att.weaponId },
          extra
        });
        if (!extra && roll(12)) {
          att.hp -= 4;
          def.hp -= 4;
          push({
            t: "quirk",
            actor: "none",
            text: `🤦 They clashed heads! Both -4`,
            key: "quirkBump",
            params: { p: att.nickname, d: def.nickname },
            dmg: 4
          });
        }
      } else {
        push({
          t: "dodge",
          actor: att.key,
          text: `${prefix}🌀 ${def.nickname} dodges ${att.nickname}'s attack!`,
          key: "dodgeLine",
          params: { p: att.nickname, d: def.nickname },
          extra
        });
        if (!extra && roll(12)) {
          def.ankleTwisted = true;
          push({
            t: "quirk",
            actor: def.key,
            text: `🦶 ${def.nickname} twisted an ankle dodging!`,
            key: "quirkAnkle",
            params: { d: def.nickname }
          });
        }
      }
      return;
    }
    let atk = att.attack;
    if (att.berserk > 0 && att.hp < att.maxHp * 0.4) atk *= 1 + att.berserk / 100;
    let dmg = atk * (0.85 + rand() * 0.3) * 1.45;
    if (att.catchBuff) {
      att.catchBuff = false;
      dmg *= 1.4;
    }
    let isCrit = roll(att.critChance);
    if (att.firstCritReady) {
      isCrit = true;
      att.firstCritReady = false;
    }
    if (isCrit) {
      const critMult = 1 + (att.critDamage / 100) * (1 - def.critResist / 100);
      dmg *= critMult;
    }
    if (att.executioner > 0 && def.hp < def.maxHp * 0.35) dmg *= 1 + att.executioner / 100;
    const effDef = def.defense * (1 - att.ignoreDefense / 100);
    dmg -= effDef * 0.5;
    dmg = Math.max(3, dmg);
    let blocked = false;
    if (def.block > 0 && roll(def.block)) {
      dmg *= 0.5;
      blocked = true;
    }
    dmg = Math.round(dmg);
    let absorbed = 0;
    if (def.shield > 0) {
      absorbed = Math.min(def.shield, dmg);
      def.shield -= absorbed;
    }
    def.hp -= dmg - absorbed;
    const bits: string[] = [];
    if (isCrit) bits.push("💥 CRITICAL HIT!");
    if (blocked) bits.push("🛡️ Partially blocked!");
    if (absorbed > 0) bits.push(`✨ Shield absorbs ${absorbed}!`);
    push({
      t: "attack",
      actor: att.key,
      text: `${prefix}⚔️ ${att.nickname} strikes with the ${att.weaponName}! ${def.nickname} loses ${dmg - absorbed} HP. ${bits.join(" ")}`.trim(),
      key: "strike",
      params: { p: att.nickname, d: def.nickname, weapon: att.weaponId, dmg: dmg - absorbed },
      dmg: dmg - absorbed,
      crit: isCrit,
      blocked,
      absorbed,
      extra
    });
    if (isCrit && def.hp > 0) {
      if (!def.weaponless && roll(14)) {
        disarm(def);
        push({
          t: "quirk",
          actor: att.key,
          text: `🩸 ${def.nickname}'s arm is hit! Weapon dropped!`,
          key: "quirkArm",
          params: { d: def.nickname }
        });
      } else if (def.hasHelmet && !def.helmetLost && roll(25)) {
        def.helmetLost = true;
        def.defense *= 0.85;
        push({
          t: "quirk",
          actor: att.key,
          text: `🪖 ${def.nickname}'s helmet flew into the crowd!`,
          key: "quirkHelmet",
          params: { d: def.nickname }
        });
      }
    }
    if (def.hp > 0 && def.hasArmor && def.armorCracks < 2 && dmg - absorbed >= def.maxHp * 0.24) {
      def.armorCracks++;
      def.defense *= def.armorCracks === 1 ? 0.8 : 0.7;
      push({
        t: "quirk",
        actor: att.key,
        text: def.armorCracks === 1 ? `🛡️ ${def.nickname}'s armor cracked!` : `🛡️💥 ${def.nickname}'s armor SHATTERED!`,
        key: def.armorCracks === 1 ? "quirkCrack" : "quirkShatter",
        params: { d: def.nickname }
      });
    }
    if (att.lifesteal > 0 && !event.hooks.noHealing) {
      const heal = Math.round((dmg * att.lifesteal) / 100);
      if (heal > 0) {
        att.hp = Math.min(att.maxHp, att.hp + heal);
        push({
          t: "passive",
          actor: att.key,
          text: `🩸 ${att.nickname} drains ${heal} HP!`,
          key: "lifesteal",
          params: { p: att.nickname, heal },
          heal
        });
      }
    }
    if (def.reflect > 0 && def.hp > 0) {
      const ref = Math.round((dmg * def.reflect) / 100);
      if (ref > 0) {
        att.hp -= ref;
        push({
          t: "passive",
          actor: def.key,
          text: `🌵 ${def.nickname}'s armor reflects ${ref} damage back!`,
          key: "reflect",
          params: { d: def.nickname, dmg: ref },
          dmg: ref
        });
      }
    }
    if (att.poisonOnHit > 0 && def.hp > 0) {
      def.poison = Math.max(def.poison, att.poisonOnHit);
      push({
        t: "passive",
        actor: att.key,
        text: `🐍 ${def.nickname} is poisoned!`,
        key: "poisonApplied",
        params: { d: def.nickname }
      });
    }
    if (att.stunChance > 0 && def.hp > 0 && roll(att.stunChance)) {
      def.stunned = true;
      push({
        t: "passive",
        actor: att.key,
        text: `💫 ${def.nickname} is stunned and will miss a turn!`,
        key: "stunApplied",
        params: { d: def.nickname }
      });
    }
  };

  const tryRevive = (c: Combatant): boolean => {
    if (c.hp <= 0 && c.lastStandValue > 0 && !c.lastStandUsed) {
      c.lastStandUsed = true;
      c.hp = Math.round((c.maxHp * c.lastStandValue) / 100);
      push({
        t: "passive",
        actor: c.key,
        text: `🔥 ${c.nickname} refuses to die and rises again with ${c.hp} HP!`,
        key: "revive",
        params: { p: c.nickname, hp: c.hp },
        fx: "revive"
      });
      return true;
    }
    return c.hp > 0;
  };

  const interlude = (round: number) => {
    const r = rand();
    if (r < 0.14) {
      push({
        t: "quirk",
        actor: "none",
        text: `🐔 A chicken wandered in. Everyone froze.`,
        key: "quirkChicken",
        params: {}
      });
    } else if (r < 0.26) {
      const target = roll(50) ? a : b;
      target.hp -= 2;
      push({
        t: "quirk",
        actor: target.key,
        text: `🍅 Tomato from the crowd! ${target.nickname} -2`,
        key: "quirkTomato",
        params: { p: target.nickname },
        dmg: 2
      });
      tryRevive(target);
    } else if (r < 0.36) {
      const target = roll(50) ? a : b;
      target.hp -= 1;
      push({
        t: "quirk",
        actor: target.key,
        text: `🐦 A pigeon landed on ${target.nickname}'s head!`,
        key: "quirkPigeon",
        params: { p: target.nickname },
        dmg: 1
      });
      tryRevive(target);
    } else if (r < 0.44) {
      push({
        t: "quirk",
        actor: "none",
        text: `📱 Someone's phone rang. Everyone is judging them.`,
        key: "quirkPhone",
        params: {}
      });
    } else if (r < 0.52) {
      const target = roll(50) ? a : b;
      push({
        t: "quirk",
        actor: target.key,
        text: `🧐 The referee inspects ${target.nickname}'s gear. Legal. Barely.`,
        key: "quirkReferee",
        params: { p: target.nickname }
      });
    } else if (r < 0.6) {
      const lucky = roll(50) ? a : b;
      const heal = 4;
      lucky.hp = Math.min(lucky.maxHp, lucky.hp + heal);
      push({
        t: "quirk",
        actor: lucky.key,
        text: `🥨 A vendor tossed ${lucky.nickname} a pretzel! +${heal} HP`,
        key: "quirkSnack",
        params: { p: lucky.nickname, n: heal },
        heal
      });
    } else if (r < 0.72) {
      const show = roll(50) ? a : b;
      push({
        t: "quirk",
        actor: show.key,
        text: `💪 ${show.nickname} flexes at the crowd!`,
        key: "quirkTaunt",
        params: { p: show.nickname }
      });
    } else if (r < 0.86 || round <= 4) {
      push({
        t: "quirk",
        actor: "none",
        text: `🌧️ It started raining. Dramatic.`,
        key: "quirkRain",
        params: {}
      });
    } else {
      push({
        t: "quirk",
        actor: "none",
        text: `😮‍💨 Both stop to catch their breath...`,
        key: "quirkBreather",
        params: {}
      });
    }
  };

  let winner: "a" | "b" = "a";
  try {
    let round = 1;
    let interludes = 0;
    const maxRounds = 20;
    while (a.hp > 0 && b.hp > 0 && round <= maxRounds) {
      if (round >= 2 && interludes < 2 && roll(9)) {
        interludes++;
        interlude(round);
        if (a.hp <= 0 || b.hp <= 0) break;
      }
      let order: [Combatant, Combatant];
      if (event.hooks.randomInitiative) {
        order = roll(50) ? [a, b] : [b, a];
      } else if (a.firstStrike !== b.firstStrike) {
        order = a.firstStrike ? [a, b] : [b, a];
      } else {
        const ia = a.initiative + a.speed + rand() * 20;
        const ib = b.initiative + b.speed + rand() * 20;
        order = ia >= ib ? [a, b] : [b, a];
      }
      for (const att of order) {
        const def = att === a ? b : a;
        if (att.hp <= 0 || def.hp <= 0) continue;
        if (att.stunned) {
          att.stunned = false;
          push({
            t: "passive",
            actor: att.key,
            text: `💫 ${att.nickname} is stunned and staggers!`,
            key: "stunSkip",
            params: { p: att.nickname }
          });
          continue;
        }
        attackOnce(att, def, false);
        if (def.hp > 0 && att.hp > 0 && roll(att.extraAttack)) attackOnce(att, def, true);
        if (!tryRevive(def)) break;
        if (!tryRevive(att)) break;
      }
      for (const c of [a, b]) {
        if (c.hp <= 0) continue;
        const other = c === a ? b : a;
        if (other.hp <= 0) continue;
        let dot = c.poison + (event.hooks.poisonAll ?? 0);
        if (round > 4) dot += (round - 4) * 8;
        if (dot > 0) {
          c.hp -= dot;
          const fatigued = round > 4;
          push({
            t: "poison",
            actor: c.key,
            text: `${fatigued ? "⏳ Fatigue and poison" : "☠️ Poison"} deals ${dot} damage to ${c.nickname}!`,
            key: fatigued ? "fatigueTick" : "poisonTick",
            params: { p: c.nickname, dmg: dot },
            dmg: dot
          });
          if (!tryRevive(c)) break;
        }
        if (c.healPerTurn > 0 && !event.hooks.noHealing && c.hp > 0 && c.hp < c.maxHp) {
          const heal = Math.min(c.healPerTurn, c.maxHp - c.hp);
          c.hp += heal;
          push({
            t: "passive",
            actor: c.key,
            text: `💚 ${c.nickname} regenerates ${heal} HP.`,
            key: "regen",
            params: { p: c.nickname, heal },
            heal
          });
        }
      }
      round++;
    }

    if (a.hp > 0 && b.hp > 0) {
      const winnerC = a.hp / a.maxHp >= b.hp / b.maxHp ? a : b;
      const loserC = winnerC === a ? b : a;
      loserC.hp = 0;
      push({
        t: "passive",
        actor: "none",
        text: `⏱️ The judges call it! ${winnerC.nickname} takes it on remaining strength!`,
        key: "judges",
        params: { p: winnerC.nickname }
      });
    }

    winner = a.hp > 0 ? "a" : "b";
    const winC = winner === "a" ? a : b;
    const loseC = winner === "a" ? b : a;
    push({
      t: "death",
      actor: loseC.key,
      text: `💀 ${loseC.nickname} has fallen!`,
      key: "death",
      params: { p: loseC.nickname },
      fx: "death"
    });
    push({
      t: "victory",
      actor: winC.key,
      text: `🏆 ${winC.nickname} WINS!`,
      key: "victoryLine",
      params: { p: winC.nickname },
      fx: "victory"
    });
  } catch (e) {
    if (e instanceof ReactionPause) pendingSide = e.side;
    else throw e;
  } finally {
    rng = Math.random;
  }

  let totalMs = timeline.reduce((sum, e) => sum + (e.ms ?? 900), 0);
  const MAX_BATTLE_MS = 58000;
  if (!aCanReact && !bCanReact && pendingSide === null && totalMs > MAX_BATTLE_MS) {
    const scale = MAX_BATTLE_MS / totalMs;
    for (const e of timeline) {
      e.ms = Math.max(350, Math.round((e.ms ?? 900) * scale));
    }
    totalMs = timeline.reduce((sum, e) => sum + (e.ms ?? 900), 0);
  }

  return {
    winner,
    timeline,
    stepMs: 900,
    totalMs,
    pendingSide,
    aEquipment: aEquip,
    bEquipment: bEquip,
    aDisabled,
    bDisabled,
    aMaxHp: a.maxHp,
    bMaxHp: b.maxHp
  };
}
