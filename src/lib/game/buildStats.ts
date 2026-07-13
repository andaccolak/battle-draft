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
