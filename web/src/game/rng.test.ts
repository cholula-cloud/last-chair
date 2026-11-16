import { describe, expect, it } from "vitest";
import { createRng } from "./rng";

function draw(rng: { next(): number }, n: number): number[] {
  return Array.from({ length: n }, () => rng.next());
}

describe("createRng", () => {
  it("is deterministic for a seed", () => {
    expect(draw(createRng(42), 20)).toEqual(draw(createRng(42), 20));
  });

  it("differs between seeds", () => {
    expect(draw(createRng(1), 5)).not.toEqual(draw(createRng(2), 5));
  });

  it("stays in [0, 1)", () => {
    for (const v of draw(createRng(7), 5000)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("resumes from saved state with the same continuation", () => {
    const full = createRng(99);
    const expected = draw(full, 30);

    const first = createRng(99);
    draw(first, 10);
    const resumed = createRng(first.state());
    expect(draw(resumed, 20)).toEqual(expected.slice(10));
  });
});
