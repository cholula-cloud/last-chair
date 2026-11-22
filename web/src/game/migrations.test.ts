import upstreamV7 from "./__fixtures__/upstream-v7.json";
import releasedSaves from "./__fixtures__/m3-saves.json";
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

describe("M3 schema migration", () => {
  it("is the current schema", () => {
    expect(SAVE_VERSION).toBe(18);
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

  it("retains both schema 7 histories and leaves unknown Office reports empty", () => {
    const upstream = migrate({ ...upstreamV7.state, tipsSeen: ["open_tow"] }, 7);
    expect(upstream).toMatchObject({ reset: false, state: { tipsSeen: ["open_tow"], dayHistory: [], seasonDays: [] } });
    const previous = releasedSaves.find(save => save.version === 7)!;
    const history = [{ day: 1, fare: "balanced", snow: "mid", arrivals: 20, satisfaction: 75 }];
    const preview = migrate({ ...previous.state, seasonDays: history }, 7);
    expect(preview).toMatchObject({ reset: false, state: { seasonDays: history, tipsSeen: [], dayHistory: [] } });
  });

  it("strips attachPad when the pad index is beyond the lodge tier cap", () => {
    const base = toPersisted(createInitialState(7));
    const withPad = {
      ...base,
      lodgeTier: 2,
      assets: [{ id: "cafe", at: { x: 1, z: 1 }, styleId: "timber50s", attachPad: 4 }],
    };
    const result = migrate(withPad, 11);
    expect(result.reset).toBe(false);
    expect(result.state.assets[0]).not.toHaveProperty("attachPad");
  });

  it("keeps one annex flag at Tier 2 and drops extras after the two-pad cap", () => {
    const base = toPersisted(createInitialState(7));
    const withPads = {
      ...base,
      lodgeTier: 2,
      assets: [
        { id: "rentals", at: { x: 1, z: 1 }, styleId: "timber50s", attachPad: 0 },
        { id: "cafe", at: { x: 2, z: 2 }, styleId: "timber50s", attachPad: 1 },
      ],
    };
    const result = migrate(withPads, 12);
    expect(result.reset).toBe(false);
    expect(result.state.assets[0]).toMatchObject({ attachPad: 0 });
    expect(result.state.assets[1]).not.toHaveProperty("attachPad");
  });

  it("adds lodgeStyleId and normalizes style ids when upgrading from schema 13", () => {
    const base = toPersisted(createInitialState(7));
    delete (base as { lodgeStyleId?: string }).lodgeStyleId;
    const withLegacyStyle = {
      ...base,
      assets: [{ id: "cafe", at: { x: 1, z: 1 }, styleId: "timber50s" }],
    };
    const result = migrate(withLegacyStyle, 13);
    expect(result.reset).toBe(false);
    expect(result.state.lodgeStyleId).toBe("1950s-timber");
    expect(result.state.assets[0].styleId).toBe("1950s-timber");
  });

  it("adds vivianVisit, clubBooking, and groomerDown defaults when upgrading from schema 15", () => {
    const base = toPersisted(createInitialState(7));
    const v15 = { ...base };
    delete (v15 as { vivianVisit?: unknown }).vivianVisit;
    delete (v15 as { clubBooking?: unknown }).clubBooking;
    delete (v15 as { groomerDown?: unknown }).groomerDown;
    const result = migrate(v15, 15);
    expect(result.reset).toBe(false);
    expect(result.state.vivianVisit).toBeNull();
    expect(result.state.clubBooking).toBeNull();
    expect(result.state.groomerDown).toBeNull();
  });

  it("adds default careerHills roster when upgrading from schema 16", () => {
    const base = toPersisted(createInitialState(7));
    const v16 = { ...base };
    delete (v16 as { careerHills?: unknown }).careerHills;
    const result = migrate(v16, 16);
    expect(result.reset).toBe(false);
    expect(result.state.careerHills).toHaveLength(8);
    expect(result.state.careerHills[0]).toMatchObject({ mountainId: "dutch_hill", status: "open" });
  });

  it("adds Mount Tom, Maple Valley, and caretaker defaults when upgrading from schema 17", () => {
    const base = toPersisted(createInitialState(7));
    const v17 = { ...base };
    delete (v17 as { nightLights?: unknown }).nightLights;
    delete (v17 as { orchardParcel?: unknown }).orchardParcel;
    delete (v17 as { homecomingNotes?: unknown }).homecomingNotes;
    delete (v17 as { caretakerLedger?: unknown }).caretakerLedger;
    const result = migrate(v17, 17);
    expect(result.reset).toBe(false);
    expect(result.state.nightLights).toBe(false);
    expect(result.state.orchardParcel).toBe("unbid");
    expect(result.state.homecomingNotes).toEqual([]);
    expect(result.state.caretakerLedger).toEqual([]);
  });

  it("rejects a current save whose tipsSeen is not a list of strings", () => {
    const bad = { ...toPersisted(createInitialState(7)), tipsSeen: [3] };
    expect(migrate(bad, SAVE_VERSION).reset).toBe(true);
  });
});
