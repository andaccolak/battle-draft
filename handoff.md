# Battle Draft — Claude Handoff Document

This document briefs an AI assistant (or a new developer) taking over work on this codebase. Read it fully before making changes.

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
- **Draft rolls are never manipulated.** Each of the 5 offered items every round is fully random, independent of what the player owns or lacks. Items for already-locked slots still appear (shown grayscale with a 🔒) purely to create regret. Do not "help" players by biasing rolls — that is explicitly forbidden.
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
