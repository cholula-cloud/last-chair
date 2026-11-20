import { formatMoney } from "@/game/format";

export type UndoKind = "lift" | "trail" | "asset";

const PLACED: Record<UndoKind, string> = { lift: "Lift’s in", trail: "Trail’s cut", asset: "Venue’s in" };

/** Text of the undo chip after a placement, with the refund spelled out. */
export function undoChipLabel(kind: UndoKind, refund: number): string {
  return `${PLACED[kind]}. Undo for ${formatMoney(refund)}.`;
}
