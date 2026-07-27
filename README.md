# 🎨 Drawsembly Line

A multiplayer drawing party game (scribbl.io-style) for the weekly meeting: every player draws **one piece** of a painting — and at the end of each round, all the pieces are combined into one glorious collective artwork.

## How it works

- Anyone can join a room via a link/room code. The first person in becomes the **host**.
- Built for big crowds (30+ people): each round, players are automatically split into **groups** sized to fit the preset's parts (e.g. 30 players on a 7-part preset → 5 groups), and every group paints its own canvas.
- **3 rounds**. Presets include 🤖 Robot, 🍔 Burger, 🕷️ Spider-Man, 🏢 Inside the office, 🏠 House, 🦁 Zoo, 🐠 Aquarium, 🐮 Farm, and 🏭 Factory. Before each round starts, the host can pick each group's preset, move players between groups, re-shuffle the groups, and reassign parts. Some parts can be pre-filled (e.g. the robot's head is a default square) — players populate the rest.
- Each round, every player is assigned one or more **parts** of their group's painting (e.g. the robot's left eye, the office plant).
- Players draw their part against the host-configured timer for that round with a simple canvas: pen & eraser, 4 brush sizes, 12 colors, undo/clear, plus a mini-map showing where their part sits in the final painting.
- When time is up, the host gets a **private preview**, then reveals the combined painting to everyone with a dramatic part-by-part animation.
- After 3 rounds: the **final gallery** with every painting, downloadable as PNGs.

### Host controls

- Sees who gets which prompt and can reassign parts within each group
- Picks the preset per group, moves players between groups, and can re-shuffle groups
- Starts the game / each round, can adjust each round's timer, and can end drawing early
- Decides when to reveal each round's paintings
- Advances rounds, ends the game at any time, and can restart from the gallery

## Architecture

- **Next.js (App Router)** frontend, deployed on **Vercel**
- **PartyKit** for realtime multiplayer (WebSocket rooms; Vercel can't hold long-lived socket connections). Game state is in-memory per room — nothing is persisted; download your masterpieces before closing the tab.

## Local development

```bash
npm install
npm run dev:party   # PartyKit server on localhost:1999
npm run dev         # Next.js on localhost:3000 (separate terminal)
```

Open http://localhost:3000, create a room, and join it from a second browser/incognito window.

### End-to-end test

With `npm run dev:party` running:

```bash
node test/e2e.mjs
```

Simulates a full 3-round game with 9 players (joins, grouping, reassignment, moving players between groups, per-group theme switching, drawing, reveal, gallery, late joiner, play-again) over WebSockets.

## Deployment

### 1. PartyKit (realtime server)

```bash
npx partykit login    # one-time, GitHub auth
npx partykit deploy
```

This prints your host, e.g. `weekly-game-party.<your-github-username>.partykit.dev`.

### 2. Vercel (frontend)

Deploy this repo on Vercel (dashboard import or `npx vercel`), and set the environment variable:

```
NEXT_PUBLIC_PARTYKIT_HOST=weekly-game-party.<your-github-username>.partykit.dev
```

Then redeploy. That's it — the frontend connects to the PartyKit host over WSS automatically.
