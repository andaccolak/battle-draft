# Battle Draft — Claude Handoff Document

This document briefs an AI assistant (or a new developer) taking over work on this codebase. Read it fully before making changes. Part I is the live session handover (current mission, status, pitfalls); Part II is the stable project spec.

---

# PART I — Session handover (updated 2026-07-11)

Written for a session with zero context. Read Part II afterward for the game rules and architecture — everything there still applies.

## What we are doing

Battle Draft is a mobile-first multiplayer web party game (Next.js on Vercel, serverless, polling — see Part II). The current mission: turn the battle phase into an **action-RPG-grade 3D presentation** using AI-generated assets from **Meshy** (the owner has a paid Meshy subscription; API and web app share the same credit pool). The owner (Rıdvan) drives Meshy generation by hand; Claude integrates. A second human developer works on this same branch in parallel (he built the QTE dodge and battle quirks) — his territory is game logic/server, ours right now is 3D presentation.

An earlier native iOS client was built and then **deliberately parked**: it lives complete on the `ios` branch (with its own `ios_handoff.md`), was reverted off this branch, and `/ios/` is gitignored here. Do not resurrect it unless the owner asks.

## What has been completed

- **LOCOMOTION + POLISH PASS (2026-07-11, evening)**: fighters no longer animate walking/running in place — `rig.moveSpeed` switches position updates from lerp to constant-speed travel matched to the clip (`WALK_SPEED` 0.55 covers the windup approach over the full windup; `RUN_SPEED` 5.5 covers the attack run-in in the 320 ms before the strike). Random idle taunts were removed (they read as flicker); idles are weapon-aware (`IDLE_POOLS`: unarmed → Melee_Unarmed_Idle, heavy → Melee_2H_Idle) and `rig.idleClip` is what one-shot clips return to. Zoom-out range grew (max zoom 1.6→2.8, camera far plane 95, fog far 62) with a per-map distance clamp (`maxDist` 18 in the dungeon so the camera never exits the walls, 34 in the colosseum). Roll/dodge pools widened (Dodge_Forward added; crit pool gained Melee_2H_Attack_Spin). Requested animation coverage: punch/kick (unarmed pool), spin (crit pool), knockdown (Hit_B), block (Melee_Blocking guard + Melee_Block_Hit), dodge roll + side step (Dodge_*), overhead (Chop/Jump_Chop), light attacks (Slice/Stab) — all wired. TRUE ARCHERY (Ranged_Bow_Draw/Release) is loaded but unused because no free KayKit pack has a bow MODEL; the owner owns Adventurers 2.0 — copy its bow GLB into `weapons/` and give `w_bow` a bow model + a `bow` visual kind to enable it.
- **COMBAT CHOREOGRAPHY PASS (2026-07-11)**: attacker and defender now animate simultaneously and in sync. New `guard` pose (Melee_Blocking loop) — the defender guards during the enemy windup instead of idling. On attack beats the defender's reaction (hit/knockdown/block) fires at the moment of impact via `rig.reactTimer` (`impactMsFor`: 700 ms melee = 320 ms run-in + strike contact, 560 ms ranged), and dodges/rolls fire ~260 ms BEFORE impact so the evade reads as an evade. Ranged attacks spawn projectiles (bolt box for crossbows, glowing orb for magic) that fly attacker→defender in 220 ms, spawned by an `onShoot` callback from `applyPose` and advanced in the render loop (`projectilesRef`; cleared on unmount).
- **COMBATANTS ~2x BIGGER ON SCREEN (2026-07-11)**: `CHAR_HEIGHT` 1.75→2.4 plus tighter camera framing (baseZ half-height 1.8→1.35, lookAt y 0.95→1.15). Spawn positions widened to ±(0.9, 1.3), name sprites raised to y 2.95, marker rings enlarged. If they ever feel too big/small, tune `CHAR_HEIGHT` and the `1.35` in `resize` together.
- **ROSTER REDUCED TO 10 UNIQUE FIGHTERS (2026-07-11)**: valkyrie and monk removed from `AVATARS` (they duplicated Knight/Barbarian — every free KayKit character pack on GitHub was checked and there are no additional character models beyond the 10 we ship). Their `KAYKIT_MODELS` + dictionary entries remain so in-flight rooms with those avatars still render. Lobby picker is now a 5-column grid. If the owner buys more KayKit character packs, re-grow the roster instead.
- **SHIELDS ON FIGHTERS (2026-07-11)**: any equipped, non-disabled item with a `block` or `shield` passive puts a KayKit shield in the left hand (`shieldModelFor` in items.ts: Titan Armor→shield_square, Guardian Charm→shield_badge, default shield_round; dual-wield daggers win the offhand slot if both apply). Makes Melee_Block_Hit reactions and the guard stance read correctly.
- **SELECTABLE ARENA MAPS (2026-07-11)**: the host picks the arena in the lobby. `ARENA_MAPS` (`colosseum` | `dungeon`) in types.ts; `RoomState.arenaMap` (optional field, `?? "colosseum"` for old rooms), host-only `setArenaMap` in engine.ts behind the `map` action, exposed on the snapshot, `chooseMap` in useGame, map card in Lobby, plumbed page → BattleStage → Arena3D as the `map` prop. Adding a third map = add id to `ARENA_MAPS`, `map_<id>` dictionary entry (en+tr), an emoji in Lobby's `MAP_EMOJI`, and an arena builder/GLB branch in Arena3D's fx effect.
- **DUNGEON ARENA BUILT FROM KAYKIT KIT PIECES (2026-07-11)**: `buildDungeonArena()` in `src/lib/three/arenaKits.ts` composes a 40×40 torch-lit dungeon room (10×10 floor tiles, walls + doorway, corner/inner pillars, banners, barrels/crates/gold chest clutter, 4 warm PointLights) from 13 modular pieces in `public/models3d/kaykit/dungeon/` (~800 KB, KayKit Dungeon Remastered, CC0, fetched from GitHub). The template is built once and cloned per mount; unlike the Colosseum GLB it is authored in world units so it skips `prepareArena` normalization. Room half-size 20 was chosen so the max camera zoom-out (~19.2) stays inside the walls.
- **PROJECT TREE CLEANUP (2026-07-11)**: `MESHY_ASSETS.md` moved to `docs/MESHY_ASSETS.md`; README rewritten (it still described the removed Socket.io architecture — now covers 3D pipeline, repo layout, KayKit credits); **unused Meshy character leftovers (`public/models3d/characters/`, ~184 MB) deleted from the repo** (confirmed dead code path — every avatar has a `KAYKIT_MODELS` entry; recoverable from git history). `main` is now the default branch on GitHub (the old `claude/multiplayer-party-game-5dip9w` branch still exists and points at the same history — switch your local clone with `git fetch && git checkout main`).
- **WEAPONS IN HANDS (2026-07-11)**: KayKit weapon models (CC0, fetched from the KayKit-Game-Assets GitHub repos, Adventurers 1.0 + Skeletons 1.0) live in `public/models3d/kaykit/weapons/` as `.gltf`+`.bin`+shared textures (~500 KB total; GLTFLoader resolves the relative uris). `WEAPON_MODELS` in items.ts maps every weapon item id to a model (+optional offhand: Twin Blades dual-wields daggers) and a `WeaponVisualKind` (`blade|heavy|dual|crossbow|magic|fists`) that picks Arena3D animation pools (dualwield attacks, 1H/2H shoot for crossbows, magic raise/shoot for staves/wands). `attachWeapons()` in characterAssets clones the weapon into the rig's `handslot.r`/`handslot.l` bones (GLTFLoader sanitizes the names to `handslotr`/`handslotl` — the lookup regex handles both). Weapons render correctly at native scale, verified in real matches via puppeteer screenshots.
- **ITEM ROSTER ALIGNED TO MODELS (2026-07-11)**: weapons whose model didn't exist were renamed (en+tr both updated): Wooden Club→Tavern Mug 🍺 (mug_full), Longbow→Hand Crossbow (crossbow_1handed), War Hammer→Giant's Greatsword (sword_2handed_color), Spiked Flail→Spiked Shield (shield_spikes), Vampire Scythe→Blood Wand (wand, now ranged), Storm Spear→Storm Staff (staff, now ranged); Void Reaper kept its name but is now a ranged dark staff (Skeleton_Staff). Ids unchanged, stats unchanged, only names/emoji/tags/models. HEAVY_WEAPON_IDS shrank accordingly.
- **3D PORTRAITS EVERYWHERE (2026-07-11)**: `avatarThumb()` (`src/lib/three/avatarThumbs.ts`) renders any avatar (optionally holding its weapon) to a cached PNG dataURL using ONE shared offscreen WebGL context — no context-cap problem. `AvatarPortrait` (component) shows it with a CharacterSprite fallback while loading. Used in: lobby picker (non-selected tiles; selected keeps the live turntable Avatar3DThumb) and player list, battle intro VS, gear showcase, draft/luck waiting chips, bracket rows (Bracket now takes a `players` prop to map nicknames→avatars), champion podium + standings. The 2D `CharacterSprite` remains only as the loading/no-model fallback.
- **SCALE FIXED (2026-07-11)**: characters towered over the arena for two stacked reasons — `measureHeight` bone-spread under-measured KayKit models (native mesh height ~2.4-2.7 units, bone spread much less → over-scaling), and the arena GLB was normalized too small. `measureHeight` now takes the mesh bbox when it's plausible (≥ bone spread and < 3× it; Meshy's lying-tiny bboxes still lose to bone spread), arena target width went 11→55, fog 7/22→10/44, camera framing tightened (baseZ half-height 2.15→1.8, min 5→4.4). Verified: fighters read correctly against the arena at ~430px portrait.
- **CHARACTER PIPELINE PIVOTED TO KAYKIT (2026-07-11, owner decision)**: the game now uses KayKit's CC0 low-poly packs (Adventurers 2.0 FREE, Skeletons 1.1 FREE, Character Animations 1.1) instead of Meshy-generated characters. All KayKit characters share ONE rig (`Rig_Medium`, bones `hand.l`/`spine`/`handslot.r`/…), so a single shared animation library retargets onto every character by bone name. Total asset weight: **9.3 MB for all 12 avatars + ~90 animation clips** (vs ~190 MB for one Meshy character).
- **Layout**: `public/models3d/kaykit/characters/<Model>.glb` (10 models, textures embedded) and `public/models3d/kaykit/anims/Rig_Medium_<Lib>.glb` (7 libraries: General, MovementBasic, MovementAdvanced, CombatMelee, CombatRanged, Special, Simulation). `KAYKIT_MODELS` in `src/lib/game/avatars.ts` maps every avatar id to a model (all 12 mapped; valkyrie/blaze share Knight, monk/viking share Barbarian). `loadAnimLibrary()` in characterAssets merges all libraries into one clip Map (root motion stripped), loaded once and shared.
- **3D battle arena is live** (`src/components/Arena3D.tsx`): pose logic picks KayKit clips by name — attack pools per `weaponKindFor()` kind (blade: 4 one-hand variants, heavy: 3 two-hand, ranged: bow release/magic shoot, fists: punch/kick; crit: spinning/jump-chop), Hit_A/Hit_B reactions, Melee_Block_Hit, Dodge_Left/Right (QTE: Dodge_Backward), Skeletons_Taunt idles/interludes, Skeletons_Death_Resurrect for revives, Death_A/B, Cheering victory, Walking_A menacing melee windup, Running_A attack approach, Ranged_Magic_Raise ranged windup. Fighters without models still render as block placeholders.
- **Arena GLB support**: `public/models3d/arena/arena_<fx>.glb` per event-FX group with `arena_base.glb` fallback (Meshy-generated, 24 MB, still in use); plain cylinder remains the final fallback. Scale normalized from bounding-box width, floor height by downward raycast at center.
- **Meshy character leftovers were deleted (2026-07-11)** — `docs/MESHY_ASSETS.md` is superseded for characters/animations; only its arena section (§5) still applies.
- **Full camera control**: horizontal drag orbits 360°, vertical drag changes camera height (clamped 1.2–6.5), pinch and mouse wheel zoom (0.55×–1.6× of the aspect-computed distance); focus/zoom punch-ins still work at any angle by shifting the look-at target.
- **Readability pass (battle-follow)**: idle clip no longer restarts every beat (playAction skips same-running-loop — this was making fighters look frozen in one stance); an action ticker below the fight shows the current entry (ALL text lives there — the 3D view itself shows only damage numbers, no banners/labels/dim overlays; the QTE-waiting notice also renders in the ticker); glowing team-colored turn rings under the acting fighter; nickname sprites above heads (canvas textures, indigo=A / red=B); big hits costing ≥60% of the defender's current HP play the knockdown animation even without a crit.
- **Never-freeze animation rules**: one-shot clips must always either loop or `backToIdle` — a clamped once-clip (the old windup charge) freezes the fighter for the rest of the beat and reads as "stuck in one stance". Melee windups walk forward menacingly (`walk_fwd` loop), ranged windups charge then return to stance; attacks run in (`run_fwd` ~320 ms via `rig.actionTimer`) before the strike clip. All 20 clips are now used except none — walk/run included.
- **Camera state persists** across battles/rounds in a module-level `cameraState` (azimuth/elev/zoom) — remounting Arena3D must NOT reset the user's view; keep new camera params there, not in refs.
- **Beat pacing**: `entryMs` in battle.ts was slowed ~35% (windup 1800, attack 1500/2000 crit, quirk 1900) and `MAX_BATTLE_MS` raised to 58 s. Tune there.
- **3D weather**: rain/storm (with lightning flashes), snow, wind streaks, and poison bubbles are real particles inside the scene (`buildWeather` in Arena3D); the old DOM overlays for those five fx return null in `ArenaFX` (fog/sun/night/bloodmoon/quake still DOM). Don't re-enable both — they double up.
- **Status reveals & smaller numbers**: center-screen damage/miss/dodge reveals shrunk (~text-4xl/5xl from 7xl/8xl); added BLOCKED!/STUNNED!/REVIVED! reveals (dictionary keys `bigBlocked`/`bigStunned`/`bigRevived`, en+tr) and a `quirkTaunt` round-start interlude in the sim (seeded rng, `LOG_TEMPLATES` entry added) with a `taunt` pose mapped to `idle_taunt`.
- **3D avatar in the lobby picker**: `Avatar3DThumb` renders a slow-turntable idle model for avatars in `MODELED_AVATARS` (avatars.ts — add each new character id there); others keep the SVG sprite. NOTE: each thumb is its own WebGL context — fine for a few characters, but when most of the 12 have models this must switch to render-to-image thumbnails (browsers cap ~8-16 contexts).
- **Bots pick instantly** (`botPickAt = now`), executed on the next poll tick.
- **Draft hands guarantee a pickable item** — see the amended sacred rule below.
- Shared model-loading code lives in `src/lib/three/characterAssets.ts` (ANIM_KEYS, legacy keyword backfill, base/clip/height caches) — used by both Arena3D and Avatar3DThumb.
- Earlier this cycle (also live): 12 selectable avatars, pre-battle gear showcase (`showcase` timeline entries), event-themed weather overlays, and the teammate's QTE reaction dodge + comedy quirks (`quirk` entries, growing timelines).
- **`docs/MESHY_ASSETS.md`**: the complete generation spec — 12 character prompts, the 20-animation set with required clip-name keywords, 48 item prompts with export/orientation rules, the item-attachment design (bones/offsets), and arena prompts per event theme. This is the contract between Meshy output and the code.

