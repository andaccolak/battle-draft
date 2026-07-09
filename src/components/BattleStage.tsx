"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { BattlePayload, TimelineEntry } from "@/lib/game/types";
import Fighter, { type Pose } from "./Fighter";
import { sfx } from "@/lib/sound";

interface FloatingNumber {
  id: number;
  side: "a" | "b";
  value: string;
  kind: "dmg" | "heal" | "crit";
}

function posesFor(entry: TimelineEntry | undefined): { a: Pose; b: Pose } {
  if (!entry) return { a: "idle", b: "idle" };
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
  if (entry.t === "attack") {
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
  const [index, setIndex] = useState(0);
  const [floats, setFloats] = useState<FloatingNumber[]>([]);
  const [shake, setShake] = useState(0);
  const [zoom, setZoom] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const floatId = useRef(0);

  const entries = battle.timeline;
  const visible = entries.slice(0, index + 1);
  const current = entries[Math.min(index, entries.length - 1)];
  const poses = posesFor(current);

  useEffect(() => {
    setIndex(0);
    setFloats([]);
  }, [battle]);

  useEffect(() => {
    if (index >= entries.length - 1) return;
    const timer = setTimeout(() => setIndex((i) => i + 1), battle.stepMs);
    return () => clearTimeout(timer);
  }, [index, entries.length, battle.stepMs]);

  useEffect(() => {
    const entry = entries[index];
    if (!entry) return;
    playSound(entry);
    if (entry.t === "attack" && entry.dmg !== undefined) {
      const side = entry.actor === "a" ? "b" : "a";
      floatId.current++;
      setFloats((f) => [...f, { id: floatId.current, side, value: `-${entry.dmg}`, kind: entry.crit ? "crit" : "dmg" }]);
      if (entry.crit) {
        setShake((s) => s + 1);
        setZoom(true);
        setTimeout(() => setZoom(false), 500);
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
  }, [index, entries]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [visible.length]);

  const hpA = current?.hpA ?? battle.a.maxHp;
  const hpB = current?.hpB ?? battle.b.maxHp;
  const showIntro = index === 0;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 text-center">
        <span className="rounded-full bg-white/10 px-4 py-1 text-xs font-black uppercase tracking-widest text-amber-300">
          {battle.roundLabel}
        </span>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-3">
        <HpBar name={battle.a.nickname} hp={hpA} maxHp={battle.a.maxHp} align="left" />
        <HpBar name={battle.b.nickname} hp={hpB} maxHp={battle.b.maxHp} align="right" />
      </div>

      <motion.div
        key={shake}
        animate={shake > 0 ? { x: [0, -10, 10, -6, 6, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="relative flex-1 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-indigo-950/60 to-slate-900/80"
      >
        <div className="absolute inset-x-0 bottom-10 h-px bg-white/20" />
        <div className="absolute inset-x-8 bottom-0 top-auto h-10 rounded-t-[50%] bg-white/5" />

        <motion.div
          animate={{ scale: zoom ? 1.08 : 1 }}
          transition={{ duration: 0.4 }}
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
              key={index}
              initial={{ y: -60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              className="absolute inset-x-3 top-3 z-10 rounded-2xl border border-amber-400/40 bg-slate-950/90 p-3 text-center text-sm font-bold text-amber-200 shadow-xl"
            >
              {current.text}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {current && current.t === "victory" && (
            <Confetti />
          )}
        </AnimatePresence>
      </motion.div>

      <div
        ref={logRef}
        className="mt-3 h-36 shrink-0 space-y-1 overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-[13px] leading-snug"
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
                  : entry.crit
                    ? "font-bold text-orange-300"
                    : entry.t === "card" || entry.t === "event"
                      ? "text-amber-200"
                      : "text-slate-300"
            }
          >
            {entry.text}
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
            initial={{ y: 0, opacity: 1, scale: f.kind === "crit" ? 1.6 : 1 }}
            animate={{ y: -55, opacity: 0 }}
            transition={{ duration: 1.1 }}
            className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap font-display text-2xl font-black ${
              f.kind === "crit" ? "text-orange-400" : f.kind === "heal" ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {f.kind === "crit" ? `💥${f.value}` : f.value}
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
