import type { EventDef } from "./events";
import { BASE_BUILD_STATS, BUILD_STAT_KEYS, type BuildStats } from "./buildStats";
import type { Item, LuckCard, Slot } from "./types";
import { SLOTS } from "./types";

export interface CombatProfile {
  stats: BuildStats;
  shield: number;
  lifesteal: number;
  reflect: number;
  poisonOnHit: number;
  extraAttack: number;
  healPerTurn: number;
  sturdy: number;
  momentum: number;
  executioner: number;
  berserk: number;
  ignoreDefense: number;
  stunChance: number;
  critResist: number;
  block: number;
  lastStandValue: number;
  firstStrike: boolean;
  firstCritReady: boolean;
  stunImmune: boolean;
  poisonPerTurn: number;
  healingDisabled: boolean;
  randomInitiative: boolean;
  accessoriesSilenced: boolean;
  uncertainEffects: string[];
}

interface Options {
  disabledItems?: string[];
  random?: () => number;
  chaosRandom?: ChaosRandom;
}

export type ChaosRandom = (effect: string, field: keyof BuildStats) => number;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function blankProfile(): CombatProfile {
  return {
    stats: { ...BASE_BUILD_STATS },
    shield: 0,
    lifesteal: 0,
    reflect: 0,
    poisonOnHit: 0,
    extraAttack: 0,
    healPerTurn: 0,
    sturdy: 0,
    momentum: 0,
    executioner: 0,
    berserk: 0,
    ignoreDefense: 0,
    stunChance: 0,
    critResist: 0,
    block: 0,
    lastStandValue: 0,
    firstStrike: false,
    firstCritReady: false,
    stunImmune: false,
    poisonPerTurn: 0,
    healingDisabled: false,
    randomInitiative: false,
    accessoriesSilenced: false,
    uncertainEffects: []
  };
}

function ownsRarity(equipment: Partial<Record<Slot, Item>>, rarity: string, disabledItems: string[]): boolean {
  return SLOTS.some((slot) => {
    const item = equipment[slot];
    return !!item && item.rarity === rarity && !disabledItems.includes(item.id);
  });
}

function applyChaos(
  stats: BuildStats,
  amount: number,
  random: (() => number) | undefined,
  chaosRandom: ChaosRandom | undefined,
  effect: string,
  uncertainEffects: string[],
  fields: Array<keyof BuildStats>
): void {
  if (!random && !chaosRandom) {
    uncertainEffects.push(effect);
    return;
  }
  for (const field of fields) {
    const roll = chaosRandom?.(effect, field) ?? random?.() ?? 0.5;
    stats[field] *= 1 + (roll * 2 - 1) * amount;
  }
}

