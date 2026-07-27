import type * as Party from "partykit/server";
import type {
  ClientMessage,
  ClientView,
  Phase,
  PublicPlayer,
  RoundView,
  ServerMessage,
} from "../lib/protocol";
import { PLAYER_COLORS } from "../lib/protocol";
import {
  DEFAULT_ROUND_THEMES,
  DRAW_SECONDS,
  ROUND_COUNT,
  getTheme,
} from "../lib/themes";

type Player = {
  id: string;
  name: string;
  color: string;
  connected: boolean;
  /** Rounds in which this player received no parts (for fair rotation). */
  satOutCount: number;
};

type Round = {
  themeId: string;
  assignments: Record<string, string>; // partId -> playerId
  submissions: Record<string, string>; // partId -> dataUrl (latest snapshot)
  doneParts: Set<string>;
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
      themeId: r.themeId,
      assignments: isHost ? r.assignments : undefined,
      submittedParts: Object.keys(r.submissions),
      doneParts: [...r.doneParts],
      revealed: r.revealed,
    }));
    const cur = this.currentRound;
    const yourParts = cur
      ? Object.entries(cur.assignments)
          .filter(([, pid]) => pid === playerId)
          .map(([partId]) => partId)
      : [];
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
      for (const [partId, dataUrl] of Object.entries(round.submissions)) {
        const msg: ServerMessage = {
          type: "part_image",
          roundIndex: ri,
          partId,
          dataUrl,
        };
        const s = JSON.stringify(msg);
        for (const c of conns) c.send(s);
      }
    }
  }

  private revealedRoundIndexes(): number[] {
    return this.rounds.flatMap((r, i) => (r.revealed ? [i] : []));
  }

  /** Auto-distribute the current round's parts among players, fairly. */
  private autoAssign() {
    const round = this.currentRound;
    if (!round) return;
    const theme = getTheme(round.themeId);
    // Prioritize players who have sat out the most, shuffle within ties.
    const order = [...this.players]
      .map((p) => ({ p, r: Math.random() }))
      .sort((a, b) => b.p.satOutCount - a.p.satOutCount || a.r - b.r)
      .map((x) => x.p);
    round.assignments = {};
    theme.parts.forEach((part, i) => {
      const player = order[i % order.length];
      round.assignments[part.id] = player.id;
    });
    for (const p of this.players) {
      const got = Object.values(round.assignments).includes(p.id);
      if (!got) p.satOutCount += 1;
    }
  }

  private setupRounds() {
    this.rounds = DEFAULT_ROUND_THEMES.slice(0, ROUND_COUNT).map((themeId) => ({
      themeId,
      assignments: {},
      submissions: {},
      doneParts: new Set<string>(),
      revealed: false,
    }));
    this.roundIndex = 0;
  }

  private clearDrawTimer() {
    if (this.drawTimer) {
      clearTimeout(this.drawTimer);
      this.drawTimer = null;
    }
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
      let player = this.player(msg.playerId);
      if (player) {
        player.connected = true;
        player.name = name;
      } else {
        player = {
          id: msg.playerId,
          name,
          color: PLAYER_COLORS[this.players.length % PLAYER_COLORS.length],
          connected: true,
          satOutCount: 0,
        };
        this.players.push(player);
        if (!this.hostId) this.hostId = player.id;
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
        if (round.assignments[msg.partId] !== playerId) return;
        if (
          typeof msg.dataUrl !== "string" ||
          !msg.dataUrl.startsWith("data:image/png;base64,") ||
          msg.dataUrl.length > 900_000
        )
          return;
        round.submissions[msg.partId] = msg.dataUrl;
        this.broadcastSync();
        return;
      }
      case "done": {
        const round = this.currentRound;
        if (!round || this.phase !== "drawing") return;
        if (round.assignments[msg.partId] !== playerId) return;
        round.doneParts.add(msg.partId);
        // End early if every assigned part is done.
        const allDone = Object.keys(round.assignments).every((partId) =>
          round.doneParts.has(partId)
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
        this.phase = "assign";
        this.autoAssign();
        this.broadcastSync();
        return;
      }
      case "set_theme": {
        const round = this.currentRound;
        if (!round || this.phase !== "assign") return;
        try {
          getTheme(msg.themeId);
        } catch {
          return;
        }
        round.themeId = msg.themeId;
        round.submissions = {};
        round.doneParts = new Set();
        this.autoAssign();
        this.broadcastSync();
        return;
      }
      case "reassign": {
        const round = this.currentRound;
        if (!round || this.phase !== "assign") return;
        if (!this.player(msg.playerId)) return;
        const theme = getTheme(round.themeId);
        if (!theme.parts.some((p) => p.id === msg.partId)) return;
        round.assignments[msg.partId] = msg.playerId;
        this.broadcastSync();
        return;
      }
      case "start_round": {
        if (this.phase !== "assign") return;
        this.phase = "drawing";
        this.drawingEndsAt = Date.now() + DRAW_SECONDS * 1000;
        this.clearDrawTimer();
        this.drawTimer = setTimeout(
          () => this.finishDrawing(),
          DRAW_SECONDS * 1000 + GRACE_MS
        );
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
        this.phase = "assign";
        this.autoAssign();
        this.broadcastSync();
        return;
      }
      case "end_game": {
        this.clearDrawTimer();
        this.drawingEndsAt = null;
        // Anything fully drawn but not revealed gets revealed in the gallery.
        const round = this.currentRound;
        if (round && Object.keys(round.submissions).length > 0) {
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
        for (const p of this.players) p.satOutCount = 0;
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
