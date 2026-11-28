import { describe, expect, it } from "vitest";
import { createBuiltHill } from "./__fixtures__/built-hill";
import { trailToggleProblem, toggleTrailOpen, pickFounder } from "./rules";
import { createInitialState } from "./state";

describe("quick daytime trail rope-off", () => {
  it("blocks roping off the last open trail on a single-lift hill and allows it when another trail is open", () => {
    const built = createBuiltHill();
    const oneTrail = {
      ...pickFounder(createInitialState(7, "dutch_hill"), "elena"),
      lifts: built.lifts,
      trails: [built.trails[0]],
    };
    expect(trailToggleProblem(oneTrail, 0)).toMatch(/one trail open/i);
    expect(toggleTrailOpen(oneTrail, 0)).toBe(oneTrail);

    const twoTrails = {
      ...oneTrail,
      trails: [built.trails[0], { ...built.trails[0], name: "Upper Spur" }],
    };
    expect(trailToggleProblem(twoTrails, 1)).toBeNull();
    const roped = toggleTrailOpen(twoTrails, 1);
    expect(roped.trails[1].open).toBe(false);
    expect(roped.trails[0].open).toBe(true);

    const reopened = toggleTrailOpen(roped, 1);
    expect(reopened.trails[1].open).toBe(true);
  });
});
