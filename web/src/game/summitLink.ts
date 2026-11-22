import type { FounderId } from "./types";

export const SUMMIT_LINK_PAYMENT = 6000;
export const SUMMIT_LINK_REDUCED_PAYMENT = 3000;
export const SUMMIT_LINK_FIRST_DAY_LEGACY = 18;
export const SUMMIT_LINK_FIRST_DAY_6WK = 22;
export const SUMMIT_LINK_FIRST_DAY = 29;
export const SUMMIT_LINK_MIN_REPUTATION = 40;
export const SUMMIT_LINK_FULL_REPUTATION = 50;

export const CLUB_BUS_SKIERS = 10;
export const CLUB_BUS_DISCOUNT = 10;
export const GROOMER_REPAIR_COST = 250;

export type SummitLinkDecision = "accepted" | "declined";

export type SloaneVisitFacts = {
  day: number;
  avgWaitMin: number;
  avgSnow: number;
  boughtCocoa: boolean;
};

export type ClubBooking = {
  decision: "pending" | "accepted" | "declined";
  day: number;
  skiersArrived: number | null;
};

export type GroomerDown = {
  active: boolean;
  decision: "pending" | "paid" | "skipped";
  day: number;
};

export function summitLinkFirstDay(seasonLength: number, founderId: FounderId | null = null): number {
  const base = seasonLength >= 49
    ? SUMMIT_LINK_FIRST_DAY
    : seasonLength >= 42
      ? SUMMIT_LINK_FIRST_DAY_6WK
      : SUMMIT_LINK_FIRST_DAY_LEGACY;
  return founderId === "tom" ? Math.max(8, base - 2) : base;
}

export function summitLinkOfferPayment(reputation: number): number {
  return reputation >= SUMMIT_LINK_FULL_REPUTATION ? SUMMIT_LINK_PAYMENT : SUMMIT_LINK_REDUCED_PAYMENT;
}
