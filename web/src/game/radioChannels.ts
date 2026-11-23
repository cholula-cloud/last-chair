import { DAY_1_COLD_READ, formatOperatorText } from "./content";
import { latestRadio } from "./deskRadio";
import { hillById } from "./mountains/roster";
import type { GameState } from "./state";
import { SLOANE_SCOUT_ID } from "./surprises";
import type { WeatherKind } from "./types";
import { isWindHeld, outlookFor, weatherForDay } from "./weather";

export type RadioBandId = "wvtk" | "wxk" | "whiterock";

export const RADIO_BANDS: readonly RadioBandId[] = ["wvtk", "wxk", "whiterock"];

export type StationMeta = {
  id: RadioBandId;
  freq: string;
  callSign: string;
  shortLabel: string;
  name: string;
  speaker: string;
};

export const STATION_META: Record<RadioBandId, StationMeta> = {
  wvtk: {
    id: "wvtk",
    freq: "100.7",
    callSign: "WVTK 100.7",
    shortLabel: "100.7 WVTK",
    name: "Route 100 Radio",
    speaker: "Maris Shaw, WVTK 100.7",
  },
  wxk: {
    id: "wxk",
    freq: "WXK-44",
    callSign: "WXK-44",
    shortLabel: "WXK-44",
    name: "Ridge Weather",
    speaker: "WXK-44 Ridge Weather",
  },
  whiterock: {
    id: "whiterock",
    freq: "98.3",
    callSign: "WRCK 98.3",
    shortLabel: "98.3 Whiterock",
    name: "Whiterock Alpine",
    speaker: "Whiterock Alpine 98.3",
  },
};

export type RadioBroadcast = {
  id: string;
  band: RadioBandId;
  callSign: string;
  speaker: string;
  title: string;
  body: string;
  urgent?: boolean;
};

const WEATHER_LABELS: Record<WeatherKind, string> = {
  clear: "clear bluebird",
  snow: "steady snow",
  storm: "storm gusts",
  thaw: "warm thaw",
};

function currentAvgWaitMin(state: GameState): number {
  const { dispatched, waitSumMin } = state.dayStats;
  return dispatched > 0 ? waitSumMin / dispatched : 0;
}

