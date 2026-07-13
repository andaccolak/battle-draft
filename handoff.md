# Current Status

Battle Draft is live and healthy on the public `https://battle-draft.vercel.app` production alias after correcting the mobile layout and draft-stat UX: the 3D arena now has a single explicit 1:1 aspect-ratio contract, the battle document scrolls naturally, current totals expose base and cumulative gear modifiers, and every offered item shows its exact projected totals before the player commits. Vercel production is currently wired to the legacy `claude/multiplayer-party-game-5dip9w` branch, so releases must temporarily fast-forward that branch from `main` until a repository/Vercel administrator changes the Production Branch setting to `main`.

# Last Completed Work

## Production deployment recovery (release correction, 2026-07-13)

- Confirmed that commits `dc1d13e` and `71c9edc` built successfully on Vercel but were classified as authenticated Preview deployments only. The public `battle-draft.vercel.app` alias remained on old commit `927d75f`, explaining why none of the reported changes were visible to players.
- GitHub still reports `claude/multiplayer-party-game-5dip9w` as the repository default branch and Vercel production follows it. The current GitHub credential can push code but cannot change repository administration settings (`gh repo edit --default-branch main` returns 404), and no local Vercel credential is available.
- Temporary safe release procedure: keep development and canonical history on `main`, then fast-forward the legacy production branch with `git push origin main:claude/multiplayer-party-game-5dip9w`. Never develop independently on the legacy branch and never force-push it.
- Fast-forwarded production from `927d75f` to the canonical `main` history. GitHub recorded a successful Vercel Production deployment; the public alias returned HTTP 200 with a fresh cache and its served JavaScript contains `aspectRatio:"1 / 1"`, `Current fighter stats`, `Base`, `Gear`, and `Your total after this pick`.

## Explicit square arena + useful pre-pick stat comparisons (UX correction, 2026-07-13)

- Replaced the separate Tailwind width/height formulas with one reliable geometry contract on the arena element: `width: 100%`, `max-width: 430px`, and inline `aspectRatio: "1 / 1"`. Width is the only sizing input and height is derived from it, so the rendered 3D viewport cannot become a portrait rectangle. The arena also gained a restrained depth shadow.
- Battle pages explicitly use `min-h-dvh`, visible overflow, and bottom breathing room. The arena, action ticker, battle log, spectators, and results are ordinary document-flow sections; the app no longer tries to compress them into one phone screen and the page can scroll vertically.
- The draft's nine-stat summary now remains sticky while browsing offers. Every tile shows total, simulator-shared base value, and signed cumulative gear modifier (`Base 12`, `Gear +16`), including negative modifiers.
- Every item card computes a pre-commit build projection and displays each changed stat as current → after-pick total plus a signed delta. Example: `ATK 12 → 28 +16`; negative accuracy/HP effects are equally explicit in rose. Passive text remains directly below the projection.
- Draft cards gained spring press/hover feedback, projected-stat chips, stronger depth separation, and bilingual EN/TR labels. Locked-slot offers now use a compact badge instead of an opaque full-card cover, so their projected stats and passives remain readable and can still create the intended draft regret. Optimistic selection still updates the sticky overall panel immediately and remains server-authoritative.
- Verification: strict typecheck and production build pass; a pure-data sweep validated projected totals against base + item stats for all 110 items; compiled server/client bundles contain the 1:1 arena contract and both localized projection labels. Browser runtime remained unavailable, so physical-device visual confirmation is still required.

## Two-attack card balance + mobile battle clarity (game-feel sprint, 2026-07-13)

- Pirate no longer transfers an opponent item permanently or mutates tournament equipment. It temporarily suppresses one random equipped item for exactly the opponent's next two attack attempts; Magnet applies the same two-attack window to the opponent weapon. Extra attacks count as attacks. A deterministic `gearReturn` beat restores the complete stat/passive delta, returns an HP item's max/current HP contribution, plays a pickup pose and return SFX, and animates the item back. Trade remains the only battle-start card that permanently swaps equipment.
- Temporary suppression is resolved inside `simulateBattle`; it remains seeded and serverless. The result always returns empty `disabledItems` and the original loadout for Pirate/Magnet, preventing the old permanent tournament theft. Card application now resolves permanent trades before temporary suppression so mixed-card matches remain coherent.
- The battle arena is now a centered 360×360 CSS-pixel square on normal phones with a viewport-safe square fallback below 392 px. The page no longer forces the entire battle into `100dvh - 6rem`, so short screens scroll instead of vertically crushing the 3D arena.
- DraftPhase has a nine-stat fighter panel sourced from the same exported base stats as the simulator. Tapping an offer optimistically previews the chosen item's totals immediately while the server confirms the pick.
- Battle log follow behavior is now reader-aware: new entries auto-follow only while the scroll position is within 12 px of the bottom. Scrolling upward pins the current reading position until the player returns to the bottom.
- Poison Mist, poison application, bites, and poison ticks mark the affected fighter with a toxic-green glowing HP bar and skull badge.
- WebAudio now synthesizes distinct light/heavy sword impacts, shield/block clangs, unarmed body strikes, event/environment beds, and a layered death fall. Sounds remain generated in-browser with no asset downloads; impact sounds remain synchronized to Arena3D's contact callback.
- Verification: strict typecheck and production build pass; local production HTTP smoke test returned the home page, created a room and started a four-fighter bot draft; 120 seeded Pirate/Magnet battle pairs were run twice each to prove deterministic identical output, exactly two attacks before `gearReturn`, and preserved equipment. The in-app browser runtime reported no available browser, so rendered mobile visual/audio taste testing remains for a physical-phone or browser-enabled session.

## Contact-synchronized feedback + persistent arena (game-feel sprint, 2026-07-13)

