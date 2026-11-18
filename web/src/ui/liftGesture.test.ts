import { describe, expect, it } from "vitest";
import { createBuiltHill } from "@/game/__fixtures__/built-hill";
import { rulesFor, REFERENCE_TOPS } from "@/game/descent";
import { pickFounder } from "@/game/rules";
import { TERRAIN } from "@/game/terrain";
import { BOTTOM_GRAB_FACTOR, liftBottomAt, liftReadout, liftTopAt, resolveLiftGrab } from "./liftGesture";

const R = rulesFor(TERRAIN).baseAreaRadius;
const base = TERRAIN.base;
const SNAP = 1;
const state = { ...pickFounder(createBuiltHill(7), "elena"), cash: 50000, lifts: [] };

describe("resolveLiftGrab", () => {
  it("sets the bottom from a press inside the base disc, then the drag sets the top", () => {
    expect(resolveLiftGrab({ x: base.x + R * 0.5, z: base.z }, {}, SNAP)).toBe("base-then-top");
  });

  it("drags the top from the current bottom when the press is outside the base", () => {
    expect(resolveLiftGrab({ x: base.x + R + 3, z: base.z }, {}, SNAP)).toBe("top");
  });

  it("moves the top when the press is within the snap radius of the top terminal", () => {
    const top = REFERENCE_TOPS[0];
    expect(resolveLiftGrab({ x: top.x + 0.5, z: top.z }, { top, bottom: base }, SNAP)).toBe("top");
  });

  it("moves an existing bottom when the press is within 1.2 times the snap radius of it", () => {
    const top = REFERENCE_TOPS[0];
    const press = { x: base.x + SNAP * BOTTOM_GRAB_FACTOR * 0.95, z: base.z };
    expect(resolveLiftGrab(press, { top, bottom: base }, SNAP)).toBe("bottom");
  });

  it("prefers the top terminal when both ends are in reach", () => {
    expect(resolveLiftGrab(base, { top: base, bottom: base }, SNAP)).toBe("top");
  });
});

describe("liftBottomAt", () => {
  it("keeps a point inside the base and clamps one outside it", () => {
    const inside = liftBottomAt({ x: base.x + 0.4, z: base.z });
    expect(Math.hypot(inside.x - base.x, inside.z - base.z)).toBeLessThan(R);
    const outside = liftBottomAt({ x: base.x + R * 3, z: base.z });
    expect(Math.hypot(outside.x - base.x, outside.z - base.z)).toBeLessThan(R);
  });
});

describe("liftTopAt", () => {
  it("snaps to a valid anchor near the pointer", () => {
    const anchor = REFERENCE_TOPS[0];
    const result = liftTopAt(state, "surface", base, { x: anchor.x + 0.1, z: anchor.z }, 1, [anchor]);
    expect(result).toEqual({ top: anchor, snapped: true });
  });

  it("follows the pointer when no anchor is in reach", () => {
    const point = { x: base.x + 2, z: base.z + 2 };
    const result = liftTopAt(state, "surface", base, point, 0.5, [REFERENCE_TOPS[0]]);
    expect(result.snapped).toBe(false);
  });
});

describe("liftReadout", () => {
  it("reports figures for a valid line and a reason for an invalid one", () => {
    const good = liftReadout(state, "surface", { bottom: base, top: REFERENCE_TOPS[0] });
    expect(good.ok).toBe(true);
    expect(good.lengthFt).toBeGreaterThan(0);
    expect(good.cost).toBeGreaterThan(0);
    expect(good.problem).toBeNull();
    const bad = liftReadout(state, "surface", { bottom: base, top: { x: base.x + 0.2, z: base.z } });
    expect(bad.ok).toBe(false);
    expect(bad.problem).toBeTruthy();
  });
});
