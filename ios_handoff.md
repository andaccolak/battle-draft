# Battle Draft iOS — Claude Handoff

Living status document for the native iOS client. Read `handoff.md` (web/server) first — all its rules apply here too. **Update this file at the end of every working session** so the next session (possibly a different account) can continue seamlessly.

## Ground rules

- **Branch model**: all iOS work lives on the `ios` branch — commit and push there, never to the shared default branch (`claude/multiplayer-party-game-5dip9w`). Start every session with `git checkout ios && git merge origin/claude/multiplayer-party-game-5dip9w` (after `git fetch`) to inherit the teammate's web/server work; resolve conflicts in favor of his web changes.
- **Pull before every session** (`git fetch` + merge as above). Two people develop in parallel; the web/server side changes under you. After merging, check whether the API/timeline contract changed (see "Contract watch" below) and mirror changes into the Swift models.
- All iOS work lives in `ios/`. Never touch web/server files unless the task explicitly requires an API extension — and any API change must stay backward-compatible with the deployed web client (add fields, never rename/remove).
- **No code comments anywhere**, Swift included (owner rule).
- Commit small with imperative messages; push to the same branch (`claude/multiplayer-party-game-5dip9w`).
- Verify before committing: `cd ios && xcodebuild -project BattleDraft.xcodeproj -scheme BattleDraft -sdk iphonesimulator CODE_SIGNING_ALLOWED=NO build` must succeed. If web files were touched, also `npm run typecheck` and `npm run build` at repo root.

## Architecture (decided, do not re-litigate)

The iOS app is a **pure client** of the existing serverless API — no game logic on the device. It polls `GET /api/rooms/[code]?playerId=` every 1.2 s and POSTs actions (`join/start/avatar/pick/luck/react/again/leave`), identical to the web client. Battle rendering is playback of the server's `timeline` entries. This keeps web + iOS players in the same rooms (cross-platform requirement).

## Repository map (ios/)

```
BattleDraft.xcodeproj          Hand-written pbxproj, objectVersion 77, folder-synchronized
                               groups: every file under BattleDraft/ is auto-included. Xcode 16+.
BattleDraft/
  BattleDraftApp.swift         @main entry
  Config.swift                 Server base URL (UserDefaults override via home-screen gear)
  Models/GameModels.swift      Codable mirrors of src/lib/game/types.ts (snapshot/battle/timeline)
  Models/Avatars.swift         12 avatar styles (ids must match src/lib/game/avatars.ts)
  Networking/APIClient.swift   REST calls
  Networking/GameSession.swift Polling loop, clock-skew fix, all POST actions
  Localization/Strings.swift   t()/logLine()/itemName() — port of src/lib/i18n/index.tsx logic
  Localization/ContentStrings.swift  TR/EN dictionaries — MUST STAY IN SYNC with
                               src/lib/i18n/dictionary.ts and content.ts (see Contract watch)
  Views/                       Home, Room (phase router), Lobby (avatar picker), Draft, Luck,
                               EventReveal, Bracket, Champion, shared components
  Battle/TimelinePlayer.swift  Schedules timeline entries by ms, resumes from elapsedMs
  Battle/BattleView.swift      Battle screen: HP bars, overlays (VS, showcase, damage, QTE), log
  Battle/BattleSceneView.swift RealityKit ARView (nonAR): arena, FighterRig placeholders, poses
  Battle/ArenaTheme.swift      eventId → colors/particles (mirror of web EVENT_FX mapping)
  Resources/Models3D/          Meshy USDZ drop-in (see its README; app falls back to placeholders)
scripts/meshy-generate.mjs     Meshy API text-to-3D → Models3D (needs MESHY_API_KEY)
MESHY_PIPELINE.md              Prompts + rig/export/convert workflow for all assets
README.md                      Open/run instructions
```

## Contract watch — things that break silently

