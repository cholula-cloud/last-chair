/** Pure mixer maths: which bus is how loud, and whether anything on it can be heard. */

export type MixInput = {
  /** Master switch. Off silences every bus, voice included. */
  soundOn: boolean;
  /** 0 to 100. */
  masterVolume: number;
  effectsVolume: number;
  ambienceVolume: number;
  voiceOn: boolean;
  voiceVolume: number;
};

export type BusId = "effects" | "ambience" | "voice";
export type Gains = { master: number } & Record<BusId, number>;

/** Slider position to gain. A squared taper puts the useful range across the whole slider. */
export function sliderGain(percent: number): number {
  const unit = Number.isFinite(percent) ? Math.min(1, Math.max(0, percent / 100)) : 0;
  return unit * unit;
}

export function mixGains(s: MixInput): Gains {
  return {
    master: s.soundOn ? sliderGain(s.masterVolume) : 0,
    effects: sliderGain(s.effectsVolume),
    ambience: sliderGain(s.ambienceVolume),
    voice: s.voiceOn ? sliderGain(s.voiceVolume) : 0,
  };
}

/** True when a sound sent to this bus would reach the speakers. */
export function isAudible(g: Gains, bus: BusId): boolean {
  return g.master > 0 && g[bus] > 0;
}
