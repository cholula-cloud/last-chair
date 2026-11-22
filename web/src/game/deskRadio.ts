import { DAY_1_COLD_READ, dryWeekRadio, formatOperatorText, STORY_BEATS } from "./content";
import type { GameState } from "./state";
import { surpriseRadio } from "./surprises";

export type DeskRadio = { title: string; radio: string };

/** Maris on a finished lodge addition. Tier 1 never completes, so it falls through to the Tier 3 line. */
export function lodgeOpeningRadio(tier: number): string {
  return tier === 2
    ? "The lodge addition is open at Tier 2. More parking, more tables, and room to run a real ski school."
    : "Tier 3 is open at the Dutch Hill lodge. Plenty of room inside now, though Frank says the lot needs a bigger plow.";
}

/**
 * The newest Route 100 Radio item for the Desk. A local moment from yesterday or today wins, then the
 * latest story beat the player has heard, then the latest older local moment, then the Day 1 cold read.
 */
export function latestRadio(
  state: Pick<GameState, "surpriseLog" | "completedBeats" | "dayIndex"> &
    Partial<Pick<GameState, "pendingBeat" | "seasonDays" | "beatLog" | "operatorName" | "fare" | "guns" | "vivianVisit" | "reputation">>,
): DeskRadio | null {
  const operatorName = state.operatorName ?? null;
  const gunsCount = state.guns?.length;
  const surpriseCtx = {
    ...(state.fare ? { fare: state.fare } : {}),
    ...(state.vivianVisit !== undefined ? { vivianVisit: state.vivianVisit } : {}),
    ...(state.reputation !== undefined ? { reputation: state.reputation } : {}),
  };
  const moment = state.surpriseLog.at(-1);
  const pending = STORY_BEATS.find(b => b.id === state.pendingBeat);
  if (pending) {
    const raw = pending.id === "dry_week" && gunsCount !== undefined ? dryWeekRadio(gunsCount) : pending.radio;
    return { title: pending.title, radio: formatOperatorText(raw, operatorName) };
  }
  const lodge = state.seasonDays?.findLast(day => day.lodgeOpening);
  if (lodge && lodge.day >= (moment?.dayIndex ?? 0) && lodge.day >= (state.beatLog?.at(-1)?.day ?? 0)) {
    return { title: "Lodge addition", radio: lodgeOpeningRadio(lodge.lodgeOpening ?? 2) };
  }
  if (moment && moment.dayIndex >= state.dayIndex - 1) return surpriseRadio(moment, operatorName, surpriseCtx);
  const beatId = state.completedBeats.at(-1);
  const beat = beatId ? STORY_BEATS.find((b) => b.id === beatId) : undefined;
  if (beat) {
    const raw = beat.id === "dry_week" && gunsCount !== undefined ? dryWeekRadio(gunsCount) : beat.radio;
    return { title: beat.title, radio: formatOperatorText(raw, operatorName) };
  }
  if (moment) return surpriseRadio(moment, operatorName, surpriseCtx);
  if (state.dayIndex === 1) {
    return { title: "Route 100 morning", radio: formatOperatorText(DAY_1_COLD_READ, operatorName) };
  }
  return null;
}