## Where we are currently stuck / open problems

1. **Pipeline now visually verified in real matches** (2026-07-11, puppeteer screenshots): facing, scale, weapons, portraits all correct. Clip-name taste choices (Idle_B stance, Hit_B stun) still await the owner's eye.
2. **Only the weapon slot renders in 3D** — helmets/armor/boots/accessories have no models (KayKit character meshes bake their own headgear). Helmet→`head` bone attachment would need helmet prop models we don't have yet.
3. Only the Colosseum has per-theme potential (no per-event arenas yet). The duplicate-model avatar pairs were resolved by shrinking the roster to 10 (2026-07-11).
4. Parked: iOS draft-pick bug (see `ios_handoff.md` on the `ios` branch) — data layer was proven innocent; suspected silent join failure.

## Next plan, in order

1. Owner sanity-checks a real match on a phone (clip taste, camera framing, impact timing feel, both maps).
2. Buy more KayKit character packs to grow the roster past 10 (add model → `KAYKIT_MODELS` + `AVATARS` + `avatar_<id>` dictionary entries).
3. More kit-built maps (KayKit has City Builder, Halloween, Medieval Hexagon, Space Base packs on GitHub — same recipe as the dungeon) and/or per-event arena variants.
4. Sound design for 3D beats; then camera drama (slow-mo death blows, orbit on finisher).

