"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";

function randomCode() {
  return Array.from(
    { length: 4 },
    () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  ).join("");
}

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");

  useEffect(() => {
    setName(localStorage.getItem("dt:name") ?? "");
  }, []);

  function go(code: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    localStorage.setItem("dt:name", trimmed);
    router.push(`/room/${code.toUpperCase()}`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-8 p-6">
      <div className="text-center">
        <h1 className="text-5xl font-black tracking-tight">
          🎨 Drawsembly Line
        </h1>
        <p className="mt-3 text-white/60">
          Everyone draws one piece. Together it becomes a masterpiece.
          (Or a monstrosity. Usually a monstrosity.)
        </p>
      </div>

      <div className="card w-full space-y-5">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-white/70">
            Your name
          </span>
          <input
            className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-2.5 outline-none focus:border-violet-400"
            placeholder="e.g. Maggie"
            maxLength={24}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <button
          className="btn-primary w-full py-3 text-lg"
          disabled={!name.trim()}
          onClick={() => go(randomCode())}
        >
          Create a room (you&apos;ll be the host)
        </button>

        <div className="flex items-center gap-3 text-white/40">
          <div className="h-px flex-1 bg-white/10" />
          or join one
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <div className="flex gap-2">
          <input
            className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-2.5 font-mono text-lg uppercase tracking-widest outline-none focus:border-violet-400"
            placeholder="CODE"
            maxLength={8}
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter" && joinCode.trim() && name.trim())
                go(joinCode.trim());
            }}
          />
          <button
            className="btn-secondary shrink-0"
            disabled={!name.trim() || !joinCode.trim()}
            onClick={() => go(joinCode.trim())}
          >
            Join
          </button>
        </div>
      </div>

      <p className="text-center text-sm text-white/40">
        3 rounds · 60 seconds each · players split into groups, one painting
        per group — works great with 30+ people
      </p>
    </main>
  );
}
