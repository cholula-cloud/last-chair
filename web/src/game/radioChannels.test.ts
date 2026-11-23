import { describe, expect, it } from "vitest";
import { createBuiltHill } from "./__fixtures__/built-hill";
import { pickFounder } from "./rules";
import { makeGuest } from "./sim";
import { SLOANE_SCOUT_ID } from "./surprises";
import {
  liveRadioBroadcast,
  RADIO_BANDS,
  radioDispatchKey,
  STATION_META,
} from "./radioChannels";

const EMOJI = /\p{Extended_Pictographic}/u;

function lintCopy(text: string) {
  expect(text).not.toMatch(/—|·/);
  expect(text).not.toMatch(EMOJI);
  expect(text.length).toBeLessThanOrEqual(220);
}

describe("3-band radio channels", () => {
  it("opens Day 1 on WVTK 100.7 with Maris's cold read and valid copy on all three bands", () => {
    const state = pickFounder(createBuiltHill(7), "elena");
    for (const band of RADIO_BANDS) {
      const broadcast = liveRadioBroadcast(state, band);
      expect(broadcast.callSign).toBe(STATION_META[band].callSign);
      lintCopy(broadcast.title);
      lintCopy(broadcast.body);
    }
    const wvtk = liveRadioBroadcast({ ...state, operatorName: "Jules" }, "wvtk");
    expect(wvtk.id).toBe("day1-cold-read");
    expect(wvtk.body).toContain("Jules");
    expect(wvtk.urgent).toBe(true);
  });

  it("alerts on WVTK when Sloane's SUV is spotted on the hill", () => {
    const base = pickFounder(createBuiltHill(7), "elena");
    const withSloane = {
      ...base,
      dayIndex: 8,
      guests: [makeGuest({ id: SLOANE_SCOUT_ID, state: "queue" })],
    };
    const broadcast = liveRadioBroadcast(withSloane, "wvtk");
    expect(broadcast.id).toBe("sloane-spotted");
    expect(broadcast.urgent).toBe(true);
    lintCopy(broadcast.body);
  });

  it("alerts on WVTK when lift lines back up past 6 minutes", () => {
    const base = pickFounder(createBuiltHill(7), "elena");
    const busy = {
      ...base,
      dayIndex: 6,
      guests: Array.from({ length: 5 }, (_, i) => makeGuest({ id: `g-${i}`, state: "queue" })),
      dayStats: { ...base.dayStats, dispatched: 10, waitSumMin: 70 },
    };
    const broadcast = liveRadioBroadcast(busy, "wvtk");
    expect(broadcast.id).toBe("long-line");
    lintCopy(broadcast.body);
  });

  it("reports thaw and wind hold advisories on WXK-44", () => {
    const base = pickFounder(createBuiltHill(7), "amira");
    const thaw = liveRadioBroadcast({ ...base, weather: "thaw" }, "wxk");
    expect(thaw.id).toBe("wxk-thaw");
    lintCopy(thaw.body);

    const weatherDays = base.weatherDays.map((d, i) => (i === 0 ? { kind: "storm" as const, wind: "gusty" as const } : d));
    const windy = liveRadioBroadcast({ ...base, weatherDays, weather: "storm", clockMin: 720 }, "wxk");
    expect(windy.id).toBe("wxk-wind-hold");
    expect(windy.urgent).toBe(true);
    lintCopy(windy.body);
  });

  it("reacts to Whiterock rivalry state on WRCK 98.3", () => {
    const base = pickFounder(createBuiltHill(7), "riley");
    const accepted = liveRadioBroadcast({ ...base, summitLinkDecision: "accepted" }, "whiterock");
    expect(accepted.id).toBe("wr-partner");
    lintCopy(accepted.body);

    const declined = liveRadioBroadcast({ ...base, summitLinkDecision: "declined" }, "whiterock");
    expect(declined.id).toBe("wr-snubbed");
    lintCopy(declined.body);

    const absorbed = liveRadioBroadcast(
      {
        ...base,
        careerHills: base.careerHills.map((h) =>
          h.mountainId === "mount_tom" ? { ...h, status: "whiterock" as const } : h,
        ),
      },
      "whiterock",
    );
    expect(absorbed.id).toBe("wr-portfolio");
    lintCopy(absorbed.body);
  });

  it("produces stable dispatch keys per band, broadcast id, and day", () => {
    const state = pickFounder(createBuiltHill(7), "elena");
    const b = liveRadioBroadcast(state, "wvtk");
    expect(radioDispatchKey(b, state.dayIndex)).toBe("wvtk:day1-cold-read:1");
  });

  it("evolves intraday across morning, midday, and closing hour instead of repeating old night beats", () => {
    const base = {
      ...pickFounder(createBuiltHill(7), "elena"),
      dayIndex: 3,
      completedBeats: ["first_load" as const],
    };
    const morning = liveRadioBroadcast({ ...base, clockMin: 560 }, "wvtk");
    const midday = liveRadioBroadcast(
      {
        ...base,
        clockMin: 750,
        dayStats: { ...base.dayStats, completedRuns: 10, dispatched: 10, waitSumMin: 15 },
      },
      "wvtk",
    );
    const closing = liveRadioBroadcast({ ...base, clockMin: 915, dayStats: { ...base.dayStats, dispatched: 18 } }, "wvtk");

    expect(morning.id).not.toContain("first-uphill-load");
    expect(midday.id).toBe("fast-laps");
    expect(closing.id).toBe("last-chair-3");
    expect(new Set([morning.id, midday.id, closing.id]).size).toBe(3);

    const wxkAm = liveRadioBroadcast({ ...base, weather: "clear", clockMin: 580 }, "wxk");
    const wxkPm = liveRadioBroadcast({ ...base, weather: "clear", clockMin: 780 }, "wxk");
    expect(wxkAm.id).not.toBe(wxkPm.id);

    for (const b of [morning, midday, closing, wxkAm, wxkPm]) {
      lintCopy(b.title);
      lintCopy(b.body);
    }
  });
});