## Pitfalls we hit — do NOT fall into these again

- **Meshy GLB mesh bounds LIE, KayKit bone spread lies the other way**: Meshy bind-space geometry bbox read 1.8 cm for a 1.75 m character, while KayKit bone spread under-measures (~1.5 for a 2.5-unit-tall mesh) and made characters giant. `measureHeight` in characterAssets uses the mesh bbox when it's plausible (≥ bone spread, < 3× it) and bone spread otherwise. Don't simplify it to either single source.
- **Meshy clips bake horizontal root motion**: rolls/runs/attacks travel inside the clip, which doubles with the rig's group-position lerp and makes the character pop back when the clip blends out. All clips are pinned in place at load (`stripRootMotion` in characterAssets — X/Z position keys frozen to frame 0, Y kept for jumps/crouches). Don't remove it.
- **Portrait camera math**: with vertical-FOV cameras, phones crop horizontally — fighters were fully off-screen. Camera distance is computed from viewport aspect (`baseZ` in resize). Test every 3D change in a ~430px-wide viewport, not desktop.
- **framer-motion `%` transforms are relative to the element's own size** — rain "fell" 6 pixels. Animate `top`/`left` (layout) for cross-container travel, not `x`/`y` percentages.
- **React strict-mode double-mounts Arena3D in dev** — effects/cleanup must be idempotent (they are; keep them that way).
- **macOS is case-insensitive**: `HANDOFF.md` and `handoff.md` are the SAME file. Never create files differing only by case.
- **`git add -A` grabs strays**: it once committed Xcode user-state into this branch. Check `git status` before committing; `/ios/` and `/models/` (raw Meshy exports) are gitignored on purpose — shippable models go in `public/models3d/`.
- **Two humans, one branch**: `git pull` before every work block. The teammate's QTE means battle timelines GROW mid-battle and `elapsedMs` pauses — any playback client must handle `timeline.length` changes (web does; keep it).
- **Verification pattern that works**: no test framework — drive full matches over the HTTP API with a Node script, and screenshot real gameplay with puppeteer-core + installed Chrome (`--enable-unsafe-swiftshader` for WebGL headless). Scripts live in the session scratchpad, recreate as needed.
- **Sacred product rules** (Part II, enforce always): draft randomness must never be biased; Vercel-serverless only (no websockets/timers); every new item/event/card needs TR+EN entries (4-step checklist in §5); absolutely no code comments; `npm run typecheck` && `npm run build` before every commit.

