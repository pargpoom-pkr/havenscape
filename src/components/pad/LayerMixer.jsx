import React, { useEffect, useRef, useState } from "react";
import { LAYER_ORDER, isAudible } from "@/lib/padConfig";
import MidiLearnButton from "@/components/pad/MidiLearnButton";
import useLayerLevels from "@/hooks/useLayerLevels";

/* Fader travels smoothly to a recalled preset value, then follows the hand again. */
function Fader({ value, onChange, color, enabled, recallToken = 0, recallSeconds = 0 }) {
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);
  const valueRef = useRef(value);
  const glideRef = useRef(null);

  valueRef.current = value;
  shownRef.current = shown;

  useEffect(() => {
    if (!recallToken || !recallSeconds) return;
    const from = shownRef.current;
    const to = valueRef.current;
    if (Math.abs(to - from) < 0.005) return;
    const start = performance.now();
    const ms = recallSeconds * 1000;
    const step = (now) => {
      const t = Math.min(1, (now - start) / ms);
      setShown(from + (to - from) * t);
      glideRef.current = t < 1 ? requestAnimationFrame(step) : null;
    };
    glideRef.current = requestAnimationFrame(step);
    return () => {
      if (glideRef.current) cancelAnimationFrame(glideRef.current);
      glideRef.current = null;
    };
  }, [recallToken, recallSeconds]);

  useEffect(() => {
    if (glideRef.current) return;
    setShown(value);
  }, [value]);

  /* taking the fader by hand cancels any running recall glide */
  const takeOver = () => {
    if (glideRef.current) cancelAnimationFrame(glideRef.current);
    glideRef.current = null;
  };

  return (
    <div className="relative h-56 w-14">
      {/* rail */}
      <div className="absolute left-1/2 top-0 h-full w-2.5 -translate-x-1/2 overflow-hidden rounded-full bg-black/90 ring-1 ring-inset ring-white/10">
        <div
          className="absolute bottom-0 w-full rounded-full transition-[height] duration-100"
          style={{
            height: `${Math.max(shown, 0.015) * 100}%`,
            background: color,
            boxShadow: `0 0 14px ${color}`,
            opacity: enabled ? 0.95 : 0.15,
          }}
        />
      </div>
      {/* ticks */}
      <div className="pointer-events-none absolute inset-y-2 left-1/2 flex -translate-x-1/2 flex-col justify-between">
        {Array.from({ length: 9 }).map((_, i) => (
          <span key={i} className="h-px w-7 bg-white/[0.07]" />
        ))}
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={shown}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerDown={takeOver}
        onKeyDown={takeOver}
        aria-label="Fader"
        className="absolute left-1/2 top-1/2 h-12 w-56 -translate-x-1/2 -translate-y-1/2 -rotate-90 cursor-pointer appearance-none bg-transparent
          [&::-webkit-slider-runnable-track]:h-12 [&::-webkit-slider-runnable-track]:bg-transparent
          [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-11 [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:rounded-[3px] [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-white/25
          [&::-webkit-slider-thumb]:bg-gradient-to-b [&::-webkit-slider-thumb]:from-[#f2f4f6] [&::-webkit-slider-thumb]:to-[#9aa2ab]
          [&::-webkit-slider-thumb]:shadow-[0_3px_10px_rgba(0,0,0,0.85)]
          [&::-moz-range-track]:h-12 [&::-moz-range-track]:bg-transparent
          [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-11 [&::-moz-range-thumb]:rounded-[3px]
          [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-white/25 [&::-moz-range-thumb]:bg-[#d7dce1]"
      />
    </div>
  );
}

function SoloMute({ muted, soloed, onMute, onSolo, label }) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onMute}
        aria-pressed={muted}
        aria-label={`Mute ${label}`}
        title={`Mute ${label}`}
        className={`flex h-7 w-7 items-center justify-center rounded-md font-heading text-[11px] font-bold ring-1 ring-inset transition ${
          muted
            ? "bg-red-500 text-white ring-red-300/60 shadow-[0_0_14px_rgba(239,68,68,0.9)]"
            : "bg-black/50 text-neutral-500 ring-white/10 hover:text-neutral-200"
        }`}
      >
        M
      </button>
      <button
        onClick={onSolo}
        aria-pressed={soloed}
        aria-label={`Solo ${label}`}
        title={`Solo ${label}`}
        className={`flex h-7 w-7 items-center justify-center rounded-md font-heading text-[11px] font-bold ring-1 ring-inset transition ${
          soloed
            ? "bg-amber-400 text-[#1c1403] ring-amber-200/70 shadow-[0_0_14px_rgba(251,191,36,0.9)]"
            : "bg-black/50 text-neutral-500 ring-white/10 hover:text-neutral-200"
        }`}
      >
        S
      </button>
    </div>
  );
}

export default function LayerMixer({
  layers,
  onVolume,
  onToggle,
  onMute,
  onSolo,
  midi,
  engineRef,
  recall,
}) {
  const registerPulse = useLayerLevels(engineRef, LAYER_ORDER);

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#12161c] to-[#080a0d] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] md:p-5">
      <div className="grid grid-cols-3 gap-x-2 gap-y-6 sm:grid-cols-5 lg:grid-cols-9">
        {LAYER_ORDER.map((id) => {
          const layer = layers[id];
          const audible = isAudible(layers, id);
          return (
            <div key={id} className="flex flex-col items-center gap-2">
              <button
                onClick={() => onToggle(id)}
                aria-label={`Toggle ${layer.label}`}
                className={`flex h-8 w-12 items-center justify-center rounded-md text-[9px] font-bold uppercase tracking-[0.14em] ring-1 ring-inset transition ${
                  layer.enabled
                    ? "bg-white/10 ring-white/25"
                    : "bg-black/60 ring-white/10"
                }`}
                style={layer.enabled ? { color: layer.color, boxShadow: `0 0 16px -4px ${layer.color}` } : { color: "#4b5563" }}
              >
                {layer.enabled ? "ON" : "OFF"}
              </button>

              {midi && <MidiLearnButton midi={midi} target={`layer:${id}`} />}

              <span
                ref={registerPulse(id)}
                aria-hidden="true"
                title={`${layer.label} live level`}
                className="h-1.5 w-1.5 rounded-full transition-none"
                style={{
                  background: layer.color,
                  color: layer.color,
                  opacity: 0.16,
                  willChange: "transform, opacity",
                }}
              />

              <Fader
                value={layer.volume}
                onChange={(v) => onVolume(id, v)}
                color={layer.color}
                enabled={audible}
                recallToken={recall ? recall.token : 0}
                recallSeconds={recall ? recall.seconds : 0}
              />

              <SoloMute
                muted={layer.muted}
                soloed={layer.soloed}
                onMute={() => onMute(id)}
                onSolo={() => onSolo(id)}
                label={layer.label}
              />

              <div className="text-center">
                <p
                  className="min-h-[26px] text-[10px] font-semibold uppercase leading-tight tracking-[0.06em]"
                  style={{ color: audible ? "#dfe3e8" : "#4b5563" }}
                  title={layer.label}
                >
                  {layer.label}
                </p>
                <p className="mt-0.5 font-mono text-[9px] text-neutral-600">
                  {Math.round(layer.volume * 100)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}