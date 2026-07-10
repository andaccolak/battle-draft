# Battle Draft iOS

Native SwiftUI + RealityKit client for Battle Draft. It talks to the same Vercel API as the web app — iPhone and web players share rooms, so the game stays cross-platform.

## Open & run

1. Requirements: Xcode 16 or newer (project uses folder-synchronized groups).
2. Open `ios/BattleDraft.xcodeproj`. All sources under `BattleDraft/` are included automatically — adding a file to the folder adds it to the app.
3. Select the BattleDraft target → Signing & Capabilities → pick your personal team (bundle id `com.battledraft.ios`, change if taken).
4. Run on a simulator or device.
5. In the app, tap the gear icon on the home screen to set the server URL (defaults to `https://battle-draft.vercel.app`). Any deployed Battle Draft works; for a local dev server use your Mac's LAN IP with `http://` — that additionally requires an App Transport Security exception (Target → Info → add `NSAppTransportSecurity` → `NSAllowsArbitraryLoads` YES, debug only).

## What's implemented

- Full game flow: home → lobby (12-fighter picker) → draft → luck cards → event reveal → 3D battles → bracket → champion, bilingual TR/EN.
- 3D battle stage: RealityKit non-AR arena, event-themed floor/sky/particles, placeholder block fighters with lunge/hit/dodge/death/victory movement driven by the server battle timeline.
- QTE reaction dodge (timing bar), matching the web implementation.
- Meshy drop-in asset system: see `BattleDraft/Resources/Models3D/README.md` and `MESHY_PIPELINE.md`.

## Rules

Same as the web repo (`handoff.md`): no code comments, server is the single source of truth for game logic, never break the API contract. iOS-specific state and next steps live in `../ios_handoff.md`.
