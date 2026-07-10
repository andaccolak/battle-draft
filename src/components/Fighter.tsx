"use client";

import { motion, type Variants } from "framer-motion";
import type { FighterView } from "@/lib/game/types";

export type Pose = "idle" | "windup" | "attack" | "hit" | "dodge" | "dead" | "victory";

const COLORS = ["#818cf8", "#f472b6", "#34d399", "#fbbf24", "#60a5fa", "#fb7185", "#a78bfa", "#4ade80"];

function colorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length] ?? "#818cf8";
}

interface Props {
  fighter: FighterView;
  facing: "right" | "left";
  pose: Pose;
}

export default function Fighter({ fighter, facing, pose }: Props) {
  const color = colorFor(fighter.nickname);
  const dir = facing === "right" ? 1 : -1;
  const eq = fighter.equipment;
  const disabled = new Set(fighter.disabledItems);
  const legendary = Object.values(eq).some((i) => i && i.rarity === "legendary" && !disabled.has(i.id));

  const variants: Variants = {
    idle: { x: 0, y: [0, -5, 0], rotate: 0, opacity: 1, transition: { y: { repeat: Infinity, duration: 1.6, ease: "easeInOut" } } },
    windup: {
      x: dir * -20,
      y: [0, -3, 0],
      rotate: dir * -10,
      scale: 1.06,
      opacity: 1,
      transition: { x: { duration: 0.4 }, rotate: { duration: 0.4 }, y: { repeat: Infinity, duration: 0.35 } }
    },
    attack: { x: dir * 70, y: -8, rotate: dir * 12, scale: 1, opacity: 1, transition: { duration: 0.28, ease: "easeOut" } },
    hit: { x: dir * -18, y: 0, rotate: dir * -8, opacity: 1, transition: { duration: 0.2 } },
    dodge: { x: dir * -45, y: -25, rotate: dir * -15, opacity: 1, transition: { duration: 0.25 } },
    dead: { x: 0, y: 26, rotate: dir * 90, opacity: 0.35, transition: { duration: 0.7, ease: "easeIn" } },
    victory: { x: 0, y: [0, -22, 0], rotate: [0, dir * -6, 0], opacity: 1, transition: { repeat: Infinity, duration: 0.7 } }
  };

  const itemCls = (id: string | undefined) => (id && disabled.has(id) ? "grayscale opacity-30" : "");

  return (
    <motion.div variants={variants} animate={pose} initial="idle" className="relative h-40 w-28 select-none">
      {legendary && (
        <div className="absolute inset-2 rounded-full bg-orange-400/25 blur-xl" />
      )}
      <div className="absolute inset-x-0 bottom-0 top-4" style={{ transform: facing === "left" ? "scaleX(-1)" : undefined }}>
        <svg viewBox="0 0 100 130" className="h-full w-full drop-shadow-lg">
          <ellipse cx="50" cy="124" rx="26" ry="6" fill="rgba(0,0,0,0.35)" />
          <rect x="30" y="52" width="40" height="48" rx="16" fill={color} />
          <circle cx="50" cy="34" r="20" fill={color} />
          <circle cx="50" cy="34" r="20" fill="rgba(255,255,255,0.15)" />
          <circle cx="57" cy="32" r="3.2" fill="#0f172a" />
          <circle cx="45" cy="32" r="3.2" fill="#0f172a" />
          <path d="M45 42 Q50 46 55 42" stroke="#0f172a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <rect x="34" y="100" width="12" height="18" rx="5" fill={color} />
          <rect x="54" y="100" width="12" height="18" rx="5" fill={color} />
        </svg>
      </div>
      {eq.helmet && (
        <div className={`absolute -top-1 left-1/2 -translate-x-1/2 text-3xl ${itemCls(eq.helmet.id)}`}>{eq.helmet.emoji}</div>
      )}
      {eq.armor && (
        <div className={`absolute left-1/2 top-[52%] -translate-x-1/2 -translate-y-1/2 text-2xl ${itemCls(eq.armor.id)}`}>{eq.armor.emoji}</div>
      )}
      {eq.weapon && (
        <motion.div
          animate={
            pose === "attack"
              ? { rotate: dir * 55, scale: 1.35 }
              : pose === "windup"
                ? { rotate: dir * -50, scale: 1.2 }
                : { rotate: 0, scale: 1 }
          }
          transition={{ duration: 0.25 }}
          className={`absolute top-[44%] text-4xl ${facing === "right" ? "-right-4" : "-left-4"} ${itemCls(eq.weapon.id)}`}
        >
          {eq.weapon.emoji}
        </motion.div>
      )}
      {eq.boots && (
        <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 text-xl ${itemCls(eq.boots.id)}`}>{eq.boots.emoji}</div>
      )}
      {eq.accessory && (
        <motion.div
          animate={{ y: [0, -6, 0], opacity: [0.8, 1, 0.8] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className={`absolute top-6 text-xl ${facing === "right" ? "-left-3" : "-right-3"} ${itemCls(eq.accessory.id)}`}
        >
          {eq.accessory.emoji}
        </motion.div>
      )}
      {pose === "dead" && <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-2xl">👻</div>}
    </motion.div>
  );
}
