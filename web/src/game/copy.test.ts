import { describe, expect, it } from "vitest";
import { CREW_TALENTS, STORY_BEATS } from "./content";
import { latestRadio, lodgeOpeningRadio } from "./deskRadio";
import { formatMoney } from "./format";
import { surpriseRadio, type SurpriseKind } from "./surprises";
import { SNOW_NIGHT_COST } from "./types";
import { TALENT } from "./talents";

const EMOJI = /\p{Extended_Pictographic}/u;
const KINDS: SurpriseKind[] = ["pie", "former_regulars", "road_delay"];

function lint(text: string) {
  expect(text).not.toMatch(/—|·/);
  expect(text).not.toMatch(EMOJI);
  expect(text.length).toBeLessThanOrEqual(220);
}

describe("player-facing copy", () => {
  it("keeps story beats, talents, surprises and lodge lines clean and short", () => {
    for (const beat of STORY_BEATS) lint(beat.radio);
    for (const talent of CREW_TALENTS) lint(talent.effect);
    for (const kind of KINDS) {
      for (const affectedGuests of [1, 4]) lint(surpriseRadio({ dayIndex: 3, kind, affectedGuests }).radio);
    }
    lint(lodgeOpeningRadio(2));
    lint(lodgeOpeningRadio(3));
  });

  it("has a distinct lodge line per tier, shared by the Desk", () => {
    expect(lodgeOpeningRadio(2)).toContain("Tier 2");
    expect(lodgeOpeningRadio(3)).toContain("Tier 3");
    for (const tier of [2, 3] as const) {
      const radio = latestRadio({
        surpriseLog: [], completedBeats: [], dayIndex: 9,
        seasonDays: [{ day: 8, lodgeOpening: tier }] as never,
      });
      expect(radio).toEqual({ title: "Lodge addition", radio: lodgeOpeningRadio(tier) });
    }
  });

  it("states the real Groomer Rebuild prices", () => {
    const text = TALENT.groomerRebuild.effect;
    for (const price of [SNOW_NIGHT_COST.mid, SNOW_NIGHT_COST.high, TALENT.groomerRebuild.mid, TALENT.groomerRebuild.high]) {
      expect(text).toContain(formatMoney(price));
    }
  });
});
