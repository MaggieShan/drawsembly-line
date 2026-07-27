"use client";
import { useEffect, useState } from "react";

import type { ClientMessage, ClientView, GroupView } from "@/lib/protocol";
import {
  MAX_DRAW_SECONDS,
  MIN_DRAW_SECONDS,
  THEMES,
  getTheme,
} from "@/lib/themes";

const TIMER_PRESETS = [30, 60, 90, 120];

function formatTimer(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder === 0 ? `${minutes}m` : `${minutes}m ${remainder}s`;
}

export default function HostPanel({
  view,
  send,
}: {
  view: ClientView;
  send: (msg: ClientMessage) => void;
}) {
  const round = view.rounds[view.roundIndex];
  if (!round) return null;
  const playerName = (id?: string) =>
    view.players.find((p) => p.id === id)?.name ?? "—";
  const grouped = new Set(round.groups.flatMap((g) => g.members));
  const ungrouped = view.players.filter((p) => !grouped.has(p.id));

  return (
    <aside className="card w-full space-y-4 lg:w-96">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">👑 Host controls</h2>
        <span className="rounded-full bg-violet-500/20 px-2.5 py-0.5 text-xs font-semibold text-violet-300">
          Round {view.roundIndex + 1}/{view.roundCount}
        </span>
      </div>

      {view.phase === "assign" && (
        <>
          <RoundTimerControl view={view} send={send} />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <button
              className="btn-secondary w-full text-sm"
              onClick={() => send({ type: "shuffle_groups" })}
            >
              🔀 Re-shuffle groups
            </button>
            <button
              className="btn-secondary w-full text-sm"
              onClick={() => send({ type: "add_group" })}
            >
              ➕ Add empty group
            </button>
          </div>

          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {round.groups.map((group, gi) => (
              <GroupEditor
                key={gi}
                view={view}
                send={send}
                group={group}
                groupIndex={gi}
                groupCount={round.groups.length}
              />
            ))}

            {ungrouped.length > 0 && (
              <div className="space-y-1.5 rounded-xl border border-amber-400/30 bg-amber-400/5 p-3">
                <p className="text-sm font-medium text-amber-300">
                  Not in a group yet
                </p>
                {ungrouped.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 text-sm">
                    <span className="w-24 shrink-0 truncate text-white/80">
                      {p.name}
                    </span>
                    <select
                      className="w-full rounded-lg border border-white/15 bg-black/40 px-2 py-1"
                      value=""
                      onChange={(e) => {
                        if (e.target.value === "") return;
                        send({
                          type: "move_player",
                          playerId: p.id,
                          groupIndex: Number(e.target.value),
                        });
                      }}
                    >
                      <option value="">Add to group…</option>
                      {round.groups.map((_, gi) => (
                        <option key={gi} value={gi}>
                          Group {gi + 1}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            className="btn-primary w-full"
            onClick={() => send({ type: "start_round" })}
          >
            🖌️ Start drawing ({formatTimer(round.drawSeconds)})
          </button>
        </>
      )}

      {view.phase === "drawing" && (
        <>
          <RoundTimerControl view={view} send={send} />
          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {round.groups.map((group, gi) => {
              const theme = getTheme(group.themeId);
              const assignments = group.assignments ?? {};
              return (
                <div key={gi} className="space-y-1.5">
                  <p className="text-sm font-semibold text-white/80">
                    Group {gi + 1} · {theme.emoji} {theme.name}
                  </p>
                  {theme.parts
                    .filter((part) => !part.prefill)
                    .map((part) => {
                      const assignedPlayerId = assignments[part.id];
                      const submitted = group.submittedParts.includes(part.id);
                      const done = group.doneParts.includes(part.id);
                      return (
                        <div
                          key={part.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="truncate text-white/70">
                            {part.label} ·{" "}
                            {assignedPlayerId
                              ? playerName(assignedPlayerId)
                              : "left out"}
                          </span>
                          <span>
                            {!assignedPlayerId
                              ? "➖"
                              : done
                                ? "✅"
                                : submitted
                                  ? "✏️"
                                  : "⬜"}
                          </span>
                        </div>
                      );
                    })}
                </div>
              );
            })}
          </div>
          <button
            className="btn-danger w-full"
            onClick={() => send({ type: "end_drawing" })}
          >
            ⏹️ End drawing early
          </button>
        </>
      )}

      {view.phase === "reveal_wait" && (
        <>
          <p className="text-sm text-white/70">
            Time&apos;s up! You have a private preview below. Reveal the
            paintings to everyone when the drama peaks.
          </p>
          <button
            className="btn-primary w-full"
            onClick={() => send({ type: "reveal" })}
          >
            🎉 Reveal the paintings!
          </button>
        </>
      )}

      {view.phase === "reveal" && (
        <button
          className="btn-primary w-full"
          onClick={() => send({ type: "next_round" })}
        >
          {view.roundIndex + 1 >= view.roundCount
            ? "🖼️ Show the final gallery"
            : "➡️ Start next round"}
        </button>
      )}

      {view.phase !== "reveal" && (
        <button
          className="btn-secondary w-full text-sm"
          onClick={() => send({ type: "end_game" })}
        >
          🏁 End game now
        </button>
      )}
    </aside>
  );
}

function RoundTimerControl({
  view,
  send,
}: {
  view: ClientView;
  send: (msg: ClientMessage) => void;
}) {
  const round = view.rounds[view.roundIndex];
  const [value, setValue] = useState(String(round.drawSeconds));

  useEffect(() => {
    setValue(String(round.drawSeconds));
  }, [round.drawSeconds, view.roundIndex]);

  const commit = (nextValue = value) => {
    const seconds = Number(nextValue);
    if (!Number.isFinite(seconds)) {
      setValue(String(round.drawSeconds));
      return;
    }
    send({ type: "set_round_timer", roundIndex: view.roundIndex, seconds });
  };

  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
      <label className="block text-sm">
        <span className="mb-1 block text-white/60">Drawing timer</span>
        <div className="flex items-center gap-2">
          <input
            className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 tabular-nums"
            min={MIN_DRAW_SECONDS}
            max={MAX_DRAW_SECONDS}
            step={5}
            type="number"
            value={value}
            onBlur={() => commit()}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
          />
          <span className="text-sm text-white/50">seconds</span>
        </div>
      </label>
      <div className="flex flex-wrap gap-1.5">
        {TIMER_PRESETS.map((seconds) => (
          <button
            key={seconds}
            type="button"
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              round.drawSeconds === seconds
                ? "bg-violet-500 text-white"
                : "bg-white/10 text-white/70 hover:bg-white/20"
            }`}
            onClick={() => {
              setValue(String(seconds));
              commit(String(seconds));
            }}
          >
            {formatTimer(seconds)}
          </button>
        ))}
      </div>
      <p className="text-xs text-white/40">
        {view.phase === "drawing"
          ? "Changing this updates the live countdown for this round."
          : "Applies to this round only; later rounds can use different timers."}{" "}
        Range: {MIN_DRAW_SECONDS}–{MAX_DRAW_SECONDS}s.
      </p>
    </div>
  );
}

function GroupEditor({
  view,
  send,
  group,
  groupIndex,
  groupCount,
}: {
  view: ClientView;
  send: (msg: ClientMessage) => void;
  group: GroupView;
  groupIndex: number;
  groupCount: number;
}) {
  const theme = getTheme(group.themeId);
  const assignments = group.assignments ?? {};
  const member = (id: string) => view.players.find((p) => p.id === id);

  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="font-semibold">
        <span>
          Group {groupIndex + 1}{" "}
          <span className="text-white/50">
            · {group.members.length} player
            {group.members.length === 1 ? "" : "s"}
          </span>
        </span>
        <button
          className="float-right rounded-lg border border-rose-400/30 px-2 py-0.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/10"
          onClick={() => send({ type: "remove_group", groupIndex })}
        >
          Remove
        </button>
      </p>

      <label className="block text-sm">
        <span className="mb-1 block text-white/60">Preset</span>
        <select
          className="w-full rounded-lg border border-white/15 bg-black/40 px-2 py-1.5"
          value={group.themeId}
          onChange={(e) =>
            send({ type: "set_theme", groupIndex, themeId: e.target.value })
          }
        >
          {THEMES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.emoji} {t.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-white/60">Part shuffling</span>
        <select
          className="w-full rounded-lg border border-white/15 bg-black/40 px-2 py-1.5"
          value={group.assignmentMode}
          onChange={(e) =>
            send({
              type: "set_group_assignment_mode",
              groupIndex,
              mode: e.target.value === "fill_all" ? "fill_all" : "one_each",
            })
          }
        >
          <option value="one_each">One each, extras optional</option>
          <option value="fill_all">Fill every part</option>
        </select>
      </label>

      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-white/40">
          Parts
        </p>
        <p className="text-xs text-white/40">
          {group.assignmentMode === "fill_all"
            ? "Every drawable part is assigned; some players may get multiple parts."
            : "Extra parts can be left out if nobody claims them."}
        </p>
        {theme.parts
          .filter((part) => !part.prefill)
          .map((part) => (
            <div key={part.id} className="flex items-center gap-2 text-sm">
              <span className="w-24 shrink-0 truncate text-white/80">
                {part.label}
              </span>
              <select
                className="w-full rounded-lg border border-white/15 bg-black/40 px-2 py-1"
                value={assignments[part.id] ?? ""}
                onChange={(e) =>
                  send({
                    type: "reassign",
                    groupIndex,
                    partId: part.id,
                    playerId: e.target.value || null,
                  })
                }
              >
                <option value="">
                  Leave out
                </option>
                {group.members.map((id) => {
                  const p = member(id);
                  return (
                    <option key={id} value={id}>
                      {p?.name ?? id}
                      {p && !p.connected ? " (offline)" : ""}
                    </option>
                  );
                })}
              </select>
            </div>
          ))}
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-white/40">
          Members
        </p>
        {group.members.map((id) => (
          <div key={id} className="flex items-center gap-2 text-sm">
            <span className="w-24 shrink-0 truncate text-white/80">
              {member(id)?.name ?? id}
            </span>
            <select
              className="w-full rounded-lg border border-white/15 bg-black/40 px-2 py-1"
              value={groupIndex}
              onChange={(e) =>
                send({
                  type: "move_player",
                  playerId: id,
                  groupIndex: Number(e.target.value),
                })
              }
            >
              {Array.from({ length: groupCount }, (_, g) => (
                <option key={g} value={g}>
                  Group {g + 1}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