- Arena3D now emits a one-shot impact signal at its real dynamic contact time (melee run distance + strike contact, ranged release timing, or dodge anticipation). BattleStage uses that signal for HP, hit/finisher sound, damage/heal/note floats, shake, zoom and haptics instead of the old fixed 620 ms guess. A guarded 900 ms fallback preserves UI progress if WebGL never signals.
- Finisher slow motion now begins on the same real contact signal and restores 1360 ms later; it no longer starts at a fixed offset that could lead or trail dynamic melee contact by more than 200 ms.
- Crit/finisher shake moved from a changing React `key` to Framer Motion animation controls. Previously every shake destroyed and recreated Arena3D, resetting rigs/camera and reloading the scene at the exact moment continuity mattered most; the arena now stays mounted through every impact.
- Two complete two-human tournaments were driven through the real HTTP API in explicit offline-memory mode: Colosseum (75.8 s, 5 attacks, 1 crit, 1 block, 2 dodges, 2 QTE submissions) and Dungeon (66.6 s, 7 attacks, 2 crits, 1 dodge, 1 QTE submission). Both reached champion cleanly. Typecheck and production build pass.

## Physical hits + anti-float pass (game-feel sprint, 2026-07-13)

- Rigs carry an `impulse` velocity (integrated in the render loop with exponential decay): landed hits shove the defender along the attack direction (-3.4 knockdown / -2.2 hit / -1.2 block), dodges/rolls snap sideways (+2.8/+3.6) at the moment the attack would land, so evades visibly leave the swing line. While an impulse is live the positional lerp gain drops to 0.2 so the shove reads.
- Post-attack recovery no longer ice-skates: `scheduleReturn` walks fighters back with Walking_A at 1.6 u/s when they are >0.7 units from base (`rig.returning`; the loop switches to idle on arrival). Short offsets still lerp.
- Bone Crossbow mount fixed (+90° tilt special case in `tiltFor`); large-size `/dev/weapons` audit of all 37 weapons is clean.

## Weapon grip + identity pass (game-feel sprint, 2026-07-13)

- Melee weapons/staves were mounted lying horizontal or pointing backward in the hand. `tiltFor` in characterAssets applies a -90° X rotation at mount; `UPRIGHT_MODELS` (bows, mug, shields, Skeleton_Crossbow, spellbook) are exempt because their native orientation was already correct — extend that set rather than removing the tilt if a future model mounts oddly.
- Weapons sharing one model are differentiated by optional `tint`/`emissive` on `WeaponModelDef` — materials are CLONED per mount before tinting (KayKit clones share materials; never tint the shared template). `avatarThumb` cache key includes tint/emissive.
- Projectiles spark on arrival (`burst` color per weapon kind).
- `/dev/weapons` renders every weapon in a knight's hand as a grid — use it for any future weapon-visual audit (screenshot at ~900px).
- Verified via the grid page and a full driven match; battle frames show natural grips, quiver + bow correct, impact flash lighting the victim on crits.

## Impact pack (game-feel sprint, 2026-07-13)

- Every connecting blow (hit/knockdown/block reactions) fires `impactFx` in Arena3D at the same moment the reaction pose applies: a reusable PointLight flash at the victim (warm for hits, orange for hard hits, steel-blue for blocks), a spark `Burst` (pooled THREE.Points, disposed after 0.45 s), and a camera distance kick (`kickRef`, exponential decay) that punches in and springs back.
- Hard hits (crits and knockdowns) add an 85 ms hit-stop via `timeRef.freeze` — the render loop zeroes the sim delta while frozen; camera stays live.
- Corpses kick up a grey dust burst 750 ms after the dead pose is first applied (timing matches the fall landing).
- Weapon weight: strike clips play at 0.9× for heavy, 1.12× for dual/fists via `setEffectiveTimeScale` after `playAction` (which resets timeScale — order matters).
- Looping clips start at a random phase (`target.time` randomized in playAction) so both fighters never idle/guard in robotic lock-step. Clip CHOICE stays seeded/synced across clients; phase offset is cosmetic.
- Damage floats scale with magnitude (`floatMag`: ≥55 huge, ≥28 big) via `FLOAT_SIZES`, and all floats pop with a scale overshoot (0.55→1.18→1).
- Verified: full driven tournament to champion, no new console errors, typecheck+build pass.

## Finisher camera drama (2026-07-12)

- The killing blow is now cinematic: when an attack entry's next timeline entry is a `death`, BattleStage flags it as the finisher (deterministic on every client since the timeline is known upfront).
- At the actual 3D finisher contact, a deep `sfx.finisher()` boom replaces the normal hit sound, the screen shakes, the camera punch-in zoom holds 1.7 s (vs 0.6 s for crits), and phones with vibration support get a haptic pattern.
- Arena3D runs a visual time-scale (`timeRef`): on finisher contact it targets 0.3× and restores 1360 ms later, slowing mixers, fighter movement, projectiles, and weather — the strike follow-through and the victim's crumple play in slow motion, usually bleeding into the death beat's fall.
- The beat clock, server sync, and camera responsiveness are never slowed: BattleStage timers and `elapsedMs` snapping are untouched, and camera smoothing uses a separate real-time damp (`camDamp`).
- Cinematic camera orbit, only while the user is not dragging (`pointers.size === 0`): fast drift (0.5 rad/s) during slow-mo, slow showcase drift (0.16 rad/s) whenever a fighter is in the victory pose.
- Verified end-to-end with a driven 4-player tournament (3 battles to champion) + puppeteer screenshots: punch-in and orbit visible frame-to-frame, floats/HP at impact, QTE answered, no new console errors.

# Current Architecture Notes