---

# PART II — Project spec

## 1. What this project is

**Battle Draft** is a mobile-first multiplayer party auto-battler for 2–8 friends sitting in the same physical room. Everyone joins from their own phone with just a nickname (no accounts). The website only handles gameplay — all banter happens in real life.

**Match flow:**

```
Lobby (6-char room code)
  → 5 Draft Rounds (pick 1 of 5 random items; the item's slot locks forever)
  → Luck Cards (pick 1 of 3 random cards)
  → Global Event (1 random event affects everyone)
  → Automatic Tournament (random bracket, animated auto-battles)
  → Champion → "ONE MORE GAME!"
```

**Design philosophy (this is the product spec — protect it):**

- **Fun over balance. Chaos over predictability.** Players should scream "NO WAY!", "I SHOULD HAVE PICKED THAT!", "THIS EVENT RUINED MY BUILD!".
- There must **never be a universally correct strategy**. Every pick is a gamble.
- **Draft rolls are never manipulated — with one owner-approved exception (2026-07-10).** Each of the 5 offered items every round is fully random, independent of what the player owns or lacks. Items for already-locked slots still appear (shown grayscale with a 🔒) purely to create regret. The single exception: if a rolled hand contains ZERO items for still-unlocked slots, one random card is replaced with a random item from a random unlocked slot (`rollDraftHand` in draft.ts), so every player can always fill all 5 slots by the end of round 5. No other biasing is allowed.
- Weaker builds must still sometimes win (randomness, crits, dodges, passives).
- Legendary items must NOT auto-win; some Commons outperform Legendaries in the right build.

