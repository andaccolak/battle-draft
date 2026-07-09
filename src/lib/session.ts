"use client";

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
