"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { BattlePayload, TimelineEntry } from "@/lib/game/types";
import Fighter, { type Pose } from "./Fighter";
import { sfx } from "@/lib/sound";
import { useI18n } from "@/lib/i18n";

interface FloatingNumber {
  id: number;
  side: "a" | "b";
  value: string;
  kind: "dmg" | "heal";
}

function entryDuration(entry: TimelineEntry | undefined): number {
  return entry?.ms ?? 900;
}

function indexForElapsed(entries: TimelineEntry[], elapsed: number): number {
  let acc = 0;
  for (let i = 0; i < entries.length; i++) {
    acc += entryDuration(entries[i]);
    if (elapsed < acc) return i;
  }
  return Math.max(0, entries.length - 1);
}

function posesFor(entry: TimelineEntry | undefined): { a: Pose; b: Pose } {
  if (!entry) return { a: "idle", b: "idle" };
  if (entry.t === "windup") {
    return entry.actor === "a" ? { a: "windup", b: "idle" } : { a: "idle", b: "windup" };
  }
  if (entry.t === "attack") {
    return entry.actor === "a" ? { a: "attack", b: "hit" } : { a: "hit", b: "attack" };
  }
  if (entry.t === "miss") {
    return entry.actor === "a" ? { a: "attack", b: "idle" } : { a: "idle", b: "attack" };
  }
  if (entry.t === "dodge") {
    return entry.actor === "a" ? { a: "attack", b: "dodge" } : { a: "dodge", b: "attack" };
  }
  if (entry.t === "death") {
    return entry.actor === "a" ? { a: "dead", b: "idle" } : { a: "idle", b: "dead" };
  }
  if (entry.t === "victory") {
    return entry.actor === "a" ? { a: "victory", b: "dead" } : { a: "dead", b: "victory" };
  }
  return { a: "idle", b: "idle" };
}

function playSound(entry: TimelineEntry): void {
  if (entry.t === "windup") sfx.windup();
  else if (entry.t === "attack") {
    if (entry.crit) sfx.crit();
    else sfx.hit();
  } else if (entry.t === "miss" || entry.t === "dodge") sfx.miss();
  else if (entry.t === "event") sfx.event();
  else if (entry.t === "card") sfx.legendary();
  else if (entry.t === "victory") sfx.victory();
  else if (entry.t === "death") sfx.death();
  else if (entry.heal) sfx.heal();
}

