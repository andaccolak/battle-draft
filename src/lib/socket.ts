"use client";

import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;
let initPromise: Promise<void> | null = null;

function ensureServerStarted(): Promise<void> {
  if (!initPromise) {
    initPromise = fetch("/api/socket-init")
      .then(() => undefined)
      .catch(() => undefined);
  }
  return initPromise;
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      path: "/api/socket",
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 2000
    });
    const s = socket;
    void ensureServerStarted().then(() => {
      if (!s.connected) s.connect();
    });
  }
  return socket;
}

function makeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
}

export function getPlayerId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("bd_player_id");
  if (!id) {
    id = makeId();
    localStorage.setItem("bd_player_id", id);
  }
  return id;
}

export function getNickname(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("bd_nickname") ?? "";
}

export function setNickname(nick: string): void {
  localStorage.setItem("bd_nickname", nick);
}
