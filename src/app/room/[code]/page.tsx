"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useGame } from "@/hooks/useGame";
import { getNickname, setNickname as storeNickname } from "@/lib/session";
import Lobby from "@/components/Lobby";
import DraftPhase from "@/components/DraftPhase";
import LuckPhase from "@/components/LuckPhase";
import EventReveal from "@/components/EventReveal";
import BattleStage from "@/components/BattleStage";
import Bracket from "@/components/Bracket";
import Champion from "@/components/Champion";
import { LangToggle, useI18n } from "@/lib/i18n";

export default function RoomPage() {
  const { t } = useI18n();
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = (params?.code ?? "").toUpperCase();
  const [nickname, setNickname] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setNickname(getNickname() || "");
  }, []);

  if (nickname === null) {
    return <main className="flex min-h-dvh items-center justify-center text-slate-500">{t("loading")}</main>;
  }

  if (!nickname) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-6">
        <h1 className="font-display text-3xl font-black">
          {t("joining")} <span className="text-indigo-300">{code}</span>
        </h1>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={16}
          placeholder={t("yourNickname")}
          className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-center text-lg font-semibold placeholder:text-slate-600 focus:border-indigo-400"
        />
        <button
          onClick={() => {
            if (draft.trim().length >= 2) {
              storeNickname(draft.trim());
              setNickname(draft.trim());
            }
          }}
          className="btn-primary w-full"
        >
          {t("enterArena")}
        </button>
      </main>
    );
  }

  return <Game code={code} nickname={nickname} onExit={() => router.push("/")} />;
}

function Game({ code, nickname, onExit }: { code: string; nickname: string; onExit: () => void }) {
  const { t } = useI18n();
  const game = useGame(code, nickname);
  const { snapshot, error } = game;

  useEffect(() => {
    if (error && !snapshot) {
      const t = setTimeout(onExit, 2500);
      return () => clearTimeout(t);
    }
  }, [error, snapshot, onExit]);

  if (!snapshot) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        {error ? (
          <>
            <div className="text-4xl">😵</div>
            <p className="font-semibold text-rose-400">{t(error)}</p>
            <p className="text-sm text-slate-500">{t("headingHome")}</p>
          </>
        ) : (
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }} className="text-4xl">
            ⚔️
          </motion.div>
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-4 py-5">
      <header className="mb-5 flex items-center justify-between">
        <button onClick={() => { game.leaveRoom(); onExit(); }} className="text-sm font-semibold text-slate-500 transition hover:text-slate-300">
          {t("leave")}
        </button>
        <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
          {t("room")} <span className="text-indigo-300">{snapshot.code}</span>
        </div>
        <div className="flex items-center gap-2">
          <LangToggle />
          <div className={`h-2 w-2 rounded-full ${game.connected ? "bg-emerald-400" : "bg-rose-500"}`} />
        </div>
      </header>

      <AnimatePresence>
        {error && snapshot && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            onAnimationComplete={() => setTimeout(game.clearError, 2500)}
            className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-center text-sm font-semibold text-rose-300"
          >
            {t(error)}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.div
          key={snapshot.phase === "battle" && snapshot.battle ? `battle-${snapshot.battle.roundIndex}-${snapshot.battle.matchIndex}` : snapshot.phase}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {snapshot.phase === "lobby" && (
            <Lobby snapshot={snapshot} playerId={game.playerId} onStart={game.startGame} onAvatar={game.chooseAvatar} />
          )}
          {snapshot.phase === "draft" && (
            <DraftPhase snapshot={snapshot} offer={game.offer} playerId={game.playerId} onPick={game.pickItem} />
          )}
          {snapshot.phase === "luck" && <LuckPhase snapshot={snapshot} luckOffer={game.luckOffer} onPick={game.pickLuckCard} />}
          {snapshot.phase === "event" && snapshot.event && <EventReveal event={snapshot.event} />}
          {snapshot.phase === "battle" &&
            (snapshot.battle ? (
              <div className="h-[calc(100dvh-8rem)] min-h-[540px]">
                <BattleStage battle={snapshot.battle} eventId={snapshot.event?.id} playerId={game.playerId} onReact={game.reactBattle} />
              </div>
            ) : (
              snapshot.bracket && <Bracket rounds={snapshot.bracket} players={snapshot.players} />
            ))}
          {snapshot.phase === "champion" && <Champion snapshot={snapshot} playerId={game.playerId} onPlayAgain={game.playAgain} />}
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
