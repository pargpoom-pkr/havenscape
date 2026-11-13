export const DEFAULT_LAYERS = {
  warm: { label: "Warm Pads", volume: 0.8, enabled: true, muted: false, soloed: false, color: "#34d399" },
  analog: { label: "Analog Synth Pad", volume: 0.5, enabled: true, muted: false, soloed: false, color: "#f472b6" },
  ambient: { label: "Bright Ambient", volume: 0.45, enabled: true, muted: false, soloed: false, color: "#60a5fa" },
  strings: { label: "Cinematic Strings", volume: 0.45, enabled: false, muted: false, soloed: false, color: "#fbbf24" },
  shimmer: { label: "Ethereal Shimmer", volume: 0.35, enabled: true, muted: false, soloed: false, color: "#c084fc" },
  arp: { label: "Modern Overdrive Arp", volume: 0.3, enabled: true, muted: false, soloed: false, color: "#22d3ee" },
  organ: { label: "Organ Pads", volume: 0.4, enabled: true, muted: false, soloed: false, color: "#a78bfa" },
  guitar: { label: "Electric Guitar Overdrive", volume: 0.35, enabled: false, muted: false, soloed: false, color: "#fb7185" },
  air: { label: "Air Pads", volume: 0.3, enabled: false, muted: false, soloed: false, color: "#818cf8" },
};

export const LAYER_ORDER = [
  "warm",
  "analog",
  "ambient",
  "strings",
  "shimmer",
  "arp",
  "organ",
  "guitar",
  "air",
];

export const ARP_DIVISIONS = ["1/4", "1/8", "1/16"];

export const DIVISION_FACTOR = { "1/4": 1, "1/8": 0.5, "1/16": 0.25 };

/* A layer is heard only when enabled, not muted, and (if anything is soloed) soloed. */
export const isAudible = (layers, id) => {
  const layer = layers[id];
  if (!layer) return false;
  const anySolo = Object.values(layers).some((l) => l.soloed);
  return layer.enabled && !layer.muted && (!anySolo || layer.soloed);
};