import { describe, expect, it } from "vitest";
import { createInitialState } from "./state";
import { historicStarterQuote, openingStep, pickFounder, placeLift, restoreHistoricStarterLine } from "./rules";
import { REFERENCE_TOPS } from "./descent";
import { TERRAIN } from "./terrain";

describe("Day 1 historic starter assist", () => {
  it("quotes and restores both the 1985 surface lift and starter trail on opening step", () => {
    const start = pickFounder(createInitialState(1, "dutch_hill"), "elena");
    expect(openingStep(start)).toBe("lift");
    const quote = historicStarterQuote(start);
    expect(quote).not.toBeNull();
    expect(quote!).toBeGreaterThan(0);

    const ready = restoreHistoricStarterLine(start);
    expect(openingStep(ready)).toBeNull();
    expect(ready.lifts.length).toBe(1);
    expect(ready.trails.length).toBe(1);
    expect(start.cash - ready.cash).toBe(quote);
  });

  it("finishes only the starter trail if the player already placed a lift", () => {
    const start = pickFounder(createInitialState(1, "dutch_hill"), "elena");
    const withLift = placeLift(start, { type: "surface", bottom: TERRAIN.base, top: REFERENCE_TOPS[0] });
    expect(openingStep(withLift)).toBe("trail");

    const quote = historicStarterQuote(withLift);
    expect(quote).not.toBeNull();
    const ready = restoreHistoricStarterLine(withLift);
    expect(openingStep(ready)).toBeNull();
    expect(ready.lifts.length).toBe(1);
    expect(ready.trails.length).toBe(1);
    expect(withLift.cash - ready.cash).toBe(quote);
  });

  it("is a no-op once the hill is already open", () => {
    const start = pickFounder(createInitialState(1, "dutch_hill"), "elena");
    const ready = restoreHistoricStarterLine(start);
    expect(restoreHistoricStarterLine(ready)).toBe(ready);
    expect(historicStarterQuote(ready)).toBeNull();
  });
});
