import React from "react";
import { Trash2 } from "lucide-react";
import { TARGET_GROUPS } from "@/lib/midiTargets";
import MidiLearnButton from "@/components/pad/MidiLearnButton";

export default function MidiPanel({ midi }) {
  return (
    <div>
      <p className="mb-5 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-[11px] leading-relaxed text-neutral-400">
        Click a <span className="font-semibold text-neutral-200">Learn</span> chip, then move a pad,
        key, knob or fader on your controller. Buttons respond to notes and CC; faders take the CC
        value directly. Everything is saved in this browser.
      </p>

      <div className="grid gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
        {TARGET_GROUPS.map((group) => (
          <div key={group.label}>
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
              {group.label}
            </h3>
            <ul className="space-y-1">
              {group.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2">
                  <span className="truncate text-[11px] text-neutral-400">{item.label}</span>
                  <MidiLearnButton midi={midi} target={item.id} showText />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-4">
        <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-600">
          {midi.mappedCount} of {TARGET_GROUPS.reduce((n, g) => n + g.items.length, 0)} controls mapped
        </p>
        <button
          type="button"
          onClick={midi.clearAll}
          disabled={midi.mappedCount === 0}
          className="flex items-center gap-2 rounded-lg bg-white/[0.05] px-4 py-2 text-[11px] font-semibold text-neutral-300 ring-1 ring-inset ring-white/10 transition hover:bg-white/10 disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" /> Clear All Mappings
        </button>
      </div>
    </div>
  );
}