const STORAGE_KEY = "nx-worship-pads-midi";

export function loadMappings() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  } catch (e) {
    return {};
  }
}

export function saveMappings(mappings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings));
  } catch (e) {
    /* storage unavailable — mappings stay in memory */
  }
}

export function mappingLabel(mapping) {
  if (!mapping) return "";
  return mapping.type === "cc" ? `CC ${mapping.number}` : `N ${mapping.number}`;
}

export function mappingTitle(mapping) {
  if (!mapping) return "Not mapped";
  const kind = mapping.type === "cc" ? "Control Change" : "Note";
  return `${kind} ${mapping.number} · Channel ${(mapping.channel ?? 0) + 1}`;
}