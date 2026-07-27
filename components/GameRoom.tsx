"use client";

import usePartySocket from "partysocket/react";
import { useCallback, useEffect, useState } from "react";
import type {
  ClientMessage,
  ClientView,
  ServerMessage,
} from "@/lib/protocol";
import { getTheme } from "@/lib/themes";
import DrawingCanvas from "@/components/DrawingCanvas";
import HostPanel from "@/components/HostPanel";
import PartMiniMap from "@/components/PartMiniMap";
import RevealCanvas from "@/components/RevealCanvas";

const PARTY_HOST =
  process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "localhost:1999";

export default function GameRoom({ code }: { code: string }) {
  const [identity, setIdentity] = useState<{
    playerId: string;
    name: string;
  } | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [needName, setNeedName] = useState(false);

  useEffect(() => {
    let pid = localStorage.getItem("dt:pid");
    if (!pid) {
      pid = crypto.randomUUID();
      localStorage.setItem("dt:pid", pid);
    }
    const name = localStorage.getItem("dt:name");
    if (name) {
      setIdentity({ playerId: pid, name });
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
              setIdentity({
                playerId: localStorage.getItem("dt:pid")!,
                name: nameInput.trim(),
              });
              setNeedName(false);
            }
          }}
        />
        <button
          className="btn-primary w-full"
          disabled={!nameInput.trim()}
          onClick={() => {
            localStorage.setItem("dt:name", nameInput.trim());
            setIdentity({
              playerId: localStorage.getItem("dt:pid")!,
              name: nameInput.trim(),
            });
            setNeedName(false);
          }}
        >
          Join
        </button>
      </main>
    );
  }

  if (!identity) {
    return (
      <main className="flex min-h-screen items-center justify-center text-white/50">
        Connecting…
      </main>
    );
  }

  return <ConnectedRoom code={code} identity={identity} />;
}

