export const SUMMIT_LINK_PAYMENT = 6000;
export const SUMMIT_LINK_FIRST_DAY_LEGACY = 18;
export const SUMMIT_LINK_FIRST_DAY = 32;

export function summitLinkFirstDay(seasonLength: number): number {
  return seasonLength <= 28 ? SUMMIT_LINK_FIRST_DAY_LEGACY : SUMMIT_LINK_FIRST_DAY;
}
export const SUMMIT_LINK_MIN_REPUTATION = 55;

export type SummitLinkDecision = "accepted" | "declined";
