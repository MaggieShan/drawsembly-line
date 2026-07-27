/* Simulates a full 3-round game against a running `partykit dev` server. */
const HOST = process.env.PARTY_HOST ?? "localhost:1999";
const ROOM = "testroom" + Math.floor(Math.random() * 10000);
const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

let failures = 0;
function check(cond, label) {
  if (cond) console.log(`  ✓ ${label}`);
  else {
    failures++;
    console.error(`  ✗ FAIL: ${label}`);
  }
}

class Client {
  constructor(name, playerId) {
    this.name = name;
    this.playerId = playerId;
    this.view = null;
    this.images = {};
    this.ws = new WebSocket(`ws://${HOST}/parties/main/${ROOM}`);
    this.ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "sync") this.view = msg.view;
      if (msg.type === "part_image") {
        this.images[msg.roundIndex] ??= {};
        this.images[msg.roundIndex][msg.partId] = msg.dataUrl;
      }
    };
    this.opened = new Promise((res) => (this.ws.onopen = res));
  }
  send(msg) {
    this.ws.send(JSON.stringify(msg));
  }
  async join() {
    await this.opened;
    this.send({ type: "join", playerId: this.playerId, name: this.name });
  }
  async until(pred, label, timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (this.view && pred(this.view)) return true;
      await new Promise((r) => setTimeout(r, 50));
    }
    console.error(
      `  ✗ TIMEOUT waiting for: ${label}. view=${JSON.stringify(this.view)}`
    );
    failures++;
    return false;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const host = new Client("Hosty", "pid-host");
const p2 = new Client("Playerina", "pid-p2");

console.log(`Room: ${ROOM}`);
await host.join();
await p2.join();

await host.until((v) => v.players.length === 2, "both players in lobby");
check(host.view.you.isHost === true, "first joiner is host");
check(p2.view.you.isHost === false, "second joiner is not host");
check(host.view.phase === "lobby", "phase is lobby");

// Start game
host.send({ type: "start_game" });
await host.until((v) => v.phase === "assign", "phase -> assign");
check(host.view.rounds.length === 3, "3 rounds configured");
check(host.view.rounds[0].themeId === "robot", "round 1 theme robot");
const assignments = host.view.rounds[0].assignments;
check(
  assignments && Object.keys(assignments).length === 7,
  "all 7 assignable robot parts assigned (head is prefilled)"
);
check(
  assignments && assignments["head"] === undefined,
  "prefilled robot head is not assigned to anyone"
);
const assignedPlayers = new Set(Object.values(assignments));
check(assignedPlayers.size === 2, "parts distributed across both players");
check(
  p2.view.rounds[0].assignments === undefined,
  "non-host does not see full assignments"
);
check(p2.view.yourParts.length >= 1, "p2 has assigned parts");

// Host reassigns one part to p2
const firstPart = Object.keys(assignments)[0];
host.send({ type: "reassign", partId: firstPart, playerId: "pid-p2" });
await host.until(
  (v) => v.rounds[0].assignments[firstPart] === "pid-p2",
  "reassignment applied"
);

// Theme switch and back
host.send({ type: "set_theme", themeId: "house" });
await host.until((v) => v.rounds[0].themeId === "house", "theme switched to house");
host.send({ type: "set_theme", themeId: "robot" });
await host.until((v) => v.rounds[0].themeId === "robot", "theme back to robot");

// Non-host cannot start the round
p2.send({ type: "start_round" });
await sleep(300);
check(host.view.phase === "assign", "non-host cannot start round");

// Round 1: draw + finish via done
async function playRound(expectTheme, { useTimerEnd = false } = {}) {
  host.send({ type: "start_round" });
  await host.until((v) => v.phase === "drawing", "phase -> drawing");
  check(typeof host.view.drawingEndsAt === "number", "drawingEndsAt set");
  const remaining = host.view.drawingEndsAt - host.view.serverNow;
  check(remaining > 55000 && remaining <= 61000, "≈60s timer");

  // Everyone submits snapshots for their parts
  for (const c of [host, p2]) {
    for (const partId of c.view.yourParts) {
      c.send({ type: "snapshot", partId, dataUrl: PNG });
    }
  }
  await host.until(
    (v) => v.rounds[v.roundIndex].submittedParts.length > 0,
    "snapshots registered"
  );

  if (useTimerEnd) {
    host.send({ type: "end_drawing" }); // host ends early instead of waiting 60s
  } else {
    for (const c of [host, p2]) {
      for (const partId of c.view.yourParts) {
        c.send({ type: "done", partId });
      }
    }
  }
  await host.until((v) => v.phase === "reveal_wait", "phase -> reveal_wait", 8000);
  check(
    Object.keys(host.images[host.view.roundIndex] ?? {}).length > 0,
    "host got preview images"
  );
  check(
    Object.keys(p2.images[p2.view.roundIndex] ?? {}).length === 0,
    "p2 has no images before reveal"
  );

  p2.send({ type: "reveal" });
  await sleep(300);
  check(host.view.phase === "reveal_wait", "non-host cannot reveal");

  host.send({ type: "reveal" });
  await p2.until((v) => v.phase === "reveal", "phase -> reveal");
  await sleep(300);
  check(
    Object.keys(p2.images[p2.view.roundIndex] ?? {}).length > 0,
    "p2 received part images at reveal"
  );
  check(
    p2.view.rounds[p2.view.roundIndex].themeId === expectTheme,
    `theme is ${expectTheme}`
  );
  host.send({ type: "next_round" });
}

console.log("Round 1:");
await playRound("robot");
await host.until((v) => v.phase === "assign" && v.roundIndex === 1, "round 2 assign");

console.log("Round 2:");
await playRound("burger", { useTimerEnd: true });
await host.until((v) => v.phase === "assign" && v.roundIndex === 2, "round 3 assign");

console.log("Round 3:");
await playRound("spiderman");
await host.until((v) => v.phase === "gallery", "phase -> gallery after 3 rounds");
check(
  host.view.rounds.every((r) => r.revealed),
  "all rounds revealed in gallery"
);
check(Object.keys(p2.images).length === 3, "p2 has images for all 3 rounds");

// Late joiner sees the gallery images
const late = new Client("Latey", "pid-late");
await late.join();
await late.until((v) => v.phase === "gallery", "late joiner lands in gallery");
await sleep(400);
check(Object.keys(late.images).length === 3, "late joiner received all images");

// Play again
host.send({ type: "play_again" });
await host.until((v) => v.phase === "lobby", "play_again -> lobby");

host.ws.close();
p2.ws.close();
late.ws.close();

if (failures > 0) {
  console.error(`\n${failures} check(s) FAILED`);
  process.exit(1);
}
console.log("\nAll checks passed 🎉");
process.exit(0);
