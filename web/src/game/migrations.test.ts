import { describe, expect, it } from "vitest";
import { COACH_TIP_IDS } from "./coach";
import { migrate } from "./migrations";
import { SAVE_VERSION, createInitialState, toPersisted } from "./state";

/** A schema 6 save: the current shape without the coach field. */
function schema6(patch: Record<string, unknown> = {}) {
  const rest: Record<string, unknown> = { ...toPersisted(createInitialState(7)) };
  delete rest.tipsSeen;
  return { ...rest, ...patch };
}

describe("migration to schema 7", () => {
  it("is the current schema", () => {
    expect(SAVE_VERSION).toBe(7);
  });

  it("loads a schema 6 save from day 1 with no tips seen", () => {
    const result = migrate(schema6(), 6);
    expect(result.reset).toBe(false);
    expect(result.state.tipsSeen).toEqual([]);
  });

  it("treats a winter already under way as having seen every tip", () => {
    const days = toPersisted(createInitialState(7)).weatherDays;
    const result = migrate(schema6({ dayIndex: 4, weather: days[3].kind }), 6);
    expect(result.reset).toBe(false);
    expect(result.state.tipsSeen).toEqual([...COACH_TIP_IDS]);
  });

  it("rejects a current save whose tipsSeen is not a list of strings", () => {
    const bad = { ...toPersisted(createInitialState(7)), tipsSeen: [3] };
    expect(migrate(bad, SAVE_VERSION).reset).toBe(true);
  });
});