## 2. Tech stack and the one hard constraint

- Next.js 14 App Router, TypeScript **strict** with `noUncheckedIndexedAccess`
- TailwindCSS + Framer Motion, WebAudio for sound (no audio files)
- Prisma + PostgreSQL (Neon)
- **No websockets. No custom server. No long-lived process.**

**Hard constraint: the app must keep running on Vercel (serverless).** This drove the architecture:

- All live room state is a single JSON blob per room in the `GameState` table.
- Clients **poll** `GET /api/rooms/[code]` every ~1.2s and send actions via `POST`.
- There are no server timers. All time-based progression (draft deadlines, bot pick moments, battle sequencing) happens lazily inside `tick(state, now)`, which runs on every request.
- Concurrent requests are serialized with **optimistic version locking** (`updateMany where version = X`, retry up to 4 times).
- If the database is unreachable, the store falls back to a per-process in-memory Map (fine for local dev; logged loudly). Never rely on this in production reasoning — on Vercel each lambda has its own memory.

Do not reintroduce Socket.io, `server.ts`, `setTimeout`-based game progression, or module-level room maps. That architecture was removed on purpose.

## 3. Repository map

```
prisma/schema.prisma          GameState (live rooms) + Room/Match/MatchPlayer/Battle/PlayerStats (history)
src/lib/game/types.ts         All shared types + slot/rarity constants + phase timers
src/lib/game/items.ts         ~72 items across 5 slots (weapon/helmet/armor/boots/accessory)
src/lib/game/luckCards.ts     14 luck cards (metadata only; effects live in battle.ts/draft.ts)
src/lib/game/events.ts        32 global events; each has declarative `hooks` the battle engine applies
src/lib/game/draft.ts         Random hands, luck-card build mutations (Blacksmith, Gambler)
src/lib/game/battle.ts        The battle simulator (pure function) → timeline of animation entries
src/server/engine.ts          RoomState shape + all game logic as pure functions + tick()
src/server/store.ts           Load/save GameState with version locking + in-memory fallback
src/server/persistence.ts     Writes finished matches to history tables (skips bots in PlayerStats)
src/server/ensureSchema.ts    CREATE TABLE IF NOT EXISTS bootstrap, runs on first DB access
src/app/api/rooms/route.ts    POST create room
src/app/api/rooms/[code]/route.ts  GET snapshot (+tick), POST actions (join/start/pick/luck/map/again/leave)
src/hooks/useGame.ts          Client polling hook; adjusts server↔client clock skew on deadlines
src/lib/session.ts            localStorage playerId (with non-HTTPS crypto.randomUUID fallback) + nickname
src/lib/i18n/                 Full TR/EN localization (see §5)
src/lib/three/characterAssets.ts  Model/anim/weapon loading, caches, height normalization, hand attachment
src/lib/three/avatarThumbs.ts     Shared offscreen renderer baking avatar+weapon portrait PNGs
src/lib/three/arenaKits.ts        Kit-built arenas composed from KayKit pieces (Dungeon)
src/components/               Lobby, DraftPhase, LuckPhase, EventReveal, BattleStage, Arena3D, AvatarPortrait, Fighter, Bracket, Champion, ItemCard, TimerBar, StatsView
src/app/page.tsx              Home (create/join)
src/app/room/[code]/page.tsx  The whole game, switching on snapshot.phase
src/app/stats/page.tsx        Hall of Fame (server component → StatsView client component)
```

