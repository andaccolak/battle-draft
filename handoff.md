# Battle Draft — Claude Handoff Document

This document briefs an AI assistant (or a new developer) taking over work on this codebase. Read it fully before making changes. Part I is the live session handover (current mission, status, pitfalls); Part II is the stable project spec.

---

# PART I — Session handover (updated 2026-07-10)

Written for a session with zero context. Read Part II afterward for the game rules and architecture — everything there still applies.

## What we are doing

Battle Draft is a mobile-first multiplayer web party game (Next.js on Vercel, serverless, polling — see Part II). The current mission: turn the battle phase into an **action-RPG-grade 3D presentation** using AI-generated assets from **Meshy** (the owner has a paid Meshy subscription; API and web app share the same credit pool). The owner (Rıdvan) drives Meshy generation by hand; Claude integrates. A second human developer works on this same branch in parallel (he built the QTE dodge and battle quirks) — his territory is game logic/server, ours right now is 3D presentation.

An earlier native iOS client was built and then **deliberately parked**: it lives complete on the `ios` branch (with its own `ios_handoff.md`), was reverted off this branch, and `/ios/` is gitignored here. Do not resurrect it unless the owner asks.

## What has been completed

- **3D battle arena is live** (`src/components/Arena3D.tsx`, three.js via `next/dynamic`): rigged GLB characters play timeline-driven animation clips (idle/attack/hit/dodge/death/victory chosen by clip-name keywords in `CLIP_KEYWORDS`), event-themed arena colors/fog, shadows, aspect-aware camera with attacker focus and crit punch-in. Fighters without models render as block placeholders — the game never breaks on missing assets.
- **First character shipped with the full 20-clip set**: `public/models3d/characters/blaze/` — base `blaze.glb` plus one GLB per animation (`blaze_<animKey>.glb`). The loader merges them at runtime; clip names inside the GLBs are ignored (Meshy's are unreliable — the stun clip is literally named `Gunshot_Reaction`), the FILE name is the contract.
- **Animation variety implemented**: attack clips picked by `weaponKindFor()` (blade/heavy/ranged; no/disabled weapon → fists with random punch/kick), crit → combo, windup → charge-up, block/stun/knockdown/QTE-roll/revive mapped end to end (new `Pose` values flow from `posesFor` in BattleStage through Arena3D and the 2D `Fighter` fallback variants), random death fwd/bwd, occasional idle taunt.
- **Arena GLB support**: `public/models3d/arena/arena_<fx>.glb` per event-FX group with `arena_base.glb` fallback (shipped, 24 MB); plain cylinder remains the final fallback. Scale is normalized from bounding-box width and the floor height by a downward raycast at center.
- **Full camera control**: horizontal drag orbits 360°, vertical drag changes camera height (clamped 1.2–6.5), pinch and mouse wheel zoom (0.55×–1.6× of the aspect-computed distance); focus/zoom punch-ins still work at any angle by shifting the look-at target.
- **Readability pass (battle-follow)**: idle clip no longer restarts every beat (playAction skips same-running-loop — this was making fighters look frozen in one stance); an action ticker below the fight shows the current entry (windup/miss/dodge/quirk/status text lives there now, NOT mid-screen); center-screen shows only damage numbers (small) with a tiny CRITICAL tag; glowing team-colored turn rings under the acting fighter; nickname sprites above heads (canvas textures, indigo=A / red=B); big hits costing ≥60% of the defender's current HP play the knockdown animation even without a crit.
- **3D weather**: rain/storm (with lightning flashes), snow, wind streaks, and poison bubbles are real particles inside the scene (`buildWeather` in Arena3D); the old DOM overlays for those five fx return null in `ArenaFX` (fog/sun/night/bloodmoon/quake still DOM). Don't re-enable both — they double up.
- **Status reveals & smaller numbers**: center-screen damage/miss/dodge reveals shrunk (~text-4xl/5xl from 7xl/8xl); added BLOCKED!/STUNNED!/REVIVED! reveals (dictionary keys `bigBlocked`/`bigStunned`/`bigRevived`, en+tr) and a `quirkTaunt` round-start interlude in the sim (seeded rng, `LOG_TEMPLATES` entry added) with a `taunt` pose mapped to `idle_taunt`.
- **3D avatar in the lobby picker**: `Avatar3DThumb` renders a slow-turntable idle model for avatars in `MODELED_AVATARS` (avatars.ts — add each new character id there); others keep the SVG sprite. NOTE: each thumb is its own WebGL context — fine for a few characters, but when most of the 12 have models this must switch to render-to-image thumbnails (browsers cap ~8-16 contexts).
- **Bots pick instantly** (`botPickAt = now`), executed on the next poll tick.
- **Draft hands guarantee a pickable item** — see the amended sacred rule below.
- Shared model-loading code lives in `src/lib/three/characterAssets.ts` (ANIM_KEYS, legacy keyword backfill, base/clip/height caches) — used by both Arena3D and Avatar3DThumb.
- Earlier this cycle (also live): 12 selectable avatars, pre-battle gear showcase (`showcase` timeline entries), event-themed weather overlays, and the teammate's QTE reaction dodge + comedy quirks (`quirk` entries, growing timelines).
- **`MESHY_ASSETS.md`** (repo root): the complete generation spec — 12 character prompts, the 20-animation set with required clip-name keywords, 48 item prompts with export/orientation rules, the item-attachment design (bones/offsets), and arena prompts per event theme. This is the contract between Meshy output and the code.

## Where we are currently stuck / open problems

1. **New pipeline untested in a real match** — the per-file animation loader, weapon-kind attack selection, new poses (block/stun/knockdown/roll/revive), and the arena GLB (auto-scale + raycast floor) all typecheck and build but await visual verification by the owner. Watch: fighter position vs arena floor, arena scale, ring/floor z-fighting, clip blending.
2. **Asset weight is now the top problem** — each animation GLB carries the full mesh+textures (~9 MB × 20 + base ≈ 190 MB per character; arena 24 MB). Needs either meshes stripped from animation files, Draco/meshopt compression, or both, before more characters ship.
3. **Items are not visible on 3D characters** — attachment system designed (MESHY_ASSETS.md §4) but not implemented; needs bone-name discovery per Meshy rig.
4. Only 1 of 12 characters has a model; only the base arena exists (no per-theme arenas yet). `walk_fwd`/`run_fwd` clips load but are not wired to intro/lunge movement.
5. Parked: iOS draft-pick bug (see `ios_handoff.md` on the `ios` branch) — data layer was proven innocent; suspected silent join failure.

## Next plan, in order

1. Owner generates the remaining 11 characters + the 20-clip animation set (start with 2–3 characters to validate the richer clip keywords).
2. Implement the animation-variety code (item 1 above) as soon as the first 20-clip GLB exists.
3. Implement item attachments (weapon → hand bone first; it has the highest visual payoff), then helmet, armor shell, accessory orbit.
4. Arena GLBs per event theme with cylinder fallback.
5. Compression pass on all GLBs; then sound design for 3D beats; then camera drama (slow-mo death blows, orbit on finisher).

## Pitfalls we hit — do NOT fall into these again

- **Meshy GLB mesh bounds LIE**: bind-space geometry bbox read 1.8 cm for a 1.75 m character. Scale is normalized from **skeleton bone spread** (`measureHeight` in characterAssets). Never "fix" it back to `Box3.setFromObject`.
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
src/app/api/rooms/[code]/route.ts  GET snapshot (+tick), POST actions (join/start/pick/luck/again/leave)
src/hooks/useGame.ts          Client polling hook; adjusts server↔client clock skew on deadlines
src/lib/session.ts            localStorage playerId (with non-HTTPS crypto.randomUUID fallback) + nickname
src/lib/i18n/                 Full TR/EN localization (see §5)
src/components/               Lobby, DraftPhase, LuckPhase, EventReveal, BattleStage, Fighter, Bracket, Champion, ItemCard, TimerBar, StatsView
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

- **Character models** live in `public/models3d/characters/<avatarId>/` — a rigged base `<avatarId>.glb` plus one GLB per animation named `<avatarId>_<animKey>.glb` (the 20 keys are `ANIM_KEYS` in Arena3D; full table in MESHY_ASSETS.md §2). The FILE name identifies the clip; internal clip names are ignored. Legacy all-in-one GLBs at `public/models3d/<avatarId>.glb` still load, with clips backfilled by name keywords (`LEGACY_KEYWORDS`). Missing models fall back to block-figure placeholders; missing individual animations are simply skipped (each pose has a fallback candidate list), so partial sets never break the game.
- Attack clips are chosen by `weaponKindFor()` on the fighter's weapon (blade/heavy/ranged; none or disabled → fists), crits prefer `atk_combo`, and `crit` arrives as a prop from BattleStage.
- Model scale is normalized from **skeleton bone spread**, not mesh bounds (Meshy exports have misleading bind-space geometry bounds).
- Poses are driven by the same `posesFor(entry)` mapping; camera distance adapts to viewport aspect so portrait phones frame both fighters.
- Arena colors per event live in `ARENA_COLORS` (keyed by the `EVENT_FX` groups in BattleStage) — keep both in sync when adding events.
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
