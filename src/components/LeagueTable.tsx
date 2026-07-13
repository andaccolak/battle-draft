"use client";

import { motion } from "framer-motion";
import type { LeagueStanding, LeagueStage } from "@/lib/game/types";
import { useI18n } from "@/lib/i18n";
import AvatarPortrait from "./AvatarPortrait";

interface Props {
  rows: LeagueStanding[];
  stage: LeagueStage;
  updated?: boolean;
}

export default function LeagueTable({ rows, stage, updated = false }: Props) {
  const { t } = useI18n();
  if (rows.length === 0) return null;
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full rounded-2xl border border-indigo-300/20 bg-slate-950/80 p-3 shadow-[0_18px_50px_rgba(0,0,0,0.3)]"
    >
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="text-left">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">🏆 {t("leagueTable")}</div>
          {updated && <div className="mt-0.5 text-[9px] font-semibold text-slate-500">{t("leagueTableUpdated")}</div>}
        </div>
        {stage === "league" && rows.some((row) => row.qualified) && (
          <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-[8px] font-black uppercase tracking-wide text-emerald-300">
            {t("playoffZone")}
          </div>
        )}
      </div>
      <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_2rem_2rem_2rem_3.25rem] items-center gap-1 px-2 pb-1 text-center text-[8px] font-black uppercase tracking-wide text-slate-600">
        <span>#</span>
        <span className="text-left">{t("player")}</span>
        <span>{t("leaguePlayedShort")}</span>
        <span>{t("leagueWonShort")}</span>
        <span>{t("leagueLostShort")}</span>
        <span>{t("leaguePointsShort")}</span>
      </div>
      <div className="space-y-1">
        {rows.map((row, index) => {
          const cutline = index > 0 && rows[index - 1]?.qualified && !row.qualified;
          return (
            <div key={row.playerId} className={cutline ? "border-t border-dashed border-emerald-400/35 pt-1" : ""}>
              <motion.div
                layout
                className={`grid grid-cols-[1.5rem_minmax(0,1fr)_2rem_2rem_2rem_3.25rem] items-center gap-1 rounded-lg px-2 py-1.5 text-center text-xs tabular-nums ${row.qualified ? "bg-emerald-500/[0.07]" : "bg-white/[0.035]"}`}
              >
                <span className={`font-display font-black ${row.rank <= 3 ? "text-amber-300" : "text-slate-500"}`}>{row.rank}</span>
                <span className="flex min-w-0 items-center gap-1.5 text-left">
                  <AvatarPortrait avatarId={row.avatar} className="h-7 w-5 shrink-0" />
                  <span className="truncate font-bold text-slate-200">{row.nickname}</span>
                </span>
                <span className="text-slate-400">{row.played}</span>
                <span className="font-bold text-emerald-300">{row.won}</span>
                <span className="text-rose-300">{row.lost}</span>
                <span className="rounded-md bg-indigo-400/15 py-1 font-display font-black text-indigo-200">{row.points}</span>
              </motion.div>
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}
