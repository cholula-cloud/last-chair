import { CREW_TALENTS } from "./talents";
export { CREW_TALENTS } from "./talents";
import type {
  FounderDef,
  StoryBeatDef,
} from "./types";

export const WINTER_GOAL = "Finish day 28 with enough cash to pay off your loan and any unpaid construction bills.";

export const FOUNDERS: FounderDef[] = [
  {
    id: "elena",
    name: "Elena Vargas",
    title: "The Caretaker",
    bonus: "Happier families bring two extra guests.",
    constraint: "Keep the warming hut.",
    arrivalMoodBonus: 0.08,
    fixedCostDelta: 0,
    snowExpectationPenalty: 0,
  },
  {
    id: "tom",
    name: "Tom Keene",
    title: "The Refi",
    bonus: "Borrow at 7% for the winter.",
    constraint: "Repeated thaw days cost 3 welcome points.",
    arrivalMoodBonus: 0,
    fixedCostDelta: 0,
    snowExpectationPenalty: 0,
  },
  {
    id: "riley",
    name: "Riley Otis",
    title: "The Rigger",
    bonus: "Spend 15% less on lift operations.",
    constraint: "Must decline Vivian’s offer.",
    arrivalMoodBonus: 0,
    fixedCostDelta: 0,
    snowExpectationPenalty: 0,
  },
  {
    id: "amira",
    name: "Amira Chen",
    title: "The Forecast",
    bonus: "See two days of forecasts.",
    constraint: "Guests expect 5% better snow.",
    arrivalMoodBonus: 0,
    fixedCostDelta: 0,
    snowExpectationPenalty: 0.05,
  },
  {
    id: "juniper",
    name: "Juniper Hale",
    title: "The Preservationist",
    bonus: "Gain extra reputation each night.",
    constraint: "Lift lines and tree clearing cost 15% more.",
    arrivalMoodBonus: 0,
    fixedCostDelta: 0,
    snowExpectationPenalty: 0,
  },
  {
    id: "marco",
    name: "Marco Russo",
    title: "The Showman",
    bonus: "Earn 10% more from venues.",
    constraint: "Pay $80 more per day.",
    arrivalMoodBonus: 0,
    fixedCostDelta: 80,
    snowExpectationPenalty: 0,
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
  return [talent.name + " (" + talent.crew + ")", talent.effect, waiting].filter(Boolean).join(" ");
}

export const STORY_BEATS: StoryBeatDef[] = [
  {
    id: "first_load",
    title: "First uphill load",
    radio:
      "First tickets since 1985, and Superintendent Al Waters is listening. He wants the Readsboro bus back up here. Get the lodge to Tier 2, run a ski lesson, and give him a hill that can stay open.",
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
      "Al Waters: Readsboro wants to bring a school bus to Dutch Hill. Can you make room?",
  },
  {
    id: "dry_week",
    title: "Dry week",
    radio:
      "No guns at the start — wait for cold or close the lower third. Frank says the diesel can wait; the snow can’t be invented.",
  },
  {
    id: "summit_link",
    title: "Abominable Snowglomerate stop",
    radio:
      "Vivian Cho pulls off Route 100: add us to the map, keep the name if you like. The pass wants the dot.",
  },
  {
    id: "winter_review",
    title: "Winter review",
    radio:
      "Last chair for the winter. Maris has the winter’s news from Dutch Hill.",
  },
];

export function founderById(id: string | null): FounderDef | undefined {
  return FOUNDERS.find((f) => f.id === id);
}
