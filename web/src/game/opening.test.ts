import { describe, expect, it } from "vitest";
import { referencePaint } from "./__fixtures__/built-hill";
import { REFERENCE_TOPS } from "./descent";
import { isLiftOperational, stepLifts } from "./lifts";
import { migrate } from "./migrations";
import * as rules from "./rules";
import { makeGuest } from "./sim";
import { createInitialState, SAVE_VERSION, toPersisted } from "./state";
import { TERRAIN } from "./terrain";

const tow = { type: "surface" as const, bottom: TERRAIN.base, top: REFERENCE_TOPS[0] };
const lease = () => rules.pickFounder(createInitialState(42), "elena");

describe("Dutch Hill opening", () => {
  it("starts with only the lodge and blocks operation and discretionary spending", () => {
    const state = lease();
    expect(state).toMatchObject({
      dayIndex: 1, paused: true, lodgeTier: 1, lifts: [], trails: [], assets: [],
      buildings: [], clearedCells: [], guns: [],
    });
    expect(rules.openingStep(state)).toBe("lift");
    expect(rules.togglePause(state)).toBe(state);
    expect(rules.skipToClose(state)).toBe(state);
    expect(rules.placeAsset(state, "cafe", TERRAIN.base)).toBe(state);
    expect(rules.beginLodgeUpgrade(state)).toBe(state);
    expect(migrate(toPersisted(state), SAVE_VERSION).reset).toBe(false);
  });

  it("builds no automatic trail and refunds the first lift at the same minute", () => {
    const state = lease();
    const built = rules.placeLift(state, tow);
    expect(built.lifts).toHaveLength(1);
    expect(built.trails).toEqual([]);
    expect(built.clearedCells).toEqual([]);
    expect(rules.openingStep(built)).toBe("trail");
    expect(rules.togglePause(built)).toBe(built);
    expect(rules.skipToClose(built)).toBe(built);
    expect(rules.cutTrail(built, 0, 0)).toBe(built);
    expect(rules.placeLift(built, { ...tow, top: REFERENCE_TOPS[1] })).toBe(built);
    expect(rules.undoLift(built)).toEqual(state);
    expect(migrate(toPersisted(built), SAVE_VERSION).reset).toBe(false);
  });

  it("loads guests only once a paid brush trail connects the lift to the base", () => {
    const built = rules.placeLift(lease(), tow);
    const guest = makeGuest({ state: "queue" });
    expect(stepLifts([guest], built.lifts, [], [], 600, 10).waits).toHaveLength(0);
    const painted = rules.commitPaint(built, referencePaint(built, 0, "green"));
    expect(painted.trails).toHaveLength(1);
    expect(painted.trails[0]).toMatchObject({ liftIndex: 0, open: true, difficulty: "green" });
    expect(painted.clearedCells.length).toBeGreaterThan(0);
    expect(painted.cash).toBeLessThan(built.cash);
    expect(rules.openingStep(painted)).toBeNull();
    expect(rules.undoLift(painted)).toBe(painted);
    expect(rules.undoTrail(painted)).toEqual(built);
    expect(stepLifts([guest], painted.lifts, painted.trails, [], 600, 10).guests[0].state).toBe("ride");
    expect(rules.tick(rules.togglePause(painted), 500).clockMin).toBeGreaterThan(painted.clockMin);
    expect(rules.skipToClose(painted).dayStats.completedRuns).toBeGreaterThan(0);
  });

  it("charges for a completed multi-stroke draft and refunds the same clearing on undo", () => {
    const lift = rules.placeLift(lease(), tow);
    const [reference] = referencePaint(lift, 0, "green");
    const seam = Math.floor(reference.points.length / 2);
    const first = { ...reference, points: reference.points.slice(0, seam + 1) };
    const second = { ...reference, widthFt: 100, points: reference.points.slice(seam) };

    expect(rules.checkPaint(lift, [first]).reason).toBeNull();
    const quote = rules.checkPaint(lift, [first, second]);
    expect(quote.reason).toBeNull();
    const cut = rules.commitPaint(lift, [first, second]);
    expect(cut.trails[0]).toMatchObject({ path: quote.path, widths: quote.widths });
    expect(cut.cash).toBe(lift.cash - quote.cost);
    expect(rules.undoTrail(cut)).toEqual(lift);
  });

  it("does not charge for a width edit followed by a detached stroke", () => {
    const lift = rules.placeLift(lease(), tow);
    const opened = rules.commitPaint(lift, referencePaint(lift, 0, "green"));
    const path = opened.trails[0].path;
    const edits = [
      { points: path.slice(0, 10), widthFt: 100 },
      { points: [{ x: 30, z: 40 }, TERRAIN.base], widthFt: 150 },
    ];

    expect(rules.checkPaint(opened, edits.slice(0, 1)).cost).toBeGreaterThan(0);
    expect(rules.checkPaint(opened, edits).reason).toMatch(/over the same trail/i);
    expect(rules.commitPaint(opened, edits)).toBe(opened);
  });

  it("marks a glade without clearing trees and preserves it in a save", () => {
    const lift = rules.placeLift(lease(), tow);
    const strokes = referencePaint(lift, 0, "green");
    const quote = rules.checkPaint(lift, strokes, true);
    expect(quote.reason).toBeNull();
    expect(quote.cleared.newCells).toEqual([]);
    const marked = rules.commitPaint(lift, strokes, true);
    expect(marked.trails[0].glade).toBe(true);
    expect(marked.clearedCells).toEqual(lift.clearedCells);
    expect(marked.cash).toBe(lift.cash - quote.cost);
    expect(migrate(toPersisted(marked), SAVE_VERSION)).toMatchObject({ reset: false, state: { trails: [{ glade: true }] } });
    expect(rules.undoTrail(marked)).toEqual(lift);
  });

  it("opens a new winter with the same founder and the original undeveloped hill", () => {
    const built = rules.placeLift(lease(), tow);
    const painted = rules.commitPaint(built, referencePaint(built, 0, "green"));
    const next = rules.startNewSeason(painted);
    expect(next).toMatchObject({ founderId: "elena", cash: 12000, lifts: [], trails: [], clearedCells: [], assets: [], dayIndex: 1 });
    expect(rules.openingStep(next)).toBe("lift");
    expect(painted.lifts.some((lift, i) => isLiftOperational(lift, i, painted.trails))).toBe(true);
  });
});
