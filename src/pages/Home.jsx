import React, { useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, Music2 } from "lucide-react";
import { PadEngine } from "@/lib/padEngine";
import { DEFAULT_LAYERS, LAYER_ORDER, isAudible } from "@/lib/padConfig";
import { loadPresets, savePresets, snapshotLayers, PRESET_COUNT } from "@/lib/presetStore";
import NowPlaying from "@/components/pad/NowPlaying";
import KeyGrid from "@/components/pad/KeyGrid";
import SetlistPanel from "@/components/pad/SetlistPanel";
import LayerMixer from "@/components/pad/LayerMixer";
import ToneControl from "@/components/pad/ToneControl";
import TapTempo from "@/components/pad/TapTempo";
import ArpDivision from "@/components/pad/ArpDivision";
import Panel from "@/components/pad/Panel";
import MidiStatus from "@/components/pad/MidiStatus";
import MidiPanel from "@/components/pad/MidiPanel";
import MidiLearnButton from "@/components/pad/MidiLearnButton";
import RandomMixButton from "@/components/pad/RandomMixButton";
import SafetyControls from "@/components/pad/SafetyControls";
import SupportPanel from "@/components/pad/SupportPanel";
import PreLiveModal from "@/components/pad/PreLiveModal";
import useMidi from "@/hooks/useMidi";

/* key crossfade and fader glide share one duration */
const RECALL_SECONDS = 3;

