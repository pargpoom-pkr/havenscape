import { DIVISION_FACTOR } from "./padConfig";
import { ARP_STEPS, buildLayer, playArpNote } from "./padVoices";
/* Layer groups */
const DRONE_LAYERS = ["warm", "analog", "ambient", "strings", "shimmer", "guitar", "organ", "air"];
const LAYER_IDS = ["warm", "analog", "ambient", "strings", "shimmer", "arp", "organ", "guitar", "air"];

/* Three shared modulators instead of one LFO per texture. */
const LFO_RATES = { slow: 0.035, mid: 0.075, fast: 0.21 };

/* how long a silent layer keeps its oscillators before they are stopped */
const IDLE_MS = 700;

/* tanh curves are built once per character, at 256 points (not 1024) */
const CURVES = {};
const curveFor = (name, amount) => {
  if (!CURVES[name]) {
    const n = 256;
    const curve = new Float32Array(n);
    const norm = Math.tanh(amount) || 1;
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / (n - 1) - 1;
      curve[i] = Math.tanh(x * amount) / norm;
    }
    CURVES[name] = curve;
  }
  return CURVES[name];
};

export class PadEngine {
  constructor(options = {}) {
    this.onFade = options.onFade || null;
    this.onStatus = options.onStatus || null;

    this.ctx = null;
    this.key = "C";
    this.playing = false;
    this.bpm = 0;
    this.arpDiv = "1/8";
    this.masterValue = 0.7;
    this.toneValue = 50;

    this.layerSettings = {};
    this.layerGraphs = {};
    this.idleTimers = {};

    this.arpStep = 0;
    this.arpTimer = null;
    this.pauseToken = 0;

    this._pulse = null;
    this._monitor = null;
    this._lastClock = 0;
    this._stallCount = 0;
    this._resumeAttempts = 0;
    this._recovering = false;
  }

  /* ---------------------------------------------------------------- *
   * context + shared graph
   * ---------------------------------------------------------------- */

  ensure() {
    if (this.ctx) return this.ctx;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx({ latencyHint: "playback" });
    this.ctx = ctx;

    this.busIn = ctx.createGain();
    this.busIn.gain.value = 1;

    this.lowShelf = ctx.createBiquadFilter();
    this.lowShelf.type = "lowshelf";
    this.lowShelf.frequency.value = 200;

    this.highShelf = ctx.createBiquadFilter();
    this.highShelf.type = "highshelf";
    this.highShelf.frequency.value = 4200;

    this.fadeGain = ctx.createGain();
    this.fadeGain.gain.value = 0;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = this.masterValue;

    /* brickwall-style safety limiter on the final mix */
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -1;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 12;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.25;

    this.busIn.connect(this.lowShelf);
    this.lowShelf.connect(this.highShelf);
    this.highShelf.connect(this.fadeGain);
    this.fadeGain.connect(this.masterGain);
    this.masterGain.connect(this.limiter);
    this.limiter.connect(ctx.destination);

    /* shared reverb tail */
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this._impulse(2.8, 2.6);
    this.reverbGain = ctx.createGain();
    this.reverbGain.gain.value = 0.65;
    this.highShelf.connect(this.reverb);
    this.reverb.connect(this.reverbGain);
    this.reverbGain.connect(this.fadeGain);

    this.layerGains = {};
    LAYER_IDS.forEach((id) => {
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(this.busIn);
      this.layerGains[id] = g;
    });

    /* one analyser per layer -> drives the on-stage pulse indicators */
    this.analyserSink = ctx.createGain();
    this.analyserSink.gain.value = 0;
    this.analyserSink.connect(this.masterGain);
    this._levelBuf = new Uint8Array(128);
    this.layerAnalysers = {};
    LAYER_IDS.forEach((id) => {
      const a = ctx.createAnalyser();
      a.fftSize = 128;
      a.smoothingTimeConstant = 0.5;
      this.layerGains[id].connect(a);
      a.connect(this.analyserSink);
      this.layerAnalysers[id] = a;
    });

    this._buildLfos();
    this.setTone(this.toneValue, true);
    this.setMaster(this.masterValue, true);
    Object.entries(this.layerSettings).forEach(([id, s]) => {
      if (this.layerGains[id]) this.layerGains[id].gain.value = s.audible ? s.volume : 0;
    });

    ctx.onstatechange = () => this._onStateChange();
    this._startMonitor();
    return ctx;
  }

