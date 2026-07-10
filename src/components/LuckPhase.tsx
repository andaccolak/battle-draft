"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { LuckOffer, RoomSnapshot } from "@/lib/game/types";
import { LUCK_TIME_MS } from "@/lib/game/types";
import TimerBar from "./TimerBar";
import AvatarPortrait from "./AvatarPortrait";
import { useI18n } from "@/lib/i18n";
import { sfx } from "@/lib/sound";

interface Props {
  snapshot: RoomSnapshot;
  luckOffer: LuckOffer | null;
  onPick: (cardId: string) => void;
}

export default function LuckPhase({ snapshot, luckOffer, onPick }: Props) {
  const { t, cardText } = useI18n();
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
        {luckOffer && !luckOffer.picked ? (
          <motion.div key="cards" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            {luckOffer.cards.map((card, i) => (
              <motion.button
                key={card.id}
                initial={{ opacity: 0, rotateY: 90 }}
                animate={{ opacity: 1, rotateY: 0 }}
                transition={{ delay: 0.15 + i * 0.15, duration: 0.4 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  sfx.legendary();
                  onPick(card.id);
                }}
                className="w-full rounded-2xl border-2 border-fuchsia-400/40 bg-gradient-to-br from-fuchsia-500/15 to-indigo-500/15 p-5 text-left transition active:scale-95"
              >
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{card.emoji}</span>
                  <div>
                    <div className="font-display text-lg font-black">{cardText(card).name}</div>
                    <div className="mt-0.5 text-sm text-slate-300">{cardText(card).description}</div>
                  </div>
                </div>
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
    </div>
  );
}
