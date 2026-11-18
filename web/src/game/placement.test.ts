import { describe, expect, it } from "vitest";
import { MAX_LIFTS, REFERENCE_TOPS, type LiftLine } from "./descent";
import * as rules from "./rules";
import { projectLiftBottom, snapTop } from "./rules";
import { createInitialState, defaultLifts, migrate, toPersisted, SAVE_VERSION, type GameState, type LiftSlot } from "./state";
import { makeGuest } from "./sim";
import { freshTrail } from "./snow";
import { fallLineTrailForLift } from "./trails";
import { TERRAIN } from "./terrain";
import { LIFT_COST_PARAMS, liftCost, type LiftType } from "./types";

const MID = REFERENCE_TOPS[1];
const started = (cash = 20000): GameState => ({ ...rules.pickFounder(createInitialState(7), "elena"), cash });
const chairReq = { type: "chair" as const, bottom: TERRAIN.base, top: MID };
/** A top far from Ridge and Mid that the terrain rules accept from the base. */
const FAR_TOP = TERRAIN.toWorld({ x: 1.6, z: 0.4 });
const baseLine = (top: { x: number; z: number }): LiftLine => ({ bottom: TERRAIN.base, top });

describe("liftCost", () => {
  it("prices a chair at Mid at exactly $2,500", () => {
    expect(liftCost("chair", baseLine(MID))).toBe(2500);
  });

  it("is a multiple of $50", () => {
    expect(liftCost("surface", baseLine(MID)) % 50).toBe(0);
    expect(liftCost("chair", baseLine(REFERENCE_TOPS[0])) % 50).toBe(0);
  });

  it("rises strictly with length at fixed vertical and with vertical at fixed length", () => {
    const type: LiftType = "chair";
    const p = LIFT_COST_PARAMS[type];
    const raw = (len: number, vert: number) => p.base + p.perLength * len + p.perVertical * vert;
    expect(raw(2, 1)).toBeLessThan(raw(3, 1));
    expect(raw(2, 1)).toBeLessThan(raw(2, 2));
    // The longer, higher Ridge line costs more after $50 rounding.
    const flat = (top: { x: number; z: number }) => liftCost(type, baseLine(top));
    expect(flat(REFERENCE_TOPS[0])).toBeGreaterThan(flat(MID));
  });

  it("makes a surface lift cheaper than a chair on the same line", () => {
    for (const t of [MID, REFERENCE_TOPS[0]]) {
      expect(liftCost("surface", baseLine(t))).toBeLessThan(liftCost("chair", baseLine(t)));
    }
  });
});

describe("placeLift", () => {
  it("appends a lift, deducts the price and closes build mode", () => {
    const s0 = { ...started(), buildMode: true };
    const before = structuredClone(s0);
    const s = rules.placeLift(s0, chairReq);
    expect(s0).toEqual(before);
    expect(s.lifts).toHaveLength(2);
    const lift = s.lifts[1];
    expect(lift).toMatchObject({
      type: "chair",
      anchor: { x: MID.x, z: MID.z },
      bottom: { x: TERRAIN.base.x, z: 15.3 },
      confirmed: true,
      queue: [],
      dispatchCredit: 0,
      builtDay: s0.dayIndex,
      builtAtMin: s0.clockMin,
      paid: 2500,
    });
    expect(s.cash).toBe(s0.cash - 2500);
    expect(s.buildMode).toBe(false);
  });

  it("rounds coordinates to 0.01", () => {
    const s = rules.placeLift(started(), { ...chairReq, top: { x: MID.x + 0.0004, z: MID.z - 0.0004 } });
    expect(s.lifts[1].anchor).toEqual({ x: MID.x, z: MID.z });
  });

  it("is deterministic", () => {
    expect(rules.placeLift(started(), chairReq)).toEqual(rules.placeLift(started(), chairReq));
  });

  it("returns state unchanged outside the day phase", () => {
    const night = { ...started(), phase: "night" as const };
    expect(rules.placeLift(night, chairReq)).toBe(night);
  });

  it("returns state unchanged for an invalid line", () => {
    const s = started();
    expect(rules.placeLift(s, { ...chairReq, top: REFERENCE_TOPS[2] })).toBe(s);
    expect(rules.placeLift(s, { ...chairReq, top: { x: Number.NaN, z: 0 } })).toBe(s);
  });

  it("fails cash and leaves state unchanged when the price is short", () => {
    const poor = started(2499);
    expect(rules.placeLift(poor, chairReq)).toBe(poor);
    const c = rules.checkPlacement(poor, "chair", baseLine(MID));
    expect(c).toMatchObject({ ok: false, reason: "cash", need: 1 });
  });

  it("allows a third lift and fails a fourth with max_lifts", () => {
    let s = rules.placeLift(started(), chairReq);
    s = rules.placeLift(s, { type: "surface", bottom: TERRAIN.base, top: FAR_TOP });
    expect(s.lifts).toHaveLength(MAX_LIFTS);
    const extra = TERRAIN.toWorld({ x: -0.2, z: -1.2 });
    const c = rules.checkPlacement(s, "chair", baseLine(extra));
    expect(c).toEqual({ ok: false, reason: "max_lifts" });
    expect(rules.placeLift(s, { type: "chair", bottom: TERRAIN.base, top: extra })).toBe(s);
  });

  it("rejects a top too close to an existing lift, naming its type", () => {
    const s = rules.placeLift(started(), chairReq);
    const near = { x: MID.x + 0.3, z: MID.z + 0.1 };
    expect(rules.checkPlacement(s, "surface", baseLine(near))).toMatchObject({ ok: false, reason: "too_close", type: "chair" });
  });

  it("checks terrain before spacing and cash", () => {
    const s = started(0);
    expect(rules.checkPlacement(s, "chair", baseLine(REFERENCE_TOPS[2]))).toMatchObject({ reason: "too_low" });
    expect(rules.checkPlacement(s, "chair", baseLine({ x: REFERENCE_TOPS[0].x + 0.1, z: REFERENCE_TOPS[0].z }))).toMatchObject({
      reason: "too_close",
    });
  });
});

