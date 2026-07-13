"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { DraftOffer, RoomSnapshot } from "@/lib/game/types";
import { DRAFT_TIME_MS, SLOTS, SLOT_META } from "@/lib/game/types";
import ItemCard from "./ItemCard";
import AvatarPortrait from "./AvatarPortrait";
import { useI18n } from "@/lib/i18n";
import TimerBar from "./TimerBar";
import { sfx } from "@/lib/sound";
import { BUILD_STAT_KEYS, buildStats } from "@/lib/game/buildStats";

interface Props {
  snapshot: RoomSnapshot;
  offer: DraftOffer | null;
  playerId: string;
  onPick: (itemId: string | null) => void;
}

export default function DraftPhase({ snapshot, offer, playerId, onPick }: Props) {
  const { t } = useI18n();
  const me = snapshot.players.find((p) => p.id === playerId);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    setPendingId(null);
  }, [offer?.round, offer?.picked]);

  useEffect(() => {
    if (!pendingId) return;
    const timer = setTimeout(() => setPendingId(null), 4000);
    return () => clearTimeout(timer);
  }, [pendingId]);

  const pick = (itemId: string | null) => {
    if (pendingId) return;
    setPendingId(itemId ?? "skip");
    sfx.pick();
    onPick(itemId);
  };

  const pendingItem = offer?.items.find((item) => item.id === pendingId);
  const displayedStats = useMemo(() => {
    const equipment = { ...(me?.equipment ?? {}) };
    if (pendingItem) equipment[pendingItem.slot] = pendingItem;
    return buildStats(equipment);
  }, [me?.equipment, pendingItem]);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-black">
          {t("draft")} <span className="text-indigo-300">{snapshot.draftRound}</span>
          <span className="text-slate-500">/{snapshot.totalDraftRounds}</span>
        </h2>
        <div className="flex gap-1.5">
          {SLOTS.map((s) => (
            <div
              key={s}
              title={s}
              className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg ${
                me?.equipment[s] ? "bg-indigo-500/30 ring-1 ring-indigo-400/50" : "bg-white/5 opacity-40"
              }`}
            >
              {me?.equipment[s]?.emoji ?? SLOT_META[s].emoji}
            </div>
          ))}
        </div>
      </div>

      <TimerBar deadline={snapshot.deadline} totalMs={DRAFT_TIME_MS} />

      <motion.section
        layout
        aria-label={t("currentStats")}
        className={`rounded-2xl border px-3 py-2.5 transition-colors ${pendingItem ? "border-emerald-400/50 bg-emerald-500/10" : "border-white/10 bg-slate-950/60"}`}
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">📊 {t("currentStats")}</div>
          <AnimatePresence mode="wait">
            {pendingItem && (
              <motion.div
                key={pendingItem.id}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-[10px] font-black uppercase tracking-wider text-emerald-300"
              >
                {t("statsUpdated")}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="grid grid-cols-3 gap-x-2 gap-y-1.5">
          {BUILD_STAT_KEYS.map((key) => (
            <motion.div
              key={key}
              animate={pendingItem?.stats[key] ? { scale: [1, 1.08, 1], color: ["#e2e8f0", "#6ee7b7", "#e2e8f0"] } : undefined}
              className="flex items-baseline justify-between gap-1 rounded-lg bg-white/[0.045] px-2 py-1 text-xs"
            >
              <span className="truncate text-[9px] font-black text-slate-500">{t(`stat_${key}`)}</span>
              <span className="font-display font-black tabular-nums text-slate-200">{Math.round(displayedStats[key])}</span>
            </motion.div>
          ))}
        </div>
      </motion.section>

      <AnimatePresence mode="wait">
        {offer && !offer.picked ? (
          <motion.div
            key={`offer-${offer.round}`}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            className="space-y-2.5"
          >
            <p className="text-center text-sm text-slate-400">{t("pickOne")}</p>
            {offer.items.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
              >
                <ItemCard
                  item={item}
                  locked={offer.lockedSlots.includes(item.slot)}
                  pending={pendingId !== null}
                  selected={pendingId === item.id}
                  onPick={() => pick(item.id)}
                />
              </motion.div>
            ))}
            {!offer.canPickAny && (
              <button onClick={() => pick(null)} disabled={pendingId !== null} className="btn-ghost w-full disabled:opacity-40">
                {t("skipRound")}
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="waiting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="card-surface flex flex-col items-center gap-4 p-8 text-center"
          >
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className="text-4xl">
              ⏳
            </motion.div>
            <p className="font-semibold">{t("lockedIn")}</p>
            <p className="text-sm text-slate-400">{t("waitingSlow")}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {snapshot.players.map((p) => (
                <span
                  key={p.id}
                  className={`flex items-center gap-1.5 rounded-full py-1 pl-1.5 pr-3 text-xs font-bold ${
                    p.hasPicked ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-slate-400"
                  }`}
                >
                  <AvatarPortrait avatarId={p.avatar} className="h-7 w-5" />
                  {p.hasPicked ? "✓" : "…"} {p.nickname}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
