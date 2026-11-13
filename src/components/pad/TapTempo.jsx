import React, { useEffect, useState } from "react";

const MIN_BPM = 30;
const MAX_BPM = 220;

export default function TapTempo({ bpm, onTap, onBpm }) {
  const [draft, setDraft] = useState(bpm ? String(bpm) : "");

  useEffect(() => {
    setDraft(bpm ? String(bpm) : "");
  }, [bpm]);

  const commit = (raw) => {
    const n = Number(raw);
    if (!raw || !Number.isFinite(n)) {
      setDraft(bpm ? String(bpm) : "");
      return;
    }
    const clamped = Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(n)));
    setDraft(String(clamped));
    onBpm(clamped);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onTap}
        className="h-10 shrink-0 rounded-xl bg-emerald-400/10 px-4 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-300 ring-1 ring-inset ring-emerald-400/30 transition hover:bg-emerald-400/20 active:scale-[0.97]"
      >
        Tap
      </button>

      <div className="flex h-10 min-w-0 flex-1 items-center gap-1.5 rounded-xl bg-black/50 px-3 ring-1 ring-inset ring-white/10 focus-within:ring-emerald-400/50">
        <input
          type="number"
          inputMode="numeric"
          min={MIN_BPM}
          max={MAX_BPM}
          value={draft}
          onChange={(e) => {
            const raw = e.target.value;
            setDraft(raw);
            const n = Number(raw);
            if (raw !== "" && Number.isFinite(n) && n >= MIN_BPM && n <= MAX_BPM) {
              onBpm(Math.round(n));
            }
          }}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          placeholder="—"
          aria-label="Tempo in BPM"
          className="w-full min-w-0 appearance-none bg-transparent text-right font-heading text-xl font-semibold tabular-nums text-emerald-300 outline-none placeholder:text-neutral-600 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span className="shrink-0 text-[10px] uppercase tracking-[0.16em] text-neutral-500">
          bpm
        </span>
      </div>
    </div>
  );
}