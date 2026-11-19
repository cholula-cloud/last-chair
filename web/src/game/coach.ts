import { constructionDraw } from "./economy";
import type { GameState } from "./state";
import { LIFT_COST_PARAMS, type FounderId } from "./types";

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
  ["build", "Open Build to see what a chair would cost before the Saturday crowd arrives."],
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
    || (index === 4 && (s.buildMode || s.cash < constructionDraw(LIFT_COST_PARAMS.chair.base).deposit));
  if (done) return { index: index + 1, entered: null };
  return p.index === index && p.entered === entered ? p : { index, entered };
}