## 4. The battle system

`simulateBattle(aBuild, bBuild, event)` in `src/lib/game/battle.ts` is a pure function that resolves the whole fight up front and returns a **timeline** of typed entries the clients play back like a movie. HP bars, poses, sounds, and the scrolling log all derive from timeline entries.

Key mechanics inside the simulator:

- Stats: attack, defense, hp, speed, crit chance/damage, accuracy, dodge, initiative — from base + items (with event `statMods`) + luck cards + event multipliers.
- Passives handled: firstStrike, lifesteal, reflect, poisonOnHit, extraAttack, healPerTurn, executioner, berserk, ignoreDefense, stunChance, critResist, lastStand (revive), block, shield, chaos.
- Pre-battle luck cards mutate equipment **permanently across the tournament**: Pirate steals a random item, Trade swaps one; Curse/Magnet disable items for that battle; Lightning/ALL IN adjust HP/attack at battle start.
- Damage has a ×1.45 multiplier so fights resolve in few, heavy exchanges; fatigue damage ramps from round 5; hard cap 20 rounds, then judges decide by HP fraction.

**Dramatic pacing (do not flatten this):** every attack is two timeline beats — a `windup` entry (weapon-specific suspense: `windupRanged` / `windupHeavy` / `windupBlade`) followed by the result (`attack` with dmg/crit flags, or `miss`/`dodge`). Each entry carries its own display duration `ms` (windups ~1.3s, minor passives 0.65s). Total battle length is capped at 38s by proportionally scaling `ms`. `BattleStage` renders windups as a dimmed-arena suspense banner and results as giant center-screen reveals (-34 damage / MISS! / CRITICAL!).

