import { CREW_TALENTS } from "./talents";
export { CREW_TALENTS } from "./talents";
import type {
  FounderDef,
  StoryBeatDef,
} from "./types";

export const WINTER_GOAL = "Finish the winter in the black, with enough cash to cover any winter bank loan.";

export const OPERATOR_NAME_MAX = 24;

/** Sanitize an optional lease name (letters, digits, spaces, apostrophes, hyphens; max 24 chars). */
export function sanitizeOperatorName(raw: string): string | null {
  const cleaned = raw.replace(/[^a-zA-Z0-9 '\-]/g, "").replace(/\s+/g, " ").trim().slice(0, OPERATOR_NAME_MAX);
  if (!cleaned || cleaned.toLowerCase() === "the operator") return null;
  return cleaned;
}

/** Substitute `{name}` with the player's lease name or `"the operator"`. */
export function formatOperatorText(template: string, operatorName: string | null): string {
  const name = operatorName && operatorName.trim() ? operatorName.trim() : "the operator";
  return template.replaceAll("{name}", name);
}

export const DAY_1_COLD_READ =
  "Morning, Route 100. Word at the general store is {name} came home from up north and signed for Dutch Hill. Lodge lights are on. Lifts aren't. Yet.";

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
    relationship: "Taught your mom to snowplow on Dutch Meadows. Still uses your middle name when the lift line gets sloppy.",
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
    relationship: "Wrote small-hill loans for thirty winters. Says this one is either his masterpiece or his excuse to buy a camper.",
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
    relationship: "Rebuilt your first pickup and your second one. Wouldn't sell a rusted cotter pin to Whiterock.",
    bonus: "Lift operating costs are 15% lower every day.",
    constraint: "Refuses Whiterock buyout money later in the winter.",
    liftOpsDiscount: 0.15,
    noSummitLinkEquity: true,
  },
  {
    ...NONE,
    id: "amira",
    name: "Amira Chen",
    title: "The Forecast",
    relationship: "Moved up Route 100 for the quiet. Reads a barometer better than Boston reads the morning news.",
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
    relationship: "Runs the land trust meetings with a thermos and a grease pencil. Knows every sugar maple on the ridge.",
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
    relationship: "Threw the best pig roast Wilmington ever saw. Also the only one that needed a town selectboard bylaw afterward.",
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

export function dryWeekRadio(gunsCount: number): string {
  return gunsCount > 0
    ? "Dry stretch over the Green Mountains. Snow guns need cold air to bite, so fire 'em when the mercury drops."
    : "Dry stretch, and no snow guns yet. Hold out for cold air or rope off the lower third before it browns out.";
}

export const STORY_BEATS: StoryBeatDef[] = [
  {
    id: "first_load",
    title: "First uphill load",
    radio:
      "Morning, Route 100. {name} has Dutch Hill turning for the first time since '85, and the bullwheel didn't even eat a mitten. Superintendent Hank Pelletier is already asking if you're ready for a school bus.",
  },
  {
    id: "saturday",
    title: "Saturday crowd",
    radio:
      "Saturday on Route 100, and the gravel lot has plates from Bennington, Williamstown, Brattleboro, and one brave soul from Wooster. Keep the line moving and they'll bring friends.",
  },
  {
    id: "school_bus",
    title: "Readsboro school bus",
    radio:
      "Call in from Hank Pelletier at Readsboro Elementary. Six kids, twelve tiny skis, and a yellow bus warmed up for a weekday Arlberg lesson if you've got the room.",
  },
  {
    id: "dry_week",
    title: "Dry spell",
    radio:
      "Dry stretch parked over the Green Mountains. Snow guns need cold air to bite, so lean on the groomer tonight or hold out for the next clipper.",
  },
  {
    id: "groomer_down",
    title: "Groomer threw a track",
    radio:
      "Frank from the garage on Route 100. Groomer threw a track on the Windmill side. She'll live, but not tonight. Snow guns still run; the cat stays parked unless you borrow Readsboro's road machine for $250.",
  },
  {
    id: "summit_link",
    title: "Whiterock Pass offer",
    radio:
      "Heads up, {name}. Sloane Prescott from Whiterock pulled in with a spotless Range Rover and a laminated deck. She wants Dutch Hill on the Whiterock Pass, and she brought a check.",
  },
  {
    id: "winter_review",
    title: "Last chair",
    radio:
      "That's last chair on Dutch Hill, and the bullwheel's quiet for the season. Maris Shaw here with how your winter shook out.",
  },
];

export function founderById(id: string | null): FounderDef | undefined {
  return FOUNDERS.find((f) => f.id === id);
}