describe("undoLift", () => {
  it("refunds exactly what was paid and restores the lift list", () => {
    const s0 = started();
    const s1 = rules.placeLift(s0, chairReq);
    expect(rules.undoableLiftIndex(s1)).toBe(1);
    const before = structuredClone(s1);
    const s2 = rules.undoLift(s1);
    expect(s1).toEqual(before);
    expect(s2.cash).toBe(s0.cash);
    expect(s2.lifts).toEqual(s0.lifts);
  });

  it("is unavailable once the clock has moved", () => {
    let s = rules.placeLift(started(), chairReq);
    s = rules.tick(rules.togglePause(s), 500);
    expect(rules.undoableLiftIndex(s)).toBe(-1);
    expect(rules.undoLift(s)).toBe(s);
  });

  it("never offers the default lift", () => {
    const s = started();
    expect(rules.undoableLiftIndex(s)).toBe(-1);
    expect(rules.undoLift(s)).toBe(s);
    const forged: GameState = { ...s, lifts: [{ ...s.lifts[0], builtDay: s.dayIndex, builtAtMin: s.clockMin }] };
    expect(rules.undoableLiftIndex(forged)).toBe(-1);
  });

  it("only undoes the most recent lift", () => {
    let s = rules.placeLift(started(), chairReq);
    s = rules.placeLift(s, { type: "surface", bottom: TERRAIN.base, top: FAR_TOP });
    expect(rules.undoableLiftIndex(s)).toBe(2);
    expect(rules.undoLift(s).lifts).toHaveLength(2);
  });
});

describe("build mode", () => {
  it("pauses the day when the build sheet opens", () => {
    const running = { ...started(), paused: false };
    expect(rules.setBuildMode(running, true).paused).toBe(true);
    expect(rules.setBuildMode({ ...running, buildMode: true }, false).paused).toBe(false);
  });
});

