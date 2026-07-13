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
import LeagueTable from "@/components/LeagueTable";
import { LangToggle, useI18n } from "@/lib/i18n";
import { isMuted, setMuted } from "@/lib/sound";

function MuteToggle() {
  const [muted, setMutedState] = useState(false);
  useEffect(() => {
    setMutedState(isMuted());
  }, []);
  return (
    <button
      onClick={() => {
        const next = !muted;
        setMuted(next);
        setMutedState(next);
      }}
      className="rounded-lg px-1.5 py-1 text-lg leading-none transition hover:bg-white/10"
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}

export default function RoomPage() {
  const { t } = useI18n();
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = (params?.code ?? "").toUpperCase();
  const [nickname, setNickname] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = getNickname() || "";
    setDraft(stored);
    if (stored && sessionStorage.getItem("bd_nick_ok") === code) {
      sessionStorage.removeItem("bd_nick_ok");
      setNickname(stored);
    }
    setReady(true);
  }, [code]);

  if (!ready) {
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

  const kicked = !!snapshot && snapshot.players.length > 0 && !snapshot.players.some((p) => p.id === game.playerId);
  useEffect(() => {
    if (!kicked) return;
    const timer = setTimeout(onExit, 2000);
    return () => clearTimeout(timer);
  }, [kicked, onExit]);

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

  if (kicked) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="text-4xl">🚪</div>
        <p className="font-semibold text-rose-300">{t("removedFromRoom")}</p>
        <p className="text-sm text-slate-500">{t("headingHome")}</p>
      </main>
    );
  }
  const inBattle = snapshot.phase === "battle" && !!snapshot.battle;
  const currentPlayer = snapshot.players.find((player) => player.id === game.playerId);
  return (
    <main className={`mx-auto max-w-2xl px-4 ${inBattle ? "min-h-dvh overflow-visible pb-12 pt-3" : "min-h-dvh py-5"}`}>
      <header className={`${inBattle ? "mb-3" : "mb-5"} flex items-center justify-between`}>
        <button onClick={() => { game.leaveRoom(); onExit(); }} className="text-sm font-semibold text-slate-500 transition hover:text-slate-300">
          {t("leave")}
        </button>
        <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
          {t("room")} <span className="text-indigo-300">{snapshot.code}</span>
        </div>
        <div className="flex items-center gap-2">
          <MuteToggle />
          <LangToggle />
          <div className={`h-2 w-2 rounded-full ${game.connected ? "bg-emerald-400" : "bg-rose-500"}`} />
        </div>
      </header>

      <AnimatePresence>
        {snapshot.shout && snapshot.hostId === game.playerId && (
          <motion.div
            key={`shout-${snapshot.shout.at}`}
            initial={{ opacity: 0, y: -14, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className="mb-4 rounded-xl border border-amber-400/50 bg-amber-500/15 px-4 py-2.5 text-center text-sm font-bold text-amber-200"
          >
            {snapshot.phase === "lobby" ? t("shoutStartToast", { p: snapshot.shout.by }) : t("shoutToast", { p: snapshot.shout.by })}
          </motion.div>
        )}
      </AnimatePresence>

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
          initial={{ opacity: 0, y: 18, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 1.01 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
          {snapshot.phase === "lobby" && (
            <Lobby snapshot={snapshot} playerId={game.playerId} onStart={game.startGame} onAvatar={game.chooseAvatar} onMap={game.chooseMap} onMode={game.chooseMode} onTourney={game.chooseTourney} onRename={game.rename} onKick={game.kick} onShout={game.shout} />
          )}
          {snapshot.phase === "draft" && (
            <DraftPhase snapshot={snapshot} offer={game.offer} playerId={game.playerId} onPick={game.pickItem} />
          )}
          {snapshot.phase === "luck" && <LuckPhase snapshot={snapshot} luckOffer={game.luckOffer} playerId={game.playerId} onPick={game.pickLuckCard} />}
          {snapshot.phase === "event" && snapshot.event && (
            <EventReveal
              event={snapshot.event}
              player={currentPlayer}
              seed={`${snapshot.code}:${snapshot.event.id}`}
              deadline={snapshot.deadline}
              serverNow={snapshot.serverNow}
            />
          )}
          {snapshot.phase === "battle" &&
            (snapshot.battle ? (
              <div>
                <BattleStage
                  battle={snapshot.battle}
                  eventId={snapshot.event?.id}
                  arenaMap={snapshot.arenaMap}
                  playerId={game.playerId}
                  spectators={snapshot.players
                    .filter((p) => p.nickname !== snapshot.battle?.a.nickname && p.nickname !== snapshot.battle?.b.nickname)
                    .map((p) => ({ nickname: p.nickname, eliminated: p.eliminated, avatar: p.avatar }))}
                  results={(snapshot.bracket ?? [])
                    .flatMap((r) => r.matches)
                    .filter((m): m is { a: string; b: string; winner: string } => !!m.winner && !!m.a && !!m.b)
                    .map((m) => ({ a: m.a, b: m.b, winner: m.winner }))}
                  onReact={game.reactBattle}
                />
              </div>
            ) : (
              <div className="space-y-4">
                {snapshot.tourneyMode === "league" && <LeagueTable rows={snapshot.leagueTable} stage={snapshot.leagueStage} updated />}
                {snapshot.bracket && <Bracket rounds={snapshot.bracket} players={snapshot.players} />}
              </div>
            ))}
          {snapshot.phase === "champion" && <Champion snapshot={snapshot} playerId={game.playerId} onPlayAgain={game.playAgain} onShout={game.shout} />}
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
