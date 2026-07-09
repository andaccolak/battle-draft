import type { Server, Socket } from "socket.io";
import { GameRoom } from "./room";

const rooms = new Map<string, GameRoom>();

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  let code = "";
  do {
    code = "";
    for (let i = 0; i < 6; i++) {
      code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }
  } while (rooms.has(code));
  return code;
}

function cleanNickname(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const nick = raw.trim().slice(0, 16);
  return nick.length >= 2 ? nick : null;
}

interface JoinPayload {
  code?: string;
  nickname?: string;
  playerId?: string;
}

export function registerSocketHandlers(io: Server): void {
  io.on("connection", (socket: Socket) => {
    let joinedRoom: GameRoom | null = null;
    let myPlayerId: string | null = null;

    const fail = (message: string) => socket.emit("game:error", { message });

    socket.on("room:create", (payload: JoinPayload) => {
      const nickname = cleanNickname(payload?.nickname);
      const playerId = typeof payload?.playerId === "string" ? payload.playerId.slice(0, 64) : null;
      if (!nickname || !playerId) return fail("Enter a nickname (2-16 characters).");
      const code = generateCode();
      const room = new GameRoom(code, io);
      rooms.set(code, room);
      room.addPlayer(playerId, socket.id, nickname);
      joinedRoom = room;
      myPlayerId = playerId;
      socket.join(room.channel);
      socket.emit("room:joined", { code, playerId });
      room.broadcast();
    });

    socket.on("room:join", (payload: JoinPayload) => {
      const nickname = cleanNickname(payload?.nickname);
      const playerId = typeof payload?.playerId === "string" ? payload.playerId.slice(0, 64) : null;
      const code = typeof payload?.code === "string" ? payload.code.trim().toUpperCase() : "";
      if (!nickname || !playerId) return fail("Enter a nickname (2-16 characters).");
      const room = rooms.get(code);
      if (!room) return fail("Room not found. Check the code.");
      const existing = room.players.get(playerId);
      if (existing) {
        existing.socketId = socket.id;
        existing.connected = true;
        joinedRoom = room;
        myPlayerId = playerId;
        socket.join(room.channel);
        socket.emit("room:joined", { code, playerId });
        room.broadcast();
        room.sendPrivate();
        return;
      }
      if (room.phase !== "lobby") return fail("This match already started. Wait for the next one!");
      if (room.players.size >= 8) return fail("Room is full (8 players max).");
      if ([...room.players.values()].some((p) => p.nickname.toLowerCase() === nickname.toLowerCase())) {
        return fail("That nickname is taken in this room.");
      }
      room.addPlayer(playerId, socket.id, nickname);
      joinedRoom = room;
      myPlayerId = playerId;
      socket.join(room.channel);
      socket.emit("room:joined", { code, playerId });
      room.broadcast();
    });

    socket.on("game:start", () => {
      if (!joinedRoom || !myPlayerId) return;
      if (joinedRoom.hostId !== myPlayerId) return fail("Only the host can start the game.");
      if (joinedRoom.players.size < 2) return fail("You need at least 2 players.");
      joinedRoom.startGame();
    });

    socket.on("draft:pick", (payload: { itemId?: string | null }) => {
      if (!joinedRoom || !myPlayerId) return;
      const itemId = typeof payload?.itemId === "string" ? payload.itemId : null;
      joinedRoom.pickItem(myPlayerId, itemId);
    });

    socket.on("luck:pick", (payload: { cardId?: string }) => {
      if (!joinedRoom || !myPlayerId) return;
      if (typeof payload?.cardId !== "string") return;
      joinedRoom.pickLuckCard(myPlayerId, payload.cardId);
    });

    socket.on("game:again", () => {
      if (!joinedRoom || !myPlayerId) return;
      if (joinedRoom.hostId !== myPlayerId) return fail("Only the host can restart.");
      joinedRoom.playAgain();
    });

    socket.on("room:leave", () => {
      if (!joinedRoom || !myPlayerId) return;
      const room = joinedRoom;
      socket.leave(room.channel);
      room.removeFromLobby(myPlayerId);
      const player = room.players.get(myPlayerId);
      if (player) {
        player.connected = false;
        player.socketId = null;
      }
      joinedRoom = null;
      myPlayerId = null;
      if (room.players.size === 0) {
        room.clearTimer();
        rooms.delete(room.code);
      } else {
        room.broadcast();
      }
    });

    socket.on("disconnect", () => {
      if (!joinedRoom || !myPlayerId) return;
      const room = joinedRoom;
      const player = room.players.get(myPlayerId);
      if (player) {
        player.connected = false;
        player.socketId = null;
      }
      if (room.phase === "lobby") {
        room.removeFromLobby(myPlayerId);
      }
      const anyConnected = [...room.players.values()].some((p) => p.connected);
      if (!anyConnected) {
        setTimeout(() => {
          const stillDead = ![...room.players.values()].some((p) => p.connected);
          if (stillDead && rooms.get(room.code) === room) {
            room.clearTimer();
            rooms.delete(room.code);
          }
        }, 10 * 60 * 1000);
      }
      room.broadcast();
    });
  });
}