Playback sync: the server stores `startedAt`/`endsAt` on the battle; snapshots include `elapsedMs` so a client that joins or refreshes mid-battle resumes at the right entry (`indexForElapsed`).

**Comedy quirks (timeline type `quirk`):** battles are littered with rare absurd moments, all pure-sim: crits can sever an arm (weapon lost) or send a helmet flying; weaponless fighters improvise every turn from a random table (rock throw, bite+poison, boot throw, slipper slap+stun, sand in eyes, insult, headbutt); ~5% weapon fumbles (dropped on own foot, opponent catches it, stuck in ground, bowstring snap); round-start interludes (chicken, tomato from the crowd, rain, breather — max 2/battle); sub-18%-HP desperation moves (play dead + surprise attack, all-or-nothing, prayer). Keep the on-screen strings SHORT — they flash for ~1.5s. Every quirk key needs an entry in `LOG_TEMPLATES` (en+tr).

**Player reaction QTE (the one interactive moment):** once per human defender per battle, an incoming attack pauses the simulation after the windup and the defender gets a ~3s timing-bar challenge on their phone (tap in the green zone → guaranteed `qteDodge`). This works serverlessly because the sim is **deterministic**: `simulateBattle` takes `{ seed, reactions, aCanReact, bCanReact }`, uses a seeded mulberry32 RNG, and throws an internal pause when it needs an undecided reaction. The server stores seed + reactions on `StateBattle` and re-runs the sim with the appended decision (timeline prefix is bit-identical, so clients keep playing seamlessly). `tick()` auto-fails a pending reaction after a deadline (`REACT_EXTRA_MS`) so absent players never stall the game; bots never get challenges. The 38s timeline cap is skipped for battles with a human side to preserve determinism across re-runs — do not "fix" that.

## 5. Localization (TR/EN) — easy to break, read this

The UI is fully bilingual with a persistent toggle (`LangToggle`). Turkish is the default for Turkish-locale browsers.

- `src/lib/i18n/dictionary.ts` — flat UI string map `{ key: { en, tr } }`, including all server error codes (`err_*`).
- `src/lib/i18n/content.ts` — Turkish names for every item (`ITEM_NAMES_TR`), event (`EVENTS_TR`), luck card (`LUCK_CARDS_TR`), passive label templates, and `LOG_TEMPLATES` for battle-log lines.
- The server never sends display text for logs: timeline entries carry `key` + `params` (item/weapon ids, nicknames, numbers) and each client renders them in its own language via `logLine()` in `src/lib/i18n/index.tsx`. The English `text` field on entries exists only as a DB/log fallback.
- Server errors are codes (`err_not_found`, `err_taken`, ...) translated client-side.

**Checklist when adding content — all four or it will show raw ids/English:**

1. New item → `items.ts` **and** `ITEM_NAMES_TR`. If it has a passive, the passive type must exist in `PASSIVE_TEMPLATES`.
2. New event → `events.ts` (with `hooks`) **and** `EVENTS_TR`.
3. New luck card → `luckCards.ts` **and** `LUCK_CARDS_TR`, plus its effect wired in `battle.ts` (battle-time) or `draft.ts` (build-time).
4. New battle-log line → push with `key`+`params` in `battle.ts` **and** add the template to `LOG_TEMPLATES` (en+tr).

Forged/gambled item ids get `_forged`/`_gambled` suffixes; `itemNameById` strips them before lookup.

## 5b. The 3D battle arena (three.js)

`src/components/Arena3D.tsx` renders the battle in WebGL (three.js, loaded client-side via `next/dynamic`). It replaces only the fighters/floor layer of `BattleStage`; every overlay (windup banners, damage reveals, QTE, showcase, weather FX, log) stays DOM.