Battle presentation is client-side in `src/components/BattleStage.tsx`; the QTE grades against the current request-animation-frame marker position and sends the score to the existing server action. The arena's width is responsive up to 430 px and inline `aspect-ratio: 1 / 1` is the sole height authority; do not add an explicit height or flex-grow sizing. Battle page content stays in normal document flow. Draft and luck screens use short-lived local pending IDs for optimistic lock feedback without mutating the room snapshot. `src/lib/game/buildStats.ts` is the shared source for draft-visible base stats and simulator initialization; DraftPhase derives both current totals and all five per-offer projections from it. Audio is synthesized through `src/lib/sound.ts`; browser vibration is opportunistic and safely ignored by unsupported devices, including current iOS Safari. Arena3D's render loop distinguishes `rawDelta` (camera, orbit drift, time-scale easing) from the scaled `delta` (mixers, movement, projectiles, weather). Arena3D owns physical contact timing and calls BattleStage's stable `onImpact(beat)` callback; BattleStage queues all contact-dependent feedback behind a beat-checked one-shot resolver. Finisher slow-mo restore timers deliberately survive beat changes so follow-through can overhang into the death beat; they are cleared and scale is reset only on unmount. Pirate/Magnet use `TimedSuppression` snapshots in the pure simulator: suppressed stats run for two attack attempts, `gearReturn` applies the full-minus-suppressed delta, and returned battle equipment is never mutated by those cards.

# Remaining Tasks

- [ ] Test multiple full two-device battles and QTE flows on physical iPhone Safari, including the responsive 1:1 arena, natural page scrolling, sticky base/gear totals, per-card projections, log scroll pinning, toxic HP state, and Pirate/Magnet item return after two attacks.
- [ ] Owner taste-check the new sword/block/body/environment/death mix on phone speakers; tune oscillator/noise volume layers in `src/lib/sound.ts` if any category masks the ticker or feels harsh.
- [ ] Sound design for remaining 3D beats (per-weapon windup whooshes and footsteps) after the new core mix is approved.
- [ ] Add and optimize the next owner-supplied Meshy arena or equipment assets; more kit-built maps.

# Known Bugs

- Vercel Production Branch is still the legacy `claude/multiplayer-party-game-5dip9w` branch. A plain push to `main` creates only an authenticated Preview and does not update the public `battle-draft.vercel.app` alias. Repository/Vercel admin must permanently switch the production/default branch to `main`; until then mirror `main` by fast-forward after every release.
- Browser vibration support is platform-dependent; iOS Safari may not provide physical vibration feedback.
- The in-app browser backend was unavailable (`agent.browsers.list()` returned no browsers), so this milestone has build, HTTP, and deterministic simulation coverage but not rendered mobile screenshot/audio taste coverage.
- A room created while Neon is reachable can return HTTP 500 if the database becomes unreachable mid-room; initial startup failure correctly falls back to memory, but DB-mode request failures are not caught by `withRoom`. Production resilience work is outside the current feel pass, but this violates the documented graceful-fallback intent.

# Current Branch

`main`

# Build Status

`npm run typecheck` and `npm run build` passed on 2026-07-13 after the square-arena/stat-comparison correction. All 110 items passed base + item projected-total assertions. Vercel Production completed successfully and `https://battle-draft.vercel.app` serves the corrected aspect-ratio and draft-comparison bundle.

# Files Recently Modified

- `src/components/BattleStage.tsx`
- `src/components/DraftPhase.tsx`
- `src/components/ItemCard.tsx`
- `src/app/room/[code]/page.tsx`
- `src/lib/i18n/dictionary.ts`
- `handoff.md`

# Suggested Next Step

Repository/Vercel administrator should set GitHub's default branch and Vercel's Production Branch to `main`, then remove the temporary legacy-branch mirroring procedure. After the current deployment, open `battle-draft.vercel.app` on a physical phone: measure/visually confirm the arena's rendered width equals height and inspect positive, negative, passive-only and locked draft cards for the new pre-pick comparisons.

# Important Decisions

- Finisher detection is pure timeline lookahead (`attack` with dmg > 0 followed by `death`) — no server or sim changes, so determinism and cross-client sync are untouched.
- Arena3D is the authority for presentation contact timing because melee timing depends on live circling distance. BattleStage remains authoritative for UI state and retains a 900 ms fallback; the callback changes presentation only and never affects deterministic simulation or server time.
- Screen shake must never use a changing key above Arena3D. Replay shake through animation controls so the WebGL scene, camera and loaded rigs remain alive.
- Slow-mo is visual-only time dilation inside Arena3D; the timeline beat scheduler must never be slowed or battles would desync from `elapsedMs`.
- Poison/quirk deaths get no slow-mo on purpose — there is no strike animation to dramatize.
- Auto-orbit yields to the player instantly: any active pointer on the arena suppresses the drift that frame.
- QTE scoring remains based on the displayed rAF marker position; no timing thresholds or server rules changed.
- Local pick locks are presentation-only and have a four-second escape hatch. They never assume a pick was accepted; only the next server snapshot advances the phase.
- Pirate and Magnet are temporary denial cards, not equipment-transfer cards. Each affected attack attempt, including an extra attack, consumes one of two charges. Pirate/Magnet must never persist item mutations into `StatePlayer.equipment`; Trade remains permanent by design.
- A `gearReturn` timeline entry is the presentation contract for restoring temporarily suppressed gear. Keep its actor as the recovering fighter and its `item` param as the stable item id so localization, pickup pose, audio, and return animation stay synchronized.
- The battle arena has one sizing authority: responsive width capped at 430 px plus inline `aspect-ratio: 1 / 1`. Never add a separate height, viewport-height formula, or flex-grow sizing. Battle content belongs in natural document flow and may extend below the fold.
- Draft decisions must be understandable before commitment. Keep the sticky summary's base + cumulative gear modifier and every offer's current → projected total with signed delta; an optimistic post-tap-only change is insufficient.
- `main` remains the canonical development branch even while Vercel is misconfigured. The legacy production branch may only be fast-forwarded from `main` as a release mirror; never commit uniquely to it or force-push it.
- Battle-log auto-follow is conditional on `logPinnedRef`; do not restore unconditional scroll-to-bottom behavior.

# Notes For Next Session

The parked native iOS implementation still belongs on the separate `ios` branch. Keep the current web game on `main`, make changes in small verified milestones, update this handoff before every push, and retain the existing no-code-comments convention. The first square/stat implementation was rejected because the player still perceived a non-square battle and could not compare useful totals before picking. The corrected implementation deliberately uses one aspect-ratio authority and pre-commit comparisons on every card. The in-app browser still reported no available browser, so physical-device visual confirmation is mandatory after deployment; do not infer visual acceptance from build success alone.

