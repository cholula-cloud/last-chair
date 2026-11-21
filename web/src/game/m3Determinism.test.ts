import { expect, it } from "vitest";
import { createBuiltHill } from "./__fixtures__/built-hill";
import { ADAPTIVE, runSeason, seedList } from "./balance";
import { migrate } from "./migrations";
import { pickFounder, resolveNightBeat, skipToClose, sleep, tick } from "./rules";
import { createInitialState, hydrate, SAVE_VERSION, toPersisted, type GameState } from "./state";
import { MS_PER_GAME_MINUTE } from "./types";

it.each(seedList(6))("replays the complete adaptive winter for seed %i", { timeout: 60_000 }, seed => {
  expect(runSeason(seed, ADAPTIVE)).toEqual(runSeason(seed, ADAPTIVE));
});

function nextMorning(night: GameState) {
  return sleep(resolveNightBeat(night));
}

function reload(state: GameState) {
  const migrated = migrate(JSON.parse(JSON.stringify(toPersisted(state))), SAVE_VERSION);
  expect(migrated.reset).toBe(false);
  return hydrate(migrated.state, createInitialState(999));
}

it("resumes the same winter from mid-day and night on day ten", { timeout: 60_000 }, () => {
  let state = pickFounder(createBuiltHill(42), "elena");
  for (let day = 1; day < 10; day++) state = nextMorning(skipToClose(state));
  const midday = tick({ ...state, paused: false }, 180 * MS_PER_GAME_MINUTE);
  expect(midday).toMatchObject({ phase: "day", dayIndex: 10 });
  expect(midday.clockMin).toBeGreaterThan(state.clockMin);
  let baseline = skipToClose(midday);
  let resumed = skipToClose(reload(midday));
  expect(toPersisted(resumed)).toEqual(toPersisted(baseline));
  resumed = reload(resumed);
  for (let day = 10; day <= baseline.seasonLength; day++) {
    baseline = nextMorning(baseline);
    resumed = nextMorning(resumed);
    expect(toPersisted(resumed)).toEqual(toPersisted(baseline));
    if (baseline.phase === "winter_review") break;
    baseline = skipToClose(baseline);
    resumed = skipToClose(resumed);
  }
  expect(resumed.phase).toBe("winter_review");
});
