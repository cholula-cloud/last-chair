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
    text: "Tap the base area, then tap uphill to place your first lift.",
    when: (c) => idle(c) && c.opening === "lift",
  },
  {
    id: "pan",
    text: "Drag with two fingers to move around the mountain.",
    when: (c) => idle(c) && c.opening === "lift" && c.dayIndex === 1,
  },
  {
    id: "review",
    text: "Tap Review to check the cost, then tap Place to build.",
    when: (c) => c.phase === "day" && c.placementActive,
  },
  {
    id: "trail",
    text: "Paint a trail from the top of your lift down to the base or another trail.",
    when: (c) => idle(c) && c.opening === "trail",
  },
  {
    id: "speed",
    text: "Use the speed button to fast-forward through the ski day.",
    when: (c) => idle(c) && c.running && c.opening === null && c.dayIndex === 1,
  },
  {
    id: "lease",
    text: "Stay inside the dashed lease line when placing lifts, trails, and venues.",
    when: (c) => c.phase === "day" && c.buildOpen,
  },
  {
    id: "recap",
    text: "Check the night recap to see how today went and set tomorrow's fare and snow prep.",
    when: (c) => c.phase === "night",
  },
  {
    id: "guestsWant",
    text: "Check the top takeaway below to see what skiers wanted most today.",
    when: (c) => c.phase === "night" && c.hasGuestsWant,
  },
  {
    id: "goal",
    text: "Open Office and check Desk to track your winter goals and cash.",
    when: (c) => idle(c) && c.running && c.dayIndex >= 2,
  },
  {
    id: "guns",
    text: "Snow guns make snow overnight. Build them from the Base tab in Build.",
    when: (c) => idle(c) && c.running && c.dayIndex >= 3,
  },
  {
    id: "crew",
    text: "One crew point most nights. Pick a skill track in Office Crew. Patrol opens at Lodge Tier 2.",
    when: (c) => c.phase === "night" && c.dayIndex >= 2,
  },
  {
    id: "layers",
    text: "Tap Layers to inspect snow depth, crowds, and revenue on the mountain.",
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
  recap: Pick<NightRecap, "arrivals" | "breakdown" | "cashDelta" | "facts">,
  demand?: Demand["key"],
): ProblemGuide | null {
  const issue = demand ?? biggestProblem(recap.breakdown, recap.facts);
  switch (recap.arrivals ? issue : null) {
    case "seats":
      return { layer: "slope", tab: "Crew", text: "Check Slope for flat base space, or upgrade your lodge in Build for more seats." };
    case "green":
      return { layer: "slope", tab: "Crew", text: "Use Slope to find gentle terrain and paint another green trail for beginners." };
    case "lines":
    case "queue":
      return { layer: "slope", tab: "Money", text: "Scout a second lift line on Slope, or raise your ticket price to thin the crowd." };
    case "snow":
      return { layer: "conditions", tab: "Desk", text: "Check Conditions to spot worn trails, then bump up overnight snow prep." };
    case "runs":
      return { layer: "slope", tab: "Crew", text: "Check Slope for an easier route or add lift capacity so skiers get more runs." };
    case "value":
      return { layer: "conditions", tab: "Money", text: "Compare ticket price against hill value in Money, or add base venues to boost value." };
    case "arrivalMood":
      return { layer: "slope", tab: "Crew", text: "Keep snow fresh and ticket prices fair so skiers show up happy." };
    default:
      return recap.cashDelta < 0
        ? { layer: "conditions", tab: "Money", text: "Check Money to see where cash went, and match snow prep to tomorrow's forecast." }
        : null;
  }
}
