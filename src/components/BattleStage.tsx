"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import type { BattlePayload, FighterView, Rarity, TimelineEntry } from "@/lib/game/types";
import { SLOTS } from "@/lib/game/types";
import { type Pose } from "./Fighter";
import AvatarPortrait from "./AvatarPortrait";
import { sfx } from "@/lib/sound";
import { useI18n } from "@/lib/i18n";
import { weaponAudioKindFor } from "@/lib/game/items";

const Arena3D = dynamic(() => import("./Arena3D"), { ssr: false });

interface FloatingNumber {
  id: number;
  side: "a" | "b";
  value: string;
  kind: "dmg" | "heal" | "note" | "crit";
  mag: number;
  x: number;
  y: number;
}

const FLOAT_STROKE = "[-webkit-text-stroke:1px_rgba(2,6,23,0.85)]";
const NOTE_PILL = "rounded-full border border-cyan-200/30 bg-slate-950/85 px-2.5 py-1 text-sm text-cyan-200";

const FLOAT_SIZES: Record<string, string[]> = {
  dmg: [`text-2xl text-rose-400 ${FLOAT_STROKE}`, `text-3xl text-rose-400 ${FLOAT_STROKE}`, `text-4xl text-rose-300 ${FLOAT_STROKE}`],
  crit: [`text-3xl text-orange-400 ${FLOAT_STROKE}`, `text-3xl text-orange-400 ${FLOAT_STROKE}`, `text-4xl text-orange-300 ${FLOAT_STROKE}`],
  heal: [`text-2xl text-emerald-400 ${FLOAT_STROKE}`, `text-2xl text-emerald-400 ${FLOAT_STROKE}`, `text-3xl text-emerald-300 ${FLOAT_STROKE}`],
  note: [NOTE_PILL, NOTE_PILL, NOTE_PILL]
};

