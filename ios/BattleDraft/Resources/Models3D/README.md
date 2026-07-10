# 3D model drop-in folder

Any `.usdz` placed here is bundled into the app and picked up automatically by naming convention — no code changes needed. If a file is missing, the app renders a stylized placeholder instead, so the game is always playable.

## Naming convention

| File | Used for |
| --- | --- |
| `character_<avatarId>.usdz` | Fighter model. Avatar ids: blaze, shadow, viking, ronin, corsair, mystic, golem, punk, valkyrie, monk, frost, minotaur |
| `weapon_<itemId>.usdz` | Weapon prop (e.g. `weapon_w_rusty_sword.usdz`) — reserved for the attachment phase |
| `arena_<themeId>.usdz` | Arena terrain — reserved for the terrain phase |

## Export requirements (Meshy → Reality Converter → here)

- Height ≈ 1.7 m for characters (the app normalizes scale from bounds, but correct scale avoids distortion)
- Pivot at the feet, character facing +Z
- Rigged characters: bake animations into the USDZ; the first animation is treated as idle and looped
- Keep each character under ~15 MB (app size!) — Meshy's default polycount is fine, use its "low" texture size
