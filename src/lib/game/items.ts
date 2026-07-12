import type { Item, Slot } from "./types";

export const ITEMS: Item[] = [
  { id: "w_rusty_sword", name: "Rusty Sword", emoji: "🗡️", slot: "weapon", rarity: "common", stats: { attack: 16 } },
  { id: "w_wooden_club", name: "Tavern Mug", emoji: "🍺", slot: "weapon", rarity: "common", stats: { attack: 16, defense: 4 } },
  { id: "w_battle_axe", name: "Battle Axe", emoji: "🪓", slot: "weapon", rarity: "common", stats: { attack: 30, accuracy: -15 } },
  { id: "w_dagger", name: "Sly Dagger", emoji: "🔪", slot: "weapon", rarity: "common", stats: { attack: 10, speed: 14, critChance: 12 } },
  { id: "w_rapier", name: "Rapier", emoji: "🤺", slot: "weapon", rarity: "uncommon", stats: { attack: 15 }, passive: { type: "firstStrike", value: 1, label: "Always attacks first" } },
  { id: "w_bow", name: "Longbow", emoji: "🏹", slot: "weapon", rarity: "uncommon", stats: { attack: 20, critChance: 20 }, tags: ["ranged"] },
  { id: "w_twin_axe", name: "Twin-Bladed Axe", emoji: "🪓", slot: "weapon", rarity: "rare", stats: { attack: 28, accuracy: -12, critDamage: 20 } },
  { id: "w_cursed_bow", name: "Cursed Bow", emoji: "🦇", slot: "weapon", rarity: "epic", stats: { attack: 24, critChance: 10 }, passive: { type: "poisonOnHit", value: 5, label: "Hits poison for 5 dmg per turn" }, tags: ["ranged"] },
  { id: "w_golden_bow", name: "Golden Bow", emoji: "🌟", slot: "weapon", rarity: "legendary", stats: { attack: 30, critChance: 25, critDamage: 30 }, tags: ["ranged"] },
  { id: "w_hunting_bow", name: "Hunting Bow", emoji: "🏹", slot: "weapon", rarity: "common", stats: { attack: 15, critChance: 8 }, tags: ["ranged"] },
  { id: "w_hatchet", name: "Hatchet", emoji: "🪓", slot: "weapon", rarity: "common", stats: { attack: 17, critChance: 5 } },
  { id: "w_tribal_shield", name: "Tribal Round Shield", emoji: "🥁", slot: "weapon", rarity: "uncommon", stats: { attack: 20, defense: 7, accuracy: -8 } },
  { id: "w_bone_crossbow", name: "Bone Crossbow", emoji: "🦴", slot: "weapon", rarity: "rare", stats: { attack: 26, critChance: 10, accuracy: -5 }, tags: ["ranged"] },
  { id: "w_claymore", name: "Claymore", emoji: "⚔️", slot: "weapon", rarity: "rare", stats: { attack: 32, accuracy: -8, critDamage: 15 } },
  { id: "w_grimoire", name: "Forbidden Grimoire", emoji: "📖", slot: "weapon", rarity: "epic", stats: { attack: 25, critChance: 12 }, passive: { type: "ignoreDefense", value: 25, label: "Ignores 25% of enemy defense" }, tags: ["ranged"] },
  { id: "w_war_hammer", name: "Giant's Greatsword", emoji: "🗡️", slot: "weapon", rarity: "uncommon", stats: { attack: 38, accuracy: -30 } },
  { id: "w_spiked_flail", name: "Spiked Shield", emoji: "🛡️", slot: "weapon", rarity: "uncommon", stats: { attack: 24, accuracy: -10, critChance: 8 } },
  { id: "w_twin_blades", name: "Twin Blades", emoji: "⚔️", slot: "weapon", rarity: "rare", stats: { attack: 17 }, passive: { type: "extraAttack", value: 35, label: "35% chance to attack twice" } },
  { id: "w_poison_fang", name: "Poison Fang", emoji: "🐍", slot: "weapon", rarity: "rare", stats: { attack: 15 }, passive: { type: "poisonOnHit", value: 6, label: "Hits poison for 6 dmg per turn" } },
  { id: "w_crossbow", name: "Heavy Crossbow", emoji: "🎯", slot: "weapon", rarity: "rare", stats: { attack: 27, critChance: 12, speed: -8 }, tags: ["ranged"] },
  { id: "w_executioner", name: "Executioner Axe", emoji: "🪓", slot: "weapon", rarity: "epic", stats: { attack: 25 }, passive: { type: "executioner", value: 60, label: "+60% dmg vs targets below 35% HP" } },
  { id: "w_vampire_scythe", name: "Blood Wand", emoji: "🩸", slot: "weapon", rarity: "epic", stats: { attack: 23 }, passive: { type: "lifesteal", value: 25, label: "Heals 25% of damage dealt" }, tags: ["ranged"] },
  { id: "w_storm_spear", name: "Storm Staff", emoji: "⚡", slot: "weapon", rarity: "epic", stats: { attack: 28, initiative: 12 }, passive: { type: "stunChance", value: 15, label: "15% chance to stun on hit" }, tags: ["ranged"] },
  { id: "w_dragonfang", name: "Dragonfang Greatsword", emoji: "🐉", slot: "weapon", rarity: "legendary", stats: { attack: 32, critDamage: 40 }, passive: { type: "berserk", value: 50, label: "+50% attack below 40% HP" } },
  { id: "w_void_reaper", name: "Void Reaper", emoji: "💀", slot: "weapon", rarity: "legendary", stats: { attack: 32, accuracy: -10 }, passive: { type: "ignoreDefense", value: 60, label: "Ignores 60% of enemy defense" }, tags: ["ranged"] },
  { id: "h_old_helmet", name: "Old Helmet", emoji: "🪖", slot: "helmet", rarity: "common", stats: { defense: 7 } },
  { id: "h_hunter_hood", name: "Hunter's Hood", emoji: "🎯", slot: "helmet", rarity: "uncommon", stats: { defense: 6, accuracy: 10, dodge: 6 } },
  { id: "h_veteran_hood", name: "Veteran's Hood", emoji: "🧣", slot: "helmet", rarity: "rare", stats: { defense: 8, critChance: 8, accuracy: 6 } },
  { id: "h_juggernaut", name: "Juggernaut Helm", emoji: "🐗", slot: "helmet", rarity: "epic", stats: { defense: 12 }, passive: { type: "sturdy", value: 22, label: "Never loses more than 22% max HP in one hit" }, tags: ["heavy"] },
  { id: "h_leather_cap", name: "Leather Hood", emoji: "🧢", slot: "helmet", rarity: "common", stats: { defense: 5, speed: 6 } },
  { id: "h_bucket", name: "Bucket Helm", emoji: "🪣", slot: "helmet", rarity: "common", stats: { defense: 15, accuracy: -10 } },
  { id: "h_iron_helm", name: "Iron Helm", emoji: "⛑️", slot: "helmet", rarity: "uncommon", stats: { defense: 11, speed: -4 }, tags: ["heavy"] },
  { id: "h_wizard_hat", name: "Wizard Hat", emoji: "🧙", slot: "helmet", rarity: "uncommon", stats: { defense: 5, critChance: 12 } },
  { id: "h_spiked_helm", name: "Spiked Helm", emoji: "📌", slot: "helmet", rarity: "uncommon", stats: { defense: 8 }, passive: { type: "reflect", value: 12, label: "Reflects 12% of damage taken" } },
  { id: "h_bascinet", name: "Visored Bascinet", emoji: "🛡️", slot: "helmet", rarity: "rare", stats: { defense: 10 }, passive: { type: "critResist", value: 40, label: "Takes 40% less critical damage" } },
  { id: "h_crown_vitality", name: "Crown of Vitality", emoji: "👑", slot: "helmet", rarity: "rare", stats: { defense: 4, hp: 55 } },
  { id: "h_bone_helm", name: "Bone Helm", emoji: "🦴", slot: "helmet", rarity: "rare", stats: { defense: 9, attack: 7 } },
  { id: "h_owl_helm", name: "Owl Helm", emoji: "🦉", slot: "helmet", rarity: "epic", stats: { defense: 8, dodge: 14, accuracy: 8 } },
  { id: "h_golden_crown", name: "Golden Crown", emoji: "👑", slot: "helmet", rarity: "epic", stats: { defense: 7, critChance: 10, dodge: 10 } },
  { id: "h_dragon_king", name: "Dragon King's Helmet", emoji: "🐲", slot: "helmet", rarity: "legendary", stats: { defense: 15, hp: 45 }, passive: { type: "critResist", value: 50, label: "Takes 50% less critical damage" } },
  { id: "h_phoenix_crest", name: "Phoenix Crest", emoji: "🔥", slot: "helmet", rarity: "legendary", stats: { defense: 9 }, passive: { type: "lastStand", value: 30, label: "Revives once at 30% HP" } },
  { id: "a_cloth_tunic", name: "Cloth Tunic", emoji: "👕", slot: "armor", rarity: "common", stats: { defense: 6, speed: 6 } },
  { id: "a_leather", name: "Leather Armor", emoji: "🧥", slot: "armor", rarity: "common", stats: { defense: 10 } },
  { id: "a_rusty_plate", name: "Rusty Chestplate", emoji: "🍂", slot: "armor", rarity: "common", stats: { defense: 13, dodge: -6 }, tags: ["heavy"] },
  { id: "a_chainmail", name: "Chainmail", emoji: "⛓️", slot: "armor", rarity: "uncommon", stats: { defense: 14, speed: -5 }, tags: ["heavy"] },
  { id: "a_mage_robe", name: "Mage Robe", emoji: "🥋", slot: "armor", rarity: "uncommon", stats: { defense: 7 }, passive: { type: "healPerTurn", value: 4, label: "Regenerates 4 HP per turn" } },
  { id: "a_gamblers_vest", name: "Gambler's Vest", emoji: "🎰", slot: "armor", rarity: "uncommon", stats: { defense: 8, critChance: 8 } },
  { id: "a_scale_vest", name: "Scale Vest", emoji: "🐟", slot: "armor", rarity: "rare", stats: { defense: 15, speed: 5 } },
  { id: "a_squire_mail", name: "Squire's Mail", emoji: "🎽", slot: "armor", rarity: "common", stats: { defense: 9, hp: 8 } },
  { id: "a_cursed_shroud", name: "Cursed Shroud", emoji: "🕸️", slot: "armor", rarity: "epic", stats: { defense: 5, attack: 12, dodge: 12, hp: -15 } },
  { id: "a_bone_wall", name: "Bone Wall", emoji: "🦴", slot: "armor", rarity: "rare", stats: { defense: 16 }, passive: { type: "block", value: 15, label: "15% chance to block half damage" } },
  { id: "a_royal_plate", name: "Royal Guard Plate", emoji: "🏰", slot: "armor", rarity: "epic", stats: { defense: 17, hp: 15 }, passive: { type: "block", value: 18, label: "18% chance to block half damage" }, tags: ["heavy"] },
  { id: "a_plate", name: "Plate Armor", emoji: "🛡️", slot: "armor", rarity: "rare", stats: { defense: 21, speed: -12 }, tags: ["heavy"] },
  { id: "a_shadow_cloak", name: "Shadow Cloak", emoji: "🌫️", slot: "armor", rarity: "rare", stats: { defense: 8, dodge: 16 } },
  { id: "a_thorned_mail", name: "Thorned Mail", emoji: "🌵", slot: "armor", rarity: "rare", stats: { defense: 12 }, passive: { type: "reflect", value: 20, label: "Reflects 20% of damage taken" } },
  { id: "a_berserker_harness", name: "Berserker Harness", emoji: "😤", slot: "armor", rarity: "epic", stats: { defense: 6, attack: 16 } },
  { id: "a_guardian_plate", name: "Guardian Plate", emoji: "🏰", slot: "armor", rarity: "epic", stats: { defense: 19, hp: 40 }, tags: ["heavy"] },
  { id: "a_titan", name: "Titan Armor", emoji: "🗿", slot: "armor", rarity: "legendary", stats: { defense: 30, speed: -18 }, passive: { type: "block", value: 25, label: "25% chance to block half damage" }, tags: ["heavy"] },
  { id: "a_dragonscale", name: "Dragonscale Armor", emoji: "🐊", slot: "armor", rarity: "legendary", stats: { defense: 22 }, passive: { type: "reflect", value: 15, label: "Reflects 15% of damage taken" } },
  { id: "b_worn", name: "Worn Boots", emoji: "🥾", slot: "boots", rarity: "common", stats: { speed: 7 } },
  { id: "b_striders", name: "Leather Striders", emoji: "👟", slot: "boots", rarity: "common", stats: { speed: 6, dodge: 4 } },
  { id: "b_dancer", name: "Dancer's Steps", emoji: "🩰", slot: "boots", rarity: "uncommon", stats: { speed: 9, dodge: 9, defense: -3 } },
  { id: "b_scout", name: "Scout Sandals", emoji: "🥿", slot: "boots", rarity: "common", stats: { speed: 8, accuracy: 4 } },
  { id: "b_crusader", name: "Crusader Greaves", emoji: "✝️", slot: "boots", rarity: "rare", stats: { speed: 4, defense: 9, attack: 5 }, tags: ["heavy"] },
  { id: "b_sandals", name: "Sandals", emoji: "🩴", slot: "boots", rarity: "common", stats: { speed: 10, defense: -2 } },
  { id: "b_sturdy", name: "Sturdy Boots", emoji: "👢", slot: "boots", rarity: "common", stats: { speed: 5, defense: 5 } },
  { id: "b_iron_greaves", name: "Iron Greaves", emoji: "🦿", slot: "boots", rarity: "uncommon", stats: { defense: 8, speed: -4 }, tags: ["heavy"] },
  { id: "b_swift", name: "Swift Boots", emoji: "💨", slot: "boots", rarity: "uncommon", stats: { speed: 14, dodge: 6 } },
  { id: "b_spiked_cleats", name: "Spiked Cleats", emoji: "⚽", slot: "boots", rarity: "uncommon", stats: { speed: 7, attack: 6 } },
  { id: "b_winged", name: "Winged Boots", emoji: "🕊️", slot: "boots", rarity: "rare", stats: { speed: 16, initiative: 12 } },
  { id: "b_shadow_steps", name: "Shadow Steps", emoji: "👣", slot: "boots", rarity: "rare", stats: { speed: 9, dodge: 14 } },
  { id: "b_lucky_slippers", name: "Lucky Slippers", emoji: "🍀", slot: "boots", rarity: "rare", stats: { speed: 8, critChance: 8, dodge: 8 } },
  { id: "b_warlord", name: "Warlord Greaves", emoji: "⚙️", slot: "boots", rarity: "epic", stats: { speed: 9, defense: 9, attack: 6 } },
  { id: "b_earthshaker", name: "Earthshaker Boots", emoji: "🌋", slot: "boots", rarity: "epic", stats: { speed: 6, attack: 8 }, passive: { type: "stunChance", value: 12, label: "12% chance to stun on hit" } },
  { id: "b_hermes", name: "Hermes Treads", emoji: "🌪️", slot: "boots", rarity: "legendary", stats: { speed: 17 }, passive: { type: "firstStrike", value: 1, label: "Always attacks first" } },
  { id: "b_phantom", name: "Phantom Striders", emoji: "👻", slot: "boots", rarity: "legendary", stats: { speed: 13, dodge: 22, defense: -5 } },
  { id: "c_copper_ring", name: "Copper Ring", emoji: "💍", slot: "accessory", rarity: "common", stats: { hp: 22, attack: 4 } },
  { id: "c_war_drum", name: "War Drum", emoji: "🥁", slot: "accessory", rarity: "epic", stats: { attack: 10, initiative: 15 } },
  { id: "c_frost_charm", name: "Frost Charm", emoji: "❄️", slot: "accessory", rarity: "rare", stats: { defense: 5 }, passive: { type: "stunChance", value: 10, label: "10% chance to freeze-stun on hit" } },
  { id: "c_smoke_bomb", name: "Smoke Bomb", emoji: "💨", slot: "accessory", rarity: "uncommon", stats: { dodge: 12, speed: 4 } },
  { id: "c_lucky_dice", name: "Lucky Dice", emoji: "🎲", slot: "accessory", rarity: "rare", stats: { critChance: 12, dodge: 6, accuracy: -4 } },
  { id: "c_war_banner", name: "War Banner", emoji: "🚩", slot: "accessory", rarity: "epic", stats: { attack: 5 }, passive: { type: "momentum", value: 6, label: "+6% attack every round" } },
  { id: "c_bone_ward", name: "Bone Ward", emoji: "☠️", slot: "accessory", rarity: "rare", stats: { defense: 4 }, passive: { type: "shield", value: 25, label: "Starts battle with a 25 HP shield" } },
  { id: "c_duel_buckler", name: "Dueling Buckler", emoji: "🛡️", slot: "accessory", rarity: "uncommon", stats: { defense: 6 }, passive: { type: "block", value: 12, label: "12% chance to block half damage" } },
  { id: "c_iron_band", name: "Iron Band", emoji: "⭕", slot: "accessory", rarity: "common", stats: { defense: 6 } },
  { id: "c_lucky_coin", name: "Lucky Coin", emoji: "🪙", slot: "accessory", rarity: "uncommon", stats: { critChance: 14 } },
  { id: "c_healing_pendant", name: "Healing Pendant", emoji: "💚", slot: "accessory", rarity: "uncommon", stats: {}, passive: { type: "healPerTurn", value: 6, label: "Regenerates 6 HP per turn" } },
  { id: "c_snake_ring", name: "Snake Ring", emoji: "🐍", slot: "accessory", rarity: "uncommon", stats: { attack: 5 }, passive: { type: "poisonOnHit", value: 4, label: "Hits poison for 4 dmg per turn" } },
  { id: "c_vampire_necklace", name: "Vampire Necklace", emoji: "🧛", slot: "accessory", rarity: "rare", stats: {}, passive: { type: "lifesteal", value: 22, label: "Heals 22% of damage dealt" } },
  { id: "c_mirror_amulet", name: "Mirror Amulet", emoji: "🪞", slot: "accessory", rarity: "rare", stats: {}, passive: { type: "reflect", value: 25, label: "Reflects 25% of damage taken" } },
  { id: "c_clover", name: "Four-Leaf Clover", emoji: "🍀", slot: "accessory", rarity: "rare", stats: { dodge: 10, critChance: 10, accuracy: 6 } },
  { id: "c_poison_vial", name: "Poison Vial", emoji: "🧪", slot: "accessory", rarity: "rare", stats: {}, passive: { type: "poisonOnHit", value: 8, label: "Hits poison for 8 dmg per turn" } },
  { id: "c_berserker_totem", name: "Berserker Totem", emoji: "🗿", slot: "accessory", rarity: "epic", stats: { attack: 14, defense: -8 } },
  { id: "c_guardian_charm", name: "Guardian Charm", emoji: "🔮", slot: "accessory", rarity: "epic", stats: {}, passive: { type: "shield", value: 30, label: "Starts battle with a 30 HP shield" } },
  { id: "c_assassins_mark", name: "Assassin's Mark", emoji: "🎭", slot: "accessory", rarity: "epic", stats: { critChance: 20, critDamage: 30 } },
  { id: "c_cursed_skull", name: "Cursed Skull", emoji: "💀", slot: "accessory", rarity: "epic", stats: { attack: 22, hp: -40 } },
  { id: "c_phoenix_feather", name: "Phoenix Feather", emoji: "🪶", slot: "accessory", rarity: "legendary", stats: {}, passive: { type: "lastStand", value: 40, label: "Revives once at 40% HP" } },
  { id: "c_chaos_orb", name: "Chaos Orb", emoji: "🌀", slot: "accessory", rarity: "legendary", stats: {}, passive: { type: "chaos", value: 35, label: "All your stats shift ±35% each battle" } }
];

