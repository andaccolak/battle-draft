"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { LuckOffer, RoomSnapshot } from "@/lib/game/types";
import { LUCK_TIME_MS } from "@/lib/game/types";
import TimerBar from "./TimerBar";
import AvatarPortrait from "./AvatarPortrait";
import { useI18n } from "@/lib/i18n";
import { sfx } from "@/lib/sound";
import { BUILD_STAT_KEYS } from "@/lib/game/buildStats";
import { combatProfile } from "@/lib/game/combatProfile";
import BuildStatsPanel from "./BuildStatsPanel";

interface Props {
  snapshot: RoomSnapshot;
  luckOffer: LuckOffer | null;
  playerId: string;
  onPick: (cardId: string) => void;
}

export default function LuckPhase({ snapshot, luckOffer, playerId, onPick }: Props) {
  const { t, cardText } = useI18n();
  const [pendingCardId, setPendingCardId] = useState<string | null>(null);
  const me = snapshot.players.find((player) => player.id === playerId);
  const claims = useMemo(() => new Map((luckOffer?.claims ?? []).map((c) => [c.id, c])), [luckOffer?.claims]);

  useEffect(() => {
    setPendingCardId(null);
  }, [luckOffer?.picked]);

  useEffect(() => {
    if (!pendingCardId) return;
    const timer = setTimeout(() => setPendingCardId(null), 4000);
    return () => clearTimeout(timer);
  }, [pendingCardId]);

  const pick = (cardId: string) => {
    if (pendingCardId) return;
    setPendingCardId(cardId);
    sfx.legendary();
    onPick(cardId);
  };
  const pendingCard = luckOffer?.cards.find((card) => card.id === pendingCardId);
  const selectedCard = me?.luckCard ?? pendingCard;
  const equipmentProfile = useMemo(() => combatProfile(me?.equipment ?? {}, null, null), [me?.equipment]);
  const equipmentStats = equipmentProfile.stats;
  const displayedProfile = useMemo(
    () => combatProfile(me?.equipment ?? {}, selectedCard, null),
    [me?.equipment, selectedCard]
  );
  const displayedStats = displayedProfile.stats;
  const highlightedStats = useMemo(
    () => BUILD_STAT_KEYS.filter((key) => displayedStats[key] !== equipmentStats[key]),
    [displayedStats, equipmentStats]
  );

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <div className="text-center">
        <h2 className="font-display text-3xl font-black">
          {t("luckTitle1")} <span className="text-fuchsia-300">{t("luckTitle2")}</span>
        </h2>
        <p className="mt-1 text-sm text-slate-400">{t("luckSub")}</p>
      </div>

      <TimerBar deadline={snapshot.deadline} totalMs={LUCK_TIME_MS} />

      <AnimatePresence mode="wait">
        {luckOffer && luckOffer.mode === "chaos" ? (
          <motion.div key="chaos-cards" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            <p className="text-center text-xs font-bold text-amber-300">⚡ {t("chaosHint")}</p>
            <div className="grid grid-cols-2 gap-1.5">
              {luckOffer.cards.map((card, i) => {
                const claim = claims.get(card.id);
                const disabled = !!claim || luckOffer.picked || pendingCardId !== null;
                return (
                  <motion.button
                    key={card.id}
                    initial={{ opacity: 0, rotateY: 90 }}
                    animate={{ opacity: 1, rotateY: 0 }}
                    transition={{ delay: 0.1 + i * 0.05, duration: 0.3 }}
                    whileTap={disabled ? undefined : { scale: 0.95 }}
                    onClick={disabled ? undefined : () => pick(card.id)}
                    disabled={disabled}
                    className={`relative overflow-hidden rounded-xl border-2 border-fuchsia-400/40 bg-gradient-to-br from-fuchsia-500/15 to-indigo-500/15 p-2 text-left ${
                      claim && !claim.mine
                        ? "grayscale"
                        : claim?.mine
                          ? "border-emerald-300 ring-2 ring-emerald-300/40"
                          : pendingCardId === card.id
                            ? "ring-2 ring-indigo-300/60"
                            : ""
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg leading-none">{card.emoji}</span>
                      <span className="min-w-0 flex-1 truncate text-[11px] font-black leading-tight">{cardText(card).name}</span>
                    </div>
                    <div className="mt-1 line-clamp-2 text-[9px] leading-snug text-slate-300">{cardText(card).description}</div>
                    {claim && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-center bg-slate-950/90 px-2 py-[3px]"
                      >
                        <span className={`truncate text-[11px] font-black ${claim.mine ? "text-emerald-300" : "text-rose-300"}`}>
                          {claim.mine ? `✓ ${t("chaosYours")}` : `🔒 ${claim.by}`}
                        </span>
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>
            {luckOffer.picked && <p className="text-center text-xs text-slate-400">{t("chaosWaiting")}</p>}
          </motion.div>
        ) : luckOffer && !luckOffer.picked ? (
          <motion.div key="cards" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            {luckOffer.cards.map((card, i) => (
              <motion.button
                key={card.id}
                initial={{ opacity: 0, rotateY: 90 }}
                animate={{ opacity: 1, rotateY: 0 }}
                transition={{ delay: 0.15 + i * 0.15, duration: 0.4 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => pick(card.id)}
                disabled={pendingCardId !== null}
                className={`relative w-full rounded-2xl border-2 border-fuchsia-400/40 bg-gradient-to-br from-fuchsia-500/15 to-indigo-500/15 p-5 text-left transition active:scale-95 disabled:active:scale-100 ${
                  pendingCardId === card.id ? "border-emerald-300 bg-emerald-500/15 ring-2 ring-emerald-300/40" : pendingCardId ? "opacity-45" : ""
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{card.emoji}</span>
                  <div>
                    <div className="font-display text-lg font-black">{cardText(card).name}</div>
                    <div className="mt-0.5 text-sm text-slate-300">{cardText(card).description}</div>
                  </div>
                </div>
                {pendingCardId === card.id && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 flex items-center justify-center rounded-2xl bg-emerald-950/70">
                    <span className="rounded-full bg-emerald-500/90 px-3 py-1.5 text-xs font-black text-white">{t("choiceLocked")}</span>
                  </motion.div>
                )}
              </motion.button>
            ))}
          </motion.div>
        ) : (
          <motion.div key="picked" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-surface p-8 text-center">
            <div className="text-4xl">🎴</div>
            <p className="mt-3 font-semibold">{t("fateSealed")}</p>
            <p className="mt-1 text-sm text-slate-400">{t("waitingGamble")}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
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

      {luckOffer?.picked && me?.luckCard && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-2xl border border-fuchsia-400/25 bg-fuchsia-500/10 p-3 text-left"
        >
          <span className="text-3xl">{me.luckCard.emoji}</span>
          <div className="min-w-0">
            <div className="font-display text-sm font-black text-fuchsia-100">{cardText(me.luckCard).name}</div>
            <div className="mt-0.5 text-xs leading-snug text-slate-300">{cardText(me.luckCard).description}</div>
          </div>
        </motion.div>
      )}

      <BuildStatsPanel
        stats={displayedStats}
        baseline={equipmentStats}
        modifierLabel={t("luckShort")}
        highlighted={highlightedStats}
        accent="fuchsia"
        profile={displayedProfile}
        baselineProfile={equipmentProfile}
      />
    </div>
  );
}
