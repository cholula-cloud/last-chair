import {
  BED_MANIFEST_ID,
  EFFECT_MANIFEST_ID,
  manifestEntry,
  type ManifestEntry,
} from "./manifest";
import type { Bed, BedMood, SoundId } from "./synth";

export type SampleBed = Bed & { mood: BedMood };

function audioUrl(basePath: string, file: string): string {
  const root = basePath.replace(/\/$/, "");
  return `${root}/audio/${file}`;
}

async function fetchDecode(ctx: AudioContext, url: string): Promise<AudioBuffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.arrayBuffer();
    return await ctx.decodeAudioData(data.slice(0));
  } catch {
    return null;
  }
}

function playBuffer(ctx: AudioContext, out: AudioNode, buffer: AudioBuffer, when: number, peak = 1): void {
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  src.buffer = buffer;
  gain.gain.setValueAtTime(peak, when);
  src.connect(gain);
  gain.connect(out);
  src.start(when);
  src.stop(when + buffer.duration + 0.05);
}

function startSampleBed(ctx: AudioContext, out: AudioNode, buffer: AudioBuffer, entry: ManifestEntry, mood: BedMood): SampleBed {
  const now = ctx.currentTime;
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  src.buffer = buffer;
  src.loop = true;
  if (entry.loopStart != null && entry.loopStart > 0) src.loopStart = entry.loopStart;
  if (entry.loopEnd != null && entry.loopEnd > 0) src.loopEnd = entry.loopEnd;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.85, now + 1.5);
  src.connect(gain);
  gain.connect(out);
  src.start();
  return {
    mood,
    setMood(c, next) {
      if (next === mood) return;
      gain.gain.setTargetAtTime(0.0001, c.currentTime, 0.4);
      const end = c.currentTime + 1.5;
      src.stop(end);
    },
    stop(c) {
      const t = c.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setTargetAtTime(0.0001, t, 0.25);
      src.stop(t + 1.2);
    },
  };
}

export function createSampleLibrary(basePath: string) {
  const buffers = new Map<string, AudioBuffer>();
  let effectsStarted = false;
  let bedsStarted = false;

  async function loadIds(ctx: AudioContext, ids: readonly string[]): Promise<void> {
    await Promise.all(
      ids.map(async (id) => {
        const entry = manifestEntry(id);
        if (!entry?.file || entry.bytes <= 0 || buffers.has(id)) return;
        const buffer = await fetchDecode(ctx, audioUrl(basePath, entry.file));
        if (buffer) buffers.set(id, buffer);
      }),
    );
  }

  return {
    hasEffect(id: SoundId): boolean {
      const manifestId = EFFECT_MANIFEST_ID[id];
      return manifestId ? buffers.has(manifestId) : false;
    },
    hasBed(mood: BedMood): boolean {
      return buffers.has(BED_MANIFEST_ID[mood]);
    },
    async loadEffects(ctx: AudioContext): Promise<void> {
      if (effectsStarted) return;
      effectsStarted = true;
      const ids = [...new Set(Object.values(EFFECT_MANIFEST_ID).filter((v): v is string => Boolean(v)))];
      await loadIds(ctx, ids);
    },
    async loadBeds(ctx: AudioContext): Promise<void> {
      if (bedsStarted) return;
      bedsStarted = true;
      await loadIds(ctx, Object.values(BED_MANIFEST_ID));
    },
    playEffect(ctx: AudioContext, out: AudioNode, id: SoundId, when: number): boolean {
      const manifestId = EFFECT_MANIFEST_ID[id];
      if (!manifestId) return false;
      const buffer = buffers.get(manifestId);
      if (!buffer) return false;
      playBuffer(ctx, out, buffer, when);
      return true;
    },
    startBed(ctx: AudioContext, out: AudioNode, mood: BedMood): Bed | null {
      const manifestId = BED_MANIFEST_ID[mood];
      const buffer = buffers.get(manifestId);
      const entry = manifestEntry(manifestId);
      if (!buffer || !entry) return null;
      return startSampleBed(ctx, out, buffer, entry, mood);
    },
    resetForTests(): void {
      buffers.clear();
      effectsStarted = false;
      bedsStarted = false;
    },
  };
}
