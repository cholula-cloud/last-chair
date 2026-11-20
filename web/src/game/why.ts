import { formatMoney } from "./format";
import { SCHOOL_BUS_FARE } from "./schoolContract";
import type { NightRecap } from "./sim";
import { biggestProblem, SAT_TERM_KEYS, SAT, type SatTerms } from "./satisfaction";

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
      if (f.dispatched === 0) return "No lift rides finished today, so there are no wait times yet.";
      return `Skiers waited ${f.avgWaitMin.toFixed(1)} min per ride${f.busiestLift ? `, longest at ${f.busiestLift.label} (${f.busiestLift.min.toFixed(1)} min)` : ""}.`;
    case "snow":
      return `Snow averaged ${f.snowLabel.toLowerCase()} at ${Math.round(f.snowQuality * 100)}% quality.`;
    case "value": {
      const worth = formatMoney(f.hillValue);
      const price = formatMoney(f.farePrice);
      if (f.schoolBus?.arrived) {
        return `Public tickets were ${price}, plus ${formatMoney(SCHOOL_BUS_FARE)} school tickets. Skiers valued the day around ${worth}.`;
      }
      if (points <= -1) return `${price} felt steep. Skiers valued the day around ${worth}.`;
      if (points >= 1) return `${price} felt like a fair deal. Skiers valued the day around ${worth}.`;
      return `${price} felt about right. Skiers valued the day around ${worth}.`;
    }
    case "runs":
      return f.turnedAway > 0
        ? `${f.turnedAway} skiers missed last chair, averaging ${f.runsPerGuest.toFixed(1)} runs each.`
        : `Skiers averaged ${f.runsPerGuest.toFixed(1)} runs each.`;
    case "arrivalMood":
      return `Skiers arrived at ${Math.round(f.arrivalMood * 100)}% mood.`;
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

export type GuestMeasure = keyof SatTerms;
export type GuestObservation = { measure: GuestMeasure; value: number };

/** Reuse the same reading even if a different problem tops the next recap. */
export function observeGuests(recap: NightRecap, measure?: GuestMeasure): GuestObservation | null {
  if (recap.arrivals === 0) return null;
  const facts = recap.facts;
  const chosen = measure ?? biggestProblem(recap.breakdown) ?? "runs";
  if (chosen === "queue" && !facts.dispatched) {
    return measure ? null : { measure: "runs", value: facts.runsPerGuest };
  }
  const readings = {
    queue: facts.avgWaitMin,
    snow: facts.snowQuality,
    value: facts.hillValue - facts.farePrice,
    runs: facts.runsPerGuest,
    arrivalMood: facts.arrivalMood,
  };
  return { measure: chosen, value: readings[chosen] };
}

export const GUEST_MEASURE_LABELS: Record<GuestMeasure, string> = {
  queue: "Average lift wait",
  snow: "Closing snow quality",
  value: "Ticket value vs price",
  runs: "Runs per skier",
  arrivalMood: "Arrival mood",
};

export function formatGuestObservation({ measure, value }: GuestObservation): string {
  switch (measure) {
    case "queue": return `${value.toFixed(1)} min`;
    case "runs": return `${value.toFixed(1)} runs`;
    case "value": {
      const dollars = Math.round(value);
      return formatMoney(dollars, { signed: dollars !== 0 });
    }
    case "snow":
    case "arrivalMood": return `${Math.round(value * 100)}%`;
  }
}

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
