"use client";

import { useEffect, useRef } from "react";
import type { Theme } from "@/lib/themes";

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let clipped = text;
  while (clipped.length > 1 && ctx.measureText(`${clipped}…`).width > maxWidth) {
    clipped = clipped.slice(0, -1);
  }
  return `${clipped}…`;
}

function drawAttribution(
  ctx: CanvasRenderingContext2D,
  name: string | undefined,
  rect: { x: number; y: number; w: number; h: number }
) {
  if (!name) return;
  const trimmedName = name.trim();
  if (!trimmedName) return;
  const label = trimmedName;

  ctx.save();
  const fontSize = Math.max(14, Math.min(30, Math.floor(rect.h * 0.08)));
  const paddingX = Math.max(8, Math.floor(fontSize * 0.65));
  const labelHeight = Math.max(24, Math.floor(fontSize * 1.55));
  const maxTextWidth = Math.max(24, rect.w - paddingX * 4);

  ctx.font =
    `600 ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  const text = fitText(ctx, label, maxTextWidth);
  const textWidth = ctx.measureText(text).width;
  const labelWidth = Math.min(rect.w - paddingX * 2, textWidth + paddingX * 2);
  const x = rect.x + (rect.w - labelWidth) / 2;
  const y = rect.y + rect.h - labelHeight - Math.max(6, fontSize * 0.35);

  ctx.fillStyle = "rgba(17, 24, 39, 0.42)";
  ctx.beginPath();
  ctx.roundRect(x, y, labelWidth, labelHeight, labelHeight / 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, rect.x + rect.w / 2, y + labelHeight / 2);
  ctx.restore();
}
function drawZooBackground(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; w: number; h: number }
) {
  ctx.save();

  ctx.fillStyle = "#74c365";
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

  ctx.fillStyle = "rgba(255,255,255,0.14)";
  for (let x = rect.x + 90; x < rect.x + rect.w; x += 180) {
    for (let y = rect.y + 90; y < rect.y + rect.h; y += 150) {
      ctx.beginPath();
      ctx.ellipse(x, y, 52, 20, -0.25, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const inset = 32;
  const left = rect.x + inset;
  const right = rect.x + rect.w - inset;
  const top = rect.y + inset;
  const bottom = rect.y + rect.h - inset;

  ctx.strokeStyle = "#7c4f2a";
  ctx.lineWidth = 12;
  ctx.lineCap = "round";
  for (const y of [top + 28, bottom - 28]) {
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
  }
  for (const x of [left + 28, right - 28]) {
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
  }

  ctx.fillStyle = "#9a6a3d";
  for (let x = left; x <= right; x += 70) {
    ctx.fillRect(x - 7, top - 8, 14, 82);
    ctx.fillRect(x - 7, bottom - 74, 14, 82);
  }
  for (let y = top; y <= bottom; y += 70) {
    ctx.fillRect(left - 8, y - 7, 82, 14);
    ctx.fillRect(right - 74, y - 7, 82, 14);
  }

  ctx.strokeStyle = "#4b2e18";
  ctx.lineWidth = 8;
  ctx.strokeRect(left, top, right - left, bottom - top);

  ctx.restore();
}

function drawAquariumBackground(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; w: number; h: number }
) {
  ctx.save();

  const water = ctx.createLinearGradient(
    rect.x,
    rect.y,
    rect.x,
    rect.y + rect.h
  );
  water.addColorStop(0, "#b8ecff");
  water.addColorStop(1, "#68c7f0");
  ctx.fillStyle = water;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

  ctx.fillStyle = "rgba(255,255,255,0.22)";
  for (let y = rect.y + 120; y < rect.y + rect.h - 120; y += 120) {
    ctx.beginPath();
    ctx.ellipse(rect.x + rect.w / 2, y, rect.w * 0.45, 18, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#f4d28a";
  ctx.fillRect(rect.x, rect.y + rect.h - 110, rect.w, 110);
  ctx.fillStyle = "#d6a95c";
  for (let x = rect.x + 40; x < rect.x + rect.w; x += 80) {
    ctx.beginPath();
    ctx.arc(x, rect.y + rect.h - 62 + ((x / 80) % 2) * 18, 14, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(rect.x + 100, rect.y + 135);
  ctx.lineTo(rect.x + 250, rect.y + 80);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(rect.x + 100, rect.y + 220);
  ctx.lineTo(rect.x + 360, rect.y + 120);
  ctx.stroke();

  ctx.strokeStyle = "#1d4ed8";
  ctx.lineWidth = 18;
  ctx.strokeRect(rect.x + 34, rect.y + 34, rect.w - 68, rect.h - 68);

  ctx.strokeStyle = "#0f766e";
  ctx.lineWidth = 10;
  ctx.strokeRect(rect.x + 58, rect.y + 58, rect.w - 116, rect.h - 116);

  ctx.fillStyle = "rgba(255,255,255,0.45)";
  for (const bubble of [
    [210, 180, 18],
    [250, 130, 10],
    [315, 220, 14],
    [870, 250, 20],
    [925, 185, 12],
    [1010, 310, 16],
    [650, 150, 11],
  ]) {
    ctx.beginPath();
    ctx.arc(rect.x + bubble[0], rect.y + bubble[1], bubble[2], 0, Math.PI * 2);
    ctx.fill();
  }


  ctx.restore();
}

function drawFarmBackground(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; w: number; h: number }
) {
  ctx.save();

  const sky = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  sky.addColorStop(0, "#9bdcff");
  sky.addColorStop(0.34, "#d8f4ff");
  sky.addColorStop(0.35, "#79c95b");
  sky.addColorStop(1, "#4f9f3a");
  ctx.fillStyle = sky;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

  ctx.fillStyle = "#ffe066";
  ctx.beginPath();
  ctx.arc(rect.x + rect.w - 170, rect.y + 130, 70, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.72)";
  for (const cloud of [
    [180, 130, 70, 32],
    [255, 125, 86, 36],
    [335, 140, 66, 28],
    [1130, 190, 78, 34],
    [1210, 180, 96, 40],
    [1300, 198, 72, 30],
  ]) {
    ctx.beginPath();
    ctx.ellipse(
      rect.x + cloud[0],
      rect.y + cloud[1],
      cloud[2],
      cloud[3],
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  ctx.fillStyle = "#d62828";
  ctx.fillRect(rect.x + 660, rect.y + 255, 280, 210);
  ctx.fillStyle = "#8b1e1e";
  ctx.beginPath();
  ctx.moveTo(rect.x + 630, rect.y + 260);
  ctx.lineTo(rect.x + 800, rect.y + 145);
  ctx.lineTo(rect.x + 970, rect.y + 260);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(rect.x + 758, rect.y + 345, 84, 120);
  ctx.strokeStyle = "#7f1d1d";
  ctx.lineWidth = 6;
  ctx.strokeRect(rect.x + 758, rect.y + 345, 84, 120);
  ctx.beginPath();
  ctx.moveTo(rect.x + 758, rect.y + 345);
  ctx.lineTo(rect.x + 842, rect.y + 465);
  ctx.moveTo(rect.x + 842, rect.y + 345);
  ctx.lineTo(rect.x + 758, rect.y + 465);
  ctx.stroke();
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(rect.x + 690, rect.y + 300, 54, 48);
  ctx.fillRect(rect.x + 856, rect.y + 300, 54, 48);

  ctx.fillStyle = "#d6a75c";
  ctx.beginPath();
  ctx.moveTo(rect.x + 710, rect.y + rect.h);
  ctx.quadraticCurveTo(
    rect.x + rect.w / 2,
    rect.y + 820,
    rect.x + 850,
    rect.y + 465
  );
  ctx.lineTo(rect.x + 750, rect.y + 465);
  ctx.quadraticCurveTo(rect.x + 610, rect.y + 850, rect.x + 470, rect.y + rect.h);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#8b5a2b";
  ctx.lineWidth = 12;
  ctx.lineCap = "round";
  for (const y of [rect.y + 470, rect.y + 540]) {
    ctx.beginPath();
    ctx.moveTo(rect.x + 50, y);
    ctx.lineTo(rect.x + rect.w - 50, y);
    ctx.stroke();
  }
  ctx.fillStyle = "#a66a34";
  for (let x = rect.x + 60; x < rect.x + rect.w - 40; x += 86) {
    ctx.fillRect(x, rect.y + 430, 18, 150);
  }

  ctx.fillStyle = "rgba(255,255,255,0.12)";
  for (let x = rect.x + 120; x < rect.x + rect.w; x += 210) {
    for (let y = rect.y + 610; y < rect.y + rect.h; y += 130) {
      ctx.beginPath();
      ctx.ellipse(x, y, 58, 16, -0.25, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

export default function RevealCanvas({
  theme,
  images,
  attributions = {},
  animate = false,
  downloadName,
}: {
  theme: Theme;
  images: Record<string, string>;
  attributions?: Record<string, string>;
  animate?: boolean;
  downloadName?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let cancelled = false;

    (async () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (const part of theme.parts) {
        if (part.prefill === "square") {
          // Pre-rendered default square (nobody draws this part).
          ctx.strokeStyle = "#111827";
          ctx.lineWidth = 8;
          ctx.strokeRect(part.rect.x, part.rect.y, part.rect.w, part.rect.h);
          if (animate) await sleep(550);
          continue;
        }
        if (part.prefill === "zoo-background") {
          drawZooBackground(ctx, part.rect);
          if (animate) await sleep(550);
          continue;
        }
        if (part.prefill === "aquarium-background") {
          drawAquariumBackground(ctx, part.rect);
          if (animate) await sleep(550);
          continue;
        }
        if (part.prefill === "farm-background") {
          drawFarmBackground(ctx, part.rect);
          if (animate) await sleep(550);
          continue;
        }
        const url = images[part.id];
        if (!url) continue;
        try {
          const img = await loadImage(url);
          if (cancelled) return;
          ctx.drawImage(img, part.rect.x, part.rect.y, part.rect.w, part.rect.h);
          drawAttribution(ctx, attributions[part.id], part.rect);
          if (animate) await sleep(550);
        } catch {
          // skip broken image
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [theme, images, attributions, animate]);

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${downloadName ?? theme.id}.png`;
    a.click();
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={theme.canvas.w}
        height={theme.canvas.h}
        className="w-full rounded-xl bg-white shadow-lg"
        style={{ aspectRatio: `${theme.canvas.w} / ${theme.canvas.h}` }}
      />
      <div className="flex justify-end">
        <button className="btn-secondary text-sm" onClick={download}>
          ⬇️ Download PNG
        </button>
      </div>
    </div>
  );
}
