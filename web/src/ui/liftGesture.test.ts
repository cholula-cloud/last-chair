import { describe, expect, it } from "vitest";
import { createBuiltHill } from "@/game/__fixtures__/built-hill";
import { rulesFor, REFERENCE_TOPS } from "@/game/descent";
import { pickFounder } from "@/game/rules";
import { TERRAIN } from "@/game/terrain";
import {
  BOTTOM_GRAB_FACTOR, liftBottomAt, liftDrag, liftPress, liftReadout, liftTopAt, resolveLiftGrab,
} from "./liftGesture";

const R = rulesFor(TERRAIN).baseAreaRadius;
const base = TERRAIN.base;
const SNAP = 1;
const state = { ...pickFounder(createBuiltHill(7), "elena"), cash: 50000, lifts: [] };

describe("resolveLiftGrab", () => {
  it("sets the bottom from a press inside the base disc, then the drag sets the top", () => {
    expect(resolveLiftGrab({ x: base.x + R * 0.5, z: base.z }, {}, SNAP)).toBe("base-then-top");
  });

  it("sets the top from the current bottom when the press is outside the base", () => {
    expect(resolveLiftGrab({ x: base.x + R + 3, z: base.z }, {}, SNAP)).toBe("new-top");
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

describe("liftPress and liftDrag", () => {
  const anchors = [REFERENCE_TOPS[0]];
  const top = REFERENCE_TOPS[0];

  it("clears the old top and snap when a base press sets the bottom", () => {
    const { grab, patch } = liftPress(state, "surface", { top, bottom: base }, { x: base.x + 0.3, z: base.z }, 0.2, anchors);
    expect(grab).toBe("base-then-top");
    expect("top" in patch && patch.top === undefined).toBe(true);
    expect(patch.snapped).toBe(false);
    expect(patch.bottom).toBeDefined();
  });

  it("leaves the top untouched on a press at the top terminal", () => {
    const { grab, patch } = liftPress(state, "surface", { top, bottom: base }, { x: top.x + 0.3, z: top.z }, 1, anchors);
    expect(grab).toBe("top");
    expect(patch).not.toHaveProperty("top");
    expect(patch).not.toHaveProperty("bottom");
    expect(patch).not.toHaveProperty("snapped");
  });

  it("applies the grab offset when the finger then moves", () => {
    const press = { x: top.x + 0.3, z: top.z };
    const { grab, offset } = liftPress(state, "surface", { top, bottom: base }, press, 1, anchors);
    const patch = liftDrag(state, "surface", grab, offset, { bottom: base }, press, 1, anchors);
    expect(patch.top).toEqual(top);
    expect(patch.snapped).toBe(true);
  });

  it("sets the top at the press point for a new top", () => {
    const point = { x: top.x, z: top.z };
    const { grab, patch } = liftPress(state, "surface", {}, point, 1, anchors);
    expect(grab).toBe("new-top");
    expect(patch.top).toEqual(top);
  });
});
