"use client";

import usePartySocket from "partysocket/react";
import { useCallback, useEffect, useState } from "react";
import type {
  ClientMessage,
  ClientView,
  GroupView,
  ServerMessage,
} from "@/lib/protocol";
import { getTheme } from "@/lib/themes";
import DrawingCanvas from "@/components/DrawingCanvas";
import HostPanel from "@/components/HostPanel";
import PartMiniMap from "@/components/PartMiniMap";
import RevealCanvas from "@/components/RevealCanvas";

const PARTY_HOST =
  process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "localhost:1999";
type ImageCache = Record<number, Record<number, Record<string, string>>>;

function pruneImagesForView(images: ImageCache, view: ClientView): ImageCache {
  const next: ImageCache = {};

  view.rounds.forEach((round, roundIndex) => {
    const roundImages = images[roundIndex];
    if (!roundImages) return;

    round.groups.forEach((group, groupIndex) => {
      const groupImages = roundImages[groupIndex];
      if (!groupImages) return;

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
    });
  });

  return next;
}

export default function GameRoom({ code }: { code: string }) {
  const [name, setName] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [needName, setNeedName] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("dt:name");
    if (stored) {
      setName(stored);
    } else {
      setNeedName(true);
    }
  }, []);

  if (needName) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6">
        <h1 className="text-2xl font-bold">Joining room {code}</h1>
        <input
          autoFocus
          className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-2.5 outline-none focus:border-violet-400"
          placeholder="Your name"
          maxLength={24}
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && nameInput.trim()) {
              localStorage.setItem("dt:name", nameInput.trim());
              setName(nameInput.trim());
              setNeedName(false);
            }
          }}
        />
        <button
          className="btn-primary w-full"
          disabled={!nameInput.trim()}
          onClick={() => {
            localStorage.setItem("dt:name", nameInput.trim());
            setName(nameInput.trim());
            setNeedName(false);
          }}
        >
          Join
        </button>
      </main>
    );
  }

  if (!name) {
    return (
      <main className="flex min-h-screen items-center justify-center text-white/50">
        Connecting…
      </main>
    );
  }

  return <ConnectedRoom code={code} name={name} />;
}

function ConnectedRoom({ code, name }: { code: string; name: string }) {
  const [view, setView] = useState<ClientView | null>(null);
  // roundIndex -> groupIndex -> partId -> dataUrl
  const [images, setImages] = useState<ImageCache>({});
  const [clockOffset, setClockOffset] = useState(0);
  const [copied, setCopied] = useState(false);

  // Session tokens are per room (each room mints its own identities).
  const tokenKey = `dt:token:${code.toLowerCase()}`;

  const socket = usePartySocket({
    host: PARTY_HOST,
    room: code.toLowerCase(),
    onOpen() {
      socket.send(
        JSON.stringify({
          type: "join",
          token: localStorage.getItem(tokenKey) ?? undefined,
          name,
        } satisfies ClientMessage)
      );
    },
    onMessage(evt) {
      const msg: ServerMessage = JSON.parse(evt.data as string);
      if (msg.type === "identity") {
        // Server-issued secret proving who we are; kept for reconnects.
        localStorage.setItem(tokenKey, msg.token);
      } else if (msg.type === "sync") {
        setView(msg.view);
        setImages((prev) => pruneImagesForView(prev, msg.view));
        setClockOffset(msg.view.serverNow - Date.now());
      } else if (msg.type === "part_image") {
        setImages((prev) => ({
          ...prev,
          [msg.roundIndex]: {
            ...(prev[msg.roundIndex] ?? {}),
            [msg.groupIndex]: {
              ...(prev[msg.roundIndex]?.[msg.groupIndex] ?? {}),
              [msg.partId]: msg.dataUrl,
            },
          },
        }));
      }
    },
  });

  const send = useCallback(
    (msg: ClientMessage) => socket.send(JSON.stringify(msg)),
    [socket]
  );

  if (!view) {
    return (
      <main className="flex min-h-screen items-center justify-center text-white/50">
        Connecting to room {code}…
      </main>
    );
  }

  const round = view.rounds[view.roundIndex];
  const isHost = view.you.isHost;
  const showHostPanel =
    isHost && ["assign", "drawing", "reveal_wait", "reveal"].includes(view.phase);

  return (
    <main className="mx-auto max-w-7xl p-4 sm:p-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black">🎨 Drawsembly Line</h1>
        <div className="flex items-center gap-2">
          {round && (
            <span className="rounded-full bg-white/10 px-3 py-1 text-sm">
              Round {view.roundIndex + 1}/{view.roundCount} ·{" "}
              {round.groups.length} group{round.groups.length === 1 ? "" : "s"}
            </span>
          )}
          <button
            className="btn-secondary text-sm"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? "Copied!" : `Room ${code} · copy link`}
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="min-w-0 flex-1">
          {view.phase === "lobby" && <LobbyView view={view} send={send} />}
          {view.phase === "assign" && <AssignView view={view} />}
          {view.phase === "drawing" && (
            <DrawingView
              view={view}
              send={send}
              clockOffset={clockOffset}
            />
          )}
          {view.phase === "reveal_wait" && (
            <RevealWaitView view={view} images={images} />
          )}
          {view.phase === "reveal" && round && (
            <div className="mx-auto max-w-3xl space-y-8">
              <h2 className="text-center text-3xl font-black">
                🎉 Behold… your masterpieces!
              </h2>
              {round.groups.map((g, gi) => {
                const theme = getTheme(g.themeId);
                return (
                  <div key={gi} className="space-y-2">
                    <h3 className="text-center text-xl font-bold">
                      Group {gi + 1}: {theme.emoji} {theme.name}
                    </h3>
                    <RevealCanvas
                      theme={theme}
                      images={images[view.roundIndex]?.[gi] ?? {}}
                      attributions={partAttributions(view, g)}
                      animate
                      downloadName={`round-${view.roundIndex + 1}-group-${
                        gi + 1
                      }-${theme.id}`}
                    />
                  </div>
                );
              })}
              {!isHost && (
                <p className="text-center text-white/50">
                  Waiting for the host to continue…
                </p>
              )}
            </div>
          )}
          {view.phase === "gallery" && (
            <GalleryView view={view} images={images} send={send} />
          )}
        </div>

        {showHostPanel && <HostPanel view={view} send={send} />}
      </div>
    </main>
  );
}

