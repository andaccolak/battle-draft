"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import type { RoomSnapshot } from "@/lib/game/types";
import { sfx } from "@/lib/sound";

interface Props {
  snapshot: RoomSnapshot;
  playerId: string;
  onPlayAgain: () => void;
}

export default function Champion({ snapshot, playerId, onPlayAgain }: Props) {
  const isHost = snapshot.hostId === playerId;
  const champion = snapshot.players.find((p) => !p.eliminated);
  const isMe = champion?.id === playerId;

  useEffect(() => {
    sfx.victory();
  }, []);

  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center gap-6 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1, rotate: [0, -8, 8, 0] }}
        transition={{ type: "spring", damping: 8 }}
        className="text-8xl"
      >
        👑
      </motion.div>
      <div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm font-bold uppercase tracking-[0.3em] text-amber-400">
          Champion
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="font-display mt-2 bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-6xl font-black text-transparent"
        >
          {snapshot.champion ?? champion?.nickname ?? "???"}
        </motion.h2>
        {isMe && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-3 text-lg font-bold text-emerald-300">
            THAT&apos;S YOU! Rub it in. 😎
          </motion.p>
        )}
      </div>

      <div className="card-surface w-full p-4">
        <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Final standings</div>
        <div className="space-y-1.5">
          {[...snapshot.players]
            .sort((a, b) => Number(a.eliminated) - Number(b.eliminated) || b.wins - a.wins)
            .map((p, i) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm">
                <span className="font-semibold">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "💀"} {p.nickname}
                </span>
                <span className="text-xs text-slate-400">{p.wins} win{p.wins === 1 ? "" : "s"}</span>
              </div>
            ))}
        </div>
      </div>

      {isHost ? (
        <button onClick={onPlayAgain} className="btn-primary w-full text-lg">
          🔄 ONE MORE GAME!
        </button>
      ) : (
        <p className="text-sm text-slate-400">Shout at the host to run it back.</p>
      )}
    </div>
  );
}
