import { formatMoney } from "./format";
import type { NightRecap } from "./sim";
import { SAT_TERM_KEYS, SAT, type SatTerms } from "./satisfaction";

/** One row of the recap's "Why?" list. */
export type WhyLine = {
  key: keyof SatTerms;
  label: string;
  /** Mean signed points the term added to a guest's score. */
  points: number;
  /** Plain words with the real numbers behind it. */
  detail: string;
};

const LABEL: Record<keyof SatTerms, string> = {
  queue: "Lift lines",
  snow: "Snow",
  value: "Ticket value",
  runs: "Runs",
  arrivalMood: "Welcome",
};

function detailFor(key: keyof SatTerms, points: number, f: NightRecap["facts"]): string {
  switch (key) {
    case "queue":
      return `waited ${f.avgWaitMin.toFixed(1)} min a ride`;
    case "snow":
      return `Today's average: ${f.snowLabel.toLowerCase()}, quality ${Math.round(f.snowQuality * 100)}%`;
    case "value": {
      const worth = `guests felt today was worth about ${formatMoney(f.hillValue)}`;
      const price = formatMoney(f.farePrice);
      if (points <= -1) return `${price} felt steep for the day (${worth})`;
      if (points >= 1) return `${price} felt like a fair deal (${worth})`;
      return `${price} about right (${worth})`;
    }
    case "runs":
      return f.turnedAway > 0
        ? `${f.turnedAway} turned away at close, ${f.runsPerGuest.toFixed(1)} runs each`
        : `${f.runsPerGuest.toFixed(1)} runs each`;
    case "arrivalMood":
      return `mood ${Math.round(f.arrivalMood * 100)} on arrival`;
  }
}

/** The satisfaction breakdown as rows, largest effect (either sign) first. Ties keep the term order. */
export function whyLines(recap: Pick<NightRecap, "breakdown" | "facts">): WhyLine[] {
  return SAT_TERM_KEYS.map((key, order) => ({
    key,
    label: LABEL[key],
    points: recap.breakdown[key],
    detail: detailFor(key, recap.breakdown[key], recap.facts),
    order,
  }))
    .sort((a, b) => Math.abs(b.points) - Math.abs(a.points) || a.order - b.order)
    .map((l) => ({ key: l.key, label: l.label, points: l.points, detail: l.detail }));
}

/** Signed whole points with a true minus sign: "+4", "−12", "0". */
export function formatPoints(points: number): string {
  const n = Math.round(points);
  if (n === 0) return "0";
  return n > 0 ? `+${n}` : `−${Math.abs(n)}`;
}

export const WHY_BASE = SAT.BASE;

export type Delta = { direction: "up" | "down" | "same"; text: string };

/** Today against yesterday for one number. Differences under `epsilon` read as "same". */
export function delta(
  today: number,
  yesterday: number,
  format: (absDiff: number) => string,
  epsilon = 0.5,
): Delta {
  const diff = today - yesterday;
  if (Math.abs(diff) < epsilon) return { direction: "same", text: "same" };
  return { direction: diff > 0 ? "up" : "down", text: format(Math.abs(diff)) };
}
