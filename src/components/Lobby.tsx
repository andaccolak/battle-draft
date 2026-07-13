"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { motion } from "framer-motion";
import type { RoomSnapshot } from "@/lib/game/types";
import { ARENA_MAPS, DRAFT_MODES, MATCH_MODES, TOURNEY_MODES } from "@/lib/game/types";
import { AVATARS, MODELED_AVATARS } from "@/lib/game/avatars";
import AvatarPortrait from "./AvatarPortrait";
import { useI18n } from "@/lib/i18n";
import { setNickname as storeNickname } from "@/lib/session";

const Avatar3DThumb = dynamic(() => import("./Avatar3DThumb"), { ssr: false });

const MAP_EMOJI: Record<string, string> = {
  colosseum: "🏟️",
  dungeon: "🏰",
  graveyard: "🪦"
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

function CopyCodeIcon({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      onClick={() => {
        void copyText(code).then((ok) => {
          if (!ok) return;
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        });
      }}
      className="rounded-lg p-1.5 text-2xl leading-none transition hover:bg-white/10"
    >
      {copied ? "✅" : "📋"}
    </motion.button>
  );
}

function ShareLinkButton({ label, copiedLabel, getUrl }: { label: string; copiedLabel: string; getUrl: () => string }) {
  const [copied, setCopied] = useState(false);
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={() => {
        const url = getUrl();
        if (navigator.share) {
          void navigator.share({ url }).catch(() => {});
          return;
        }
        void copyText(url).then((ok) => {
          if (!ok) return;
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        });
      }}
      className={`w-full rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
        copied ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-300" : "border-white/10 bg-white/5 text-slate-200"
      }`}
    >
      {copied ? copiedLabel : label}
    </motion.button>
  );
}

interface Props {
  snapshot: RoomSnapshot;
  playerId: string;
  onStart: () => void;
  onAvatar: (avatarId: string) => void;
  onMap: (mapId: string) => void;
  onMode: (modeId: string) => void;
  onTourney: (modeId: string) => void;
  onDraftMode: (modeId: string) => void;
  onRename: (nickname: string) => void;
  onKick: (targetId: string) => void;
  onShout: () => void;
}

