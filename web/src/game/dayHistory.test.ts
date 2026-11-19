import { expect, it } from "vitest";
import { createBuiltHill } from "./__fixtures__/built-hill";
import { dailyCosts, morningCash } from "./economy";
import { migrate } from "./migrations";
import { acknowledgeBeat, pickFounder, skipToClose, sleep } from "./rules";
import { SAVE_VERSION, toPersisted } from "./state";

it("archives the operating result and payments exactly once at settlement", () => {
  const night = acknowledgeBeat(skipToClose(pickFounder(createBuiltHill(3), "elena")));
  expect(night.dayHistory).toEqual([]);
  const next = sleep(night);
  expect(next.dayHistory).toEqual([{
    day: 1, fare: night.fare, snow: night.snow, weather: night.weather, recap: night.nightRecap,
    snowCost: dailyCosts(night).snowNight, constructionDue: dailyCosts(night).draws, closingCash: morningCash(night),
  }]);
  expect(sleep(next).dayHistory).toHaveLength(1);
  const saved = JSON.parse(JSON.stringify(toPersisted(next)));
  expect(migrate(saved, SAVE_VERSION)).toEqual({ reset: false, state: saved });
  delete saved.dayHistory;
  expect(migrate(saved, 7)).toMatchObject({ reset: false, state: { dayHistory: [], cash: next.cash, seasonDays: next.seasonDays } });
});