function partAttributions(view: ClientView, group: GroupView) {
  const byPart: Record<string, string> = {};
  for (const [partId, playerId] of Object.entries(group.assignments ?? {})) {
    const player = view.players.find((p) => p.id === playerId);
    if (player) byPart[partId] = player.name;
  }
  return byPart;
}

function formatTimer(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder === 0 ? `${minutes}m` : `${minutes}m ${remainder}s`;
}

function PlayerChips({ view }: { view: ClientView }) {
  return (
    <div className="flex flex-wrap gap-2">
      {view.players.map((p) => (
        <span
          key={p.id}
          className={`flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm ${
            p.connected ? "" : "opacity-40"
          }`}
        >
          <span
            className="h-3 w-3 rounded-full"
            style={{ background: p.color }}
          />
          {p.name}
          {p.isHost && " 👑"}
          {p.id === view.you.id && (
            <span className="text-white/40">(you)</span>
          )}
        </span>
      ))}
    </div>
  );
}

function LobbyView({
  view,
  send,
}: {
  view: ClientView;
  send: (m: ClientMessage) => void;
}) {
  return (
    <div className="card mx-auto max-w-xl space-y-5 text-center">
      <h2 className="text-2xl font-bold">Waiting room</h2>
      <p className="text-white/60">
        Share the room link — anyone can join. The host decides when to start.
      </p>
      <div className="flex justify-center">
        <PlayerChips view={view} />
      </div>
      {view.you.isHost ? (
        <button
          className="btn-primary w-full py-3 text-lg"
          disabled={view.players.length < 1}
          onClick={() => send({ type: "start_game" })}
        >
          🚀 Start game ({view.players.length} player
          {view.players.length === 1 ? "" : "s"})
        </button>
      ) : (
        <p className="animate-pulse text-white/50">
          Waiting for the host to start…
        </p>
      )}
      <p className="text-sm text-white/40">
        3 rounds · adjustable drawing timers · players are split into groups,
        and every group creates its own collective painting
      </p>
    </div>
  );
}

