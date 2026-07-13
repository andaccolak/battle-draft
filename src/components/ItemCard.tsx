"use client";

import { motion } from "framer-motion";
import type { Item, Rarity } from "@/lib/game/types";
import { SLOT_META } from "@/lib/game/types";
import { useI18n } from "@/lib/i18n";
import { BUILD_STAT_KEYS, type BuildStats } from "@/lib/game/buildStats";

export const STAT_EMOJI: Record<string, string> = {
  attack: "⚔️",
  defense: "🛡️",
  hp: "❤️",
  speed: "💨",
  critChance: "💥",
  critDamage: "🔥",
  accuracy: "🎯",
  dodge: "🌀",
  initiative: "⚡"
};

const RARITY_STYLES: Record<Rarity, { border: string; text: string; bg: string }> = {
  common: { border: "border-gray-500/60", text: "text-gray-300", bg: "bg-gray-500/10" },
  uncommon: { border: "border-green-400/60", text: "text-green-300", bg: "bg-green-500/10" },
  rare: { border: "border-blue-400/60", text: "text-blue-300", bg: "bg-blue-500/10" },
  epic: { border: "border-purple-400/60", text: "text-purple-300", bg: "bg-purple-500/10" },
  legendary: { border: "border-orange-400/80", text: "text-orange-300", bg: "bg-orange-500/10" }
};

interface Props {
  item: Item;
  locked?: boolean;
  pending?: boolean;
  selected?: boolean;
  onPick?: () => void;
  compact?: boolean;
  currentStats?: BuildStats;
  projectedStats?: BuildStats;
}

export default function ItemCard({ item, locked = false, pending = false, selected = false, onPick, compact = false, currentStats, projectedStats }: Props) {
  const { t, itemName, passiveLabel, slotLabel } = useI18n();
  const style = RARITY_STYLES[item.rarity];
  const slot = SLOT_META[item.slot];
  const unavailable = locked || pending;
  const stats = BUILD_STAT_KEYS.filter((k) => item.stats[k] !== undefined && item.stats[k] !== 0).map((k) => ({
    key: k,
    negative: (item.stats[k] as number) < 0,
    line: `${STAT_EMOJI[k]} ${(item.stats[k] as number) > 0 ? "+" : ""}${item.stats[k]} ${t(`stat_${k}`)}`
  }));
  const comparisons =
    currentStats && projectedStats
      ? BUILD_STAT_KEYS.filter((key) => currentStats[key] !== projectedStats[key]).map((key) => ({
          key,
          before: Math.round(currentStats[key]),
          after: Math.round(projectedStats[key]),
          delta: Math.round(projectedStats[key] - currentStats[key])
        }))
      : [];

  return (
    <motion.button
      layout
      whileTap={unavailable || !onPick ? undefined : { scale: 0.96 }}
      whileHover={unavailable || !onPick ? undefined : { y: -2 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
      onClick={unavailable ? undefined : onPick}
      disabled={unavailable || !onPick}
      className={`relative w-full rounded-2xl border-2 p-2.5 text-left transition ${style.border} ${style.bg} ${
        locked ? "grayscale opacity-60" : pending && !selected ? "opacity-45" : selected ? "border-emerald-300 bg-emerald-500/15 ring-2 ring-emerald-300/40" : item.rarity === "legendary" ? "animate-pulseGlow" : ""
      }`}
    >
      <div className="flex items-start gap-2.5">
        <div className="text-2xl">{item.emoji}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-bold">{itemName(item)}</span>
            <span className={`shrink-0 text-[10px] font-black uppercase tracking-wider ${style.text}`}>{t(item.rarity)}</span>
          </div>
          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
            <span>{slot.emoji} {slotLabel(item.slot)}</span>
            {locked && <span className="rounded-full bg-slate-900/90 px-2 py-0.5 text-[9px] font-black text-slate-300">{t("slotOccupied")}</span>}
          </div>
          {!compact && comparisons.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {comparisons.map(({ key, before, after, delta }) => (
                <span
                  key={key}
                  className={`inline-flex items-baseline gap-1 rounded-md border px-1.5 py-0.5 tabular-nums ${delta > 0 ? "border-emerald-400/20 bg-emerald-500/[0.08]" : "border-rose-400/20 bg-rose-500/[0.08]"}`}
                >
                  <span className="text-[8px] font-black uppercase tracking-wide text-slate-500">{STAT_EMOJI[key]} {t(`stat_${key}`)}</span>
                  <span className={`text-xs font-black ${delta > 0 ? "text-emerald-300" : "text-rose-300"}`}>
                    {delta > 0 ? "+" : ""}
                    {delta}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {before}<span className="text-slate-600">→</span><span className="text-slate-200">{after}</span>
                  </span>
                </span>
              ))}
            </div>
          )}
          {!compact && comparisons.length === 0 && stats.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs font-semibold text-slate-200">
              {stats.map(({ key, negative, line }) => (
                <span key={key} className={negative ? "text-rose-400" : "text-emerald-300"}>
                  {line}
                </span>
              ))}
            </div>
          )}
          {!compact && item.passive && (
            <div className="mt-1 text-xs font-medium text-amber-300">✦ {passiveLabel(item.passive)}</div>
          )}
        </div>
      </div>
      {selected && !locked && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 flex items-center justify-center rounded-2xl bg-emerald-950/70">
          <span className="rounded-full bg-emerald-500/90 px-3 py-1.5 text-xs font-black text-white">{t("choiceLocked")}</span>
        </motion.div>
      )}
    </motion.button>
  );
}
