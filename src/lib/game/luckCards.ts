import type { LuckCard } from "./types";

export const LUCK_CARDS: LuckCard[] = [
  { id: "pirate", name: "Pirate", emoji: "🏴‍☠️", description: "Steal one random equipped item from your opponent at the start of battle." },
  { id: "blacksmith", name: "Blacksmith", emoji: "✨", description: "One of your random items is reforged into a Legendary version." },
  { id: "curse", name: "Curse", emoji: "💀", description: "Your opponent fights hexed: -15% attack and -12% defense." },
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
  { id: "titan", name: "Titan", emoji: "⛰️", description: "+40 max HP, but your speed is reduced by 30%." },
  { id: "eagle", name: "Eagle Eye", emoji: "🦅", description: "Your accuracy is greatly increased. You rarely miss." },
  { id: "turtle", name: "Turtle", emoji: "🐢", description: "+35% defense, but -15% speed." },
  { id: "berserker", name: "Berserker", emoji: "😤", description: "+30% attack, but -20% defense." },
  { id: "ghost", name: "Ghost", emoji: "👻", description: "Attacks pass through you far more often. +18 dodge." },
  { id: "cactus", name: "Cactus", emoji: "🌵", description: "Reflects 15% of all damage you take back to the attacker." },
  { id: "medic", name: "Medic", emoji: "💊", description: "Regenerate 6 HP at the start of every turn." },
  { id: "giant", name: "Giant", emoji: "🗿", description: "+60 max HP, but your attack is reduced by 18%." },
  { id: "zephyr", name: "Zephyr", emoji: "💨", description: "+25% speed and +12 initiative. Strike first, strike often." },
  { id: "anchor", name: "Anchor", emoji: "⚓", description: "You cannot be stunned. Ever." },
  { id: "bulwark", name: "Bulwark", emoji: "🧱", description: "+20% chance to block half of any hit." },
  { id: "sharpshooter", name: "Sharpshooter", emoji: "🎯", description: "+15 crit chance and +15 accuracy." },
  { id: "sprinter", name: "Sprinter", emoji: "🏃", description: "You always attack first." },
  { id: "flurry", name: "Flurry", emoji: "🌪️", description: "+15% chance to attack twice." },
  { id: "ironskin", name: "Iron Skin", emoji: "🛡️", description: "Critical hits deal 40% less damage to you." },
  { id: "headsman", name: "Headsman", emoji: "🪓", description: "+40% damage against enemies below 35% HP." },
  { id: "snake", name: "Snake", emoji: "🐍", description: "Your hits poison for 5 damage per turn." },
  { id: "gladiator", name: "Gladiator", emoji: "🏛️", description: "Your critical hits deal +40% damage." }
];

export function luckCardById(id: string): LuckCard | undefined {
  return LUCK_CARDS.find((c) => c.id === id);
}
