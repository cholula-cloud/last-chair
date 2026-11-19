import type { FounderDef, StoryBeatDef } from "./types";

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
    bonus: "Guests arrive in a better mood.",
    constraint: "You can never tear down the warming hut.",
    arrivalMoodBonus: 0.08,
    lockedBuildings: ["warming_hut"],
  },
  {
    ...NONE,
    id: "tom",
    name: "Tom Keene",
    title: "The Refi",
    bonus: "Your loan costs 1% less.",
    constraint: "Guests arrive grumpy after a week of thaw.",
    loanRateDelta: -0.01,
    warmWeekMoodPenalty: 0.075,
  },
  {
    ...NONE,
    id: "riley",
    name: "Riley Otis",
    title: "The Rigger",
    bonus: "Your crew fixes lifts overnight. Lift running costs drop 15%.",
    constraint: "SummitLink won’t invest in you.",
    liftOpsDiscount: 0.15,
    noSummitLinkEquity: true,
  },
  {
    ...NONE,
    id: "amira",
    name: "Amira Chen",
    title: "The Forecast",
    bonus: "You see the weather two days ahead, and your forecast is sharper.",
    constraint: "Guests expect better snow.",
    snowExpectationPenalty: 0.05,
    forecastDays: 2,
    forecastSkill: 0.7,
  },
  {
    ...NONE,
    id: "juniper",
    name: "Juniper Hale",
    title: "The Preservationist",
    bonus: "Your reputation grows a little every night.",
    constraint: "Clearing land for lifts and trails costs 15% more.",
    reputationDrift: 0.5,
    clearingCostMult: 1.15,
  },
  {
    ...NONE,
    id: "marco",
    name: "Marco Russo",
    title: "The Showman",
    bonus: "Your café, shop and lessons earn 10% more.",
    constraint: "Your fixed cost is $80 a day higher.",
    fixedCostDelta: 80,
    apresRevenueMult: 1.1,
  },
];

export { CREW_TALENTS } from "./talents";

export const STORY_BEATS: StoryBeatDef[] = [
  {
    id: "first_load",
    title: "First uphill load",
    radio:
      "Last adult ticket here was 1985. DHASH hikers wave from the meadow — you just turned the tow.",
  },
  {
    id: "saturday",
    title: "Saturday corridor",
    radio:
      "Plates from Bennington, Williamstown, Brattleboro. Route 100 is a parade. Keep the queue moving.",
  },
  {
    id: "school_bus",
    title: "School bus",
    radio:
      "Al Waters: one Readsboro bus equals payroll lights. Treat those kids like the future of Dutch Meadows.",
  },
  {
    id: "dry_week",
    title: "Dry week",
    radio:
      "No guns at the start — wait for cold or close the lower third. Frank says the diesel can wait; the snow can’t be invented.",
  },
  {
    id: "summit_link",
    title: "SummitLink stop",
    radio:
      "Vivian Cho pulls off Route 100: add us to the map, keep the name if you like. The pass wants the dot.",
  },
  {
    id: "winter_review",
    title: "Winter review",
    radio:
      "You held one more winter in the sticks. Career pin unlocked: Tenney Mountain, NH — when you’re ready.",
  },
];

export function founderById(id: string | null): FounderDef | undefined {
  return FOUNDERS.find((f) => f.id === id);
}
