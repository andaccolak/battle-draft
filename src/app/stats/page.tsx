import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

interface LeaderboardRow {
  nickname: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  championships: number;
}

async function getLeaderboard(): Promise<LeaderboardRow[]> {
  try {
    return await prisma.playerStats.findMany({
      orderBy: [{ championships: "desc" }, { wins: "desc" }],
      take: 50,
      select: { nickname: true, matchesPlayed: true, wins: true, losses: true, championships: true }
    });
  } catch {
    return [];
  }
}

export default async function StatsPage() {
  const rows = await getLeaderboard();

  return (
    <main className="mx-auto max-w-md px-5 py-10">
      <Link href="/" className="text-sm font-semibold text-slate-500 hover:text-slate-300">
        ← Home
      </Link>
      <h1 className="font-display mt-4 text-4xl font-black">
        🏆 Hall of <span className="text-amber-400">Fame</span>
      </h1>
      <p className="mt-2 text-sm text-slate-400">All-time results across every room.</p>

      <div className="card-surface mt-6 overflow-hidden">
        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No battles recorded yet. Go make history.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Warrior</th>
                <th className="px-2 py-3 text-center">👑</th>
                <th className="px-2 py-3 text-center">W</th>
                <th className="px-2 py-3 text-center">L</th>
                <th className="px-4 py-3 text-right">Games</th>
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
