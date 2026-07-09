import { prisma } from "@/lib/db";

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "Room" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "Match" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "championNickname" TEXT NOT NULL,
    "playerCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "MatchPlayer" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "luckCard" TEXT,
    "items" JSONB NOT NULL,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "isChampion" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "MatchPlayer_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "Battle" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "roundIndex" INTEGER NOT NULL,
    "playerA" TEXT NOT NULL,
    "playerB" TEXT NOT NULL,
    "winner" TEXT NOT NULL,
    "log" JSONB NOT NULL,
    CONSTRAINT "Battle_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "PlayerStats" (
    "id" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "matchesPlayed" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "championships" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlayerStats_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "GameState" (
    "code" TEXT NOT NULL,
    "state" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GameState_pkey" PRIMARY KEY ("code")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Room_code_key" ON "Room"("code")`,
  `CREATE INDEX IF NOT EXISTS "MatchPlayer_nickname_idx" ON "MatchPlayer"("nickname")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "PlayerStats_nickname_key" ON "PlayerStats"("nickname")`,
  `DO $$ BEGIN
    ALTER TABLE "Match" ADD CONSTRAINT "Match_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN
    ALTER TABLE "MatchPlayer" ADD CONSTRAINT "MatchPlayer_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN
    ALTER TABLE "Battle" ADD CONSTRAINT "Battle_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`
];

export async function ensureSchema(): Promise<boolean> {
  try {
    for (const sql of STATEMENTS) {
      await prisma.$executeRawUnsafe(sql);
    }
    console.log("🗄️  Database schema is ready");
    return true;
  } catch (err) {
    console.error("Database unreachable, falling back to in-memory rooms (fine for local play, stats won't be saved):", err instanceof Error ? err.message : err);
    return false;
  }
}