function AssignView({ view }: { view: ClientView }) {
  const yourParts = view.yourParts;
  const round = view.rounds[view.roundIndex];
  const gi = view.yourGroupIndex;
  const group = gi != null ? round.groups[gi] : null;
  const theme = group ? getTheme(group.themeId) : null;
  const playerName = (id: string) =>
    view.players.find((p) => p.id === id)?.name ?? "?";
  return (
    <div className="card mx-auto max-w-xl space-y-4 text-center">
      <h2 className="text-2xl font-bold">
        Round {view.roundIndex + 1} · {round.groups.length} group
        {round.groups.length === 1 ? "" : "s"}
      </h2>
      {view.you.isHost && (
        <p className="text-white/60">
          Pick each group&apos;s preset and adjust groups &amp; parts on the
          right, then start the round.
        </p>
      )}
      {group && theme && yourParts.length > 0 ? (
        <>
          <p className="text-white/60">
            You&apos;re in <b>Group {gi! + 1}</b>, painting a {theme.emoji}{" "}
            <b>{theme.name}</b>. You&apos;ll be drawing:
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {yourParts.map((pid) => {
              const part = theme.parts.find((p) => p.id === pid);
              return (
                <span
                  key={pid}
                  className="rounded-full bg-violet-500/20 px-4 py-1.5 font-semibold text-violet-200"
                >
                  {part?.label ?? pid}
                </span>
              );
            })}
          </div>
          <p className="text-sm text-white/50">
            Groupmates: {group.members.map(playerName).join(", ")}
          </p>
          {!view.you.isHost && (
            <p className="animate-pulse text-white/50">
              Get ready — the host starts the {formatTimer(round.drawSeconds)}{" "}
              timer…
            </p>
          )}
        </>
      ) : !view.you.isHost ? (
        <p className="text-white/60">
          You&apos;re sitting this round out — enjoy the show! 🍿
        </p>
      ) : null}
      <PlayerChips view={view} />
    </div>
  );
}

