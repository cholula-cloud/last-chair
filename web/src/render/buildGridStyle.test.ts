import { describe, expect, it } from "vitest";
import { ANCHOR_STYLE, dotRadius, dotStyle, GRID_STYLE } from "./buildGridStyle";
import { PALETTE } from "./palette";

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const mix = (a: string, b: string, t: number) => "#" + [1, 3, 5].map((i) =>
  Math.round(parseInt(a.slice(i, i + 2), 16) * t + parseInt(b.slice(i, i + 2), 16) * (1 - t)).toString(16).padStart(2, "0")).join("");
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe("build grid style", () => {
  it("gives overview, asset and gun the same radius and the lift guide a smaller one", () => {
    expect(dotRadius("overview")).toBe(dotRadius("asset"));
    expect(dotRadius("asset")).toBe(dotRadius("gun"));
    expect(dotRadius("lift")).toBeLessThan(dotRadius("asset"));
    expect(dotRadius("lift")).toBeLessThan(ANCHOR_STYLE.dotRadius);
  });

  it("uses one valid style in asset and gun mode, and neutral in overview", () => {
    expect(dotStyle("asset", "valid")).toEqual(dotStyle("gun", "valid"));
    expect(dotStyle("asset", "blocked")).toEqual(dotStyle("gun", "blocked"));
    expect(dotStyle("overview", "neutral")).toEqual(GRID_STYLE.neutral);
  });

  it("draws blocked cells fainter than valid ones, and the lift guide dimmer than the field", () => {
    expect(dotStyle("asset", "blocked").opacity).toBeLessThan(dotStyle("asset", "valid").opacity);
    expect(dotStyle("lift", "valid").opacity).toBeLessThan(dotStyle("asset", "valid").opacity);
    expect(dotStyle("lift", "valid", true).opacity).toBeLessThan(dotStyle("lift", "valid").opacity);
  });

  it("keeps the reach ring thinner than the dots and the anchors the strongest mark", () => {
    expect(GRID_STYLE.reach.opacity).toBeGreaterThan(GRID_STYLE.reachSnapped.opacity);
    expect(GRID_STYLE.reachSnapped.opacity).toBeGreaterThan(GRID_STYLE.liftSnapped.opacity * 0.9);
    expect(dotRadius("lift")).toBeLessThanOrEqual(0.16);
    expect(dotStyle("lift", "valid").opacity).toBeLessThanOrEqual(0.45);
  });

  it("keeps valid and neutral dots readable on snow, and blocked dots a faint trace", () => {
    const snow = PALETTE.snow;
    const read = (kind: "valid" | "neutral" | "blocked") => {
      const s = dotStyle("asset", kind);
      return contrast(mix(s.color, snow, s.opacity), snow);
    };
    expect(read("valid")).toBeGreaterThanOrEqual(1.7);
    expect(read("neutral")).toBeGreaterThanOrEqual(1.7);
    expect(read("blocked")).toBeGreaterThan(1.1);
    expect(read("blocked")).toBeLessThan(read("valid"));
  });
});
