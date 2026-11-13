import { useCallback, useEffect, useRef, useState } from "react";
import { loadMappings, saveMappings } from "@/lib/midiMapping";
import { TARGET_KIND } from "@/lib/midiTargets";

/**
 * Web MIDI mapping engine.
 * handlers.onTrigger(targetId)          — for buttons / keys / setlist slots
 * handlers.onValue(targetId, value01)   — for faders and sliders (0..1)
 */
export default function useMidi({ onTrigger, onValue }) {
  const supported = typeof navigator !== "undefined" && !!navigator.requestMIDIAccess;

  const [permission, setPermission] = useState("idle"); // idle | requesting | granted | denied
  const [devices, setDevices] = useState([]);
  const [mappings, setMappings] = useState(loadMappings);
  const [learnTarget, setLearnTarget] = useState(null);
  const [activity, setActivity] = useState(0);

  const actions = useRef({ onTrigger, onValue });
  actions.current = { onTrigger, onValue };

  const mappingsRef = useRef(mappings);
  mappingsRef.current = mappings;

  const learnRef = useRef(learnTarget);
  learnRef.current = learnTarget;

  const lastValue = useRef({});
  const lastPing = useRef(0);
  const accessRef = useRef(null);

  useEffect(() => {
    saveMappings(mappings);
  }, [mappings]);

  const handleMessage = useCallback((event) => {
    const data = event.data;
    if (!data || data.length < 2) return;

    const status = data[0];
    const type = status & 0xf0;
    const channel = status & 0x0f;
    const number = data[1];
    const raw = data.length > 2 ? data[2] : 0;

    let message = null;
    if (type === 0x90 && raw > 0) message = { type: "note", number, value: raw, channel };
    else if (type === 0xb0) message = { type: "cc", number, value: raw, channel };
    if (!message) return;

    /* activity light — throttled so a CC stream cannot flood React */
    const now = performance.now();
    if (now - lastPing.current > 120) {
      lastPing.current = now;
      setActivity(now);
    }

    const learning = learnRef.current;
    if (learning) {
      setMappings((prev) => ({
        ...prev,
        [learning]: { type: message.type, number: message.number, channel: message.channel },
      }));
      setLearnTarget(null);
      return;
    }

    Object.entries(mappingsRef.current).forEach(([target, mapping]) => {
      if (!mapping || mapping.type !== message.type || mapping.number !== message.number) return;

      if (TARGET_KIND[target] === "continuous") {
        actions.current.onValue?.(target, Math.min(1, Math.max(0, message.value / 127)));
      } else if (message.type === "cc") {
        const previous = lastValue.current[target] ?? 0;
        lastValue.current[target] = message.value;
        if (message.value >= 64 && previous < 64) actions.current.onTrigger?.(target);
      } else {
        actions.current.onTrigger?.(target);
      }
    });
  }, []);

  const bindInputs = useCallback(
    (access) => {
      const names = [];
      access.inputs.forEach((input) => {
        if (input.state && input.state !== "connected") return;
        input.onmidimessage = handleMessage;
        names.push(input.name || "MIDI Device");
      });
      setDevices(names);
    },
    [handleMessage],
  );

  const enable = useCallback(async () => {
    if (!navigator.requestMIDIAccess) return false;
    setPermission("requesting");
    try {
      const access = accessRef.current || (await navigator.requestMIDIAccess({ sysex: false }));
      accessRef.current = access;
      access.onstatechange = () => bindInputs(access);
      bindInputs(access);
      setPermission("granted");
      return true;
    } catch (e) {
      setPermission("denied");
      return false;
    }
  }, [bindInputs]);

  useEffect(() => {
    if (supported) enable();
    return () => {
      if (accessRef.current) accessRef.current.onstatechange = null;
    };
  }, []);

  useEffect(() => {
    if (!learnTarget) return;
    const cancel = (e) => {
      if (e.key === "Escape") setLearnTarget(null);
    };
    window.addEventListener("keydown", cancel);
    return () => window.removeEventListener("keydown", cancel);
  }, [learnTarget]);

  const learn = useCallback((target) => {
    setLearnTarget((prev) => (prev === target ? null : target));
  }, []);

  const clear = useCallback((target) => {
    setMappings((prev) => {
      const next = { ...prev };
      delete next[target];
      return next;
    });
  }, []);

  const clearAll = useCallback(() => setMappings({}), []);

  return {
    supported,
    permission,
    devices,
    connected: devices.length > 0,
    activity,
    mappings,
    learnTarget,
    mappedCount: Object.keys(mappings).length,
    learn,
    clear,
    clearAll,
    enable,
  };
}