---

# Battle Draft — Claude Handoff Document

This document briefs an AI assistant (or a new developer) taking over work on this codebase. Read it fully before making changes. Part I is the live session handover (current mission, status, pitfalls); Part II is the stable project spec.

---

# PART I — Session handover (updated 2026-07-11)

Written for a session with zero context. Read Part II afterward for the game rules and architecture — everything there still applies.

## What we are doing

Battle Draft is a mobile-first multiplayer web party game (Next.js on Vercel, serverless, polling — see Part II). The current mission: turn the battle phase into an **action-RPG-grade 3D presentation** using AI-generated assets from **Meshy** (the owner has a paid Meshy subscription; API and web app share the same credit pool). The owner (Rıdvan) drives Meshy generation by hand; Claude integrates. A second human developer works on this same branch in parallel (he built the QTE dodge and battle quirks) — his territory is game logic/server, ours right now is 3D presentation.

An earlier native iOS client was built and then **deliberately parked**: it lives complete on the `ios` branch (with its own `ios_handoff.md`), was reverted off this branch, and `/ios/` is gitignored here. Do not resurrect it unless the owner asks.

## What has been completed

- **SHARE GESTURE + WEAPON GRIP + ANIM POLISH (2026-07-12, v7)**: (1) **Share Result now works on iOS**: awaiting html2canvas (>1s at scale 2) was expiring the tap gesture so `navigator.share` was silently blocked. The card is now PRE-RENDERED on champion mount (1.4s after portraits bake) into `blobRef`; the tap shares it synchronously within the gesture (clipboard→download fallback). (2) **Weapon grip auto-fix**: converted (Quaternius) weapons like Axe_Double put their origin at the head, so they mounted head-first with the handle past the feet. `mountWeapon` now measures the weapon bbox and, when `min.y < -0.3` (origin above the geometry), lifts it by `-min.y - height*0.15` so the grip sits in the hand — auto-handles any centered-origin weapon; Axe_Double scale trimmed 0.27→0.2. Verified with an in-app-logic render (axe now held by the handle). (3) Animation crossfades smoothed: clip blend 0.22→0.32s, return-to-idle 0.3→0.4s. (4) Face-off greeting is now a seeded-random `GREET_POOL` (Waving/Cheering/Skeletons_Taunt/Interact/Melee_Block_Attack) per fighter instead of always Waving, fired the instant the showcase clears.

- **FLOAT/PROJECTION/POSE CLEANUP (2026-07-12, v6)**: (1) Combat floats no longer garble-stack: capped to 3 concurrent, each new float on a side is staggered up 8% so overlaps read as a column, and lifetime cut 1.2s→0.9s so they clear before the next hit. (2) "Damage/heal flying to the top-left corner" was the head projection getting CLAMPED to the 0.08 corner when a fighter's point went behind the camera during orbit/zoom — now the projection only writes when `projVec.z < 1` and within frustum, else it keeps the last good screen position. (3) The bow user "kept crouching and rising" — that was the archer's KNEELING aim clip (`Ranged_Bow_Aiming_Idle`) used as the guard/windup stance, flickering against standing idle every beat. Bow guard/windup now uses the STANDING `Ranged_Bow_Idle`/`Ranged_Bow_Draw`. (4) The battle-start rise (Spawn_Ground) was janky and half-hidden; combatants now WAVE/greet each other (`Waving`→`Cheering`) when the showcase clears instead of rising from the ground.

- **IMPACT-TIMED HP + REVEAL + 12 WEAPONS (2026-07-12, v5)**: (1) HP bar, hit sound, crit shake/zoom now fire AT the visual impact (620ms into a strike beat, 480ms for dodges), not at beat start — they were ~600ms early. Displayed HP is a `dispHp` state applied on a per-beat scheduled timer; non-damage beats resolve at 0ms. (2) "All damage at once after death" fixed: on a sync catch-up jump (`index - prevIndex > 1`) HP snaps immediately (impact=0), floats clear, and all pending timers from the prior beat are cleared (`pendingRef`). (3) Champion standings/history rows restructured for html2canvas (avatar shrink-0, medal fixed w-6, name flex-1 truncate, wins shrink-0, all `leading-none`; AvatarPortrait img is now `block`) — fixes the misaligned share capture. (4) **Combatants rise AFTER the showcase**: Arena3D no longer spawns on mount (was hidden behind the z-30 showcase overlay); it plays Spawn_Ground when BattleStage sets `revealed` true (first non-intro/showcase/event beat). (5) **12 new weapons** (all with models): Short Sword, Woodcutter's/Broad/Warcleaver axes, Knight's Longsword, Assassin's Dagger, Frost/Soul/Arcane staves, Bone Cleaver, King's Greatblade, Reaper's Scythe — 37 weapons, 104 items.

- **QTE EXACTNESS + FEEDBACK SIMPLIFY (2026-07-12, v4)**: (1) The QTE "green reads as bad" bug was the tap grader reconstructing marker position from `event.timeStamp`/`performance.now()-90` — on iOS `event.timeStamp` is a different clock than rAF, so the 600ms sanity check failed and the `-90ms` fallback threw a centered tap ~9% off (marker moves 10%/100ms). FIX: grade directly off `posRef.current`, the exact value that positioned the marker THIS frame via DOM mutation — zero reconstruction, zero latency guess. Verified: grading `pass = |pos-0.5|*2 <= 0.1` maps 1:1 to the visual green band (45-55%). Sweep slowed 2000→2600ms so reaction jitter is a smaller share of the zone. `histRef` removed. (2) The "3x CRITICAL" was overlapping floats: a `-79` damage float AND a separate `KRİTİK!` word float at IDENTICAL coordinates, plus orange ticker. Now ONE float per hit — crit shows as `⚡-79` in orange (bigger), block as `🛡-N`, and the separate noteCrit/noteBlock floats are deleted. Miss/dodge/stun/revive remain single word-floats; they never co-occur with a damage number. Intro/showcase/card/confetti overlays are all single-purpose and untouched.

