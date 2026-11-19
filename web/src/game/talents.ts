import type { CrewMember, SnowPreset, TalentDef, TalentId } from "./types";

/**
 * Every numeric constant behind the crew talents (see SIMULATION_SPEC, Crew talents).
 * Effects read these through the pure helpers below; no talent id is compared with a
 * string literal anywhere else in the sim.
 */
export const TALENT = {
  /** Daily operating cost of a surface lift, dollars. */
  ROPE_TOW_OPS: 175,
  /** Added to every groom target. */
  GROOM_PASS_BONUS: 0.07,
  CORDUROY_BONUS: 0.03,
  /** Extra arrivals on weekends and holidays. */
  TICKET_BOOTH_ARRIVALS: 1,
  /** Extra arrivals on weekdays. */
  SCHOOL_DAY_ARRIVALS: 2,
  PATROL_RADIO_CAPACITY: 1.05,
  BULL_WHEEL_CAPACITY: 1.05,
  /** Arrival mood on Friday, Saturday, Sunday and holidays. */
  HOUSE_BAND_MOOD: 0.03,
  CAFE_SHIFT_VALUE: 2,
  /** Chair wind hold window, game clock minutes (11:00 to 12:15). */
  WIND_HOLD_FROM_MIN: 660,
  WIND_HOLD_TO_MIN: 735,
  /** Thaw depth loss multiplier on the two bottom segments. */
  SNOW_FENCES_LOSS: 0.7,
  HERITAGE_SIGN_REPUTATION: 2,
  SKI_SCHOOL_FIRST_TIMER_MOOD: 0.05,
  /** Storm-day arrival penalty, and the smaller one with Early Plow. */
  STORM_ARRIVAL_PENALTY: 5,
  EARLY_PLOW_ARRIVAL_PENALTY: 2,
  VOLUNTEER_PATROL_SAVING: 15,
  /** Lifts keep loading until this clock minute (15:55) instead of 15:45. */
  NIGHT_LIGHTS_CLOSE_MIN: 15 * 60 + 55,
  /** Snow & service price per night with the rebuilt groomer. */
  GROOMER_REBUILD_COST: { minimal: 0, mid: 140, high: 330 } as Record<SnowPreset, number>,
  /** Scale on the negative snow term. */
  FIRST_AID_SNOW_SCALE: 0.85,
  BILLBOARD_VALUE: 1,
} as const;

/** Crew order: one talent is learned at every Sleep, first unowned first. */
export const CREW_TALENTS: TalentDef[] = [
  { id: "rope_tow", name: "Rope Tow", crew: "frank", effect: "Surface lifts cost $175 a day to run instead of $180." },
  { id: "trail_guns", name: "Trail Guns", crew: "frank", effect: "Snow guns reach farther. High snow and service covers every trail." },
  { id: "groom_pass", name: "Groom Pass", crew: "frank", effect: "The groomer leaves better snow. Groomed snow quality goes up 7 points." },
  { id: "ticket_booth", name: "Ticket Booth", crew: "elena", effect: "One more skier arrives on weekends and holidays." },
  { id: "patrol_radio", name: "Patrol Radio", crew: "dana", effect: "Every lift carries 5% more skiers." },
  { id: "school_day", name: "School Day", crew: "elena", effect: "Two more skiers arrive on weekdays. The school bus message can come." },
  { id: "house_band", name: "House Band", crew: "elena", effect: "Guests arrive happier on Fridays, weekends and holidays." },
  { id: "cafe_shift", name: "Café Shift", crew: "elena", effect: "Your café is worth $2 more to every guest.", needs: "cafe" },
  { id: "wind_hold", name: "Wind Hold", crew: "dana", effect: "On windy days chairs close from 11:00 to 12:15 instead of 10:30 to 1:00.", needs: "chair" },
  { id: "corduroy", name: "Corduroy", crew: "frank", effect: "The groomer leaves better snow. Groomed snow quality goes up 3 more points." },
  { id: "snow_fences", name: "Snow Fences", crew: "frank", effect: "Thaw strips 30% less snow from the bottom of each trail." },
  { id: "heritage_sign", name: "Heritage Sign", crew: "elena", effect: "Your reputation goes up 2 points each Sunday night." },
  { id: "bull_wheel", name: "Bull Wheel Tune", crew: "frank", effect: "Chairs carry 5% more skiers.", needs: "chair" },
  { id: "ski_school", name: "Ski School", crew: "elena", effect: "First-time skiers arrive happier." },
  { id: "early_plow", name: "Early Plow", crew: "frank", effect: "Storms keep fewer skiers home. The drop is 2 skiers instead of 5." },
  { id: "volunteer_patrol", name: "Volunteer Patrol", crew: "dana", effect: "Volunteers cut your daily fixed cost by $15." },
  { id: "night_lights", name: "Night Lights", crew: "frank", effect: "Lifts keep loading until 3:55 PM instead of 3:45 PM." },
  { id: "groomer_rebuild", name: "Groomer Rebuild", crew: "frank", effect: "Mid snow and service costs $140. High costs $330." },
  { id: "first_aid_hut", name: "First Aid Hut", crew: "dana", effect: "Guests forgive bad snow more. Snow complaints count 15% less." },
  { id: "route100_billboard", name: "Route 100 Billboard", crew: "elena", effect: "Locals expect your day to be worth $1 more, so more skiers come at every price." },
];

