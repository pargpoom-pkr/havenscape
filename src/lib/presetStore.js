import { LAYER_ORDER, ARP_DIVISIONS } from "./padConfig";

/* Five independent preset containers: each holds its own key + full 9-layer mix. */
const STORE_KEY = "havenscape.presets.v1";

export const PRESET_KEYS = ["C", "D", "E", "F", "G"];
export const PRESET_COUNT = 5;

/* A copy of the current mixer, so a later fader move can never touch a saved slot. */
export const snapshotLayers = (layers) =>
  Object.fromEntries(
    LAYER_ORDER.map((id) => {
      const l = layers[id];
      return [
        id,
        {
          volume: l.volume,
          enabled: l.enabled,
          muted: l.muted,
          soloed: l.soloed,
        },
      ];
    }),
  );

export const blankPresets = () =>
  PRESET_KEYS.map((key) => ({ key, layers: null, bpm: null, arpDiv: null }));

const cleanPreset = (preset, index) => {
  const fallbackKey = PRESET_KEYS[index] || "C";
  if (!preset || typeof preset !== "object")
    return { key: fallbackKey, layers: null, bpm: null, arpDiv: null };
  const key = typeof preset.key === "string" ? preset.key : fallbackKey;
  const rawBpm = Number(preset.bpm);
  const bpm = rawBpm >= 30 && rawBpm <= 220 ? Math.round(rawBpm) : null;
  const arpDiv = ARP_DIVISIONS.includes(preset.arpDiv) ? preset.arpDiv : null;
  const src = preset.layers;
  if (!src || typeof src !== "object") return { key, layers: null, bpm, arpDiv };
  const layers = snapshotLayers({
    ...Object.fromEntries(
      LAYER_ORDER.map((id) => [id, { volume: 0, enabled: true, muted: false, soloed: false }]),
    ),
    ...Object.fromEntries(
      LAYER_ORDER.filter((id) => src[id]).map((id) => [
        id,
        {
          volume: Number(src[id].volume) || 0,
          enabled: src[id].enabled !== false,
          muted: !!src[id].muted,
          soloed: !!src[id].soloed,
        },
      ]),
    ),
  });
  return { key, layers, bpm, arpDiv };
};

export function loadPresets() {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return blankPresets();
    const data = JSON.parse(raw);
    const list = Array.isArray(data) ? data : data.presets;
    if (!Array.isArray(list) || !list.length) return blankPresets();
    return PRESET_KEYS.map((_, i) => cleanPreset(list[i], i));
  } catch (e) {
    return blankPresets();
  }
}

export function savePresets(presets) {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(presets));
  } catch (e) {
    /* storage unavailable — keep working in memory */
  }
}