function ConnectedRoom({
  code,
  identity,
}: {
  code: string;
  identity: { playerId: string; name: string };
}) {
  const [view, setView] = useState<ClientView | null>(null);
  const [images, setImages] = useState<
    Record<number, Record<string, string>>
  >({});
  const [clockOffset, setClockOffset] = useState(0);
  const [copied, setCopied] = useState(false);

  const socket = usePartySocket({
    host: PARTY_HOST,
    room: code.toLowerCase(),
    onOpen() {
      socket.send(
        JSON.stringify({
          type: "join",
          playerId: identity.playerId,
          name: identity.name,
        } satisfies ClientMessage)
      );
    },
    onMessage(evt) {
      const msg: ServerMessage = JSON.parse(evt.data as string);
      if (msg.type === "sync") {
        setView(msg.view);
        setClockOffset(msg.view.serverNow - Date.now());
      } else if (msg.type === "part_image") {
        setImages((prev) => ({
          ...prev,
          [msg.roundIndex]: {
            ...(prev[msg.roundIndex] ?? {}),
            [msg.partId]: msg.dataUrl,
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
  const theme = round ? getTheme(round.themeId) : null;
  const isHost = view.you.isHost;
  const showHostPanel =
    isHost && ["assign", "drawing", "reveal_wait", "reveal"].includes(view.phase);

  return (
    <main className="mx-auto max-w-6xl p-4 sm:p-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black">🎨 Drawsembly Line</h1>
        <div className="flex items-center gap-2">
          {round && (
            <span className="rounded-full bg-white/10 px-3 py-1 text-sm">
              Round {view.roundIndex + 1}/{view.roundCount} ·{" "}
              {theme?.emoji} {theme?.name}
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
          {view.phase === "reveal" && (
            <div className="mx-auto max-w-3xl space-y-3">
              <h2 className="text-center text-3xl font-black">
                {theme?.emoji} Behold… your {theme?.name}!
              </h2>
              {theme && (
                <RevealCanvas
                  theme={theme}
                  images={images[view.roundIndex] ?? {}}
                  animate
                  downloadName={`round-${view.roundIndex + 1}-${theme.id}`}
                />
              )}
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
        3 rounds · 60s each · every round becomes one collective painting
      </p>
    </div>
  );
}

function AssignView({ view }: { view: ClientView }) {
  const yourParts = view.yourParts;
  const round = view.rounds[view.roundIndex];
  const theme = getTheme(round.themeId);
  return (
    <div className="card mx-auto max-w-xl space-y-4 text-center">
      <h2 className="text-2xl font-bold">
        Round {view.roundIndex + 1}: {theme.emoji} {theme.name}
      </h2>
      {view.you.isHost ? (
        <p className="text-white/60">
          Review the assignments on the right, then start the round.
        </p>
      ) : yourParts.length > 0 ? (
        <>
          <p className="text-white/60">You&apos;ll be drawing:</p>
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
          <p className="animate-pulse text-white/50">
            Get ready — the host starts the 60s timer…
          </p>
        </>
      ) : (
        <p className="text-white/60">
          You&apos;re sitting this round out — enjoy the show! 🍿
        </p>
      )}
      <PlayerChips view={view} />
    </div>
  );
}

function Countdown({
  endsAt,
  clockOffset,
}: {
  endsAt: number;
  clockOffset: number;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);
  const remaining = Math.max(0, endsAt - (now + clockOffset));
  const secs = Math.ceil(remaining / 1000);
  const pct = Math.min(100, (remaining / 60000) * 100);
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
  const theme = getTheme(round.themeId);
  const yourParts = view.yourParts;
  const [activePart, setActivePart] = useState(yourParts[0] ?? "");
  const localDeadline = view.drawingEndsAt
    ? view.drawingEndsAt - clockOffset
    : null;

  // Keep active part valid if assignments change.
  useEffect(() => {
    if (!yourParts.includes(activePart) && yourParts.length > 0) {
      setActivePart(yourParts[0]);
    }
  }, [yourParts, activePart]);

  const onSnapshot = useCallback(
    (partId: string, dataUrl: string) =>
      send({ type: "snapshot", partId, dataUrl }),
    [send]
  );

  if (yourParts.length === 0) {
    return (
      <div className="card mx-auto max-w-xl space-y-4 text-center">
        <h2 className="text-2xl font-bold">You&apos;re spectating 🍿</h2>
        {view.drawingEndsAt && (
          <Countdown endsAt={view.drawingEndsAt} clockOffset={clockOffset} />
        )}
        <p className="text-white/60">
          The others are furiously scribbling. Judge them silently.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {view.drawingEndsAt && (
        <Countdown endsAt={view.drawingEndsAt} clockOffset={clockOffset} />
      )}

      {yourParts.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {yourParts.map((pid) => {
            const part = theme.parts.find((p) => p.id === pid);
            const done = round.doneParts.includes(pid);
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
        const done = round.doneParts.includes(pid);
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
                  onClick={() => send({ type: "done", partId: pid })}
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
  images: Record<number, Record<string, string>>;
}) {
  const round = view.rounds[view.roundIndex];
  const theme = getTheme(round.themeId);
  if (view.you.isHost) {
    return (
      <div className="mx-auto max-w-3xl space-y-3">
        <h2 className="text-center text-2xl font-bold">
          🤫 Private preview (only you can see this)
        </h2>
        <RevealCanvas
          theme={theme}
          images={images[view.roundIndex] ?? {}}
          downloadName={`round-${view.roundIndex + 1}-${theme.id}`}
        />
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
  images: Record<number, Record<string, string>>;
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
        {revealed.map(({ round, i }) => {
          const theme = getTheme(round.themeId);
          return (
            <div key={i} className="space-y-2">
              <h3 className="text-lg font-bold">
                Round {i + 1}: {theme.emoji} {theme.name}
              </h3>
              <RevealCanvas
                theme={theme}
                images={images[i] ?? {}}
                downloadName={`round-${i + 1}-${theme.id}`}
              />
            </div>
          );
        })}
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