- **STUN BASELINE + DEDUP + BALANCE + EXACT QTE (2026-07-12, v3)**: (1) Every attack has a base 5% stun chance (+item/card stunChance on top; anchor immunity still consumes the roll first). (2) "CRITICAL 3x" was UI redundancy — the ticker now renders `logLine(entry, true)` (compact: no crit/block/shield bits); the full line stays in the scrolling log; the float stays as the spatial marker. (3) **QTE grading is exact**: the marker is driven by direct DOM mutation in the rAF (zero display lag) and taps are graded at the pointer event's OWN hardware `timeStamp` against the frame history — no more latency guessing. (4) **Two new passive types**: `sturdy` (caps any single hit at {v}% of max HP; Juggernaut Helm, epic) and `momentum` (+{v}% attack per round; War Banner, epic) — templates use {v} like the others. (5) Balance pass for 200 HP era: flat-HP items scaled up (Crown 35→55, Guardian 25→40, Dragon King 30→45, Copper Ring 12→22), obvious picks trimmed (Rapier 18→15 atk, Dragonfang 36→32, Hermes 22→17 spd, Giant's Greatsword 42→38, Cursed Skull -25→-40 hp), weak commons buffed (Rusty Sword 16, Bucket Helm 15 def). 99 items.

- **TIMING TIERS + WEAPON RECOVERY + SHARE FIX (2026-07-12, v2)**: (1) Share image fixed: html2canvas can't render `bg-clip-text` gradient text (the champion name became an orange bar) — `onclone` swaps it to solid amber via `data-share-name`; and share no longer falls into clipboard after a cancelled share sheet (clipboard/download ONLY when `canShare` is unsupported). (2) Crit notes no longer bleed into the next beat (delayed floats check `indexRef` before pushing). (3) **Timing tiers per owner spec**: center 1% line (white marker in the bar) = PERFECT (defender: always dodges; attacker: lands the hit unless defender is also perfect); ≤10% = good (defender dodges); outside = bad (fail). Tap grading lookback raised to 110 ms; client shows PERFECT/Good/Bad feedback. Server mirror in `maybeResolveDuel` (PERFECT 0.015 / GOOD 0.1). (4) **Dropped weapons come back**: `disarm` saves the weapon and sets `weaponRecoverIn=2` — the fighter improvises ONE turn, then a `weaponRecover` passive beat fires ("grabs the weapon back", pickup animation) and stats/name restore; the 3D weapon physically drops to the floor and re-attaches to the hand on recovery (`rig.droppedWeapon` stash). Fists-by-default fighters never "recover". (5) Bees interlude (everyone -3) + 5 stat items (Veteran's Hood with hood model, Squire's Mail, Scout Sandals, Lucky Dice, plus earlier adds) — 97 items total.

- **ROOM LIFECYCLE + SHARE V2 (2026-07-12, final)**: (1) Empty lobbies are DELETED (withRoom removes the row/mem entry when lobby has 0 players after prune). (2) Host failover grace extended: leadership moves only after the host is unseen for 60 s (was 20 s). (3) **Host can kick** lobby players (✕ on rows, `kick` action, humans only); the kicked client detects it is no longer in `players` and shows "Odadan çıkarıldın" then exits (kicked players can rejoin via the code). (4) Duplicate damage displays fixed: the center-screen -N reveals were removed — fighter-anchored floats are the single source. (5) **Lobby shout**: non-hosts have a "📢 Başlatmasını iste!" button (same 30 s server cooldown; host toast says "X BAŞLAT diyor"). (6) **Share v2**: html2canvas (new dep) captures the champion section DOM exactly as rendered (buttons excluded via `data-noshare`), so the share image matches the page 1:1 — native share sheet → clipboard → download chain unchanged.

- **FLOATS ANCHORED TO FIGHTERS + OVERLAY CLEANUP (2026-07-12, latest)**: (1) The DOM moon/sun discs and the 16 static star dots (`ArenaFX` night/bloodmoon + `theme.celestial`) are DELETED — 3D mood lighting owns event atmosphere now; only fog wisps and the sun-glow gradient remain DOM. (2) **Damage/heal/notes float above the fighter they belong to**: Arena3D projects each fighter's head to screen space every frame into `screenPosRef` (prop from BattleStage); floats capture that position when pushed (`pushFloat`), rendered in one absolute layer; attack damage now also floats over the defender at impact (+620 ms). (3) **Corpse re-stand root cause**: the elapsedMs sync could snap BACKWARD, replaying pre-death beats — sync is now FORWARD-ONLY (`expected > i + 1`). (4) Battles start fully zoomed out (previous commit) — verified.

- **SHARE CARD + HOST FAILOVER + RENAME (2026-07-12, night)**: (1) Champion screen "📤 Sonucu paylaş" button draws a 1080×1350 share card on a canvas (gradient bg, champion portrait via `avatarThumb`, crown, name, top-5 standings, site footer) and hands it to the NATIVE SHARE SHEET (`navigator.share` with a File — iOS offers Save Image/publish); fallbacks: clipboard `ClipboardItem` → download. (2) **Host failover**: `tick()` reassigns `hostId` to the first connected human non-spectator whenever the current host is gone or disconnected (>20 s) — dropped leaders no longer freeze restarts. (3) **Lobby rename**: ✏️ next to your own row opens an inline input; `rename` action (lobby-only, uniqueness-checked via err_taken) + localStorage update.

