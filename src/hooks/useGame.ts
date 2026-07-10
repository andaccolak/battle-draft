"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DraftOffer, LuckOffer, RoomSnapshot } from "@/lib/game/types";
import { getPlayerId } from "@/lib/session";

const POLL_MS = 1200;

export interface GameApi {
  snapshot: RoomSnapshot | null;
  offer: DraftOffer | null;
  luckOffer: LuckOffer | null;
  error: string | null;
  playerId: string;
  connected: boolean;
  startGame: () => void;
  chooseAvatar: (avatarId: string) => void;
  pickItem: (itemId: string | null) => void;
  pickLuckCard: (cardId: string) => void;
  reactBattle: (pass: boolean) => void;
  playAgain: () => void;
  leaveRoom: () => void;
  clearError: () => void;
}

interface RoomResponse {
  snapshot?: RoomSnapshot;
  offer?: DraftOffer | null;
  luckOffer?: LuckOffer | null;
  error?: string;
}

function adjustClock(snapshot: RoomSnapshot): RoomSnapshot {
  const skew = Date.now() - snapshot.serverNow;
  return {
    ...snapshot,
    deadline: snapshot.deadline !== null ? snapshot.deadline + skew : null
  };
}

export function useGame(code: string, nickname: string): GameApi {
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [offer, setOffer] = useState<DraftOffer | null>(null);
  const [luckOffer, setLuckOffer] = useState<LuckOffer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const playerIdRef = useRef<string>("");
  const fatalRef = useRef(false);
  const leftRef = useRef(false);

  if (!playerIdRef.current && typeof window !== "undefined") {
    playerIdRef.current = getPlayerId();
  }

  const applyResponse = useCallback((data: RoomResponse) => {
    if (data.snapshot) {
      setSnapshot(adjustClock(data.snapshot));
      setOffer(data.offer ?? null);
      setLuckOffer(data.luckOffer ?? null);
    }
  }, []);

  const postAction = useCallback(
    async (payload: Record<string, unknown>): Promise<void> => {
      if (leftRef.current) return;
      try {
        const res = await fetch(`/api/rooms/${code}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, playerId: playerIdRef.current })
        });
        const data = (await res.json()) as RoomResponse;
        if (data.error) {
          setError(data.error);
          if (res.status === 404) fatalRef.current = true;
        }
        applyResponse(data);
        setConnected(true);
      } catch {
        setConnected(false);
      }
    },
    [code, applyResponse]
  );

  useEffect(() => {
    if (!nickname) return;
    fatalRef.current = false;
    leftRef.current = false;
    let stopped = false;

    const poll = async () => {
      if (stopped || fatalRef.current || leftRef.current) return;
      try {
        const res = await fetch(`/api/rooms/${code}?playerId=${encodeURIComponent(playerIdRef.current)}`);
        if (res.status === 404) {
          const data = (await res.json()) as RoomResponse;
          setError(data.error ?? "err_not_found");
          fatalRef.current = true;
          return;
        }
        const data = (await res.json()) as RoomResponse;
        applyResponse(data);
        setConnected(true);
      } catch {
        setConnected(false);
      }
    };

    void postAction({ type: "join", nickname }).then(poll);
    const interval = setInterval(() => void poll(), POLL_MS);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [code, nickname, postAction, applyResponse]);

  const startGame = useCallback(() => void postAction({ type: "start" }), [postAction]);
  const chooseAvatar = useCallback((avatarId: string) => void postAction({ type: "avatar", avatarId }), [postAction]);
  const pickItem = useCallback((itemId: string | null) => void postAction({ type: "pick", itemId }), [postAction]);
  const pickLuckCard = useCallback((cardId: string) => void postAction({ type: "luck", cardId }), [postAction]);
  const reactBattle = useCallback((pass: boolean) => void postAction({ type: "react", pass }), [postAction]);
  const playAgain = useCallback(() => void postAction({ type: "again" }), [postAction]);
  const leaveRoom = useCallback(() => {
    void postAction({ type: "leave" });
    leftRef.current = true;
  }, [postAction]);
  const clearError = useCallback(() => setError(null), []);

  return {
    snapshot,
    offer,
    luckOffer,
    error,
    playerId: playerIdRef.current,
    connected,
    startGame,
    chooseAvatar,
    pickItem,
    pickLuckCard,
    reactBattle,
    playAgain,
    leaveRoom,
    clearError
  };
}
