import type { Item, LuckCard, Slot, TimelineEntry } from "./types";
import { RARITY_ORDER, SLOTS } from "./types";
import type { EventDef } from "./events";

export interface Build {
  nickname: string;
  equipment: Partial<Record<Slot, Item>>;
  luckCard: LuckCard | null;
}

export interface BattleResult {
  winner: "a" | "b";
  timeline: TimelineEntry[];
  stepMs: number;
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
}

const rand = () => Math.random();
const roll = (pct: number) => Math.random() * 100 < pct;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

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
    weaponName: "fists"
  };

  for (const slot of SLOTS) {
    const item = build.equipment[slot];
    if (!item || disabled.includes(item.id)) continue;
    if (slot === "weapon") c.weaponName = item.name;
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
  return c;
}

function randomEquippedSlot(equipment: Partial<Record<Slot, Item>>): Slot | null {
  const filled = SLOTS.filter((s) => equipment[s]);
  if (filled.length === 0) return null;
  return filled[Math.floor(rand() * filled.length)] ?? null;
}

export function simulateBattle(aBuild: Build, bBuild: Build, event: EventDef): BattleResult {
  const timeline: TimelineEntry[] = [];
  const aEquip: Partial<Record<Slot, Item>> = { ...aBuild.equipment };
  const bEquip: Partial<Record<Slot, Item>> = { ...bBuild.equipment };
  const aDisabled: string[] = [];
  const bDisabled: string[] = [];
  const pre: { text: string; fx?: string }[] = [];

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
          pre.push({ text: `🏴‍☠️ ${selfName} activates Pirate and steals ${otherName}'s ${stolen.emoji} ${stolen.name}!`, fx: `steal:${slot}` });
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
        pre.push({ text: `🎁 ${selfName} activates Trade! ${slot} items are swapped with ${otherName}!`, fx: `trade:${slot}` });
      }
    }
    if (card === "curse") {
      const id = strongestItemId(otherEquip, otherDisabled);
      if (id) {
        otherDisabled.push(id);
        const item = SLOTS.map((s) => otherEquip[s]).find((i) => i?.id === id);
        pre.push({ text: `💀 ${selfName}'s Curse disables ${otherName}'s ${item?.emoji ?? ""} ${item?.name ?? "item"}!`, fx: "curse" });
      }
    }
    if (card === "magnet") {
      const weapon = otherEquip.weapon;
      if (weapon && !otherDisabled.includes(weapon.id)) {
        otherDisabled.push(weapon.id);
        pre.push({ text: `🧲 ${selfName}'s Magnet rips ${otherName}'s ${weapon.emoji} ${weapon.name} away!`, fx: "magnet" });
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
    pre.push({ text: `🐕 Underdog Spirit empowers ${weak.nickname}!`, fx: "underdog" });
  }

  const applyBattleStartCards = (self: Combatant, selfBuild: Build, other: Combatant) => {
    const card = selfBuild.luckCard?.id;
    if (card === "lightning") {
      other.maxHp = Math.round(other.maxHp * 0.75);
      other.hp = other.maxHp;
      pre.push({ text: `⚡ ${self.nickname}'s Lightning strikes ${other.nickname} before the fight! -25% HP!`, fx: "lightning" });
    }
    if (card === "allin") {
      if (roll(50)) {
        self.attack *= 1.8;
        self.maxHp = Math.round(self.maxHp * 1.8);
        self.hp = self.maxHp;
        pre.push({ text: `🎰 ${self.nickname} goes ALL IN... JACKPOT! Attack and HP surge!`, fx: "jackpot" });
      } else {
        self.attack *= 0.55;
        self.maxHp = Math.max(30, Math.round(self.maxHp * 0.55));
        self.hp = self.maxHp;
        pre.push({ text: `🎰 ${self.nickname} goes ALL IN... and BUSTS! Attack and HP crumble!`, fx: "bust" });
      }
    }
  };
  applyBattleStartCards(a, aBuild, b);
  applyBattleStartCards(b, bBuild, a);

  const push = (e: Omit<TimelineEntry, "hpA" | "hpB">) => {
    timeline.push({ ...e, hpA: Math.max(0, Math.round(a.hp)), hpB: Math.max(0, Math.round(b.hp)) });
  };

  push({ t: "intro", actor: "none", text: `⚔️ ${a.nickname} VS ${b.nickname}!` });
  push({ t: "event", actor: "none", text: `${event.emoji} ${event.name}: ${event.description}`, fx: `event:${event.id}` });
  for (const p of pre) push({ t: "card", actor: "none", text: p.text, fx: p.fx });

  const attackOnce = (att: Combatant, def: Combatant, extra: boolean) => {
    if (att.hp <= 0 || def.hp <= 0) return;
    const prefix = extra ? "⚡ Extra attack! " : "";
    const hitChance = clamp(att.accuracy - def.dodge, 15, 100);
    if (!roll(hitChance)) {
      if (roll(50)) {
        push({ t: "miss", actor: att.key, text: `${prefix}💨 ${att.nickname} swings the ${att.weaponName}... and misses!` });
      } else {
        push({ t: "dodge", actor: att.key, text: `${prefix}🌀 ${def.nickname} dodges ${att.nickname}'s attack!` });
      }
      return;
    }
    let atk = att.attack;
    if (att.berserk > 0 && att.hp < att.maxHp * 0.4) atk *= 1 + att.berserk / 100;
    let dmg = atk * (0.85 + rand() * 0.3);
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
      dmg: dmg - absorbed,
      crit: isCrit
    });
    if (att.lifesteal > 0 && !event.hooks.noHealing) {
      const heal = Math.round((dmg * att.lifesteal) / 100);
      if (heal > 0) {
        att.hp = Math.min(att.maxHp, att.hp + heal);
        push({ t: "passive", actor: att.key, text: `🩸 ${att.nickname} drains ${heal} HP!`, heal });
      }
    }
    if (def.reflect > 0 && def.hp > 0) {
      const ref = Math.round((dmg * def.reflect) / 100);
      if (ref > 0) {
        att.hp -= ref;
        push({ t: "passive", actor: def.key, text: `🌵 ${def.nickname}'s armor reflects ${ref} damage back!`, dmg: ref });
      }
    }
    if (att.poisonOnHit > 0 && def.hp > 0) {
      def.poison = Math.max(def.poison, att.poisonOnHit);
      push({ t: "passive", actor: att.key, text: `🐍 ${def.nickname} is poisoned!` });
    }
    if (att.stunChance > 0 && def.hp > 0 && roll(att.stunChance)) {
      def.stunned = true;
      push({ t: "passive", actor: att.key, text: `💫 ${def.nickname} is stunned and will miss a turn!` });
    }
  };

  const tryRevive = (c: Combatant): boolean => {
    if (c.hp <= 0 && c.lastStandValue > 0 && !c.lastStandUsed) {
      c.lastStandUsed = true;
      c.hp = Math.round((c.maxHp * c.lastStandValue) / 100);
      push({ t: "passive", actor: c.key, text: `🔥 ${c.nickname} refuses to die and rises again with ${c.hp} HP!`, fx: "revive" });
      return true;
    }
    return c.hp > 0;
  };

  let round = 1;
  const maxRounds = 30;
  while (a.hp > 0 && b.hp > 0 && round <= maxRounds) {
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
        push({ t: "passive", actor: att.key, text: `💫 ${att.nickname} is stunned and staggers!` });
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
      if (round > 6) dot += (round - 6) * 6;
      if (dot > 0) {
        c.hp -= dot;
        const label = round > 6 ? "⏳ Fatigue and poison" : "☠️ Poison";
        push({ t: "poison", actor: c.key, text: `${label} deals ${dot} damage to ${c.nickname}!`, dmg: dot });
        if (!tryRevive(c)) break;
      }
      if (c.healPerTurn > 0 && !event.hooks.noHealing && c.hp > 0 && c.hp < c.maxHp) {
        const heal = Math.min(c.healPerTurn, c.maxHp - c.hp);
        c.hp += heal;
        push({ t: "passive", actor: c.key, text: `💚 ${c.nickname} regenerates ${heal} HP.`, heal });
      }
    }
    round++;
  }

  if (a.hp > 0 && b.hp > 0) {
    const winner = a.hp / a.maxHp >= b.hp / b.maxHp ? a : b;
    const loser = winner === a ? b : a;
    loser.hp = 0;
    push({ t: "passive", actor: "none", text: `⏱️ The judges call it! ${winner.nickname} takes it on remaining strength!` });
  }

  const winner: "a" | "b" = a.hp > 0 ? "a" : "b";
  const winC = winner === "a" ? a : b;
  const loseC = winner === "a" ? b : a;
  push({ t: "death", actor: loseC.key, text: `💀 ${loseC.nickname} has fallen!`, fx: "death" });
  push({ t: "victory", actor: winC.key, text: `🏆 ${winC.nickname} WINS!`, fx: "victory" });

  const stepMs = Math.round(clamp(13000 / timeline.length, 420, 950));

  return {
    winner,
    timeline,
    stepMs,
    aEquipment: aEquip,
    bEquipment: bEquip,
    aDisabled,
    bDisabled,
    aMaxHp: a.maxHp,
    bMaxHp: b.maxHp
  };
}
