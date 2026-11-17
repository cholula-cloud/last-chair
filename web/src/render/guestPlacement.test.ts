import { describe, expect, it } from "vitest";
import { LIFT_PREVIEW_SLOTS } from "@/game/descent";
import { makeGuest } from "@/game/sim";
import type { GuestState } from "@/game/types";
import { guestWorldPosition, placeGuests } from "./guestPlacement";
import { LIFT_BASE, LODGE } from "./layout";
import { cableHeightAt, liftTowers } from "./liftLine";
import { terrainHeight } from "./terrainShape";
import { trailPoint } from "./trail";

const STATES: GuestState[] = ["arrive", "queue", "ride", "ski", "depart"]; // pending and gone are never drawn
const PROGRESS = [0, 0.5, 1];
const EPS = 1e-9;

describe("guest placement", () => {
  for (const slot of LIFT_PREVIEW_SLOTS) {
    describe(`lift slot ${slot.label}`, () => {
      it("yields finite coordinates above the terrain in every state", () => {
        for (const liftType of ["surface", "chair"] as const) {
          for (const state of STATES) {
            for (const progress of PROGRESS) {
              for (let index = 0; index < 48; index++) {
                const p = guestWorldPosition(index, state, progress, slot, { liftType });
                const where = `${slot.label}/${liftType}/${state}/${progress}/#${index}`;
                for (const v of [p.x, p.y, p.z, p.yaw, p.lean, p.roll]) {
                  expect(Number.isFinite(v), where).toBe(true);
                }
                expect(p.y, where).toBeGreaterThanOrEqual(terrainHeight(p.x, p.z) - EPS);
              }
            }
          }
        }
      });

      it("keeps chair riders clear of the snow and under the cable", () => {
        const towers = liftTowers(slot);
        for (const progress of PROGRESS) {
          const p = guestWorldPosition(0, "ride", progress, slot, { liftType: "chair", towers });
          expect(p.y).toBeGreaterThan(terrainHeight(p.x, p.z));
          expect(p.y).toBeLessThanOrEqual(cableHeightAt(progress, towers));
        }
      });

      it("starts the ski trail at the lift top and ends it at the lodge", () => {
        const start = trailPoint(0, slot);
        const end = trailPoint(1, slot);
        expect([start.x, start.z]).toEqual([slot.x, slot.z]);
        expect(end.x).toBeCloseTo(LODGE.x, 9);
        expect(end.z).toBeCloseTo(LODGE.z, 9);
      });

      it("runs the lift from the base up to the lift top", () => {
        const towers = liftTowers(slot);
        const base = towers[0];
        const top = towers[towers.length - 1];
        expect([base.x, base.z]).toEqual([LIFT_BASE.x, LIFT_BASE.z]);
        expect(top.x).toBeCloseTo(slot.x, 9);
        expect(top.z).toBeCloseTo(slot.z, 9);
        expect(top.top).toBeGreaterThan(base.top);
        // Cable meets the terminals at their tower tops.
        expect(cableHeightAt(0, towers)).toBe(base.top);
        expect(cableHeightAt(1, towers)).toBe(top.top);
      });
    });
  }

  it("places the three lift slots higher than the lift base", () => {
    expect(LIFT_PREVIEW_SLOTS).toHaveLength(3);
    const baseHeight = terrainHeight(LIFT_BASE.x, LIFT_BASE.z);
    for (const slot of LIFT_PREVIEW_SLOTS) {
      expect(terrainHeight(slot.x, slot.z)).toBeGreaterThan(baseHeight);
    }
  });

  it("survives out-of-range or non-finite progress", () => {
    for (const progress of [-1, 2, Number.NaN]) {
      const p = guestWorldPosition(3, "ski", progress, LIFT_PREVIEW_SLOTS[0]);
      expect(Number.isFinite(p.x + p.y + p.z)).toBe(true);
    }
  });

  it("ranks queued guests front-to-back by progress, ties by list order", () => {
    const g = (id: string, state: GuestState, progress: number) =>
      makeGuest({ id, label: id, state, progress, mood: 0.5 });
    const guests = [g("a", "queue", 0.2), g("b", "ski", 0.9), g("c", "queue", 0.8), g("d", "queue", 0.2)];
    const anchor = LIFT_PREVIEW_SLOTS[1];
    const placed = placeGuests(guests, [{ anchor, type: "surface" }]);
    const rankOf = (i: number, rank: number) =>
      guestWorldPosition(i, "queue", 0, anchor, { queueRank: rank });
    expect(placed[2]).toEqual(rankOf(2, 0));
    expect(placed[0]).toEqual(rankOf(0, 1));
    expect(placed[3]).toEqual(rankOf(3, 2));
  });

  it("places each guest on their own lift and ranks queues per lift", () => {
    const g = (id: string, liftIndex: number | undefined, progress: number) =>
      makeGuest({ id, label: id, state: "queue", progress, mood: 0.5, liftIndex });
    const lifts = [
      { anchor: LIFT_PREVIEW_SLOTS[0], type: "surface" as const },
      { anchor: LIFT_PREVIEW_SLOTS[1], type: "chair" as const },
    ];
    // a and c queue at lift 1; b at lift 0; d has no lift and falls back to lift 0.
    const guests = [g("a", 1, 0.2), g("b", 0, 0.9), g("c", 1, 0.8), g("d", undefined, 0.1)];
    const placed = placeGuests(guests, lifts);
    const at = (i: number, liftIdx: number, rank: number) =>
      guestWorldPosition(i, "queue", 0, lifts[liftIdx].anchor, { queueRank: rank });
    expect(placed[2]).toEqual(at(2, 1, 0));
    expect(placed[0]).toEqual(at(0, 1, 1));
    expect(placed[1]).toEqual(at(1, 0, 0));
    expect(placed[3]).toEqual(at(3, 0, 1));
  });
});
