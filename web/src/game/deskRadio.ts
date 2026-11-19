import { STORY_BEATS } from "./content";
import type { GameState } from "./state";
import { surpriseRadio } from "./surprises";

export type DeskRadio = { title: string; radio: string };

/**
 * The newest Route 100 Radio item for the Desk. A local moment from yesterday or today wins, then the
 * latest story beat the player has heard, then the latest older local moment. Null before any broadcast.
 */
export function latestRadio(
  state: Pick<GameState, "surpriseLog" | "completedBeats" | "dayIndex">,
): DeskRadio | null {
  const moment = state.surpriseLog.at(-1);
  if (moment && moment.dayIndex >= state.dayIndex - 1) return surpriseRadio(moment);
  const beatId = state.completedBeats.at(-1);
  const beat = beatId ? STORY_BEATS.find((b) => b.id === beatId) : undefined;
  if (beat) return { title: beat.title, radio: beat.radio };
  return moment ? surpriseRadio(moment) : null;
}
