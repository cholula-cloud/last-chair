import { describe, expect, it } from "vitest";
import { createBuiltHill } from "./__fixtures__/built-hill";
import { pickFounder } from "./rules";
import { openTrailRuns, trailMidpoint, trailReadout, trailsOnLift } from "./trailsOverlay";

describe("trailsOverlay", () => {
  const state = pickFounder(createBuiltHill(77), "elena");

  it("lists open confirmed trails", () => {
    const runs = openTrailRuns(state);
    expect(runs.length).toBeGreaterThan(0);
    expect(trailsOnLift(state, runs[0].liftIndex).every((t) => t.liftIndex === runs[0].liftIndex)).toBe(true);
  });

  it("reads a point on the default trail", () => {
    const run = openTrailRuns(state)[0];
    const r = trailReadout(state, trailMidpoint(run));
    expect(r.headline).toContain(run.name);
  });
});