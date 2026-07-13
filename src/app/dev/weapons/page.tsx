"use client";

import { useEffect, useState } from "react";
import { ITEMS, weaponVisualKindFor, type WeaponVisualKind } from "@/lib/game/items";
import AvatarPortrait from "@/components/AvatarPortrait";

const IDLE_ANIMATIONS: Record<WeaponVisualKind, string> = {
  blade: "Idle_B",
  heavy: "Melee_2H_Idle",
  dual: "Melee_Blocking",
  shield: "Melee_Blocking",
  crossbow: "Ranged_2H_Shooting",
  bow: "Ranged_Bow_Idle",
  magic: "Ranged_Magic_Spellcasting",
  fists: "Melee_Unarmed_Idle"
};

export default function WeaponsDevPage() {
  const allWeapons = ITEMS.filter((i) => i.slot === "weapon");
  const [range, setRange] = useState({ start: 0, count: 4 });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const start = Number(params.get("start") ?? 0);
    const count = Number(params.get("count") ?? 4);
    setRange({ start: Number.isFinite(start) ? start : 0, count: Number.isFinite(count) ? count : 4 });
  }, [allWeapons.length]);

  const weapons = allWeapons.slice(range.start, range.start + range.count);
  return (
    <div className="grid grid-cols-2 gap-3 bg-slate-900 p-4 lg:grid-cols-4">
      {weapons.map((w) => (
        <div key={w.id} className="flex flex-col items-center rounded-xl border border-white/10 bg-slate-950/50 p-2">
          <div className="flex items-center justify-center">
            <AvatarPortrait avatarId="knight" weapon={w} animation={IDLE_ANIMATIONS[weaponVisualKindFor(w)]} viewAngle={-0.2} className="h-64 w-40" />
            <AvatarPortrait avatarId="knight" weapon={w} animation={IDLE_ANIMATIONS[weaponVisualKindFor(w)]} viewAngle={-Math.PI / 2} className="h-64 w-40" />
          </div>
          <div className="text-center text-xs font-bold text-white">{w.id}</div>
          <div className="text-center text-[10px] uppercase tracking-wider text-slate-400">{weaponVisualKindFor(w)}</div>
        </div>
      ))}
    </div>
  );
}
