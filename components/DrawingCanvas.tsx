"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Part } from "@/lib/themes";

type Stroke = {
  color: string;
  size: number;
  erase: boolean;
  points: [number, number][];
};

const COLORS = [
  "#000000",
  "#6b7280",
  "#ffffff",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#92400e",
];

const SIZES = [4, 8, 14, 26];

/** Internal canvas resolution multiplier for smoother lines. */
const SCALE = 2;

export default function DrawingCanvas({
  part,
  deadline,
  onSnapshot,
}: {
  part: Part;
  /** Local epoch ms when drawing ends; used to flush a final snapshot. */
  deadline: number | null;
  onSnapshot: (partId: string, dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const currentRef = useRef<Stroke | null>(null);
  const sendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [color, setColor] = useState("#000000");
  const [size, setSize] = useState(8);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [strokeCount, setStrokeCount] = useState(0);

  const w = part.rect.w * SCALE;
  const h = part.rect.h * SCALE;

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const all = currentRef.current
      ? [...strokesRef.current, currentRef.current]
      : strokesRef.current;
    for (const s of all) {
      ctx.globalCompositeOperation = s.erase ? "destination-out" : "source-over";
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.size * SCALE;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      const [first, ...rest] = s.points;
      ctx.moveTo(first[0], first[1]);
      if (rest.length === 0) ctx.lineTo(first[0] + 0.01, first[1] + 0.01);
      for (const [x, y] of rest) ctx.lineTo(x, y);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
  }, []);

  const snapshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Export at 1x (final composite resolution) to keep payloads small.
    const out = document.createElement("canvas");
    out.width = part.rect.w;
    out.height = part.rect.h;
    const ctx = out.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(canvas, 0, 0, out.width, out.height);
    onSnapshot(part.id, out.toDataURL("image/png"));
  }, [part, onSnapshot]);

  const scheduleSnapshot = useCallback(() => {
    if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
    sendTimerRef.current = setTimeout(snapshot, 700);
  }, [snapshot]);

  // Final flush right before the deadline.
  useEffect(() => {
    if (!deadline) return;
    const ms = deadline - Date.now() - 250;
    if (ms <= 0) return;
    const t = setTimeout(snapshot, ms);
    return () => clearTimeout(t);
  }, [deadline, snapshot]);

  useEffect(() => {
    return () => {
      if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
    };
  }, []);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>): [number, number] {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return [
      ((e.clientX - rect.left) / rect.width) * w,
      ((e.clientY - rect.top) / rect.height) * h,
    ];
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    currentRef.current = {
      color,
      size,
      erase: tool === "eraser",
      points: [getPos(e)],
    };
    redraw();
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!currentRef.current) return;
    currentRef.current.points.push(getPos(e));
    redraw();
  }

  function endStroke() {
    if (!currentRef.current) return;
    strokesRef.current.push(currentRef.current);
    currentRef.current = null;
    setStrokeCount(strokesRef.current.length);
    redraw();
    scheduleSnapshot();
  }

  function undo() {
    strokesRef.current.pop();
    setStrokeCount(strokesRef.current.length);
    redraw();
    scheduleSnapshot();
  }

  function clearAll() {
    strokesRef.current = [];
    setStrokeCount(0);
    redraw();
    scheduleSnapshot();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5 rounded-xl bg-white/5 p-2">
          {COLORS.map((c) => (
            <button
              key={c}
              aria-label={`color ${c}`}
              className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
              style={{
                background: c,
                borderColor:
                  color === c && tool === "pen" ? "#a78bfa" : "rgba(255,255,255,0.2)",
              }}
              onClick={() => {
                setColor(c);
                setTool("pen");
              }}
            />
          ))}
        </div>
        <div className="flex items-center gap-1.5 rounded-xl bg-white/5 p-2">
          {SIZES.map((s) => (
            <button
              key={s}
              aria-label={`brush size ${s}`}
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                size === s ? "bg-violet-500/40" : "hover:bg-white/10"
              }`}
              onClick={() => setSize(s)}
            >
              <span
                className="rounded-full bg-white"
                style={{ width: Math.min(s, 22), height: Math.min(s, 22) }}
              />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 rounded-xl bg-white/5 p-2">
          <button
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              tool === "pen" ? "bg-violet-500/40" : "hover:bg-white/10"
            }`}
            onClick={() => setTool("pen")}
          >
            ✏️ Pen
          </button>
          <button
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              tool === "eraser" ? "bg-violet-500/40" : "hover:bg-white/10"
            }`}
            onClick={() => setTool("eraser")}
          >
            🧽 Eraser
          </button>
          <button
            className="rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-white/10 disabled:opacity-30"
            disabled={strokeCount === 0}
            onClick={undo}
          >
            ↩️ Undo
          </button>
          <button
            className="rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-white/10 disabled:opacity-30"
            disabled={strokeCount === 0}
            onClick={clearAll}
          >
            🗑️ Clear
          </button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={w}
        height={h}
        className="w-full max-w-2xl cursor-crosshair rounded-xl bg-white shadow-lg"
        style={{ aspectRatio: `${part.rect.w} / ${part.rect.h}`, touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
        onPointerLeave={endStroke}
      />
    </div>
  );
}
