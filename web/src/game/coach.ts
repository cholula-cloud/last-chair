import { biggestProblem } from "./satisfaction";
import type { Demand } from "./guestsWant";
import type { NightRecap } from "./sim";
import type { MapLayer } from "./mapLayers";

/**
 * Coach tips for the first winter. A table of short tips, each shown once at the right moment.
 * Row 26 (the full coached winter) extends this table; the UI only reads `nextTip`.
 */

/** What the coach needs to know, gathered by the screen from game state and the build UI. */
export type CoachContext = {
  phase: "setup" | "day" | "night" | "winter_review" | "mountain2";
  dayIndex: number;
  /** The first-morning step still waiting on the player, if any (see `openingStep`). */
  opening: "lift" | "trail" | null;
  /** True once the day clock has started on day 1 or any later day. */
  running: boolean;
  placementActive: boolean;
  buildOpen: boolean;
  /** The night recap is open and has a "Guests want" line. */
  hasGuestsWant: boolean;
  /** Tips are switched on in Settings. */
  enabled: boolean;
};

export type CoachTip = {
  id: string;
  /** One complete sentence naming the gesture and the result. */
  text: string;
  when: (ctx: CoachContext) => boolean;
};

const idle = (ctx: CoachContext) => ctx.phase === "day" && !ctx.placementActive && !ctx.buildOpen;

/** In the order they are offered when several apply. */
export const COACH_TIPS: readonly CoachTip[] = [
  {
    id: "lift",
    text: "Tap the loading area, then tap the top terminal, to place a lift.",
    when: (c) => idle(c) && c.opening === "lift",
  },
  {
    id: "pan",
    text: "Use two fingers to move the map.",
    when: (c) => idle(c) && c.opening === "lift" && c.dayIndex === 1,
  },
  {
    id: "review",
    text: "Tap Review to see what it costs, then tap Place when you’re happy.",
    when: (c) => c.phase === "day" && c.placementActive,
  },
  {
    id: "trail",
    text: "Paint a trail from the lift top to the base, another trail, or the lower mountain.",
    when: (c) => idle(c) && c.opening === "trail",
  },
  {
    id: "speed",
    text: "Tap the speed button to hurry the day along.",
    when: (c) => idle(c) && c.running && c.opening === null && c.dayIndex === 1,
  },
  {
    id: "lease",
    text: "The dashed lease line marks where you can build. Past it, it’s somebody else’s woods.",
    when: (c) => c.phase === "day" && c.buildOpen,
  },
  {
    id: "recap",
    text: "The night recap tells you how the day went and sets tomorrow’s fare.",
    when: (c) => c.phase === "night",
  },
  {
    id: "guestsWant",
    text: "The line under the problem is the thing guests grumbled about most. Fix that first.",
    when: (c) => c.phase === "night" && c.hasGuestsWant,
  },
  {
    id: "goal",
    text: "Open Office and check the Desk tab for your winter goals and progress.",
    when: (c) => idle(c) && c.running && c.dayIndex >= 2,
  },
  {
    id: "guns",
    text: "Snow guns make snow overnight while you sleep. Build them from the Build sheet.",
    when: (c) => idle(c) && c.running && c.dayIndex >= 3,
  },
  {
    id: "crew",
    text: "Earn a crew point each night. Open the talent tree to pick, or sleep to auto-hire.",
    when: (c) => c.phase === "night" && c.dayIndex >= 2,
  },
  {
    id: "layers",
    text: "Tap Layers for snow depth, crowds, and revenue. Readouts stay in the bottom dock.",
    when: (c) => idle(c) && c.running && c.dayIndex >= 4,
  },
];

export const PROBLEM_GUIDE_ID = "problem-guide";
export const COACH_TIP_IDS: readonly string[] = [...COACH_TIPS.map((tip) => tip.id), PROBLEM_GUIDE_ID];

/** The one tip to show now, or null. Never two at once. */
export function nextTip(seen: readonly string[], ctx: CoachContext): CoachTip | null {
  if (!ctx.enabled) return null;
  return COACH_TIPS.find((tip) => !seen.includes(tip.id) && tip.when(ctx)) ?? null;
}

/** The seen list after a tip is dismissed. Unknown ids are ignored and repeats are not added. */
export function withTipSeen(seen: string[], id: string): string[] {
  if (!COACH_TIP_IDS.includes(id) || seen.includes(id)) return seen;
  return [...seen, id];
}

export type ProblemGuide = {
  layer: MapLayer;
  tab: "Money" | "Reports" | "Desk" | "Crew";
  text: string;
};

/** Pair a measured shortfall with tools that can actually explain it. */
export function problemGuide(
  recap: Pick<NightRecap, "arrivals" | "breakdown" | "cashDelta">,
  demand?: Demand["key"],
): ProblemGuide | null {
  const issue = demand ?? biggestProblem(recap.breakdown);
  switch (recap.arrivals ? issue : null) {
    case "seats":
      return { layer: "slope", tab: "Crew", text: "Look for flat ground near the base on Slope, then check the talent tree for lodge space and venue unlocks." };
    case "green":
      return { layer: "slope", tab: "Crew", text: "Trace another gentle descent on Slope, then check the talent tree for trail skills." };
    case "lines":
    case "queue":
      return { layer: "slope", tab: "Money", text: "Scout a lift site on Slope, then check Money for what you can afford." };
    case "snow":
      return { layer: "guns", tab: "Desk", text: "Check Snow-making for gun reach, then pick Mid or High if thaw is in the forecast." };
    case "runs":
      return { layer: "slope", tab: "Crew", text: "Hunt for a gentler route on Slope, then check the talent tree for your next lift or trail unlock." };
    case "value":
      return { layer: "conditions", tab: "Money", text: "See what the snow offered on Conditions, then compare ticket value and turnout in Money." };
    case "arrivalMood":
      return { layer: "slope", tab: "Crew", text: "Find a gentle first run on Slope, then check the talent tree for what your hill has learned." };
    default:
      return recap.cashDelta < 0
        ? { layer: "conditions", tab: "Money", text: "Check Conditions before you buy snow service, then see where today’s money went in Money." }
        : null;
  }
}
