import { KEYS } from "@/components/pad/KeyGrid";
import { DEFAULT_LAYERS, LAYER_ORDER } from "@/lib/padConfig";

const triggers = (items) => items.map((item) => ({ ...item, kind: "trigger" }));
const continuous = (items) => items.map((item) => ({ ...item, kind: "continuous" }));

export const TARGET_GROUPS = [
  {
    label: "Transport",
    items: triggers([
      { id: "play", label: "Play / Pause" },
      { id: "tap", label: "Tap Tempo" },
    ]),
  },
  {
    label: "Setlist Shortcuts",
    items: triggers(
      [1, 2, 3, 4, 5].map((n) => ({ id: `slot:${n - 1}`, label: `Shortcut ${n}` })),
    ),
  },
  {
    label: "Musical Keys",
    items: triggers(KEYS.map((k) => ({ id: `key:${k}`, label: `Key ${k}` }))),
  },
  {
    label: "Texture Faders",
    items: continuous(
      LAYER_ORDER.map((id) => ({ id: `layer:${id}`, label: DEFAULT_LAYERS[id].label })),
    ),
  },
  {
    label: "Mix",
    items: continuous([
      { id: "tone", label: "Tone" },
      { id: "master", label: "Master Volume" },
    ]),
  },
];

export const TARGET_KIND = TARGET_GROUPS.reduce((acc, group) => {
  group.items.forEach((item) => {
    acc[item.id] = item.kind;
  });
  return acc;
}, {});