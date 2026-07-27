"use client";

import type { Theme } from "@/lib/themes";

export default function PartMiniMap({
  theme,
  highlightPartId,
}: {
  theme: Theme;
  highlightPartId: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${theme.canvas.w} ${theme.canvas.h}`}
      className="w-36 rounded-lg border border-white/15 bg-white/90"
    >
      {theme.parts.map((p) => (
        <rect
          key={p.id}
          x={p.rect.x}
          y={p.rect.y}
          width={p.rect.w}
          height={p.rect.h}
          fill={p.id === highlightPartId ? "rgba(139,92,246,0.55)" : "none"}
          stroke={p.id === highlightPartId ? "#7c3aed" : "rgba(0,0,0,0.25)"}
          strokeWidth={p.id === highlightPartId ? 8 : 4}
        />
      ))}
    </svg>
  );
}
