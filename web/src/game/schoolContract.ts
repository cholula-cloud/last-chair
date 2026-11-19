import { usesWeekendGuestMix, type CalendarDef } from "./calendar";

export const SCHOOL_BUS_PUPILS = 6;
export const SCHOOL_BUS_FARE = 25;
export const SCHOOL_BUS_ARRIVAL_MIN = 9 * 60;

export type SchoolContractDecision = "accepted" | "declined";
export type SchoolContract =
  | { decision: "declined" }
  | { decision: "accepted"; day: number; pupilsTaught: number | null };

export function nextSchoolBusDay(calendar: CalendarDef, today: number, seasonLength: number): number | null {
  for (let day = today + 1; day <= seasonLength; day++) {
    if (!usesWeekendGuestMix(calendar, day)) return day;
  }
  return null;
}

export function schoolBusPupils(contract: SchoolContract | null, day: number): number {
  return contract?.decision === "accepted" && contract.day === day ? SCHOOL_BUS_PUPILS : 0;
}
