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
  constructor(name) {
    this.name = name;
    this.token = null; // server-issued session token (from "identity")
    this.view = null;
    this.images = {}; // roundIndex -> groupIndex -> partId -> dataUrl
    this.ws = new WebSocket(`ws://${HOST}/parties/main/${ROOM}`);
    this.ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "identity") this.token = msg.token;
      if (msg.type === "sync") {
        this.view = msg.view;
        this.pruneImagesForView(msg.view);
      }
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
    this.send({ type: "join", token: this.token ?? undefined, name: this.name });
  }
  imageCount(roundIndex) {
    return Object.values(this.images[roundIndex] ?? {}).reduce(
      (n, g) => n + Object.keys(g).length,
      0
    );
  }
  pruneImagesForView(view) {
    const next = {};
    for (const [roundIndex, round] of view.rounds.entries()) {
      const roundImages = this.images[roundIndex];
      if (!roundImages) continue;
      for (const [groupIndex, group] of round.groups.entries()) {
        const groupImages = roundImages[groupIndex];
        if (!groupImages) continue;
        const submittedParts = new Set(group.submittedParts);
        const nextGroupImages = Object.fromEntries(
          Object.entries(groupImages).filter(([partId]) =>
            submittedParts.has(partId)
          )
        );
        if (Object.keys(nextGroupImages).length > 0) {
          next[roundIndex] ??= {};
          next[roundIndex][groupIndex] = nextGroupImages;
        }
      }
    }
    this.images = next;
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

// 9 players: robot (8 assignable parts) -> 2 groups.
const host = new Client("Hosty");
const others = Array.from(
  { length: 8 },
  (_, i) => new Client(`Player${i + 2}`)
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
check(
  host.view.rounds.every((r) => r.drawSeconds === 60),
  "round timers default to 60s"
);

console.log("Grouping:");
const r0 = host.view.rounds[0];
check(r0.groups.length === 2, "9 players on robot -> 2 groups");
check(
  r0.groups.every((g) => g.themeId === "robot"),
  "both groups default to robot"
);
for (const [gi, g] of r0.groups.entries()) {
  check(
    Object.keys(g.assignments).length === g.members.length,
    `group ${gi + 1} has one assigned part per member`
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
  clients.every((c) => c.view.yourParts.length === 1),
  "every player has exactly one part"
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

// Repeatable/open-ended presets balance assignments across their categories.
host.send({ type: "set_theme", groupIndex: 1, themeId: "factory" });
await host.until(
  (v) =>
    v.rounds[0].groups[1].themeId === "factory" &&
    Object.keys(v.rounds[0].groups[1].assignments).length ===
      v.rounds[0].groups[1].members.length,
  "theme set per group (group 2 factory)"
);
const factoryAssignments = host.view.rounds[0].groups[1].assignments;
const factoryBucketCounts = [
  "factory-product",
  "factory-part",
  "factory-worker",
].map((prefix) =>
  Object.keys(factoryAssignments).filter((partId) =>
    partId.startsWith(`${prefix}-`)
  ).length
);
check(
  Math.max(...factoryBucketCounts) - Math.min(...factoryBucketCounts) <= 1,
  "factory preset balances product, part, and worker prompts"
);

// Each group can choose whether to fill every part, assigning extras round-robin.
host.send({ type: "set_group_assignment_mode", groupIndex: 0, mode: "fill_all" });
await host.until(
  (v) =>
    v.rounds[0].groups[0].themeId === "robot" &&
    v.rounds[0].groups[0].assignmentMode === "fill_all" &&
    Object.keys(v.rounds[0].groups[0].assignments).length === 8,
  "fill-all mode assigns every drawable part in one group"
);
check(
  clients.some(
    (c) => c.view.yourGroupIndex === 0 && c.view.yourParts.length > 1
  ),
  "fill-all mode can assign multiple parts to a player in that group"
);

// The same group can switch back to one part per player with extras optional.
host.send({ type: "set_group_assignment_mode", groupIndex: 0, mode: "one_each" });
await host.until(
  (v) =>
    v.rounds[0].groups[0].themeId === "robot" &&
    v.rounds[0].groups[0].assignmentMode === "one_each" &&
    Object.keys(v.rounds[0].groups[0].assignments).length ===
      v.rounds[0].groups[0].members.length,
  "one-each mode leaves extras optional in one group"
);
check(
  clients.every((c) => c.view.yourParts.length === 1),
  "one-each modes assign exactly one part per player"
);

// Re-shuffling group membership resets to the round default preset.
host.send({ type: "shuffle_groups" });
await host.until(
  (v) =>
    v.rounds[0].groups.length === 2 &&
    v.rounds[0].groups.every(
      (g) =>
        g.themeId === "robot" &&
        g.assignmentMode === "one_each" &&
        Object.keys(g.assignments).length === g.members.length
    ),
  "group shuffle resets to default robot groups"
);

// Non-host cannot start the round
p2.send({ type: "start_round" });
await sleep(300);
check(host.view.phase === "assign", "non-host cannot start round");
// Non-host cannot update the round timer
p2.send({ type: "set_round_timer", roundIndex: 0, seconds: 30 });
await sleep(300);
check(host.view.rounds[0].drawSeconds === 60, "non-host cannot update timer");

// Host can customize the current round's timer before drawing starts.
host.send({ type: "set_round_timer", roundIndex: 0, seconds: 45 });
await host.until(
  (v) => v.rounds[0].drawSeconds === 45,
  "host updated round 1 timer"
);
check(p2.view.rounds[0].drawSeconds === 45, "timer update syncs to players");

async function playRound(
  expectTheme,
  {
    useTimerEnd = false,
    expectedSeconds = 60,
    liveUpdateSeconds = null,
    sendSnapshotsBeforeEnd = true,
    sendSnapshotsAfterRoundEnd = false,
  } = {}
) {
  const expectedThemes = Array.isArray(expectTheme) ? expectTheme : [expectTheme];
  let timerSeconds = expectedSeconds;
  host.send({ type: "start_round" });
  await Promise.all(
    clients.map((c) => c.until((v) => v.phase === "drawing", "phase -> drawing"))
  );
  check(typeof host.view.drawingEndsAt === "number", "drawingEndsAt set");
  check(
    host.view.rounds[host.view.roundIndex].drawSeconds === timerSeconds,
    `round timer is ${timerSeconds}s`
  );
  const remaining = host.view.drawingEndsAt - host.view.serverNow;
  check(
    remaining > timerSeconds * 1000 - 5000 &&
      remaining <= timerSeconds * 1000 + 1000,
    `≈${timerSeconds}s timer`
  );

  if (liveUpdateSeconds != null) {
    host.send({
      type: "set_round_timer",
      roundIndex: host.view.roundIndex,
      seconds: liveUpdateSeconds,
    });
    await host.until(
      (v) =>
        v.phase === "drawing" &&
        v.rounds[v.roundIndex].drawSeconds === liveUpdateSeconds,
      "live timer update applied"
    );
    timerSeconds = liveUpdateSeconds;
    const updatedRemaining = host.view.drawingEndsAt - host.view.serverNow;
    check(
      updatedRemaining > timerSeconds * 1000 - 5000 &&
        updatedRemaining <= timerSeconds * 1000 + 1000,
      `≈${timerSeconds}s timer after live update`
    );
  }

  async function submitAllSnapshots(label) {
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
      label
    );
  }

  if (sendSnapshotsBeforeEnd) {
    await submitAllSnapshots("snapshots registered in every group");
  }

  if (useTimerEnd) {
    host.send({ type: "end_drawing" }); // host ends early instead of waiting for the timer
  } else {
    for (const c of clients) {
      for (const partId of c.view.yourParts) {
        c.send({ type: "done", groupIndex: c.view.yourGroupIndex, partId });
      }
    }
  }
  await host.until((v) => v.phase === "reveal_wait", "phase -> reveal_wait", 8000);

  if (sendSnapshotsAfterRoundEnd) {
    await submitAllSnapshots("final snapshots registered after round end");
  }
  await host.until(
    () => host.imageCount(host.view.roundIndex) > 0,
    "host got preview images"
  );
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
      (g) => expectedThemes.includes(g.themeId)
    ),
    `all groups on theme ${expectedThemes.join(" or ")}`
  );
  check(
    p2.view.rounds[p2.view.roundIndex].groups.every(
      (g) => g.assignments && Object.keys(g.assignments).length > 0
    ),
    "non-host can see revealed assignments for attribution"
  );
  host.send({ type: "next_round" });
}

console.log("Round 1:");
await playRound("robot", { expectedSeconds: 45 });
await host.until((v) => v.phase === "assign" && v.roundIndex === 1, "round 2 assign");

console.log("Round 2:");
check(host.view.rounds[1].drawSeconds === 60, "round 2 timer starts at default");
const r1 = host.view.rounds[1];
check(r1.groups.length === 3, "round 2 creates one group per default preset");
check(
  r1.groups
    .map((g) => g.themeId)
    .sort()
    .join(",") === "aquarium,farm,zoo",
  "round 2 uses farm/barn, aquarium, and zoo presets"
);
const r1MemberCounts = r1.groups.map((g) => g.members.length);
check(
  Math.max(...r1MemberCounts) - Math.min(...r1MemberCounts) <= 1,
  "round 2 players are evenly distributed across presets"
);
check(
  r1.groups.every(
    (g) => Object.keys(g.assignments).length === g.members.length
  ),
  "round 2 groups have one assigned part per member"
);
host.send({ type: "set_round_timer", roundIndex: 1, seconds: 90 });
await host.until(
  (v) => v.rounds[1].drawSeconds === 90,
  "host updated round 2 timer"
);
await playRound(["farm", "aquarium", "zoo"], {
  useTimerEnd: true,
  expectedSeconds: 90,
  liveUpdateSeconds: 120,
  sendSnapshotsBeforeEnd: false,
  sendSnapshotsAfterRoundEnd: true,
});
await host.until((v) => v.phase === "assign" && v.roundIndex === 2, "round 3 assign");
check(
  host.view.rounds[2].groups.length === 1,
  "9 players on factory (70 slots) -> 1 group"
);
check(host.view.rounds[2].drawSeconds === 60, "round 3 timer starts at default");

console.log("Round 3:");
await playRound("factory");
await host.until((v) => v.phase === "gallery", "phase -> gallery after 3 rounds");
check(
  host.view.rounds.every((r) => r.revealed),
  "all rounds revealed in gallery"
);
check(Object.keys(p2.images).length === 3, "p2 has images for all 3 rounds");

// Late joiner sees the gallery images
const late = new Client("Latey");
await late.join();
await late.until((v) => v.phase === "gallery", "late joiner lands in gallery");
await sleep(400);
check(Object.keys(late.images).length === 3, "late joiner received all images");

// Play again
host.send({ type: "play_again" });
await host.until((v) => v.phase === "lobby", "play_again -> lobby");
await Promise.all(
  [...clients, late].map((c) =>
    c.until(
      (v) => v.phase === "lobby" && Object.keys(c.images).length === 0,
      "play_again clears cached images"
    )
  )
);

for (const c of [...clients, late]) c.ws.close();

if (failures > 0) {
  console.error(`\n${failures} check(s) FAILED`);
  process.exit(1);
}
console.log("\nAll checks passed 🎉");
process.exit(0);
