"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import type { GameEvent } from "@/lib/game/types";
import { sfx } from "@/lib/sound";

export default function EventReveal({ event }: { event: GameEvent }) {
  useEffect(() => {
    sfx.event();
  }, [event.id]);

  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-6 text-center">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-sm font-bold uppercase tracking-[0.3em] text-slate-400"
      >
        Global Event
      </motion.p>
      <motion.div
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", damping: 10, delay: 0.2 }}
        className="text-8xl"
      >
        {event.emoji}
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="font-display text-5xl font-black"
      >
        {event.name}
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="max-w-sm text-lg text-slate-300"
      >
        {event.description}
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0.5, 1] }}
        transition={{ delay: 1.5, duration: 1.5, repeat: Infinity }}
        className="text-sm font-bold text-amber-300"
      >
        ⚔️ The tournament begins...
      </motion.p>
    </div>
  );
}
