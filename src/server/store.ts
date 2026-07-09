import { prisma } from "@/lib/db";
import { ensureSchema } from "./ensureSchema";
import { createState, tick, type RoomState } from "./engine";
import { persistMatch } from "./persistence";

type StoreMode = "db" | "memory";

interface StoreGlobals {
  __bdMode?: Promise<StoreMode>;
  __bdMem?: Map<string, { state: RoomState; version: number }>;
}

const g = globalThis as unknown as StoreGlobals;

function memStore(): Map<string, { state: RoomState; version: number }> {
  if (!g.__bdMem) g.__bdMem = new Map();
  return g.__bdMem;
}

export function storeMode(): Promise<StoreMode> {
  if (!g.__bdMode) {
    g.__bdMode = ensureSchema().then((ok) => (ok ? "db" : "memory"));
  }
  return g.__bdMode;
}

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export async function createRoom(playerId: string, nickname: string): Promise<string> {
  const mode = await storeMode();
  const now = Date.now();
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = randomCode();
    const state = createState(code, playerId, nickname, now);
    if (mode === "memory") {
      if (memStore().has(code)) continue;
      memStore().set(code, { state, version: 0 });
      return code;
    }
    try {
      await prisma.gameState.create({ data: { code, state: toJson(state) } });
      void prisma.gameState
        .deleteMany({ where: { updatedAt: { lt: new Date(now - 24 * 60 * 60 * 1000) } } })
        .catch(() => undefined);
      return code;
    } catch {
      continue;
    }
  }
  throw new Error("could not allocate room code");
}

function toJson(state: RoomState): object {
  return JSON.parse(JSON.stringify(state)) as object;
}

export interface RoomResult {
  error?: string;
  state?: RoomState;
}

export async function withRoom(
  code: string,
  mutate: ((state: RoomState, now: number) => string | null) | null
): Promise<RoomResult> {
  const mode = await storeMode();
  if (mode === "memory") {
    const entry = memStore().get(code);
    if (!entry) return { error: "err_not_found" };
    const now = Date.now();
    tick(entry.state, now);
    if (mutate) {
      const err = mutate(entry.state, now);
      if (err) return { error: err, state: entry.state };
      tick(entry.state, now);
    }
    return { state: entry.state };
  }
  for (let attempt = 0; attempt < 4; attempt++) {
    const row = await prisma.gameState.findUnique({ where: { code } });
    if (!row) return { error: "err_not_found" };
    const state = row.state as unknown as RoomState;
    const now = Date.now();
    let dirty = tick(state, now);
    let mutateError: string | null = null;
    if (mutate) {
      mutateError = mutate(state, now);
      if (!mutateError) {
        dirty = true;
        tick(state, now);
      }
    }
    if (mutateError) return { error: mutateError, state };
    if (!dirty) return { state };
    const updated = await prisma.gameState.updateMany({
      where: { code, version: row.version },
      data: { state: toJson(state), version: row.version + 1 }
    });
    if (updated.count === 1) {
      if (state.phase === "champion" && !state.persisted) {
        const claimed = await prisma.gameState.updateMany({
          where: { code, version: row.version + 1 },
          data: { state: toJson({ ...state, persisted: true }), version: row.version + 2 }
        });
        if (claimed.count === 1) {
          state.persisted = true;
          await persistMatch(state).catch(() => undefined);
        }
      }
      return { state };
    }
  }
  return { error: "err_busy" };
}