  _buildLfos() {
    this.lfoOsc = {};
    this.lfoOut = {};
    const ctx = this.ctx;
    Object.entries(LFO_RATES).forEach(([name, rate]) => {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = rate;
      const out = ctx.createGain();
      out.gain.value = 1;
      o.connect(out);
      o.start();
      this.lfoOsc[name] = o;
      this.lfoOut[name] = out;
    });
  }

  /* depth gain from a shared LFO into a param — the cheap half of an LFO */
  lfoTap(name, depth, param) {
    const src = this.lfoOut ? this.lfoOut[name] : null;
    if (!src || !this.ctx) return null;
    const g = this.ctx.createGain();
    g.gain.value = depth;
    src.connect(g);
    g.connect(param);
    return g;
  }

  driveCurve(name, amount) {
    return curveFor(name, amount);
  }

  /* live RMS per layer (0..1) for the pulse indicators — cheap, no nodes created */
  levels() {
    const out = {};
    if (!this.ctx || !this.layerAnalysers) return out;
    const buf = this._levelBuf;
    Object.entries(this.layerAnalysers).forEach(([id, a]) => {
      a.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / buf.length);
      out[id] = Math.min(1, Math.pow(rms * 3.4, 0.62));
    });
    return out;
  }

  pulseWave() {
    if (this._pulse) return this._pulse;
    const n = 24;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    for (let i = 1; i < n; i++) {
      real[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * 0.25);
    }
    this._pulse = this.ctx.createPeriodicWave(real, imag, { disableNormalization: false });
    return this._pulse;
  }

  _impulse(duration, decay) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * duration);
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  /* ---------------------------------------------------------------- *
   * transport
   * ---------------------------------------------------------------- */

  async play() {
    const ctx = this.ensure();
    await ctx.resume();
    this.pauseToken++;
    this.playing = true;
    DRONE_LAYERS.forEach((id) => this._build(id));
    const now = ctx.currentTime;
    this.fadeGain.gain.cancelScheduledValues(now);
    this.fadeGain.gain.setValueAtTime(this.fadeGain.gain.value, now);
    this.fadeGain.gain.linearRampToValueAtTime(1, now + 2);
    this._startArp();
    this._emitFade("in", 2, this.key);
  }

  pause() {
    this.playing = false;
    this._stopArp();
    this._emitFade("out", 2, this.key);
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.fadeGain.gain.cancelScheduledValues(now);
    this.fadeGain.gain.setValueAtTime(this.fadeGain.gain.value, now);
    this.fadeGain.gain.linearRampToValueAtTime(0, now + 2);
    const token = ++this.pauseToken;
    window.setTimeout(() => {
      if (this.pauseToken !== token || this.playing) return;
      Object.values(this.layerGraphs).forEach((g) => this._stopGraph(g));
      this.layerGraphs = {};
    }, 2150);
  }

  setKey(key) {
    const previous = this.key;
    this.key = key;
    if (!this.ctx || !this.playing || previous === key) return;
    DRONE_LAYERS.forEach((id) => this._build(id));
    this._emitFade("out", 3, previous);
    this._emitFade("in", 3, key);
    this.duck(3);
  }

  /* master dip while two key beds overlap, so stacked harmonics don't pile up */
  duck(seconds, amount = 0.72) {
    const g = this.masterGain ? this.masterGain.gain : null;
    if (!g || !this.ctx) return;
    const now = this.ctx.currentTime;
    const target = this.masterValue;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(target * amount, now + seconds * 0.4);
    g.linearRampToValueAtTime(target, now + seconds);
  }

  _emitFade(kind, seconds, key) {
    if (this.onFade) this.onFade({ kind, seconds, key });
  }

  /* ---------------------------------------------------------------- *
   * layers: lazy build / idle teardown
   * ---------------------------------------------------------------- */

  _audible(id) {
    const s = this.layerSettings[id];
    return !!s && s.audible && s.volume > 0.0005;
  }

  _build(id) {
    if (!this.ctx || !this.playing) return;
    if (!DRONE_LAYERS.includes(id) || !this._audible(id)) return;
    const existing = this.layerGraphs[id];
    if (existing && existing.key === this.key) return;
    if (existing) {
      delete this.layerGraphs[id];
      this._retire(existing, 3);
    }
    this.layerGraphs[id] = buildLayer(this, id, this.key, this.ctx.currentTime + 0.02);
  }

  _retire(graph, seconds) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    try {
      graph.out.gain.cancelScheduledValues(now);
      graph.out.gain.setValueAtTime(graph.out.gain.value, now);
      graph.out.gain.linearRampToValueAtTime(0, now + seconds);
    } catch (e) {
      /* param gone */
    }
    window.setTimeout(() => this._stopGraph(graph), (seconds + 0.05) * 1000);
  }

  _stopGraph(graph) {
    if (!graph) return;
    graph.nodes.forEach((n) => {
      try {
        if (n.stop) n.stop();
      } catch (e) {
        /* already stopped */
      }
      try {
        n.disconnect();
      } catch (e) {
        /* already gone */
      }
    });
    (graph.taps || []).forEach((t) => {
      try {
        t.disconnect();
      } catch (e) {
        /* already gone */
      }
    });
    try {
      graph.out.disconnect();
    } catch (e) {
      /* already gone */
    }
  }

  _scheduleIdle(id, delay = IDLE_MS) {
    window.clearTimeout(this.idleTimers[id]);
    this.idleTimers[id] = window.setTimeout(() => {
      delete this.idleTimers[id];
      if (this._audible(id)) return;
      const graph = this.layerGraphs[id];
      if (!graph) return;
      delete this.layerGraphs[id];
      this._retire(graph, 0.15);
    }, delay);
  }

  _cancelIdle(id) {
    if (this.idleTimers[id]) window.clearTimeout(this.idleTimers[id]);
    delete this.idleTimers[id];
  }

  /* glide > 0 automates linearly over that many seconds (preset recall) */
  _ramp(param, target, timeConstant = 0.035, glide = 0) {
    if (!param) return;
    const now = this.ctx.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    if (glide > 0.02) param.linearRampToValueAtTime(target, now + glide);
    else param.setTargetAtTime(target, now, timeConstant);
  }

  setLayer(id, volume, audible, glide = 0) {
    this.layerSettings[id] = { volume, audible };
    if (!this.ctx || !this.layerGains[id]) return;
    const target = audible ? volume : 0;
    this._ramp(this.layerGains[id].gain, target, 0.04, glide);

    if (!DRONE_LAYERS.includes(id)) return;
    if (target > 0.0005) {
      this._cancelIdle(id);
      this._build(id);
    } else {
      /* let a preset glide reach silence before the oscillators are retired */
      this._scheduleIdle(id, glide > 0.02 ? glide * 1000 + 150 : IDLE_MS);
    }
  }

  setTone(value, instant = false) {
    this.toneValue = value;
    if (!this.ctx) return;
    const low = value <= 50 ? ((50 - value) / 50) * 15 : -((value - 50) / 50) * 9;
    const high = value >= 50 ? ((value - 50) / 50) * 14 : -((50 - value) / 50) * 10;
    this._ramp(this.lowShelf.gain, low, instant ? 0.01 : 0.04);
    this._ramp(this.highShelf.gain, high, instant ? 0.01 : 0.04);
  }

  setMaster(value, instant = false) {
    this.masterValue = value;
    if (!this.ctx) return;
    this._ramp(this.masterGain.gain, value, instant ? 0.01 : 0.03);
  }

  setBpm(bpm) {
    this.bpm = bpm;
    if (this.playing) this._restartArpClock();
  }

  setArpDiv(div) {
    this.arpDiv = div;
    if (this.playing) this._restartArpClock();
  }

  /* ---------------------------------------------------------------- *
   * arp (only runs while its layer is audible)
   * ---------------------------------------------------------------- */

  _stepMs() {
    const bpm = this.bpm > 0 ? this.bpm : 90;
    return (60000 / bpm) * (DIVISION_FACTOR[this.arpDiv] ?? 0.5);
  }

  _restartArpClock() {
    if (this.arpTimer) window.clearInterval(this.arpTimer);
    this.arpTimer = null;
    if (!this.playing) return;
    this.arpTimer = window.setInterval(() => this._tickArp(), this._stepMs());
  }

  _startArp() {
    if (!this.ctx) return;
    this.arpStep = 0;
    this._restartArpClock();
  }

  _stopArp() {
    if (this.arpTimer) window.clearInterval(this.arpTimer);
    this.arpTimer = null;
  }

  _tickArp() {
    if (!this.playing || !this.ctx || !this.bpm) return;
    if (!this._audible("arp")) return;
    this._playArpNote(this.ctx.currentTime + 0.02, this.arpStep);
    this.arpStep = (this.arpStep + 1) % ARP_STEPS.length;
  }

  _playArpNote(time, step) {
    const dur = Math.max(0.12, Math.min(0.4, (this._stepMs() / 1000) * 0.9));
    playArpNote(this, time, step, dur);
  }

  /* ---------------------------------------------------------------- *
   * health monitor + recovery
   * ---------------------------------------------------------------- */

  _startMonitor() {
    this._stopMonitor();
    this._lastClock = this.ctx ? this.ctx.currentTime : 0;
    this._stallCount = 0;
    this._resumeAttempts = 0;
    this._monitor = window.setInterval(() => this._checkHealth(), 1200);
  }

  _stopMonitor() {
    if (this._monitor) window.clearInterval(this._monitor);
    this._monitor = null;
  }

  _checkHealth() {
    const ctx = this.ctx;
    if (!ctx || !this.playing || this._recovering) return;
    if (ctx.state === "closed") {
      this.recover("closed");
      return;
    }
    if (ctx.state !== "running") {
      this._nudge();
      return;
    }
    this._resumeAttempts = 0;
    const delta = ctx.currentTime - this._lastClock;
    this._lastClock = ctx.currentTime;
    if (delta < 0.05) {
      this._stallCount += 1;
      if (this._stallCount >= 2) this.recover("stalled");
    } else {
      this._stallCount = 0;
    }
  }

  _onStateChange() {
    const state = this.ctx ? this.ctx.state : null;
    if (this.playing && (state === "interrupted" || state === "suspended")) this._nudge();
  }

  _nudge() {
    const ctx = this.ctx;
    if (!ctx) return;
    /* never tear down and rebuild while hidden — the browser pauses us on purpose */
    if (typeof document !== "undefined" && document.hidden) return;
    this._resumeAttempts += 1;
    ctx.resume().catch(() => {});
    if (this._resumeAttempts >= 2) this.recover("suspended");
  }

  /* tear everything down and rebuild the running drone */
  recover() {
    if (this._recovering) return;
    const wasPlaying = this.playing;
    const key = this.key;
    this.playing = false;
    this._recovering = true;
    this._recoverToken = (this._recoverToken || 0) + 1;
    const token = this._recoverToken;
    this._stopArp();
    this._stopMonitor();
    this._teardownContext();
    if (this.onStatus) this.onStatus("recovered");
    window.setTimeout(() => {
      this._recovering = false;
      if (!wasPlaying || token !== this._recoverToken) return;
      this.key = key;
      this.play().catch(() => {});
    }, 120);
  }

  resetAudio() {
    const wasPlaying = this.playing;
    const key = this.key;
    this._recoverToken = (this._recoverToken || 0) + 1;
    this._recovering = false;
    this._stopArp();
    this._stopMonitor();
    this._teardownContext();
    if (this.onStatus) this.onStatus("reset");
    if (!wasPlaying) return;
    this.playing = false;
    this.key = key;
    this.play().catch(() => {});
  }

  panic() {
    this.playing = false;
    this._recoverToken = (this._recoverToken || 0) + 1;
    this.pauseToken++;
    if (this.ctx) {
      const now = this.ctx.currentTime;
      const params = [this.masterGain, this.fadeGain, ...Object.values(this.layerGains || {})];
      params.forEach((g) => {
        try {
          g.gain.cancelScheduledValues(now);
          g.gain.setValueAtTime(0, now);
        } catch (e) {
          /* param gone */
        }
      });
    }
    this._teardownContext();
    if (this.onStatus) this.onStatus("panic");
  }

  _teardownContext() {
    this._stopArp();
    this._stopMonitor();
    Object.values(this.layerGraphs).forEach((g) => this._stopGraph(g));
    this.layerGraphs = {};
    this.layerAnalysers = {};
    this.analyserSink = null;
    Object.keys(this.idleTimers).forEach((id) => window.clearTimeout(this.idleTimers[id]));
    this.idleTimers = {};

    const ctx = this.ctx;
    this.ctx = null;

    if (this.lfoOsc) {
      Object.values(this.lfoOsc).forEach((o) => {
        try {
          o.stop();
        } catch (e) {
          /* already stopped */
        }
        try {
          o.disconnect();
        } catch (e) {
          /* gone */
        }
      });
    }
    this.lfoOsc = {};
    this.lfoOut = {};
    this._pulse = null;

    if (ctx) {
      ctx.onstatechange = null;
      try {
        ctx.close();
      } catch (e) {
        /* already closed */
      }
    }
  }

  destroy() {
    this.playing = false;
    this._teardownContext();
  }
}