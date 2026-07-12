"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import type { BattlePayload, FighterView, Rarity, TimelineEntry } from "@/lib/game/types";
import { SLOTS } from "@/lib/game/types";
import { type Pose } from "./Fighter";
import AvatarPortrait from "./AvatarPortrait";
import { sfx } from "@/lib/sound";
import { useI18n } from "@/lib/i18n";

const Arena3D = dynamic(() => import("./Arena3D"), { ssr: false });

interface FloatingNumber {
  id: number;
  side: "a" | "b";
  value: string;
  kind: "dmg" | "heal" | "note" | "crit";
}

type FxKind = "rain" | "storm" | "snow" | "fog" | "sun" | "night" | "bloodmoon" | "poison" | "wind" | "quake" | "overcast" | "none";

interface ArenaTheme {
  sky: string;
  floor: string;
  grid: string;
  celestial: "sun" | "moon" | "redmoon" | null;
}

const EVENT_FX: Record<string, FxKind> = {
  rain: "rain",
  thunderstorm: "storm",
  blizzard: "snow",
  fog: "fog",
  iron_sky: "overcast",
  midnight_sun: "sun",
  heatwave: "sun",
  harvest: "sun",
  blood_moon: "bloodmoon",
  vampire_night: "bloodmoon",
  eclipse: "night",
  full_moon: "night",
  poison_mist: "poison",
  plague: "poison",
  tornado: "wind",
  storm_blades: "wind",
  chaos_rift: "wind",
  earthquake: "quake",
  gravity: "quake"
};

const THEMES: Record<FxKind, ArenaTheme> = {
  none: { sky: "linear-gradient(180deg,#1e1b4b,#0f172a)", floor: "#312e81", grid: "rgba(255,255,255,0.09)", celestial: null },
  rain: { sky: "linear-gradient(180deg,#0c1929,#1e3a5f)", floor: "#1e3a5f", grid: "rgba(147,197,253,0.14)", celestial: null },
  storm: { sky: "linear-gradient(180deg,#0b1220,#312e81)", floor: "#1e1b4b", grid: "rgba(196,181,253,0.16)", celestial: null },
  snow: { sky: "linear-gradient(180deg,#334155,#64748b)", floor: "#7d8ba1", grid: "rgba(255,255,255,0.28)", celestial: null },
  fog: { sky: "linear-gradient(180deg,#2b3646,#475569)", floor: "#475569", grid: "rgba(255,255,255,0.1)", celestial: null },
  sun: { sky: "linear-gradient(180deg,#7c2d12,#d97706)", floor: "#b45309", grid: "rgba(255,241,118,0.2)", celestial: "sun" },
  night: { sky: "linear-gradient(180deg,#020617,#1e293b)", floor: "#1e293b", grid: "rgba(148,163,184,0.14)", celestial: "moon" },
  bloodmoon: { sky: "linear-gradient(180deg,#1c0a0a,#450a0a)", floor: "#4a0d0d", grid: "rgba(248,113,113,0.17)", celestial: "redmoon" },
  poison: { sky: "linear-gradient(180deg,#052e16,#14532d)", floor: "#14532d", grid: "rgba(74,222,128,0.16)", celestial: null },
  wind: { sky: "linear-gradient(180deg,#164e63,#0e7490)", floor: "#155e75", grid: "rgba(103,232,249,0.16)", celestial: null },
  quake: { sky: "linear-gradient(180deg,#292524,#57534e)", floor: "#44403c", grid: "rgba(214,211,209,0.14)", celestial: null },
  overcast: { sky: "linear-gradient(180deg,#1f2937,#4b5563)", floor: "#374151", grid: "rgba(209,213,219,0.11)", celestial: null }
};

