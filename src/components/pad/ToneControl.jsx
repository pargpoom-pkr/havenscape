import React from "react";

export default function ToneControl({ value, onChange }) {
  return (
    <div>
      <div className="mb-3 flex items-end justify-between">
        <span className="text-[11px] uppercase tracking-[0.2em] text-sky-300/70">Bass</span>
        <span className="font-mono text-xs text-neutral-400">
          {value === 50 ? "Neutral" : value < 50 ? `+${50 - value} low` : `+${value - 50} high`}
        </span>
        <span className="text-[11px] uppercase tracking-[0.2em] text-emerald-300/70">Air</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#080a0d] [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_14px_rgba(255,255,255,0.7)]"
        style={{
          background: "linear-gradient(90deg, #38bdf8 0%, #1e293b 50%, #34d399 100%)",
        }}
      />
    </div>
  );
}