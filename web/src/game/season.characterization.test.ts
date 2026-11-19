import { beforeAll, describe, expect, it, vi } from "vitest";
import * as rules from "./rules";
import * as sim from "./sim";
import * as weather from "./weather";
import { founderById } from "./content";
import { REFERENCE_TOPS } from "./descent";
import { expectedHillValue } from "./satisfaction";
import { createInitialState, type GameState } from "./state";
import { referencePaint } from "./__fixtures__/built-hill";
import type { PaintStroke } from "./paintedTrail";
import { TERRAIN, type XZ } from "./terrain";
import type { WeatherKind } from "./types";

const SEED = 42;

// Characterization test: drives a whole season headlessly and snapshots the
// result. The snapshot file is the behavioral contract; never hand-edit it.

function installLocalStorage() {
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
      clear: () => data.clear(),
      key: (i: number) => [...data.keys()][i] ?? null,
      get length() {
        return data.size;
      },
    },
  });
}

const round = (n: number | undefined) =>
  n === undefined ? undefined : Math.round(n * 10000) / 10000;

type View = GameState;

type Driver = {
  view(): View;
  pickFounder(id: "elena"): void;
  togglePause(): void;
  tick(ms: number): void;
  beginLodgeUpgrade(): void;
  buyBuilding(id: "cafe"): void;
  setSelectedLiftType(t: "chair"): void;
  placeLift(req: { type: "surface" | "chair"; bottom: XZ; top: XZ }): void;
  commitPaint(strokes: readonly PaintStroke[]): void;
  setPendingFare(f: "cheap" | "balanced" | "expensive"): void;
  setPendingSnow(s: "minimal" | "mid" | "high"): void;
  acknowledgeBeat(): void;
  declineSchoolContract(): void;
  declineSummitLink(): void;
  sleep(): void;
  finishWinterReview(): void;
  startNewSeason(): void;
};

const FARES = ["cheap", "balanced", "expensive"] as const;
const SNOWS = ["minimal", "mid", "high"] as const;

function summarize(v: View) {
  return {
    dayIndex: v.dayIndex,
    lodgeTier: v.lodgeTier,
    phase: v.phase,
    cash: v.cash,
    arrivals: v.dayStats.arrivals,
    satisfaction: round(v.nightRecap?.satisfaction),
    cashDelta: v.nightRecap?.cashDelta,
    snowQuality: round(v.snowQuality),
    snowDepth: round(v.snowDepth),
    weather: v.weather,
    reputation: v.reputation,
    talents: v.talentsOwned.length,
    beats: v.completedBeats.join(","),
    pendingBeat: v.pendingBeat,
  };
}

function playSeason(d: Driver) {
  const nights: ReturnType<typeof summarize>[] = [];
  d.pickFounder("elena");
  d.placeLift({ type: "surface", bottom: TERRAIN.base, top: REFERENCE_TOPS[0] });
  d.commitPaint(referencePaint(d.view(), 0, "green"));
  expect(rules.openingStep(d.view())).toBeNull();
  d.togglePause();
  d.beginLodgeUpgrade();
  while (d.view().phase !== "winter_review") {
    const day = d.view().dayIndex;
    if (d.view().phase === "day" && day === 2) d.buyBuilding("cafe");
    if (d.view().phase === "day" && day === 4) {
      d.setSelectedLiftType("chair");
      d.placeLift({ type: "chair", bottom: TERRAIN.base, top: REFERENCE_TOPS[1] });
      expect(d.view().lifts.some((lift) => lift.confirmed && lift.type === "chair")).toBe(true);
      d.commitPaint(referencePaint(d.view(), 1));
    }
    if (d.view().paused) d.togglePause();
    while (d.view().phase === "day") d.tick(2000);
    d.setPendingFare(FARES[day % 3]);
    d.setPendingSnow(SNOWS[day % 3]);
    nights.push(summarize(d.view()));
    const pendingBeat = d.view().pendingBeat;
    if (pendingBeat === "school_bus") d.declineSchoolContract();
    else if (pendingBeat === "summit_link") d.declineSummitLink();
    else if (pendingBeat) d.acknowledgeBeat();
    d.sleep();
  }
  d.finishWinterReview();
  d.startNewSeason();
  return { nights, final: finalState(d.view()) };
}

function roundDeep(v: unknown): unknown {
  if (typeof v === "number") return round(v);
  if (Array.isArray(v)) return v.map(roundDeep);
  if (v && typeof v === "object") {
    return Object.fromEntries(
      Object.entries(v).map(([k, x]) => [k, roundDeep(x)]),
    );
  }
  return v;
}

/** Whole simulation state minus functions, guest contents and RNG bookkeeping. */
function finalState(v: View) {
  const rest: Record<string, unknown> = {};
  for (const [k, x] of Object.entries(v)) {
    if (typeof x === "function" || k === "guests" || k === "rngState" || k === "saveNotice") continue;
    rest[k] = x;
  }
  return { ...(roundDeep(rest) as object), guestCount: v.guests.length };
}

