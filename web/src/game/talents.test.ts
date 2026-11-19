import { describe, expect, it } from "vitest";
import { createBuiltHill } from "./__fixtures__/built-hill";
import { LIFT_CLOSE_MIN } from "./types";
import { dailyCosts, morningCash } from "./economy";
import { liftCapacityPerHour } from "./lifts";
import { migrate } from "./migrations";
import { acknowledgeBeat, openNight, pickFounder, previewOvernight, satisfactionContext, setPendingSnow, sleep } from "./rules";
import { expectedHillValue, guestTerms, venueValue, type SatGuest } from "./satisfaction";
import { meanArrivals, tickGuests, type ArrivalInputs } from "./sim";
import { freshTrail, gunReach, overnightTrail } from "./snow";
import { SAVE_VERSION, toPersisted, type GameState } from "./state";
import { CREW_TALENTS, TALENT, TALENT_IDS, liftCloseMin, talentLearnedLine, talentWaitingFor } from "./talents";
import { isWindHeld } from "./weather";
import type { TalentId } from "./types";

const base = () => pickFounder(createBuiltHill(42), "elena");
const withTalent = (state: GameState, id: TalentId): GameState => ({ ...state, talentsOwned: [id] });
const close = (state: GameState) => acknowledgeBeat(openNight(state));

const arrivalInputs = (over: Partial<ArrivalInputs>): ArrivalInputs => ({
  dayIndex: 3, fare: "balanced", snowQuality: 0.6, weather: "clear", buildings: ["warming_hut"],
  talentsOwned: [], founderId: null, ...over,
});
const arrivalsDelta = (id: TalentId, over: Partial<ArrivalInputs>) =>
  meanArrivals(arrivalInputs({ ...over, talentsOwned: [id] })) - meanArrivals(arrivalInputs({ ...over }));

const SATURDAY = 6;
const TUESDAY = 2;
const SUNDAY = 7;
const HOLIDAY = 22;

describe("crew list", () => {
  it("holds 20 unique talents in crew order, each with a crew member and an effect line", () => {
    expect(CREW_TALENTS).toHaveLength(20);
    expect(new Set(TALENT_IDS).size).toBe(20);
    expect(CREW_TALENTS.map((t) => t.id).slice(0, 4)).toEqual(["rope_tow", "trail_guns", "groom_pass", "ticket_booth"]);
    for (const talent of CREW_TALENTS) {
      expect(["frank", "dana", "elena"]).toContain(talent.crew);
      expect(talent.effect).toMatch(/^[A-Z].*\.$/);
      expect(talent.effect).not.toMatch(/[—·]/);
    }
  });

  it("learns one talent per Sleep and owns all 20 after 20 Sleeps, dormant ones included", () => {
    let state = base();
    for (let night = 1; night <= 27; night++) {
      const closed = close(state);
      state = sleep({ ...closed, cash: closed.cash + 100_000 });
      expect(state.talentsOwned).toHaveLength(Math.min(night, 20));
    }
    expect(new Set(state.talentsOwned)).toEqual(new Set(TALENT_IDS));
  });

  it("names what a dormant talent waits for", () => {
    expect(talentWaitingFor("bull_wheel", { chair: false, cafe: false })).toBe("Waits for a chair lift.");
    expect(talentWaitingFor("bull_wheel", { chair: true, cafe: false })).toBeNull();
    expect(talentLearnedLine("cafe_shift", { chair: false, cafe: false })).toBe("Crew learned Café Shift. Waits for a café.");
    expect(talentLearnedLine("rope_tow", { chair: false, cafe: false })).toContain("$175");
  });

  it("keeps a save made with the old 12-talent order loading and learns the next unowned talent in the new order", () => {
    const old = { ...base(), talentsOwned: ["rope_tow", "trail_guns", "house_band", "groom_pass"] };
    const loaded = migrate(JSON.parse(JSON.stringify(toPersisted(old))), SAVE_VERSION);
    expect(loaded.reset).toBe(false);
    expect(loaded.state.talentsOwned).toEqual(["rope_tow", "trail_guns", "house_band", "groom_pass"]);
    const closed = close({ ...old, ...loaded.state } as GameState);
    expect(sleep(closed).talentsOwned.at(-1)).toBe("ticket_booth");
  });
});