export default function Home() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentKey, setCurrentKey] = useState("C");
  const [layers, setLayers] = useState(DEFAULT_LAYERS);
  const [master, setMaster] = useState(0.7);
  const [tone, setTone] = useState(50);
  const [bpm, setBpm] = useState(90);
  const [arpDiv, setArpDiv] = useState("1/8");
  /* five independent preset containers, restored from localStorage */
  const [presets, setPresets] = useState(loadPresets);
  const [activeSlot, setActiveSlot] = useState(0);
  const [recallToken, setRecallToken] = useState(0);
  const [fades, setFades] = useState({});
  const [engineNote, setEngineNote] = useState("");

  const slots = useMemo(() => presets.map((p) => p.key), [presets]);
  const mixes = useMemo(() => presets.map((p) => p.layers), [presets]);

  const engineRef = useRef(null);
  const tapsRef = useRef([]);
  const fadeSeq = useRef(0);
  const noteTimer = useRef(null);
  const recallGlide = useRef(0);

  useEffect(() => {
    savePresets(presets);
  }, [presets]);

  const handleFade = ({ key, kind, seconds }) => {
    if (!key) return;
    const token = ++fadeSeq.current;
    setFades((prev) => ({ ...prev, [key]: { kind, seconds, token } }));
  };

  const handleStatus = (status) => {
    const text =
      status === "panic"
        ? "Panic — all audio stopped"
        : status === "reset"
          ? "Engine reset"
          : "Engine recovered";
    setEngineNote(text);
    window.clearTimeout(noteTimer.current);
    noteTimer.current = window.setTimeout(() => setEngineNote(""), 2600);
  };

  const getEngine = () => {
    if (!engineRef.current) {
      engineRef.current = new PadEngine({ onFade: handleFade, onStatus: handleStatus });
    }
    return engineRef.current;
  };

  useEffect(
    () => () => {
      window.clearTimeout(noteTimer.current);
      engineRef.current?.destroy();
    },
    [],
  );

  useEffect(() => {
    const glide = recallGlide.current;
    recallGlide.current = 0;
    const engine = engineRef.current;
    if (!engine) return;
    Object.entries(layers).forEach(([id, s]) =>
      engine.setLayer(id, s.volume, isAudible(layers, id), glide)
    );
  }, [layers]);

  useEffect(() => {
    engineRef.current?.setTone(tone);
  }, [tone]);

  useEffect(() => {
    engineRef.current?.setMaster(master);
  }, [master]);

  useEffect(() => {
    engineRef.current?.setBpm(bpm);
  }, [bpm]);

  useEffect(() => {
    engineRef.current?.setArpDiv(arpDiv);
  }, [arpDiv]);

  const togglePlay = async () => {
    const engine = getEngine();
    if (isPlaying) {
      engine.pause();
      setIsPlaying(false);
    } else {
      Object.entries(layers).forEach(([id, s]) =>
        engine.setLayer(id, s.volume, isAudible(layers, id))
      );
      engine.setTone(tone);
      engine.setMaster(master);
      engine.setBpm(bpm);
      engine.setArpDiv(arpDiv);
      engine.setKey(currentKey);
      await engine.play();
      setIsPlaying(true);
    }
  };

  const handlePanic = () => {
    getEngine().panic();
    setIsPlaying(false);
    tapsRef.current = [];
  };

  const handleReset = () => {
    getEngine().resetAudio();
  };

  const selectKey = (k) => {
    if (k === currentKey) return;
    setCurrentKey(k);
    engineRef.current?.setKey(k);
  };

  const nextKey = () => triggerSlot((activeSlot + 1) % PRESET_COUNT);

  /* bundles key + 9-layer mix + tempo + arp division into ONE preset container */
  const savePreset = (i) => {
    const snapshot = snapshotLayers(layers);
    setPresets((prev) =>
      prev.map((p, idx) =>
        idx === i
          ? { key: currentKey, layers: snapshot, bpm: bpm || null, arpDiv }
          : p,
      ),
    );
  };

  /* recalls this slot's key and glides its 9 faders over the crossfade */
  function triggerSlot(i) {
    if (i < 0 || i >= presets.length) return;
    const preset = presets[i];
    setActiveSlot(i);
    if (preset.bpm) setBpm(preset.bpm);
    if (preset.arpDiv) setArpDiv(preset.arpDiv);
    if (preset.layers) {
      recallGlide.current = RECALL_SECONDS;
      setRecallToken((t) => t + 1);
      setLayers((prev) => {
        const next = { ...prev };
        Object.entries(preset.layers).forEach(([id, l]) => {
          next[id] = { ...prev[id], ...l };
        });
        return next;
      });
    }
    selectKey(preset.key);
  }

  const tap = () => {
    const now = performance.now();
    const taps = tapsRef.current;
    if (taps.length && now - taps[taps.length - 1] > 2000) taps.length = 0;
    taps.push(now);
    if (taps.length > 6) taps.shift();
    if (taps.length >= 2) {
      let total = 0;
      for (let i = 1; i < taps.length; i++) total += taps[i] - taps[i - 1];
      const avg = total / (taps.length - 1);
      const value = Math.round(60000 / avg);
      setBpm(Math.min(220, Math.max(30, value)));
    }
  };

  const midi = useMidi({
    onTrigger: (target) => {
      if (target === "play") togglePlay();
      else if (target === "tap") tap();
      else if (target.startsWith("slot:")) triggerSlot(Number(target.slice(5)));
      else if (target.startsWith("key:")) selectKey(target.slice(4));
    },
    onValue: (target, value) => {
      if (target === "tone") setTone(Math.round(value * 100));
      else if (target === "master") setMaster(value);
      else if (target.startsWith("layer:")) {
        const id = target.slice(6);
        setLayers((prev) => ({ ...prev, [id]: { ...prev[id], volume: value } }));
      }
    },
  });

  useEffect(() => {
    const onKeyDown = (e) => {
      const el = e.target;
      const typing =
        el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (typing) return;
      if (e.repeat && e.code === "Space") return;

      if (e.code === "Space") {
        e.preventDefault();
        tap();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        nextKey();
      } else if (/^(Digit|Numpad)[1-5]$/.test(e.code)) {
        const position = Number(e.code.slice(-1)) - 1;
        e.preventDefault();
        triggerSlot(position);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [presets, activeSlot, currentKey]);

  const setLayerVolume = (id, volume) =>
    setLayers((prev) => ({ ...prev, [id]: { ...prev[id], volume } }));

  const toggleLayer = (id) =>
    setLayers((prev) => ({ ...prev, [id]: { ...prev[id], enabled: !prev[id].enabled } }));

  const toggleMute = (id) =>
    setLayers((prev) => ({ ...prev, [id]: { ...prev[id], muted: !prev[id].muted } }));

  const toggleSolo = (id) =>
    setLayers((prev) => ({ ...prev, [id]: { ...prev[id], soloed: !prev[id].soloed } }));

  /* exactly 6 layers on, 3 muted, active volumes randomized and capped at 0.7 */
  const randomizeMix = () => {
    const picked = new Set(
      LAYER_ORDER.map((id) => [Math.random(), id])
        .sort((a, b) => a[0] - b[0])
        .slice(0, 6)
        .map(([, id]) => id),
    );
    setLayers((prev) =>
      Object.fromEntries(
        LAYER_ORDER.map((id) => {
          const on = picked.has(id);
          return [
            id,
            {
              ...prev[id],
              enabled: on,
              muted: !on,
              soloed: false,
              volume: on ? Math.min(0.7, 0.22 + Math.random() * 0.48) : 0,
            },
          ];
        }),
      ),
    );
  };

  return (
    <div className="min-h-screen bg-[#080a0d] text-neutral-100 selection:bg-emerald-400/30">
      <div className="mx-auto w-full max-w-[1400px] px-5 pb-16 pt-8 md:px-10 md:pt-12">
        <header className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.28em] text-emerald-400/70">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_2px_rgba(52,211,153,0.7)]" />
              Live Worship Rig
            </div>
            <h1 className="mt-3 font-heading text-[28px] font-bold leading-tight tracking-tight md:text-[40px]">
              <span className="text-emerald-400">Haven</span>
              <span className="text-neutral-500">Scape</span>
            </h1>
            <p className="mt-1.5 text-xs font-medium tracking-wide text-neutral-500 md:text-sm">
              12 Keys of Worship Pads for Live
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SafetyControls onPanic={handlePanic} onReset={handleReset} note={engineNote} />
            <MidiStatus midi={midi} />
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-neutral-400">
              <Keyboard className="h-3.5 w-3.5" />
              1–5 · Space · →
            </div>
          </div>
        </header>

        <div className="mt-10">
          <NowPlaying
            isPlaying={isPlaying}
            currentKey={currentKey}
            onToggle={togglePlay}
            bpm={bpm}
            midi={midi}
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Panel title="Key" hint="Changing key crossfades over 3 seconds">
              <KeyGrid
                current={currentKey}
                onSelect={selectKey}
                midi={midi}
                fades={fades}
              />
            </Panel>

            <Panel title="Preset List" hint="Each position recalls its key and its saved mix">
              <SetlistPanel
                slots={slots}
                activeSlot={activeSlot}
                currentKey={currentKey}
                mixes={mixes}
                onTrigger={triggerSlot}
                onAssignKey={(i, key) =>
                  setPresets((prev) =>
                    prev.map((p, idx) => (idx === i ? { ...p, key } : p)),
                  )
                }
                onSaveSlot={savePreset}
                onNext={nextKey}
                onLoadKeys={(keys) =>
                  setPresets((prev) =>
                    prev.map((p, i) => (keys[i] ? { ...p, key: keys[i] } : p)),
                  )
                }
                midi={midi}
              />
            </Panel>
          </div>

          <div className="space-y-6">
            <Panel
              title="Tap Tempo"
              hint="Tap, type a BPM, or press spacebar"
              action={<MidiLearnButton midi={midi} target="tap" showText />}
            >
              <TapTempo bpm={bpm} onTap={tap} onBpm={setBpm} />
            </Panel>

            <Panel title="Arp Time Division" hint="Note quantization rate">
              <ArpDivision value={arpDiv} onChange={setArpDiv} />
            </Panel>

            <Panel
              title="Tone"
              hint="Bass ← → Treble"
              action={<MidiLearnButton midi={midi} target="tone" showText />}
            >
              <ToneControl value={tone} onChange={setTone} />
            </Panel>

            <Panel
              title="Master Volume"
              hint="Total application output"
              action={<MidiLearnButton midi={midi} target="master" showText />}
            >
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={master}
                  onChange={(e) => setMaster(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-400 [&::-webkit-slider-thumb]:shadow-[0_0_16px_rgba(52,211,153,0.85)]"
                />
                <span className="w-9 shrink-0 text-right font-mono text-sm text-neutral-300">
                  {Math.round(master * 100)}
                </span>
              </div>
            </Panel>
          </div>
        </div>

        <div className="mt-6">
          <Panel
            title="Ambient Mix"
            hint="Nine-channel console — pull a fader to blend"
            action={<RandomMixButton onRandomize={randomizeMix} />}
          >
            <LayerMixer
              layers={layers}
              onVolume={setLayerVolume}
              onToggle={toggleLayer}
              onMute={toggleMute}
              onSolo={toggleSolo}
              midi={midi}
              engineRef={engineRef}
              recall={{ token: recallToken, seconds: RECALL_SECONDS }}
            />
            <div className="mt-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-neutral-600">
              <Music2 className="h-3.5 w-3.5" />
              1–5 preset list · → next key · spacebar taps tempo
            </div>
          </Panel>
        </div>

        <div className="mt-6">
          <Panel
            title="MIDI Mapping"
            hint="Assign any controller message to any control"
            action={
              <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-neutral-400">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${midi.connected ? "bg-emerald-400" : "bg-amber-400"}`}
                />
                {midi.connected ? "Live" : "No Device"}
              </span>
            }
          >
            <MidiPanel midi={midi} />
          </Panel>
        </div>

        <div className="mt-6">
          <SupportPanel />
        </div>
      </div>

      <PreLiveModal />
    </div>
  );
}