"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getNickname, getPlayerId, getSocket, setNickname as storeNickname } from "@/lib/socket";

export default function HomePage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setNickname(getNickname());
  }, []);

  const validate = (): boolean => {
    if (nickname.trim().length < 2) {
      setError("Nickname must be at least 2 characters.");
      return false;
    }
    storeNickname(nickname.trim());
    return true;
  };

  const createRoom = () => {
    if (!validate()) return;
    setBusy(true);
    setError(null);
    const socket = getSocket();
    socket.once("room:joined", ({ code: roomCode }: { code: string }) => {
      router.push(`/room/${roomCode}`);
    });
    socket.once("game:error", ({ message }: { message: string }) => {
      setError(message);
      setBusy(false);
    });
    const emit = () => socket.emit("room:create", { nickname: nickname.trim(), playerId: getPlayerId() });
    if (socket.connected) emit();
    else socket.once("connect", emit);
  };

  const joinRoom = () => {
    if (!validate()) return;
    if (code.trim().length !== 6) {
      setError("Room codes are 6 characters.");
      return;
    }
    router.push(`/room/${code.trim().toUpperCase()}`);
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-8 px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="text-6xl">⚔️</div>
        <h1 className="font-display mt-4 text-5xl font-black tracking-tight">
          Battle <span className="bg-gradient-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">Draft</span>
        </h1>
        <p className="mt-3 text-sm text-slate-400">
          Draft chaotic gear. Gamble on luck. Watch your friends fall.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card-surface w-full space-y-5 p-6"
      >
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Your nickname
          </label>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={16}
            placeholder="e.g. AxeLord"
            className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-lg font-semibold placeholder:text-slate-600 focus:border-indigo-400"
          />
        </div>

        <button onClick={createRoom} disabled={busy} className="btn-primary w-full text-lg">
          {busy ? "Creating..." : "🎮 Create Room"}
        </button>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <div className="h-px flex-1 bg-white/10" />
          or join a friend
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            placeholder="ROOM CODE"
            className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-center text-lg font-bold uppercase tracking-[0.3em] placeholder:tracking-normal placeholder:text-slate-600 focus:border-fuchsia-400"
          />
          <button onClick={joinRoom} className="btn-ghost whitespace-nowrap">
            Join
          </button>
        </div>

        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-sm font-medium text-rose-400">
            {error}
          </motion.p>
        )}
      </motion.div>

      <p className="text-center text-xs text-slate-500">
        2–8 players · everyone on their own phone · loudest room wins
      </p>
    </main>
  );
}
