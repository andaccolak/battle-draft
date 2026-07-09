import { prisma } from "@/lib/db";
import type { GameRoom } from "./room";

export async function persistMatch(room: GameRoom): Promise<void> {
  try {
    const dbRoom = await prisma.room.upsert({
      where: { code: room.code },
      update: {},
      create: { code: room.code }
    });
    const players = [...room.players.values()];
    const champion = players.find((p) => !p.eliminated);
    const match = await prisma.match.create({
      data: {
        roomId: dbRoom.id,
        eventName: room.event?.name ?? "Unknown",
        championNickname: champion?.nickname ?? "Unknown",
        playerCount: players.length,
        participants: {
          create: players.map((p) => ({
            nickname: p.nickname,
            luckCard: p.luckCard?.name ?? null,
            items: JSON.parse(JSON.stringify(p.equipment)),
            wins: p.wins,
            losses: p.eliminated ? 1 : 0,
            isChampion: !p.eliminated
          }))
        }
      }
    });
    if (room.battleRecords.length > 0) {
      await prisma.battle.createMany({
        data: room.battleRecords.map((b) => ({
          matchId: match.id,
          roundIndex: b.roundIndex,
          playerA: b.playerA,
          playerB: b.playerB,
          winner: b.winner,
          log: JSON.parse(JSON.stringify(b.log))
        }))
      });
    }
    for (const p of players) {
      await prisma.playerStats.upsert({
        where: { nickname: p.nickname },
        update: {
          matchesPlayed: { increment: 1 },
          wins: { increment: p.wins },
          losses: { increment: p.eliminated ? 1 : 0 },
          championships: { increment: p.eliminated ? 0 : 1 }
        },
        create: {
          nickname: p.nickname,
          matchesPlayed: 1,
          wins: p.wins,
          losses: p.eliminated ? 1 : 0,
          championships: p.eliminated ? 0 : 1
        }
      });
    }
  } catch (err) {
    console.error("Failed to persist match", err);
  }
}
