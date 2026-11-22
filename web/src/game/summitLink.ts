export const SUMMIT_LINK_PAYMENT = 6000;
export const SUMMIT_LINK_FIRST_DAY_LEGACY = 18;
export const SUMMIT_LINK_FIRST_DAY_6WK = 22;
export const SUMMIT_LINK_FIRST_DAY = 29;

export function summitLinkFirstDay(seasonLength: number): number {
  if (seasonLength >= 49) return SUMMIT_LINK_FIRST_DAY;
  if (seasonLength >= 42) return SUMMIT_LINK_FIRST_DAY_6WK;
  return SUMMIT_LINK_FIRST_DAY_LEGACY;
}
export const SUMMIT_LINK_MIN_REPUTATION = 55;

export type SummitLinkDecision = "accepted" | "declined";
