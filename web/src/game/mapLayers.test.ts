import { describe, expect, it } from "vitest";
import { createBuiltHill } from "./__fixtures__/built-hill";
import {
  segmentCondition,
  overlayModel,
  readPoint,
  segmentAt,
  segmentPath,
  cellMark,
} from "./mapLayers";
import { pickFounder, skipToClose, acknowledgeBeat, sleep } from "./rules";
import { TERRAIN } from "./terrain";
import { gunCoverage, trailSegmentMidpoints } from "./guns";
import { freshTrail, WEAR_PER_RUN } from "./snow";

describe("map layers", () => {
  it("classifies all seven segment surfaces, giving missing cover priority", () => {
    const condition = (
      depth: number,
      quality: number,
      coverage: number,
      groomed = false,
      thaw = false,
      runs = 0,
    ) =>
      segmentCondition(
        { depth, quality, coverage },
        groomed,
        thaw ? "thaw" : "clear",
        730,
        0.2,
        runs,
      );
    expect([
      condition(0, 0.3, 0),
      condition(0.02, 0.3, 0.2),
      condition(0.5, 0.45, 1, false, true),
      condition(0.5, 0.28, 1),
      condition(0.5, 0.8, 1, true),
      condition(0.5, 0.45, 1, false, false, 90),
      condition(0.5, 0.7, 1),
    ]).toEqual(["bare", "thin", "slush", "ice", "fresh", "worn", "powder"]);
  });
  it("maps every drawn segment to its trail and leaves untracked ground neutral", () => {
    const s = createBuiltHill(42);
    for (let j = 0; j < 6; j++)
      expect(segmentAt(s.trails, segmentPath(s.trails[0], j)[6])).toMatchObject(
        { index: 0, segment: j },
      );
    const point = TERRAIN.lease![0];
    expect(
      readPoint(s, overlayModel(s, "Now", "mid"), "depth", point, false).title,
    ).toBe("Not tracked");
  });
  it("reuses physical gun reach, persisted last-night coverage and previous traffic", () => {
    const s = pickFounder(createBuiltHill(42), "elena");
    s.guns = [
      { at: trailSegmentMidpoints(s.trails[0])[3], builtDay: 1, paid: 100 },
    ];
    const night = acknowledgeBeat(skipToClose(s));
    const next = sleep({ ...night, pendingSnow: "high" });
    const trail = next.trails[0],
      model = overlayModel(next, "Now", "high");
    expect(model.trails[0].map((c) => c.reach)).toEqual(
      gunCoverage(trail, s.guns, next.talentsOwned),
    );
    expect(model.trails[0].map((c) => c.reached)).toEqual(trail.gunCovered);
    for (const cell of model.trails[0]) {
      expect(cellMark("guns", cell, false, "Last night")).toBe(
        cell.reached ? "last" : "out",
      );
      for (const service of ["Mid", "High"] as const) {
        const groom = service === "High" ? cell.highGroom : cell.midGroom;
        expect(cellMark("guns", cell, false, service)).toBe(
          cell.reach ? (groom ? "both" : "reach") : groom ? "groom" : "out",
        );
      }
    }
    expect(trail.previousRuns).toBe(night.dayStats.runsByTrail[0]);
    const read = readPoint(
      next,
      model,
      "conditions",
      segmentPath(trail, 3)[6],
      true,
    );
    expect(read.detail).toContain(
      ((trail.previousRuns ?? 0) * WEAR_PER_RUN).toFixed(2),
    );
    expect(read.personas.length).toBeGreaterThan(1);
  });
  it("projects close and forecast-weighted service without changing the save", () => {
    const s = pickFounder(createBuiltHill(91), "elena"),
      before = structuredClone(s);
    const close = skipToClose(s),
      expected = overlayModel(s, "Close", "mid");
    expect(expected.trails[0][0].snow).toEqual(close.trails[0].snow[0]);
    const low = overlayModel(s, "Tomorrow", "minimal"),
      high = overlayModel(s, "Tomorrow", "high");
    expect(high.trails[0].at(-1)!.snow.quality).toBeGreaterThan(
      low.trails[0].at(-1)!.snow.quality,
    );
    expect(high.forecast).not.toBeNull();
    expect(s).toEqual(before);
    expect(
      cellMark("depth", { ...high.trails[0][0], snow: freshTrail(0.1)[0] }),
    ).toBe("breakup");
  });
});
