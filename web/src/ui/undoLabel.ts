import { formatMoney } from "@/game/format";

export type UndoKind = "lift" | "trail" | "asset";

const NOUN: Record<UndoKind, string> = { lift: "Lift", trail: "Trail", asset: "Asset" };

/** Text of the undo chip after a placement, with the refund spelled out. */
export function undoChipLabel(kind: UndoKind, refund: number): string {
  return `${NOUN[kind]} placed. Undo for ${formatMoney(refund)}.`;
}
