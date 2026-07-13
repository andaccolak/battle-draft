"use client";

import { motion } from "framer-motion";
import type { Item, Slot } from "@/lib/game/types";
import { weaponKindFor } from "@/lib/game/items";
import type { AvatarDef } from "@/lib/game/avatars";

export type Pose =
  | "idle"
  | "guard"
  | "windup"
  | "throw"
  | "pickup"
  | "attack"
  | "hit"
  | "knockdown"
  | "block"
  | "dodge"
  | "roll"
  | "stun"
  | "revive"
  | "taunt"
  | "dead"
  | "victory"
  | "use";

interface Props {
  avatar: AvatarDef;
  equipment?: Partial<Record<Slot, Item>>;
  disabledItems?: string[];
  pose?: Pose;
  className?: string;
}

function shade(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * factor);
  const g = Math.round(((n >> 8) & 255) * factor);
  const b = Math.round((n & 255) * factor);
  return `rgb(${r},${g},${b})`;
}

function Hair({ avatar }: { avatar: AvatarDef }) {
  const c = avatar.hair;
  switch (avatar.style) {
    case "spiky":
      return (
        <g fill={c}>
          <path d="M39 36 A21 21 0 0 1 81 36 Z" />
          <polygon points="42,22 46,4 51,20 57,-2 63,20 69,2 74,20 79,8 80,24 60,16 40,24" />
        </g>
      );
    case "long":
      return (
        <g fill={c}>
          <path d="M39 36 A21 21 0 0 1 81 36 Z" />
          <rect x="36" y="28" width="11" height="38" rx="5" />
          <rect x="73" y="28" width="11" height="38" rx="5" />
        </g>
      );
    case "bun":
      return (
        <g fill={c}>
          <path d="M39 36 A21 21 0 0 1 81 36 Z" />
          <circle cx="60" cy="12" r="8" />
        </g>
      );
    case "mohawk":
      return (
        <g fill={c}>
          <rect x="54" y="0" width="12" height="26" rx="5" />
        </g>
      );
    case "bob":
      return (
        <g fill={c}>
          <path d="M39 36 A21 21 0 0 1 81 36 Z" />
          <rect x="36" y="28" width="10" height="22" rx="5" />
          <rect x="74" y="28" width="10" height="22" rx="5" />
          <rect x="44" y="20" width="32" height="8" rx="4" />
        </g>
      );
    case "afro":
      return (
        <g fill={c}>
          <circle cx="60" cy="20" r="17" />
          <circle cx="45" cy="28" r="9" />
          <circle cx="75" cy="28" r="9" />
        </g>
      );
    case "hood":
      return (
        <g fill={c}>
          <path d="M36 42 A24 24 0 0 1 84 42 Q60 32 36 42 Z" />
          <polygon points="54,20 60,2 66,20" />
        </g>
      );
    case "bandana":
      return (
        <g fill={c}>
          <path d="M39 34 A21 21 0 0 1 81 34 Z" />
          <polygon points="80,30 94,24 88,38" />
        </g>
      );
    case "horns":
      return (
        <g>
          <polygon points="42,28 30,6 48,18" fill="#f5f5f4" />
          <polygon points="78,28 90,6 72,18" fill="#f5f5f4" />
          <path d="M43 32 A21 21 0 0 1 77 32 Z" fill={c} />
        </g>
      );
    default:
      return null;
  }
}

