import React, { useEffect, useRef, useState } from "react";
import { Cable, Usb, Unplug } from "lucide-react";
import MidiActivity from "@/components/pad/MidiActivity";

export default function MidiStatus({ midi }) {
  const { connected, devices, supported, permission, learnTarget, mappedCount, activity } = midi;
  const deviceName = devices[0] + (devices.length > 1 ? ` +${devices.length - 1} more` : "");

  /* surface an unplug the moment the device drops off the bus */
  const wasConnected = useRef(connected);
  const [dropped, setDropped] = useState(false);

  useEffect(() => {
    if (wasConnected.current && !connected) {
      setDropped(true);
      const t = window.setTimeout(() => setDropped(false), 8000);
      wasConnected.current = connected;
      return () => window.clearTimeout(t);
    }
    wasConnected.current = connected;
    return undefined;
  }, [connected]);

  const label = dropped
    ? "MIDI Device Disconnected — Check Cable"
    : connected
      ? `Connected: ${deviceName}`
      : !supported
        ? "MIDI Not Supported"
        : permission === "requesting"
          ? "Looking for Devices…"
          : permission === "denied"
            ? "MIDI Access Blocked"
            : "No Device Detected";

  const tone = dropped
    ? "border-red-400/50 bg-red-500/10 text-red-300 shadow-[0_0_26px_-8px_rgba(248,113,113,0.9)]"
    : connected
      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300 shadow-[0_0_26px_-8px_rgba(52,211,153,0.9)]"
      : "border-amber-400/30 bg-amber-400/[0.07] text-amber-300";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        className={`flex items-center gap-2.5 rounded-full border px-4 py-2 text-[11px] font-medium tracking-wide transition ${tone}`}
      >
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${
            dropped
              ? "bg-red-400 shadow-[0_0_10px_2px_rgba(248,113,113,0.9)]"
              : connected
                ? "animate-pulse bg-emerald-400 shadow-[0_0_10px_2px_rgba(52,211,153,0.85)]"
                : "bg-amber-400 shadow-[0_0_8px_1px_rgba(251,191,36,0.7)]"
          }`}
        />
        <span className="max-w-[240px] truncate">{dropped ? <span className="inline-flex items-center gap-1.5"><Unplug className="h-3 w-3" />{label}</span> : label}</span>
        <MidiActivity activity={activity} />
        {!connected && supported && permission !== "requesting" && (
          <button
            type="button"
            onClick={midi.enable}
            className="ml-1 flex items-center gap-1 rounded-full border border-amber-400/40 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] opacity-80 transition hover:opacity-100"
          >
            <Usb className="h-3 w-3" /> Enable
          </button>
        )}
      </div>

      {learnTarget ? (
        <span className="flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/15 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-300">
          <Cable className="h-3.5 w-3.5 animate-pulse" />
          Listening — move a control
        </span>
      ) : (
        mappedCount > 0 && (
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-neutral-500">
            {mappedCount} mapped
          </span>
        )
      )}
    </div>
  );
}