import type { Item, ItemStats, Slot } from "./types";
import { SLOTS } from "./types";

export const BUILD_STAT_KEYS = ["attack", "defense", "hp", "speed", "critChance", "critDamage", "accuracy", "dodge", "initiative"] as const;

export type BuildStatKey = (typeof BUILD_STAT_KEYS)[number];
export type BuildStats = Record<BuildStatKey, number>;

export const BASE_BUILD_STATS: BuildStats = {
  attack: 12,
  defense: 0,
  hp: 200,
  speed: 10,
  critChance: 10,
  critDamage: 50,
  accuracy: 90,
  dodge: 5,
  initiative: 0
};

export function buildStats(equipment: Partial<Record<Slot, Item>>): BuildStats {
  const totals = { ...BASE_BUILD_STATS };
  for (const slot of SLOTS) {
    const stats: ItemStats | undefined = equipment[slot]?.stats;
    if (!stats) continue;
    for (const key of BUILD_STAT_KEYS) totals[key] += stats[key] ?? 0;
  }
  return totals;
}
