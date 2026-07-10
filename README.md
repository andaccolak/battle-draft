# ⚔️ Battle Draft

A chaotic multiplayer party auto-battler for friends in the same room. Everyone joins from their own phone, drafts ridiculous gear, gambles on a Luck Card, gets hit by a random Global Event, and then watches fully automatic 3D tournament battles decide who screams loudest.

**Fun over balance. Chaos over predictability. One more game, always.**

## How a match works

1. **Lobby** — one player creates a room and gets a 6-character code. 2–8 players join with just a nickname. No accounts. Everyone picks one of 12 3D fighters; the host picks the arena (Colosseum or Dungeon).
2. **5 Draft Rounds** — every round, each player is offered 5 completely random items across 5 slots (⚔️ Weapon, 🪖 Helmet, 🛡️ Armor, 👞 Boots, 💍 Accessory). Pick exactly one — that slot locks forever. Items for locked slots keep appearing in later rounds, shown in grayscale with a 🔒, purely to make you regret your life choices. Rolls are never manipulated.
3. **Luck Cards** — everyone gets 3 random cards (Pirate, Blacksmith, Curse, ALL IN, ...) and keeps one. They can absolutely flip a match.
4. **Global Event** — one random event out of 30+ (Blood Moon, Tax Season, Mirror World, ...) hits every player.
5. **Tournament** — random bracket, fully automatic 3D battles: animated characters wielding their drafted weapons, weather effects, crits, comedy quirks, a once-per-battle reaction QTE, and confetti. Winner advances, loser turns into a ghost. Last one standing is Champion.

## Tech stack

- Next.js 14 (App Router) + TypeScript strict (`noUncheckedIndexedAccess`)
- three.js for the 3D battle arena and character portraits
- TailwindCSS + Framer Motion for UI, WebAudio for sound
- Realtime via HTTP polling against API routes — all room state lives in PostgreSQL, so the game runs on serverless platforms like Vercel (no websockets, no custom server)
- Prisma ORM + PostgreSQL (Neon) for live game state, match history, and the Hall of Fame (`/stats`)
- Fully bilingual UI (Turkish / English)

## Repository layout

```
docs/                    Asset-generation specs and deep-dive docs
prisma/                  Database schema (live rooms + match history)
public/models3d/
  arena/                 Arena GLBs (Colosseum)
  kaykit/characters/     12 fighter models (KayKit, CC0)
  kaykit/anims/          Shared animation library (~110 clips, one rig)
  kaykit/weapons/        Weapon models attached to fighters' hands
  kaykit/dungeon/        Modular pieces composing the Dungeon arena
src/app/                 Routes: home, room, stats + API route handlers
src/components/          UI: lobby, draft, battle stage, 3D arena, bracket...
src/lib/game/            Pure game logic: items, events, luck cards, battle sim
src/lib/three/           three.js helpers: model loading, portraits, arena kits
src/lib/i18n/            TR/EN dictionary and content names
src/server/              Engine (pure state machine), store, persistence
handoff.md               Developer/AI onboarding document — read this first
```

## Getting started

```bash
npm install
npm run dev            # http://localhost:3000
npm run typecheck      # must pass before every commit
npm run build          # must pass before every commit
```

The repo ships with a ready `.env` pointing at a Neon PostgreSQL database, and the app creates the schema automatically on first use — no migration step needed. To use your own database, just change `DATABASE_URL` in `.env`. If the database is unreachable, rooms transparently fall back to in-memory storage (fine for local play; stats won't be saved).

Playing alone? Start the game solo and 3 bots will join automatically.

## Deploying to Vercel

The game is fully serverless-compatible: rooms are stored in Postgres and clients poll API routes, so there is no websocket server to keep alive.

1. Push this repo to GitHub and import it in Vercel.
2. Add the `DATABASE_URL` environment variable in Vercel project settings (same value as `.env`).
3. Deploy. The schema is created automatically on the first request.

## Asset credits

Characters, animations, weapons, and the Dungeon arena use [KayKit](https://kaylousberg.itch.io/) asset packs by Kay Lousberg (CC0): Adventurers, Skeletons, Character Animations, and Dungeon Remastered. The Colosseum arena model was generated with Meshy.

## Contributing

Read `handoff.md` before making changes — it documents the sacred product rules (draft randomness, serverless-only architecture, bilingual content checklist, comment-free code style) and the pitfalls already hit.
