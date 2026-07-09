"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getNickname, getPlayerId, setNickname as storeNickname } from "@/lib/session";
import { LangToggle, useI18n } from "@/lib/i18n";

export default function HomePage() {
  const router = useRouter();
  const { t } = useI18n();
  const [nickname, setNickname] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setNickname(getNickname());
  }, []);

  const validate = (): boolean => {
    if (nickname.trim().length < 2) {
      setError(t("nickTooShort"));
      return false;
    }
    storeNickname(nickname.trim());
    return true;
  };

  const createRoom = async () => {
    if (!validate()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: nickname.trim(), playerId: getPlayerId() })
      });
      const data = (await res.json()) as { code?: string; error?: string };
      if (data.code) {
        router.push(`/room/${data.code}`);
        return;
      }
      setError(t(data.error ?? "genericError"));
      setBusy(false);
    } catch {
      setError(t("serverUnreachable"));
      setBusy(false);
    }
  };

  const joinRoom = () => {
    if (!validate()) return;
    if (code.trim().length !== 6) {
      setError(t("codeLength"));
      return;
    }
    router.push(`/room/${code.trim().toUpperCase()}`);
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-8 px-6 py-12">
      <div className="absolute right-4 top-4">
        <LangToggle />
      </div>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="text-6xl">⚔️</div>
        <h1 className="font-display mt-4 text-5xl font-black tracking-tight">
          Battle <span className="bg-gradient-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">Draft</span>
        </h1>
        <p className="mt-3 text-sm text-slate-400">{t("tagline")}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card-surface w-full space-y-5 p-6"
      >
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t("yourNickname")}
          </label>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={16}
            placeholder={t("nickPlaceholder")}
            className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-lg font-semibold placeholder:text-slate-600 focus:border-indigo-400"
          />
        </div>

        <button onClick={() => void createRoom()} disabled={busy} className="btn-primary w-full text-lg">
          {busy ? t("creating") : t("createRoom")}
        </button>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <div className="h-px flex-1 bg-white/10" />
          {t("orJoin")}
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            placeholder={t("roomCodePlaceholder")}
            className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-center text-lg font-bold uppercase tracking-[0.3em] placeholder:tracking-normal placeholder:text-slate-600 focus:border-fuchsia-400"
          />
          <button onClick={joinRoom} className="btn-ghost whitespace-nowrap">
            {t("join")}
          </button>
        </div>

        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-sm font-medium text-rose-400">
            {error}
          </motion.p>
        )}
      </motion.div>

      <p className="text-center text-xs text-slate-500">{t("footer")}</p>
    </main>
  );
}