describe("talent effects, with and without", () => {
  it("rope_tow: a surface lift costs $175 a day to run instead of $180", () => {
    expect(dailyCosts(base()).liftOps).toBe(180);
    expect(dailyCosts(withTalent(base(), "rope_tow")).liftOps).toBe(175);
  });

  it("trail_guns: guns reach every segment on High and 25% farther on Mid", () => {
    expect(gunReach({ snow: "high", hasGuns: false, hasTrailGuns: false })).toBe(0);
    expect(gunReach({ snow: "high", hasGuns: false, hasTrailGuns: true })).toBe(1);
    expect(gunReach({ snow: "mid", hasGuns: true, hasTrailGuns: false })).toBe(0.5);
    expect(gunReach({ snow: "mid", hasGuns: true, hasTrailGuns: true })).toBe(0.75);
  });

  const groomed = (o: { hasGroom?: boolean; hasCorduroy?: boolean }) =>
    overnightTrail(freshTrail(0.4, 0.4), { snow: "mid", weather: "clear", hasGuns: false, hasTrailGuns: false, hasGroom: false, ...o })
      .map((s) => s.quality)[0];

  it("groom_pass: a Mid night from quality 0.4 and a clear morning ends at 0.68 instead of 0.61", () => {
    expect(groomed({})).toBeCloseTo(0.61, 6);
    expect(groomed({ hasGroom: true })).toBeCloseTo(0.68, 6);
  });

  it("corduroy: adds 0.03 on top of Groom Pass", () => {
    expect(groomed({ hasGroom: true, hasCorduroy: true })).toBeCloseTo(0.71, 6);
    expect(groomed({ hasCorduroy: true })).toBeCloseTo(0.64, 6);
  });

  it("ticket_booth: one more skier on weekends and holidays, none on a weekday", () => {
    expect(arrivalsDelta("ticket_booth", { dayIndex: SATURDAY })).toBeCloseTo(1, 6);
    expect(arrivalsDelta("ticket_booth", { dayIndex: HOLIDAY })).toBeCloseTo(1, 6);
    expect(arrivalsDelta("ticket_booth", { dayIndex: TUESDAY })).toBe(0);
  });

  it("patrol_radio: surface capacity 47 becomes 49.35", () => {
    expect(liftCapacityPerHour("surface", [])).toBe(47);
    expect(liftCapacityPerHour("surface", ["patrol_radio"])).toBeCloseTo(49.35, 6);
  });

  it("school_day: two more skiers on a weekday, and the school bus message opens", () => {
    expect(arrivalsDelta("school_day", { dayIndex: TUESDAY })).toBeCloseTo(2, 6);
    expect(arrivalsDelta("school_day", { dayIndex: SATURDAY })).toBe(0);
    const night = (talents: TalentId[]) => openNight({
      ...base(), dayIndex: TUESDAY, talentsOwned: talents, completedBeats: ["first_load", "saturday"],
      dayStats: { ...base().dayStats, arrivals: 10 },
    });
    expect(night([]).pendingBeat).toBeNull();
    expect(night(["school_day"]).pendingBeat).toBe("school_bus");
  });

  it("house_band: arrival mood +0.03 on a Saturday, unchanged on a Tuesday", () => {
    const mood = (day: number, talents: TalentId[]) =>
      satisfactionContext({ ...base(), founderId: null, dayIndex: day, talentsOwned: talents }).arrivalMood;
    expect(mood(SATURDAY, ["house_band"]) - mood(SATURDAY, [])).toBeCloseTo(TALENT.HOUSE_BAND_MOOD, 6);
    expect(mood(TUESDAY, ["house_band"])).toBe(mood(TUESDAY, []));
  });

  it("cafe_shift: a café is worth $2 more to every guest, and nothing without a café", () => {
    expect(venueValue(["cafe"], [])).toBe(3);
    expect(venueValue(["cafe"], ["cafe_shift"])).toBe(5);
    expect(venueValue(["warming_hut"], ["cafe_shift"])).toBe(0);
  });

  it("wind_hold: chairs reopen at 12:15 instead of 1:00 and hold from 11:00 instead of 10:30", () => {
    expect(isWindHeld("chair", "gusty", 740, [])).toBe(true);
    expect(isWindHeld("chair", "gusty", 740, ["wind_hold"])).toBe(false);
    expect(isWindHeld("chair", "gusty", 650, [])).toBe(true);
    expect(isWindHeld("chair", "gusty", 650, ["wind_hold"])).toBe(false);
    expect(isWindHeld("chair", "gusty", 700, ["wind_hold"])).toBe(true);
    expect(isWindHeld("surface", "gusty", 700, ["wind_hold"])).toBe(false);
  });

  it("snow_fences: a thaw night strips 30% less depth from the bottom segment and the same from the top", () => {
    const thaw = (hasSnowFences: boolean) =>
      overnightTrail(freshTrail(0.4, 0.5), { snow: "minimal", weather: "thaw", hasGuns: false, hasTrailGuns: false, hasGroom: false, hasSnowFences });
    const without = thaw(false);
    const fenced = thaw(true);
    expect(0.4 - without[5].depth).toBeCloseTo(0.14, 6);
    expect(0.4 - fenced[5].depth).toBeCloseTo(0.098, 6);
    expect(fenced[0].depth).toBe(without[0].depth);
  });

  it("heritage_sign: +2 reputation at a Sunday Sleep, +0 on a Monday", () => {
    const after = (day: number, talents: TalentId[]) => {
      const night = close({ ...base(), dayIndex: day, talentsOwned: talents, reputation: 50 });
      return { night, slept: sleep({ ...night, cash: night.cash + 50_000 }) };
    };
    const plain = after(SUNDAY, []);
    const signed = after(SUNDAY, ["heritage_sign"]);
    expect(signed.slept.reputation - plain.slept.reputation).toBe(2);
    expect(after(8, ["heritage_sign"]).slept.reputation).toBe(after(8, []).slept.reputation);
  });

  it("bull_wheel: chair capacity 50 becomes 52.5, and 55.125 with Patrol Radio; surface unchanged", () => {
    expect(liftCapacityPerHour("chair", [])).toBe(50);
    expect(liftCapacityPerHour("chair", ["bull_wheel"])).toBeCloseTo(52.5, 6);
    expect(liftCapacityPerHour("chair", ["bull_wheel", "patrol_radio"])).toBeCloseTo(55.125, 6);
    expect(liftCapacityPerHour("surface", ["bull_wheel"])).toBe(47);
  });

  const guest = (persona: SatGuest["persona"]): SatGuest => ({
    persona, state: "ski", runs: 2, targetRuns: 4, waitMin: 0, waitCount: 0, snowSum: 2 * 0.4,
  });

  it("ski_school: first-timers arrive 0.05 happier (+2 points); regulars are unchanged", () => {
    const ctx = (talents: TalentId[]) => satisfactionContext({ ...base(), founderId: null, talentsOwned: talents });
    const gain = (persona: SatGuest["persona"]) =>
      guestTerms(guest(persona), ctx(["ski_school"])).arrivalMood - guestTerms(guest(persona), ctx([])).arrivalMood;
    expect(gain("first_timer")).toBeCloseTo(2, 6);
    expect(gain("regular")).toBe(0);
  });

  it("early_plow: a storm costs 2 skiers instead of 5, so +3", () => {
    expect(arrivalsDelta("early_plow", { weather: "storm" })).toBeCloseTo(3, 6);
    expect(arrivalsDelta("early_plow", { weather: "clear" })).toBe(0);
  });

  it("volunteer_patrol: the daily fixed cost drops from $1,095 to $1,080", () => {
    expect(dailyCosts(base()).fixed).toBe(1095);
    expect(dailyCosts(withTalent(base(), "volunteer_patrol")).fixed).toBe(1080);
  });

  it("night_lights: a guest finishing the walk in at 15:50 joins the line with the talent and goes home without it", () => {
    const state = base();
    const arriving = { ...state.guests[0], persona: "regular" as const, state: "arrive" as const, stateSinceMin: 945, arriveAtMin: 945 };
    const step = (talents: TalentId[]) => tickGuests([arriving], {
      now: 950, snowQuality: 0.6, trails: state.trails, lifts: state.lifts, talentsOwned: talents,
      lapOverheadMin: 5, assets: state.assets,
    })[0].state;
    expect(liftCloseMin([], LIFT_CLOSE_MIN)).toBe(945);
    expect(liftCloseMin(["night_lights"], LIFT_CLOSE_MIN)).toBe(TALENT.NIGHT_LIGHTS_CLOSE_MIN);
    expect(step([])).toBe("depart");
    expect(step(["night_lights"])).toBe("queue");
  });

  it("groomer_rebuild: Mid costs $140 and High $330, in the preview and at Sleep", () => {
    const plain = base();
    const rebuilt = withTalent(base(), "groomer_rebuild");
    expect(previewOvernight(plain, "mid").cost).toBe(150);
    expect(previewOvernight(rebuilt, "mid").cost).toBe(140);
    expect(previewOvernight(plain, "high").cost).toBe(350);
    expect(previewOvernight(rebuilt, "high").cost).toBe(330);
    const cash = (s: GameState) => morningCash(setPendingSnow(close(s), "high"));
    expect(cash(rebuilt) - cash(plain)).toBe(20);
  });

  it("first_aid_hut: a negative snow term shrinks by 15%, a positive one does not", () => {
    const ctx = (talents: TalentId[], expectation: number) =>
      ({ ...satisfactionContext({ ...base(), founderId: null, talentsOwned: talents }), snowExpectation: expectation });
    const bad = guestTerms(guest("regular"), ctx([], 0.8)).snow;
    const forgiven = guestTerms(guest("regular"), ctx(["first_aid_hut"], 0.8)).snow;
    expect(bad).toBeLessThan(0);
    expect(forgiven).toBeCloseTo(bad * 0.85, 6);
    expect(guestTerms(guest("regular"), ctx(["first_aid_hut"], 0.2)).snow).toBe(guestTerms(guest("regular"), ctx([], 0.2)).snow);
  });

  it("route100_billboard: the expected hill value goes from $39 to $40, so more skiers come", () => {
    expect(expectedHillValue(40, ["warming_hut"], [])).toBe(39);
    expect(expectedHillValue(40, ["warming_hut"], ["route100_billboard"])).toBe(40);
    expect(arrivalsDelta("route100_billboard", { fare: "balanced" })).toBeGreaterThanOrEqual(0);
  });
});
