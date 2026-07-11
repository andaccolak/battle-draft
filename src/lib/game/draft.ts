import type { Item, LuckCard, Rarity, Slot } from "./types";
import { SLOTS } from "./types";
import { ITEMS } from "./items";
import { LUCK_CARDS } from "./luckCards";

const ROUND_RARITY_WEIGHTS: Record<Rarity, number>[] = [
  { common: 46, uncommon: 30, rare: 16, epic: 6, legendary: 2 },
  { common: 36, uncommon: 30, rare: 20, epic: 10, legendary: 4 },
  { common: 28, uncommon: 28, rare: 24, epic: 14, legendary: 6 },
  { common: 20, uncommon: 26, rare: 26, epic: 18, legendary: 10 },
  { common: 14, uncommon: 20, rare: 28, epic: 23, legendary: 15 }
];

function rollRarity(weights: Record<Rarity, number>): Rarity {
  const entries = Object.entries(weights) as [Rarity, number][];
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;
  for (const [rarity, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return rarity;
  }
  return "common";
}

export function rollDraftHand(lockedSlots: Slot[] = [], round = 1): Item[] {
  const weights = ROUND_RARITY_WEIGHTS[Math.min(Math.max(round, 1), ROUND_RARITY_WEIGHTS.length) - 1] ?? ROUND_RARITY_WEIGHTS[0];
  const hand: Item[] = [];
  const used = new Set<string>();
  let guard = 0;
  while (hand.length < 5 && guard < 200) {
    guard++;
    const rarity = weights ? rollRarity(weights) : "common";
    const pool = ITEMS.filter((item) => item.rarity === rarity && !used.has(item.id));
    const item = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : ITEMS[Math.floor(Math.random() * ITEMS.length)];
    if (!item || used.has(item.id)) continue;
    used.add(item.id);
    hand.push(item);
  }
  const locked = new Set(lockedSlots);
  const hasPickable = hand.some((item) => !locked.has(item.slot));
  if (!hasPickable && locked.size < SLOTS.length) {
    const options = ITEMS.filter((item) => !locked.has(item.slot) && !used.has(item.id));
    const replacement = options[Math.floor(Math.random() * options.length)];
    if (replacement) hand[Math.floor(Math.random() * hand.length)] = replacement;
  }
  return hand;
}

const SELF_LUCK_CARDS = new Set(["blacksmith", "lucky", "vampire", "barrier", "phoenix", "assassin", "titan"]);

export function rollLuckHand(): LuckCard[] {
  const pool = [...LUCK_CARDS];
  const hand: LuckCard[] = [];
  while (hand.length < 3 && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    const card = pool.splice(idx, 1)[0];
    if (card) hand.push(card);
  }
  if (!hand.some((card) => SELF_LUCK_CARDS.has(card.id))) {
    const selfPool = LUCK_CARDS.filter((card) => SELF_LUCK_CARDS.has(card.id));
    const replacement = selfPool[Math.floor(Math.random() * selfPool.length)];
    if (replacement) hand[Math.floor(Math.random() * hand.length)] = replacement;
  }
  return hand;
}

export function applyBuildCard(
  equipment: Partial<Record<Slot, Item>>,
  cardId: string
): { equipment: Partial<Record<Slot, Item>>; note: string | null } {
  const result = { ...equipment };
  const filled = (Object.keys(result) as Slot[]).filter((s) => result[s]);
  if (cardId === "blacksmith" && filled.length > 0) {
    const slot = filled[Math.floor(Math.random() * filled.length)];
    if (slot) {
      const item = result[slot];
      if (item) {
        const boost = (v: number | undefined) => (v === undefined ? undefined : Math.round(v * 1.6));
        result[slot] = {
          ...item,
          id: `${item.id}_forged`,
          name: `${item.name} ✨`,
          rarity: "legendary",
          stats: {
            attack: boost(item.stats.attack),
            defense: boost(item.stats.defense),
            hp: boost(item.stats.hp),
            speed: boost(item.stats.speed),
            critChance: boost(item.stats.critChance),
            critDamage: boost(item.stats.critDamage),
            accuracy: item.stats.accuracy,
            dodge: boost(item.stats.dodge),
            initiative: boost(item.stats.initiative)
          },
          passive: item.passive ? { ...item.passive, value: Math.round(item.passive.value * 1.4) } : undefined
        };
        return { equipment: result, note: `✨ The Blacksmith reforged ${item.name} into a Legendary!` };
      }
    }
  }
  if (cardId === "gambler" && filled.length > 0) {
    for (const slot of filled) {
      const item = result[slot];
      if (!item) continue;
      const mult = 0.5 + Math.random() * 1.5;
      const reroll = (v: number | undefined) => (v === undefined ? undefined : Math.round(v * mult));
      result[slot] = {
        ...item,
        id: `${item.id}_gambled`,
        name: item.name,
        stats: {
          attack: reroll(item.stats.attack),
          defense: reroll(item.stats.defense),
          hp: reroll(item.stats.hp),
          speed: reroll(item.stats.speed),
          critChance: reroll(item.stats.critChance),
          critDamage: reroll(item.stats.critDamage),
          accuracy: item.stats.accuracy,
          dodge: reroll(item.stats.dodge),
          initiative: reroll(item.stats.initiative)
        }
      };
    }
    return { equipment: result, note: "🎲 The Gambler re-rolled every stat. No refunds." };
  }
  return { equipment: result, note: null };
}
