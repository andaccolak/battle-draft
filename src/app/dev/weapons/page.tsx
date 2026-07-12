"use client";

import { ITEMS } from "@/lib/game/items";
import AvatarPortrait from "@/components/AvatarPortrait";

export default function WeaponsDevPage() {
  const weapons = ITEMS.filter((i) => i.slot === "weapon");
  return (
    <div className="grid grid-cols-5 gap-2 bg-slate-900 p-4">
      {weapons.map((w) => (
        <div key={w.id} className="flex flex-col items-center">
          <AvatarPortrait avatarId="knight" weapon={w} className="h-40 w-32" />
          <div className="text-center text-[10px] text-white">{w.id}</div>
        </div>
      ))}
    </div>
  );
}
