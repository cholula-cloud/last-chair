export type CalendarDef = {
  length: number;
  startWeekday: number;
  startDate: { month: number; day: number };
  /** UTC year of startDate (e.g. 2025 for a December opener). */
  startYear?: number;
  holidays: readonly { day: number; label: string }[];
  holidayWeeks: readonly { from: number; to: number; label: string }[];
  /** If set, only these weekday indices (Mon=0 … Sun=6) welcome guests; omit for every calendar day playable (legacy saves). */
  openWeekdays?: readonly number[];
};

/** M3 saves: 28 consecutive playable days, late January–February. */
export const DUTCH_HILL_CALENDAR_LEGACY: CalendarDef = {
  length: 28,
  startWeekday: 0,
  startDate: { month: 1, day: 26 },
  startYear: 2026,
  holidays: [{ day: 22, label: "Presidents' Day" }],
  holidayWeeks: [{ from: 20, to: 28, label: "February vacation week" }],
};

/** Act I default: 6 Fri-Sun weekends (18 playable days / 42 civil days), Mon-Thu background. */
export const DUTCH_HILL_CALENDAR: CalendarDef = {
  length: 42,
  startWeekday: 4,
  startDate: { month: 12, day: 26 },
  startYear: 2025,
  openWeekdays: [4, 5, 6],
  holidays: [{ day: 25, label: "MLK Day" }],
  holidayWeeks: [{ from: 35, to: 42, label: "Midwinter vacation week" }],
};

/** Act II+ default: 7 Fri-Sun weekends (21 playable days / 49 civil days). */
export const ACT2_CALENDAR: CalendarDef = {
  length: 49,
  startWeekday: 4,
  startDate: { month: 12, day: 26 },
  startYear: 2025,
  openWeekdays: [4, 5, 6],
  holidays: [{ day: 46, label: "Presidents' Day" }],
  holidayWeeks: [{ from: 41, to: 49, label: "February vacation week" }],
};

export const MOUNTAIN_CALENDARS = {
  dutch_hill: DUTCH_HILL_CALENDAR,
  mount_tom: ACT2_CALENDAR,
  maple_valley: ACT2_CALENDAR,
  snow_valley: ACT2_CALENDAR,
  enchanted_mountain: ACT2_CALENDAR,
  evergreen_valley: ACT2_CALENDAR,
  brodie: ACT2_CALENDAR,
  mount_whittier: ACT2_CALENDAR,
} as const;
export type MountainId = keyof typeof MOUNTAIN_CALENDARS;

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Legacy 14- or 28-day seasons keep the old civil map; new winters use the operating calendar. */
export function calendarForSeason(mountainId: MountainId, seasonLength: number): CalendarDef {
  if (seasonLength <= 28) {
    const legacy = DUTCH_HILL_CALENDAR_LEGACY;
    return seasonLength === legacy.length ? legacy : { ...legacy, length: seasonLength, holidayWeeks: [] };
  }
  const base = MOUNTAIN_CALENDARS[mountainId];
  return base.length === seasonLength ? base : { ...base, length: seasonLength };
}

function weekdayIndex(cal: CalendarDef, day: number): number {
  return (cal.startWeekday + day - 1) % WEEKDAYS.length;
}

export function weekdayForDay(cal: CalendarDef, day: number) {
  return WEEKDAYS[weekdayIndex(cal, day)] ?? WEEKDAYS[0];
}

export function isOperatingDay(cal: CalendarDef, calendarDay: number): boolean {
  if (calendarDay < 1 || calendarDay > cal.length) return false;
  if (!cal.openWeekdays?.length) return true;
  return cal.openWeekdays.includes(weekdayIndex(cal, calendarDay));
}

export function operatingSeasonLength(cal: CalendarDef): number {
  let count = 0;
  for (let day = 1; day <= cal.length; day++) if (isOperatingDay(cal, day)) count++;
  return count;
}

export function operatingDayIndex(cal: CalendarDef, calendarDay: number): number {
  let count = 0;
  for (let day = 1; day <= cal.length; day++) {
    if (isOperatingDay(cal, day)) count++;
    if (day === calendarDay) return count;
  }
  return 0;
}

export function operatingDaysLeft(cal: CalendarDef, calendarDay: number): number {
  const current = operatingDayIndex(cal, calendarDay);
  const total = operatingSeasonLength(cal);
  return Math.max(0, total - current + (isOperatingDay(cal, calendarDay) ? 1 : 0));
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

export type GuestMix = "weekday" | "weekend" | "holiday";
export function guestMixForDay(cal: CalendarDef, day: number): GuestMix {
  return inHolidayWeek(cal, day) ? "holiday" : dayKind(cal, day);
}

export function usesWeekendGuestMix(cal: CalendarDef, day: number): boolean {
  return dayKind(cal, day) !== "weekday" || inHolidayWeek(cal, day);
}

export function dayLabel(cal: CalendarDef, day: number): { weekday: typeof WEEKDAYS[number]; date: string; note?: string } {
  const date = new Date(Date.UTC(cal.startYear ?? 2026, cal.startDate.month - 1, cal.startDate.day + day - 1));
  const note = cal.holidays.find((holiday) => holiday.day === day)?.label ??
    cal.holidayWeeks.find(({ from, to }) => day >= from && day <= to)?.label;
  return {
    weekday: weekdayForDay(cal, day),
    date: `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`,
    ...(note ? { note } : {}),
  };
}

/** Closed civil days after `calendarDay` until the next open day or season end (exclusive of next open). */
export function seasonCalendar(state: Pick<{ mountainId: MountainId; seasonLength: number }, "mountainId" | "seasonLength">): CalendarDef {
  return calendarForSeason(state.mountainId, state.seasonLength);
}

export function closedDaysBeforeNextOpen(cal: CalendarDef, calendarDay: number): number[] {
  const days: number[] = [];
  for (let d = calendarDay + 1; d <= cal.length; d++) {
    if (isOperatingDay(cal, d)) break;
    days.push(d);
  }
  return days;
}