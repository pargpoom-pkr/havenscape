import React from "react";
import { Play, Pause } from "lucide-react";
import AmbientCanvas from "@/components/pad/AmbientCanvas";
import MidiLearnButton from "@/components/pad/MidiLearnButton";

export default function NowPlaying({ isPlaying, currentKey, onToggle, bpm, midi }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-6 md:p-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,330px)_1fr] lg:items-center">
        <div className="flex items-center gap-5">
          <button
            onClick={onToggle}
            aria-label={isPlaying ? "Pause" : "Play"}
            className={`relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full transition-all duration-500 ${
              isPlaying
                ? "bg-emerald-400 text-[#07110d] shadow-[0_0_70px_-6px_rgba(52,211,153,0.95)]"
                : "bg-white/[0.06] text-neutral-200 ring-1 ring-inset ring-white/15 hover:bg-white/[0.1]"
            }`}
          >
            {isPlaying ? <Pause className="h-11 w-11" /> : <Play className="ml-1 h-11 w-11" />}
            {isPlaying && (
              <span className="pointer-events-none absolute -inset-2 animate-pulse rounded-full border border-emerald-400/40" />
            )}
          </button>
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">
              {isPlaying ? "Now Playing" : "Ready"}
            </p>
            <p className="mt-1 font-heading text-3xl font-semibold tracking-tight">
              {currentKey} <span className="text-neutral-500">major</span>
            </p>
            <p className="mt-1.5 text-xs text-neutral-500">
              {isPlaying ? "Seamless loop · 2s fade" : "Tap play to fade in over 2 seconds"}
            </p>
            {midi && (
              <MidiLearnButton midi={midi} target="play" showText className="mt-3" />
            )}
          </div>
        </div>

        <div className="relative h-40 w-full overflow-hidden rounded-2xl bg-[#05070a] ring-1 ring-inset ring-white/[0.06] md:h-48">
          <AmbientCanvas active={isPlaying} bpm={bpm} />
          <div className="pointer-events-none absolute bottom-3 left-4 text-[10px] uppercase tracking-[0.24em] text-white/25">
            Spectrum
          </div>
          <div className="pointer-events-none absolute right-4 top-3 font-mono text-[10px] text-white/25">
            {bpm ? `${bpm} BPM` : "—  BPM"}
          </div>
        </div>
      </div>
    </section>
  );
}