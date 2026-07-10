"use client";

import { motion, type Variants } from "framer-motion";
import type { FighterView } from "@/lib/game/types";
import { avatarById } from "@/lib/game/avatars";
import CharacterSprite, { type Pose } from "./CharacterSprite";

export type { Pose };

interface Props {
  fighter: FighterView;
  facing: "right" | "left";
  pose: Pose;
  depth?: "near" | "far";
}

export default function Fighter({ fighter, facing, pose, depth = "near" }: Props) {
  const dir = facing === "right" ? 1 : -1;
  const lungeY = depth === "near" ? -26 : 26;
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
    attack: { x: dir * 78, y: lungeY, rotate: dir * 12, scale: 1, opacity: 1, transition: { duration: 0.28, ease: "easeOut" } },
    hit: { x: dir * -18, y: 0, rotate: dir * -8, opacity: 1, transition: { duration: 0.2 } },
    dodge: { x: dir * -45, y: -25, rotate: dir * -15, opacity: 1, transition: { duration: 0.25 } },
    dead: { x: 0, y: 26, rotate: dir * 90, opacity: 0.35, transition: { duration: 0.7, ease: "easeIn" } },
    victory: { x: 0, y: [0, -22, 0], rotate: [0, dir * -6, 0], opacity: 1, transition: { repeat: Infinity, duration: 0.7 } }
  };

  return (
    <motion.div variants={variants} animate={pose} initial="idle" className="relative h-40 w-28 select-none">
      {legendary && <div className="absolute inset-2 rounded-full bg-orange-400/25 blur-xl" />}
      <div className="absolute inset-0" style={{ transform: facing === "left" ? "scaleX(-1)" : undefined }}>
        <CharacterSprite
          avatar={avatarById(fighter.avatar)}
          equipment={eq}
          disabledItems={fighter.disabledItems}
          pose={pose}
          className="h-full w-full drop-shadow-lg"
        />
      </div>
      {pose === "dead" && <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-2xl">👻</div>}
    </motion.div>
  );
}