const RARITY_CHIP: Record<Rarity, string> = {
  common: "border-gray-500/60 bg-gray-500/10 text-gray-200",
  uncommon: "border-green-400/60 bg-green-500/10 text-green-200",
  rare: "border-blue-400/60 bg-blue-500/10 text-blue-200",
  epic: "border-purple-400/60 bg-purple-500/10 text-purple-200",
  legendary: "border-orange-400/80 bg-orange-500/10 text-orange-200"
};

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
    return entry.actor === "a" ? { a: "windup", b: "guard" } : { a: "guard", b: "windup" };
  }
  if (entry.t === "attack") {
    const defenderHp = entry.actor === "a" ? entry.hpB : entry.hpA;
    const dmg = entry.dmg ?? 0;
    const bigHit = defenderHp > 0 && dmg >= 0.6 * (defenderHp + dmg);
    const reaction: Pose = entry.blocked ? "block" : entry.crit || bigHit ? "knockdown" : "hit";
    return entry.actor === "a" ? { a: "attack", b: reaction } : { a: reaction, b: "attack" };
  }
  if (entry.t === "miss") {
    return entry.actor === "a" ? { a: "attack", b: "idle" } : { a: "idle", b: "attack" };
  }
  if (entry.t === "dodge") {
    const evasion: Pose = entry.key === "qteDodge" ? "roll" : "dodge";
    return entry.actor === "a" ? { a: "attack", b: evasion } : { a: evasion, b: "attack" };
  }
  if (entry.t === "passive") {
    if (entry.key === "stunApplied") {
      return entry.actor === "a" ? { a: "idle", b: "stun" } : { a: "stun", b: "idle" };
    }
    if (entry.key === "stunSkip") {
      return entry.actor === "a" ? { a: "stun", b: "idle" } : { a: "idle", b: "stun" };
    }
    if (entry.key === "revive") {
      return entry.actor === "a" ? { a: "revive", b: "idle" } : { a: "idle", b: "revive" };
    }
  }
  if (entry.t === "quirk") {
    if (entry.key === "quirkTaunt" && entry.actor !== "none") {
      return entry.actor === "a" ? { a: "taunt", b: "idle" } : { a: "idle", b: "taunt" };
    }
    if (entry.actor === "none" || !entry.dmg) return { a: "idle", b: "idle" };
    return entry.actor === "a" ? { a: "attack", b: "hit" } : { a: "hit", b: "attack" };
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
  else if (entry.t === "quirk") {
    if (entry.dmg) sfx.hit();
    else if (entry.heal) sfx.heal();
    else sfx.miss();
  } else if (entry.t === "event") sfx.event();
  else if (entry.t === "card" || entry.t === "showcase") sfx.legendary();
  else if (entry.t === "victory") sfx.victory();
  else if (entry.t === "death") sfx.death();
  else if (entry.heal) sfx.heal();
}

interface MatchResult {
  a: string;
  b: string;
  winner: string;
}

interface BattleStageProps {
  battle: BattlePayload;
  eventId?: string;
  arenaMap?: string;
  playerId: string;
  spectators?: { nickname: string; eliminated: boolean; avatar?: string }[];
  results?: MatchResult[];
  onReact: (pass: boolean, score?: number) => void;
}

