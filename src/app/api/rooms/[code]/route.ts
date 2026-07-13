import { NextResponse } from "next/server";
import { withRoom } from "@/server/store";
import { joinState, kickPlayer, leaveState, pickItem, pickLuck, playAgain, reactBattle, renamePlayer, setArenaMap, setAvatar, setDraftMode, setMatchMode, setTourneyMode, shoutHost, snapshotFor, startGame, touch } from "@/server/engine";

export const dynamic = "force-dynamic";

function cleanNickname(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const nick = raw.trim().slice(0, 16);
  return nick.length >= 2 ? nick : null;
}

function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().slice(0, 6);
}

export async function GET(req: Request, ctx: { params: { code: string } }): Promise<NextResponse> {
  const code = normalizeCode(ctx.params.code);
  const url = new URL(req.url);
  const playerId = (url.searchParams.get("playerId") ?? "").slice(0, 64);
  const result = await withRoom(code, (state, now) => {
    touch(state, playerId, now);
    return null;
  });
  if (result.error || !result.state) {
    return NextResponse.json({ error: result.error ?? "err_not_found" }, { status: 404 });
  }
  return NextResponse.json(snapshotFor(result.state, playerId, Date.now()));
}

interface ActionBody {
  type?: string;
  playerId?: string;
  nickname?: string;
  itemId?: string | null;
  cardId?: string;
  avatarId?: string;
  mapId?: string;
  modeId?: string;
  targetId?: string;
  pass?: boolean;
  score?: number;
}

export async function POST(req: Request, ctx: { params: { code: string } }): Promise<NextResponse> {
  const code = normalizeCode(ctx.params.code);
  let body: ActionBody;
  try {
    body = (await req.json()) as ActionBody;
  } catch {
    return NextResponse.json({ error: "err_nickname" }, { status: 400 });
  }
  const playerId = typeof body.playerId === "string" ? body.playerId.slice(0, 64) : "";
  if (!playerId || typeof body.type !== "string") {
    return NextResponse.json({ error: "err_nickname" }, { status: 400 });
  }
  const type = body.type;
  const result = await withRoom(code, (state, now) => {
    switch (type) {
      case "join": {
        const nickname = cleanNickname(body.nickname);
        if (!nickname) return "err_nickname";
        return joinState(state, playerId, nickname, now);
      }
      case "start":
        return startGame(state, playerId, now);
      case "pick":
        return pickItem(state, playerId, typeof body.itemId === "string" ? body.itemId : null);
      case "luck":
        return typeof body.cardId === "string" ? pickLuck(state, playerId, body.cardId) : null;
      case "kick":
        return typeof body.targetId === "string" ? kickPlayer(state, playerId, body.targetId) : null;
      case "rename": {
        const newNick = cleanNickname(body.nickname);
        if (!newNick) return "err_nickname";
        return renamePlayer(state, playerId, newNick);
      }
      case "avatar":
        return typeof body.avatarId === "string" ? setAvatar(state, playerId, body.avatarId) : null;
      case "map":
        return typeof body.mapId === "string" ? setArenaMap(state, playerId, body.mapId) : null;
      case "gamemode":
        return typeof body.modeId === "string" ? setMatchMode(state, playerId, body.modeId) : null;
      case "tourney":
        return typeof body.modeId === "string" ? setTourneyMode(state, playerId, body.modeId) : null;
      case "draftmode":
        return typeof body.modeId === "string" ? setDraftMode(state, playerId, body.modeId) : null;
      case "again":
        return playAgain(state, playerId, now);
      case "shout":
        return shoutHost(state, playerId, now);
      case "react":
        return reactBattle(state, playerId, body.pass === true, now, typeof body.score === "number" ? body.score : undefined);
      case "leave":
        leaveState(state, playerId, now);
        return null;
      default:
        return null;
    }
  });
  if (result.error && !result.state) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  if (!result.state) {
    return NextResponse.json({ error: "err_not_found" }, { status: 404 });
  }
  return NextResponse.json(snapshotFor(result.state, playerId, Date.now()));
}
