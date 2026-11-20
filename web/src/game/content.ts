import { CREW_TALENTS } from "./talents";
export { CREW_TALENTS } from "./talents";
import type {
  FounderDef,
  StoryBeatDef,
} from "./types";

export const WINTER_GOAL = "Get to day 28 with enough cash to cover your loan and whatever you still owe on construction.";

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
    bonus: "Happy families bring two extra guests.",
    constraint: "Keep the warming hut. Elena insists.",
    arrivalMoodBonus: 0.08,
    lockedBuildings: ["warming_hut"],
  },
  {
    ...NONE,
    id: "tom",
    name: "Tom Keene",
    title: "The Refi",
    bonus: "Borrow at 7% for the winter.",
    constraint: "Back-to-back thaw days cost 3 welcome points.",
    loanRateDelta: -0.01,
    warmWeekMoodPenalty: 0.075,
  },
  {
    ...NONE,
    id: "riley",
    name: "Riley Otis",
    title: "The Rigger",
    bonus: "Spend 15% less on lift operations.",
    constraint: "You have to turn down Vivian’s offer.",
    liftOpsDiscount: 0.15,
    noSummitLinkEquity: true,
  },
  {
    ...NONE,
    id: "amira",
    name: "Amira Chen",
    title: "The Forecast",
    bonus: "See two days of forecasts.",
    constraint: "Guests expect 5% better snow.",
    snowExpectationPenalty: 0.05,
    forecastDays: 2,
    forecastSkill: 0.7,
  },
  {
    ...NONE,
    id: "juniper",
    name: "Juniper Hale",
    title: "The Preservationist",
    bonus: "Gain extra reputation each night.",
    constraint: "Lifts and tree clearing cost 15% more.",
    reputationDrift: 0.5,
    clearingCostMult: 1.15,
  },
  {
    ...NONE,
    id: "marco",
    name: "Marco Russo",
    title: "The Showman",
    bonus: "Earn 10% more from venues.",
    constraint: "Pay $80 more per day.",
    fixedCostDelta: 80,
    apresRevenueMult: 1.1,
  },
];

export function talentDescription(name: string, state: Pick<import("./state").GameState, "lifts" | "buildings" | "guns">): string {
  const talent = CREW_TALENTS.find(entry => entry.name === name);
  if (!talent) return name;
  let waiting = "";
  if (talent.needs === "chair" || talent.needs === "surface") {
    if (!state.lifts.some(lift => lift.confirmed && lift.type === talent.needs)) {
      waiting = talent.needs === "chair" ? "Waits for a chair." : "Waits for a surface lift.";
    }
  } else if (talent.needs === "cafe" && !state.buildings.includes("cafe")) waiting = "Waits for a café.";
  else if (talent.needs === "gun" && !state.guns.length) waiting = "Waits for a snow gun.";
  return [`${talent.name} (${talent.crew}).`, talent.effect, waiting].filter(Boolean).join(" ");
}

export const STORY_BEATS: StoryBeatDef[] = [
  {
    id: "first_load",
    title: "First uphill load",
    radio:
      "Morning, Route 100. First paid ride up Dutch Hill since 1985, and Superintendent Al Waters has the radio on. He wants the Readsboro bus back up there, so get the lodge to Tier 2, run a ski lesson and keep the hill open.",
  },
  {
    id: "saturday",
    title: "Saturday corridor",
    radio:
      "Saturday on Route 100, and I’m counting plates from Bennington, Williamstown, Brattleboro and one brave soul from Wor-chester. That’s a parade, folks. Keep the line moving and they’ll know the way back.",
  },
  {
    id: "school_bus",
    title: "School bus",
    radio:
      "Message for Dutch Hill from Al Waters at the Readsboro school district: he has a bus and a handful of kids who’d love a day on the snow. Can you make room?",
  },
  {
    id: "dry_week",
    title: "Dry week",
    radio:
      "Dry week on the hill, folks, and the guns can’t do much without cold. Wait for a cold snap or close the lower third. Frank says the diesel can wait, but nobody can invent snow.",
  },
  {
    id: "summit_link",
    title: "Abominable Snowglomerate stop",
    radio:
      "Heads up, Route 100. Vivian Cho from Abominable Snowglomerate pulled off at Dutch Hill in a very clean rental car. She wants you on the pass map, and says you can keep the name.",
  },
  {
    id: "winter_review",
    title: "Winter review",
    radio:
      "That’s last chair on Dutch Hill, and that’s the winter. Maris Shaw here with how it all shook out.",
  },
];

export function founderById(id: string | null): FounderDef | undefined {
  return FOUNDERS.find((f) => f.id === id);
}