export default function Lobby({ snapshot, playerId, onStart, onAvatar, onMap, onMode, onTourney, onDraftMode, onRename, onKick, onShout }: Props) {
  const [shouted, setShouted] = useState(false);
  const [editingNick, setEditingNick] = useState<string | null>(null);
  const { t } = useI18n();
  const isHost = snapshot.hostId === playerId;
  const solo = snapshot.players.length === 1;
  const me = snapshot.players.find((p) => p.id === playerId);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <div className="card-surface p-6 text-center">
        <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">{t("roomCode")}</div>
        <div className="mt-1 flex items-center justify-center gap-2">
          <div className="font-display text-5xl font-black tracking-[0.25em] text-indigo-300">{snapshot.code}</div>
          <CopyCodeIcon code={snapshot.code} />
        </div>
        <p className="mt-2 text-sm text-slate-400">{t("joinHint")}</p>
        <div className="mt-4">
          <ShareLinkButton label={t("copyLink")} copiedLabel={t("copied")} getUrl={() => `${window.location.origin}/room/${snapshot.code}`} />
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

      {!isHost && (
        <div className="card-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">{t("roomSettings")}</h2>
            <span className="text-xs text-slate-500">{t("mapHostOnly")}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-indigo-400/40 bg-indigo-500/15 px-3 py-1.5 text-sm font-bold text-indigo-200">
              <span>{MAP_EMOJI[snapshot.arenaMap]}</span>
              {t(`map_${snapshot.arenaMap}`)}
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-indigo-400/40 bg-indigo-500/15 px-3 py-1.5 text-sm font-bold text-indigo-200">
              <span>{snapshot.tourneyMode === "knockout" ? "🏆" : "📊"}</span>
              {t(`tourney_${snapshot.tourneyMode}`)}
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-indigo-400/40 bg-indigo-500/15 px-3 py-1.5 text-sm font-bold text-indigo-200">
              <span>{snapshot.matchMode === "single" ? "⚔️" : "🔁"}</span>
              {t(`mode_${snapshot.matchMode}`)}
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-indigo-400/40 bg-indigo-500/15 px-3 py-1.5 text-sm font-bold text-indigo-200">
              <span>{snapshot.draftMode === "chaos" ? "⚡" : "🃏"}</span>
              {t(`draft_${snapshot.draftMode}`)}
            </span>
          </div>
        </div>
      )}

      {isHost && (
      <div className="card-surface space-y-3 p-4">
        <h2 className="font-bold">{t("roomSettings")}</h2>
        {[
          {
            label: t("chooseMap"),
            cols: "grid-cols-3",
            options: ARENA_MAPS.map((id) => ({ id, emoji: MAP_EMOJI[id] ?? "🏟️", text: t(`map_${id}`), selected: snapshot.arenaMap === id, onTap: () => onMap(id) }))
          },
          {
            label: t("chooseDraft"),
            cols: "grid-cols-2",
            options: DRAFT_MODES.map((id) => ({ id, emoji: id === "chaos" ? "⚡" : "🃏", text: t(`draft_${id}`), selected: snapshot.draftMode === id, onTap: () => onDraftMode(id) }))
          },
          {
            label: t("chooseTourney"),
            cols: "grid-cols-2",
            options: TOURNEY_MODES.map((id) => ({ id, emoji: id === "knockout" ? "🏆" : "📊", text: t(`tourney_${id}`), selected: snapshot.tourneyMode === id, onTap: () => onTourney(id) }))
          },
          {
            label: t("chooseMode"),
            cols: "grid-cols-2",
            options: MATCH_MODES.map((id) => ({ id, emoji: id === "single" ? "⚔️" : "🔁", text: t(`mode_${id}`), selected: snapshot.matchMode === id, onTap: () => onMode(id) }))
          }
        ].map((row) => (
          <div key={row.label}>
            <div className="mb-1 text-[10px] font-black uppercase tracking-wider text-slate-500">{row.label}</div>
            <div className={`grid gap-1.5 ${row.cols}`}>
              {row.options.map((opt) => (
                <motion.button
                  key={opt.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={opt.onTap}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-[13px] font-bold transition ${
                    opt.selected ? "border-indigo-400 bg-indigo-500/20 text-indigo-200" : "border-white/10 bg-white/5 text-slate-300"
                  }`}
                >
                  <span className="text-base">{opt.emoji}</span>
                  <span className="truncate">{opt.text}</span>
                </motion.button>
              ))}
            </div>
          </div>
        ))}
      </div>
      )}

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
              {editingNick !== null && p.id === playerId ? (
                <span className="flex flex-1 items-center gap-1.5">
                  <input
                    value={editingNick}
                    onChange={(e) => setEditingNick(e.target.value)}
                    maxLength={16}
                    autoFocus
                    className="w-full min-w-0 rounded-lg border border-indigo-400/60 bg-slate-900/80 px-2 py-1 text-sm font-semibold focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      const nick = (editingNick ?? "").trim();
                      if (nick.length >= 2) {
                        onRename(nick);
                        storeNickname(nick);
                      }
                      setEditingNick(null);
                    }}
                    className="shrink-0 rounded-lg bg-indigo-500/30 px-2 py-1 text-sm font-bold text-indigo-200"
                  >
                    ✓
                  </button>
                </span>
              ) : (
                <span className="flex-1 font-semibold">
                  {p.isBot ? "🤖 " : p.isHost ? "👑 " : ""}
                  {p.nickname}
                  {p.id === playerId && (
                    <button onClick={() => setEditingNick(p.nickname)} className="ml-1.5 text-xs opacity-70">
                      ✏️
                    </button>
                  )}
                </span>
              )}
              {p.id === playerId && editingNick === null && <span className="text-xs font-bold text-indigo-300">{t("you")}</span>}
              {!p.connected && !p.isBot && <span className="text-xs text-rose-400">{t("offline")}</span>}
              {isHost && p.id !== playerId && !p.isBot && (
                <button onClick={() => onKick(p.id)} className="shrink-0 rounded-lg px-1.5 py-0.5 text-sm text-rose-400 transition hover:bg-rose-500/20">
                  ✕
                </button>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {isHost ? (
        <button onClick={onStart} className="btn-primary text-lg">
          {solo ? t("startWithBots") : t("startDraft")}
        </button>
      ) : (
        <div className="flex flex-col items-center gap-3 text-center text-sm text-slate-400">
          <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.8 }}>
            {t("waitingHost")}
          </motion.span>
          <button
            onClick={() => {
              if (shouted) return;
              onShout();
              setShouted(true);
              setTimeout(() => setShouted(false), 30000);
            }}
            disabled={shouted}
            className={`btn-ghost w-full ${shouted ? "opacity-50" : ""}`}
          >
            {shouted ? t("shoutSent") : t("shoutStart")}
          </button>
        </div>
      )}
    </div>
  );
}
