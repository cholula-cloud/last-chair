import { describe, expect, it } from "vitest";
import { referencePaint } from "./__fixtures__/built-hill";
import { REFERENCE_TOPS } from "./descent";
import { isLiftOperational, stepLifts } from "./lifts";
import { migrate } from "./migrations";
import { newReplay, playReplay } from "./replay";
import { checkPaint, closeLift, commitPaint, liftClosureProblem, pickFounder, placeLift, tick, undoLift } from "./rules";
import { makeGuest } from "./sim";
import { WEAR_PER_RUN } from "./snow";
import { createInitialState, SAVE_VERSION, toPersisted } from "./state";
import { TERRAIN } from "./terrain";
import { pickSkiRoute } from "./trailNetwork";
import { MS_PER_GAME_MINUTE } from "./types";
import { placeGuests } from "@/render/guestPlacement";

function bypass() {
  const lift = placeLift(pickFounder(createInitialState(42), "elena"), {
    type: "surface", bottom: TERRAIN.base, top: REFERENCE_TOPS[0],
  });
  const initial = commitPaint(lift, referencePaint(lift, 0, "green"));
  const [main] = initial.trails;
  const pointAt = (fraction: number) => main.path[Math.floor(main.path.length * fraction)];
  const bend = (fraction: number) => {
    const at = pointAt(fraction);
    return { x: at.x + 4, z: at.z };
  };
  const strokes = [{ points: [pointAt(0.3), bend(0.45), bend(0.6), pointAt(0.8)], widthFt: 60 }];
  const built = commitPaint(initial, strokes);
  return { initial, built, strokes };
}

describe("connected trail laps", () => {
  it("unloads onto the lift's upper trail, traverses a bypass, and records one descent with segment wear", () => {
    const { built } = bypass();
    expect(built.trails).toHaveLength(2);
    const [lift] = built.lifts;
    expect(isLiftOperational(lift, 0, built.trails)).toBe(true);
    expect(isLiftOperational(lift, 0, [built.trails[1]])).toBe(false);
    const ids = Array.from({ length: 50 }, (_, i) => `g${i}`);
    const id = ids.find((id) => pickSkiRoute("regular", built.trails, 0, id, 0).length === 3)!;
    expect(id).toBeDefined();
    const route = pickSkiRoute("regular", built.trails, 0, id, 0);
    const [upper, middle, lower] = route;
    expect(route.map((leg) => leg.trailIndex)).toEqual([0, 1, 0]);
    expect(upper.to).toBeLessThan(lower.from);
    expect(middle.from).toBeGreaterThan(0);
    expect(middle.to).toBe(1);
    expect(pickSkiRoute("regular", built.trails, 0, id, 0)).toEqual(route);

    const rider = makeGuest({ id, persona: "regular", state: "ride", liftIndex: 0, rideStartMin: 570, targetRuns: 1 });
    const clockMin = 600;
    const { guests } = stepLifts([rider], built.lifts, built.trails, [], clockMin, 0.5);
    expect(guests[0]).toMatchObject({ state: "ski", trailIndex: 0, skiRoute: { legs: route, current: 0 } });
    const path = built.trails.map((trail) => trail.path);
    const lines = [{ line: { top: lift.anchor, bottom: lift.bottom ?? TERRAIN.base }, type: lift.type }];
    const arriving = placeGuests([{ ...guests[0], progress: 1 }], lines, new Map(), path)[0];
    const leaving = placeGuests([{
      ...guests[0], trailIndex: 1, skiRoute: { legs: route, current: 1, snowFt: 0, distanceFt: 0 },
    }], lines, new Map(), path)[0];
    expect(arriving.x).toBeCloseTo(leaving.x, 8);
    expect(arriving.z).toBeCloseTo(leaving.z, 8);

    const start = { ...built, paused: false, clockMin, guests };
    let onBypass = start;
    for (let i = 0; i < 30 && onBypass.guests[0].trailIndex !== 1; i++) {
      onBypass = tick(onBypass, 0.5 * MS_PER_GAME_MINUTE);
    }
    expect(onBypass.guests[0]).toMatchObject({ runs: 0, trailIndex: 1, skiRoute: { current: 1 } });
    expect(onBypass.dayStats.completedRuns).toBe(0);
    expect(onBypass.dayStats.runsByTrail).toEqual([1, 0]);
    const restored = migrate(JSON.parse(JSON.stringify(toPersisted(onBypass))), SAVE_VERSION);
    expect(restored.reset).toBe(false);
    expect(restored.state?.guests[0]).toEqual(onBypass.guests[0]);

    const finished = tick(onBypass, 20 * MS_PER_GAME_MINUTE);
    expect(finished.dayStats.completedRuns).toBe(1);
    expect(finished.dayStats.runsByTrail).toEqual([1, 1]);
    expect(finished.dayStats.segmentRunsByTrail?.[0]?.[0]).toBe(1);
    expect(finished.dayStats.segmentRunsByTrail?.[0]?.[3]).toBe(0);
    expect(finished.guests[0].runs).toBe(1);
    expect(finished.guests[0].skiRoute).toBeUndefined();
    expect(finished.trails[0].snow[0].quality).toBeCloseTo(start.trails[0].snow[0].quality - WEAR_PER_RUN);
    expect(finished.trails[0].snow[3].quality).toEqual(start.trails[0].snow[3].quality);
    expect(finished.trails[1].snow[3].quality).toBeCloseTo(start.trails[1].snow[3].quality - WEAR_PER_RUN);
  });

  it("replays link construction and guards deletion where another trail depends on it", () => {
    const { initial, built, strokes } = bypass();
    const recording = newReplay(initial);
    recording.actions.push({ rule: "commitPaint", args: [strokes, false, true] });
    expect(toPersisted(playReplay(JSON.parse(JSON.stringify(recording))))).toEqual(toPersisted(
      commitPaint(initial, strokes, false, true),
    ));
    const erase = [{ points: built.trails[0].path, widthFt: 150, erase: true }];
    expect(checkPaint(built, erase).reason).toMatch(/connect here first/i);
    expect(commitPaint(built, erase)).toBe(built);
  });

  it("keeps the target lift open when another lift's trail requires its runout", () => {
    const { built } = bypass();
    const lifts = [...built.lifts, { ...built.lifts[0], anchor: REFERENCE_TOPS[1] }];
    const connector = { ...built.trails[1], liftIndex: 1, links: { end: built.trails[1].links!.end } };
    const connected = { ...built, lifts, trails: [built.trails[0], connector] };
    expect(liftClosureProblem(connected, 0)).toMatch(/connect to this lift/i);
    expect(closeLift(connected, 0)).toBe(connected);
  });

  it("remaps surviving junctions when undoing a lift removes an earlier closed trail slot", () => {
    const { built } = bypass();
    const lift = { ...built.lifts[0], builtDay: built.dayIndex, builtAtMin: built.clockMin };
    const closed = { ...built.trails[0], liftIndex: 1, open: false };
    const first = built.trails[0];
    const { start, end } = built.trails[1].links!;
    const branch = {
      ...built.trails[1],
      links: { start: { ...start!, trailIndex: 1 }, end: { ...end!, trailIndex: 1 } },
    };
    const undone = undoLift({ ...built, lifts: [...built.lifts, lift], trails: [closed, first, branch] });
    const withoutCrossings = (trails: typeof built.trails) => trails.map((trail) => ({
      ...trail,
      links: trail.links ? { ...trail.links, crossings: undefined } : trail.links,
    }));
    expect(withoutCrossings(undone.trails)).toEqual(withoutCrossings(built.trails));
  });
});