export default function BattleStage({ battle, eventId, arenaMap, playerId, spectators, results, onReact }: BattleStageProps) {
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
  const fx: FxKind = (eventId && EVENT_FX[eventId]) || "none";
  const theme = THEMES[fx];

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
    const pushNote = (side: "a" | "b", text: string, delay: number, kind: "note" | "crit" = "note") => {
      setTimeout(() => {
        floatId.current++;
        setFloats((f) => [...f, { id: floatId.current, side, value: text, kind }]);
      }, delay);
    };
    const other = entry.actor === "a" ? "b" : "a";
    if (entry.actor !== "none") {
      if (entry.t === "miss") pushNote(entry.actor, t("noteMiss"), 620);
      if (entry.t === "dodge") pushNote(other, t("noteDodge"), 480);
      if (entry.t === "attack" && entry.blocked) pushNote(other, t("noteBlock"), 620);
      if (entry.t === "attack" && entry.crit) pushNote(other, t("noteCrit"), 620, "crit");
      if (entry.t === "passive" && entry.key === "stunApplied") pushNote(other, t("noteStun"), 120);
      if (entry.t === "passive" && entry.key === "revive") pushNote(entry.actor, t("noteRevive"), 120);
    }
  }, [index]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [visible.length]);

  const hpA = current?.hpA ?? battle.a.maxHp;
  const hpB = current?.hpB ?? battle.b.maxHp;
  const showIntro = current?.t === "intro";
  const pending = battle.pending ?? null;
  const atPause = pending !== null && index >= entries.length - 1;
  const qteMine = atPause && pending !== null && pending.playerId === playerId;
  const qteAttacker = atPause && pending !== null && pending.attackerId === playerId;
  const suspense = current?.t === "windup" || atPause;
  const weaponLost = {
    a: visible.some((e) => (e.key === "quirkString" && e.actor === "a") || (e.key === "quirkArm" && e.actor === "b")),
    b: visible.some((e) => (e.key === "quirkString" && e.actor === "b") || (e.key === "quirkArm" && e.actor === "a"))
  };
  const actor = current?.actor ?? "none";

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 text-center">
        <span className="rounded-full bg-white/10 px-4 py-1 text-xs font-black uppercase tracking-widest text-amber-300">
          {battle.roundKey === "final"
            ? t("grandFinal")
            : battle.roundKey === "semifinal"
              ? t("semifinal")
              : battle.roundKey === "quarterfinal"
                ? t("quarterfinal")
                : t("round", { n: battle.roundNumber })}
          {battle.legNumber ? ` · ${t("leg", { n: battle.legNumber })}` : ""}
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
        className="relative flex-1 overflow-hidden rounded-3xl border border-white/10"
        style={{ background: theme.sky }}
      >
        {theme.celestial === "sun" && (
          <motion.div
            animate={{ opacity: [0.85, 1, 0.85], scale: [1, 1.06, 1] }}
            transition={{ repeat: Infinity, duration: 3.2 }}
            className="absolute right-8 top-6 h-16 w-16 rounded-full bg-amber-300 shadow-[0_0_70px_30px_rgba(251,191,36,0.45)]"
          />
        )}
        {theme.celestial === "moon" && (
          <div className="absolute right-10 top-7 h-12 w-12 rounded-full bg-slate-200 shadow-[0_0_40px_12px_rgba(226,232,240,0.3)]">
            <div className="absolute -right-1 -top-1 h-10 w-10 rounded-full" style={{ background: "linear-gradient(180deg,#020617,#1e293b)" }} />
          </div>
        )}
        {theme.celestial === "redmoon" && (
          <motion.div
            animate={{ opacity: [0.8, 1, 0.8] }}
            transition={{ repeat: Infinity, duration: 2.6 }}
            className="absolute right-9 top-6 h-14 w-14 rounded-full bg-red-600 shadow-[0_0_60px_20px_rgba(220,38,38,0.5)]"
          />
        )}

        <Arena3D
          a={battle.a}
          b={battle.b}
          poseA={poses.a}
          poseB={poses.b}
          beat={index}
          fx={fx}
          map={arenaMap ?? "colosseum"}
          weaponLostA={weaponLost.a}
          weaponLostB={weaponLost.b}
          focus={suspense || current?.t === "attack" ? (actor === "a" || actor === "b" ? actor : "none") : "none"}
          zoom={zoom}
          crit={current?.t === "attack" && !!current.crit}
        />
        <div className="pointer-events-none absolute bottom-[42%] left-[16%]">
          <FloatLayer floats={floats.filter((f) => f.side === "a")} />
        </div>
        <div className="pointer-events-none absolute bottom-[42%] right-[16%]">
          <FloatLayer floats={floats.filter((f) => f.side === "b")} />
        </div>

        <ArenaFX fx={fx} />

        <AnimatePresence mode="wait">
          {current && current.t === "attack" && (
            <motion.div
              key={`hit-${index}`}
              initial={{ opacity: 0, scale: 2 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ type: "spring", damping: 14, stiffness: 300 }}
              className="pointer-events-none absolute inset-x-0 top-[30%] z-20 text-center"
            >
              <div
                className={`font-display font-black drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)] ${
                  current.crit ? "text-4xl text-orange-300" : "text-3xl text-rose-400"
                }`}
              >
                -{current.dmg ?? 0}
              </div>
            </motion.div>
          )}

          {current && current.t === "quirk" && current.dmg !== undefined && current.dmg > 0 && (
            <motion.div
              key={`quirkdmg-${index}`}
              initial={{ opacity: 0, scale: 1.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ type: "spring", damping: 14, stiffness: 300 }}
              className="pointer-events-none absolute inset-x-0 top-[30%] z-20 text-center"
            >
              <div className="font-display text-3xl font-black text-rose-400 drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]">
                -{current.dmg}
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
              className="absolute inset-0 z-10 flex items-center justify-center gap-3 bg-slate-950/85 px-4"
            >
              <motion.div initial={{ x: -120, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex flex-col items-center">
                <AvatarPortrait avatarId={battle.a.avatar} weapon={battle.a.equipment.weapon} equipment={battle.a.equipment} disabledItems={battle.a.disabledItems} className="h-32 w-24" />
                <div className="font-display max-w-[8rem] truncate text-xl font-black text-indigo-300">{battle.a.nickname}</div>
              </motion.div>
              <motion.div
                initial={{ scale: 3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 12 }}
                className="font-display text-5xl font-black text-amber-400"
              >
                VS
              </motion.div>
              <motion.div initial={{ x: 120, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex flex-col items-center">
                <AvatarPortrait avatarId={battle.b.avatar} weapon={battle.b.equipment.weapon} equipment={battle.b.equipment} disabledItems={battle.b.disabledItems} flip className="h-32 w-24" />
                <div className="font-display max-w-[8rem] truncate text-xl font-black text-fuchsia-300">{battle.b.nickname}</div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {current && current.t === "showcase" && (
            <Showcase
              key={`showcase-${index}`}
              fighter={current.actor === "a" ? battle.a : battle.b}
              side={current.actor === "a" ? "left" : "right"}
              headline={logLine(current)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {qteMine && <QteChallenge key={`qte-${entries.length}`} mode="dodge" onResult={onReact} />}
          {!qteMine && qteAttacker && <QteChallenge key={`qteatk-${entries.length}`} mode="attack" onResult={onReact} />}
        </AnimatePresence>

        <AnimatePresence>{current && current.t === "victory" && <Confetti />}</AnimatePresence>
      </motion.div>

      <div className="mt-2 flex min-h-[3.25rem] shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-2 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={atPause && !qteMine ? "ticker-pause" : `ticker-${index}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className={`text-sm font-bold leading-snug ${
              current?.t === "victory"
                ? "text-amber-300"
                : current?.t === "death"
                  ? "text-rose-400"
                  : current?.t === "windup"
                    ? "italic text-amber-200"
                    : current?.t === "quirk"
                      ? "text-lime-300"
                      : current?.crit
                        ? "text-orange-300"
                        : current?.t === "dodge" || current?.t === "miss"
                          ? "text-cyan-300"
                          : current?.t === "card" || current?.t === "event" || current?.t === "showcase"
                            ? "text-amber-200"
                            : "text-slate-200"
            }`}
          >
            {atPause && !qteMine && pending ? t("qteWaiting", { p: pending.nickname }) : current ? logLine(current) : ""}
            {(current?.t === "windup" || (atPause && !qteMine)) && (
              <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} className="ml-1">
                ●●●
              </motion.span>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div
        ref={logRef}
        className="mt-2 h-24 shrink-0 space-y-1 overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-[13px] leading-snug"
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
                    : entry.t === "quirk"
                      ? "font-semibold text-lime-300"
                      : entry.crit
                        ? "font-bold text-orange-300"
                        : entry.t === "card" || entry.t === "event" || entry.t === "showcase"
                          ? "text-amber-200"
                          : "text-slate-300"
            }
          >
            {logLine(entry)}
          </motion.div>
        ))}
      </div>

      {((spectators && spectators.length > 0) || (results && results.length > 0)) && (
        <div className="mt-2 grid shrink-0 grid-cols-2 gap-2">
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2">
            <div className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">👀 {t("spectators")}</div>
            <div className="max-h-20 space-y-1 overflow-y-auto">
              {(spectators ?? []).length === 0 && <div className="text-xs text-slate-600">—</div>}
              {(spectators ?? []).map((s) => (
                <div key={s.nickname} className="flex items-center gap-1.5">
                  <AvatarPortrait avatarId={s.avatar} className="h-6 w-5 shrink-0" />
                  <span className={`min-w-0 truncate text-xs font-semibold ${s.eliminated ? "text-slate-500 line-through" : "text-slate-200"}`}>
                    {s.nickname}
                  </span>
                  {s.eliminated && <span className="shrink-0 text-[10px]">💀</span>}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2">
            <div className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">🏁 {t("results")}</div>
            <div className="max-h-20 space-y-1 overflow-y-auto">
              {(results ?? []).length === 0 && <div className="text-xs text-slate-600">—</div>}
              {(results ?? [])
                .slice(-8)
                .reverse()
                .map((r, i) => (
                  <div key={i} className="flex items-center gap-1 text-xs">
                    <span className={`min-w-0 flex-1 truncate text-right ${r.winner === r.a ? "font-bold text-emerald-300" : "text-slate-500"}`}>
                      {r.winner === r.a ? "🏆 " : ""}
                      {r.a}
                    </span>
                    <span className="shrink-0 text-[9px] font-black text-slate-600">vs</span>
                    <span className={`min-w-0 flex-1 truncate ${r.winner === r.b ? "font-bold text-emerald-300" : "text-slate-500"}`}>
                      {r.b}
                      {r.winner === r.b ? " 🏆" : ""}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Showcase({ fighter, side, headline }: { fighter: FighterView; side: "left" | "right"; headline: string }) {
  const { t, itemName } = useI18n();
  const items = SLOTS.map((s) => fighter.equipment[s]).filter((i): i is NonNullable<typeof i> => !!i);
  const fromX = side === "left" ? -140 : 140;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 overflow-y-auto bg-slate-950/90 px-3 py-3 backdrop-blur-sm"
    >
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="font-display shrink-0 text-center text-lg font-black leading-tight text-amber-300"
      >
        {headline}
      </motion.div>
      <div className={`flex min-h-0 w-full max-w-md items-center gap-3 ${side === "right" ? "flex-row-reverse" : ""}`}>
        <motion.div
          initial={{ x: fromX, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", damping: 14 }}
          className="shrink-0"
        >
          <AvatarPortrait avatarId={fighter.avatar} weapon={fighter.equipment.weapon} equipment={fighter.equipment} disabledItems={fighter.disabledItems} flip={side === "right"} className="h-32 w-24 drop-shadow-2xl" />
        </motion.div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {items.length === 0 && (
            <motion.div
              initial={{ x: -fromX / 3, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="rounded-lg border border-gray-500/60 bg-gray-500/10 px-2.5 py-1.5 text-xs font-bold text-gray-200"
            >
              🤜 {t("bareHands")}
            </motion.div>
          )}
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ x: -fromX / 3, opacity: 0, scale: 0.85 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.24, type: "spring", damping: 15 }}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 ${RARITY_CHIP[item.rarity]} ${
                item.rarity === "legendary" ? "shadow-[0_0_18px_rgba(251,146,60,0.35)]" : ""
              }`}
            >
              <span className="text-base">{item.emoji}</span>
              <span className="min-w-0 flex-1 truncate text-xs font-bold">{itemName(item)}</span>
              <span className="shrink-0 text-[8px] font-black uppercase tracking-wider opacity-80">{t(item.rarity)}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function QteChallenge({ mode, onResult }: { mode: "dodge" | "attack"; onResult: (pass: boolean, score?: number) => void }) {
  const { t } = useI18n();
  const [pos, setPos] = useState(0);
  const [result, setResult] = useState<boolean | null>(null);
  const posRef = useRef(0);
  const doneRef = useRef(false);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    let raf = 0;
    const step = (ts: number) => {
      if (doneRef.current) return;
      if (startRef.current === null) startRef.current = ts;
      const el = ts - startRef.current;
      if (el > 3200) {
        doneRef.current = true;
        setResult(false);
        onResult(false, 1);
        return;
      }
      const phase = (el % 1600) / 1600;
      const p = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
      posRef.current = p;
      setPos(p);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [onResult]);

  const tap = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    const offset = Math.min(1, Math.abs(posRef.current - 0.5) * 2);
    const pass = offset <= 0.14;
    setResult(pass);
    onResult(pass, offset);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onPointerDown={tap}
      className="absolute inset-0 z-30 flex cursor-pointer flex-col items-center justify-center bg-slate-950/75 backdrop-blur-sm"
    >
      {result === null ? (
        <>
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ repeat: Infinity, duration: 0.5 }}
            className={`font-display text-4xl font-black ${
              mode === "attack"
                ? "text-amber-300 drop-shadow-[0_0_20px_rgba(252,211,77,0.7)]"
                : "text-cyan-300 drop-shadow-[0_0_20px_rgba(103,232,249,0.7)]"
            }`}
          >
            {mode === "attack" ? t("qteAttackTitle") : t("qteTitle")}
          </motion.div>
          <div className="mt-2 text-sm font-bold text-slate-300">{mode === "attack" ? t("qteAttackHint") : t("qteHint")}</div>
          <div className="relative mt-5 h-7 w-72 max-w-[85vw] overflow-hidden rounded-full border border-white/20 bg-white/10">
            <div className={`absolute inset-y-0 left-[43%] w-[14%] rounded ${mode === "attack" ? "bg-amber-500/80" : "bg-emerald-500/70"}`} />
            <div
              className="absolute inset-y-0 w-2 -translate-x-1/2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)]"
              style={{ left: `${pos * 100}%` }}
            />
          </div>
        </>
      ) : (
        <motion.div
          initial={{ scale: 2.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 12 }}
          className={`font-display text-2xl font-black ${result ? "text-emerald-300" : "text-rose-400"}`}
        >
          {result ? `✅ ${t("qtePerfect")}` : `❌ ${t("qteFailed")}`}
        </motion.div>
      )}
    </motion.div>
  );
}

function ArenaFX({ fx }: { fx: FxKind }) {
  if (fx === "rain" || fx === "storm" || fx === "snow" || fx === "poison" || fx === "wind") return null;
  if (fx === "fog") {
    return (
      <div className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
        {Array.from({ length: 3 }, (_, i) => (
          <motion.div
            key={i}
            animate={{ x: ["-15%", "15%", "-15%"] }}
            transition={{ repeat: Infinity, duration: 9 + i * 3, ease: "easeInOut" }}
            className="absolute h-16 w-[75%] rounded-full bg-slate-300/15 blur-xl"
            style={{ top: `${25 + i * 22}%`, left: `${(i * 20) % 40}%` }}
          />
        ))}
      </div>
    );
  }
  if (fx === "night" || fx === "bloodmoon") {
    return (
      <div className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
        {Array.from({ length: 16 }, (_, i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0.15, 0.9, 0.15] }}
            transition={{ repeat: Infinity, duration: 2 + (i % 3), delay: (i * 0.35) % 2 }}
            className={`absolute h-1 w-1 rounded-full ${fx === "bloodmoon" ? "bg-red-300/80" : "bg-white/80"}`}
            style={{ left: `${(i * 137) % 100}%`, top: `${(i * 89) % 45}%` }}
          />
        ))}
      </div>
    );
  }
  if (fx === "sun") {
    return <div className="pointer-events-none absolute inset-0 z-[5] bg-gradient-to-b from-amber-200/10 to-transparent" />;
  }
  return null;
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
            className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap font-display font-black ${
              f.kind === "note"
                ? "text-lg text-cyan-300"
                : f.kind === "crit"
                  ? "text-xl text-orange-400"
                  : f.kind === "heal"
                    ? "text-2xl text-emerald-400"
                    : "text-2xl text-rose-400"
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
