"use client";

import { motion } from "framer-motion";
import type { RoomSnapshot } from "@/lib/game/types";
import { useI18n } from "@/lib/i18n";

interface Props {
  snapshot: RoomSnapshot;
  playerId: string;
  onStart: () => void;
}

export default function Lobby({ snapshot, playerId, onStart }: Props) {
  const { t } = useI18n();
  const isHost = snapshot.hostId === playerId;
  const solo = snapshot.players.length === 1;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <div className="card-surface p-6 text-center">
        <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">{t("roomCode")}</div>
        <div className="font-display mt-1 text-5xl font-black tracking-[0.25em] text-indigo-300">{snapshot.code}</div>
        <p className="mt-2 text-sm text-slate-400">{t("joinHint")}</p>
      </div>

      <div className="card-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">{t("warriors")}</h2>
          <span className="text-sm font-semibold text-slate-400">{snapshot.players.length}/8</span>
        </div>
        <div className="space-y-2">
          {snapshot.players.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3"
            >
              <span className="text-xl">{p.isBot ? "🤖" : p.isHost ? "👑" : "⚔️"}</span>
              <span className="flex-1 font-semibold">{p.nickname}</span>
              {p.id === playerId && <span className="text-xs font-bold text-indigo-300">{t("you")}</span>}
              {!p.connected && !p.isBot && <span className="text-xs text-rose-400">{t("offline")}</span>}
            </motion.div>
          ))}
        </div>
      </div>

      {isHost ? (
        <button onClick={onStart} className="btn-primary text-lg">
          {solo ? t("startWithBots") : t("startDraft")}
        </button>
      ) : (
        <div className="text-center text-sm text-slate-400">
          <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.8 }}>
            {t("waitingHost")}
          </motion.span>
        </div>
      )}
    </div>
  );
}
