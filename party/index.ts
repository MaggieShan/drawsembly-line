import type * as Party from "partykit/server";
import type {
  ClientMessage,
  ClientView,
  GroupView,
  Phase,
  PublicPlayer,
  RoundView,
  ServerMessage,
  ShuffleMode,
} from "../lib/protocol";
import { PLAYER_COLORS } from "../lib/protocol";
import {
  DEFAULT_ROUND_THEME_POOLS,
  DEFAULT_ROUND_THEMES,
  DRAW_SECONDS,
  MAX_DRAW_SECONDS,
  MIN_DRAW_SECONDS,
  ROUND_COUNT,
  getTheme,
} from "../lib/themes";

type Player = {
  id: string;
  /** Secret session token, minted server-side. Proves identity on reconnect;
   *  never exposed in ClientView, so it is never broadcast to other players. */
  token: string;
  name: string;
  color: string;
  connected: boolean;
};

/** One group of players painting one canvas. */
type Group = {
  themeId: string;
  assignmentMode: ShuffleMode;
  members: string[]; // playerIds
  assignments: Record<string, string>; // partId -> playerId
  submissions: Record<string, string>; // partId -> dataUrl (latest snapshot)
  doneParts: Set<string>;
};

type Round = {
  /** Theme pool groups default to when (re)building this round's groups. */
  defaultThemeIds: string[];
  groups: Group[];
  drawSeconds: number;
  revealed: boolean;
};

type ConnState = { playerId: string };

const GRACE_MS = 1500;

export default class GameServer implements Party.Server {
  options: Party.ServerOptions = { hibernate: false };

  phase: Phase = "lobby";
  players: Player[] = [];
  hostId: string | null = null;
  rounds: Round[] = [];
  roundIndex = 0;
  drawingEndsAt: number | null = null;
  private drawTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(readonly room: Party.Room) {}

  // ---------- helpers ----------

  private get currentRound(): Round | undefined {
    return this.rounds[this.roundIndex];
  }

  private player(id: string | undefined): Player | undefined {
    return this.players.find((p) => p.id === id);
  }

  private isHost(conn: Party.Connection<ConnState>): boolean {
    return conn.state?.playerId != null && conn.state.playerId === this.hostId;
  }

  private send(conn: Party.Connection, msg: ServerMessage) {
    conn.send(JSON.stringify(msg));
  }

