import { describe, expect, it } from "vitest";
import { isAudible, mixGains, sliderGain, type MixInput } from "./mix";

const ON: MixInput = { soundOn: true, masterVolume: 100, effectsVolume: 100, ambienceVolume: 100, voiceOn: true, voiceVolume: 100 };

describe("mixGains", () => {
  it("passes full sliders through at unity", () => {
    expect(mixGains(ON)).toEqual({ master: 1, effects: 1, ambience: 1, voice: 1 });
  });

  it("silences every bus through master when Sound is off", () => {
    const g = mixGains({ ...ON, soundOn: false });
    expect(g.master).toBe(0);
    for (const bus of ["effects", "ambience", "voice"] as const) expect(isAudible(g, bus)).toBe(false);
  });

  it("turns off only the voice bus when Voice is off", () => {
    const g = mixGains({ ...ON, voiceOn: false });
    expect(isAudible(g, "voice")).toBe(false);
    expect(isAudible(g, "effects")).toBe(true);
    expect(isAudible(g, "ambience")).toBe(true);
  });

  it("lets each slider silence its own bus", () => {
    expect(isAudible(mixGains({ ...ON, effectsVolume: 0 }), "effects")).toBe(false);
    expect(isAudible(mixGains({ ...ON, effectsVolume: 0 }), "ambience")).toBe(true);
    expect(isAudible(mixGains({ ...ON, ambienceVolume: 0 }), "ambience")).toBe(false);
    expect(isAudible(mixGains({ ...ON, masterVolume: 0 }), "effects")).toBe(false);
  });

  it("uses a squared taper and clamps bad input", () => {
    expect(sliderGain(50)).toBeCloseTo(0.25);
    expect(sliderGain(-10)).toBe(0);
    expect(sliderGain(400)).toBe(1);
    expect(sliderGain(Number.NaN)).toBe(0);
  });
});
