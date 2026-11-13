import React, { useEffect, useRef, useState } from "react";
import { Save, FolderOpen, ChevronRight, Check, Trash2, X, Download, Upload } from "lucide-react";
import { KEYS } from "@/components/pad/KeyGrid";
import MidiLearnButton from "@/components/pad/MidiLearnButton";

const STORAGE_KEY = "worship-pad-setlists";

const readAll = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch (e) {
    return [];
  }
};

export default function SetlistPanel({
  slots,
  activeSlot,
  currentKey,
  onTrigger,
  onAssignKey,
  onSaveSlot,
  onNext,
  onLoadKeys,
  midi,
  mixes = [],
}) {
  const [mode, setMode] = useState(null); // 'save' | 'load' | null
  const [name, setName] = useState("");
  const [saved, setSaved] = useState([]);
  const [flash, setFlash] = useState("");
  const [savedSlot, setSavedSlot] = useState(-1);
  const fileRef = useRef(null);
  const slotTimer = useRef(null);

  const saveSlot = (i) => {
    onSaveSlot(i);
    setSavedSlot(i);
    window.clearTimeout(slotTimer.current);
    slotTimer.current = window.setTimeout(() => setSavedSlot(-1), 1500);
  };

  const announce = (text, ms = 1800) => {
    setFlash(text);
    window.setTimeout(() => setFlash(""), ms);
  };

  const handleExport = () => {
    const payload = {
      app: "HavenScape",
      type: "setlist",
      version: 1,
      exported: new Date().toISOString(),
      keys: slots,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `nx-worship-setlist-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    announce("Exported");
  };

  const handleImportFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let keys = null;
      try {
        const data = JSON.parse(String(reader.result));
        keys = Array.isArray(data) ? data : data?.keys;
      } catch (e) {
        keys = null;
      }
      if (!Array.isArray(keys) || keys.length !== 5 || keys.some((k) => !KEYS.includes(k))) {
        announce("Invalid setlist file", 2600);
        return;
      }
      onLoadKeys(keys);
      announce("Imported");
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    setSaved(readAll());
  }, []);

  const persist = (list) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    setSaved(list);
  };

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const list = readAll();
    const existing = list.find((s) => s.name.toLowerCase() === trimmed.toLowerCase());
    let next;
    if (existing) {
      next = list.map((s) => (s.id === existing.id ? { ...s, keys: slots } : s));
    } else {
      next = [{ id: Date.now().toString(), name: trimmed, keys: slots }, ...list];
    }
    persist(next);
    setName("");
    setMode(null);
    setFlash("Saved");
    window.setTimeout(() => setFlash(""), 1600);
  };

  const handleLoad = (item) => {
    onLoadKeys(item.keys);
    setMode(null);
    setFlash(`Loaded "${item.name}"`);
    window.setTimeout(() => setFlash(""), 2000);
  };

  const handleDelete = (id) => {
    persist(readAll().filter((s) => s.id !== id));
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setMode(mode === "save" ? null : "save")}
            className={`flex h-11 items-center gap-2 rounded-xl px-4 text-xs font-semibold ring-1 ring-inset transition ${
              mode === "save"
                ? "bg-emerald-400/15 text-emerald-300 ring-emerald-400/40"
                : "bg-white/[0.05] text-neutral-300 ring-white/10 hover:bg-white/10"
            }`}
          >
            <Save className="h-4 w-4" /> Save Setlist
          </button>
          <button
            onClick={() => setMode(mode === "load" ? null : "load")}
            className={`flex h-11 items-center gap-2 rounded-xl px-4 text-xs font-semibold ring-1 ring-inset transition ${
              mode === "load"
                ? "bg-emerald-400/15 text-emerald-300 ring-emerald-400/40"
                : "bg-white/[0.05] text-neutral-300 ring-white/10 hover:bg-white/10"
            }`}
          >
            <FolderOpen className="h-4 w-4" /> Load Setlist
          </button>
          <button
            onClick={handleExport}
            className="flex h-11 items-center gap-2 rounded-xl bg-white/[0.05] px-4 text-xs font-semibold text-neutral-300 ring-1 ring-inset ring-white/10 transition hover:bg-white/10"
          >
            <Download className="h-4 w-4" /> Export Setlist
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex h-11 items-center gap-2 rounded-xl bg-white/[0.05] px-4 text-xs font-semibold text-neutral-300 ring-1 ring-inset ring-white/10 transition hover:bg-white/10"
          >
            <Upload className="h-4 w-4" /> Import Setlist
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>
        {flash && (
          <span className="flex items-center gap-1 text-[11px] text-emerald-400">
            <Check className="h-3 w-3" /> {flash}
          </span>
        )}
      </div>

      {mode === "save" && (
        <div className="mb-4 rounded-xl border border-white/10 bg-black/40 p-3">
          <label className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Setlist name</label>
          <div className="mt-2 flex gap-2">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") setMode(null);
              }}
              placeholder="Sunday Service Set A"
              className="min-w-0 flex-1 rounded-lg bg-white/[0.06] px-3 py-2.5 text-sm text-neutral-100 outline-none ring-1 ring-inset ring-white/10 placeholder:text-neutral-600 focus:ring-emerald-400/50"
            />
            <button
              onClick={handleSave}
              className="rounded-lg bg-emerald-400 px-5 text-xs font-semibold text-[#07110d] transition hover:bg-emerald-300"
            >
              Save
            </button>
            <button
              onClick={() => setMode(null)}
              className="rounded-lg px-2 text-neutral-500 transition hover:text-neutral-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {mode === "load" && (
        <div className="mb-4 rounded-xl border border-white/10 bg-black/40 p-2">
          {saved.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-neutral-500">
              No saved setlists yet. Name your current 5 keys to save one.
            </p>
          ) : (
            <ul className="max-h-52 space-y-1 overflow-y-auto">
              {saved.map((item) => (
                <li key={item.id} className="flex items-center gap-2">
                  <button
                    onClick={() => handleLoad(item)}
                    className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-white/[0.06]"
                  >
                    <span className="truncate text-xs font-medium text-neutral-200">{item.name}</span>
                    <span className="shrink-0 font-mono text-[10px] tracking-wider text-neutral-500">
                      {item.keys.join(" · ")}
                    </span>
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="rounded p-2 text-neutral-600 transition hover:text-red-400"
                    aria-label="Delete setlist"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid grid-cols-5 gap-2 md:gap-3">
        {slots.map((slotKey, i) => {
          const active = slotKey === currentKey;
          return (
            <div
              key={i}
              className={`rounded-2xl p-1.5 ring-1 ring-inset transition ${
                active ? "bg-emerald-400/[0.07] ring-emerald-400/30" : "bg-white/[0.02] ring-white/[0.07]"
              }`}
            >
              <button
                onClick={() => onTrigger(i)}
                className={`flex h-20 w-full flex-col items-center justify-center gap-1 rounded-xl transition-all duration-300 ${
                  active
                    ? "bg-emerald-400 text-[#07110d] shadow-[0_0_36px_-8px_rgba(52,211,153,1)]"
                    : "bg-white/[0.05] text-neutral-200 ring-1 ring-inset ring-white/10 hover:bg-white/[0.1]"
                }`}
              >
                <span className="font-heading text-2xl font-bold tracking-tight">{slotKey}</span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-[0.16em] ${
                    active ? "text-[#07110d]/60" : "text-neutral-500"
                  }`}
                >
                  Pos {i + 1}
                </span>
                {mixes[i] && (
                  <span
                    className={`text-[8px] font-bold uppercase tracking-[0.18em] ${
                      active ? "text-[#07110d]/50" : "text-emerald-400/70"
                    }`}
                  >
                    Mix
                  </span>
                )}
              </button>

              <select
                value={slotKey}
                onChange={(e) => onAssignKey(i, e.target.value)}
                aria-label={`Key for position ${i + 1}`}
                className="mt-1.5 w-full cursor-pointer rounded-lg border-0 bg-black/50 px-1 py-2 text-center text-[11px] font-semibold text-neutral-300 outline-none ring-1 ring-inset ring-white/10 transition hover:bg-black/70 focus:ring-emerald-400/50"
              >
                {KEYS.map((k) => (
                  <option key={k} value={k} className="bg-[#0d1116] text-neutral-200">
                    {k}
                  </option>
                ))}
              </select>

              <button
                onClick={() => saveSlot(i)}
                title={`Save key, 9-layer mix, tempo and arp division into Pos ${i + 1}`}
                className={`mt-1.5 flex h-8 w-full items-center justify-center gap-1 rounded-lg text-[9px] font-bold uppercase tracking-[0.12em] ring-1 ring-inset transition ${
                  savedSlot === i
                    ? "bg-emerald-400 text-[#07110d] ring-emerald-300"
                    : "bg-white/[0.05] text-neutral-400 ring-white/10 hover:bg-emerald-400/20 hover:text-emerald-300"
                }`}
              >
                <Save className="h-3 w-3" />
                {savedSlot === i ? "Saved" : "Save"}
              </button>

              {midi && (
                <div className="mt-1.5 flex justify-center">
                  <MidiLearnButton midi={midi} target={`slot:${i}`} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={onNext}
        className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-white/[0.05] text-sm font-semibold text-neutral-100 ring-1 ring-inset ring-white/10 transition hover:bg-white/[0.09] active:scale-[0.995]"
      >
        Next Key <ChevronRight className="h-4 w-4" />
        <span className="ml-1 rounded border border-white/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-neutral-500">
          →
        </span>
      </button>
      {activeSlot < 0 && (
        <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-neutral-600">
          Current key is not in the setlist
        </p>
      )}
    </div>
  );
}