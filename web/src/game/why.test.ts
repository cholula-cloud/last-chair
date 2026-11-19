import { describe, expect, it } from "vitest";
import { ZERO_TERMS } from "./satisfaction";
import type { NightRecap, RecapFacts } from "./sim";
import { delta, formatGuestObservation, formatPoints, observeGuests, whyLines } from "./why";

const facts: RecapFacts = {
  avgWaitMin: 6.4,
  snowQuality: 0.62,
  snowLabel: "Good cover",
  farePrice: 62,
  hillValue: 51,
  runsPerGuest: 5.2,
  turnedAway: 0,
  arrivalMood: 0.74,
};

describe("whyLines", () => {
  it("lists every term, largest effect first, with the real numbers", () => {
    const lines = whyLines({
      breakdown: { ...ZERO_TERMS, queue: -12, snow: 4, value: -6, arrivalMood: 2, runs: 5 },
      facts,
    });
    expect(lines.map((l) => l.key)).toEqual(["queue", "value", "runs", "snow", "arrivalMood"]);
    expect(lines[0].detail).toBe("waited 6.4 min a ride");
    expect(lines[1].detail).toContain("$62 felt steep");
    expect(lines[1].detail).toContain("$51");
    expect(lines[3].detail).toBe("Today's average: good cover, quality 62%");
    expect(lines[4].detail).toBe("mood 74 on arrival");
  });

  it("names a good deal as one", () => {
    const [line] = whyLines({ breakdown: { ...ZERO_TERMS, value: 5 }, facts: { ...facts, farePrice: 35 } });
    expect(line.detail).toContain("$35 felt like a fair deal");
  });

  it("mentions guests turned away", () => {
    const lines = whyLines({
      breakdown: { ...ZERO_TERMS, runs: -4 },
      facts: { ...facts, turnedAway: 3 },
    });
    expect(lines[0].detail).toContain("3 turned away");
  });
});

describe("formatPoints and delta", () => {
  it("signs whole points with a true minus", () => {
    expect(formatPoints(4.4)).toBe("+4");
    expect(formatPoints(-11.6)).toBe("−12");
    expect(formatPoints(0.2)).toBe("0");
  });

  it("reads direction and size against yesterday", () => {
    expect(delta(30, 24, (d) => `${d}`)).toEqual({ direction: "up", text: "6" });
    expect(delta(20, 24, (d) => `${d}`)).toEqual({ direction: "down", text: "4" });
    expect(delta(24.2, 24, (d) => `${d}`).direction).toBe("same");
  });
});

describe("closing observations", () => {
  const recap: NightRecap = {
    arrivals: 20, satisfaction: 60, cashDelta: 50, costs: null, revenue: null,
    loanReceived: 0, loanRepaid: 0, problem: "Lift lines", facts: { ...facts, dispatched: 20 },
    breakdown: { ...ZERO_TERMS, queue: -12, value: -5 },
  };

  it("revisits the same measure when tomorrow's biggest problem changes", () => {
    const first = observeGuests(recap)!;
    const next = {
      ...recap,
      facts: { ...recap.facts, avgWaitMin: 1.8 },
      breakdown: { ...ZERO_TERMS, queue: -1, value: -10 },
    };
    expect(first).toEqual({ measure: "queue", value: 6.4 });
    expect(observeGuests(next)?.measure).toBe("value");
    expect(formatGuestObservation(observeGuests(next, first.measure)!)).toBe("1.8 min");
  });

  it("requires actual guests and a queue sample for a wait reading", () => {
    const noRides = { ...recap, facts: { ...recap.facts, dispatched: 0, runsPerGuest: 0 } };
    expect(observeGuests(noRides)).toEqual({ measure: "runs", value: 0 });
    expect(observeGuests(noRides, "queue")).toBeNull();
    expect(observeGuests({ ...recap, arrivals: 0 })).toBeNull();
  });
});
