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

export function dayKind(cal: CalendarDef, day: number): "weekday" | "weekend" | "holiday" {
  if (cal.holidays.some((holiday) => holiday.day === day)) return "holiday";
  return (cal.startWeekday + day - 1) % 7 >= 5 ? "weekend" : "weekday";
}

export function inHolidayWeek(cal: CalendarDef, day: number): boolean {
  return cal.holidayWeeks.some(({ from, to }) => day >= from && day <= to);
}

export function dayLabel(cal: CalendarDef, day: number): { weekday: string; date: string; note?: string } {
  const date = new Date(Date.UTC(2026, cal.startDate.month - 1, cal.startDate.day + day - 1));
  const weekday = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][(cal.startWeekday + day - 1) % 7];
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][date.getUTCMonth()];
  const note = cal.holidays.find((holiday) => holiday.day === day)?.label ??
    cal.holidayWeeks.find(({ from, to }) => day >= from && day <= to)?.label;
  return { weekday, date: `${date.getUTCDate()} ${month}`, ...(note ? { note } : {}) };
}
