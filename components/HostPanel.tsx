"use client";

import type { ClientMessage, ClientView, GroupView } from "@/lib/protocol";
import { THEMES, getTheme } from "@/lib/themes";

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
          <button
            className="btn-secondary w-full text-sm"
            onClick={() => send({ type: "shuffle_groups" })}
          >
            🔀 Re-shuffle groups (resets presets &amp; parts)
          </button>

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
            🖌️ Start drawing (60s)
          </button>
        </>
      )}

      {view.phase === "drawing" && (
        <>
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
                      const submitted = group.submittedParts.includes(part.id);
                      const done = group.doneParts.includes(part.id);
                      return (
                        <div
                          key={part.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="truncate text-white/70">
                            {part.label} · {playerName(assignments[part.id])}
                          </span>
                          <span>{done ? "✅" : submitted ? "✏️" : "⬜"}</span>
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
        Group {groupIndex + 1}{" "}
        <span className="text-white/50">
          · {group.members.length} player
          {group.members.length === 1 ? "" : "s"}
        </span>
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

      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-white/40">
          Parts
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
                    playerId: e.target.value,
                  })
                }
              >
                <option value="" disabled>
                  —
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
