import type { Guest } from "@/game/types";
import type { XZ } from "@/game/site";

export type StallSlot =
  | { kind: "stall"; index: number; x: number; z: number }
  | { kind: "shoulder"; index: number; x: number; z: number };

function hashGuest(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function slotAt(
  kind: StallSlot["kind"],
  index: number,
  stalls: readonly XZ[],
  shoulder: readonly XZ[],
): StallSlot {
  const p = kind === "stall" ? stalls[index] : shoulder[index];
  return { kind, index, x: p.x, z: p.z };
}

/**
 * Stable stall assignment: one slot per guest who has arrived and not gone.
 * New guests probe from hash(id) % stalls; overflow uses shoulder spots in order.
 */
export function assignStalls(
  prev: Map<string, StallSlot>,
  guests: readonly Guest[],
  stalls: readonly XZ[],
  shoulder: readonly XZ[],
): Map<string, StallSlot> {
  const next = new Map<string, StallSlot>();
  const takenStall = new Set<number>();
  const takenShoulder = new Set<number>();

  const active = guests
    .filter((g) => g.state !== "pending" && g.state !== "gone")
    .sort((a, b) => a.arriveAtMin - b.arriveAtMin || a.id.localeCompare(b.id));

  for (const g of active) {
    const kept = prev.get(g.id);
    if (kept) {
      next.set(g.id, kept);
      if (kept.kind === "stall") takenStall.add(kept.index);
      else takenShoulder.add(kept.index);
    }
  }

  let shoulderCursor = 0;
  for (const g of active) {
    if (next.has(g.id)) continue;
    const start = stalls.length ? hashGuest(g.id) % stalls.length : 0;
    let placed: StallSlot | null = null;
    for (let k = 0; k < stalls.length; k++) {
      const idx = (start + k) % stalls.length;
      if (!takenStall.has(idx)) {
        placed = slotAt("stall", idx, stalls, shoulder);
        takenStall.add(idx);
        break;
      }
    }
    if (!placed && shoulder.length) {
      while (shoulderCursor < shoulder.length && takenShoulder.has(shoulderCursor)) shoulderCursor++;
      if (shoulderCursor < shoulder.length) {
        placed = slotAt("shoulder", shoulderCursor, stalls, shoulder);
        takenShoulder.add(shoulderCursor);
        shoulderCursor++;
      }
    }
    if (placed) next.set(g.id, placed);
  }

  return next;
}

export function stallsEqual(a: Map<string, StallSlot>, b: Map<string, StallSlot>) {
  if (a.size !== b.size) return false;
  for (const [k, v] of a) {
    const o = b.get(k);
    if (!o || o.kind !== v.kind || o.index !== v.index) return false;
  }
  return true;
}