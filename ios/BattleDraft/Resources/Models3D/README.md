# 3D model drop-in folder

Any `.usdz` placed here is bundled into the app and picked up automatically by naming convention — no code changes needed. If a file is missing, the app renders a stylized placeholder instead, so the game is always playable.

## Naming convention

| File | Used for |
| --- | --- |
| `character_<avatarId>.usdz` | Fighter model with idle animation baked in. Avatar ids: blaze, shadow, viking, ronin, corsair, mystic, golem, punk, valkyrie, monk, frost, minotaur |
| `character_<avatarId>_attack.usdz` | Attack clip on the same rig (same for `_hit`, `_dodge`, `_death`, `_victory`) — pose switching wired up in code once the first set lands |
| `weapon_<itemId>.usdz` | Weapon prop (e.g. `weapon_w_rusty_sword.usdz`) — reserved for the attachment phase |
| `arena_<themeId>.usdz` | Arena terrain — reserved for the terrain phase |

Meshy note: API and web app share the same subscription credit pool. Generate → refine → auto-rig → apply animation presets (idle, attack, hit, dodge, death, victory) → export FBX per animation → Reality Converter → USDZ with the names above.

## Export requirements (Meshy → Reality Converter → here)

- Height ≈ 1.7 m for characters (the app normalizes scale from bounds, but correct scale avoids distortion)
- Pivot at the feet, character facing +Z
- Rigged characters: bake animations into the USDZ; the first animation is treated as idle and looped
- Keep each character under ~15 MB (app size!) — Meshy's default polycount is fine, use its "low" texture size
