import type { GameEvent } from "./types";

export interface EventDef extends GameEvent {
  hooks: EventHooks;
}

export interface EventHooks {
  statMods?: EventStatMod[];
  hpMultiplier?: number;
  flatHp?: number;
  critDamageBonus?: number;
  critChanceMultiplier?: number;
  accuracyDelta?: number;
  dodgeDelta?: number;
  speedMultiplier?: number;
  attackMultiplier?: number;
  defenseMultiplier?: number;
  lifestealBonus?: number;
  healPerTurnBonus?: number;
  poisonAll?: number;
  extraAttackBonus?: number;
  randomInitiative?: boolean;
  noHealing?: boolean;
  chaosAll?: boolean;
  swapAttackDefense?: boolean;
  underdogBoost?: number;
  silenceAccessories?: boolean;
  zeroDodge?: boolean;
  swapWeapons?: boolean;
  swapBuilds?: boolean;
  fistsOnly?: boolean;
  disableRandomItem?: boolean;
  escalatingDamage?: number;
}

export interface EventStatMod {
  target: "rarity" | "tag" | "slot";
  match: string;
  attackMult?: number;
  defenseMult?: number;
  requireOwned?: boolean;
  ownedAttackMult?: number;
  ownedDefenseMult?: number;
}

export const EVENTS: EventDef[] = [
  { id: "rain", name: "Rain", emoji: "🌧️", description: "A downpour soaks every bowstring. Ranged weapons contribute 35% less attack.", hooks: { statMods: [{ target: "tag", match: "ranged", attackMult: 0.65 }] } },
  { id: "blood_moon", name: "Blood Moon", emoji: "🌑", description: "The moon turns red. Critical-damage bonus increases by 50 points.", hooks: { critDamageBonus: 50 } },
  { id: "blizzard", name: "Blizzard", emoji: "❄️", description: "Freezing winds slow everyone. Speed reduced by 35%.", hooks: { speedMultiplier: 0.65 } },
  { id: "thunderstorm", name: "Thunderstorm", emoji: "⚡", description: "Legendary items crackle with power, granting +20% attack and defense to their owners.", hooks: { statMods: [{ target: "rarity", match: "legendary", requireOwned: true, ownedAttackMult: 1.2, ownedDefenseMult: 1.2 }] } },
  { id: "plague", name: "Plague", emoji: "🦠", description: "A sickness spreads. Everyone starts with 25% less HP.", hooks: { hpMultiplier: 0.75 } },
  { id: "lucky_day", name: "Lucky Day", emoji: "🍀", description: "The humble shine today. Owners of Common items gain +15% attack and defense.", hooks: { statMods: [{ target: "rarity", match: "common", requireOwned: true, ownedAttackMult: 1.15, ownedDefenseMult: 1.15 }] } },
  { id: "tax_season", name: "Tax Season", emoji: "💰", description: "The crown taxes the wealthy. Legendary owners lose 15% attack and defense.", hooks: { statMods: [{ target: "rarity", match: "legendary", requireOwned: true, ownedAttackMult: 0.85, ownedDefenseMult: 0.85 }] } },
  { id: "tornado", name: "Tornado", emoji: "🌪️", description: "Chaotic winds decide who strikes first. Turn order is random every round.", hooks: { randomInitiative: true } },
  { id: "eclipse", name: "Solar Eclipse", emoji: "🌒", description: "Darkness covers the arena. Accuracy reduced by 20.", hooks: { accuracyDelta: -20 } },
  { id: "full_moon", name: "Full Moon", emoji: "🌕", description: "Instincts sharpen under moonlight. Dodge increased by 15.", hooks: { dodgeDelta: 15 } },
  { id: "earthquake", name: "Earthquake", emoji: "🌋", description: "The ground splits and armor cracks. Defense reduced by 35%.", hooks: { defenseMultiplier: 0.65 } },
  { id: "heatwave", name: "Heatwave", emoji: "🥵", description: "Scorching heat punishes heavy gear. Heavy items lose half their defense.", hooks: { statMods: [{ target: "tag", match: "heavy", defenseMult: 0.5 }] } },
  { id: "fog", name: "Thick Fog", emoji: "🌫️", description: "Nobody can see a thing. Accuracy -25, dodge +10.", hooks: { accuracyDelta: -25, dodgeDelta: 10 } },
  { id: "harvest", name: "Harvest Festival", emoji: "🌾", description: "A hearty feast before combat. Everyone gains +30 HP.", hooks: { flatHp: 30 } },
  { id: "bloodlust", name: "Bloodlust", emoji: "😡", description: "Fury takes over. Attack +30%, defense -30%.", hooks: { attackMultiplier: 1.3, defenseMultiplier: 0.7 } },
  { id: "blessing", name: "Ancient Blessing", emoji: "😇", description: "Old spirits mend wounds. Everyone regenerates 5 HP per turn.", hooks: { healPerTurnBonus: 5 } },
  { id: "poison_mist", name: "Poison Mist", emoji: "☠️", description: "Toxic fumes fill the arena. Everyone takes 4 poison damage per turn.", hooks: { poisonAll: 4 } },
  { id: "gravity", name: "Gravity Surge", emoji: "🪨", description: "Bodies feel like lead. Nobody can dodge anything.", hooks: { zeroDodge: true } },
  { id: "mirror_world", name: "Mirror World", emoji: "🪞", description: "Reality flips. Defense becomes attack power, while attack is reforged into defense.", hooks: { swapAttackDefense: true } },
  { id: "giants_might", name: "Giant's Might", emoji: "🗿", description: "Everyone grows enormous. HP +50%, speed -25%.", hooks: { hpMultiplier: 1.5, speedMultiplier: 0.75 } },
  { id: "glass_cannon", name: "Glass Cannon", emoji: "🔮", description: "Power at a price. Attack +50%, HP -30%.", hooks: { attackMultiplier: 1.5, hpMultiplier: 0.7 } },
  { id: "merchants_gift", name: "Merchant's Gift", emoji: "🎁", description: "Common and Uncommon items contribute 40% more attack and defense.", hooks: { statMods: [{ target: "rarity", match: "common", attackMult: 1.4, defenseMult: 1.4 }, { target: "rarity", match: "uncommon", attackMult: 1.4, defenseMult: 1.4 }] } },
  { id: "cursed_ground", name: "Cursed Ground", emoji: "🕸️", description: "Dark soil devours all healing. No one can heal.", hooks: { noHealing: true } },
  { id: "vampire_night", name: "Vampire Night", emoji: "🧛", description: "Everyone thirsts for blood. All fighters gain 15% lifesteal.", hooks: { lifestealBonus: 15 } },
  { id: "iron_sky", name: "Iron Sky", emoji: "🌩️", description: "A dull grey sky dampens fortune. Critical chance is halved.", hooks: { critChanceMultiplier: 0.5 } },
  { id: "storm_blades", name: "Storm of Blades", emoji: "🗡️", description: "Phantom blades join every strike. +20% chance for extra attacks.", hooks: { extraAttackBonus: 20 } },
  { id: "pacifist_wind", name: "Pacifist Wind", emoji: "🕊️", description: "A gentle breeze calms rage. Attack -20%, HP +25%.", hooks: { attackMultiplier: 0.8, hpMultiplier: 1.25 } },
  { id: "chaos_rift", name: "Chaos Rift", emoji: "🌀", description: "A rift warps reality. Every stat of every fighter shifts randomly by ±30%.", hooks: { chaosAll: true } },
  { id: "golden_age", name: "Golden Age", emoji: "🏆", description: "Epic and Legendary items contribute 20% more attack and defense; Common items contribute 10% less.", hooks: { statMods: [{ target: "rarity", match: "epic", attackMult: 1.2, defenseMult: 1.2 }, { target: "rarity", match: "legendary", attackMult: 1.2, defenseMult: 1.2 }, { target: "rarity", match: "common", attackMult: 0.9, defenseMult: 0.9 }] } },
  { id: "underdog", name: "Underdog Spirit", emoji: "🐕", description: "The lower-power fighter gains 30% attack, defense, and HP.", hooks: { underdogBoost: 30 } },
  { id: "silence", name: "Arcane Silence", emoji: "🤫", description: "Magic fizzles out. All accessory passives are disabled.", hooks: { silenceAccessories: true } },
  { id: "midnight_sun", name: "Midnight Sun", emoji: "🌞", description: "The sun refuses to set. Speed +30% and everyone hits 10% harder.", hooks: { speedMultiplier: 1.3, attackMultiplier: 1.1 } },
  { id: "weapon_swap", name: "Weapon Swap", emoji: "🔄", description: "A trickster spirit switches the fighters' weapons! Everyone fights with their opponent's weapon.", hooks: { swapWeapons: true } },
  { id: "soul_swap", name: "Soul Swap", emoji: "👻", description: "Souls trade bodies for one battle. You fight wearing your OPPONENT'S entire build!", hooks: { swapBuilds: true } },
  { id: "bare_fists", name: "Bare-Knuckle Night", emoji: "👊", description: "The crowd demands honor! All weapons are confiscated — settle it with your fists.", hooks: { fistsOnly: true } },
  { id: "item_roulette", name: "Item Roulette", emoji: "🎰", description: "The wheel spins... one random item of each fighter jams and does nothing this battle.", hooks: { disableRandomItem: true } },
  { id: "ticking_bomb", name: "Ticking Bomb", emoji: "💣", description: "A bomb is chained to the arena. Both fighters take rising damage every round — finish it FAST.", hooks: { escalatingDamage: 5 } },
  { id: "sudden_death", name: "Sudden Death", emoji: "⚰️", description: "One mistake ends it all. Everyone starts at 30% HP but hits 30% harder.", hooks: { hpMultiplier: 0.3, attackMultiplier: 1.3 } }
];

const CHAOS_EVENT_IDS = new Set([
  "weapon_swap",
  "soul_swap",
  "bare_fists",
  "item_roulette",
  "ticking_bomb",
  "sudden_death",
  "chaos_rift",
  "mirror_world",
  "tornado",
  "gravity",
  "storm_blades",
  "glass_cannon"
]);

export const CHAOS_EVENTS: EventDef[] = EVENTS.filter((e) => CHAOS_EVENT_IDS.has(e.id));

export function randomEvent(): EventDef {
  return EVENTS[Math.floor(Math.random() * EVENTS.length)] as EventDef;
}