function wvtkBroadcast(state: GameState): RadioBroadcast {
  const meta = STATION_META.wvtk;
  const name = state.operatorName ?? null;
  const hillName = hillById(state.mountainId).name;
  const onHillCount = state.guests.filter((g) => g.state !== "pending" && g.state !== "gone").length;

  const sloaneOnHill = state.guests.some(
    (g) => g.id === SLOANE_SCOUT_ID && g.state !== "pending" && g.state !== "gone",
  );
  if (sloaneOnHill) {
    return {
      id: "sloane-spotted",
      band: "wvtk",
      callSign: meta.callSign,
      speaker: meta.speaker,
      title: "SUV in the gravel lot",
      body: "Heads up on Route 100. A black Whiterock SUV just pulled into the lot with a clipboard. Give them a clean ride.",
      urgent: true,
    };
  }

  if (
    state.schoolContract?.decision === "accepted" &&
    state.schoolContract.day === state.dayIndex &&
    state.guests.some((g) => g.schoolPupil && g.state !== "pending")
  ) {
    return {
      id: "school-bus-live",
      band: "wvtk",
      callSign: meta.callSign,
      speaker: meta.speaker,
      title: "Readsboro bus at the base",
      body: "Yellow bus just unloaded at the base lodge. Keep the green trail soft and the ski school moving.",
      urgent: true,
    };
  }

  if (
    state.clubBooking?.decision === "accepted" &&
    state.clubBooking.day === state.dayIndex &&
    state.guests.some((g) => g.id.startsWith("club-") && g.state !== "pending")
  ) {
    return {
      id: "club-bus-live",
      band: "wvtk",
      callSign: meta.callSign,
      speaker: meta.speaker,
      title: "Bennington Ski Club",
      body: "The Bennington club bus is parked by the warming hut. Keep the lift lines brisk and they will tell the whole county.",
      urgent: true,
    };
  }

  if (onHillCount >= 4 && currentAvgWaitMin(state) >= 6) {
    return {
      id: "long-line",
      band: "wvtk",
      callSign: meta.callSign,
      speaker: meta.speaker,
      title: "Corral backing up",
      body: "Word from the ticket shack is the lift line is stretching past the rope. Locals are eyeing the clock.",
      urgent: true,
    };
  }

  if (
    state.dayIndex === 1 &&
    !state.completedBeats.includes("first_load") &&
    state.dayStats.completedRuns > 0
  ) {
    return {
      id: "first-tracks-live",
      band: "wvtk",
      callSign: meta.callSign,
      speaker: meta.speaker,
      title: "Chairs turning again",
      body: formatOperatorText(
        `Just got a call from the general store. First skiers are coming down ${hillName} under {name}. First tracks since 1985.`,
        name,
      ),
      urgent: true,
    };
  }

  if (state.mountainId === "mount_tom" && state.nightLights && state.nightSessionOn && state.clockMin >= 840) {
    return {
      id: "mount-tom-lights",
      band: "wvtk",
      callSign: meta.callSign,
      speaker: meta.speaker,
      title: "Ridge lights warming up",
      body: "Holyoke folks can already see the Mount Tom floodlights flickering on above the river. Night session crowd is rolling in.",
    };
  }

  if (state.dayIndex === 1) {
    return {
      id: "day1-cold-read",
      band: "wvtk",
      callSign: meta.callSign,
      speaker: meta.speaker,
      title: "Route 100 morning",
      body: formatOperatorText(DAY_1_COLD_READ, name),
      urgent: true,
    };
  }

  const latest = latestRadio(state);
  if (latest) {
    return {
      id: `desk-${latest.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      band: "wvtk",
      callSign: meta.callSign,
      speaker: meta.speaker,
      title: latest.title,
      body: latest.radio,
    };
  }

  return {
    id: `morning-${state.dayIndex}`,
    band: "wvtk",
    callSign: meta.callSign,
    speaker: meta.speaker,
    title: `${hillName} check-in`,
    body: formatOperatorText(
      `Morning from WVTK 100.7. Gravel lot is open at ${hillName} and {name} has the lodge coffee hot.`,
      name,
    ),
  };
}

function wxkBroadcast(state: GameState): RadioBroadcast {
  const meta = STATION_META.wxk;
  const dayWeather = weatherForDay(state);
  const windHeld = isWindHeld("chair", dayWeather.wind, state.clockMin, state.talentsOwned);
  const outlook = outlookFor(state, 1);
  const depthPct = Math.round(state.snowDepth * 100);
  const qualPct = Math.round(state.snowQuality * 100);

  if (windHeld) {
    return {
      id: "wxk-wind-hold",
      band: "wxk",
      callSign: meta.callSign,
      speaker: meta.speaker,
      title: "Ridge wind hold",
      body: "Gusts over 35 mph along the upper ridge. Chairlifts are on wind hold while surface tows stay open below the trees.",
      urgent: true,
    };
  }

  if (state.weather === "thaw") {
    return {
      id: "wxk-thaw",
      band: "wxk",
      callSign: meta.callSign,
      speaker: meta.speaker,
      title: "Afternoon thaw advisory",
      body: `Warm air pushing up Route 100. Base holds at ${depthPct}% depth and ${qualPct}% quality; lower pitches soften after 1 PM.`,
    };
  }

  if (outlook) {
    const topKind = (Object.keys(outlook) as WeatherKind[]).reduce((best, kind) =>
      outlook[kind] > outlook[best] ? kind : best,
    );
    const odds = Math.round(outlook[topKind] * 100);
    return {
      id: `wxk-outlook-${topKind}`,
      band: "wxk",
      callSign: meta.callSign,
      speaker: meta.speaker,
      title: "Green Mountain forecast",
      body: `Current conditions: ${WEATHER_LABELS[state.weather]}, ${qualPct}% snow quality. Tomorrow favors ${WEATHER_LABELS[topKind]} at ${odds}%.`,
    };
  }

  return {
    id: "wxk-final",
    band: "wxk",
    callSign: meta.callSign,
    speaker: meta.speaker,
    title: "Closing day bulletin",
    body: `Current conditions: ${WEATHER_LABELS[state.weather]} with ${depthPct}% base depth and ${qualPct}% snow quality across the hill.`,
  };
}

const WHITEROCK_SPOTS: readonly { id: string; title: string; body: string }[] = [
  {
    id: "wr-lifestyle",
    title: "Elevate your vertical",
    body: "Whiterock Mountain: heated boot valets, artisanal broth, and dynamic parking just forty minutes up Route 100.",
  },
  {
    id: "wr-lines",
    title: "Curated lift queues",
    body: "Whiterock reminds guests that a twenty-minute wait for a six-pack builds community. Small rope tows cannot offer that.",
  },
  {
    id: "wr-app",
    title: "Download the Whiterock app",
    body: "Unlock Surge Tier Platinum at Whiterock Alpine. Skip the local coffee can and pay with one convenient seasonal subscription.",
  },
];

function whiterockBroadcast(state: GameState): RadioBroadcast {
  const meta = STATION_META.whiterock;
  const absorbed = (state.careerHills ?? []).some((h) => h.status === "whiterock");

  if (absorbed) {
    return {
      id: "wr-portfolio",
      band: "whiterock",
      callSign: meta.callSign,
      speaker: meta.speaker,
      title: "Portfolio expansion",
      body: "Whiterock Alpine celebrates another historic New England slope joining our pass network. Heritage meets synergy.",
    };
  }

  if (state.summitLinkDecision === "accepted") {
    return {
      id: "wr-partner",
      band: "whiterock",
      callSign: meta.callSign,
      speaker: meta.speaker,
      title: "Welcome partner passholders",
      body: "Whiterock Pass now includes Dutch Hill. Terms, fare caps, and holiday blackout Saturdays apply.",
    };
  }

  if (state.summitLinkDecision === "declined") {
    return {
      id: "wr-snubbed",
      band: "whiterock",
      callSign: meta.callSign,
      speaker: meta.speaker,
      title: "Why ski alone?",
      body: "Some local hills still insist on running independent. Come up to Whiterock for fourteen lodges and zero mud-season charm.",
    };
  }

  if (state.reputation >= 55 && currentAvgWaitMin(state) < 3) {
    const spot = WHITEROCK_SPOTS[1];
    return {
      id: spot.id,
      band: "whiterock",
      callSign: meta.callSign,
      speaker: meta.speaker,
      title: spot.title,
      body: spot.body,
    };
  }

  const spot = WHITEROCK_SPOTS[(Math.max(1, state.dayIndex) - 1) % WHITEROCK_SPOTS.length];
  return {
    id: spot.id,
    band: "whiterock",
    callSign: meta.callSign,
    speaker: meta.speaker,
    title: spot.title,
    body: spot.body,
  };
}

/** Active live broadcast for any of the three radio tuner bands. */
export function liveRadioBroadcast(state: GameState, band: RadioBandId): RadioBroadcast {
  switch (band) {
    case "wvtk":
      return wvtkBroadcast(state);
    case "wxk":
      return wxkBroadcast(state);
    case "whiterock":
      return whiterockBroadcast(state);
  }
}

/** Stable key for detecting when a new live dispatch should auto-peek on the HUD. */
export function radioDispatchKey(broadcast: RadioBroadcast, dayIndex: number): string {
  return `${broadcast.band}:${broadcast.id}:${dayIndex}`;
}
