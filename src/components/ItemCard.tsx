"use client";

import { motion } from "framer-motion";
import type { Item, Rarity } from "@/lib/game/types";
import { SLOT_META } from "@/lib/game/types";
import { useI18n } from "@/lib/i18n";

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
}

export default function ItemCard({ item, locked = false, pending = false, selected = false, onPick, compact = false }: Props) {
  const { t, itemName, passiveLabel, slotLabel } = useI18n();
  const style = RARITY_STYLES[item.rarity];
  const slot = SLOT_META[item.slot];
  const unavailable = locked || pending;
  const STAT_ORDER = ["attack", "defense", "hp", "speed", "critChance", "critDamage", "accuracy", "dodge", "initiative"] as const;
  const stats = STAT_ORDER.filter((k) => item.stats[k] !== undefined && item.stats[k] !== 0).map(
    (k) => `${(item.stats[k] as number) > 0 ? "+" : ""}${item.stats[k]} ${t(`stat_${k}`)}`
  );

  return (
    <motion.button
      layout
      whileTap={unavailable || !onPick ? undefined : { scale: 0.96 }}
      onClick={unavailable ? undefined : onPick}
      disabled={unavailable || !onPick}
      className={`relative w-full rounded-2xl border-2 p-3 text-left transition ${style.border} ${style.bg} ${
        locked ? "grayscale opacity-60" : pending && !selected ? "opacity-45" : selected ? "border-emerald-300 bg-emerald-500/15 ring-2 ring-emerald-300/40" : item.rarity === "legendary" ? "animate-pulseGlow" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="text-3xl">{item.emoji}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-bold">{itemName(item)}</span>
            <span className={`shrink-0 text-[10px] font-black uppercase tracking-wider ${style.text}`}>{t(item.rarity)}</span>
          </div>
          <div className="text-[11px] text-slate-400">
            {slot.emoji} {slotLabel(item.slot)}
          </div>
          {!compact && (
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs font-semibold text-slate-200">
              {stats.map((line) => (
                <span key={line} className={line.startsWith("-") ? "text-rose-400" : "text-emerald-300"}>
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
      {locked && (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-slate-950/60">
          <span className="rounded-full bg-slate-900/90 px-3 py-1.5 text-xs font-bold text-slate-300">
            {t("slotOccupied")}
          </span>
        </div>
      )}
      {selected && !locked && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 flex items-center justify-center rounded-2xl bg-emerald-950/70">
          <span className="rounded-full bg-emerald-500/90 px-3 py-1.5 text-xs font-black text-white">{t("choiceLocked")}</span>
        </motion.div>
      )}
    </motion.button>
  );
}
