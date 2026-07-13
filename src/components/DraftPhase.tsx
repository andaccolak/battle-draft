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
import { BASE_BUILD_STATS, BUILD_STAT_KEYS, type BuildStats } from "@/lib/game/buildStats";
import { combatProfile } from "@/lib/game/combatProfile";
import BuildStatsPanel from "./BuildStatsPanel";

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
  const baseProfile = useMemo(() => combatProfile({}, null, null), []);
  const currentProfile = useMemo(() => combatProfile(me?.equipment ?? {}, null, null), [me?.equipment]);
  const currentStats = currentProfile.stats;
  const displayedProfile = useMemo(() => {
    const equipment = { ...(me?.equipment ?? {}) };
    if (pendingItem) equipment[pendingItem.slot] = pendingItem;
    return combatProfile(equipment, null, null);
  }, [me?.equipment, pendingItem]);
  const displayedStats = displayedProfile.stats;
  const projectedStats = useMemo(() => {
    const projections: Record<string, BuildStats> = {};
    for (const item of offer?.items ?? []) {
      projections[item.id] = combatProfile({ ...(me?.equipment ?? {}), [item.slot]: item }, null, null).stats;
    }
    return projections;
  }, [me?.equipment, offer?.items]);
  const highlightedStats = useMemo(
    () => BUILD_STAT_KEYS.filter((key) => displayedStats[key] !== currentStats[key]),
    [currentStats, displayedStats]
  );

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
                  currentStats={currentStats}
                  projectedStats={projectedStats[item.id]}
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

      <BuildStatsPanel
        stats={displayedStats}
        baseline={BASE_BUILD_STATS}
        modifierLabel={t("modifierShort")}
        highlighted={highlightedStats}
        profile={displayedProfile}
        baselineProfile={baseProfile}
      />
    </div>
  );
}
