export type CalendarDef = {
  length: number;
  startWeekday: number;
  startDate: { month: number; day: number };
  holidays: readonly { day: number; label: string }[];
  holidayWeeks: readonly { from: number; to: number; label: string }[];
};

export const DUTCH_HILL_CALENDAR: CalendarDef = {
  length: 28, startWeekday: 0, startDate: { month: 1, day: 26 },
  holidays: [{ day: 22, label: "Presidents' Day" }],
  holidayWeeks: [{ from: 20, to: 28, label: "February vacation week" }],
};

export const MOUNTAIN_CALENDARS = { dutch_hill: DUTCH_HILL_CALENDAR };
export type MountainId = keyof typeof MOUNTAIN_CALENDARS;

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function weekdayIndex(cal: CalendarDef, day: number): number {
  return (cal.startWeekday + day - 1) % WEEKDAYS.length;
}

export function weekdayForDay(cal: CalendarDef, day: number) {
  return WEEKDAYS[weekdayIndex(cal, day)] ?? WEEKDAYS[0];
}

export function dayKind(cal: CalendarDef, day: number): "weekday" | "weekend" | "holiday" {
  if (cal.holidays.some((holiday) => holiday.day === day)) return "holiday";
  return weekdayIndex(cal, day) >= 5 ? "weekend" : "weekday";
}

/** Friday, a weekend or a holiday: the days the village turns out. */
export function isFestiveDay(cal: CalendarDef, day: number): boolean {
  return dayKind(cal, day) !== "weekday" || weekdayForDay(cal, day) === "Fri";
}

export function inHolidayWeek(cal: CalendarDef, day: number): boolean {
  return cal.holidayWeeks.some(({ from, to }) => day >= from && day <= to);
}

export function usesWeekendGuestMix(cal: CalendarDef, day: number): boolean {
  return dayKind(cal, day) !== "weekday" || inHolidayWeek(cal, day);
}

export function dayLabel(cal: CalendarDef, day: number): { weekday: typeof WEEKDAYS[number]; date: string; note?: string } {
  const date = new Date(Date.UTC(2026, cal.startDate.month - 1, cal.startDate.day + day - 1));
  const note = cal.holidays.find((holiday) => holiday.day === day)?.label ??
    cal.holidayWeeks.find(({ from, to }) => day >= from && day <= to)?.label;
  return { weekday: weekdayForDay(cal, day), date: `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`, ...(note ? { note } : {}) };
}
