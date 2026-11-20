import { CREW_TALENTS } from "./talents";
export { CREW_TALENTS } from "./talents";
import type {
  FounderDef,
  StoryBeatDef,
} from "./types";

export const WINTER_GOAL = "Reach day 28 with enough cash to cover your loan and any unpaid construction bills.";

/** What a hill with no founder modifier does. */
export const NO_FOUNDER_MODS = {
  arrivalMoodBonus: 0,
  fixedCostDelta: 0,
  snowExpectationPenalty: 0,
  loanRateDelta: 0,
  warmWeekMoodPenalty: 0,
  liftOpsDiscount: 0,
  noSummitLinkEquity: false,
  forecastDays: 1,
  forecastSkill: 0.5,
  reputationDrift: 0,
  clearingCostMult: 1,
  apresRevenueMult: 1,
  lockedBuildings: [],
} as const;
const NONE = NO_FOUNDER_MODS;

export const FOUNDERS: FounderDef[] = [
  {
    ...NONE,
    id: "elena",
    name: "Elena Vargas",
    title: "The Caretaker",
    bonus: "Guests arrive happier and word of mouth brings two extra skiers a day.",
    constraint: "The warming hut stays open all winter and cannot be removed.",
    arrivalMoodBonus: 0.08,
    lockedBuildings: ["warming_hut"],
  },
  {
    ...NONE,
    id: "tom",
    name: "Tom Keene",
    title: "The Refi",
    bonus: "Winter bank loans drop from 8% to 7% interest.",
    constraint: "Warm spells with three thaw days in a week hurt guest mood.",
    loanRateDelta: -0.01,
    warmWeekMoodPenalty: 0.075,
  },
  {
    ...NONE,
    id: "riley",
    name: "Riley Otis",
    title: "The Rigger",
    bonus: "Lift operating costs are 15% lower every day.",
    constraint: "Refuses outside pass-network buyout money later in the winter.",
    liftOpsDiscount: 0.15,
    noSummitLinkEquity: true,
  },
  {
    ...NONE,
    id: "amira",
    name: "Amira Chen",
    title: "The Forecast",
    bonus: "See a two-day weather forecast with higher accuracy.",
    constraint: "Skiers expect 5% better snow quality on your trails.",
    snowExpectationPenalty: 0.05,
    forecastDays: 2,
    forecastSkill: 0.7,
  },
  {
    ...NONE,
    id: "juniper",
    name: "Juniper Hale",
    title: "The Preservationist",
    bonus: "Gain steady reputation every night for running a classic hill.",
    constraint: "Lifts and trail clearing cost 15% more to build.",
    reputationDrift: 0.5,
    clearingCostMult: 1.15,
  },
  {
    ...NONE,
    id: "marco",
    name: "Marco Russo",
    title: "The Showman",
    bonus: "Base venues earn 10% more revenue every day.",
    constraint: "Fixed daily operating costs are $80 higher.",
    fixedCostDelta: 80,
    apresRevenueMult: 1.1,
  },
];

export function talentNeedLabel(
  talent: Pick<(typeof CREW_TALENTS)[number], "needs">,
  state: Pick<import("./state").GameState, "lifts" | "buildings" | "guns">,
): string | null {
  if (talent.needs === "chair" && !state.lifts.some((lift) => lift.confirmed && lift.type === "chair")) {
    return "Needs a chairlift";
  }
  if (talent.needs === "surface" && !state.lifts.some((lift) => lift.confirmed && lift.type === "surface")) {
    return "Needs a surface lift";
  }
  if (talent.needs === "cafe" && !state.buildings.includes("cafe")) {
    return "Needs a cafe";
  }
  if (talent.needs === "gun" && !state.guns.length) {
    return "Needs a snow gun";
  }
  return null;
}

export function talentDescription(name: string, state: Pick<import("./state").GameState, "lifts" | "buildings" | "guns">): string {
  const talent = CREW_TALENTS.find(entry => entry.name === name);
  if (!talent) return name;
  const need = talentNeedLabel(talent, state);
  return [`${talent.name} (${talent.crew}).`, talent.effect, need ? `${need}.` : null].filter(Boolean).join(" ");
}

export const STORY_BEATS: StoryBeatDef[] = [
  {
    id: "first_load",
    title: "First uphill load",
    radio:
      "Morning, Route 100. First paid chair up Dutch Hill since 1985. Readsboro Superintendent Al Waters is already asking if the hill will be ready for a school bus this winter.",
  },
  {
    id: "saturday",
    title: "Saturday crowd",
    radio:
      "Saturday morning on Route 100, and the lot has plates from Bennington, Williamstown, Brattleboro, and even Worcester. Keep the lift line moving and they will be back next weekend.",
  },
  {
    id: "school_bus",
    title: "Readsboro school bus",
    radio:
      "Call in from Al Waters at the Readsboro school district. He has six kids and a bus ready for a weekday ski lesson if you can fit them in.",
  },
  {
    id: "dry_week",
    title: "Dry spell",
    radio:
      "Dry stretch in the forecast, folks. Snow guns need cold air to help, so bump up overnight grooming or hold out for the next cold snap.",
  },
  {
    id: "summit_link",
    title: "Corporate pass offer",
    radio:
      "Heads up, Route 100. Vivian Cho from Summit Pass Corp pulled into Dutch Hill in a spotless rental SUV. She wants to put your hill on the mega-pass and pay you cash tonight.",
  },
  {
    id: "winter_review",
    title: "Last chair",
    radio:
      "That is last chair on Dutch Hill, and that wraps the winter. Maris Shaw here with how the season shook out.",
  },
];

export function founderById(id: string | null): FounderDef | undefined {
  return FOUNDERS.find((f) => f.id === id);
}