export function combatProfile(
  equipment: Partial<Record<Slot, Item>>,
  luckCard: LuckCard | null | undefined,
  event: EventDef | null | undefined,
  options: Options = {}
): CombatProfile {
  const profile = blankProfile();
  const stats = profile.stats;
  const hooks = event?.hooks;
  const disabledItems = options.disabledItems ?? [];

  for (const slot of SLOTS) {
    const item = equipment[slot];
    if (!item || disabledItems.includes(item.id)) continue;
    let attackMultiplier = 1;
    let defenseMultiplier = 1;
    for (const modifier of hooks?.statMods ?? []) {
      if (modifier.requireOwned) continue;
      const applies =
        (modifier.target === "rarity" && item.rarity === modifier.match) ||
        (modifier.target === "tag" && (item.tags ?? []).includes(modifier.match)) ||
        (modifier.target === "slot" && item.slot === modifier.match);
      if (!applies) continue;
      attackMultiplier *= modifier.attackMult ?? 1;
      defenseMultiplier *= modifier.defenseMult ?? 1;
    }
    stats.attack += (item.stats.attack ?? 0) * attackMultiplier;
    stats.defense += (item.stats.defense ?? 0) * defenseMultiplier;
    stats.hp += item.stats.hp ?? 0;
    stats.speed += item.stats.speed ?? 0;
    stats.critChance += item.stats.critChance ?? 0;
    stats.critDamage += item.stats.critDamage ?? 0;
    stats.accuracy += item.stats.accuracy ?? 0;
    stats.dodge += item.stats.dodge ?? 0;
    stats.initiative += item.stats.initiative ?? 0;
    const passive = item.passive;
    if (!passive || (hooks?.silenceAccessories && slot === "accessory")) continue;
    if (passive.type === "firstStrike") profile.firstStrike = true;
    if (passive.type === "lifesteal") profile.lifesteal += passive.value;
    if (passive.type === "reflect") profile.reflect += passive.value;
    if (passive.type === "poisonOnHit") profile.poisonOnHit += passive.value;
    if (passive.type === "extraAttack") profile.extraAttack += passive.value;
    if (passive.type === "healPerTurn") profile.healPerTurn += passive.value;
    if (passive.type === "sturdy") profile.sturdy = Math.max(profile.sturdy, passive.value);
    if (passive.type === "momentum") profile.momentum += passive.value;
    if (passive.type === "executioner") profile.executioner += passive.value;
    if (passive.type === "berserk") profile.berserk += passive.value;
    if (passive.type === "ignoreDefense") profile.ignoreDefense += passive.value;
    if (passive.type === "stunChance") profile.stunChance += passive.value;
    if (passive.type === "critResist") profile.critResist += passive.value;
    if (passive.type === "lastStand") profile.lastStandValue = Math.max(profile.lastStandValue, passive.value);
    if (passive.type === "block") profile.block += passive.value;
    if (passive.type === "shield") profile.shield += passive.value;
    if (passive.type === "chaos") {
      applyChaos(
        stats,
        passive.value / 100,
        options.random,
        options.chaosRandom,
        "chaosItem",
        profile.uncertainEffects,
        [...BUILD_STAT_KEYS]
      );
    }
  }

  for (const modifier of hooks?.statMods ?? []) {
    if (!modifier.requireOwned || modifier.target !== "rarity") continue;
    if (!ownsRarity(equipment, modifier.match, disabledItems)) continue;
    stats.attack *= modifier.ownedAttackMult ?? 1;
    stats.defense *= modifier.ownedDefenseMult ?? 1;
  }

  const card = luckCard?.id;
  if (card === "lucky") stats.critChance *= 2;
  if (card === "vampire") profile.lifesteal += 20;
  if (card === "barrier") profile.shield += 35;
  if (card === "phoenix") profile.lastStandValue = Math.max(profile.lastStandValue, 40);
  if (card === "assassin") profile.firstCritReady = true;
  if (card === "titan") {
    stats.hp += 40;
    stats.speed *= 0.7;
  }
  if (card === "eagle") stats.accuracy += 30;
  if (card === "turtle") {
    stats.defense *= 1.35;
    stats.speed *= 0.85;
  }
  if (card === "berserker") {
    stats.attack *= 1.3;
    stats.defense *= 0.8;
  }
  if (card === "ghost") stats.dodge += 18;
  if (card === "cactus") profile.reflect += 15;
  if (card === "medic") profile.healPerTurn += 6;
  if (card === "giant") {
    stats.hp += 60;
    stats.attack *= 0.82;
  }
  if (card === "zephyr") {
    stats.speed *= 1.25;
    stats.initiative += 12;
  }
  if (card === "anchor") profile.stunImmune = true;
  if (card === "bulwark") profile.block += 20;
  if (card === "sharpshooter") {
    stats.critChance += 15;
    stats.accuracy += 15;
  }
  if (card === "sprinter") profile.firstStrike = true;
  if (card === "flurry") profile.extraAttack += 15;
  if (card === "ironskin") profile.critResist += 40;
  if (card === "headsman") profile.executioner += 40;
  if (card === "snake") profile.poisonOnHit += 5;
  if (card === "gladiator") stats.critDamage += 40;
  if (card === "allin") profile.uncertainEffects.push("allin");

  stats.hp *= hooks?.hpMultiplier ?? 1;
  stats.hp += hooks?.flatHp ?? 0;
  stats.attack *= hooks?.attackMultiplier ?? 1;
  stats.defense *= hooks?.defenseMultiplier ?? 1;
  stats.speed *= hooks?.speedMultiplier ?? 1;
  stats.critDamage += hooks?.critDamageBonus ?? 0;
  stats.critChance *= hooks?.critChanceMultiplier ?? 1;
  stats.accuracy += hooks?.accuracyDelta ?? 0;
  stats.dodge += hooks?.dodgeDelta ?? 0;
  profile.lifesteal += hooks?.lifestealBonus ?? 0;
  profile.healPerTurn += hooks?.healPerTurnBonus ?? 0;
  profile.extraAttack += hooks?.extraAttackBonus ?? 0;
  profile.poisonPerTurn = hooks?.poisonAll ?? 0;
  profile.healingDisabled = hooks?.noHealing ?? false;
  profile.randomInitiative = hooks?.randomInitiative ?? false;
  profile.accessoriesSilenced = hooks?.silenceAccessories ?? false;
  if (hooks?.zeroDodge) stats.dodge = 0;
  if (hooks?.swapAttackDefense) {
    const attack = stats.attack;
    stats.attack = Math.max(8, stats.defense * 1.6);
    stats.defense = attack * 0.6;
  }
  if (hooks?.chaosAll) {
    applyChaos(stats, 0.3, options.random, options.chaosRandom, "chaosEvent", profile.uncertainEffects, [...BUILD_STAT_KEYS]);
  }
  if (hooks?.underdogBoost) profile.uncertainEffects.push("underdog");

  stats.hp = Math.max(30, Math.round(stats.hp));
  stats.attack = Math.max(5, stats.attack);
  stats.defense = Math.max(0, stats.defense);
  stats.speed = Math.max(1, stats.speed);
  stats.accuracy = clamp(stats.accuracy, 30, 100);
  stats.dodge = clamp(stats.dodge, 0, 60);
  stats.critChance = clamp(stats.critChance, 0, 90);
  return profile;
}
