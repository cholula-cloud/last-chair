import { biggestProblem } from "./satisfaction";
import type { NightRecap } from "./sim";
import type { MapLayer } from "./mapLayers";
import type { GameState } from "./state";
import { type FounderId } from "./types";

export const COACH_INTROS: Record<FounderId, string> = {
  elena: "Give families a lift up and a trail back to the lodge.",
  tom: "Start with a lift and a trail home so we can sell our first ticket.",
  riley: "Rig a lift, then cut a trail from its top back to the base.",
  amira: "Before the weather turns, build a lift and paint a trail home.",
  juniper: "Find a line through the trees for a lift and a trail home.",
  marco: "Give opening day a lift and a trail worth coming back for.",
};

export const TIPS = [
  ["opening", "Build the first lift and paint a connected trail."],
  ["ops-queue", "Your first rider is up, and this is the wait at the busiest lift."],
  ["ops-mood", "Lines, snow and ticket prices shape the mood you see here."],
  ["guests", "Tap Guests and follow someone to see their day."],
  ["build", "Open Build and review the Tier 2 lodge deposit before adding a chair or ski school."],
  ["close", "Close the hill when you’re ready to talk over the day."],
  ["recap-problem", "Read what happened today before you choose tomorrow’s plan."],
  ["fare", "Compare the ticket price with the expected turnout, then pick a fare."],
  ["snow", "Pick a service level after checking its cost and the overnight forecast."],
  ["sleep", "Sleep to send the crew out and open the hill tomorrow."],
] as const;

export type CoachProgress = { index: number; entered: number | null };
export const freshCoach: CoachProgress = { index: 0, entered: null };

export function activeTip(p: CoachProgress, s: GameState) {
  if (s.dayIndex !== 1 || !s.founderId || p.index >= TIPS.length) return null;
  if (s.phase === "night") return Math.max(6, p.index);
  if (s.phase !== "day" || p.index >= 6) return null;
  if (p.index === 1 && !s.dayStats.dispatched) return null;
  if (p.index === 2 && s.dayStats.completedRuns < 5 && s.clockMin < 600) return null;
  if (p.index === 5 && s.clockMin < 840) return null;
  return p.index;
}

/** Only coach progress changes; playing through the tips adds no simulation inputs. */
export function observeCoach(p: CoachProgress, s: GameState): CoachProgress {
  if (p.index >= TIPS.length || s.phase === "setup") return p;
  if (s.dayIndex > 1) return p;
  const index = activeTip(p, s);
  if (index === null) return p;
  const entered = p.entered ?? s.clockMin;
  const done = (index === 0 && !s.paused)
    || ((index === 1 || index === 2) && s.clockMin - entered >= 20)
    || (index === 3 && !!s.followId)
    || (index === 4 && (s.buildMode || s.lodgeTier > 1 || !!s.lodgeUpgrade));
  if (done) return { index: index + 1, entered: null };
  return p.index === index && p.entered === entered ? p : { index, entered };
}

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
    text: "Drag uphill from the base to place a lift.",
    when: (c) => idle(c) && c.opening === "lift",
  },
  {
    id: "pan",
    text: "Use two fingers to move the map.",
    when: (c) => idle(c) && c.opening === "lift" && c.dayIndex === 1,
  },
  {
    id: "review",
    text: "Tap Review to see the cost, then tap Place.",
    when: (c) => c.phase === "day" && c.placementActive,
  },
  {
    id: "trail",
    text: "Paint a trail from the top of the lift down to the base.",
    when: (c) => idle(c) && c.opening === "trail",
  },
  {
    id: "speed",
    text: "Tap the speed button to make the day go faster.",
    when: (c) => idle(c) && c.running && c.opening === null && c.dayIndex === 1,
  },
  {
    id: "lease",
    text: "The lease line shows the land you may build on.",
    when: (c) => c.phase === "day" && c.buildOpen,
  },
  {
    id: "recap",
    text: "The night recap shows how the day went and sets tomorrow’s fare.",
    when: (c) => c.phase === "night",
  },
  {
    id: "guestsWant",
    text: "The Guests want line names the one thing guests asked for most.",
    when: (c) => c.phase === "night" && c.hasGuestsWant,
  },
  {
    id: "goal",
    text: "The goal strip under the date shows what to finish this winter.",
    when: (c) => idle(c) && c.running && c.dayIndex >= 2,
  },
  {
    id: "guns",
    text: "Snow guns make snow overnight. Build them from the Build sheet.",
    when: (c) => idle(c) && c.running && c.dayIndex >= 3,
  },
];

export const COACH_TIP_IDS: readonly string[] = COACH_TIPS.map((tip) => tip.id);

/** The one tip to show now, or null. Never two at once. */
export function nextTip(seen: readonly string[], ctx: CoachContext): CoachTip | null {
  if (!ctx.enabled) return null;
  return COACH_TIPS.find((tip) => !seen.includes(tip.id) && tip.when(ctx)) ?? null;
}

/** The seen list after a tip is dismissed. Unknown ids are ignored and repeats are not added. */
export function withTipSeen(seen: readonly string[], id: string): string[] {
  if (!COACH_TIP_IDS.includes(id) || seen.includes(id)) return [...seen];
  return [...seen, id];
}

export type ProblemGuide = {
  layer: MapLayer;
  tab: "Money" | "Reports" | "Desk" | "Crew";
  text: string;
};

/** Pair a measured shortfall with tools that can actually explain it. */
export function problemGuide(recap: Pick<NightRecap, "arrivals" | "breakdown" | "cashDelta">): ProblemGuide | null {
  switch (recap.arrivals ? biggestProblem(recap.breakdown) : null) {
    case "queue":
      return { layer: "slope", tab: "Money", text: "Scout a lift site on Slope, then check Money for the deposit you can afford." };
    case "snow":
      return { layer: "conditions", tab: "Desk", text: "Inspect the cover on Conditions, then check tomorrow’s forecast at the Desk." };
    case "runs":
      return { layer: "slope", tab: "Crew", text: "Look for a gentler route on Slope, then check Crew for your next lift or trail unlock." };
    case "value":
      return { layer: "conditions", tab: "Money", text: "See what the snow offered on Conditions, then compare ticket value and turnout in Money." };
    case "arrivalMood":
      return { layer: "slope", tab: "Crew", text: "Find a gentle first run on Slope and check Crew for the skills your hill has learned." };
    default:
      return recap.cashDelta < 0
        ? { layer: "conditions", tab: "Money", text: "Check Conditions before buying snow service, then look at today’s costs in Money." }
        : null;
  }
}
