/** Which trail panel to show. A finger on the map collapses it; the player can also minimize it to Cancel/Review. */
export type TrailPanelMode = "full" | "compact" | "minimized" | "review";

export function trailPanelMode(draft: {
  activeStroke: unknown;
  review: boolean;
  moveCamera: boolean;
  minimized?: boolean;
}): TrailPanelMode {
  if (draft.review) return "review";
  if (draft.activeStroke && !draft.moveCamera) return "compact";
  if (draft.minimized) return "minimized";
  return "full";
}
