export type HairStyle =
  | "spiky"
  | "long"
  | "bun"
  | "mohawk"
  | "bald"
  | "bob"
  | "afro"
  | "hood"
  | "bandana"
  | "horns";

export interface AvatarDef {
  id: string;
  skin: string;
  hair: string;
  style: HairStyle;
  outfit: string;
  trim: string;
  beard?: string;
}

export const AVATARS: AvatarDef[] = [
  { id: "blaze", skin: "#e8b48c", hair: "#e0482f", style: "spiky", outfit: "#b91c1c", trim: "#fbbf24" },
  { id: "shadow", skin: "#d9a06b", hair: "#1e293b", style: "hood", outfit: "#334155", trim: "#818cf8" },
  { id: "viking", skin: "#f0c8a0", hair: "#eab308", style: "long", outfit: "#7c2d12", trim: "#fbbf24", beard: "#d97706" },
  { id: "ronin", skin: "#ecc094", hair: "#111827", style: "bun", outfit: "#4c1d95", trim: "#f472b6" },
  { id: "corsair", skin: "#d9a06b", hair: "#dc2626", style: "bandana", outfit: "#1f2937", trim: "#f59e0b", beard: "#3f2212" },
  { id: "mystic", skin: "#f1d3c2", hair: "#a855f7", style: "long", outfit: "#581c87", trim: "#e879f9" },
  { id: "golem", skin: "#9ca3af", hair: "#6b7280", style: "bald", outfit: "#4b5563", trim: "#10b981" },
  { id: "punk", skin: "#e8b48c", hair: "#22c55e", style: "mohawk", outfit: "#171717", trim: "#22d3ee" },
  { id: "valkyrie", skin: "#f5d0b0", hair: "#f8fafc", style: "bob", outfit: "#0e7490", trim: "#fde047" },
  { id: "monk", skin: "#d9a06b", hair: "#a16207", style: "bald", outfit: "#ea580c", trim: "#fef3c7" },
  { id: "frost", skin: "#bfdbfe", hair: "#e0f2fe", style: "afro", outfit: "#1e40af", trim: "#93c5fd" },
  { id: "minotaur", skin: "#c2846a", hair: "#78350f", style: "horns", outfit: "#78350f", trim: "#f59e0b", beard: "#57281a" }
];

export const AVATAR_IDS = AVATARS.map((a) => a.id);

export const KAYKIT_MODELS: Record<string, string> = {
  blaze: "Knight",
  shadow: "Rogue_Hooded",
  viking: "Barbarian",
  ronin: "Rogue",
  corsair: "Ranger",
  mystic: "Mage",
  golem: "Skeleton_Warrior",
  punk: "Skeleton_Rogue",
  valkyrie: "Knight",
  monk: "Barbarian",
  frost: "Skeleton_Mage",
  minotaur: "Skeleton_Minion"
};

export const MODELED_AVATARS = new Set(Object.keys(KAYKIT_MODELS));

export function avatarById(id: string | undefined): AvatarDef {
  return AVATARS.find((a) => a.id === id) ?? (AVATARS[0] as AvatarDef);
}

export function avatarIdForSeed(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return (AVATARS[h % AVATARS.length] as AvatarDef).id;
}
