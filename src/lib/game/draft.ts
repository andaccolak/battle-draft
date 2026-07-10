import type { Item, LuckCard, Slot } from "./types";
import { SLOTS } from "./types";
import { ITEMS } from "./items";
import { LUCK_CARDS } from "./luckCards";

export function rollDraftHand(lockedSlots: Slot[] = []): Item[] {
  const hand: Item[] = [];
  const used = new Set<string>();
  while (hand.length < 5) {
    const item = ITEMS[Math.floor(Math.random() * ITEMS.length)];
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

export function rollLuckHand(): LuckCard[] {
  const pool = [...LUCK_CARDS];
  const hand: LuckCard[] = [];
  while (hand.length < 3 && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    const card = pool.splice(idx, 1)[0];
    if (card) hand.push(card);
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
