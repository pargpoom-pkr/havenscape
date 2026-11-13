import React, { useRef, useState } from "react";
import { Shuffle } from "lucide-react";

export default function RandomMixButton({ onRandomize }) {
  const [done, setDone] = useState(false);
  const timer = useRef(null);

  const click = () => {
    onRandomize();
    setDone(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setDone(false), 1400);
  };

  return (
    <button
      onClick={click}
      title="Randomize: 6 layers on, 3 muted, volumes capped at 70"
      className={`flex h-9 items-center gap-2 rounded-full px-3.5 text-[10px] font-bold uppercase tracking-[0.16em] ring-1 ring-inset transition ${
        done
          ? "bg-cyan-400 text-[#04141a] ring-cyan-200"
          : "bg-white/[0.04] text-neutral-300 ring-white/15 hover:bg-cyan-400/15 hover:text-cyan-200 hover:ring-cyan-400/40"
      }`}
    >
      <Shuffle className="h-3.5 w-3.5" />
      {done ? "Mixed" : "Random Mix"}
    </button>
  );
}