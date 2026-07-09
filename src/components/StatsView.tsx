"use client";

import Link from "next/link";
import { LangToggle, useI18n } from "@/lib/i18n";

export interface LeaderboardRow {
  nickname: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  championships: number;
}

export default function StatsView({ rows }: { rows: LeaderboardRow[] }) {
  const { t } = useI18n();

  return (
    <main className="mx-auto max-w-md px-5 py-10">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm font-semibold text-slate-500 hover:text-slate-300">
          {t("home")}
        </Link>
        <LangToggle />
      </div>
      <h1 className="font-display mt-4 text-4xl font-black">
        {t("hallOfFame1")} <span className="text-amber-400">{t("hallOfFame2")}</span>
      </h1>
      <p className="mt-2 text-sm text-slate-400">{t("statsSub")}</p>

      <div className="card-surface mt-6 overflow-hidden">
        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">{t("noBattles")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">{t("warrior")}</th>
                <th className="px-2 py-3 text-center">👑</th>
                <th className="px-2 py-3 text-center">W</th>
                <th className="px-2 py-3 text-center">L</th>
                <th className="px-4 py-3 text-right">{t("games")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.nickname} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 font-semibold">
                    {i === 0 ? "🥇 " : i === 1 ? "🥈 " : i === 2 ? "🥉 " : ""}
                    {row.nickname}
                  </td>
                  <td className="px-2 py-3 text-center font-bold text-amber-300">{row.championships}</td>
                  <td className="px-2 py-3 text-center text-emerald-300">{row.wins}</td>
                  <td className="px-2 py-3 text-center text-rose-300">{row.losses}</td>
                  <td className="px-4 py-3 text-right text-slate-400">{row.matchesPlayed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
