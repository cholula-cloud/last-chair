import { describe, expect, it } from "vitest";
import { MAX_PAINTED_PITCH } from "./paintedTrail";
import {
  CONTOUR_INTERVAL_FT,
  SLOPE_LEGEND,
  feetAboveBase,
  getOverlayLayer,
  nextSelection,
  overlayLayers,
  pitchAt,
  resolveActiveLayer,
  slopeBand,
  slopeReadout,
} from "./overlays";
import { TERRAIN } from "./terrain";
import { BLUE_MAX_PITCH, GREEN_MAX_PITCH, classifyPitch } from "./trails";

describe("slope bands", () => {
  it("uses the painted-trail thresholds", () => {
    expect(slopeBand(0)).toBe("green");
    expect(slopeBand(GREEN_MAX_PITCH)).toBe("green");
    expect(slopeBand(GREEN_MAX_PITCH + 0.001)).toBe("blue");
    expect(slopeBand(BLUE_MAX_PITCH)).toBe("blue");
    expect(slopeBand(BLUE_MAX_PITCH + 0.001)).toBe("black");
    expect(slopeBand(MAX_PAINTED_PITCH)).toBe("black");
    expect(slopeBand(MAX_PAINTED_PITCH + 0.001)).toBe("double-black");
  });
  it("agrees with classifyPitch below double black", () => {
    for (const p of [0.05, 0.2, 0.3, 0.44, 0.5, 0.6]) {
      const band = slopeBand(p);
      expect(band === "double-black" ? "black" : band).toBe(classifyPitch(p));
    }
  });
  it("treats bad numbers as flat", () => {
    expect(slopeBand(NaN)).toBe("green");
    expect(slopeBand(-1)).toBe("green");
  });
  it("gives every band a distinct colour and pattern", () => {
    expect(new Set(SLOPE_LEGEND.map((e) => e.pattern)).size).toBe(SLOPE_LEGEND.length);
    expect(new Set(SLOPE_LEGEND.map((e) => e.color)).size).toBe(SLOPE_LEGEND.length);
  });
  it("uses a fixed contour interval", () => {
    expect(CONTOUR_INTERVAL_FT).toBe(50);
  });
});

describe("slope readout", () => {
  const ctx = { terrain: TERRAIN };
  it("reports pitch and band for a point on the lease", () => {
    const at = { x: 0.45, z: 2.55 };
    const r = slopeReadout(at, ctx);
    const pct = Math.round(pitchAt(at) * 100);
    expect(r.chips[0]).toBe(`${pct}% pitch`);
    expect(r.entry).toBe(slopeBand(pitchAt(at)));
    expect(r.headline).toMatch(/^This ground is /);
    expect(r.headline).not.toMatch(/—|·/);
  });
  it("says so outside the lease", () => {
    const r = slopeReadout({ x: 500, z: 500 }, ctx);
    expect(r.headline).toBe("This ground is outside the Dutch Hill lease.");
    expect(r.chips).toEqual([]);
  });
  it("reports height above the base in tens of feet", () => {
    const ft = feetAboveBase({ x: -1.1 * 6, z: -2 * 6 });
    expect(ft % 10).toBe(0);
    expect(ft).toBeGreaterThan(0);
  });
});

describe("layer registry", () => {
  it("lists every implemented layer, with unique ids and non-zero modes", () => {
    const layers = overlayLayers();
    expect(layers.map((l) => l.id)).toEqual(["slope","depth","guns","conditions"]);
    expect(new Set(layers.map((l) => l.mode)).size).toBe(layers.length);
    expect(layers.every((l) => l.mode > 0 && l.legend.length > 0)).toBe(true);
  });
  it("looks layers up by id", () => {
    expect(getOverlayLayer("slope")?.label).toBe("Slope");
    expect(getOverlayLayer(null)).toBeUndefined();
  });
  it("shows one layer at a time and toggles it off on a second pick", () => {
    expect(nextSelection(null, "slope")).toBe("slope");
    expect(nextSelection("slope", "slope")).toBeNull();
  });
  it("shows slope automatically while painting unless turned off", () => {
    expect(resolveActiveLayer(null, false, true)).toBe("slope");
    expect(resolveActiveLayer(null, true, true)).toBeNull();
    expect(resolveActiveLayer(null, false, false)).toBeNull();
    expect(resolveActiveLayer("slope", false, false)).toBe("slope");
  });
});
