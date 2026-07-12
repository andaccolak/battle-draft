"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { RoomSnapshot } from "@/lib/game/types";
import { sfx } from "@/lib/sound";
import AvatarPortrait from "./AvatarPortrait";
import { useI18n } from "@/lib/i18n";

interface Props {
  snapshot: RoomSnapshot;
  playerId: string;
  onPlayAgain: () => void;
  onShout: () => void;
}

export default function Champion({ snapshot, playerId, onPlayAgain, onShout }: Props) {
  const [shouted, setShouted] = useState(false);
  const { t } = useI18n();
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
        className="flex flex-col items-center"
      >
        {champion && (
          <AvatarPortrait avatarId={champion.avatar} weapon={champion.equipment.weapon} equipment={champion.equipment} className="h-40 w-[7.2rem] drop-shadow-2xl" />
        )}
      </motion.div>
      <div>
        <motion.div
          initial={{ y: -24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35, type: "spring", damping: 9 }}
          className="text-5xl drop-shadow-[0_3px_10px_rgba(251,191,36,0.55)]"
        >
          👑
        </motion.div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-sm font-bold uppercase tracking-[0.3em] text-amber-400">
          {t("champion")}
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
            {t("thatsYou")}
          </motion.p>
        )}
      </div>

      <div className="card-surface w-full p-4">
        <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">{t("finalStandings")}</div>
        <div className="space-y-1.5">
          {[...snapshot.players]
            .sort(
              (a, b) =>
                Number(a.spectator ?? false) - Number(b.spectator ?? false) ||
                Number(a.eliminated) - Number(b.eliminated) ||
                b.wins - a.wins
            )
            .map((p, i) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm">
                <span className="flex items-center gap-2 font-semibold">
                  <AvatarPortrait avatarId={p.avatar} className="h-9 w-7" />
                  {p.spectator ? "👀" : i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "💀"} {p.isBot ? "🤖 " : ""}
                  {p.nickname}
                </span>
                <span className="text-xs text-slate-400">
                  {p.spectator ? "" : `${p.wins} ${p.wins === 1 ? t("win") : t("wins")}`}
                </span>
              </div>
            ))}
        </div>
      </div>

      {snapshot.bracket && snapshot.bracket.some((r) => r.matches.some((m) => m.winner)) && (
        <div className="card-surface w-full p-4">
          <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">🏁 {t("matchHistory")}</div>
          <div className="max-h-40 space-y-1 overflow-y-auto">
            {snapshot.bracket
              .flatMap((r) => r.matches)
              .filter((m) => m.winner && m.a && m.b)
              .map((m, i) => (
                <div key={i} className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs">
                  <span className={`min-w-0 flex-1 truncate text-right ${m.winner === m.a ? "font-bold text-emerald-300" : "text-slate-500"}`}>
                    {m.a}
                  </span>
                  <span className="shrink-0 text-[9px] font-black text-slate-600">vs</span>
                  <span className={`min-w-0 flex-1 truncate ${m.winner === m.b ? "font-bold text-emerald-300" : "text-slate-500"}`}>{m.b}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {isHost ? (
        <button onClick={onPlayAgain} className="btn-primary w-full text-lg">
          {t("oneMoreGame")}
        </button>
      ) : (
        <button
          onClick={() => {
            if (shouted) return;
            onShout();
            setShouted(true);
            setTimeout(() => setShouted(false), 30000);
          }}
          disabled={shouted}
          className={`btn-primary w-full text-lg ${shouted ? "opacity-50" : ""}`}
        >
          {shouted ? t("shoutSent") : t("shoutBtn")}
        </button>
      )}
    </div>
  );
}
