import { describe, expect, it } from "vitest";
import { REFERENCE_TOPS } from "@/game/descent";
import { liftLineOf } from "@/game/rules";
import { starterLifts } from "@/game/__fixtures__/built-hill";
import { TERRAIN } from "@/game/terrain";
import { DAY_START_MIN, MS_PER_GAME_MINUTE } from "@/game/types";
import { scaledTickMs, type GameSpeed } from "@/ui/speed";
import { cableHeightAt, carrierLoopPhase, liftFrame, liftTowers } from "./liftLine";

const lineAt = (top: { x: number; z: number }) => ({ bottom: TERRAIN.base, top });

it("takes one ride to reach the summit and runs at the selected clock speed", () => {
  const rideMin = 5;
  expect(carrierLoopPhase(DAY_START_MIN + rideMin, rideMin)).toBe(0.5);
  expect(carrierLoopPhase(DAY_START_MIN + 2 * rideMin, rideMin)).toBe(0);
  const phase = (speed: GameSpeed) => {
    const minutes = scaledTickMs(0.05, speed) / MS_PER_GAME_MINUTE;
    return carrierLoopPhase(DAY_START_MIN + minutes, rideMin);
  };
  expect(phase(2)).toBeCloseTo(2 * phase(1));
  expect(phase(3)).toBeCloseTo(3 * phase(1));
});

describe("lift cable clearance", () => {
  it("keeps at least 0.5 u above terrain along each span", () => {
    for (const slot of REFERENCE_TOPS.slice(0, 2)) {
      const line = lineAt(slot);
      const towers = liftTowers(line);
      const { fx, fz, len } = liftFrame(line);
      for (let span = 0; span < towers.length - 1; span++) {
        for (let s = 0; s <= 20; s++) {
          const t = (span + (s / 20) * (span + 1 === towers.length - 1 ? 1 : 1)) / (towers.length - 1);
          const x = line.bottom.x + fx * len * t;
          const z = line.bottom.z + fz * len * t;
          const ground = TERRAIN.height(x, z);
          expect(cableHeightAt(t, towers) - ground).toBeGreaterThanOrEqual(0.5);
        }
      }
    }
  });

  it("matches towers for lifts stored with only a top anchor", () => {
    const lift = starterLifts()[0];
    const fromRules = liftLineOf(lift);
    const legacy = lineAt(lift.anchor);
    expect(liftTowers(fromRules).map((p) => [p.x, p.z, p.top])).toEqual(
      liftTowers(legacy).map((p) => [p.x, p.z, p.top]),
    );
  });

  it("puts the first tower at a custom bottom", () => {
    const line = {
      bottom: { x: 0.9, z: 15.3 },
      top: REFERENCE_TOPS[1],
    };
    const towers = liftTowers(line);
    expect(towers[0].x).toBeCloseTo(0.9, 5);
    expect(towers[0].z).toBeCloseTo(15.3, 5);
  });
});
