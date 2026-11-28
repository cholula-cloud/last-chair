/**
 * Procedural sounds. Every sound is built from oscillators and filtered noise, so these effects
 * need no audio files. Each recipe schedules its nodes, connects them to `out`, and lets them
 * stop on their own.
 */

export type SoundId = "tap" | "thunk" | "sting" | "chime" | "dial" | "punch" | "lights" | "rope" | "bus";
export const SOUND_IDS: readonly SoundId[] = ["tap", "thunk", "sting", "chime", "dial", "punch", "lights", "rope", "bus"];

type Tone = {
  type: OscillatorType;
  freq: number;
  /** Frequency at the end of the tone, for a glide. */
  freqEnd?: number;
  start: number;
  attack: number;
  /** Seconds from the end of the attack until the tone is silent. */
  decay: number;
  peak: number;
};

function tone(ctx: AudioContext, out: AudioNode, t: Tone): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = t.type;
  osc.frequency.setValueAtTime(t.freq, t.start);
  if (t.freqEnd !== undefined) osc.frequency.exponentialRampToValueAtTime(t.freqEnd, t.start + t.attack + t.decay);
  gain.gain.setValueAtTime(0.0001, t.start);
  gain.gain.linearRampToValueAtTime(t.peak, t.start + t.attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t.start + t.attack + t.decay);
  osc.connect(gain);
  gain.connect(out);
  osc.start(t.start);
  osc.stop(t.start + t.attack + t.decay + 0.05);
}

const NOISE_SECONDS = 4;
const noiseCache = new WeakMap<object, AudioBuffer>();

/** One shared white-noise buffer per context. Audio noise is not simulation state, so Math.random is fine. */
export function noiseBuffer(ctx: AudioContext): AudioBuffer {
  let buffer = noiseCache.get(ctx);
  if (!buffer) {
    buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * NOISE_SECONDS), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noiseCache.set(ctx, buffer);
  }
  return buffer;
}

