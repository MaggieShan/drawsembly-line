"use client";

import type { ClientMessage, ClientView } from "@/lib/protocol";
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
  const theme = getTheme(round.themeId);
  const assignments = round.assignments ?? {};
  const playerName = (id?: string) =>
    view.players.find((p) => p.id === id)?.name ?? "—";

  return (
    <aside className="card w-full space-y-4 lg:w-80">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">👑 Host controls</h2>
        <span className="rounded-full bg-violet-500/20 px-2.5 py-0.5 text-xs font-semibold text-violet-300">
          Round {view.roundIndex + 1}/{view.roundCount}
        </span>
      </div>

      {view.phase === "assign" && (
        <>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-white/70">
              Theme for this round
            </span>
            <select
              className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2"
              value={round.themeId}
              onChange={(e) => send({ type: "set_theme", themeId: e.target.value })}
            >
              {THEMES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.emoji} {t.name}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-1.5">
            <p className="text-sm font-medium text-white/70">
              Who draws what (auto-assigned — adjust freely)
            </p>
            {theme.parts.map((part) => (
              <div key={part.id} className="flex items-center gap-2 text-sm">
                <span className="w-28 shrink-0 truncate text-white/80">
                  {part.label}
                </span>
                <select
                  className="w-full rounded-lg border border-white/15 bg-black/40 px-2 py-1.5"
                  value={assignments[part.id] ?? ""}
                  onChange={(e) =>
                    send({
                      type: "reassign",
                      partId: part.id,
                      playerId: e.target.value,
                    })
                  }
                >
                  {view.players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.connected ? "" : " (offline)"}
                    </option>
                  ))}
                </select>
              </div>
            ))}
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
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-white/70">Live progress</p>
            {theme.parts.map((part) => {
              const submitted = round.submittedParts.includes(part.id);
              const done = round.doneParts.includes(part.id);
              return (
                <div
                  key={part.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="truncate text-white/80">
                    {part.label} · {playerName(assignments[part.id])}
                  </span>
                  <span>
                    {done ? "✅" : submitted ? "✏️" : "⬜"}
                  </span>
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
            Time&apos;s up! You have a private preview below. Reveal it to
            everyone when the drama peaks.
          </p>
          <button
            className="btn-primary w-full"
            onClick={() => send({ type: "reveal" })}
          >
            🎉 Reveal the painting!
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
