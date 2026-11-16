import { beforeAll, describe, expect, it } from "vitest";
import * as rules from "./rules";
import { createInitialState, type GameState } from "./state";

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

type View = {
  paused: boolean;
  dayIndex: number;
  phase: string;
  cash: number;
  dayStats: { arrivals: number };
  nightRecap: { satisfaction: number; cashDelta: number } | null;
  snowQuality: number;
  snowDepth: number;
  weather: string;
  reputation: number;
  talentsOwned: string[];
  completedBeats: string[];
  pendingBeat: string | null;
  guests: unknown[];
};

type Driver = {
  view(): View;
  pickFounder(id: "elena"): void;
  togglePause(): void;
  tick(ms: number): void;
  buyBuilding(id: "cafe"): void;
  setSelectedSlotIndex(i: number): void;
  setSelectedLiftType(t: "chair"): void;
  confirmLift(): void;
  setPendingFare(f: "cheap" | "balanced" | "expensive"): void;
  setPendingSnow(s: "minimal" | "mid" | "high"): void;
  acknowledgeBeat(): void;
  sleep(): void;
  finishWinterReview(): void;
  startNewSeason(): void;
};

const FARES = ["cheap", "balanced", "expensive"] as const;
const SNOWS = ["minimal", "mid", "high"] as const;

function summarize(v: View) {
  return {
    dayIndex: v.dayIndex,
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
  d.togglePause();
  while (d.view().phase !== "winter_review") {
    const day = d.view().dayIndex;
    if (d.view().phase === "day" && day === 2) d.buyBuilding("cafe");
    if (d.view().phase === "day" && day === 4) {
      d.setSelectedSlotIndex(1);
      d.setSelectedLiftType("chair");
      d.confirmLift();
    }
    if (d.view().paused) d.togglePause();
    while (d.view().phase === "day") d.tick(2000);
    d.setPendingFare(FARES[day % 3]);
    d.setPendingSnow(SNOWS[day % 3]);
    nights.push(summarize(d.view()));
    if (d.view().pendingBeat) d.acknowledgeBeat();
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

/** Whole state minus functions, guest contents and the RNG bookkeeping field. */
function finalState(v: View) {
  const rest: Record<string, unknown> = {};
  for (const [k, x] of Object.entries(v)) {
    if (typeof x === "function" || k === "guests" || k === "rngState") continue;
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
    buyBuilding: (id) => s().buyBuilding(id),
    setSelectedSlotIndex: (i) => s().setSelectedSlotIndex(i),
    setSelectedLiftType: (t) => s().setSelectedLiftType(t),
    confirmLift: () => s().confirmLift(),
    setPendingFare: (f) => s().setPendingFare(f),
    setPendingSnow: (x) => s().setPendingSnow(x),
    acknowledgeBeat: () => s().acknowledgeBeat(),
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
    buyBuilding: (id) => apply((s) => rules.buyBuilding(s, id)),
    setSelectedSlotIndex: (i) => apply((s) => rules.setSelectedSlotIndex(s, i)),
    setSelectedLiftType: (t) => apply((s) => rules.setSelectedLiftType(s, t)),
    confirmLift: () => apply(rules.confirmLift),
    setPendingFare: (f) => apply((s) => rules.setPendingFare(s, f)),
    setPendingSnow: (x) => apply((s) => rules.setPendingSnow(s, x)),
    acknowledgeBeat: () => apply(rules.acknowledgeBeat),
    sleep: () => apply(rules.sleep),
    finishWinterReview: () => apply(rules.finishWinterReview),
    startNewSeason: () => apply(rules.startNewSeason),
  };
}

describe("season characterization", () => {
  beforeAll(installLocalStorage);

  // The test name is the key of the snapshot recorded before the PR 3
  // refactor (when this path mocked Math.random with createRng(42)). The
  // snapshot must keep matching without edits, through both paths below.
  it("store path with mocked Math.random", async () => {
    const pure = playSeason(pureDriver(SEED));

    const { useGameStore } = await import("./store");
    useGameStore.setState({ rngState: SEED });
    const viaStore = playSeason(storeDriver(useGameStore));

    expect(pure).toEqual(viaStore);
    expect(viaStore).toMatchSnapshot();
  });
});
