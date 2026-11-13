/* ------------------------------------------------------------------ *
 * Native voice design. Every layer owns a narrow frequency band so the
 * nine textures stack without masking each other.
 *
 * Layers are built LAZILY and one at a time (buildLayer) so a silent or
 * muted texture costs the CPU absolutely nothing. Slow modulation is
 * driven by three shared engine LFOs instead of one oscillator per layer.
 * ------------------------------------------------------------------ */

const SEMITONES = {
  C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5,
  "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11,
};

export const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

export const semitoneOf = (key) => SEMITONES[key] ?? 0;

/* root, fifth, octave */
const DRONE = [0, 7, 12];

/* fade-in shape per layer when its graph is (re)built */
const ATTACK = {
  warm: 0.3,
  analog: 0.7,
  ambient: 1.7,
  strings: 1.9,
  shimmer: 2.2,
  guitar: 0.55,
  organ: 0.9,
  air: 2.4,
};

export const ARP_STEPS = [12, 19, 24, 19, 16, 19, 12, 24];

/**
 * Build one texture's node graph.
 * Returns { id, key, nodes, taps, out } — engine owns the lifecycle.
 */
export function buildLayer(engine, id, key, t0) {
  const ctx = engine.ctx;
  const root = 48 + semitoneOf(key);
  const graph = { id, key, nodes: [], taps: [], out: null };

  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, t0);
  out.gain.linearRampToValueAtTime(1, t0 + (ATTACK[id] ?? 1));
  out.connect(engine.layerGains[id]);
  graph.out = out;

  const filt = (type, freq, q) => {
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    graph.nodes.push(f);
    return f;
  };

  const node = (n) => {
    graph.nodes.push(n);
    return n;
  };

  const osc = (type, midi, detune, dest, level, wave) => {
    const o = ctx.createOscillator();
    if (wave) o.setPeriodicWave(wave);
    else o.type = type;
    o.frequency.value = midiToFreq(midi);
    o.detune.value = detune;
    const g = node(ctx.createGain());
    g.gain.value = level;
    o.connect(g);
    g.connect(dest);
    o.start(t0);
    graph.nodes.push(o);
  };

  const drone = (dest, midi, type, dets, level, step = DRONE) => {
    step.forEach((semi) => dets.forEach((d) => osc(type, midi + semi, d, dest, level)));
  };

  /* shared LFO -> depth gain -> param (no per-layer oscillator) */
  const mod = (name, depth, param) => {
    const tap = engine.lfoTap(name, depth, param);
    if (tap) graph.taps.push(tap);
  };

  switch (id) {
    /* 1 · Warm Pads — low / low-mid only */
    case "warm": {
      const lp = filt("lowpass", 380, 0.8);
      const hp = filt("highpass", 32, 0.7);
      hp.connect(lp);
      lp.connect(out);
      drone(hp, root, "sine", [-4, 4], 0.1);
      osc("triangle", root, 0, hp, 0.06);
      osc("sine", root - 12, 0, hp, 0.16);
      mod("slow", 90, lp.frequency);
      break;
    }

    /* 2 · Analog Synth Pad — mid warmth */
    case "analog": {
      const hp = filt("highpass", 175, 0.6);
      const lp = filt("lowpass", 1550, 1.7);
      hp.connect(lp);
      lp.connect(out);
      drone(hp, root, "sawtooth", [-8, 0, 8], 0.03);
      drone(hp, root + 12, "square", [-5, 5], 0.017);
      mod("mid", 310, lp.frequency);
      break;
    }

    /* 3 · Bright Ambient — air band */
    case "ambient": {
      const hp = filt("highpass", 620, 0.6);
      const lp = filt("lowpass", 7000, 0.9);
      const air = filt("highshelf", 5200, 0.7);
      air.gain.value = 8;
      hp.connect(lp);
      lp.connect(air);
      air.connect(out);
      drone(hp, root + 12, "triangle", [-9, 9], 0.04);
      drone(hp, root + 24, "sine", [-5, 5], 0.028);
      mod("slow", 950, lp.frequency);
      break;
    }

    /* 4 · Cinematic Strings — slow swell */
    case "strings": {
      const hp = filt("highpass", 150, 0.5);
      const body = filt("peaking", 820, 1);
      body.gain.value = 3;
      const lp = filt("lowpass", 2900, 0.5);
      hp.connect(body);
      body.connect(lp);
      lp.connect(out);
      drone(hp, root, "sawtooth", [-12, 0, 12], 0.026);
      drone(hp, root + 12, "sawtooth", [-6, 6], 0.013);
      mod("slow", 700, lp.frequency);
      mod("slow", 260, body.frequency);
      break;
    }

    /* 5 · Ethereal Shimmer — octave-up halo */
    case "shimmer": {
      const hp = filt("highpass", 1800, 0.7);
      const trem = node(ctx.createGain());
      trem.gain.value = 0.78;
      hp.connect(trem);
      trem.connect(out);
      drone(hp, root + 24, "sine", [-6, 6], 0.05);
      osc("triangle", root + 31, 0, hp, 0.018);
      mod("fast", 0.24, trem.gain);
      break;
    }

    /* 8 · Electric Guitar Overdrive — saws -> light drive -> spring */
    case "guitar": {
      const drive = node(ctx.createWaveShaper());
      drive.curve = engine.driveCurve("guitar", 14);
      drive.oversample = "none";
      const trim = node(ctx.createGain());
      trim.gain.value = 0.28;
      const cab = filt("lowpass", 2400, 0.9);
      const spring = node(ctx.createGain());
      spring.gain.value = 0.5;
      const trem = node(ctx.createGain());
      trem.gain.value = 0.85;

      drive.connect(trim);
      trim.connect(cab);
      cab.connect(spring);
      spring.connect(trem);
      trem.connect(out);

      [0.041, 0.059, 0.077].forEach((time, i) => {
        const delay = node(ctx.createDelay(0.2));
        delay.delayTime.value = time;
        const damp = filt("lowpass", 3400 - i * 500, 0.7);
        const fb = node(ctx.createGain());
        fb.gain.value = 0.4 - i * 0.07;
        cab.connect(delay);
        delay.connect(damp);
        damp.connect(fb);
        fb.connect(delay);
        damp.connect(spring);
      });

      drone(drive, root, "sawtooth", [-7, 0, 7], 0.05);
      osc("triangle", root - 12, 0, drive, 0.05);
      mod("mid", 500, cab.frequency);
      mod("fast", 0.13, trem.gain);
      break;
    }

    /* 7 · Organ Pads — additive drawbar stack with a slow chorus */
    case "organ": {
      const hp = filt("highpass", 85, 0.6);
      const body = filt("peaking", 620, 0.9);
      body.gain.value = 2.5;
      const lp = filt("lowpass", 3400, 0.8);
      const trem = node(ctx.createGain());
      trem.gain.value = 0.88;
      hp.connect(body);
      body.connect(lp);
      lp.connect(trem);
      trem.connect(out);

      /* 8' · 4' · 2⅔' · 2' drawbars, gently chorused */
      drone(hp, root, "sine", [-5, 5], 0.085, [0, 12]);
      drone(hp, root + 19, "sine", [-4, 4], 0.032, [0, 12]);
      drone(hp, root + 24, "sine", [-6, 6], 0.028, [0, 7]);
      osc("sine", root + 28, 4, hp, 0.012);
      mod("slow", 240, lp.frequency);
      mod("mid", 0.06, trem.gain);
      break;
    }

    /* 9 · Air Pads — high-only wind, no mid body, soft analog grit */
    case "air": {
      const hp = filt("highpass", 2600, 0.9);
      const hp2 = filt("highpass", 4400, 0.7);
      const notchMid = filt("peaking", 950, 1.4);
      notchMid.gain.value = -18;
      const airBand = filt("highshelf", 8200, 0.7);
      airBand.gain.value = 7;
      const lp = filt("lowpass", 13000, 0.6);

      /* delicate saturation: shallow tanh curve, tiny amount → shimmering grit */
      const shaper = node(ctx.createWaveShaper());
      shaper.curve = engine.driveCurve("air", 1.7);
      shaper.oversample = "none";
      const trim = node(ctx.createGain());
      trim.gain.value = 0.8;

      const trem = node(ctx.createGain());
      trem.gain.value = 0.62;

      hp.connect(hp2);
      hp2.connect(notchMid);
      notchMid.connect(shaper);
      shaper.connect(trim);
      trim.connect(lp);
      lp.connect(airBand);
      airBand.connect(trem);
      trem.connect(out);

      /* looping noise through a drifting band-pass → breathy wind */
      const noise = ctx.createBufferSource();
      const len = Math.floor(ctx.sampleRate * 2);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const nd = buf.getChannelData(0);
      for (let i = 0; i < len; i++) nd[i] = Math.random() * 2 - 1;
      noise.buffer = buf;
      noise.loop = true;
      const gust = filt("bandpass", 3800, 0.7);
      const noiseGain = node(ctx.createGain());
      noiseGain.gain.value = 0.25;
      noise.connect(gust);
      gust.connect(noiseGain);
      noiseGain.connect(hp);
      noise.start(t0);
      graph.nodes.push(noise);

      /* thin upper partials only — body/mid stays empty */
      drone(hp, root + 24, "sine", [-7, 7], 0.045);
      drone(hp, root + 36, "sine", [-9, 9], 0.03);
      osc("triangle", root + 31, 6, hp, 0.014);

      mod("slow", 1500, gust.frequency);
      mod("fast", 0.2, trem.gain);
      break;
    }

    default:
      break;
  }

  return graph;
}

