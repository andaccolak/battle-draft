"use client";

import { useEffect, useState } from "react";
import type { Item } from "@/lib/game/types";
import { avatarById } from "@/lib/game/avatars";
import { avatarThumb } from "@/lib/three/avatarThumbs";
import CharacterSprite from "./CharacterSprite";

interface Props {
  avatarId: string | undefined;
  weapon?: Item;
  flip?: boolean;
  className?: string;
}

export default function AvatarPortrait({ avatarId, weapon, flip, className }: Props) {
  const avatar = avatarById(avatarId);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setUrl(null);
    void avatarThumb(avatar.id, weapon).then((u) => {
      if (active) setUrl(u);
    });
    return () => {
      active = false;
    };
  }, [avatar.id, weapon]);

  if (!url) return <CharacterSprite avatar={avatar} className={className} />;
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