export function itemById(id: string): Item | undefined {
  return ITEMS.find((i) => i.id === id);
}

export type WeaponKind = "ranged" | "heavy" | "blade";

const HEAVY_WEAPON_IDS = new Set(["w_war_hammer", "w_battle_axe", "w_executioner", "w_dragonfang", "w_twin_axe", "w_claymore"]);

function baseWeaponId(item: Item): string {
  return item.id.replace(/_(forged|gambled)$/, "");
}

export function weaponKindFor(item: Item): WeaponKind {
  if ((item.tags ?? []).includes("ranged")) return "ranged";
  if (HEAVY_WEAPON_IDS.has(baseWeaponId(item))) return "heavy";
  return "blade";
}

export type WeaponVisualKind = "blade" | "heavy" | "dual" | "crossbow" | "bow" | "magic" | "fists";

export interface WeaponModelDef {
  model: string;
  offhand?: string;
  kind: WeaponVisualKind;
  scale?: number;
  hand?: "l" | "r";
}

export const WEAPON_MODELS: Record<string, WeaponModelDef> = {
  w_rusty_sword: { model: "Skeleton_Blade", kind: "blade" },
  w_wooden_club: { model: "mug_full", kind: "blade" },
  w_battle_axe: { model: "axe_2handed", kind: "heavy" },
  w_dagger: { model: "dagger", kind: "blade" },
  w_rapier: { model: "sword_1handed", kind: "blade" },
  w_bow: { model: "Bow_Wooden", kind: "bow", scale: 0.28, hand: "l" },
  w_twin_axe: { model: "Axe_Double", kind: "heavy", scale: 0.27 },
  w_cursed_bow: { model: "Bow_Evil", kind: "bow", scale: 0.27, hand: "l" },
  w_golden_bow: { model: "Bow_Golden", kind: "bow", scale: 0.28, hand: "l" },
  w_hunting_bow: { model: "Bow_Wooden", kind: "bow", scale: 0.26, hand: "l" },
  w_hatchet: { model: "axe_1handed", kind: "blade" },
  w_tribal_shield: { model: "shield_round_barbarian", kind: "blade", hand: "l" },
  w_bone_crossbow: { model: "Skeleton_Crossbow", kind: "crossbow" },
  w_claymore: { model: "Claymore", kind: "heavy", scale: 0.27 },
  w_grimoire: { model: "spellbook_open", kind: "magic" },
  w_war_hammer: { model: "sword_2handed_color", kind: "heavy" },
  w_spiked_flail: { model: "shield_spikes", kind: "blade", hand: "l" },
  w_twin_blades: { model: "dagger", offhand: "dagger", kind: "dual" },
  w_poison_fang: { model: "dagger", kind: "blade" },
  w_crossbow: { model: "crossbow_2handed", kind: "crossbow" },
  w_executioner: { model: "Skeleton_Axe", kind: "heavy" },
  w_vampire_scythe: { model: "wand", kind: "magic" },
  w_storm_spear: { model: "staff", kind: "magic" },
  w_dragonfang: { model: "sword_2handed", kind: "heavy" },
  w_void_reaper: { model: "Skeleton_Staff", kind: "magic" }
};

