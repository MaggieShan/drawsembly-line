"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Part } from "@/lib/themes";

type Point = [number, number];
type ShapeTool = "line" | "rectangle" | "circle" | "triangle";
type Tool = "pen" | "eraser" | ShapeTool;

type PathStroke = {
  kind: "path";
  color: string;
  size: number;
  erase: boolean;
  points: Point[];
};

type ShapeStroke = {
  kind: "shape";
  shape: ShapeTool;
  color: string;
  size: number;
  points: [Point, Point];
};

type Stroke = PathStroke | ShapeStroke;

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
const SHAPE_TOOLS: { tool: ShapeTool; label: string }[] = [
  { tool: "line", label: "╱ Line" },
  { tool: "rectangle", label: "▭ Rectangle" },
  { tool: "circle", label: "◯ Circle" },
  { tool: "triangle", label: "△ Triangle" },
];

/** Internal canvas resolution multiplier for smoother lines. */
const SCALE = 2;

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  ctx.lineWidth = stroke.size * SCALE;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (stroke.kind === "path") {
    const [first, ...rest] = stroke.points;
    if (!first) return;

    ctx.globalCompositeOperation = stroke.erase
      ? "destination-out"
      : "source-over";
    ctx.strokeStyle = stroke.color;
    ctx.beginPath();
    ctx.moveTo(first[0], first[1]);
    if (rest.length === 0) ctx.lineTo(first[0] + 0.01, first[1] + 0.01);
    for (const [x, y] of rest) ctx.lineTo(x, y);
    ctx.stroke();
    return;
  }

  const [[startX, startY], [endX, endY]] = stroke.points;
  const left = Math.min(startX, endX);
  const right = Math.max(startX, endX);
  const top = Math.min(startY, endY);
  const bottom = Math.max(startY, endY);
  const width = right - left;
  const height = bottom - top;

  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = stroke.color;
  ctx.beginPath();

  if (stroke.shape === "line") {
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
  } else if (stroke.shape === "rectangle") {
    ctx.rect(left, top, width, height);
  } else if (stroke.shape === "circle") {
    const diameter = Math.max(width, height);
    const x = endX < startX ? startX - diameter : startX;
    const y = endY < startY ? startY - diameter : startY;
    ctx.arc(x + diameter / 2, y + diameter / 2, diameter / 2, 0, Math.PI * 2);
  } else {
    ctx.moveTo(left + width / 2, top);
    ctx.lineTo(right, bottom);
    ctx.lineTo(left, bottom);
    ctx.closePath();
  }

  ctx.stroke();
}

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
  const dirtyRef = useRef(false);
  const flushSnapshotRef = useRef<() => void>(() => {});
  const [color, setColor] = useState("#000000");
  const [size, setSize] = useState(8);
  const [tool, setTool] = useState<Tool>("pen");
  const [strokeCount, setStrokeCount] = useState(0);

  const w = part.rect.w * SCALE;
  const h = part.rect.h * SCALE;

  const setCanvasRef = useCallback((canvas: HTMLCanvasElement | null) => {
    if (canvas) canvasRef.current = canvas;
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const all = currentRef.current
      ? [...strokesRef.current, currentRef.current]
      : strokesRef.current;
    for (const s of all) drawStroke(ctx, s);
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
    dirtyRef.current = false;
  }, [part, onSnapshot]);

  const flushSnapshot = useCallback(() => {
    if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
    sendTimerRef.current = null;
    if (!dirtyRef.current) return;
    snapshot();
  }, [snapshot]);

  const scheduleSnapshot = useCallback(() => {
    if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
    sendTimerRef.current = setTimeout(flushSnapshot, 700);
  }, [flushSnapshot]);

  // Final flush right before the deadline.
  useEffect(() => {
    if (!deadline) return;
    const ms = deadline - Date.now() - 250;
    if (ms <= 0) {
      flushSnapshot();
      return;
    }
    const t = setTimeout(flushSnapshot, ms);
    return () => clearTimeout(t);
  }, [deadline, flushSnapshot]);

  useEffect(() => {
    flushSnapshotRef.current = flushSnapshot;
  }, [flushSnapshot]);

  useEffect(() => {
    return () => {
      flushSnapshotRef.current();
    };
  }, []);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>): Point {
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
    const pos = getPos(e);
    currentRef.current =
      tool === "pen" || tool === "eraser"
        ? {
            kind: "path",
            color,
            size,
            erase: tool === "eraser",
            points: [pos],
          }
        : {
            kind: "shape",
            shape: tool,
            color,
            size,
            points: [pos, pos],
          };
    dirtyRef.current = true;
    redraw();
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!currentRef.current) return;
    const pos = getPos(e);
    if (currentRef.current.kind === "path") {
      currentRef.current.points.push(pos);
    } else {
      currentRef.current.points = [currentRef.current.points[0], pos];
    }
    dirtyRef.current = true;
    redraw();
  }

  function endStroke() {
    if (!currentRef.current) return;
    strokesRef.current.push(currentRef.current);
    currentRef.current = null;
    dirtyRef.current = true;
    setStrokeCount(strokesRef.current.length);
    redraw();
    scheduleSnapshot();
  }

  function undo() {
    strokesRef.current.pop();
    dirtyRef.current = true;
    setStrokeCount(strokesRef.current.length);
    redraw();
    scheduleSnapshot();
  }

  function clearAll() {
    strokesRef.current = [];
    currentRef.current = null;
    dirtyRef.current = true;
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
                  color === c && tool !== "eraser"
                    ? "#a78bfa"
                    : "rgba(255,255,255,0.2)",
              }}
              onClick={() => {
                setColor(c);
                setTool((currentTool) =>
                  currentTool === "eraser" ? "pen" : currentTool
                );
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
          {SHAPE_TOOLS.map(({ tool: shapeTool, label }) => (
            <button
              key={shapeTool}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                tool === shapeTool ? "bg-violet-500/40" : "hover:bg-white/10"
              }`}
              onClick={() => setTool(shapeTool)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 rounded-xl bg-white/5 p-2">
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
        ref={setCanvasRef}
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
