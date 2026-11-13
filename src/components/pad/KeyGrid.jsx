import React from "react";
import MidiLearnButton from "@/components/pad/MidiLearnButton";

export const KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export default function KeyGrid({ current, onSelect, midi, fades = {} }) {
  return (
    <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-6 lg:grid-cols-12">
      {KEYS.map((k) => {
        const active = k === current;
        const fade = fades[k];
        return (
          <div key={k} className="relative">
            <button
              onClick={() => onSelect(k)}
              className={`flex h-[68px] w-full items-center justify-center rounded-2xl font-heading text-lg font-bold tracking-tight transition-all duration-300 ${
                active
                  ? "bg-emerald-400 text-[#07110d] shadow-[0_0_36px_-4px_rgba(52,211,153,0.95)]"
                  : "bg-white/[0.05] text-neutral-300 ring-1 ring-inset ring-white/10 hover:bg-white/[0.1] hover:text-white"
              }`}
            >
              {k}
            </button>

            {fade && (
              <span
                key={fade.token}
                className="pointer-events-none absolute inset-x-1 bottom-1 h-1 overflow-hidden rounded-full bg-black/40"
              >
                <span
                  className="block h-full w-full origin-left rounded-full"
                  style={{
                    background: fade.kind === "in" ? "#34d399" : "#fbbf24",
                    boxShadow:
                      fade.kind === "in"
                        ? "0 0 12px rgba(52,211,153,0.9)"
                        : "0 0 12px rgba(251,191,36,0.9)",
                    animation: `padKeyFade ${fade.seconds}s linear forwards`,
                  }}
                />
              </span>
            )}

            {midi && (
              <MidiLearnButton
                midi={midi}
                target={`key:${k}`}
                className="absolute right-1 top-1 z-10"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}