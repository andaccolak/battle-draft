"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { motion } from "framer-motion";
import type { RoomSnapshot } from "@/lib/game/types";
import { ARENA_MAPS } from "@/lib/game/types";
import { AVATARS, MODELED_AVATARS } from "@/lib/game/avatars";
import AvatarPortrait from "./AvatarPortrait";
import { useI18n } from "@/lib/i18n";

const Avatar3DThumb = dynamic(() => import("./Avatar3DThumb"), { ssr: false });

const MAP_EMOJI: Record<string, string> = {
  colosseum: "🏟️",
  dungeon: "🏰"
};

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

function ShareButton({ label, copiedLabel, icon, getText }: { label: string; copiedLabel: string; icon: string; getText: () => string }) {
  const [copied, setCopied] = useState(false);
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={() => {
        void copyText(getText()).then((ok) => {
          if (!ok) return;
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        });
      }}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
        copied ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-300" : "border-white/10 bg-white/5 text-slate-200"
      }`}
    >
      <span>{copied ? "✅" : icon}</span>
      {copied ? copiedLabel : label}
      {!copied && <span className="text-xs opacity-60">📋</span>}
    </motion.button>
  );
}

interface Props {
  snapshot: RoomSnapshot;
  playerId: string;
  onStart: () => void;
  onAvatar: (avatarId: string) => void;
  onMap: (mapId: string) => void;
}

export default function Lobby({ snapshot, playerId, onStart, onAvatar, onMap }: Props) {
  const { t } = useI18n();
  const isHost = snapshot.hostId === playerId;
  const solo = snapshot.players.length === 1;
  const me = snapshot.players.find((p) => p.id === playerId);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <div className="card-surface p-6 text-center">
        <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">{t("roomCode")}</div>
        <div className="font-display mt-1 text-5xl font-black tracking-[0.25em] text-indigo-300">{snapshot.code}</div>
        <p className="mt-2 text-sm text-slate-400">{t("joinHint")}</p>
        <div className="mt-4 flex gap-2">
          <ShareButton
            label={t("copyLink")}
            copiedLabel={t("copied")}
            icon="🔗"
            getText={() => `${window.location.origin}/room/${snapshot.code}`}
          />
          <ShareButton label={t("copyCode")} copiedLabel={t("copied")} icon="🔢" getText={() => snapshot.code} />
        </div>
      </div>

      <div className="card-surface p-5">
        <h2 className="mb-3 font-bold">{t("chooseFighter")}</h2>
        <div className="grid grid-cols-5 gap-1.5">
          {AVATARS.map((av) => {
            const selected = me?.avatar === av.id;
            return (
              <motion.button
                key={av.id}
                whileTap={{ scale: 0.92 }}
                onClick={() => onAvatar(av.id)}
                className={`flex flex-col items-center rounded-xl border-2 p-1.5 transition ${
                  selected ? "border-indigo-400 bg-indigo-500/20" : "border-white/10 bg-white/5"
                }`}
              >
                {selected && MODELED_AVATARS.has(av.id) ? (
                  <Avatar3DThumb avatarId={av.id} className="h-16 w-12" />
                ) : (
                  <AvatarPortrait avatarId={av.id} className="h-16 w-12" />
                )}
                <span className={`mt-0.5 text-[10px] font-bold ${selected ? "text-indigo-300" : "text-slate-400"}`}>
                  {t(`avatar_${av.id}`)}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="card-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">{t("chooseMap")}</h2>
          {!isHost && <span className="text-xs text-slate-500">{t("mapHostOnly")}</span>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {ARENA_MAPS.map((mapId) => {
            const selected = snapshot.arenaMap === mapId;
            return (
              <motion.button
                key={mapId}
                whileTap={isHost ? { scale: 0.95 } : undefined}
                disabled={!isHost}
                onClick={() => onMap(mapId)}
                className={`flex items-center justify-center gap-2 rounded-xl border-2 py-3 font-bold transition ${
                  selected ? "border-indigo-400 bg-indigo-500/20 text-indigo-200" : "border-white/10 bg-white/5 text-slate-300"
                } ${isHost ? "" : "cursor-default opacity-80"}`}
              >
                <span className="text-xl">{MAP_EMOJI[mapId]}</span>
                {t(`map_${mapId}`)}
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="card-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">{t("warriors")}</h2>
          <span className="text-sm font-semibold text-slate-400">{snapshot.players.length}/8</span>
        </div>
        <div className="space-y-2">
          {snapshot.players.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-2"
            >
              <AvatarPortrait avatarId={p.avatar} className="h-12 w-9" />
              <span className="flex-1 font-semibold">
                {p.isBot ? "🤖 " : p.isHost ? "👑 " : ""}
                {p.nickname}
              </span>
              {p.id === playerId && <span className="text-xs font-bold text-indigo-300">{t("you")}</span>}
              {!p.connected && !p.isBot && <span className="text-xs text-rose-400">{t("offline")}</span>}
            </motion.div>
          ))}
        </div>
      </div>

      {isHost ? (
        <button onClick={onStart} className="btn-primary text-lg">
          {solo ? t("startWithBots") : t("startDraft")}
        </button>
      ) : (
        <div className="text-center text-sm text-slate-400">
          <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.8 }}>
            {t("waitingHost")}
          </motion.span>
        </div>
      )}
    </div>
  );
}
