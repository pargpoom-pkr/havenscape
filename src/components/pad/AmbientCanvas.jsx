import React from "react";

/* Pure CSS level meter — no canvas, no rAF, no work on the audio thread. */
const BARS = 28;

const HEIGHTS = [22, 46, 68, 38, 58, 80, 34, 52, 74, 44, 62, 30, 56, 78, 40, 66, 28, 50, 72, 36, 60, 84, 32, 54, 70, 42, 64, 26];

export default function AmbientCanvas({ active, bpm }) {
  const beat = bpm ? Math.min(3.2, Math.max(1.2, 7200 / bpm)) : 1.9;

  return (
    <div className="flex h-full w-full items-end gap-[3px] px-4 pb-4 pt-8">
      {HEIGHTS.map((h, i) => (
        <span
          key={i}
          className="flex-1 rounded-t-[2px] bg-gradient-to-t from-emerald-400/10 via-emerald-400/60 to-emerald-200/90"
          style={{
            height: active ? `${Math.min(96, h + 8)}%` : "4%",
            transformOrigin: "bottom",
            opacity: active ? 0.9 : 0.22,
            animation: active
              ? `padBars ${(beat * (0.7 + (i % 5) * 0.22)).toFixed(2)}s ease-in-out ${(i % 7) * 0.09}s infinite`
              : "none",
            transition: "height 500ms ease, opacity 500ms ease",
          }}
        />
      ))}
    </div>
  );
}