function Countdown({
  endsAt,
  clockOffset,
  durationSeconds,
}: {
  endsAt: number;
  clockOffset: number;
  durationSeconds: number;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);
  const remaining = Math.max(0, endsAt - (now + clockOffset));
  const secs = Math.ceil(remaining / 1000);
  const totalMs = Math.max(1, durationSeconds * 1000);
  const pct = Math.min(100, (remaining / totalMs) * 100);
  return (
    <div className="space-y-1">
      <div
        className={`text-center text-4xl font-black tabular-nums ${
          secs <= 10 ? "text-rose-400" : ""
        }`}
      >
        {secs}s
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all ${
            secs <= 10 ? "bg-rose-500" : "bg-violet-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function DrawingView({
  view,
  send,
  clockOffset,
}: {
  view: ClientView;
  send: (m: ClientMessage) => void;
  clockOffset: number;
}) {
  const round = view.rounds[view.roundIndex];
  const gi = view.yourGroupIndex;
  const group = gi != null ? round.groups[gi] : null;
  const theme = group ? getTheme(group.themeId) : null;
  const yourParts = view.yourParts;
  const [activePart, setActivePart] = useState(yourParts[0] ?? "");
  const [doneNotice, setDoneNotice] = useState<string | null>(null);
  const [optimisticDoneParts, setOptimisticDoneParts] = useState<string[]>([]);
  const donePartIds = new Set([
    ...(group?.doneParts ?? []),
    ...optimisticDoneParts,
  ]);
  const localDeadline = view.drawingEndsAt
    ? view.drawingEndsAt - clockOffset
    : null;

  // Keep active part valid if assignments change.
  useEffect(() => {
    if (!yourParts.includes(activePart) && yourParts.length > 0) {
      setActivePart(yourParts[0]);
    } else if (yourParts.length === 0 && activePart !== "") {
      setActivePart("");
    }
  }, [yourParts, activePart]);

  useEffect(() => {
    setOptimisticDoneParts((prev) => {
      const next = prev.filter((pid) => yourParts.includes(pid));
      return next.length === prev.length ? prev : next;
    });
  }, [yourParts]);

  const onSnapshot = useCallback(
    (partId: string, dataUrl: string) => {
      if (gi == null) return;
      send({ type: "snapshot", groupIndex: gi, partId, dataUrl });
    },
    [send, gi]
  );

  function markDone(partId: string) {
    if (gi == null || !group || !theme) return;

    send({ type: "done", groupIndex: gi, partId });
    setOptimisticDoneParts((prev) =>
      prev.includes(partId) ? prev : [...prev, partId]
    );

    const nextPartId = yourParts.find(
      (pid) => pid !== partId && !donePartIds.has(pid)
    );
    const completedPart = theme.parts.find((p) => p.id === partId);

    if (nextPartId) {
      const nextPart = theme.parts.find((p) => p.id === nextPartId);
      setDoneNotice(
        `${completedPart?.label ?? "That part"} is done. Next up: ${
          nextPart?.label ?? nextPartId
        }.`
      );
      setActivePart(nextPartId);
      return;
    }

    setDoneNotice(
      "All of your parts are marked done. You can keep polishing until time is up."
    );
  }

  if (gi == null || !group || !theme || yourParts.length === 0) {
    return (
      <div className="card mx-auto max-w-xl space-y-4 text-center">
        <h2 className="text-2xl font-bold">You&apos;re spectating 🍿</h2>
        {view.drawingEndsAt && (
          <Countdown
            endsAt={view.drawingEndsAt}
            clockOffset={clockOffset}
            durationSeconds={round.drawSeconds}
          />
        )}
        <p className="text-white/60">
          The others are furiously scribbling. Judge them silently.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-center text-sm text-white/50">
        Group {gi + 1} · {theme.emoji} {theme.name}
      </p>
      {view.drawingEndsAt && (
        <Countdown
          endsAt={view.drawingEndsAt}
          clockOffset={clockOffset}
          durationSeconds={round.drawSeconds}
        />
      )}

      {doneNotice && (
        <div
          role="status"
          className="rounded-xl border border-violet-300/30 bg-violet-500/15 px-4 py-2 text-sm font-medium text-violet-100"
        >
          {doneNotice}
        </div>
      )}

      {yourParts.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {yourParts.map((pid) => {
            const part = theme.parts.find((p) => p.id === pid);
            const done = donePartIds.has(pid);
            return (
              <button
                key={pid}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                  activePart === pid
                    ? "bg-violet-500 text-white"
                    : "bg-white/10 hover:bg-white/20"
                }`}
                onClick={() => setActivePart(pid)}
              >
                {part?.label ?? pid} {done && "✅"}
              </button>
            );
          })}
        </div>
      )}

      {yourParts.map((pid) => {
        const part = theme.parts.find((p) => p.id === pid);
        if (!part) return null;
        const done = donePartIds.has(pid);
        return (
          <div
            key={pid}
            className={pid === activePart ? "space-y-3" : "hidden"}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">
                  Your part: {part.label}
                </h2>
                <p className="max-w-md text-sm text-white/60">{part.hint}</p>
              </div>
              <div className="flex items-center gap-3">
                <PartMiniMap theme={theme} highlightPartId={pid} />
                <button
                  className="btn-primary"
                  disabled={done}
                  onClick={() => markDone(pid)}
                >
                  {done ? "✅ Done" : "I'm done"}
                </button>
              </div>
            </div>
            <DrawingCanvas
              part={part}
              deadline={localDeadline}
              onSnapshot={onSnapshot}
            />
          </div>
        );
      })}
    </div>
  );
}

function RevealWaitView({
  view,
  images,
}: {
  view: ClientView;
  images: Record<number, Record<number, Record<string, string>>>;
}) {
  const round = view.rounds[view.roundIndex];
  if (view.you.isHost) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <h2 className="text-center text-2xl font-bold">
          🤫 Private preview (only you can see this)
        </h2>
        {round.groups.map((g, gi) => {
          const theme = getTheme(g.themeId);
          return (
            <div key={gi} className="space-y-2">
              <h3 className="text-lg font-bold">
                Group {gi + 1}: {theme.emoji} {theme.name}
              </h3>
              <RevealCanvas
                theme={theme}
                images={images[view.roundIndex]?.[gi] ?? {}}
                attributions={partAttributions(view, g)}
                downloadName={`round-${view.roundIndex + 1}-group-${gi + 1}-${
                  theme.id
                }`}
              />
            </div>
          );
        })}
      </div>
    );
  }
  return (
    <div className="card mx-auto max-w-xl space-y-3 text-center">
      <h2 className="text-2xl font-bold">🖌️ Brushes down!</h2>
      <p className="animate-pulse text-white/60">
        Waiting for the host to reveal the painting…
      </p>
    </div>
  );
}

function GalleryView({
  view,
  images,
  send,
}: {
  view: ClientView;
  images: Record<number, Record<number, Record<string, string>>>;
  send: (m: ClientMessage) => void;
}) {
  const revealed = view.rounds
    .map((r, i) => ({ round: r, i }))
    .filter(({ round }) => round.revealed);
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-black">🖼️ The Gallery</h2>
        <p className="mt-1 text-white/60">
          {revealed.length > 0
            ? "Every masterpiece from today's session. The Louvre called — they said no."
            : "The game ended before any painting was finished."}
        </p>
      </div>
      <div className="grid gap-8 md:grid-cols-2">
        {revealed.flatMap(({ round, i }) =>
          round.groups.map((g, gi) => {
            const theme = getTheme(g.themeId);
            return (
              <div key={`${i}-${gi}`} className="space-y-2">
                <h3 className="text-lg font-bold">
                  Round {i + 1}, Group {gi + 1}: {theme.emoji} {theme.name}
                </h3>
                <RevealCanvas
                  theme={theme}
                  images={images[i]?.[gi] ?? {}}
                  attributions={partAttributions(view, g)}
                  downloadName={`round-${i + 1}-group-${gi + 1}-${theme.id}`}
                />
              </div>
            );
          })
        )}
      </div>
      {view.you.isHost && (
        <div className="flex justify-center">
          <button
            className="btn-primary"
            onClick={() => send({ type: "play_again" })}
          >
            🔄 Play again
          </button>
        </div>
      )}
    </div>
  );
}