function floatMag(dmg: number): number {
  return dmg >= 55 ? 2 : dmg >= 28 ? 1 : 0;
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
    if (entry.key === "weaponRecover" || entry.key === "gearReturn") {
      return entry.actor === "a" ? { a: "pickup", b: "idle" } : { a: "idle", b: "pickup" };
    }
  }
  if (entry.t === "quirk") {
    if ((entry.key === "quirkSnack" || entry.key === "quirkPrayer" || entry.key === "quirkBreather") && entry.actor !== "none") {
      return entry.actor === "a" ? { a: "use", b: "idle" } : { a: "idle", b: "use" };
    }
    if (entry.key === "quirkTaunt" && entry.actor !== "none") {
      return entry.actor === "a" ? { a: "taunt", b: "idle" } : { a: "idle", b: "taunt" };
    }
    if ((entry.key === "quirkRock" || entry.key === "quirkBoot") && entry.actor !== "none") {
      return entry.actor === "a" ? { a: "throw", b: "hit" } : { a: "hit", b: "throw" };
    }
    if (entry.key === "quirkDropFoot" && entry.actor !== "none") {
      return entry.actor === "a" ? { a: "pickup", b: "idle" } : { a: "idle", b: "pickup" };
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

function playSound(entry: TimelineEntry, eventId?: string, finisher = false): void {
  const weapon = typeof entry.params?.weapon === "string" ? entry.params.weapon : undefined;
  const weaponKind = weaponAudioKindFor(weapon);
  if (entry.t === "windup") sfx.weaponWindup(weaponKind);
  else if (entry.t === "attack") {
    sfx.weaponImpact(weaponKind, !!entry.crit);
    if (entry.blocked) sfx.defend();
    if ((entry.absorbed ?? 0) > 0) sfx.barrier();
    if (finisher) sfx.finisher();
  } else if (entry.t === "miss" || entry.t === "dodge") sfx.weaponMiss(weaponKind, entry.t === "dodge");
  else if (entry.t === "quirk") {
    if (entry.heal) sfx.heal();
    else sfx.quirk(entry.key);
  } else if (entry.t === "event") {
    const timelineEvent = typeof entry.params?.event === "string" ? entry.params.event : eventId;
    sfx.environment(timelineEvent);
  } else if (entry.t === "card") {
    if (entry.key === "lightning") sfx.environment("thunderstorm");
    else if (entry.key === "curse") sfx.environment("cursed_ground");
    else if (entry.key === "magnet") sfx.quirk("quirkCaught");
    else sfx.legendary();
  } else if (entry.t === "showcase") sfx.legendary();
  else if (entry.t === "victory") sfx.victory();
  else if (entry.t === "death") sfx.death();
  else if (entry.key === "gearReturn") sfx.pick();
  else if (entry.t === "poison" || entry.key === "poisonApplied") sfx.poison();
  else if (entry.key === "reflect") sfx.reflect();
  else if (entry.key === "stunApplied" || entry.key === "stunSkip") sfx.stun();
  else if (entry.key === "revive") sfx.legendary();
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
  const [evasion, setEvasion] = useState<{ id: number; kind: "miss" | "dodge" } | null>(null);
  const evasionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const evasionIdRef = useRef(0);
  const arenaMotion = useAnimationControls();
  const logRef = useRef<HTMLDivElement>(null);
  const logPinnedRef = useRef(true);
  const floatId = useRef(0);
  const indexRef = useRef(0);
  const prevIndexRef = useRef(-1);
  const pendingRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const impactRef = useRef<{ beat: number; fire: () => void } | null>(null);
  const [dispHp, setDispHp] = useState(() => {
    const e = battle.timeline[indexForElapsed(battle.timeline, battle.elapsedMs ?? 0)];
    return { a: e?.hpA ?? battle.a.maxHp, b: e?.hpB ?? battle.b.maxHp };
  });
  const entriesRef = useRef(battle.timeline);
  entriesRef.current = battle.timeline;
  const screenPosRef = useRef({ a: { x: 0.28, y: 0.4 }, b: { x: 0.72, y: 0.4 } });

  indexRef.current = index;
  const entries = battle.timeline;
  const visible = entries.slice(0, index + 1);
  const current = entries[Math.min(index, entries.length - 1)];
  const poses = posesFor(current);
  const fx: FxKind = (eventId && EVENT_FX[eventId]) || "none";
  const theme = THEMES[fx];
  const onArenaImpact = useCallback((beat: number) => {
    const pendingImpact = impactRef.current;
    if (pendingImpact?.beat === beat) pendingImpact.fire();
  }, []);

  useEffect(() => {
    if (index >= entries.length - 1) return;
    const timer = setTimeout(() => setIndex((i) => i + 1), entryDuration(entries[index]));
    return () => clearTimeout(timer);
  }, [index, entries.length]);

  useEffect(() => {
    const expected = indexForElapsed(entriesRef.current, battle.elapsedMs ?? 0);
    setIndex((i) => (expected > i + 1 ? expected : i));
  }, [battle.elapsedMs]);

  useEffect(() => {
    for (const timer of pendingRef.current) clearTimeout(timer);
    pendingRef.current = [];
    impactRef.current = null;
    const entry = entriesRef.current[index];
    const prev = prevIndexRef.current;
    const jumped = index - prev > 1;
    prevIndexRef.current = index;
    if (!entry) return;
    const showEvasion = (kind: "miss" | "dodge") => {
      evasionIdRef.current++;
      setEvasion({ id: evasionIdRef.current, kind });
      if (evasionTimerRef.current) clearTimeout(evasionTimerRef.current);
      evasionTimerRef.current = setTimeout(() => setEvasion(null), 1400);
    };
    if (jumped) {
      const skipped = entriesRef.current
        .slice(Math.max(0, prev + 1), index + 1)
        .filter((e) => e.t === "miss" || e.t === "dodge")
        .pop();
      if (skipped) showEvasion(skipped.t === "miss" ? "miss" : "dodge");
    }
    const isStrike = entry.t === "attack" || entry.t === "miss" || entry.t === "dodge";
    const waitsForImpact = !jumped && isStrike;
    const scheduledAt = index;
    const at = (fn: () => void, delay: number) => {
      if (delay <= 0) {
        fn();
        return;
      }
      pendingRef.current.push(
        setTimeout(() => {
          if (indexRef.current === scheduledAt) fn();
        }, delay)
      );
    };
    const impactTasks: (() => void)[] = [];
    const atImpact = (fn: () => void) => {
      if (waitsForImpact) impactTasks.push(fn);
      else fn();
    };
    const pushFloat = (side: "a" | "b", value: string, kind: FloatingNumber["kind"], timing: "impact" | number, mag = 0) => {
      const show = () => {
        floatId.current++;
        const pos = screenPosRef.current[side];
        if (pos.x <= 0.11 && pos.y <= 0.13) return;
        setFloats((f) => {
          const onSide = f.filter((x) => x.side === side).length;
          const y = Math.max(0.08, pos.y - onSide * 0.08);
          return [...f.slice(-2), { id: floatId.current, side, value, kind, mag, x: pos.x, y }];
        });
      };
      if (timing === "impact") atImpact(show);
      else at(show, timing);
    };
    const next = entriesRef.current[index + 1];
    const finisher = entry.t === "attack" && (entry.dmg ?? 0) > 0 && next?.t === "death";
    atImpact(() => {
      setDispHp({ a: entry.hpA, b: entry.hpB });
      playSound(entry, eventId, finisher);
      if (entry.t === "attack" && (entry.crit || finisher)) {
        setShake((sh) => sh + 1);
        setZoom(true);
        pendingRef.current.push(setTimeout(() => setZoom(false), finisher ? 1700 : 600));
        if (finisher) navigator.vibrate?.([24, 60, 40]);
      }
    });
    if (jumped || entry.t === "victory" || entry.t === "death") setFloats([]);
    if (!jumped && (entry.t === "miss" || entry.t === "dodge")) {
      atImpact(() => showEvasion(entry.t === "miss" ? "miss" : "dodge"));
    }
    const other = entry.actor === "a" ? "b" : "a";
    if (entry.heal !== undefined && entry.heal > 0) pushFloat(entry.actor === "a" ? "a" : "b", `+${entry.heal}`, "heal", "impact");
    if (entry.t === "passive" && entry.dmg !== undefined) pushFloat(entry.actor === "a" ? "b" : "a", `-${entry.dmg}`, "dmg", 0);
    if (entry.t === "poison" && entry.dmg !== undefined) pushFloat(entry.actor === "a" ? "a" : "b", `-${entry.dmg}`, "dmg", 0);
    if (entry.actor !== "none") {
      if (entry.t === "miss") pushFloat(other, t("noteMiss"), "note", "impact");
      else if (entry.t === "dodge") pushFloat(other, t("noteDodge"), "note", "impact");
      else if (entry.t === "attack" && (entry.dmg ?? 0) > 0) {
        const prefix = entry.crit ? "⚡" : entry.blocked ? "🛡" : "";
        pushFloat(other, `${prefix}-${entry.dmg}`, entry.crit ? "crit" : "dmg", "impact", floatMag(entry.dmg ?? 0));
      }
      if (entry.extra && (entry.t === "attack" || entry.t === "miss" || entry.t === "dodge")) pushFloat(entry.actor, t("noteExtra"), "note", 60);
      if (entry.t === "passive" && entry.key === "stunSkip") pushFloat(entry.actor, t("noteStunSkip"), "note", 120);
      if (entry.t === "passive" && entry.key === "stunApplied") pushFloat(other, t("noteStun"), "note", 120);
      if (entry.t === "passive" && entry.key === "revive") pushFloat(entry.actor, t("noteRevive"), "note", 120);
    }
    if (waitsForImpact) {
      let fired = false;
      const fire = () => {
        if (fired || indexRef.current !== scheduledAt) return;
        fired = true;
        for (const task of impactTasks) task();
      };
      impactRef.current = { beat: scheduledAt, fire };
      const fallbackMs = Math.min(720, Math.max(160, entryDuration(entry) * 0.62));
      pendingRef.current.push(setTimeout(fire, fallbackMs));
    }
  }, [index]);

  useEffect(
    () => () => {
      pendingRef.current.forEach(clearTimeout);
      if (evasionTimerRef.current) clearTimeout(evasionTimerRef.current);
    },
    []
  );

  useEffect(() => {
    const log = logRef.current;
    if (log && logPinnedRef.current) log.scrollTo({ top: log.scrollHeight });
  }, [visible.length]);

  useEffect(() => {
    if (shake === 0) return;
    void arenaMotion.start({ x: [0, -12, 12, -8, 8, 0], transition: { duration: 0.45 } });
  }, [shake, arenaMotion]);

  const introNow = current?.t === "intro";
  const hpA = introNow ? battle.a.maxHp : dispHp.a;
  const hpB = introNow ? battle.b.maxHp : dispHp.b;
  const showIntro = current?.t === "intro";
  const pending = battle.pending ?? null;
  const atPause = pending !== null && index >= entries.length - 1;
  const qteMine = atPause && pending !== null && pending.playerId === playerId;
  const qteAttacker = atPause && pending !== null && pending.attackerId === playerId;
  const suspense = current?.t === "windup" || atPause;
  const weaponLostFor = (side: "a" | "b") => {
    let lost = false;
    for (const e of visible) {
      if ((e.key === "quirkString" && e.actor === side) || (e.key === "quirkArm" && e.actor !== side && e.actor !== "none")) lost = true;
      const fighter = side === "a" ? battle.a : battle.b;
      const temporaryWeaponLoss =
        (e.key === "magnet" || e.key === "pirate") && e.params?.target === side && e.params?.item === fighter.equipment.weapon?.id;
      if (temporaryWeaponLoss) lost = true;
      if ((e.key === "weaponRecover" || e.key === "gearReturn") && e.actor === side) lost = false;
    }
    return lost;
  };
  const poisonedFor = (side: "a" | "b") => {
    if (eventId === "poison_mist") return true;
    const fighter = side === "a" ? battle.a : battle.b;
    let lastEvidence = -1;
    for (let i = 0; i < visible.length; i++) {
      const entry = visible[i];
      if (!entry) continue;
      const applied = (entry.key === "poisonApplied" || entry.key === "quirkBite") && entry.params?.d === fighter.nickname;
      const tick =
        entry.actor === side && (entry.key === "poisonTick" || (entry.key === "fatigueTick" && entry.params?.poisoned === 1));
      if (applied || tick) lastEvidence = i;
    }
    return lastEvidence >= 0 && index - lastEvidence <= 14;
  };
  const weaponLost = { a: weaponLostFor("a"), b: weaponLostFor("b") };
  const poisoned = { a: poisonedFor("a"), b: poisonedFor("b") };
  const actor = current?.actor ?? "none";
  const nextEntry = entries[index + 1];
  const finisherNow = !!current && current.t === "attack" && (current.dmg ?? 0) > 0 && nextEntry?.t === "death";

  return (
    <div className="flex flex-col">
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
        <HpBar name={battle.a.nickname} hp={hpA} maxHp={battle.a.maxHp} align="left" poisoned={poisoned.a} />
        <HpBar name={battle.b.nickname} hp={hpB} maxHp={battle.b.maxHp} align="right" poisoned={poisoned.b} />
      </div>

      <motion.div
        data-testid="battle-arena"
        animate={arenaMotion}
        className="relative mx-auto w-full max-w-[430px] overflow-hidden rounded-3xl border border-white/10 shadow-[0_18px_60px_rgba(0,0,0,0.38)]"
        style={{ background: theme.sky, aspectRatio: "1 / 0.85" }}
      >
        

        <Arena3D
          a={battle.a}
          b={battle.b}
          poseA={poses.a}
          poseB={poses.b}
          beat={index}
          fx={fx}
          map={arenaMap ?? "colosseum"}
          eventId={eventId}
          revealed={current ? current.t !== "intro" && current.t !== "showcase" && current.t !== "event" : true}
          screenPosRef={screenPosRef}
          weaponLostA={weaponLost.a}
          weaponLostB={weaponLost.b}
          focus={suspense || current?.t === "attack" ? (actor === "a" || actor === "b" ? actor : "none") : "none"}
          zoom={zoom}
          crit={current?.t === "attack" && !!current.crit}
          finisher={finisherNow}
          beatMs={entryDuration(current)}
          onImpact={onArenaImpact}
        />
        <div className="pointer-events-none absolute inset-0 z-20">
          <AnimatePresence>
            {floats.map((f) => (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, y: 4, scale: 0.55 }}
                animate={{ opacity: [0, 1, 1, 0], y: -44, scale: [0.55, 1.18, 1] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                style={{ left: `${f.x * 100}%`, top: `${f.y * 100}%` }}
                className={`absolute -translate-x-1/2 whitespace-nowrap font-display font-black drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] ${
                  (FLOAT_SIZES[f.kind] ?? FLOAT_SIZES.note)?.[Math.min(2, f.mag)] ?? "text-base text-cyan-300"
                }`}
              >
                {f.value}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          {evasion && (
            <motion.div
              key={`evasion-${evasion.id}`}
              initial={{ opacity: 0, scale: 0.65, y: 8 }}
              animate={{ opacity: [0, 1, 1], scale: [0.65, 1.1, 1], y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="pointer-events-none absolute left-1/2 top-[14%] z-40 -translate-x-1/2 rounded-full border border-cyan-200/35 bg-slate-950/85 px-4 py-2 font-display text-xl font-black tracking-wide text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,0.28)]"
            >
              {evasion.kind === "miss" ? `💨 ${t("noteMiss")}` : `↪ ${t("noteDodge")}`}
            </motion.div>
          )}
        </AnimatePresence>

        <ArenaFX fx={fx} />



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

        <AnimatePresence>
          {current && ((current.t === "card" && ["pirate", "trade", "magnet"].includes(current.key ?? "")) || current.key === "gearReturn") && (
            <CardSwapFx key={`cardfx-${index}`} entry={current} battle={battle} />
          )}
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
            {atPause && !qteMine && pending ? t("qteWaiting", { p: pending.nickname }) : current ? logLine(current, true) : ""}
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
        onScroll={(event) => {
          const log = event.currentTarget;
          logPinnedRef.current = log.scrollHeight - log.scrollTop - log.clientHeight < 12;
        }}
        className="mt-2 h-40 shrink-0 space-y-1 overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-[13px] leading-snug"
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
                  <AvatarPortrait avatarId={s.avatar} className="h-5 w-4 shrink-0" />
                  <span className={`min-w-0 truncate text-[11px] font-semibold ${s.eliminated ? "text-slate-500 line-through" : "text-slate-200"}`}>
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
                  <div key={i} className="flex items-center gap-1 text-[11px]">
                    <span className={`min-w-0 flex-1 truncate text-right ${r.winner === r.a ? "font-bold text-emerald-300" : "text-slate-500"}`}>
                      {r.a}
                    </span>
                    <span className="shrink-0 text-[9px] font-black text-slate-600">vs</span>
                    <span className={`min-w-0 flex-1 truncate ${r.winner === r.b ? "font-bold text-emerald-300" : "text-slate-500"}`}>
                      {r.b}
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

function FlyingItem({ emoji, label, fromRight, delay, top }: { emoji: string; label: string; fromRight: boolean; delay: number; top: string }) {
  return (
    <motion.div
      initial={{ x: fromRight ? 150 : -150, opacity: 0, scale: 0.6 }}
      animate={{ x: fromRight ? -150 : 150, opacity: [0, 1, 1, 0], scale: [0.6, 1.25, 1.25, 0.7] }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.6, delay, ease: "easeInOut" }}
      className="pointer-events-none absolute left-1/2 z-20 flex -translate-x-1/2 flex-col items-center"
      style={{ top }}
    >
      <div className="text-4xl drop-shadow-[0_2px_10px_rgba(251,191,36,0.7)]">{emoji}</div>
      {label && <div className="mt-0.5 rounded bg-slate-950/80 px-1.5 py-0.5 text-[10px] font-bold text-amber-200">{label}</div>}
    </motion.div>
  );
}

function CardSwapFx({ entry, battle }: { entry: TimelineEntry; battle: BattlePayload }) {
  const { itemName, t: tGlobal } = useI18n();
  const ownerIsA = entry.params?.side === "a";
  if (entry.key === "trade") {
    const slot = entry.params?.slot as keyof typeof battle.a.equipment | undefined;
    const aGot = slot ? battle.a.equipment[slot] : undefined;
    const bGot = slot ? battle.b.equipment[slot] : undefined;
    return (
      <>
        {aGot && <FlyingItem emoji={aGot.emoji} label={itemName(aGot)} fromRight delay={0} top="30%" />}
        {bGot && <FlyingItem emoji={bGot.emoji} label={itemName(bGot)} fromRight={false} delay={0.15} top="42%" />}
      </>
    );
  }
  const emoji = (entry.params?.emoji as string) ?? "🎁";
  const itemId = entry.params?.item as string | undefined;
  const stolen =
    itemId !== undefined
      ? [...Object.values(battle.a.equipment), ...Object.values(battle.b.equipment)].find((i) => i && i.id === itemId)
      : undefined;
  if (entry.key === "gearReturn") {
    return <FlyingItem emoji={emoji} label={stolen ? itemName(stolen) : ""} fromRight={entry.actor === "a"} delay={0} top="34%" />;
  }
  if (entry.key === "magnet") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="pointer-events-none absolute inset-x-6 top-[32%] z-20 mx-auto max-w-sm"
      >
        <div className="rounded-2xl border-2 border-rose-500/60 bg-slate-950/90 p-3 text-center shadow-[0_0_30px_rgba(244,63,94,0.25)]">
          <div className="text-2xl">🧲</div>
          <motion.div
            animate={{ x: [0, -5, 5, -3, 3, 0] }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className={`mt-2 flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${stolen ? RARITY_CHIP[stolen.rarity] : "border-white/10"}`}
          >
            <span className="text-xl">{emoji}</span>
            <span className="min-w-0 flex-1 truncate text-left text-sm font-bold">{stolen ? itemName(stolen) : ""}</span>
            <span className="shrink-0 rounded bg-rose-500/80 px-1.5 py-0.5 text-[9px] font-black text-white">{tGlobal("disabledStamp")}</span>
          </motion.div>
        </div>
      </motion.div>
    );
  }
  return <FlyingItem emoji={emoji} label={stolen ? itemName(stolen) : ""} fromRight={ownerIsA} delay={0} top="34%" />;
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
  const [result, setResult] = useState<"perfect" | "good" | "bad" | null>(null);
  const posRef = useRef(0);
  const markerRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    let raf = 0;
    const step = (ts: number) => {
      if (doneRef.current) return;
      if (startRef.current === null) startRef.current = ts;
      const el = ts - startRef.current;
      if (el > 3200) {
        resolve(1);
        return;
      }
      const phase = (el % 2600) / 2600;
      const p = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
      posRef.current = p;
      if (markerRef.current) markerRef.current.style.left = `${p * 100}%`;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [onResult]);

  const resolve = (offset: number) => {
    if (doneRef.current) return;
    doneRef.current = true;
    const pass = offset <= 0.1;
    const timing = offset <= 0.02 ? "perfect" : pass ? "good" : "bad";
    setResult(timing);
    if (timing === "perfect") {
      sfx.pick();
      navigator.vibrate?.([10, 28, 12]);
    } else if (timing === "good") {
      sfx.pick();
      navigator.vibrate?.(10);
    } else {
      sfx.miss();
      navigator.vibrate?.(22);
    }
    onResult(pass, offset);
  };

  const tap = () => resolve(Math.min(1, Math.abs(posRef.current - 0.5) * 2));

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onPointerDown={tap}
      onClick={tap}
      aria-label={mode === "attack" ? t("qteAttackHint") : t("qteHint")}
      className="absolute inset-0 z-30 flex cursor-pointer flex-col items-center justify-center border-0 bg-slate-950/75 p-0 text-left touch-manipulation backdrop-blur-sm"
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
            <div className={`absolute inset-y-0 left-[45%] w-[10%] rounded ${mode === "attack" ? "bg-amber-500/80" : "bg-emerald-500/70"}`} />
            <div className="absolute inset-y-0 left-[49.5%] w-[1%] rounded bg-white/90" />
            <div
              ref={markerRef}
              className="absolute inset-y-0 w-2 -translate-x-1/2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)]"
              style={{ left: "0%" }}
            />
          </div>
        </>
      ) : (
        <motion.div
          role="status"
          aria-live="assertive"
          aria-atomic="true"
          initial={{ scale: 2.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 12 }}
          className={`font-display text-2xl font-black ${
            result === "perfect" ? "text-amber-300" : result === "good" ? "text-emerald-300" : "text-rose-400"
          }`}
        >
          {result === "perfect" ? t("qtePerfect") : result === "good" ? t("qteGood") : t("qteFailed")}
        </motion.div>
      )}
    </motion.button>
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
  if (fx === "night" || fx === "bloodmoon") return null;
  if (fx === "sun") {
    return <div className="pointer-events-none absolute inset-0 z-[5] bg-gradient-to-b from-amber-200/10 to-transparent" />;
  }
  return null;
}

function HpBar({ name, hp, maxHp, align, poisoned }: { name: string; hp: number; maxHp: number; align: "left" | "right"; poisoned: boolean }) {
  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  return (
    <div className={align === "right" ? "text-right" : ""}>
      <div className="mb-1 truncate text-sm font-bold">
        {name} {poisoned && <span className="text-lime-300">🧪</span>}
      </div>
      <div className={`h-3 w-full overflow-hidden rounded-full bg-white/10 ${align === "right" ? "scale-x-[-1]" : ""}`}>
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.35 }}
          className={`h-full rounded-full ${
            poisoned
              ? "bg-gradient-to-r from-lime-300 via-green-400 to-emerald-500 shadow-[0_0_9px_rgba(163,230,53,0.75)]"
              : pct > 50
                ? "bg-emerald-400"
                : pct > 25
                  ? "bg-amber-400"
                  : "bg-rose-500"
          }`}
        />
      </div>
      <div className="mt-0.5 text-[11px] font-semibold tabular-nums text-slate-400">
        {Math.max(0, hp)} / {maxHp}
      </div>
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
          initial={{ y: -20, x: `${8 + ((i * 137) % 84)}%`, rotate: 0, opacity: 1 }}
          animate={{ y: "110%", rotate: 360 + i * 40, opacity: [1, 1, 0.6] }}
          transition={{ duration: 1.8 + (i % 5) * 0.3, ease: "easeIn" }}
          className="absolute h-2.5 w-2.5 rounded-sm"
          style={{ backgroundColor: colors[i % colors.length] }}
        />
      ))}
    </div>
  );
}
