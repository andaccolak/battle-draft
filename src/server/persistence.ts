import { prisma } from "@/lib/db";
import { EVENTS } from "@/lib/game/events";
import type { RoomState } from "./engine";

export async function persistMatch(state: RoomState): Promise<void> {
  try {
    const dbRoom = await prisma.room.upsert({
      where: { code: state.code },
      update: {},
      create: { code: state.code }
    });
    const champion = state.players.find((p) => !p.eliminated);
    const eventName = EVENTS.find((e) => e.id === state.eventId)?.name ?? state.eventId ?? "Unknown";
    const match = await prisma.match.create({
      data: {
        roomId: dbRoom.id,
        eventName,
        championNickname: champion?.nickname ?? "Unknown",
        playerCount: state.players.length,
        participants: {
          create: state.players.map((p) => ({
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
    if (state.records.length > 0) {
      await prisma.battle.createMany({
        data: state.records.map((b) => ({
          matchId: match.id,
          roundIndex: b.roundIndex,
          playerA: b.playerA,
          playerB: b.playerB,
          winner: b.winner,
          log: JSON.parse(JSON.stringify(b.log))
        }))
      });
    }
    for (const p of state.players) {
      if (p.isBot) continue;
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