- **BACKGROUND-RETURN + EVENT SCALE + SYNC (2026-07-12, late)**: (1) Returning from a backgrounded tab left the arena unrendered — iOS drops the WebGL context; the shared renderer now `preventDefault()`s `webglcontextlost` so three restores the context and re-uploads everything automatically. (2) Battles start FULLY ZOOMED OUT (`cameraState.zoom = 2.8` on every Arena3D mount; players can still pinch in; azimuth persists). (3) **Events now change the fighters**: `EVENT_VISUALS` scales characters per event (Giant's Might ×1.45, Glass Cannon ×0.9) — scale flows through model normalization, name sprite height, placeholder, and the circling ring radius; add entries there for future events. (4) **Clients stay in sync**: every poll compares the server's `elapsedMs`-derived beat index with the local one and snaps when ≥2 beats apart — all phones show the same beat within ~1 beat. (5) Blank-below-battle verified DEAD: fullPage screenshot equals the viewport exactly.

- **QTE PRECISION + SHOUT + CUSTOM CODES + LAYOUT (2026-07-12, evening)**: (1) QTE taps are graded at the marker position **80 ms before the tap event** (frame-history ring buffer) to cancel touch latency, and the sweep slowed 1600→2000 ms — hitting the visible zone now registers. (2) **Shout feature**: non-hosts get a "📢 Bir el daha iste!" button on champion (and it works in lobby via the same action); server enforces a 30 s per-room cooldown (`RoomState.shout`, snapshot exposes it for 6 s); the HOST sees an amber toast. Client button also self-disables 30 s. (3) **Custom room codes**: create form has an optional 4–6 char code field; `createRoom(customCode)` rejects taken codes with `err_code_taken` (verified: duplicate returns 409). (4) Battle layout corrected: log back to fixed h-24 (the flex-1 log from the previous fix was stealing half the arena), BattleStage root overflow-hidden, and `main` drops `min-h-dvh`+shrinks padding during battles with the wrapper at `100dvh-6rem` — page fits the viewport EXACTLY, no bottom void, arena ~2x taller. (5) ItemCard stats render in canonical order (attack→defense→hp→speed→crit→critDmg→acc→dodge→initiative). (6) **3 more shield items using previously unused models**: Tribal Round Shield weapon (shield_round_barbarian, left hand), Royal Guard Plate armor (shield_square_color), Dueling Buckler accessory (Skeleton_Shield_Small_B). Inventory now: **92 items — all 25 weapons have 3D models; 8 headgear + 1 mask render on the head; 6 block/shield items render in the off-hand; quiver on bow users**. Boots/armor bodies remain unmountable (baked meshes).

- **SPECTATORS + TWO-HAND FIXES + SYNC (2026-07-12, later)**: (1) **Late joiners become spectators**: joining a non-lobby room adds a `spectator: true` player (cap 12 total) — no draft/luck offers (auto-marked picked), excluded from brackets/league standings, listed in the İzleyiciler card and at the bottom of champion standings with 👀, and converted to a real player on "one more game". (2) **Two-handed weapons hold correctly**: `WeaponModelDef.hand` mounts bows and the Spiked Shield in the LEFT hand (the bow-hand in KayKit's archery clips); two-handed kinds (bow/crossbow/dual/heavy) and left-hand weapons SUPPRESS the passive block/shield offhand model — no more shield+bow cascading. (3) **Animations are synced across clients**: all random clip pool picks are seeded by the beat index (`applyPose` seed param) so every phone shows the same victory cheer/strike variant/dodge direction. (4) The blank scroll space under the battle was the log column overflowing its fixed-height wrapper — log is now `flex-1 min-h-16` and the wrapper `overflow-hidden`; page fits the viewport exactly. (5) **Magnet shows a proper panel** (item row + red DISABLED stamp + shake) instead of a flying item; pirate/trade keep the flight. (6) Champion screen gained a **Maç Geçmişi** card (all bracket results, winners green).

- **MUTE + 9 ITEMS + ANIMATION FILL (2026-07-12, afternoon)**: (1) 🔊/🔇 mute button in the room header (`isMuted`/`setMuted` in sound.ts, persisted in localStorage `bd_muted`; the single `tone()` generator gates all sfx). (2) **9 new items with real models**: Hatchet (axe_1handed — was unused), Bone Crossbow + Bone Wall armor + Bone Ward accessory (Skeletons pack crossbow/large shield/small shield — shields render in the left hand via block/shield passives), Claymore (Quaternius, finally downloaded), Forbidden Grimoire (spellbook_open, magic kind), Dancer's Steps boots + Smoke Bomb accessory (stat-only). Item count 82→91. (3) **Previously unused animation clips wired in**: new `throw`/`pickup` poses (rock/boot quirks now actually THROW with a flying stone projectile; dropped-weapon quirk plays PickUp), fighters SPAWN from the ground at battle start (Spawn_Ground), victory pool randomizes Cheering/Waving/Push_Ups/Jump, magic windups sometimes Summon, blocks sometimes counter (Melee_Block_Attack), taunts sometimes Wave.

- **LEAGUE LEGS + TIE-BREAKS + CARD FX + MAP QUALITY (2026-07-12, noon)**: (1) Home&away now applies to LEAGUE ROUNDS too — each round-robin pairing plays exactly 2 legs with sides swapped (not first-to-2; both legs count toward standings; a 1-1 split credits the match.winner to the last-leg winner for display). League semis stay first-to-2; grand final always single. Verified with an in-process engine sim (3 players, league+homeAway → 6 league battles + 1 final). (2) **Standings tie-breaks**: battle wins → head-to-head record between the tied players (`headToHeadDiff`, reads legWins or match winners across league rounds) → deterministic drawing of lots (`lotHash(code+playerId)` — stable, unbiased). (3) **Card theft/trade is animated**: pirate/trade/magnet `card` beats render `CardSwapFx` — the item emoji + name flies across the screen between the fighters (trade shows both items crossing); card pre-entries now carry `params.side` (owner). (4) Colosseum re-optimized at 2048px textures (2.6 MB) after the 1024px version looked soft — quality/memory sweet spot; the ≤8 MB rule stands.

- **CRASH ROOT CAUSE KILLED + POLISH (2026-07-12, morning)**: (1) **The iOS "problem repeatedly occurred" crash at battle start was the 24.7 MB Meshy Colosseum GLB** — 4K textures decoded into hundreds of MB of GPU memory and Safari killed the page. Optimized with gltf-transform (dedup + resize 1024 + webp) to **1.74 MB**, visually identical at game distances; original kept at `models/arena_base_original.glb` (gitignored). RULE: never ship a map over ~8 MB; run the same pipeline on every new arena. (2) Event moods now light the whole arena: `LIGHT_MOODS` in Arena3D tints and dims ambient/hemisphere/sun per fx (blood moon = dark red arena, night = dim blue, sun = warm bright...). (3) Guard stances are weapon-aware (bow aims, crossbow shoulders, magic channels instead of shield-blocking) and circling strafe clips play at a speed matched to actual movement (`setEffectiveTimeScale`; playAction resets timeScale). (4) QTE polish: timing zone ±10%, result text is neutral "PERFECT TIMING!/Bad timing..." without emojis (you don't know yet if it was a dodge or a hit), attacker zone orange. (5) Spectator/results fonts smaller, trophy emoji dropped (green = winner), champion portrait -10%, crown above the ŞAMPIYON label. (6) **`docs/MESHY_PROMPTS.md`**: full prompt pack for the owner to generate new weapons/headgear/shields/trinkets and 5 arena maps (tavern with patrons + open windows, throne room, docks, glade, snowy peak) with style suffix, tri budgets, orientation/export rules, and the mandatory optimization step.

- **SMALL-SCREEN FIT (2026-07-12)**: the pre-battle showcase overflowed on non-Max iPhones (5th item clipped) — chips/portrait/headline compacted plus `overflow-y-auto` safety, verified at 375x667. The champion crown now drops in above the ŞAMPIYON label (owner moved it off the character). Spectators and match results under the battle log are two side-by-side cards: spectators one-per-row with mini portraits (💀 strikethrough when out), results one-per-row winner-highlighted with 🏆, newest first, scrollable.

- **LEAGUE MODE + POLISH PASS (2026-07-12, late night)**: (1) **League mode shipped** (`tourneyMode` on RoomState, host "Tournament: Knockout/League" card in lobby): round-robin schedule via the circle method (`roundRobinRounds`; odd counts sit one player out per round; nobody is eliminated during the league), then playoffs from the standings — 6+ players → top 4 into semis (1v4, 2v3), 3–5 players → top 2 straight to the final, 2 players → just a final. `leagueStage` ("league"/"semis"/"final") drives round labels and gates home&away: legs apply ONLY in league semis (league rounds and the grand final are always single matches; knockout mode keeps legs everywhere). Standings = battle wins; non-qualifiers get `eliminated` when playoffs start. (2) **Base HP doubled to 200** — fights breathe instead of one-shotting (ALL IN's bust floor moved to 60). (3) **Black-model mitigation**: AmbientLight added to every 3D scene (arena, portrait studio, lobby turntable) + explicit `outputColorSpace = SRGBColorSpace`; if a device still renders black it is almost certainly a WebGL1-only browser (three 0.185 requires WebGL2) — get the exact device/browser before chasing further. (4) Home-page creators/joiners skip the room nickname prompt (`bd_nick_ok` sessionStorage flag); only direct-link joiners see it, prefilled. (5) **QTE duel rules per owner spec**: green zone shrank (±14% of bar, was ±24%); defender in green ALWAYS dodges; else attacker in their (orange) zone lands the hit; else closer-to-center wins. Feedback text shrunk. (6) Spectators (with 💀 for eliminated) and recent match results render under the battle log (BattleStage `spectators`/`results` props fed from page.tsx). (7) Crit hits flash an orange CRITICAL! note under the victim.
- **BIG FEATURE PASS (2026-07-12, night)**: (1) Room links ALWAYS ask for a nickname (prefilled from localStorage — one tap for returning players). (2) **Curse rebalanced** (owner request): no longer disables the strongest item; the opponent fights at -15% attack / -12% defense (moved to `applyBattleStartCards`; Magnet still disables the weapon). (3) **Weapon loss is visual**: `quirkString`/`quirkArm` timeline keys flip `weaponLost` props from BattleStage; Arena3D drops the mounted `weapon_main` mesh onto the arena floor and the fighter's animation kind falls back to fists. (4) Draft hands guarantee **at least 3 pickable items** when slots allow (second amendment to the draft rule) and **8 new items** joined (Hunting Bow, Hunter's Hood, Scale Vest, Cursed Shroud, Leather Striders, Crusader Greaves, War Drum, Frost Charm). (5) **QTE is now a duel**: when both fighters are human, the attacker gets a simultaneous ⚔️ STRIKE! bar; whoever stops closer to the bar's center wins (server compares offsets in `maybeResolveDuel`; vs bots the old green-zone rule applies; `react` action carries a `score`). (6) **Home & away mode** (host toggle in lobby, `matchMode` on RoomState): every knockout tie is best-of-legs — first to 2 battle wins takes the tie, sides swap each leg, battles show "· Leg N". (7) **Round names fixed**: quarterfinal/semifinal/final derived from the bracket round's match count, not player count; byes still auto-advance (3 players → one sits out the semis and waits in the final — standard single-elim). (8) **9 more luck cards** (31 total: anchor/bulwark/sharpshooter/sprinter/flurry/ironskin/headsman/snake/gladiator; anchor needed a `stunImmune` combatant flag — both stun sites consume their RNG roll BEFORE checking immunity to preserve determinism). (9) Old 2D sprites fully gone (AvatarPortrait renders empty space while the PNG bakes). (10) Projectiles fly a gravity arc; bows rotate 90° in hand; shadow map halved to 512 for phone performance. (11) Sneeze + bootlace-trip interludes. NOT DONE: **league mode (round-robin + playoffs)** — needs a schedule generator in place of the bracket, a standings table, and advancement logic; parked for a dedicated session.
- **STABILITY + CONTENT PASS (2026-07-12, later)**: (1) **Bow was invisible — fixed**: `loadWeaponModel` hardcoded `.gltf` but Quaternius conversions are `.glb`; a `GLB_WEAPONS` set picks the extension. (2) **Corpses stay down**: repeated `dead` poses replayed the death clip (die → stand → fall again on the victory beat); `applyPose` now ignores `dead` when the rig is already dead. (3) **Crash hardening**: Arena3D uses ONE module-level shared WebGL renderer (`acquireRenderer`, recreated only if the context is lost) instead of one context per battle — canvas is re-parented per mount and never disposed. (4) **Dynamic strike timing**: the melee run-in duration is computed from the actual distance to the opponent (`meleeRunMs`, clamped 140–480 ms) and the defender's impact reaction uses the same number — attacks land when the swing lands regardless of where the circling left the fighters. (5) **Floating combat notes**: MISS/DODGED/BLOCKED/STUNNED/REVIVED flash under the relevant fighter (new `note` kind in BattleStage floats, en+tr `note*` dictionary keys), timed to impact. (6) **8 new luck cards** (22 total): eagle, turtle, berserker, ghost, cactus, medic, giant, zephyr — all pure stat effects in battle.ts's card block, TR entries added, all in `SELF_LUCK_CARDS`. (7) **More visible gear**: bow-kind fighters wear the Ranger's quiver on their back (`QUIVER_GEAR`, `HeadgearDef.bone` now supports non-head bones — quiver binds to `chest`), and Leather Cap became Leather Hood with the Skeleton_Rogue hood mesh.
- **CIRCLING COMBAT + GEAR PASS (2026-07-12)**: (1) Fighters now circle each other like a real ring fight — a shared circle driver in Arena3D's render loop rotates both ring anchors (`circle.omega` retargets every 1.4–3.6 s, per-rig radius jitter) whenever BOTH poses are calm (`idle`/`guard`), playing Running_Strafe_Left/Right or the stance idle by actual tangential velocity; fighters continuously face each other (per-frame yaw smoothing, frozen when dead) and melee attacks run to the OPPONENT'S CURRENT position (`applyPose` takes the opponent rig), not a fixed spot. (2) Pinch-zoom is disabled app-wide (viewport `userScalable:false` + `touch-action: pan-x pan-y` on html/body) without affecting the arena's own pinch handlers. (3) Lobby share row reworked: 📋 icon next to the room code copies the code; a single "Share link" button uses `navigator.share` when available, else copies. (4) **Bow & arrow are real**: Quaternius Medieval Weapons pack (CC0, converted OBJ→GLB, `scale` field in `WEAPON_MODELS` because Quaternius units are ~3.2x KayKit's) — Longbow is back (`w_bow`, Bow_Wooden) plus three new items: Twin-Bladed Axe (rare, Axe_Double), Cursed Bow (epic, poison), Golden Bow (legendary); new `bow` visual kind uses Ranged_Bow_Idle/Aiming/Release clips and fires the actual Arrow model as its projectile. (5) **Headgear renders on fighters**: `HEADGEAR_MODELS` in items.ts maps helmet items (+ Assassin's Mark as a face mask) to headgear meshes EXTRACTED from the character GLBs we already ship — `buildHeadgear` in characterAssets rebinds a skinned mesh to any rig's head bone via the source skeleton's `boneInverses` (all rigs share Rig_Medium proportions), scaled 1.06 to avoid z-fighting with a character's own baked headgear. Portraits (`avatarThumb`/`AvatarPortrait`) accept full equipment and render shield+headgear too. Verified in isolation (bow in hand, Mage hat on Knight) and in a full driven match.
- **FAIRNESS + UX PASS (2026-07-11, night)**: (1) **Draft rolls are now rarity-weighted per round (owner-approved amendment to the sacred rule)** — `ROUND_RARITY_WEIGHTS` in draft.ts escalates from common-heavy (round 1: 46/30/16/6/2) to legendary-rich (round 5: 14/20/28/23/15). Identical weights for every player, uniform item choice within a rarity — balanced across players, still random, and late rounds got spicier. (2) Luck hands guarantee at least one self-buff card (`SELF_LUCK_CARDS`) so nobody gets three griefing-only options. (3) Global events avoid the last 4 picked in the room (`RoomState.recentEventIds`, survives rematches). (4) Lobby has copy-link/copy-code share buttons with clipboard fallback for non-HTTPS LAN. (5) Four new battle interludes (pigeon, phone ring, referee inspection, pretzel vendor heal) with en+tr `LOG_TEMPLATES`. (6) Phase transitions are eased slide+scale instead of bare fades. (7) **Crash fix**: every WebGL context is now force-released (`renderer.forceContextLoss()` in Arena3D + Avatar3DThumb cleanup; the portrait studio disposes itself 4 s after the last thumb render) — contexts used to linger per battle until the browser hit its context cap and killed the page; Arena3D also caps pixelRatio at 1.75 to cut fill-rate on 3x phones.
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
- **Sacred product rules** (Part II, enforce always): draft randomness follows the owner-approved rules in §1 (rarity-weighted per round, identical for all players — no other biasing); Vercel-serverless only (no websockets/timers); every new item/event/card needs TR+EN entries (4-step checklist in §5); absolutely no code comments; `npm run typecheck` && `npm run build` before every commit.

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
- **Draft rolls follow two owner-approved rules and are otherwise never manipulated.** (1, 2026-07-10) If a rolled hand contains ZERO items for still-unlocked slots, one random card is replaced with a random item from a random unlocked slot, so every player can always fill all 5 slots. (2, 2026-07-11) Rarity is weighted per draft round (`ROUND_RARITY_WEIGHTS` in draft.ts): early rounds are common-heavy, round 5 is legendary-rich. The weights are IDENTICAL for every player in the same round and the item within a rarity is uniform — this balances luck across players without steering anyone's build. Items for already-locked slots still appear (shown grayscale with a 🔒) purely to create regret. No other biasing is allowed.
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
- Pre-battle equipment cards have explicit persistence rules: Trade permanently swaps one slot for the tournament; Pirate temporarily suppresses one random opponent item for two attack attempts; Magnet temporarily suppresses the opponent weapon for two attack attempts; Curse applies battle-only stat penalties; Lightning/ALL IN adjust HP/attack at battle start. Pirate and Magnet never mutate tournament equipment.
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