export function weaponModelFor(item: Item | undefined): WeaponModelDef | undefined {
  if (!item) return undefined;
  return WEAPON_MODELS[baseWeaponId(item)];
}

const SHIELD_MODELS: Record<string, string> = {
  a_titan: "shield_square",
  c_guardian_charm: "shield_badge",
  a_bone_wall: "Skeleton_Shield_Large_A",
  c_bone_ward: "Skeleton_Shield_Small_A",
  a_royal_plate: "shield_square_color",
  c_duel_buckler: "Skeleton_Shield_Small_B"
};

export interface HeadgearDef {
  model: string;
  meshes: string[];
  bone?: string;
}

export const QUIVER_GEAR: HeadgearDef = { model: "Ranger", meshes: ["Ranger_Quiver"], bone: "chest" };

const HEADGEAR_MODELS: Record<string, HeadgearDef> = {
  h_old_helmet: { model: "Skeleton_Warrior", meshes: ["Skeleton_Warrior_Helmet"] },
  h_leather_cap: { model: "Skeleton_Rogue", meshes: ["Skeleton_Rogue_Hood"] },
  h_hunter_hood: { model: "Skeleton_Rogue", meshes: ["Skeleton_Rogue_Hood"] },
  h_veteran_hood: { model: "Skeleton_Rogue", meshes: ["Skeleton_Rogue_Hood"] },
  h_iron_helm: { model: "Knight", meshes: ["Knight_Helmet", "Knight_HelmetVisor"] },
  h_bascinet: { model: "Knight", meshes: ["Knight_Helmet", "Knight_HelmetVisor"] },
  h_wizard_hat: { model: "Mage", meshes: ["Mage_Hat"] },
  h_bone_helm: { model: "Skeleton_Mage", meshes: ["Skeleton_Mage_Hat"] },
  h_dragon_king: { model: "Barbarian", meshes: ["Barbarian_BearHat"] },
  c_assassins_mark: { model: "Rogue_Hooded", meshes: ["RogueHooded_Mask"] }
};

export function headgearFor(equipment: Partial<Record<Slot, Item>>, disabledItems: string[]): HeadgearDef[] {
  const defs: HeadgearDef[] = [];
  for (const item of Object.values(equipment)) {
    if (!item || disabledItems.includes(item.id)) continue;
    const def = HEADGEAR_MODELS[item.id.replace(/_(forged|gambled)$/, "")];
    if (def) defs.push(def);
  }
  return defs;
}

export function shieldModelFor(equipment: Partial<Record<Slot, Item>>, disabledItems: string[]): string | undefined {
  for (const item of Object.values(equipment)) {
    if (!item || disabledItems.includes(item.id)) continue;
    const type = item.passive?.type;
    if (type === "block" || type === "shield") {
      return SHIELD_MODELS[baseWeaponId(item)] ?? "shield_round";
    }
  }
  return undefined;
}

export function weaponVisualKindFor(item: Item | undefined): WeaponVisualKind {
  if (!item) return "fists";
  const def = weaponModelFor(item);
  if (def) return def.kind;
  const kind = weaponKindFor(item);
  if (kind === "ranged") return "crossbow";
  return kind;
}