1. **Timeline entry types**: `TimelineEntry.t` is a plain String in Swift on purpose (unknown types render as log lines and idle poses instead of crashing). When the server adds types (latest additions: `showcase`, `quirk`), add pose/overlay handling in `BattleSceneView.posesFor` and `BattleView.overlays`.
2. **QTE / pending reactions** (added by teammate in a44a82e): `battle.pending {side, playerId, nickname}`; while pending, server caps `elapsedMs` at the pause point and the timeline GROWS after each `{type:"react", pass}` POST. iOS handles this in `BattleView.onChange(of: battle.timeline.count)` — restart playback from server `elapsedMs`. Auto-fail deadline is server-side; absent players never stall a match.
3. **i18n**: every new item/event/card/log template added to `src/lib/i18n/content.ts` or `dictionary.ts` needs the same entry in `ContentStrings.swift`, or iOS shows raw ids/English. Diff those two TS files against ContentStrings when pulling.
4. **Avatars**: ids in `Models/Avatars.swift` must match `src/lib/game/avatars.ts`.

## State as of 2026-07-10

- Full game flow implemented and **compiles clean** (Xcode 26.6, iphonesimulator). Not yet run against a live server from a device by the owner.
- Battle scene = placeholder block fighters (boxes/spheres colored per avatar, weapon block by rarity, fists when unarmed, helmet cap, legendary aura) with move-based pose animation. Real models come from Meshy via the drop-in system.
- QTE dodge implemented (sin-oscillating marker, period 0.9 s, pass zone |pos−0.5| ≤ 0.12 — same as web).
- Web app untouched this session.

## Roadmap (in order)

1. Owner opens the project, sets signing team, runs against the Vercel deployment, plays a full solo match. Fix whatever reality reveals (theme colors, overlay timing, HP bar sync).
2. First Meshy character end-to-end (`character_blaze.usdz`, rigged + animated) → then implement named-animation playback in `FighterRig.setPose` (play "attack"/"hit"/"death" clips when `availableAnimations` has them, keep transform moves as fallback).
3. Remaining 11 characters, weapon USDZ attachment (hand bone or fixed offset), arena terrains per theme.
4. ARPG drama pass: camera cuts (dolly to attacker on windup, orbit on death blow, slow-mo on crit via scaled entry ms), WebAudio-equivalent sound (AVAudioEngine or bundled SFX), particle hits, sound toggle.
5. Polish: app icon, TestFlight, PWA-parity features (stats screen).

## Open issue: draft picks reported not working on device

Owner reported he "could not select items" during draft on his device. Verified NOT a data-layer bug: a compiled Swift harness using the app's own GameModels + identical JSON bodies played FULL matches against both localhost and the production Vercel server — create/join/pick/luck/react all succeed and decode (harness pattern: compile Models/GameModels.swift + a main.swift against macOS SDK, see session log). Leading hypothesis: he was a spectator — join silently failed (err_taken: same nickname already in room from a web session with a different playerId, or err_started), so no offer arrives and cards never render. Hardening shipped: persistent orange banner when `me == nil` mid-game, action failures set errorCode (no more silent taps), pressed-state feedback + contentShape on item cards. If he reproduces after this, the banner text identifies the failure class. Simulator UI automation to reproduce it live was blocked by a macOS TCC permission prompt (Terminal input-control) that only the owner can approve — if approved, cliclick + AXRaise + bezel-less window mapping works (see scratchpad tap.sh technique: turn OFF Show Device Bezels, content starts ~52pt below window top).

## Session log

- **2026-07-10 (session 1)**: Created the whole ios/ project from scratch: pbxproj, models, networking, all screens, RealityKit battle stage, TR/EN localization port, QTE support (inherited teammate's a44a82e mid-session), Meshy pipeline docs + script, this handoff. Build verified.
- **2026-07-10 (session 2)**: Created `ios` branch (new home for iOS work). Investigated draft-pick report (see Open issue above), shipped visibility/hardening fixes, verified full-match Swift harness against production. Owner set DEVELOPMENT_TEAM in pbxproj (keep it).
