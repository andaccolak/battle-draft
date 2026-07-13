"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { GameEvent, PublicPlayer } from "@/lib/game/types";
import { EVENT_REVEAL_MS } from "@/lib/game/types";
import { EVENTS } from "@/lib/game/events";
import { sfx } from "@/lib/sound";
import { useI18n } from "@/lib/i18n";
import { BUILD_STAT_KEYS } from "@/lib/game/buildStats";
import { combatProfile } from "@/lib/game/combatProfile";
import BuildStatsPanel from "./BuildStatsPanel";

const TILE_WIDTH = 96;
const TILE_GAP = 8;
const TILE_STEP = TILE_WIDTH + TILE_GAP;
const STOP_INDEX = 21;
const REEL_LENGTH = 25;
const SPIN_MS = 4800;

function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index++) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function reelEvents(selected: GameEvent, seed: string): GameEvent[] {
  let state = hash(seed);
  const reel = Array.from({ length: REEL_LENGTH }, () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const candidate = EVENTS[state % EVENTS.length];
    return candidate ?? EVENTS[0] ?? selected;
  });
  reel[STOP_INDEX] = selected;
  return reel;
}

interface Props {
  event: GameEvent;
  player?: PublicPlayer;
  seed: string;
  deadline: number | null;
  serverNow: number;
}

export default function EventReveal({ event, player, seed, deadline, serverNow }: Props) {
  const { t, eventText } = useI18n();
  const reducedMotion = useReducedMotion();
  const spinStartedAt = (deadline ?? serverNow + EVENT_REVEAL_MS) - EVENT_REVEAL_MS;
  const elapsedAtMount = Math.max(0, serverNow - spinStartedAt);
  const spinProgress = Math.min(1, elapsedAtMount / SPIN_MS);
  const [settled, setSettled] = useState(!!reducedMotion || spinProgress >= 1);
  const localized = eventText(event.id);
  const eventDef = EVENTS.find((candidate) => candidate.id === event.id);
  const selectedEvent = eventDef ?? event;
  const reel = useMemo(() => reelEvents(selectedEvent, seed), [selectedEvent.id, seed]);
  const preEventProfile = useMemo(
    () => combatProfile(player?.equipment ?? {}, player?.luckCard, null),
    [player?.equipment, player?.luckCard]
  );
  const preEventStats = preEventProfile.stats;
  const eventProfile = useMemo(
    () => combatProfile(player?.equipment ?? {}, player?.luckCard, eventDef),
    [eventDef, player?.equipment, player?.luckCard]
  );
  const eventStats = eventProfile.stats;
  const highlightedStats = useMemo(
    () => BUILD_STAT_KEYS.filter((key) => eventStats[key] !== preEventStats[key]),
    [eventStats, preEventStats]
  );

  useEffect(() => {
    const elapsed = Math.max(0, serverNow - spinStartedAt);
    const remaining = Math.max(0, SPIN_MS - elapsed);
    setSettled(!!reducedMotion || remaining === 0);
    if (reducedMotion || remaining === 0) {
      sfx.environment(event.id);
      return;
    }
    sfx.reelSpin(remaining);
    const timer = setTimeout(() => {
      setSettled(true);
      sfx.reelStop();
      sfx.environment(event.id);
    }, remaining);
    return () => clearTimeout(timer);
  }, [event.id, reducedMotion, spinStartedAt]);

  const startIndex = 2 + (STOP_INDEX - 2) * spinProgress;
  const startX = -(TILE_WIDTH / 2 + TILE_STEP * startIndex);
  const stopX = -(TILE_WIDTH / 2 + TILE_STEP * STOP_INDEX);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 pb-5 text-center">
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm font-bold uppercase tracking-[0.3em] text-slate-400">
        {t("globalEvent")}
      </motion.p>

      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70 py-4 shadow-[0_18px_60px_rgba(0,0,0,0.45)]">
        <div className="pointer-events-none absolute inset-y-0 left-1/2 z-20 w-px -translate-x-1/2 bg-amber-300 shadow-[0_0_14px_rgba(252,211,77,0.9)]" />
        <div className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 border-x-[7px] border-t-[9px] border-x-transparent border-t-amber-300" />
        <div className="pointer-events-none absolute bottom-0 left-1/2 z-20 -translate-x-1/2 border-x-[7px] border-b-[9px] border-x-transparent border-b-amber-300" />
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-14 bg-gradient-to-r from-slate-950 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-14 bg-gradient-to-l from-slate-950 to-transparent" />
        <motion.div
          initial={{ x: reducedMotion ? stopX : startX }}
          animate={{ x: stopX }}
          transition={reducedMotion || spinProgress >= 1 ? { duration: 0 } : { duration: (SPIN_MS * (1 - spinProgress)) / 1000, ease: [0.08, 0.72, 0.08, 1] }}
          className="relative flex"
          style={{ left: "50%", gap: TILE_GAP, width: "max-content" }}
        >
          {reel.map((candidate, index) => {
            const winner = index === STOP_INDEX;
            return (
              <motion.div
                key={`${candidate.id}-${index}`}
                animate={winner && settled ? { scale: [1, 1.12, 1.04], borderColor: ["rgba(255,255,255,0.1)", "rgba(252,211,77,0.9)", "rgba(252,211,77,0.55)"] } : undefined}
                className={`flex shrink-0 flex-col items-center justify-center gap-1 rounded-xl border bg-white/[0.045] px-1.5 py-3 ${winner && settled ? "border-amber-300/60 bg-amber-400/10" : "border-white/10"}`}
                style={{ width: TILE_WIDTH }}
              >
                <span className="text-3xl">{candidate.emoji}</span>
                <span className="line-clamp-2 text-[9px] font-black leading-tight text-slate-300">{eventText(candidate.id).name}</span>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      <motion.div animate={settled ? { opacity: 1, y: 0 } : { opacity: 0.6, y: 6 }} className="space-y-2">
        <div className={`text-[10px] font-black uppercase tracking-[0.22em] ${settled ? "text-amber-300" : "text-slate-500"}`}>
          {settled ? t("eventLocked") : t("eventRolling")}
        </div>
        <motion.div animate={settled ? { scale: [0.85, 1.08, 1] } : { scale: 0.85 }} className="text-6xl">
          {settled ? event.emoji : "❔"}
        </motion.div>
        <h2 className="font-display text-4xl font-black">{settled ? localized.name : "···"}</h2>
        {settled && <p className="mx-auto max-w-sm text-base text-slate-300">{localized.description}</p>}
      </motion.div>

      {player && settled && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <BuildStatsPanel
            stats={eventStats}
            baseline={preEventStats}
            modifierLabel={t("eventShort")}
            highlighted={highlightedStats}
            accent="amber"
            profile={eventProfile}
            baselineProfile={preEventProfile}
          />
        </motion.div>
      )}

      <motion.p animate={{ opacity: settled ? [0.45, 1, 0.45] : 0 }} transition={{ duration: 1.4, repeat: Infinity }} className="text-sm font-bold text-amber-300">
        {t("tournamentBegins")}
      </motion.p>
    </div>
  );
}
