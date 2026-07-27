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

export default function RevealCanvas({
  theme,
  images,
  animate = false,
  downloadName,
}: {
  theme: Theme;
  images: Record<string, string>;
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
        const url = images[part.id];
        if (!url) continue;
        try {
          const img = await loadImage(url);
          if (cancelled) return;
          ctx.drawImage(img, part.rect.x, part.rect.y, part.rect.w, part.rect.h);
          if (animate) await sleep(550);
        } catch {
          // skip broken image
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [theme, images, animate]);

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
