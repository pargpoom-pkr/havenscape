import React, { useEffect, useState } from "react";

/* Neon ping that lights up on every incoming MIDI note / CC. */
export default function MidiActivity({ activity }) {
  const [lit, setLit] = useState(false);

  useEffect(() => {
    if (!activity) return;
    setLit(true);
    const t = window.setTimeout(() => setLit(false), 150);
    return () => window.clearTimeout(t);
  }, [activity]);

  return (
    <span
      aria-hidden="true"
      className={`h-2.5 w-2.5 shrink-0 rounded-full border transition-colors duration-100 ${
        lit
          ? "border-emerald-200 bg-emerald-300 shadow-[0_0_14px_3px_rgba(52,211,153,0.95)]"
          : "border-white/20 bg-white/10"
      }`}
    />
  );
}