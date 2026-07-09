import type { LuckCard } from "./types";

export const LUCK_CARDS: LuckCard[] = [
  { id: "pirate", name: "Pirate", emoji: "🏴‍☠️", description: "Steal one random equipped item from your opponent at the start of battle." },
  { id: "blacksmith", name: "Blacksmith", emoji: "✨", description: "One of your random items is reforged into a Legendary version." },
  { id: "curse", name: "Curse", emoji: "💀", description: "Disable your opponent's strongest item for the whole battle." },
  { id: "lightning", name: "Lightning", emoji: "⚡", description: "Your opponent starts every battle with 25% less HP." },
  { id: "lucky", name: "Lucky", emoji: "🍀", description: "Your critical chance is doubled." },
  { id: "vampire", name: "Vampire", emoji: "🩸", description: "Heal for 20% of all damage you deal." },
  { id: "gambler", name: "Gambler", emoji: "🎲", description: "All your item stats are re-rolled between 50% and 200%. Good luck." },
  { id: "allin", name: "ALL IN", emoji: "🎰", description: "Each battle: 50% chance your attack and HP are boosted 80%, otherwise slashed 45%." },
  { id: "magnet", name: "Magnet", emoji: "🧲", description: "Disable your opponent's weapon for the whole battle." },
  { id: "trade", name: "Trade", emoji: "🎁", description: "Swap one random item with your opponent at the start of battle." },
  { id: "barrier", name: "Barrier", emoji: "🛡️", description: "Start every battle with a 35 HP magical shield." },
  { id: "phoenix", name: "Phoenix", emoji: "🔥", description: "The first time you would die, revive with 40% HP." },
  { id: "assassin", name: "Assassin", emoji: "🗡️", description: "Your first attack each battle is always a critical hit." },
  { id: "titan", name: "Titan", emoji: "⛰️", description: "+40 max HP, but your speed is reduced by 30%." }
];

export function luckCardById(id: string): LuckCard | undefined {
  return LUCK_CARDS.find((c) => c.id === id);
}
