"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DraftOffer, LuckOffer, RoomSnapshot } from "@/lib/game/types";
import { getPlayerId, getSocket } from "@/lib/socket";

export interface GameApi {
  snapshot: RoomSnapshot | null;
  offer: DraftOffer | null;
  luckOffer: LuckOffer | null;
  error: string | null;
  playerId: string;
  connected: boolean;
  startGame: () => void;
  pickItem: (itemId: string | null) => void;
  pickLuckCard: (cardId: string) => void;
  playAgain: () => void;
  leaveRoom: () => void;
  clearError: () => void;
}

export function useGame(code: string, nickname: string): GameApi {
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [offer, setOffer] = useState<DraftOffer | null>(null);
  const [luckOffer, setLuckOffer] = useState<LuckOffer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const playerIdRef = useRef<string>("");

  if (!playerIdRef.current && typeof window !== "undefined") {
    playerIdRef.current = getPlayerId();
  }

  useEffect(() => {
    if (!nickname) return;
    const socket = getSocket();

    const onState = (state: RoomSnapshot) => {
      setSnapshot(state);
      if (state.phase !== "draft") setOffer(null);
      if (state.phase !== "luck") setLuckOffer(null);
    };
    const onOffer = (o: DraftOffer) => setOffer(o);
    const onLuck = (o: LuckOffer) => setLuckOffer(o);
    const onError = (e: { message: string }) => setError(e.message);
    const onConnect = () => {
      setConnected(true);
      socket.emit("room:join", { code, nickname, playerId: playerIdRef.current });
    };
    const onDisconnect = () => setConnected(false);

    socket.on("room:state", onState);
    socket.on("draft:offer", onOffer);
    socket.on("luck:offer", onLuck);
    socket.on("game:error", onError);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    if (socket.connected) onConnect();

    return () => {
      socket.off("room:state", onState);
      socket.off("draft:offer", onOffer);
      socket.off("luck:offer", onLuck);
      socket.off("game:error", onError);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [code, nickname]);

  const startGame = useCallback(() => getSocket().emit("game:start"), []);
  const pickItem = useCallback((itemId: string | null) => getSocket().emit("draft:pick", { itemId }), []);
  const pickLuckCard = useCallback((cardId: string) => getSocket().emit("luck:pick", { cardId }), []);
  const playAgain = useCallback(() => getSocket().emit("game:again"), []);
  const leaveRoom = useCallback(() => getSocket().emit("room:leave"), []);
  const clearError = useCallback(() => setError(null), []);

  return {
    snapshot,
    offer,
    luckOffer,
    error,
    playerId: playerIdRef.current,
    connected,
    startGame,
    pickItem,
    pickLuckCard,
    playAgain,
    leaveRoom,
    clearError
  };
}