function storeDriver(
  store: typeof import("./store").useGameStore,
): Driver {
  const s = () => store.getState();
  return {
    view: () => s(),
    pickFounder: (id) => s().pickFounder(id),
    togglePause: () => s().togglePause(),
    tick: (ms) => s().tick(ms),
    beginLodgeUpgrade: () => s().beginLodgeUpgrade(),
    buyBuilding: (id) => s().buyBuilding(id),
    setSelectedLiftType: (t) => s().setSelectedLiftType(t),
    placeLift: (req) => s().placeLift(req),
    commitPaint: (strokes) => s().commitPaint(strokes),
    setPendingFare: (f) => s().setPendingFare(f),
    setPendingSnow: (x) => s().setPendingSnow(x),
    acknowledgeBeat: () => s().acknowledgeBeat(),
    declineSchoolContract: () => s().decideSchoolContract("declined"),
    declineSummitLink: () => s().replyToSummitLink("declined"),
    sleep: () => s().sleep(),
    finishWinterReview: () => s().finishWinterReview(),
    startNewSeason: () => s().startNewSeason(),
  };
}

function pureDriver(seed: number): Driver {
  let state = createInitialState(seed);
  const apply = (f: (s: GameState) => GameState) => void (state = f(state));
  return {
    view: () => state,
    pickFounder: (id) => apply((s) => rules.pickFounder(s, id)),
    togglePause: () => apply(rules.togglePause),
    tick: (ms) => apply((s) => rules.tick(s, ms)),
    beginLodgeUpgrade: () => apply(rules.beginLodgeUpgrade),
    buyBuilding: (id) => apply((s) => rules.buyBuilding(s, id)),
    setSelectedLiftType: (t) => apply((s) => rules.setSelectedLiftType(s, t)),
    placeLift: (req) => apply((s) => rules.placeLift(s, req)),
    commitPaint: (strokes) => apply((s) => rules.commitPaint(s, strokes)),
    setPendingFare: (f) => apply((s) => rules.setPendingFare(s, f)),
    setPendingSnow: (x) => apply((s) => rules.setPendingSnow(s, x)),
    acknowledgeBeat: () => apply(rules.acknowledgeBeat),
    declineSchoolContract: () => apply((s) => rules.decideSchoolContract(s, "declined")),
    declineSummitLink: () => apply((s) => rules.replyToSummitLink(s, "declined")),
    sleep: () => apply(rules.sleep),
    finishWinterReview: () => apply(rules.finishWinterReview),
    startNewSeason: () => apply(rules.startNewSeason),
  };
}

// M2 opening day was always clear. The remaining entries record its gunless formula.
const LEGACY_WEATHER: WeatherKind[] = [
  "clear", "clear", "thaw", "snow", "thaw", "thaw", "snow", "thaw", "clear", "thaw",
  "snow", "clear", "thaw", "snow", "thaw", "thaw", "snow", "thaw", "clear", "thaw",
  "snow", "clear", "thaw", "snow", "thaw", "thaw", "snow", "thaw",
];

// Pin the former attendance calibration while this case checks downstream simulation.
function legacyArrivals(opts: Parameters<typeof sim.planArrivals>[0]): number {
  const weekend = sim.isWeekend(opts.dayIndex);
  const noise = Math.floor(opts.rand!() * 5);
  const base = weekend ? Math.round((24 + noise) * 1.3) : 18 + noise;
  const value = expectedHillValue(opts.reputation ?? sim.DEMAND.START_REPUTATION, opts.buildings);
  let arrivals = Math.round(base * sim.fareDemandMultiplier(opts.fare, value, weekend));
  if (opts.weather === "snow") arrivals += 3;
  if (opts.weather === "thaw") arrivals -= 4;
  if (opts.snowQuality < 0.4) arrivals -= 3;
  if (opts.buildings.includes("cafe")) arrivals += 1;
  if (opts.talentsOwned.includes("ticket_booth") && weekend) arrivals += 1;
  if (opts.talentsOwned.includes("school_day") && !weekend) arrivals += 2;
  const founder = founderById(opts.founderId);
  if (founder) arrivals += Math.round(founder.arrivalMoodBonus * 20);
  return Math.max(12, Math.min(48, arrivals));
}

describe("season characterization", () => {
  beforeAll(installLocalStorage);

  // Both drivers start at the lodge, build their lifts and paint their descents.
  it("store path with mocked Math.random", { timeout: 20_000 }, async () => {
    const pure = playSeason(pureDriver(SEED));

    const { useGameStore } = await import("./store");
    useGameStore.setState(createInitialState(SEED));
    const viaStore = playSeason(storeDriver(useGameStore));

    expect(pure).toEqual(viaStore);
    expect(viaStore).toMatchSnapshot();
  });

  it("legacy formula weather and attendance", { timeout: 20_000 }, () => {
    const arrivals = vi.spyOn(sim, "planArrivals").mockImplementation(legacyArrivals);
    const schedule = vi.spyOn(weather, "generateSeasonWeather").mockImplementation((_, length) =>
      LEGACY_WEATHER.slice(0, length).map((kind) => ({ kind, wind: "calm" })),
    );
    try {
      expect(playSeason(pureDriver(SEED))).toMatchSnapshot();
    } finally {
      arrivals.mockRestore();
      schedule.mockRestore();
    }
  });
});
