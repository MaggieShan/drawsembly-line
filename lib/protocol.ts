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

export type RoundView = {
  themeId: string;
  /** partId -> playerId. Only sent to the host (players see just their own parts). */
  assignments?: Record<string, string>;
  /** partIds that have at least one snapshot. */
  submittedParts: string[];
  /** partIds whose player marked themselves done. */
  doneParts: string[];
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
  /** Parts assigned to *you* in the current round. */
  yourParts: string[];
  /** Server epoch ms when the drawing phase ends (drawing phase only). */
  drawingEndsAt: number | null;
  /** Server epoch ms now, for clock offset. */
  serverNow: number;
};

// ---- client -> server ----
export type ClientMessage =
  | { type: "join"; playerId: string; name: string }
  | { type: "start_game" }
  | { type: "set_theme"; themeId: string }
  | { type: "reassign"; partId: string; playerId: string }
  | { type: "start_round" }
  | { type: "snapshot"; partId: string; dataUrl: string }
  | { type: "done"; partId: string }
  | { type: "end_drawing" }
  | { type: "reveal" }
  | { type: "next_round" }
  | { type: "end_game" }
  | { type: "play_again" };

// ---- server -> client ----
export type ServerMessage =
  | { type: "sync"; view: ClientView }
  | { type: "part_image"; roundIndex: number; partId: string; dataUrl: string }
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