export default function BattleStage({ battle }: { battle: BattlePayload }) {
  const { t, logLine } = useI18n();
  const [index, setIndex] = useState(() => indexForElapsed(battle.timeline, battle.elapsedMs ?? 0));
  const [floats, setFloats] = useState<FloatingNumber[]>([]);
  const [shake, setShake] = useState(0);
  const [zoom, setZoom] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const floatId = useRef(0);
  const entriesRef = useRef(battle.timeline);
  entriesRef.current = battle.timeline;

  const entries = battle.timeline;
  const visible = entries.slice(0, index + 1);
  const current = entries[Math.min(index, entries.length - 1)];
  const poses = posesFor(current);

  useEffect(() => {
    if (index >= entries.length - 1) return;
    const timer = setTimeout(() => setIndex((i) => i + 1), entryDuration(entries[index]));
    return () => clearTimeout(timer);
  }, [index, entries.length]);

  useEffect(() => {
    const entry = entriesRef.current[index];
    if (!entry) return;
    playSound(entry);
    if (entry.t === "attack") {
      if (entry.crit) {
        setShake((s) => s + 1);
        setZoom(true);
        setTimeout(() => setZoom(false), 600);
      }
    }
    if (entry.heal !== undefined && entry.heal > 0) {
      floatId.current++;
      setFloats((f) => [...f, { id: floatId.current, side: entry.actor === "a" ? "a" : "b", value: `+${entry.heal}`, kind: "heal" }]);
    }
    if (entry.t === "passive" && entry.dmg !== undefined) {
      floatId.current++;
      const side = entry.actor === "a" ? "b" : "a";
      setFloats((f) => [...f, { id: floatId.current, side, value: `-${entry.dmg}`, kind: "dmg" }]);
    }
    if (entry.t === "poison" && entry.dmg !== undefined) {
      floatId.current++;
      setFloats((f) => [...f, { id: floatId.current, side: entry.actor === "a" ? "a" : "b", value: `-${entry.dmg}`, kind: "dmg" }]);
    }
  }, [index]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [visible.length]);

  const hpA = current?.hpA ?? battle.a.maxHp;
  const hpB = current?.hpB ?? battle.b.maxHp;
  const showIntro = current?.t === "intro";
  const suspense = current?.t === "windup";

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 text-center">
        <span className="rounded-full bg-white/10 px-4 py-1 text-xs font-black uppercase tracking-widest text-amber-300">
          {battle.roundKey === "final"
            ? t("grandFinal")
            : battle.roundKey === "semifinal"
              ? t("semifinal")
              : t("round", { n: battle.roundNumber })}
        </span>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-3">
        <HpBar name={battle.a.nickname} hp={hpA} maxHp={battle.a.maxHp} align="left" />
        <HpBar name={battle.b.nickname} hp={hpB} maxHp={battle.b.maxHp} align="right" />
      </div>

      <motion.div
        key={shake}
        animate={shake > 0 ? { x: [0, -12, 12, -8, 8, 0] } : {}}
        transition={{ duration: 0.45 }}
        className="relative flex-1 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-indigo-950/60 to-slate-900/80"
      >
        <div className="absolute inset-x-0 bottom-10 h-px bg-white/20" />
        <div className="absolute inset-x-8 bottom-0 top-auto h-10 rounded-t-[50%] bg-white/5" />

        <motion.div
          animate={{ scale: zoom ? 1.1 : suspense ? 1.04 : 1 }}
          transition={{ duration: suspense ? 1.1 : 0.4 }}
          className="flex h-full items-end justify-between px-4 pb-12 sm:px-12"
        >
          <div className="relative">
            <Fighter fighter={battle.a} facing="right" pose={poses.a} />
            <FloatLayer floats={floats.filter((f) => f.side === "a")} />
          </div>
          <div className="relative">
            <Fighter fighter={battle.b} facing="left" pose={poses.b} />
            <FloatLayer floats={floats.filter((f) => f.side === "b")} />
          </div>
        </motion.div>

        <AnimatePresence>
          {suspense && (
            <motion.div
              key={`dim-${index}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-0 bg-slate-950/45"
            />
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {current && current.t === "windup" && (
            <motion.div
              key={`windup-${index}`}
              initial={{ opacity: 0, y: 24, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="absolute inset-x-4 top-1/3 z-20 -translate-y-1/2 text-center"
            >
              <div className="mx-auto max-w-sm rounded-2xl bg-slate-950/80 px-5 py-4 text-lg font-bold italic text-amber-200 shadow-2xl backdrop-blur-sm">
                {logLine(current)}
                <motion.span
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="ml-1"
                >
                  ●●●
                </motion.span>
              </div>
            </motion.div>
          )}

          {current && current.t === "attack" && (
            <motion.div
              key={`hit-${index}`}
              initial={{ opacity: 0, scale: 2.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ type: "spring", damping: 14, stiffness: 300 }}
              className="pointer-events-none absolute inset-x-0 top-[30%] z-20 text-center"
            >
              {current.crit && (
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ repeat: Infinity, duration: 0.5 }}
                  className="font-display mb-1 text-3xl font-black tracking-wider text-orange-400 drop-shadow-[0_0_18px_rgba(251,146,60,0.8)]"
                >
                  💥 {t("bigCrit")}
                </motion.div>
              )}
              <div
                className={`font-display font-black drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)] ${
                  current.crit ? "text-8xl text-orange-300" : "text-7xl text-rose-400"
                }`}
              >
                -{current.dmg ?? 0}
              </div>
              <div className="mt-1 text-xs font-black uppercase tracking-[0.3em] text-slate-300">{t("bigDamage")}</div>
            </motion.div>
          )}

          {current && current.t === "miss" && (
            <motion.div
              key={`miss-${index}`}
              initial={{ opacity: 0, scale: 2.2, rotate: -8 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", damping: 12 }}
              className="pointer-events-none absolute inset-x-0 top-[34%] z-20 text-center"
            >
              <div className="font-display text-6xl font-black text-slate-300 drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]">
                💨 {t("bigMiss")}
              </div>
            </motion.div>
          )}

          {current && current.t === "dodge" && (
            <motion.div
              key={`dodge-${index}`}
              initial={{ opacity: 0, scale: 2.2, rotate: 8 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", damping: 12 }}
              className="pointer-events-none absolute inset-x-0 top-[34%] z-20 text-center"
            >
              <div className="font-display text-6xl font-black text-cyan-300 drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]">
                🌀 {t("bigDodge")}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showIntro && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/80"
            >
              <motion.div initial={{ x: -120, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="font-display text-3xl font-black text-indigo-300">
                {battle.a.nickname}
              </motion.div>
              <motion.div
                initial={{ scale: 3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 12 }}
                className="font-display my-2 text-5xl font-black text-amber-400"
              >
                VS
              </motion.div>
              <motion.div initial={{ x: 120, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="font-display text-3xl font-black text-fuchsia-300">
                {battle.b.nickname}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {current && (current.t === "event" || current.t === "card") && (
            <motion.div
              key={`banner-${index}`}
              initial={{ y: -60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              className="absolute inset-x-3 top-3 z-10 rounded-2xl border border-amber-400/40 bg-slate-950/90 p-3 text-center text-sm font-bold text-amber-200 shadow-xl"
            >
              {logLine(current)}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>{current && current.t === "victory" && <Confetti />}</AnimatePresence>
      </motion.div>

      <div
        ref={logRef}
        className="mt-3 h-32 shrink-0 space-y-1 overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-[13px] leading-snug"
      >
        {visible.map((entry, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className={
              entry.t === "victory"
                ? "font-black text-amber-300"
                : entry.t === "death"
                  ? "font-bold text-rose-400"
                  : entry.t === "windup"
                    ? "italic text-slate-400"
                    : entry.crit
                      ? "font-bold text-orange-300"
                      : entry.t === "card" || entry.t === "event"
                        ? "text-amber-200"
                        : "text-slate-300"
            }
          >
            {logLine(entry)}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function HpBar({ name, hp, maxHp, align }: { name: string; hp: number; maxHp: number; align: "left" | "right" }) {
  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  return (
    <div className={align === "right" ? "text-right" : ""}>
      <div className="mb-1 truncate text-sm font-bold">{name}</div>
      <div className={`h-3 w-full overflow-hidden rounded-full bg-white/10 ${align === "right" ? "scale-x-[-1]" : ""}`}>
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.35 }}
          className={`h-full rounded-full ${pct > 50 ? "bg-emerald-400" : pct > 25 ? "bg-amber-400" : "bg-rose-500"}`}
        />
      </div>
      <div className="mt-0.5 text-[11px] font-semibold tabular-nums text-slate-400">
        {Math.max(0, hp)} / {maxHp}
      </div>
    </div>
  );
}

function FloatLayer({ floats }: { floats: FloatingNumber[] }) {
  return (
    <div className="pointer-events-none absolute -top-6 left-1/2 z-20 -translate-x-1/2">
      <AnimatePresence>
        {floats.slice(-3).map((f) => (
          <motion.div
            key={f.id}
            initial={{ y: 0, opacity: 1 }}
            animate={{ y: -55, opacity: 0 }}
            transition={{ duration: 1.1 }}
            className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap font-display text-2xl font-black ${
              f.kind === "heal" ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {f.value}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 26 }, (_, i) => i);
  const colors = ["#fbbf24", "#f472b6", "#34d399", "#60a5fa", "#a78bfa"];
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {pieces.map((i) => (
        <motion.div
          key={i}
          initial={{ y: -20, x: `${(i * 137) % 100}%`, rotate: 0, opacity: 1 }}
          animate={{ y: "110%", rotate: 360 + i * 40, opacity: [1, 1, 0.6] }}
          transition={{ duration: 1.8 + (i % 5) * 0.3, ease: "easeIn" }}
          className="absolute h-2.5 w-2.5 rounded-sm"
          style={{ backgroundColor: colors[i % colors.length] }}
        />
      ))}
    </div>
  );
}
