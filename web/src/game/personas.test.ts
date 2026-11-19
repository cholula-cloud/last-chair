import { describe, expect, it } from "vitest";
import { createBuiltHill } from "./__fixtures__/built-hill";
import type { PlacedAsset } from "./base";
import { guestMixForDay, DUTCH_HILL_CALENDAR } from "./calendar";
import { PERSONAS, drawPersona, personaShare } from "./personas";
import { makeGuest, schoolBusGuests, tickGuests } from "./sim";
import { pickTrailIndex } from "./trails";
import type { PersonaId } from "./types";

describe("Family Pack and Race Kid", () => {
  const hill = createBuiltHill(17);
  const assets = ["rentals", "ski_school", "cafe"].map(id => ({ id, at: { x: 0, z: 0 }, styleId: "test" })) as PlacedAsset[];
  it("samples the holiday mix on school vacation and weights every day’s fare by the same shares", () => {
    for (const mix of ["weekday", "weekend", "holiday"] as const) {
      expect(Object.values(PERSONAS).reduce((sum, p) => sum + personaShare(p, mix), 0)).toBeCloseTo(1);
      expect(drawPersona(0.95, mix)).toBe("race_kid");
    }
    expect(guestMixForDay(DUTCH_HILL_CALENDAR, 23)).toBe("holiday");
    expect(drawPersona(0.63, "holiday")).toBe("family_pack");
    expect(drawPersona(0.63, "weekday")).toBe("regular");
  });
  it("picks green family trails and black training terrain when both are accessible", () => {
    const trails = (["green", "black"] as const).map(difficulty => ({ ...hill.trails[0], difficulty }));
    expect(pickTrailIndex("family_pack", trails, 0, "one", 0)).toBe(0);
    expect(pickTrailIndex("race_kid", trails, 0, "two", 0)).toBe(1);
    expect(PERSONAS.family_pack).toMatchObject({ queueWeight: 1.4, snowWeight: 0.9, valueWeight: 1 });
    expect(PERSONAS.race_kid).toMatchObject({ queueWeight: 1, snowWeight: 1.4, valueWeight: 0.9 });
  });
  it("sends families to rentals, race kids to training and every Readsboro pupil to lessons first", () => {
    const clock = { ...hill, now: 600, assets, lapOverheadMin: 3 };
    const arrive = (persona: PersonaId) => makeGuest({ persona, state: "arrive", stateSinceMin: 590 });
    const [family, racer] = tickGuests([arrive("family_pack"), arrive("race_kid")], clock);
    expect(family).toMatchObject({ rented: true, venueIndex: 0 });
    expect(racer).toMatchObject({ lesson: true, venueIndex: 1 });
    const pupils = schoolBusGuests(8, 6).map(g => ({ ...g, state: "arrive" as const, stateSinceMin: 590 }));
    expect(pupils.filter(g => g.persona === "race_kid")).toHaveLength(2);
    expect(tickGuests(pupils, clock).every(g => g.lesson && g.venueIndex === 1)).toBe(true);
  });
});
