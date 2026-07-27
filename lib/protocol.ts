export type Phase =
  | "lobby"
  | "assign"
  | "drawing"
  | "reveal_wait"
  | "reveal"
  | "gallery";

export type PublicPlayer = {
  id: string;
  name: string;
  color: string;
  connected: boolean;
  isHost: boolean;
};

export type ShuffleMode = "one_each" | "fill_all";

/** One group of players painting one canvas together. */
export type GroupView = {
  themeId: string;
  /** How this group auto-assigns its preset parts. */
  assignmentMode: ShuffleMode;
  /** playerIds of this group's members. */
  members: string[];
  /** partId -> playerId. Sent to the host before reveal, then to everyone once revealed. */
  assignments?: Record<string, string>;
  /** partIds that have at least one snapshot. */
  submittedParts: string[];
  /** partIds whose player marked themselves done. */
  doneParts: string[];
};

export type RoundView = {
  /** Players are split into groups; each group paints its own canvas. */
  groups: GroupView[];
  /** Drawing duration for this round, in seconds. */
  drawSeconds: number;
  revealed: boolean;
};

export type ClientView = {
  phase: Phase;
  roomCode: string;
  you: { id: string; isHost: boolean };
  players: PublicPlayer[];
  roundIndex: number;
  roundCount: number;
  rounds: RoundView[];
  /** Index of the group you belong to in the current round (null if none). */
  yourGroupIndex: number | null;
  /** Parts assigned to *you* in the current round. */
  yourParts: string[];
  /** Server epoch ms when the drawing phase ends (drawing phase only). */
  drawingEndsAt: number | null;
  /** Server epoch ms now, for clock offset. */
  serverNow: number;
};

// ---- client -> server ----
export type ClientMessage =
  // `token` is the server-issued session secret from a previous join, used to
  // reconnect as the same player. Omitted on a first join.
  | { type: "join"; token?: string; name: string }
  | { type: "start_game" }
  | { type: "set_theme"; groupIndex: number; themeId: string }
  | {
      type: "reassign";
      groupIndex: number;
      partId: string;
      playerId: string | null;
    }
  | { type: "move_player"; playerId: string; groupIndex: number }
  | { type: "shuffle_groups" }
  | { type: "set_group_assignment_mode"; groupIndex: number; mode: ShuffleMode }
  | { type: "set_round_timer"; roundIndex: number; seconds: number }
  | { type: "add_group" }
  | { type: "remove_group"; groupIndex: number }
  | { type: "start_round" }
  | { type: "snapshot"; groupIndex: number; partId: string; dataUrl: string }
  | { type: "done"; groupIndex: number; partId: string }
  | { type: "end_drawing" }
  | { type: "reveal" }
  | { type: "next_round" }
  | { type: "end_game" }
  | { type: "play_again" };

// ---- server -> client ----
export type ServerMessage =
  // Sent once, to the joining connection only, right after a new player is
  // created. The client persists `token` and presents it to reconnect.
  // Never included in ClientView, so it is never broadcast to other players.
  | { type: "identity"; token: string }
  | { type: "sync"; view: ClientView }
  | {
      type: "part_image";
      roundIndex: number;
      groupIndex: number;
      partId: string;
      dataUrl: string;
    }
  | { type: "error"; message: string };

export const PLAYER_COLORS = [
  "#f97316",
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#eab308",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#84cc16",
  "#f43f5e",
];
