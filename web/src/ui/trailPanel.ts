/** Which trail panel to show. A finger on the map collapses it so the hill stays in view. */
export type TrailPanelMode = "full" | "compact" | "review";

export function trailPanelMode(draft: { activeStroke: unknown; review: boolean; moveCamera: boolean }): TrailPanelMode {
  if (draft.review) return "review";
  return draft.activeStroke && !draft.moveCamera ? "compact" : "full";
}
