# 🎨 Doodle Together

A multiplayer drawing party game (scribbl.io-style) for the weekly meeting: every player draws **one piece** of a painting — and at the end of each round, all the pieces are combined into one glorious collective artwork.

## How it works

- Anyone can join a room via a link/room code. The first person in becomes the **host**.
- **3 rounds**, each with a theme. Presets: 🤖 Robot, 🧑‍💻 Zach Lloyd, 🏢 Inside the office, 🏠 House (host can pick the theme per round).
- Each round, every player is assigned one or more **parts** of the painting (e.g. the robot's left eye, the office plant). Parts are auto-distributed; the host can reassign any part before the round starts.
- Players get **60 seconds** to draw their part with a simple canvas: pen & eraser, 4 brush sizes, 12 colors, undo/clear, plus a mini-map showing where their part sits in the final painting.
- When time is up, the host gets a **private preview**, then reveals the combined painting to everyone with a dramatic part-by-part animation.
- After 3 rounds: the **final gallery** with every painting, downloadable as PNGs.

### Host controls

- Sees who gets which prompt and can reassign parts
- Picks the theme per round
- Starts the game / each round, can end drawing early
- Decides when to reveal each painting
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

Simulates a full 3-round game (joins, assignment, reassignment, theme switching, drawing, reveal, gallery, late joiner, play-again) over WebSockets.

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
