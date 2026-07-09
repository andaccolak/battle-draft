import { prisma } from "@/lib/db";
import StatsView, { type LeaderboardRow } from "@/components/StatsView";

export const dynamic = "force-dynamic";

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
  return <StatsView rows={rows} />;
}