  private viewFor(playerId: string): ClientView {
    const isHost = playerId === this.hostId;
    const roundViews: RoundView[] = this.rounds.map((r) => ({
      groups: r.groups.map<GroupView>((g) => ({
        themeId: g.themeId,
        assignmentMode: g.assignmentMode,
        members: g.members,
        assignments: isHost || r.revealed ? g.assignments : undefined,
        submittedParts: Object.keys(g.submissions),
        doneParts: [...g.doneParts],
      })),
      drawSeconds: r.drawSeconds,
      revealed: r.revealed,
    }));
    const cur = this.currentRound;
    let yourGroupIndex: number | null = null;
    let yourParts: string[] = [];
    if (cur) {
      const gi = cur.groups.findIndex((g) => g.members.includes(playerId));
      if (gi >= 0) {
        yourGroupIndex = gi;
        yourParts = Object.entries(cur.groups[gi].assignments)
          .filter(([, pid]) => pid === playerId)
          .map(([partId]) => partId);
      }
    }
    return {
      phase: this.phase,
      roomCode: this.room.id,
      you: { id: playerId, isHost },
      players: this.players.map<PublicPlayer>((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        connected: p.connected,
        isHost: p.id === this.hostId,
      })),
      roundIndex: this.roundIndex,
      roundCount: ROUND_COUNT,
      rounds: roundViews,
      yourGroupIndex,
      yourParts,
      drawingEndsAt: this.drawingEndsAt,
      serverNow: Date.now(),
    };
  }

  private broadcastSync() {
    for (const conn of this.room.getConnections<ConnState>()) {
      const pid = conn.state?.playerId;
      if (!pid) continue;
      this.send(conn, { type: "sync", view: this.viewFor(pid) });
    }
  }

  /** Send every stored part image of the given rounds to a connection (or all). */
  private sendImages(
    roundIndexes: number[],
    target?: Party.Connection<ConnState>
  ) {
    const conns = target ? [target] : [...this.room.getConnections<ConnState>()];
    for (const ri of roundIndexes) {
      const round = this.rounds[ri];
      if (!round) continue;
      round.groups.forEach((group, gi) => {
        for (const [partId, dataUrl] of Object.entries(group.submissions)) {
          const msg: ServerMessage = {
            type: "part_image",
            roundIndex: ri,
            groupIndex: gi,
            partId,
            dataUrl,
          };
          const s = JSON.stringify(msg);
          for (const c of conns) c.send(s);
        }
      });
    }
  }

  private revealedRoundIndexes(): number[] {
    return this.rounds.flatMap((r, i) => (r.revealed ? [i] : []));
  }

  private assignableParts(themeId: string) {
    return getTheme(themeId).parts.filter((p) => !p.prefill);
  }

  private newGroup(
    themeId: string,
    assignmentMode: ShuffleMode = "one_each"
  ): Group {
    return {
      themeId,
      assignmentMode,
      members: [],
      assignments: {},
      submissions: {},
      doneParts: new Set<string>(),
    };
  }

  private randomDefaultThemeId(round: Round) {
    const themeIds = round.defaultThemeIds.length > 0
      ? round.defaultThemeIds
      : [DEFAULT_ROUND_THEMES[0] ?? "robot"];
    return themeIds[Math.floor(Math.random() * themeIds.length)] ?? themeIds[0];
  }

  private defaultGroupSize(round: Round) {
    const themeIds = round.defaultThemeIds.length > 0
      ? round.defaultThemeIds
      : [DEFAULT_ROUND_THEMES[0] ?? "robot"];
    return Math.max(
      1,
      Math.min(...themeIds.map((themeId) => this.assignableParts(themeId).length))
    );
  }

  private assignParts(group: Group) {
    group.assignments = {};
    if (group.members.length === 0) return;
    const parts = this.assignableParts(group.themeId);
    if (group.assignmentMode === "fill_all") {
      parts.forEach((part, i) => {
        group.assignments[part.id] = group.members[i % group.members.length];
      });
      return;
    }
    parts.slice(0, group.members.length).forEach((part, i) => {
      group.assignments[part.id] = group.members[i];
    });
  }

  /**
   * Split all players into groups sized to fit the theme's assignable parts.
   * Groups default to one-each mode so extra preset parts stay optional unless
   * the host switches a group to fill-all.
   */
  private makeGroups(round: Round): Group[] {
    const shuffled = [...this.players]
      .map((p) => ({ id: p.id, r: Math.random() }))
      .sort((a, b) => a.r - b.r)
      .map((x) => x.id);
    const maxSize = this.defaultGroupSize(round);
    const groupCount = Math.max(1, Math.ceil(shuffled.length / maxSize));
    const groups = Array.from({ length: groupCount }, () =>
      this.newGroup(this.randomDefaultThemeId(round))
    );
    shuffled.forEach((pid, i) => groups[i % groupCount].members.push(pid));
    for (const g of groups) this.assignParts(g);
    return groups;
  }

  /** Enter the assign phase for the current round with freshly built groups. */
  private startAssign() {
    const round = this.currentRound;
    if (!round) return;
    round.groups = this.makeGroups(round);
    this.phase = "assign";
  }

  private setupRounds() {
    this.rounds = DEFAULT_ROUND_THEME_POOLS.slice(0, ROUND_COUNT).map((themeIds) => ({
      defaultThemeIds: themeIds,
      groups: [],
      drawSeconds: DRAW_SECONDS,
      revealed: false,
    }));
    this.roundIndex = 0;
  }

  private normalizeDrawSeconds(seconds: unknown): number | null {
    if (typeof seconds !== "number" || !Number.isFinite(seconds)) return null;
    const wholeSeconds = Math.round(seconds);
    return Math.min(
      MAX_DRAW_SECONDS,
      Math.max(MIN_DRAW_SECONDS, wholeSeconds)
    );
  }

  private clearDrawTimer() {
    if (this.drawTimer) {
      clearTimeout(this.drawTimer);
      this.drawTimer = null;
    }
  }

  private scheduleDrawTimer() {
    if (this.phase !== "drawing" || this.drawingEndsAt == null) return;
    this.clearDrawTimer();
    const delayMs = Math.max(0, this.drawingEndsAt - Date.now()) + GRACE_MS;
    this.drawTimer = setTimeout(() => this.finishDrawing(), delayMs);
  }

  private finishDrawing() {
    if (this.phase !== "drawing") return;
    this.clearDrawTimer();
    this.phase = "reveal_wait";
    this.drawingEndsAt = null;
    this.broadcastSync();
    // Give the host a preview of what's been drawn.
    for (const conn of this.room.getConnections<ConnState>()) {
      if (this.isHost(conn)) this.sendImages([this.roundIndex], conn);
    }
  }

  // ---------- lifecycle ----------

  onMessage(raw: string, conn: Party.Connection<ConnState>) {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (msg.type === "join") {
      const name = String(msg.name ?? "").trim().slice(0, 24) || "Anonymous";
      // Identity is proven by a server-issued secret token, never by a
      // client-supplied id (public ids are spoofable). Reconnect only when the
      // presented token matches a known player.
      let player =
        typeof msg.token === "string" && msg.token.length > 0
          ? this.players.find((p) => p.token === msg.token)
          : undefined;
      if (player) {
        player.connected = true;
        player.name = name;
      } else {
        player = {
          id: crypto.randomUUID(),
          token: crypto.randomUUID(),
          name,
          color: PLAYER_COLORS[this.players.length % PLAYER_COLORS.length],
          connected: true,
        };
        this.players.push(player);
        if (!this.hostId) this.hostId = player.id;
        // Deliver the secret token to this connection only; never broadcast it.
        this.send(conn, { type: "identity", token: player.token });
        // Late joiner during assign: drop them into the smallest group.
        const round = this.currentRound;
        if (this.phase === "assign" && round && round.groups.length > 0) {
          const smallest = round.groups.reduce((a, b) =>
            b.members.length < a.members.length ? b : a
          );
          smallest.members.push(player.id);
          this.assignParts(smallest);
        }
      }
      conn.setState({ playerId: player.id });
      this.broadcastSync();
      // Late joiner / reconnect: replay images they are allowed to see.
      const visible = this.revealedRoundIndexes();
      if (this.phase === "gallery" || visible.length > 0) {
        this.sendImages(visible, conn);
      }
      if (
        (this.phase === "reveal_wait" || this.phase === "reveal") &&
        player.id === this.hostId
      ) {
        this.sendImages([this.roundIndex], conn);
      }
      return;
    }

    const playerId = conn.state?.playerId;
    if (!playerId) return;

    switch (msg.type) {
      case "snapshot": {
        const round = this.currentRound;
        if (!round) return;
        const acceptable =
          this.phase === "drawing" ||
          (this.phase === "reveal_wait" && !round.revealed);
        if (!acceptable) return;
        const group = round.groups[msg.groupIndex];
        if (!group) return;
        if (group.assignments[msg.partId] !== playerId) return;
        if (
          typeof msg.dataUrl !== "string" ||
          !msg.dataUrl.startsWith("data:image/png;base64,") ||
          msg.dataUrl.length > 900_000
        )
          return;
        group.submissions[msg.partId] = msg.dataUrl;
        this.broadcastSync();
        return;
      }
      case "done": {
        const round = this.currentRound;
        if (!round || this.phase !== "drawing") return;
        const group = round.groups[msg.groupIndex];
        if (!group) return;
        if (group.assignments[msg.partId] !== playerId) return;
        group.doneParts.add(msg.partId);
        // End early if every assigned part in every group is done.
        const allDone = round.groups.every((g) =>
          Object.keys(g.assignments).every((partId) => g.doneParts.has(partId))
        );
        if (allDone) {
          // Small grace so final snapshots land.
          setTimeout(() => this.finishDrawing(), GRACE_MS);
        }
        this.broadcastSync();
        return;
      }
    }

    // Everything below is host-only.
    if (!this.isHost(conn)) {
      this.send(conn, { type: "error", message: "Only the host can do that." });
      return;
    }

    switch (msg.type) {
      case "start_game": {
        if (this.phase !== "lobby" || this.players.length < 1) return;
        this.setupRounds();
        this.startAssign();
        this.broadcastSync();
        return;
      }
      case "set_theme": {
        const round = this.currentRound;
        if (!round || this.phase !== "assign") return;
        const group = round.groups[msg.groupIndex];
        if (!group) return;
        try {
          getTheme(msg.themeId);
        } catch {
          return;
        }
        group.themeId = msg.themeId;
        group.submissions = {};
        group.doneParts = new Set();
        this.assignParts(group);
        this.broadcastSync();
        return;
      }
      case "set_group_assignment_mode": {
        const round = this.currentRound;
        if (!round || this.phase !== "assign") return;
        const group = round.groups[msg.groupIndex];
        if (!group) return;
        group.assignmentMode = msg.mode;
        group.submissions = {};
        group.doneParts = new Set();
        this.assignParts(group);
        this.broadcastSync();
        return;
      }
      case "set_round_timer": {
        const round = this.currentRound;
        if (
          !round ||
          (this.phase !== "assign" && this.phase !== "drawing") ||
          msg.roundIndex !== this.roundIndex
        )
          return;
        const seconds = this.normalizeDrawSeconds(msg.seconds);
        if (seconds == null) return;
        if (this.phase === "drawing") {
          const startedAt =
            this.drawingEndsAt == null
              ? Date.now()
              : this.drawingEndsAt - round.drawSeconds * 1000;
          round.drawSeconds = seconds;
          this.drawingEndsAt = startedAt + seconds * 1000;
          this.scheduleDrawTimer();
        } else {
          round.drawSeconds = seconds;
        }
        this.broadcastSync();
        return;
      }
      case "reassign": {
        const round = this.currentRound;
        if (!round || this.phase !== "assign") return;
        const group = round.groups[msg.groupIndex];
        if (!group) return;
        const part = getTheme(group.themeId).parts.find(
          (p) => p.id === msg.partId
        );
        if (!part || part.prefill) return;
        if (msg.playerId == null || msg.playerId === "") {
          delete group.assignments[msg.partId];
          delete group.submissions[msg.partId];
          group.doneParts.delete(msg.partId);
          this.broadcastSync();
          return;
        }
        if (!group.members.includes(msg.playerId)) return;
        group.assignments[msg.partId] = msg.playerId;
        group.doneParts.delete(msg.partId);
        this.broadcastSync();
        return;
      }
      case "move_player": {
        const round = this.currentRound;
        if (!round || this.phase !== "assign") return;
        if (!this.player(msg.playerId)) return;
        const target = round.groups[msg.groupIndex];
        if (!target) return;
        const source = round.groups.find((g) =>
          g.members.includes(msg.playerId)
        );
        if (source === target) return;
        if (source) {
          source.members = source.members.filter((id) => id !== msg.playerId);
          this.assignParts(source);
        }
        target.members.push(msg.playerId);
        this.assignParts(target);
        this.broadcastSync();
        return;
      }
      case "shuffle_groups": {
        const round = this.currentRound;
        if (!round || this.phase !== "assign") return;
        round.groups = this.makeGroups(round);
        this.broadcastSync();
        return;
      }
      case "add_group": {
        const round = this.currentRound;
        if (!round || this.phase !== "assign") return;
        round.groups.push(this.newGroup(this.randomDefaultThemeId(round)));
        this.broadcastSync();
        return;
      }
      case "remove_group": {
        const round = this.currentRound;
        if (!round || this.phase !== "assign") return;
        if (!round.groups[msg.groupIndex]) return;
        round.groups.splice(msg.groupIndex, 1);
        this.broadcastSync();
        return;
      }
      case "start_round": {
        if (this.phase !== "assign") return;
        const round = this.currentRound;
        if (!round) return;
        this.phase = "drawing";
        this.drawingEndsAt = Date.now() + round.drawSeconds * 1000;
        this.scheduleDrawTimer();
        this.broadcastSync();
        return;
      }
      case "end_drawing": {
        this.finishDrawing();
        return;
      }
      case "reveal": {
        const round = this.currentRound;
        if (!round || this.phase !== "reveal_wait") return;
        round.revealed = true;
        this.phase = "reveal";
        this.broadcastSync();
        this.sendImages([this.roundIndex]);
        return;
      }
      case "next_round": {
        if (this.phase !== "reveal") return;
        if (this.roundIndex + 1 >= this.rounds.length) {
          this.phase = "gallery";
          this.broadcastSync();
          this.sendImages(this.revealedRoundIndexes());
          return;
        }
        this.roundIndex += 1;
        this.startAssign();
        this.broadcastSync();
        return;
      }
      case "end_game": {
        this.clearDrawTimer();
        this.drawingEndsAt = null;
        // Anything fully drawn but not revealed gets revealed in the gallery.
        const round = this.currentRound;
        if (
          round &&
          round.groups.some((g) => Object.keys(g.submissions).length > 0)
        ) {
          round.revealed = true;
        }
        this.phase = "gallery";
        this.broadcastSync();
        this.sendImages(this.revealedRoundIndexes());
        return;
      }
      case "play_again": {
        if (this.phase !== "gallery") return;
        this.clearDrawTimer();
        this.phase = "lobby";
        this.rounds = [];
        this.roundIndex = 0;
        this.drawingEndsAt = null;
        this.broadcastSync();
        return;
      }
    }
  }

  onClose(conn: Party.Connection<ConnState>) {
    const player = this.player(conn.state?.playerId);
    if (!player) return;
    // Only mark disconnected if no other connection belongs to this player.
    const stillConnected = [...this.room.getConnections<ConnState>()].some(
      (c) => c.id !== conn.id && c.state?.playerId === player.id
    );
    if (!stillConnected) {
      player.connected = false;
      if (this.phase === "lobby") {
        this.players = this.players.filter((p) => p.id !== player.id);
        if (this.hostId === player.id) {
          this.hostId = this.players[0]?.id ?? null;
        }
      }
      this.broadcastSync();
    }
  }

  onError(conn: Party.Connection<ConnState>) {
    this.onClose(conn);
  }
}
