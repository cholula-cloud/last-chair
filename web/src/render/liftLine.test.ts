import { describe, expect, it } from "vitest";
import { REFERENCE_TOPS } from "@/game/descent";
import { TERRAIN } from "@/game/terrain";
import { LIFT_BASE } from "./layout";
import { cableHeightAt, liftFrame, liftTowers } from "./liftLine";

describe("lift cable clearance", () => {
  it("keeps at least 0.5 u above terrain along each span", () => {
    for (const slot of REFERENCE_TOPS.slice(0, 2)) {
      const towers = liftTowers(slot);
      const { fx, fz, len } = liftFrame(slot);
      for (let span = 0; span < towers.length - 1; span++) {
        for (let s = 0; s <= 20; s++) {
          const t = (span + (s / 20) * (span + 1 === towers.length - 1 ? 1 : 1)) / (towers.length - 1);
          const x = LIFT_BASE.x + fx * len * t;
          const z = LIFT_BASE.z + fz * len * t;
          const ground = TERRAIN.height(x, z);
          expect(cableHeightAt(t, towers) - ground).toBeGreaterThanOrEqual(0.5);
        }
      }
    }
  });
});