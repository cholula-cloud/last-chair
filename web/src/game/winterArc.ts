import { inHolidayWeek, weekdayForDay, type CalendarDef } from "./calendar";
import type { DayReport } from "./state";

export const VACATION_WAIT_GOAL = 5;
export const HEALTHY_GUEST_SCORE = 70;

export function operatingMargin(report: DayReport): number {
  return report.recap.cashDelta - report.snowCost;
}

/** Each milestone is credited only from an actual close in the saved ledger. */
export function operatingGoals(calendar: CalendarDef, history: DayReport[]) {
  const open = history.find((report) => report.recap.arrivals > 0 && operatingMargin(report) > 0);
  const vacation = open && history.find((report) =>
    report.day > open.day && inHolidayWeek(calendar, report.day) && weekdayForDay(calendar, report.day) === "Sat"
    && (report.recap.facts.dispatched ?? 0) > 0 && report.recap.facts.avgWaitMin <= VACATION_WAIT_GOAL
    && operatingMargin(report) > 0);
  return { firstMarginDay: open?.day ?? null, vacationDay: vacation?.day ?? null };
}

export function operatingGoalText(calendar: CalendarDef, history: DayReport[]): string {
  const { firstMarginDay, vacationDay } = operatingGoals(calendar, history);
  if (vacationDay) return `Vacation Saturday goal met on day ${vacationDay}: lifts ran under a 5 min wait and revenue covered snow prep.`;
  if (firstMarginDay) return `Profitable day hit on day ${firstMarginDay}. Next milestone: turn a profit on a holiday Saturday with lift waits under 5 min.`;
  return "First milestone: finish a day with ticket and venue revenue covering daily costs and snow prep.";
}
