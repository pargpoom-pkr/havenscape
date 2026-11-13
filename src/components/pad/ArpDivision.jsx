import React from "react";
import { ARP_DIVISIONS } from "@/lib/padConfig";

export default function ArpDivision({ value, onChange }) {
  return (
    <div className="flex gap-1.5">
      {ARP_DIVISIONS.map((d) => {
        const active = d === value;
        return (
          <button
            key={d}
            onClick={() => onChange(d)}
            aria-pressed={active}
            className={`h-8 flex-1 rounded-lg font-mono text-[11px] font-bold tracking-wide transition-colors duration-150 ${
              active
                ? "bg-cyan-400 text-[#041416] shadow-[0_0_18px_-6px_rgba(34,211,238,0.95)]"
                : "bg-white/[0.05] text-neutral-400 ring-1 ring-inset ring-white/10 hover:bg-white/[0.1] hover:text-neutral-100"
            }`}
          >
            {d}
          </button>
        );
      })}
    </div>
  );
}