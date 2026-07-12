import { NextResponse } from "next/server";
import { createRoom } from "@/server/store";

export const dynamic = "force-dynamic";

function cleanNickname(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const nick = raw.trim().slice(0, 16);
  return nick.length >= 2 ? nick : null;
}

export async function POST(req: Request): Promise<NextResponse> {
  let body: { nickname?: string; playerId?: string; code?: string };
  try {
    body = (await req.json()) as { nickname?: string; playerId?: string };
  } catch {
    return NextResponse.json({ error: "err_nickname" }, { status: 400 });
  }
  const nickname = cleanNickname(body.nickname);
  const playerId = typeof body.playerId === "string" ? body.playerId.slice(0, 64) : null;
  if (!nickname || !playerId) {
    return NextResponse.json({ error: "err_nickname" }, { status: 400 });
  }
  const rawCode = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  if (rawCode && !/^[A-Z0-9]{4,6}$/.test(rawCode)) {
    return NextResponse.json({ error: "codeLength" }, { status: 400 });
  }
  try {
    const code = await createRoom(playerId, nickname, rawCode || undefined);
    return NextResponse.json({ code });
  } catch (e) {
    if (e instanceof Error && e.message === "err_code_taken") {
      return NextResponse.json({ error: "err_code_taken" }, { status: 409 });
    }
    return NextResponse.json({ error: "err_busy" }, { status: 500 });
  }
}
