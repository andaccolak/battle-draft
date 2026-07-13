"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import type { GameEvent } from "@/lib/game/types";
import { sfx } from "@/lib/sound";
import { useI18n } from "@/lib/i18n";

export default function EventReveal({ event }: { event: GameEvent }) {
  const { t, eventText } = useI18n();
  const localized = eventText(event.id);
  useEffect(() => {
    sfx.environment(event.id);
  }, [event.id]);

  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-6 text-center">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-sm font-bold uppercase tracking-[0.3em] text-slate-400"
      >
        {t("globalEvent")}
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
        {localized.name}
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="max-w-sm text-lg text-slate-300"
      >
        {localized.description}
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0.5, 1] }}
        transition={{ delay: 1.5, duration: 1.5, repeat: Infinity }}
        className="text-sm font-bold text-amber-300"
      >
        {t("tournamentBegins")}
      </motion.p>
    </div>
  );
}