- **Character models are KayKit**: `public/models3d/kaykit/characters/<Model>.glb`, mapped from avatar ids via `KAYKIT_MODELS` in `src/lib/game/avatars.ts`. Animations come from ONE shared library (`public/models3d/kaykit/anims/Rig_Medium_<Lib>.glb`, merged by `loadAnimLibrary()` in `src/lib/three/characterAssets.ts`) and retarget onto every character because all KayKit models share the `Rig_Medium` bone names. Pose logic in Arena3D references KayKit clip names directly (`IDLE_CLIP`, `ATTACK_POOLS`, `CRIT_POOL`); an avatar without a mapping falls back to legacy per-avatar GLB paths, then the block placeholder. Missing clips are skipped via candidate lists — partial sets never break the game.
- Attack clips are chosen by `weaponKindFor()` on the fighter's weapon (blade/heavy/ranged; none or disabled → fists), each kind has multiple random variants, crits use `CRIT_POOL`, and `crit` arrives as a prop from BattleStage.
- Model scale is normalized from **skeleton bone spread**, not mesh bounds (`normalizeSize`, target 1.75).
- Poses are driven by the same `posesFor(entry)` mapping; camera distance adapts to viewport aspect so portrait phones frame both fighters.
- Arena colors per event live in `ARENA_COLORS` (keyed by the `EVENT_FX` groups in BattleStage) — keep both in sync when adding events.
- **Maps are selectable** (host, lobby): Arena3D's `map` prop switches between the Colosseum GLB pipeline below and kit-built arenas from `arenaKits.ts` (Dungeon). Kit arenas are authored in world units and skip normalization.
- **Arena GLBs** live in `public/models3d/arena/arena_<fx>.glb` (per `EVENT_FX` group), falling back to `arena_base.glb`, then to the plain cylinder. The model is auto-scaled to ~11 world units wide, centered on XZ, and its floor height found by raycasting down at the arena center; the cylinder floor is hidden once a GLB arena loads, the glowing event-color ring stays.
- Asset budget: ≤ ~30k triangles and ≤ ~20 MB per character GLB; raw Meshy exports go in `/models` (gitignored), shippable files in `public/models3d/`.

## 6. Bots

If the host starts alone, `startGame` adds 3 bots (`Bot Kemal`, `Bot Pala`, ...). Bots have `botPickAt` timestamps; `tick()` executes their random picks when due. Bots are excluded from `PlayerStats` (Hall of Fame) and removed on "play again" so real friends can join the rematch.

## 7. Conventions and rules for this codebase

- **No code comments. Anywhere.** The owner explicitly requires comment-free code. Write self-explanatory code instead.
- TypeScript strict + `noUncheckedIndexedAccess`: every indexed access needs a guard. `npx tsc --noEmit` must pass.
- Engine functions in `engine.ts` are pure (state in, mutate, no I/O). All I/O lives in `store.ts`/route handlers.
- Keep everything JSON-serializable inside `RoomState` (it round-trips through a JSONB column).
- The game must stay playable when the DB is down (memory fallback) and must never crash a request because persistence failed.
- UI text goes through `t()` — never hardcode user-facing strings in components.
- Commit messages: imperative summary + body explaining why.

## 8. Running, verifying, deploying

```bash
npm install
npm run dev        # http://localhost:3000 — schema auto-creates on first request
npm run typecheck
npm run build
```

`.env` ships with the Neon `DATABASE_URL` (the owner chose to commit it). Without DB access you'll see one "falling back to in-memory rooms" log line — the game still works.

**Verification pattern used so far** (no test framework installed): start the app, then drive a full match over the HTTP API with a Node script — create room, start solo (bots fill in), poll `GET /api/rooms/CODE?playerId=...`, answer `offer`/`luckOffer` via POST, assert the phases progress to `champion`. Phones on the same network reach the dev server via the machine's LAN IP.

**Deploy:** Vercel, zero config beyond setting `DATABASE_URL` in project env vars. `npm run build` already runs `prisma generate`.

## 9. Known sharp edges

- `crypto.randomUUID` doesn't exist on non-HTTPS LAN origins — `session.ts` has a fallback; don't regress it.
- Deadlines/battle sync use server timestamps; `useGame` corrects client clock skew via `snapshot.serverNow`. Don't compare raw server timestamps to `Date.now()` in components.
- Polling means every GET may write (tick side effects); `withRoom` only persists when something changed — keep it that way or Neon write volume explodes.
- `BattleStage` must not reset on every poll: it keys off round/match index and keeps its own playback index; new snapshot objects arrive every ~1.2s with identical timeline content.
- Adding fields to `RoomState` is fine (old rows just lack them — guard with `??`), renaming/removing fields breaks in-flight rooms.
- Lobby prunes players not seen for 60s; mid-game absentees get auto-picked at the deadline.

## 10. Ideas the owner may ask for next

More items/events/cards, spectator polish between battles, victory/defeat animations per personality, tournament history screen from the `Battle` table, sound toggle, PWA install, room QR code sharing.
