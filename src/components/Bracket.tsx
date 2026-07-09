"use client";

import { motion } from "framer-motion";
import type { BracketRound } from "@/lib/game/types";

export default function Bracket({ rounds }: { rounds: BracketRound[] }) {
  return (
    <div className="mx-auto max-w-md space-y-4">
      <h3 className="text-center font-display text-xl font-black text-slate-300">🏆 Tournament</h3>
      {rounds.map((round, ri) => (
        <div key={ri} className="space-y-2">
          <div className="text-center text-xs font-bold uppercase tracking-widest text-slate-500">
            {rounds.length - ri === 1 && round.matches.length === 1 ? "Final" : `Round ${ri + 1}`}
          </div>
          {round.matches.map((m, mi) => (
            <motion.div
              key={mi}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-2.5 text-sm"
            >
              <span className={`font-semibold ${m.winner && m.winner === m.a ? "text-amber-300" : m.winner ? "text-slate-500 line-through" : ""}`}>
                {m.a ?? "—"}
              </span>
              <span className="text-xs font-black text-slate-500">VS</span>
              <span className={`font-semibold ${m.winner && m.winner === m.b ? "text-amber-300" : m.winner && m.b ? "text-slate-500 line-through" : ""}`}>
                {m.b ?? "(bye)"}
              </span>
            </motion.div>
          ))}
        </div>
      ))}
    </div>
  );
}
