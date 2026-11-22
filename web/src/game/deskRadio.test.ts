import { describe, expect, it } from "vitest";
import { latestRadio } from "./deskRadio";
import { surpriseRadio } from "./surprises";

describe("latestRadio", () => {
  it("shows the Day 1 cold read before any broadcast and substitutes operatorName", () => {
    const anon = latestRadio({ surpriseLog: [], completedBeats: [], dayIndex: 1 });
    expect(anon?.title).toBe("Route 100 morning");
    expect(anon?.radio).toContain("the operator came home");

    const named = latestRadio({ surpriseLog: [], completedBeats: [], dayIndex: 1, operatorName: "Jules" });
    expect(named?.radio).toContain("Jules came home");
  });

  it("is null on later days before any broadcast", () => {
    expect(latestRadio({ surpriseLog: [], completedBeats: [], dayIndex: 3 })).toBeNull();
  });

  it("shows the latest story beat once the player has heard one", () => {
    const radio = latestRadio({ surpriseLog: [], completedBeats: ["first_load"], dayIndex: 3 });
    expect(radio?.title).toBe("First uphill load");
  });

  it("prefers a local moment from yesterday over an older beat", () => {
    const moment = { dayIndex: 4, kind: "pie" as const, affectedGuests: 0 };
    expect(latestRadio({ surpriseLog: [moment], completedBeats: ["first_load"], dayIndex: 5 })).toEqual(surpriseRadio(moment));
  });

  it("falls back to an older local moment when no beat was heard", () => {
    const moment = { dayIndex: 2, kind: "pie" as const, affectedGuests: 0 };
    expect(latestRadio({ surpriseLog: [moment], completedBeats: [], dayIndex: 9 })).toEqual(surpriseRadio(moment));
  });
});
