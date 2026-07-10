# Meshy AI asset pipeline for Battle Draft iOS

How to turn Meshy generations into in-game fighters, weapons, and arenas. The app already contains the loading system: drop correctly named `.usdz` files into `BattleDraft/Resources/Models3D/` and rebuild — no code changes.

## 1. Two ways to drive Meshy

**A. Web app (recommended to start).** meshy.ai → Text to 3D → generate → pick the best of 4 previews → Refine → export. You curate quality by eye, which matters more than automation early on.

**B. API / script.** `ios/scripts/meshy-generate.mjs` automates preview → refine → download into Models3D:

```bash
MESHY_API_KEY=msy_xxx node ios/scripts/meshy-generate.mjs character_blaze \
  "stylized low-poly fantasy warrior, spiky red hair, crimson leather armor with gold trim, heroic proportions, game-ready, T-pose"
```

**C. MCP server.** If you add a Meshy MCP server to Claude Code (`claude mcp add` — check meshy.ai docs for their current MCP endpoint or community server), Claude can generate/poll/download models inside a session. The script in B is the fallback that always works with just an API key.

## 2. Character workflow (the important one)

1. **Generate** with a prompt from the table below. Always include: `stylized low-poly, game-ready character, T-pose, symmetrical, single mesh, feet on ground`.
2. **Rig & animate in Meshy**: open the refined model → Auto-Rigging → apply animation presets. Needed set per character (map to the app's poses):
   - idle (breathing/stance) — REQUIRED, looped by the app
   - attack (melee swing or shoot)
   - hit (flinch)
   - dodge (sidestep)
   - death (fall)
   - victory (cheer)
3. **Export** as FBX (with animations) or USDZ if offered.
4. **Convert** to USDZ with Apple Reality Converter (free, drag & drop) if you got FBX/GLB. Alternative animations source: Mixamo (upload the T-pose FBX, pick fight animations, retarget automatically).
5. **Drop** into `BattleDraft/Resources/Models3D/` as `character_<avatarId>.usdz`, rebuild, done. Today the app loops the first animation as idle; per-pose animation switching is the next code step once the first rigged model exists.

## 3. Prompt table for the 12 fighters

| avatarId | Prompt core |
| --- | --- |
| blaze | warrior with spiky flame-red hair, crimson leather armor, gold trim |
| shadow | hooded ninja assassin, dark blue-grey cloak, face in shadow |
| viking | burly viking with long blond hair and braided beard, brown fur armor |
| ronin | samurai ronin with black top-knot, purple lamellar armor, calm stance |
| corsair | pirate captain with red bandana, dark coat, scarred grin |
| mystic | sorceress with long violet hair, deep purple robe, glowing runes |
| golem | stone golem, grey rock body with green crystal veins |
| punk | street brawler with green mohawk, black jacket, cyan accents |
| valkyrie | valkyrie shieldmaiden, white-silver hair, teal and gold armor |
| monk | bald warrior monk, orange robes, wooden prayer beads |
| frost | ice warrior with pale blue skin, white frost hair, blue armor |
| minotaur | minotaur brute with bull horns, brown hide, heavy shoulders |

Style suffix for all: `stylized low-poly RPG game character, vibrant colors, clean silhouette, T-pose, game-ready`.

## 4. Weapons (16), arenas (themes)

- Weapons: `weapon_<itemId>.usdz` (ids in `src/lib/game/items.ts`). Prompt e.g. `stylized low-poly rusty iron sword, fantasy RPG weapon, single object, centered`. No rigging needed. Wire-up to hand bones is a planned code task — generate them anytime, they'll sit ready in the folder.
- Arenas: one terrain per theme group (see `ArenaTheme.swift`): default colosseum, rainy stone arena, snowy arena, desert/sun arena, cursed night arena, poison swamp arena. `arena_<themeId>.usdz`, e.g. `stylized low-poly circular battle arena, ancient colosseum ruins, fantasy RPG environment, 10m diameter`.

## 5. Budget & QA checklist

- Keep characters ≤ ~15 MB, weapons ≤ 3 MB, arenas ≤ 25 MB (USDZ, after Meshy "low" texture setting).
- Check in Reality Converter: correct scale (~1.7 m tall), pivot at feet, textures present, animation plays.
- Test on device — Metal renders PBR differently than Meshy's viewer.