describe("sim parity", () => {
  const tickDay = (s: GameState) => {
    let g = rules.togglePause(s);
    while (g.phase === "day") g = rules.tick(g, 2000);
    return g;
  };

  it("a placed chair simulates exactly like a hand-built lift at index 1", () => {
    const base = started();
    const hand: LiftSlot = {
      type: "chair",
      anchor: { x: MID.x, z: MID.z },
      confirmed: true,
      queue: [],
      dispatchCredit: 0,
    };
    const handTrail = fallLineTrailForLift(1, hand, freshTrail());
    const a = tickDay(rules.placeLift(base, chairReq));
    const b = tickDay({
      ...base,
      lifts: [...base.lifts, hand],
      trails: [...base.trails, handTrail],
      cash: base.cash - 2500,
    });
    expect(a.guests).toEqual(b.guests);
    expect(a.dayStats).toEqual(b.dayStats);
    expect(a.trails.map((t) => t.snow)).toEqual(b.trails.map((t) => t.snow));
    expect(a.cash).toBe(b.cash);
  });

  it("splits a crowd across three lifts", () => {
    let s = rules.placeLift(started(), chairReq);
    s = rules.placeLift(s, { type: "surface", bottom: TERRAIN.base, top: FAR_TOP });
    expect(s.lifts).toHaveLength(3);
    const crowd = Array.from({ length: 30 }, (_, i) => makeGuest({ id: `q${i}`, label: `q${i}`, state: "queue" }));
    s = rules.tick(rules.togglePause({ ...s, guests: crowd }), 500);
    expect(s.lifts.map((l) => l.queue.length)).toSatisfy((n: number[]) => n.every((q) => q > 0));
    const ids = s.lifts.flatMap((l) => l.queue);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("save v7", () => {
  const v6 = () => ({ ...toPersisted(createInitialState(3)), selectedSlotIndex: 1 });

  it("drops selectedSlotIndex and keeps lifts", () => {
    expect(SAVE_VERSION).toBe(10);
    const saved = v6();
    const m = migrate(saved, 6) as unknown as Record<string, unknown>;
    expect("selectedSlotIndex" in m).toBe(false);
    expect(m.lifts).toEqual(saved.lifts);
    expect(toPersisted(createInitialState(1))).not.toHaveProperty("selectedSlotIndex");
  });

  it("keeps a two-lift v6 save as it was", () => {
    const base = v6();
    const extra: LiftSlot = {
      type: "chair",
      anchor: TERRAIN.toWorld({ x: 0.8, z: 0.6 }),
      confirmed: true,
      queue: [],
      dispatchCredit: 0,
    };
    const lifts = [...base.lifts, extra];
    const legacy = {
      ...base,
      lifts: [
        ...base.lifts.map((l) => ({ ...l, trail: freshTrail() })),
        { ...extra, trail: freshTrail() },
      ],
    };
    expect(migrate(legacy, 6).lifts).toEqual(lifts);
  });

  it("resets corrupt lifts to the default lift", () => {
    const fresh = defaultLifts();
    const good = defaultLifts()[0];
    for (const lifts of [
      undefined,
      "nope",
      [],
      [{ ...good, anchor: { x: Number.NaN, z: 0 } }],
      [good, good, good, good],
    ]) {
      const m = migrate({ ...v6(), lifts }, 6);
      expect(m.lifts).toEqual(fresh);
    }
  });
});

describe("snapTop", () => {
  it("returns Mid unchanged when the hit is Mid", () => {
    const s = started();
    const r = snapTop(s, "chair", baseLine(MID), 2);
    expect(r.top.x).toBeCloseTo(MID.x, 2);
    expect(r.top.z).toBeCloseTo(MID.z, 2);
    expect(r.snapped).toBe(false);
    expect(r.check.ok).toBe(true);
  });

  it("projects an out-of-disc bottom tap toward the base", () => {
    const b = projectLiftBottom({ x: 10, z: 15.3 });
    expect(b.x).toBeCloseTo(6.29, 2);
    expect(b.z).toBeCloseTo(15.3, 2);
  });

  it("returns tops that still pass checkPlacement against the default lift", () => {
    const s = started();
    let ok = 0;
    for (let dx = -2; dx <= 2; dx += 0.55) {
      for (let dz = -2; dz <= 2; dz += 0.55) {
        const hit = { x: MID.x + dx, z: MID.z + dz };
        const r = snapTop(s, "chair", baseLine(hit), 2.2);
        if (!r.check.ok) continue;
        ok += 1;
        expect(rules.checkPlacement(s, "chair", { bottom: TERRAIN.base, top: r.top }).ok).toBe(true);
      }
    }
    expect(ok).toBeGreaterThan(3);
  });

  it("returns the raw hit with too_steep when nothing valid lies within r", () => {
    const s = started();
    const steep = TERRAIN.toWorld({ x: -0.5, z: -0.8 });
    const r = snapTop(s, "chair", baseLine(steep), 0.5);
    expect(r.snapped).toBe(false);
    expect(r.top).toEqual(steep);
    expect(r.check.ok).toBe(false);
    if (!r.check.ok) expect(r.check.reason).toBe("too_steep");
  });
});

describe("save v8", () => {
  const v7 = () => toPersisted(createInitialState(3));

  it("scales lift anchors and bottoms from v7 design units by frozen H = 6", () => {
    const ridge = { x: -1.2, z: 0.2 };
    const mid = { x: 0.8, z: 0.6 };
    const customBottom = { x: 0.5, z: 2.6 };
    const lifts: LiftSlot[] = [
      { type: "surface", anchor: ridge, confirmed: true, queue: [], dispatchCredit: 0 },
      {
        type: "chair",
        anchor: mid,
        bottom: customBottom,
        confirmed: true,
        queue: [],
        dispatchCredit: 0,
        paid: 2500,
      },
    ];
    const saved = {
      ...v7(),
      lifts: lifts.map((l) => ({ ...l, trail: freshTrail() })),
    };
    const m = migrate(saved, 7);
    expect(m.lifts[0].anchor).toEqual({ x: -7.2, z: 1.2 });
    expect(m.lifts[1].anchor).toEqual({ x: 4.8, z: 3.6 });
    expect(m.lifts[1].bottom).toEqual({ x: 3, z: 15.6 });
    expect(liftCost("chair", { bottom: m.lifts[1].bottom!, top: m.lifts[1].anchor })).toBe(2500);
  });
});