/** A short filtered noise burst. */
function burst(ctx: AudioContext, out: AudioNode, start: number, seconds: number, cutoff: number, peak: number): void {
  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  src.buffer = noiseBuffer(ctx);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(cutoff, start);
  gain.gain.setValueAtTime(peak, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(out);
  src.start(start);
  src.stop(start + seconds + 0.05);
}

/** A light wooden click for UI taps. */
function tap(ctx: AudioContext, out: AudioNode, t: number): void {
  tone(ctx, out, { type: "triangle", freq: 1900, freqEnd: 1100, start: t, attack: 0.002, decay: 0.05, peak: 0.16 });
  burst(ctx, out, t, 0.02, 5000, 0.05);
}

/** A low thunk, like a post going into frozen ground. */
function thunk(ctx: AudioContext, out: AudioNode, t: number): void {
  tone(ctx, out, { type: "sine", freq: 130, freqEnd: 42, start: t, attack: 0.004, decay: 0.26, peak: 0.7 });
  burst(ctx, out, t, 0.09, 700, 0.3);
}

/** Three rising notes through a narrow band, so it sounds like it came over a radio. */
function sting(ctx: AudioContext, out: AudioNode, t: number): void {
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.setValueAtTime(1500, t);
  band.Q.setValueAtTime(0.6, t);
  band.connect(out);
  const notes = [392, 523.25, 659.25];
  notes.forEach((freq, i) => {
    tone(ctx, band, { type: "triangle", freq, start: t + i * 0.13, attack: 0.01, decay: i === notes.length - 1 ? 0.55 : 0.22, peak: 0.6 });
  });
}

/** A bright two-note chime for a lodge tier. */
function chime(ctx: AudioContext, out: AudioNode, t: number): void {
  const notes: readonly [number, number][] = [[1318.5, 0], [1975.5, 0.11]];
  for (const [freq, delay] of notes) {
    tone(ctx, out, { type: "sine", freq, start: t + delay, attack: 0.004, decay: 0.9, peak: 0.28 });
    tone(ctx, out, { type: "sine", freq: freq * 2, start: t + delay, attack: 0.004, decay: 0.45, peak: 0.07 });
  }
}

/** Mechanical truck-radio detent click followed by a brief bandpass static squelch. */
function dial(ctx: AudioContext, out: AudioNode, t: number): void {
  tone(ctx, out, { type: "triangle", freq: 2400, freqEnd: 900, start: t, attack: 0.002, decay: 0.018, peak: 0.22 });
  const src = ctx.createBufferSource();
  const band = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  src.buffer = noiseBuffer(ctx);
  band.type = "bandpass";
  band.frequency.setValueAtTime(1800, t);
  band.Q.setValueAtTime(2.5, t);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(0.14, t + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
  src.connect(band);
  band.connect(gain);
  gain.connect(out);
  src.start(t);
  src.stop(t + 0.15);
}

/** Crisp metallic ticket-punch snap and cardstock pop. */
function punch(ctx: AudioContext, out: AudioNode, t: number): void {
  tone(ctx, out, { type: "triangle", freq: 2600, freqEnd: 880, start: t, attack: 0.001, decay: 0.038, peak: 0.34 });
  burst(ctx, out, t, 0.025, 4200, 0.22);
}

/** Warm sodium-vapor relay clunk and subtle transformer hum. */
function lights(ctx: AudioContext, out: AudioNode, t: number): void {
  tone(ctx, out, { type: "sine", freq: 110, freqEnd: 120, start: t, attack: 0.02, decay: 0.48, peak: 0.28 });
  burst(ctx, out, t, 0.03, 950, 0.24);
}

/** Wooden stake and rope-snap click for trail closure toggles. */
function rope(ctx: AudioContext, out: AudioNode, t: number): void {
  tone(ctx, out, { type: "triangle", freq: 620, freqEnd: 290, start: t, attack: 0.002, decay: 0.09, peak: 0.28 });
  burst(ctx, out, t, 0.04, 1800, 0.14);
}

/** Warm two-tone school-bus morning chime. */
function bus(ctx: AudioContext, out: AudioNode, t: number): void {
  tone(ctx, out, { type: "triangle", freq: 523.25, start: t, attack: 0.01, decay: 0.22, peak: 0.26 });
  tone(ctx, out, { type: "triangle", freq: 659.25, start: t + 0.14, attack: 0.01, decay: 0.34, peak: 0.26 });
}

export const SYNTH: Record<SoundId, (ctx: AudioContext, out: AudioNode, t: number) => void> = {
  tap,
  thunk,
  sting,
  chime,
  dial,
  punch,
  lights,
  rope,
  bus,
};

export type BedMood = "day" | "night";

/** What the wind bed does in each mood: a cutoff and a level it drifts around. */
export const BED_LEVELS: Record<BedMood, { cutoff: number; gain: number }> = {
  day: { cutoff: 650, gain: 0.5 },
  night: { cutoff: 380, gain: 0.32 },
};

export type Bed = { stop: (ctx: AudioContext) => void; setMood: (ctx: AudioContext, mood: BedMood) => void };

/** Soft wind: looped noise through a low-pass whose cutoff and level drift slowly. */
export function startBed(ctx: AudioContext, out: AudioNode, mood: BedMood): Bed {
  const now = ctx.currentTime;
  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const level = ctx.createGain();
  const lfo = ctx.createOscillator();
  const lfoDepth = ctx.createGain();
  const swell = ctx.createOscillator();
  const swellDepth = ctx.createGain();
  src.buffer = noiseBuffer(ctx);
  src.loop = true;
  filter.type = "lowpass";
  filter.Q.setValueAtTime(0.8, now);
  const first = BED_LEVELS[mood];
  filter.frequency.setValueAtTime(first.cutoff, now);
  level.gain.setValueAtTime(0.0001, now);
  level.gain.linearRampToValueAtTime(first.gain, now + 2.5);
  // The cutoff drifts by 220 Hz every 14 s and the level swells by 0.12 every 23 s.
  lfo.frequency.setValueAtTime(1 / 14, now);
  lfoDepth.gain.setValueAtTime(220, now);
  swell.frequency.setValueAtTime(1 / 23, now);
  swellDepth.gain.setValueAtTime(0.12, now);
  lfo.connect(lfoDepth);
  lfoDepth.connect(filter.frequency);
  swell.connect(swellDepth);
  swellDepth.connect(level.gain);
  src.connect(filter);
  filter.connect(level);
  level.connect(out);
  src.start();
  lfo.start();
  swell.start();
  return {
    setMood(c, next) {
      const m = BED_LEVELS[next];
      filter.frequency.setTargetAtTime(m.cutoff, c.currentTime, 1.5);
      level.gain.setTargetAtTime(m.gain, c.currentTime, 1.5);
    },
    stop(c) {
      const t = c.currentTime;
      level.gain.cancelScheduledValues(t);
      level.gain.setTargetAtTime(0.0001, t, 0.25);
      const end = t + 1.2;
      src.stop(end);
      lfo.stop(end);
      swell.stop(end);
    },
  };
}
