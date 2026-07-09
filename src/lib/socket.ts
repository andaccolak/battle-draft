"use client";

import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io({ path: "/api/socket", autoConnect: true });
  }
  return socket;
}

export function getPlayerId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("bd_player_id");
  if (!id) {
    id = crypto.randomUUID();
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
