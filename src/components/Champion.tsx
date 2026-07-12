"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { RoomSnapshot } from "@/lib/game/types";
import { sfx } from "@/lib/sound";
import AvatarPortrait from "./AvatarPortrait";
import { avatarThumb } from "@/lib/three/avatarThumbs";
import { useI18n } from "@/lib/i18n";

interface Props {
  snapshot: RoomSnapshot;
  playerId: string;
  onPlayAgain: () => void;
  onShout: () => void;
}

async function buildShareImage(snapshot: RoomSnapshot, championLabel: string, headline: string): Promise<Blob | null> {
  const champion = snapshot.players.find((p) => !p.eliminated && !p.spectator);
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const bg = ctx.createLinearGradient(0, 0, 0, 1350);
  bg.addColorStop(0, "#1e1b4b");
  bg.addColorStop(1, "#0f172a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1080, 1350);
  ctx.textAlign = "center";
  if (champion) {
    const url = await avatarThumb(champion.avatar, champion.equipment.weapon, champion.equipment, []);
    if (url) {
      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = url;
      });
      if (img.width > 0) ctx.drawImage(img, 540 - 210, 90, 420, 558);
    }
  }
  ctx.font = "120px sans-serif";
  ctx.fillText("👑", 540, 740);
  ctx.fillStyle = "#fbbf24";
  ctx.font = "bold 44px sans-serif";
  ctx.fillText(championLabel.toUpperCase(), 540, 810);
  ctx.font = "900 96px sans-serif";
  const grad = ctx.createLinearGradient(240, 0, 840, 0);
  grad.addColorStop(0, "#fcd34d");
  grad.addColorStop(1, "#fb923c");
  ctx.fillStyle = grad;
  ctx.fillText(snapshot.champion ?? champion?.nickname ?? "???", 540, 920);
  const standings = [...snapshot.players]
    .filter((p) => !p.spectator)
    .sort((a, b) => Number(a.eliminated) - Number(b.eliminated) || b.wins - a.wins)
    .slice(0, 5);
  ctx.font = "bold 40px sans-serif";
  standings.forEach((p, i) => {
    const y = 1010 + i * 58;
    ctx.fillStyle = i === 0 ? "#fcd34d" : "#cbd5e1";
    ctx.fillText(`${i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "💀"}  ${p.nickname}  ·  ${p.wins}`, 540, y);
  });
  ctx.fillStyle = "#818cf8";
  ctx.font = "bold 36px sans-serif";
  ctx.fillText(headline, 540, 1310);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

export default function Champion({ snapshot, playerId, onPlayAgain, onShout }: Props) {
  const [shouted, setShouted] = useState(false);
  const [shareState, setShareState] = useState<"idle" | "busy" | "copied" | "saved">("idle");

  const share = async () => {
    if (shareState === "busy") return;
    setShareState("busy");
    const blob = await buildShareImage(snapshot, t("champion"), "battle-draft.vercel.app");
    if (!blob) {
      setShareState("idle");
      return;
    }
    const file = new File([blob], "battle-draft-result.png", { type: "image/png" });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        setShareState("idle");
        return;
      }
    } catch {}
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setShareState("copied");
    } catch {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "battle-draft-result.png";
      a.click();
      setShareState("saved");
    }
    setTimeout(() => setShareState("idle"), 2500);
  };
  const { t } = useI18n();
  const isHost = snapshot.hostId === playerId;
  const champion = snapshot.players.find((p) => !p.eliminated);
  const isMe = champion?.id === playerId;

  useEffect(() => {
    sfx.victory();
  }, []);

  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center gap-6 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1, rotate: [0, -8, 8, 0] }}
        transition={{ type: "spring", damping: 8 }}
        className="flex flex-col items-center"
      >
        {champion && (
          <AvatarPortrait avatarId={champion.avatar} weapon={champion.equipment.weapon} equipment={champion.equipment} className="h-40 w-[7.2rem] drop-shadow-2xl" />
        )}
      </motion.div>
      <div>
        <motion.div
          initial={{ y: -24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35, type: "spring", damping: 9 }}
          className="text-5xl drop-shadow-[0_3px_10px_rgba(251,191,36,0.55)]"
        >
          👑
        </motion.div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-sm font-bold uppercase tracking-[0.3em] text-amber-400">
          {t("champion")}
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="font-display mt-2 bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-6xl font-black text-transparent"
        >
          {snapshot.champion ?? champion?.nickname ?? "???"}
        </motion.h2>
        {isMe && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-3 text-lg font-bold text-emerald-300">
            {t("thatsYou")}
          </motion.p>
        )}
      </div>

      <div className="card-surface w-full p-4">
        <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">{t("finalStandings")}</div>
        <div className="space-y-1.5">
          {[...snapshot.players]
            .sort(
              (a, b) =>
                Number(a.spectator ?? false) - Number(b.spectator ?? false) ||
                Number(a.eliminated) - Number(b.eliminated) ||
                b.wins - a.wins
            )
            .map((p, i) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm">
                <span className="flex items-center gap-2 font-semibold">
                  <AvatarPortrait avatarId={p.avatar} className="h-9 w-7" />
                  {p.spectator ? "👀" : i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "💀"} {p.isBot ? "🤖 " : ""}
                  {p.nickname}
                </span>
                <span className="text-xs text-slate-400">
                  {p.spectator ? "" : `${p.wins} ${p.wins === 1 ? t("win") : t("wins")}`}
                </span>
              </div>
            ))}
        </div>
      </div>

      <button onClick={() => void share()} disabled={shareState === "busy"} className="btn-ghost w-full text-base">
        {shareState === "copied" ? t("shareCopied") : shareState === "saved" ? t("shareSaved") : t("shareResultBtn")}
      </button>

      {snapshot.bracket && snapshot.bracket.some((r) => r.matches.some((m) => m.winner)) && (
        <div className="card-surface w-full p-4">
          <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">🏁 {t("matchHistory")}</div>
          <div className="max-h-40 space-y-1 overflow-y-auto">
            {snapshot.bracket
              .flatMap((r) => r.matches)
              .filter((m) => m.winner && m.a && m.b)
              .map((m, i) => (
                <div key={i} className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs">
                  <span className={`min-w-0 flex-1 truncate text-right ${m.winner === m.a ? "font-bold text-emerald-300" : "text-slate-500"}`}>
                    {m.a}
                  </span>
                  <span className="shrink-0 text-[9px] font-black text-slate-600">vs</span>
                  <span className={`min-w-0 flex-1 truncate ${m.winner === m.b ? "font-bold text-emerald-300" : "text-slate-500"}`}>{m.b}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {isHost ? (
        <button onClick={onPlayAgain} className="btn-primary w-full text-lg">
          {t("oneMoreGame")}
        </button>
      ) : (
        <button
          onClick={() => {
            if (shouted) return;
            onShout();
            setShouted(true);
            setTimeout(() => setShouted(false), 30000);
          }}
          disabled={shouted}
          className={`btn-primary w-full text-lg ${shouted ? "opacity-50" : ""}`}
        >
          {shouted ? t("shoutSent") : t("shoutBtn")}
        </button>
      )}
    </div>
  );
}
