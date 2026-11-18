import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MIGRATIONS, migrate, validateSave } from "./migrations";
import * as rules from "./rules";
import { createInitialState, hydrate, SAVE_VERSION, toPersisted } from "./state";

const fixturePath = new URL("./__fixtures__/saves/", import.meta.url);
const versions = Array.from({ length: SAVE_VERSION + 1 }, (_, version) => version);
const fixtures = versions.map((version) => {
  const raw = JSON.parse(readFileSync(new URL("v" + version + ".json", fixturePath), "utf8"));
  return { version, raw };
});

describe("save migration registry", () => {
  it("has one contiguous step and a fixture for each schema", () => {
    expect(MIGRATIONS.map((step) => step.to)).toEqual(versions.slice(1));
    expect(readdirSync(fixturePath).filter((file) => file.endsWith(".json")).sort())
      .toEqual(versions.map((version) => "v" + version + ".json").sort());
  });

  it.each(fixtures)("plays v$version through the night into the following morning", ({ version, raw }) => {
    expect(raw.version).toBe(version);
    const before = structuredClone(raw.state);
    const result = migrate(raw.state, version);
    expect(result.reset && result.reason).toBe(false);
    expect(raw.state).toEqual(before);
    expect(validateSave(result.state)).toEqual([]);
    expect(result.state).toMatchObject({
      cash: raw.state.cash, phase: "day", clockMin: raw.state.clockMin, seasonLength: 14,
    });
    if (version < 8) expect(result.state.lifts[0].anchor).toEqual({ x: -7.2, z: 1.2 });

    const day = hydrate(result.state, createInitialState());
    const ticked = rules.tick(rules.togglePause(day), 2000);
    expect(ticked.clockMin).toBeGreaterThan(day.clockMin);
    const night = rules.openNightIfReady(rules.skipToClose(ticked));
    expect(night.phase).toBe("night");
    expect(validateSave(toPersisted(night))).toEqual([]);
    const morning = rules.sleep(rules.acknowledgeBeat(night));
    expect(morning.dayIndex).toBe(day.dayIndex + 1);
    expect(validateSave(toPersisted(morning))).toEqual([]);
  });

  it("replays a v7 mid-day save to the same recap on both runs", () => {
    const play = () => {
      const state = migrate(fixtures[7].raw.state, 7).state;
      return rules.skipToClose(hydrate(state, createInitialState())).nightRecap;
    };
    const recap = play();
    expect(recap).not.toBeNull();
    expect(play()).toEqual(recap);
  });

  it("keeps closed historical lift slots", () => {
    const saved = toPersisted(createInitialState());
    saved.lifts = [...saved.lifts, ...Array.from({ length: 11 }, () => ({ ...saved.lifts[0], confirmed: false }))];
    expect(migrate(saved, SAVE_VERSION)).toEqual({ state: saved, reset: false });
  });

  it("recovers future, invalid, and corrupt saves", () => {
    const save = fixtures[SAVE_VERSION].raw.state;
    expect(migrate(save, SAVE_VERSION + 1)).toMatchObject({ reset: true, reason: "newer version" });
    expect(migrate(save, -1)).toMatchObject({ reset: true, reason: "invalid version" });
    expect(migrate({ ...save, cash: "NaN" }, SAVE_VERSION)).toMatchObject({ reset: true, reason: "cash" });
    expect(migrate({ ...save, phase: "night", nightRecap: null }, SAVE_VERSION))
      .toMatchObject({ reset: true, reason: "nightRecap" });
    expect(migrate({ ...save, guests: [null] }, SAVE_VERSION)).toMatchObject({ reset: true, reason: "guests" });
    expect(migrate(null, 3)).toMatchObject({ reset: true, state: { phase: "setup" } });
  });
});
