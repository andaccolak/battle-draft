"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { DraftOffer, RoomSnapshot } from "@/lib/game/types";
import { DRAFT_TIME_MS, SLOTS, SLOT_META } from "@/lib/game/types";
import ItemCard from "./ItemCard";
import TimerBar from "./TimerBar";
import { sfx } from "@/lib/sound";

interface Props {
  snapshot: RoomSnapshot;
  offer: DraftOffer | null;
  playerId: string;
  onPick: (itemId: string | null) => void;
}

export default function DraftPhase({ snapshot, offer, playerId, onPick }: Props) {
  const me = snapshot.players.find((p) => p.id === playerId);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-black">
          Draft <span className="text-indigo-300">{snapshot.draftRound}</span>
          <span className="text-slate-500">/{snapshot.totalDraftRounds}</span>
        </h2>
        <div className="flex gap-1.5">
          {SLOTS.map((s) => (
            <div
              key={s}
              title={SLOT_META[s].label}
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
            <p className="text-center text-sm text-slate-400">Pick ONE item. The slot locks forever.</p>
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
                  onPick={() => {
                    sfx.pick();
                    onPick(item.id);
                  }}
                />
              </motion.div>
            ))}
            {!offer.canPickAny && (
              <button onClick={() => onPick(null)} className="btn-ghost w-full">
                😱 Every slot is taken — skip this round
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
            <p className="font-semibold">Locked in!</p>
            <p className="text-sm text-slate-400">Waiting for the slowpokes...</p>
            <div className="flex flex-wrap justify-center gap-2">
              {snapshot.players.map((p) => (
                <span
                  key={p.id}
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    p.hasPicked ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-slate-400"
                  }`}
                >
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
