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
  if (vacationDay) return `Vacation Saturday done on day ${vacationDay}. The lifts ran, the average wait stayed at five minutes or less and operating income covered snow service.`;
  if (firstMarginDay) return `Day ${firstMarginDay} covered operations and snow service. Next, pull that off on a vacation Saturday with the average lift wait at five minutes or less.`;
  return "First, get paying guests up the hill and finish a day with money left after operations and snow service.";
}
