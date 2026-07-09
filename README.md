# ⚔️ Battle Draft

A chaotic multiplayer party auto-battler for friends in the same room. Everyone joins from their own phone, drafts ridiculous gear, gambles on a Luck Card, gets hit by a random Global Event, and then watches fully automatic tournament battles decide who screams loudest.

**Fun over balance. Chaos over predictability. One more game, always.**

## How a match works

1. **Lobby** — one player creates a room and gets a 6-character code. 2–8 players join with just a nickname. No accounts.
2. **5 Draft Rounds** — every round, each player is offered 5 completely random items across 5 slots (⚔️ Weapon, 🪖 Helmet, 🛡️ Armor, 👞 Boots, 💍 Accessory). Pick exactly one — that slot locks forever. Items for locked slots keep appearing in later rounds, shown in grayscale with a 🔒, purely to make you regret your life choices. Rolls are never manipulated.
3. **Luck Cards** — everyone gets 3 random cards (Pirate, Blacksmith, Curse, ALL IN, ...) and keeps one. They can absolutely flip a match.
4. **Global Event** — one random event out of 30+ (Blood Moon, Tax Season, Mirror World, ...) hits every player.
5. **Tournament** — random bracket, fully automatic animated battles with a live battle log, screen shake, crits, steals, revives, and confetti. Winner advances, loser turns into a ghost. Last one standing is Champion.

## Tech stack

- Next.js (App Router) + TypeScript (strict)
- TailwindCSS + Framer Motion
- Socket.io on a custom Node server (`server.ts`)
- Prisma ORM + PostgreSQL (Neon) for match history and the Hall of Fame (`/stats`)

## Getting started

```bash
npm install
npm run dev            # http://localhost:3000
```

The repo ships with a ready `.env` pointing at a Neon PostgreSQL database, and the server creates the schema automatically on first start — no migration step needed. To use your own database, just change `DATABASE_URL` in `.env`.

Any way of starting Next.js works: `npm run dev`, `npm start`, or a plain `next dev` / `next start` — the Socket.io server attaches itself to whichever Node server is running. The one hard requirement is a **persistent Node process**: serverless hosts like Vercel or Netlify cannot run this game (rooms live in server memory and websockets need a long-lived server). For deployment use Railway, Render, Fly.io, a VPS, or just a laptop on the local network.

Playing alone? Start the game solo and 3 bots will join automatically. The UI is available in Turkish and English (toggle in the top corner).

Production:

```bash
npm run build
npm start
```

The game itself runs fully in memory; the database only stores finished match history and player statistics, so the game keeps working even if the database is briefly unavailable.

## Project structure

```
server.ts                  custom HTTP server: Next.js + Socket.io
prisma/schema.prisma       rooms, matches, participants, battles, player stats
src/lib/game/              pure game logic (items, luck cards, events, battle sim, draft)
src/server/                room state machine, socket handlers, persistence
src/hooks/useGame.ts       client-side realtime game state
src/components/            lobby, draft, luck, event, battle stage, bracket, champion
src/app/                   pages: home, room/[code], stats
```
