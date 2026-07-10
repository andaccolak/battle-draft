"use client";

import { motion } from "framer-motion";
import type { BracketRound, PublicPlayer } from "@/lib/game/types";
import AvatarPortrait from "./AvatarPortrait";
import { useI18n } from "@/lib/i18n";

interface Props {
  rounds: BracketRound[];
  players?: PublicPlayer[];
}

function BracketSide({
  nickname,
  avatarId,
  fallback,
  winner,
  align
}: {
  nickname: string | null;
  avatarId: string | undefined;
  fallback: string;
  winner: string | null;
  align: "left" | "right";
}) {
  const state = winner && nickname === winner ? "text-amber-300" : winner && nickname ? "text-slate-500 line-through" : "";
  return (
    <span className={`flex min-w-0 flex-1 items-center gap-2 font-semibold ${align === "right" ? "flex-row-reverse" : ""} ${state}`}>
      {nickname && <AvatarPortrait avatarId={avatarId} flip={align === "right"} className="h-9 w-7 shrink-0" />}
      <span className="truncate">{nickname ?? fallback}</span>
    </span>
  );
}

export default function Bracket({ rounds, players }: Props) {
  const { t } = useI18n();
  const avatarFor = (nickname: string | null) =>
    nickname ? players?.find((p) => p.nickname === nickname)?.avatar : undefined;
  return (
    <div className="mx-auto max-w-md space-y-4">
      <h3 className="text-center font-display text-xl font-black text-slate-300">{t("tournament")}</h3>
      {rounds.map((round, ri) => (
        <div key={ri} className="space-y-2">
          <div className="text-center text-xs font-bold uppercase tracking-widest text-slate-500">
            {rounds.length - ri === 1 && round.matches.length === 1 ? t("final") : t("round", { n: ri + 1 })}
          </div>
          {round.matches.map((m, mi) => (
            <motion.div
              key={mi}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm"
            >
              <BracketSide nickname={m.a} avatarId={avatarFor(m.a)} fallback="—" winner={m.winner} align="left" />
              <span className="shrink-0 text-xs font-black text-slate-500">VS</span>
              <BracketSide nickname={m.b} avatarId={avatarFor(m.b)} fallback={t("bye")} winner={m.winner} align="right" />
            </motion.div>
          ))}
        </div>
      ))}
    </div>
  );
}