/* 6 · Modern Overdrive Arp — one short, self-terminating note */
export function playArpNote(engine, time, step, dur) {
  const ctx = engine.ctx;
  const dest = engine.layerGains ? engine.layerGains.arp : null;
  if (!ctx || !dest) return;

  const root = 48 + semitoneOf(engine.key) + ARP_STEPS[step];

  const drive = ctx.createWaveShaper();
  drive.curve = engine.driveCurve("arp", 11);
  drive.oversample = "none";

  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.setValueAtTime(5400, time);
  band.frequency.exponentialRampToValueAtTime(2300, time + dur * 0.8);
  band.Q.value = 1.2;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, time);
  env.gain.linearRampToValueAtTime(0.4, time + 0.006);
  env.gain.exponentialRampToValueAtTime(0.0001, time + dur);

  drive.connect(band);
  band.connect(env);
  env.connect(dest);

  [-7, 7].forEach((det) => {
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = midiToFreq(root);
    o.detune.value = det;
    const g = ctx.createGain();
    g.gain.value = 0.34;
    o.connect(g);
    g.connect(drive);
    o.start(time);
    o.stop(time + dur + 0.05);
  });

  const sub = ctx.createOscillator();
  sub.type = "square";
  sub.frequency.value = midiToFreq(root - 12);
  const subGain = ctx.createGain();
  subGain.gain.value = 0.4;
  sub.connect(subGain);
  subGain.connect(drive);
  sub.start(time);
  sub.stop(time + dur + 0.05);
}