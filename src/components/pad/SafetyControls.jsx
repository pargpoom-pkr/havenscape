import React from "react";
import { RotateCcw, Siren } from "lucide-react";

export default function SafetyControls({ onPanic, onReset, note }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={onPanic}
        title="Stop everything instantly — silence all oscillators"
        className="flex h-11 items-center gap-2 rounded-xl bg-red-600 px-4 font-heading text-xs font-bold uppercase tracking-[0.18em] text-white shadow-[0_0_30px_-4px_rgba(239,68,68,0.95)] ring-1 ring-inset ring-red-300/50 transition hover:bg-red-500 active:scale-[0.98]"
      >
        <Siren className="h-4 w-4" />
        Panic
      </button>
      <button
        onClick={onReset}
        title="Rebuild the audio engine without losing your mix"
        className="flex h-11 items-center gap-2 rounded-xl bg-white/[0.05] px-4 text-xs font-semibold text-neutral-200 ring-1 ring-inset ring-white/15 transition hover:bg-white/[0.1]"
      >
        <RotateCcw className="h-4 w-4" />
        Reset Audio Engine
      </button>
      {note && (
        <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-emerald-300">
          {note}
        </span>
      )}
    </div>
  );
}