export default function CharacterSprite({ avatar, equipment = {}, disabledItems = [], pose = "idle", className }: Props) {
  const disabled = new Set(disabledItems);
  const off = (item: Item | undefined) => !!item && disabled.has(item.id);
  const weapon = equipment.weapon;
  const weaponActive = weapon && !off(weapon);
  const kind = weapon ? weaponKindFor(weapon) : null;
  const outfitDark = shade(avatar.outfit, 0.7);
  const baseWeaponRotate = kind === "ranged" ? 0 : kind === "heavy" ? -30 : -20;
  const armRotate = pose === "windup" ? -45 : pose === "attack" ? 40 : 0;
  const fistShift = pose === "windup" ? -7 : pose === "attack" ? 14 : 0;

  return (
    <svg viewBox="0 0 120 160" className={className}>
      <ellipse cx="60" cy="152" rx="28" ry="6" fill="rgba(0,0,0,0.35)" />

      {weaponActive && <rect x="29" y="68" width="11" height="30" rx="5" fill={outfitDark} />}

      <rect x="44" y="108" width="13" height="38" rx="6" fill={outfitDark} />
      <rect x="63" y="108" width="13" height="38" rx="6" fill={outfitDark} />
      <ellipse cx="50" cy="148" rx="8" ry="4" fill={shade(avatar.outfit, 0.5)} />
      <ellipse cx="70" cy="148" rx="8" ry="4" fill={shade(avatar.outfit, 0.5)} />
      {equipment.boots && (
        <text x="60" y="156" fontSize="22" textAnchor="middle" className={off(equipment.boots) ? "grayscale opacity-30" : ""}>
          {equipment.boots.emoji}
        </text>
      )}

      <rect x="38" y="62" width="44" height="54" rx="14" fill={avatar.outfit} />
      <rect x="38" y="100" width="44" height="7" rx="3.5" fill={avatar.trim} />
      <circle cx="41" cy="68" r="7" fill={avatar.trim} />
      <circle cx="79" cy="68" r="7" fill={avatar.trim} />
      {equipment.armor && (
        <text x="60" y="96" fontSize="24" textAnchor="middle" className={off(equipment.armor) ? "grayscale opacity-30" : ""}>
          {equipment.armor.emoji}
        </text>
      )}

      <circle cx="60" cy="38" r="21" fill={avatar.skin} />
      <circle cx="60" cy="38" r="21" fill="rgba(255,255,255,0.08)" />
      <circle cx="67" cy="36" r="3" fill="#0f172a" />
      <circle cx="53" cy="36" r="3" fill="#0f172a" />
      <path d="M53 46 Q60 51 68 46" stroke="#0f172a" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      {avatar.beard && <path d="M46 44 Q60 62 74 44 L74 52 Q60 66 46 52 Z" fill={avatar.beard} />}
      <Hair avatar={avatar} />
      {equipment.helmet && (
        <text x="60" y="26" fontSize="30" textAnchor="middle" className={off(equipment.helmet) ? "grayscale opacity-30" : ""}>
          {equipment.helmet.emoji}
        </text>
      )}

      {weaponActive ? (
        <motion.g
          animate={{ rotate: armRotate }}
          transition={{ duration: 0.25 }}
          style={{ transformBox: "fill-box", transformOrigin: "20% 15%" }}
        >
          <rect
            x="76"
            y="66"
            width="12"
            height="34"
            rx="6"
            fill={avatar.outfit}
            transform="rotate(-32 82 70)"
          />
          <circle cx="98" cy="92" r="6" fill={avatar.skin} />
          <text
            x="100"
            y="100"
            fontSize="38"
            textAnchor="middle"
            transform={`rotate(${baseWeaponRotate} 98 92)`}
          >
            {weapon.emoji}
          </text>
        </motion.g>
      ) : (
        <motion.g animate={{ x: fistShift }} transition={{ duration: 0.22 }}>
          {weapon && (
            <text x="98" y="98" fontSize="30" textAnchor="middle" className="grayscale opacity-30">
              {weapon.emoji}
            </text>
          )}
          <path d="M56 74 L72 64" stroke={outfitDark} strokeWidth="11" strokeLinecap="round" />
          <path d="M76 74 L86 58" stroke={avatar.outfit} strokeWidth="11" strokeLinecap="round" />
          <circle cx="73" cy="62" r="7" fill={avatar.skin} stroke={shade(avatar.skin, 0.75)} strokeWidth="1.5" />
          <circle cx="88" cy="55" r="7.5" fill={avatar.skin} stroke={shade(avatar.skin, 0.75)} strokeWidth="1.5" />
        </motion.g>
      )}

      {weaponActive && <circle cx="35" cy="100" r="5.5" fill={avatar.skin} />}

      {equipment.accessory && (
        <text x="20" y="80" fontSize="18" textAnchor="middle" className={off(equipment.accessory) ? "grayscale opacity-30" : ""}>
          {equipment.accessory.emoji}
        </text>
      )}
    </svg>
  );
}
