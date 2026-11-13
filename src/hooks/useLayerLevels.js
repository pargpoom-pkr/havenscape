import { useEffect, useRef } from "react";

/* Writes per-layer audio levels straight to the DOM (one rAF loop for all dots),
   so the pulse never re-renders React while audio is running. */
export default function useLayerLevels(engineRef, ids) {
  const refs = useRef({});

  const register = (id) => (el) => {
    refs.current[id] = el;
  };

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const levels = engineRef.current?.levels?.() || null;
      ids.forEach((id) => {
        const el = refs.current[id];
        if (!el) return;
        const level = levels ? Math.min(1, levels[id] || 0) : 0;
        el.style.opacity = String(0.16 + level * 0.9);
        el.style.transform = `scale(${0.85 + level * 0.6})`;
        el.style.boxShadow = `0 0 ${5 + level * 16}px currentColor`;
      });
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [engineRef, ids]);

  return register;
}