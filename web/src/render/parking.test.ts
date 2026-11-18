import { describe, expect, it } from "vitest";
import type { Guest } from "@/game/types";
import { makeGuest } from "@/game/sim";
import { assignStalls, stallsEqual } from "./parking";

const stalls = Array.from({ length: 30 }, (_, i) => ({ x: i, z: 0 }));
const shoulder = Array.from({ length: 12 }, (_, i) => ({ x: 100 + i, z: 24 }));

function g(id: string, state: Guest["state"], arriveAtMin: number): Guest {
  return makeGuest({ id, state, arriveAtMin });
}

describe("assignStalls", () => {
  it("gives each arriving guest a distinct stall up to 30", () => {
    const guests = Array.from({ length: 30 }, (_, i) => g(`g${i}`, "queue", i));
    const map = assignStalls(new Map(), guests, stalls, shoulder);
    expect(map.size).toBe(30);
    const indices = new Set([...map.values()].filter((s) => s.kind === "stall").map((s) => s.index));
    expect(indices.size).toBe(30);
  });

  it("sends the 31st guest to shoulder spot 0", () => {
    const guests = Array.from({ length: 31 }, (_, i) => g(`g${i}`, "arrive", i));
    const map = assignStalls(new Map(), guests, stalls, shoulder);
    const overflow = map.get("g30");
    expect(overflow?.kind).toBe("shoulder");
    expect(overflow?.index).toBe(0);
  });

  it("keeps a guest's slot across repeated calls", () => {
    const guests = [g("a", "ski", 10), g("b", "queue", 20)];
    const first = assignStalls(new Map(), guests, stalls, shoulder);
    for (let i = 0; i < 100; i++) {
      const again = assignStalls(first, guests, stalls, shoulder);
      expect(stallsEqual(first, again)).toBe(true);
    }
  });

  it("frees a slot when a guest goes gone", () => {
    const guests = Array.from({ length: 30 }, (_, i) => g(`g${i}`, "queue", i));
    const full = assignStalls(new Map(), guests, stalls, shoulder);
    const idx = full.get("g0")!.index;
    const freed = [
      ...guests.filter((guest) => guest.id !== "g0"),
      g("g31", "arrive", 31),
    ];
    const after = assignStalls(full, freed, stalls, shoulder);
    expect(after.size).toBe(30);
    expect(after.get("g31")?.kind).toBe("stall");
    expect(after.get("g31")?.index).toBe(idx);
  });

  it("does not assign pending guests", () => {
    const map = assignStalls(new Map(), [g("p", "pending", 0)], stalls, shoulder);
    expect(map.size).toBe(0);
  });
});