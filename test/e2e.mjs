/* Simulates a full 3-round game with 9 players against a running `partykit dev` server. */
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
    this.images = {}; // roundIndex -> groupIndex -> partId -> dataUrl
    this.ws = new WebSocket(`ws://${HOST}/parties/main/${ROOM}`);
    this.ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "sync") this.view = msg.view;
      if (msg.type === "part_image") {
        this.images[msg.roundIndex] ??= {};
        this.images[msg.roundIndex][msg.groupIndex] ??= {};
        this.images[msg.roundIndex][msg.groupIndex][msg.partId] = msg.dataUrl;
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
  imageCount(roundIndex) {
    return Object.values(this.images[roundIndex] ?? {}).reduce(
      (n, g) => n + Object.keys(g).length,
      0
    );
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

// 9 players: robot (7 assignable parts) -> 2 groups.
const host = new Client("Hosty", "pid-host");
const others = Array.from(
  { length: 8 },
  (_, i) => new Client(`Player${i + 2}`, `pid-p${i + 2}`)
);
const clients = [host, ...others];
const p2 = others[0];

console.log(`Room: ${ROOM}`);
await host.join();
for (const c of others) await c.join();

await host.until((v) => v.players.length === 9, "all 9 players in lobby");
check(host.view.you.isHost === true, "first joiner is host");
check(p2.view.you.isHost === false, "second joiner is not host");
check(host.view.phase === "lobby", "phase is lobby");

// Start game
host.send({ type: "start_game" });
await Promise.all(
  clients.map((c) => c.until((v) => v.phase === "assign", "phase -> assign"))
);
check(host.view.rounds.length === 3, "3 rounds configured");

console.log("Grouping:");
const r0 = host.view.rounds[0];
check(r0.groups.length === 2, "9 players on robot -> 2 groups");
check(
  r0.groups.every((g) => g.themeId === "robot"),
  "both groups default to robot"
);
for (const [gi, g] of r0.groups.entries()) {
  check(
    Object.keys(g.assignments).length === 7,
    `group ${gi + 1} has all 7 assignable parts assigned`
  );
  check(
    g.assignments["head"] === undefined,
    `group ${gi + 1} head is prefilled, not assigned`
  );
  check(
    Object.values(g.assignments).every((pid) => g.members.includes(pid)),
    `group ${gi + 1} parts are assigned to its own members`
  );
}
const allMembers = r0.groups.flatMap((g) => g.members);
check(
  allMembers.length === 9 && new Set(allMembers).size === 9,
  "every player is in exactly one group"
);
check(
  clients.every((c) => c.view.yourParts.length >= 1),
  "every player has at least one part"
);
check(
  clients.every((c) => c.view.yourGroupIndex !== null),
  "every player knows their group"
);
check(
  p2.view.rounds[0].groups.every((g) => g.assignments === undefined),
  "non-host does not see full assignments"
);

// Host reassigns a part within group 0
const g0 = host.view.rounds[0].groups[0];
const somePart = Object.keys(g0.assignments)[0];
const target =
  g0.members.find((id) => id !== g0.assignments[somePart]) ?? g0.members[0];
host.send({ type: "reassign", groupIndex: 0, partId: somePart, playerId: target });
await host.until(
  (v) => v.rounds[0].groups[0].assignments[somePart] === target,
  "reassignment within group applied"
);

// Reassigning to a non-member is rejected
const outsider = host.view.rounds[0].groups[1].members[0];
host.send({
  type: "reassign",
  groupIndex: 0,
  partId: somePart,
  playerId: outsider,
});
await sleep(300);
check(
  host.view.rounds[0].groups[0].assignments[somePart] === target,
  "cannot assign a part to a player outside the group"
);

// Move a player between groups
const mover = host.view.rounds[0].groups[0].members.at(-1);
host.send({ type: "move_player", playerId: mover, groupIndex: 1 });
await host.until(
  (v) =>
    v.rounds[0].groups[1].members.includes(mover) &&
    !v.rounds[0].groups[0].members.includes(mover),
  "player moved between groups"
);

// Per-group theme switching
host.send({ type: "set_theme", groupIndex: 1, themeId: "house" });
await host.until(
  (v) =>
    v.rounds[0].groups[1].themeId === "house" &&
    v.rounds[0].groups[0].themeId === "robot",
  "theme set per group (group 2 house, group 1 robot)"
);

// Re-shuffle groups resets to the round default
host.send({ type: "shuffle_groups" });
await host.until(
  (v) =>
    v.rounds[0].groups.length === 2 &&
    v.rounds[0].groups.every((g) => g.themeId === "robot"),
  "shuffle rebuilds groups with the round's default theme"
);

// Non-host cannot start the round
p2.send({ type: "start_round" });
await sleep(300);
check(host.view.phase === "assign", "non-host cannot start round");

async function playRound(expectTheme, { useTimerEnd = false } = {}) {
  host.send({ type: "start_round" });
  await Promise.all(
    clients.map((c) => c.until((v) => v.phase === "drawing", "phase -> drawing"))
  );
  check(typeof host.view.drawingEndsAt === "number", "drawingEndsAt set");
  const remaining = host.view.drawingEndsAt - host.view.serverNow;
  check(remaining > 55000 && remaining <= 61000, "≈60s timer");

  // Everyone submits snapshots for their parts
  for (const c of clients) {
    for (const partId of c.view.yourParts) {
      c.send({
        type: "snapshot",
        groupIndex: c.view.yourGroupIndex,
        partId,
        dataUrl: PNG,
      });
    }
  }
  await host.until(
    (v) =>
      v.rounds[v.roundIndex].groups.every((g) => g.submittedParts.length > 0),
    "snapshots registered in every group"
  );

  if (useTimerEnd) {
    host.send({ type: "end_drawing" }); // host ends early instead of waiting 60s
  } else {
    for (const c of clients) {
      for (const partId of c.view.yourParts) {
        c.send({ type: "done", groupIndex: c.view.yourGroupIndex, partId });
      }
    }
  }
  await host.until((v) => v.phase === "reveal_wait", "phase -> reveal_wait", 8000);
  check(host.imageCount(host.view.roundIndex) > 0, "host got preview images");
  check(
    p2.imageCount(p2.view.roundIndex) === 0,
    "p2 has no images before reveal"
  );

  p2.send({ type: "reveal" });
  await sleep(300);
  check(host.view.phase === "reveal_wait", "non-host cannot reveal");

  host.send({ type: "reveal" });
  await p2.until((v) => v.phase === "reveal", "phase -> reveal");
  await sleep(300);
  check(
    p2.imageCount(p2.view.roundIndex) > 0,
    "p2 received part images at reveal"
  );
  check(
    p2.view.rounds[p2.view.roundIndex].groups.every(
      (g) => g.themeId === expectTheme
    ),
    `all groups on theme ${expectTheme}`
  );
  host.send({ type: "next_round" });
}

console.log("Round 1:");
await playRound("robot");
await host.until((v) => v.phase === "assign" && v.roundIndex === 1, "round 2 assign");

console.log("Round 2:");
await playRound("burger", { useTimerEnd: true });
await host.until((v) => v.phase === "assign" && v.roundIndex === 2, "round 3 assign");
check(
  host.view.rounds[2].groups.length === 2,
  "9 players on spiderman (5 parts) -> 2 groups"
);

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

for (const c of [...clients, late]) c.ws.close();

if (failures > 0) {
  console.error(`\n${failures} check(s) FAILED`);
  process.exit(1);
}
console.log("\nAll checks passed 🎉");
process.exit(0);
