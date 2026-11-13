import React from "react";
import { Radio, X } from "lucide-react";
import { mappingLabel, mappingTitle } from "@/lib/midiMapping";

export default function MidiLearnButton({ midi, target, showText = false, className = "" }) {
  const mapping = midi.mappings[target];
  const learning = midi.learnTarget === target;

  const tone = learning
    ? "bg-amber-400/20 text-amber-300 ring-amber-400/60 animate-pulse"
    : mapping
      ? "bg-emerald-400/15 text-emerald-300 ring-emerald-400/40"
      : "bg-black/50 text-neutral-500 ring-white/15 hover:text-neutral-200 hover:ring-white/35";

  return (
    <span
      className={`inline-flex items-center overflow-hidden rounded-md ring-1 ring-inset ${tone} ${className}`}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          midi.learn(target);
        }}
        title={
          learning
            ? "Move a pad, key, knob or fader to assign"
            : mapping
              ? `${mappingTitle(mapping)} — click to re-learn`
              : "MIDI Learn — click, then move a control"
        }
        className="flex items-center gap-1 whitespace-nowrap px-1.5 py-1 font-mono text-[8px] font-bold uppercase tracking-[0.1em]"
      >
        {learning ? (
          "Move…"
        ) : mapping ? (
          mappingLabel(mapping)
        ) : showText ? (
          <>
            <Radio className="h-3 w-3" /> Learn
          </>
        ) : (
          <Radio className="h-2.5 w-2.5" />
        )}
      </button>
      {mapping && !learning && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            midi.clear(target);
          }}
          aria-label="Clear MIDI mapping"
          title="Clear this mapping"
          className="border-l border-white/10 px-1 py-1 text-current opacity-60 transition hover:opacity-100"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  );
}