export const TALENT_IDS: readonly TalentId[] = CREW_TALENTS.map((t) => t.id);

export const CREW_NAMES: Record<CrewMember, string> = { frank: "Frank", dana: "Dana", elena: "Elena" };

type Owned = readonly string[];
type Built = { chair: boolean; cafe: boolean };

const NEED_COPY: Record<NonNullable<TalentDef["needs"]>, string> = {
  chair: "a chair lift",
  cafe: "a café",
  lodge: "a lodge",
};

export function hasTalent(owned: Owned, id: TalentId): boolean {
  return owned.includes(id);
}

export function talentById(id: string): TalentDef | undefined {
  return CREW_TALENTS.find((t) => t.id === id);
}

/** What a talent is waiting for given what is built, or null when it works (or needs nothing). */
export function talentWaitingFor(id: TalentId, built: Built): string | null {
  const needs = talentById(id)?.needs;
  if (!needs) return null;
  const present = needs === "chair" ? built.chair : needs === "cafe" ? built.cafe : true;
  return present ? null : `Waits for ${NEED_COPY[needs]}.`;
}

/** Morning line naming what the crew learned and what it does, or what it waits for. */
export function talentLearnedLine(id: TalentId, built: Built): string {
  const talent = talentById(id);
  if (!talent) return "";
  return `Crew learned ${talent.name}. ${talentWaitingFor(id, built) ?? talent.effect}`;
}

/** The first talent the crew has not learned, in crew order. */
export function nextTalent(owned: Owned): TalentDef | null {
  return CREW_TALENTS.find((t) => !owned.includes(t.id)) ?? null;
}

// --- Effects ----------------------------------------------------------------

/** Daily operating cost of one open lift. */
export function liftOpsCostFor(type: "surface" | "chair", baseCost: number, owned: Owned): number {
  return type === "surface" && hasTalent(owned, "rope_tow") ? TALENT.ROPE_TOW_OPS : baseCost;
}

export function fixedCostSaving(owned: Owned): number {
  return hasTalent(owned, "volunteer_patrol") ? TALENT.VOLUNTEER_PATROL_SAVING : 0;
}

export function groomTargetBonus(owned: Owned): number {
  return (hasTalent(owned, "groom_pass") ? TALENT.GROOM_PASS_BONUS : 0)
    + (hasTalent(owned, "corduroy") ? TALENT.CORDUROY_BONUS : 0);
}

export function liftCapacityScale(type: "surface" | "chair", owned: Owned): number {
  return (hasTalent(owned, "patrol_radio") ? TALENT.PATROL_RADIO_CAPACITY : 1)
    * (type === "chair" && hasTalent(owned, "bull_wheel") ? TALENT.BULL_WHEEL_CAPACITY : 1);
}

export function snowNightCost(snow: SnowPreset, base: number, owned: Owned): number {
  return hasTalent(owned, "groomer_rebuild") ? TALENT.GROOMER_REBUILD_COST[snow] : base;
}

export function stormArrivalPenalty(owned: Owned): number {
  return hasTalent(owned, "early_plow") ? TALENT.EARLY_PLOW_ARRIVAL_PENALTY : TALENT.STORM_ARRIVAL_PENALTY;
}

export function windHoldWindow(
  owned: Owned,
  fallback: { readonly fromMin: number; readonly toMin: number },
): { readonly fromMin: number; readonly toMin: number } {
  return hasTalent(owned, "wind_hold")
    ? { fromMin: TALENT.WIND_HOLD_FROM_MIN, toMin: TALENT.WIND_HOLD_TO_MIN }
    : fallback;
}

/** Clock minute at which lifts stop loading. */
export function liftCloseMin(owned: Owned, base: number): number {
  return hasTalent(owned, "night_lights") ? TALENT.NIGHT_LIGHTS_CLOSE_MIN : base;
}

/** Arrival mood from talents; `festive` is Friday, a weekend or a holiday. */
export function talentArrivalMood(owned: Owned, festive: boolean): number {
  return hasTalent(owned, "house_band") && festive ? TALENT.HOUSE_BAND_MOOD : 0;
}

export function firstTimerMoodBonus(owned: Owned): number {
  return hasTalent(owned, "ski_school") ? TALENT.SKI_SCHOOL_FIRST_TIMER_MOOD : 0;
}

export function snowPenaltyScale(owned: Owned): number {
  return hasTalent(owned, "first_aid_hut") ? TALENT.FIRST_AID_SNOW_SCALE : 1;
}

export function cafeShiftValue(owned: Owned, hasCafe: boolean): number {
  return hasCafe && hasTalent(owned, "cafe_shift") ? TALENT.CAFE_SHIFT_VALUE : 0;
}

export function billboardValue(owned: Owned): number {
  return hasTalent(owned, "route100_billboard") ? TALENT.BILLBOARD_VALUE : 0;
}

/** Reputation added at a Sunday Sleep. */
export function heritageSignReputation(owned: Owned, weekday: string): number {
  return hasTalent(owned, "heritage_sign") && weekday === "Sun" ? TALENT.HERITAGE_SIGN_REPUTATION : 0;
}

/** The `count` lowest segments of a trail by elevation (the last index wins ties). */
export function bottomSegments(n: number, elevation: (i: number) => number, count = 2): Set<number> {
  return new Set(
    Array.from({ length: n }, (_, i) => i)
      .sort((a, b) => elevation(a) - elevation(b) || b - a)
      .slice(0, count),
  );
}
