/** Shared satisfaction mood bands — HUD, recap, and Guests sheet use the same words. */
export const MOOD_GOOD_MIN = 70;
export const MOOD_WATCH_MIN = 50;

export type MoodTone = "good" | "watch" | "bad";

export function moodTone(score: number): MoodTone {
  if (score >= MOOD_GOOD_MIN) return "good";
  if (score >= MOOD_WATCH_MIN) return "watch";
  return "bad";
}

export function satisfactionMoodWord(score: number): string {
  if (score >= MOOD_GOOD_MIN) return "Happy";
  if (score >= MOOD_WATCH_MIN) return "Mixed";
  return "Grumpy";
}