import { describe, expect, it } from "vitest";
import { REFERENCE_TOPS } from "./descent";
import * as rules from "./rules";
import { applyOvernight, makeGuest } from "./sim";
import {
  BARE_COVERAGE,
  COVER_MIN,
  TRAIL_SEGMENTS,
  deriveSnow,
  experiencedSnow,
  freshTrail,
  gunReach,
  overnightTrail,
  readSnow,
  segmentElevation,
  softenTrail,
  wearTrail,
  type Trail,
} from "./snow";
import { createInitialState, migrate, toPersisted, type GameState } from "./state";
import type { BuildingId, SnowPreset, WeatherKind } from "./types";

const night = (
  trail: Trail,
  snow: SnowPreset,
  weather: WeatherKind = "clear",
  o: { hasGuns?: boolean; hasTrailGuns?: boolean; hasGroom?: boolean } = {},
) =>
  overnightTrail(trail, {
    snow,
    weather,
    hasGuns: o.hasGuns ?? false,
    hasTrailGuns: o.hasTrailGuns ?? false,
    hasGroom: o.hasGroom ?? false,
  });
const mean = (t: Trail, k: "depth" | "quality" | "coverage") =>
  t.reduce((a, s) => a + s[k], 0) / t.length;
const last = (t: Trail) => t[t.length - 1];

describe("overnight presets", () => {
  const start = freshTrail(0.4, 0.5);

  it("High beats Mid beats Minimal on quality after one night, on every weather", () => {
    for (const w of ["clear", "snow", "thaw"] as const) {
      const lo = mean(night(start, "minimal", w), "quality");
      const mid = mean(night(start, "mid", w), "quality");
      const hi = mean(night(start, "high", w), "quality");
      expect(hi).toBeGreaterThan(mid);
      expect(mid).toBeGreaterThan(lo);
    }
  });

  it("Minimal leaves depth alone and drifts quality down", () => {
    const t = night(start, "minimal");
    expect(t[2].quality).toBeLessThan(0.5);
    expect(t[2].depth).toBeLessThanOrEqual(0.4);
  });

  it("guns reach the bottom segments first: Mid covers the lower half only", () => {
    const t = night(start, "mid", "clear", { hasGuns: true });
    expect(last(t).depth).toBeGreaterThan(t[0].depth + 0.1);
    expect(t[TRAIL_SEGMENTS - 3].depth).toBeGreaterThan(t[2].depth);
    expect(t[0].depth).toBeLessThan(0.4 + 0.05);
  });

  it("High guns reach every segment", () => {
    const t = night(start, "high", "clear", { hasGuns: true });
    for (const s of t) expect(s.depth).toBeGreaterThan(0.4 + 0.15);
  });

  it("trail_guns extends Mid reach when guns are owned", () => {
    const base = gunReach({ snow: "mid", hasGuns: true, hasTrailGuns: false });
    const ext = gunReach({ snow: "mid", hasGuns: true, hasTrailGuns: true });
    expect(ext).toBeGreaterThan(base);
    const a = night(start, "mid", "clear", { hasGuns: true });
    const b = night(start, "mid", "clear", { hasGuns: true, hasTrailGuns: true });
    expect(b[2].depth).toBeGreaterThan(a[2].depth);
  });

  it("groom talents raise the groom target", () => {
    const a = night(start, "mid");
    const b = night(start, "mid", "clear", { hasGroom: true });
    expect(b[0].quality).toBeGreaterThan(a[0].quality);
  });

  it("High restores coverage where depth allows; Minimal does not", () => {
    const broken: Trail = freshTrail(0.3, 0.5).map((s) => ({ ...s, coverage: 0.2 }));
    expect(night(broken, "high")[0].coverage).toBe(1);
    expect(night(broken, "minimal")[0].coverage).toBe(0.2);
  });
});

describe("weather", () => {
  const start = freshTrail(0.5, 0.6);
  it("a thaw removes more depth and quality at the bottom than the top", () => {
    const t = night(start, "minimal", "thaw");
    expect(start[5].depth - t[5].depth).toBeGreaterThan(start[0].depth - t[0].depth);
    expect(t[5].quality).toBeLessThan(t[0].quality);
  });
  it("a snow day adds more depth at the top", () => {
    const t = night(start, "minimal", "snow");
    expect(t[0].depth - start[0].depth).toBeGreaterThan(t[5].depth - start[5].depth);
    expect(t[0].quality).toBeGreaterThan(start[0].quality);
  });
  it("coverage drops where depth falls under the threshold", () => {
    const thin = freshTrail(0.2, 0.5);
    const t = night(thin, "minimal", "thaw");
    expect(last(t).depth).toBeLessThan(COVER_MIN);
    expect(last(t).coverage).toBeLessThan(1);
    expect(t[0].coverage).toBe(1);
  });
});

describe("day", () => {
  it("traffic wears quality, more with more runs", () => {
    const t = freshTrail();
    expect(wearTrail(t, 10)[0].quality).toBeLessThan(t[0].quality);
    expect(wearTrail(t, 100)[0].quality).toBeLessThan(wearTrail(t, 10)[0].quality);
    expect(wearTrail(t, 0)).toBe(t);
  });
  it("a thaw afternoon softens the bottom most", () => {
    const t = softenTrail(freshTrail(), 60);
    expect(t[5].quality).toBeLessThan(t[0].quality);
  });
});

