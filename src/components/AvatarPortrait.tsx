"use client";

import { useEffect, useState } from "react";
import type { Item, Slot } from "@/lib/game/types";
import { avatarById } from "@/lib/game/avatars";
import { avatarThumb } from "@/lib/three/avatarThumbs";

interface Props {
  avatarId: string | undefined;
  weapon?: Item;
  equipment?: Partial<Record<Slot, Item>>;
  disabledItems?: string[];
  flip?: boolean;
  className?: string;
}

export default function AvatarPortrait({ avatarId, weapon, equipment, disabledItems, flip, className }: Props) {
  const avatar = avatarById(avatarId);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setUrl(null);
    void avatarThumb(avatar.id, weapon, equipment, disabledItems ?? []).then((u) => {
      if (active) setUrl(u);
    });
    return () => {
      active = false;
    };
  }, [avatar.id, weapon, equipment, disabledItems]);

  if (!url) return <div className={className} />;
  return (
    <img
      src={url}
      alt=""
      draggable={false}
      className={`${className ?? ""} object-contain`}
      style={flip ? { transform: "scaleX(-1)" } : undefined}
    />
  );
}
