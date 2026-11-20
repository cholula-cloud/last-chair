import { describe, expect, it } from "vitest";
import { DAY_END_MIN, DAY_START_MIN } from "@/game/types";
import { PALETTE } from "./palette";
import {
  lightRig,
  sunAzimuthDeg,
  sunDirection,
  sunElevationDeg,
  type Rig,
  type RigInput,
} from "./lighting";

const scale = { horizontal: 6 };

const emptyRig = (): Rig => ({
  sunDir: [0, 0, 0],
  sunColor: "",
  sunIntensity: 0,
  hemiSky: "",
  hemiGround: "",
  hemiIntensity: 0,
  skyTop: "",
  skyHorizon: "",
  fogNear: 0,
  fogFar: 0,
  exposure: 0,
  glow: 0,
  shadowStrength: 0,
});

function rig(input: RigInput, out?: Rig): Rig {
  return lightRig(input, scale, out ?? emptyRig());
}

describe("lightRig", () => {
  it("keeps elevation at least 10 degrees from opening to close", () => {
    for (let m = DAY_START_MIN; m <= DAY_END_MIN; m++) {
      const r = rig({ clockMin: m, night: 0, weather: "clear" });
      const el = sunElevationDeg(r.sunDir[0], r.sunDir);
      expect(el).toBeGreaterThanOrEqual(10 - 1e-6);
    }
  });

  it("moves azimuth monotonically through the day", () => {
  let prev = sunAzimuthDeg(rig({ clockMin: DAY_START_MIN, night: 0, weather: "clear" }).sunDir);
    for (let m = DAY_START_MIN + 1; m <= DAY_END_MIN; m++) {
      const az = sunAzimuthDeg(rig({ clockMin: m, night: 0, weather: "clear" }).sunDir);
      expect(az).toBeGreaterThanOrEqual(prev - 1e-6);
      prev = az;
    }
  });

  it("returns the night column exactly when night is 1", () => {
    const r = rig({ clockMin: 12 * 60, night: 1, weather: "clear" });
    expect(r.sunColor).toBe(PALETTE.sunNight);
    expect(r.sunIntensity).toBe(0.35);
    expect(r.hemiSky).toBe(PALETTE.hemiSkyNight);
    expect(r.hemiGround).toBe(PALETTE.hemiGroundNight);
    expect(r.hemiIntensity).toBe(0.75);
    expect(r.skyTop).toBe(PALETTE.nightSkyTop);
    expect(r.skyHorizon).toBe(PALETTE.nightHorizon);
    expect(r.exposure).toBe(0.9);
    expect(r.glow).toBe(1.15);
    const az = sunAzimuthDeg(r.sunDir);
    expect(az).toBeCloseTo(200, 0);
    expect(sunElevationDeg(r.sunDir[0], r.sunDir)).toBeCloseTo(40, 0);
  });

  it("dims the sun on snow days compared to clear at the same minute", () => {
    const noon = 12 * 60;
    const clear = rig({ clockMin: noon, night: 0, weather: "clear" });
    const snow = rig({ clockMin: noon, night: 0, weather: "snow" });
    expect(snow.sunIntensity).toBeLessThan(clear.sunIntensity);
  });

  it("reuses the output object between calls", () => {
    const out = emptyRig();
    expect(rig({ clockMin: 10 * 60, night: 0, weather: "clear" }, out)).toBe(out);
    expect(rig({ clockMin: 15 * 60, night: 0, weather: "clear" }, out)).toBe(out);
  });

  it("produces a unit sun direction", () => {
    const r = rig({ clockMin: 11 * 60, night: 0, weather: "clear" });
    const [x, y, z] = r.sunDir;
    expect(Math.hypot(x, y, z)).toBeCloseTo(1, 5);
    const noon = rig({ clockMin: 12 * 60, night: 0, weather: "clear" }).sunDir;
    const ideal = sunDirection(170, 32);
    expect(noon[0]).toBeCloseTo(ideal[0], 2);
    expect(noon[1]).toBeCloseTo(ideal[1], 2);
    expect(noon[2]).toBeCloseTo(ideal[2], 2);
  });
});