describe("experienced snow", () => {
  it("equals the quality on an even trail", () => {
    expect(experiencedSnow(freshTrail(0.45, 0.55))).toBeCloseTo(0.55, 10);
  });
  it("is pulled below the mean toward the worst segment", () => {
    const t = freshTrail(0.45, 0.8);
    t[5] = { ...t[5], quality: 0.2 };
    expect(experiencedSnow(t)).toBeLessThan(mean(t, "quality"));
    expect(experiencedSnow(t)).toBeGreaterThan(0.2);
  });
  it("docks thin trails, and bare bottoms more", () => {
    const even = freshTrail(0.45, 0.6);
    const thin = even.map((s, i) => (i === 2 ? { ...s, coverage: 0.2 } : s));
    const bare = even.map((s, i) => (i === 5 ? { ...s, coverage: BARE_COVERAGE - 0.05 } : s));
    expect(experiencedSnow(thin)).toBeLessThan(experiencedSnow(even));
    expect(experiencedSnow(bare)).toBeLessThan(experiencedSnow(thin));
  });
});

describe("reading the trail", () => {
  const lifts = (trail: Trail) => [{ confirmed: true, trail }];
  it("names the bottom when it is bare and the top when it is icy", () => {
    const t = freshTrail(0.4, 0.6);
    t[5] = { depth: 0.03, quality: 0.5, coverage: 0.05 };
    const r = readSnow(lifts(t));
    expect(r.label).toBe("Bare bottom");
    expect(r.trouble).toBe("Bare patches at the bottom of the trail");
    const u = freshTrail(0.4, 0.7);
    u[0] = { ...u[0], quality: 0.25 };
    expect(readSnow(lifts(u)).trouble).toBe("Icy up top");
  });
  it("reads fresh corduroy on a groomed even trail", () => {
    expect(readSnow(lifts(freshTrail(0.6, 0.9))).label).toBe("Fresh corduroy");
  });
});

describe("state integration", () => {
  const started = (): GameState => rules.pickFounder(createInitialState(7), "elena");
  const atNight = (s: GameState, snow: SnowPreset, weather: WeatherKind): GameState => {
    const base: GameState = { ...s, weather: "clear" };
    const n = rules.openNight({ ...base, clockMin: 16 * 60, phase: "day" });
    return { ...n, pendingSnow: snow, beatAcknowledged: true, pendingBeat: null, weather, dayIndex: weather === "thaw" ? 7 : 1 };
  };

  it("the derived globals equal the segment means after a night", () => {
    const s = rules.sleep(atNight(started(), "high", "clear"));
    const d = deriveSnow(s.lifts);
    expect(s.snowQuality).toBeCloseTo(d.snowQuality, 10);
    expect(s.snowDepth).toBeCloseTo(d.snowDepth, 10);
  });

  it("High beats Mid beats Minimal on morning quality through sleep()", () => {
    const q = (p: SnowPreset) => rules.sleep(atNight(started(), p, "clear")).snowQuality;
    expect(q("high")).toBeGreaterThan(q("mid"));
    expect(q("mid")).toBeGreaterThan(q("minimal"));
  });

  it("is deterministic", () => {
    const a = rules.sleep(atNight(started(), "mid", "clear"));
    const b = rules.sleep(atNight(started(), "mid", "clear"));
    expect(a.lifts.map((l) => l.trail)).toEqual(b.lifts.map((l) => l.trail));
  });

  it("a day of skiing wears the trail and keeps the globals derived", () => {
    const s0 = started();
    const done = rules.skipToClose({ ...s0, paused: false });
    expect(done.lifts[0].trail[0].quality).toBeLessThan(s0.lifts[0].trail[0].quality);
    expect(done.snowQuality).toBeCloseTo(deriveSnow(done.lifts).snowQuality, 10);
  });

  it("a guest on a worn lift feels that lift's snow", () => {
    const icy = freshTrail(0.45, 0.3);
    expect(experiencedSnow(icy)).toBeCloseTo(0.3, 10);
    expect(makeGuest().snowSum).toBe(0);
  });

  it("applyOvernight returns one trail per lift", () => {
    const r = applyOvernight({
      snow: "mid",
      cash: 0,
      trails: [freshTrail(), freshTrail()],
      dayIndex: 1,
      buildings: [] as BuildingId[],
      talentsOwned: [],
      daysWithoutSnow: 0,
    });
    expect(r.trails).toHaveLength(2);
  });

  it("migrates a v4 save: every lift gets segments at the old global values", () => {
    const v4 = JSON.parse(JSON.stringify(toPersisted(started())));
    v4.snowQuality = 0.4;
    v4.snowDepth = 0.3;
    for (const l of v4.lifts) delete l.trail;
    delete v4.gunReach;
    const m = migrate(v4, 4);
    expect(m.lifts[0].trail).toHaveLength(TRAIL_SEGMENTS);
    expect(m.lifts[0].trail.every((s) => s.quality === 0.4 && s.depth === 0.3)).toBe(true);
    expect(m.snowQuality).toBeCloseTo(0.4, 10);
    expect(m.gunReach).toBe(0);
  });

  it("segment elevation runs 1 at the top to 0 at the bottom", () => {
    expect(segmentElevation(0)).toBe(1);
    expect(segmentElevation(TRAIL_SEGMENTS - 1)).toBe(0);
    expect(REFERENCE_TOPS.length).toBeGreaterThan(0);
  });
});
