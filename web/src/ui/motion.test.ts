import { describe, expect, it } from "vitest";
import { countUp, moodAt, moodPulse, resolveReducedMotion } from "./motion";

describe("resolveReducedMotion", () => {
  it('override "on" wins over system false', () => {
    expect(resolveReducedMotion("on", false)).toBe(true);
  });

  it('"system" follows the media query', () => {
    expect(resolveReducedMotion("system", true)).toBe(true);
    expect(resolveReducedMotion("system", false)).toBe(false);
  });

  it('"off" ignores system', () => {
    expect(resolveReducedMotion("off", true)).toBe(false);
  });
});

describe("moodPulse", () => {
  const samples = [
    { clockMin: 0, mood: 50 },
    { clockMin: 5, mood: 52 },
    { clockMin: 10, mood: 56 },
    { clockMin: 15, mood: 60 },
  ];

  it("fires at 5, not at 4.9", () => {
    const at5 = moodPulse(
      [
        { clockMin: 0, mood: 50 },
        { clockMin: 10, mood: 55 },
      ],
      10,
      null,
    );
    expect(at5).toEqual({ delta: 5 });

    const at49 = moodPulse(
      [
        { clockMin: 0, mood: 50 },
        { clockMin: 10, mood: 54.9 },
      ],
      10,
      null,
    );
    expect(at49).toBeNull();
  });

  it("at most once per 30 game minutes", () => {
    const first = moodPulse(samples, 15, null);
    expect(first).not.toBeNull();
    const blocked = moodPulse(samples, 20, 15);
    expect(blocked).toBeNull();
    const later = moodPulse(
      [
        ...samples,
        { clockMin: 50, mood: 70 },
      ],
      50,
      15,
    );
    expect(later).not.toBeNull();
  });

  it("moodAt picks the latest sample at or before the target", () => {
    expect(moodAt(samples, 7)).toBe(52);
    expect(moodAt(samples, 10)).toBe(56);
    expect(moodAt(samples, -1)).toBeNull();
  });
});

describe("countUp", () => {
  it("hits endpoints exactly and moves monotonically up", () => {
    expect(countUp(100, 200, 0)).toBe(100);
    expect(countUp(100, 200, 600)).toBe(200);
    expect(countUp(100, 200, 900)).toBe(200);
    const mid = countUp(0, 100, 300);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(100);
    const a = countUp(10, 50, 100);
    const b = countUp(10, 50, 200);
    const c = countUp(10, 50, 400);
    expect(a).toBeLessThanOrEqual(b);
    expect(b).toBeLessThanOrEqual(c);
  });

  it("counts down when to < from", () => {
    expect(countUp(200, 100, 600)).toBe(100);
    const mid = countUp(200, 100, 300);
    expect(mid).toBeLessThan(200);
    expect(mid).toBeGreaterThan(100);
  });
});