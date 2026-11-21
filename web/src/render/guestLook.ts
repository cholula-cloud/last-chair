import type { Guest, PersonaId } from "@/game/types";

export type GuestVariant = "skier" | "skier-kid" | "skier-coat" | "boarder" | "boarder-kid";

/** Stable 0..1 from guest id (render-only). */
export function guestUnit(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return (Math.abs(h) % 10_000) / 10_000;
}

export function variantOf(id: string, persona: PersonaId): GuestVariant {
  const h = guestUnit(id);
  if (persona === "first_timer" || persona === "family_pack") {
    if (h < 0.4) return "skier-kid";
    if (h < 0.85) return "skier";
    return "boarder";
  }
  if (persona === "race_kid") return h < 0.55 ? "skier-kid" : "skier";
  if (h < 0.5) return "skier";
  if (h < 0.7) return "skier-coat";
  return "boarder";
}

export type MoodBand = "happy" | "okay" | "unhappy";

export function moodBand(score: number): MoodBand {
  if (score >= 70) return "happy";
  if (score >= 50) return "okay";
  return "unhappy";
}

const MOOD_JACKETS: Record<MoodBand, string> = {
  happy: "#2f7de1",
  okay: "#f2c014",
  unhappy: "#d7263d",
};

export function jacketForGuest(guest: Pick<Guest, "id">, lens: "off" | "mood", moodScore: number): string | null {
  if (lens !== "mood") return null;
  return MOOD_JACKETS[moodBand(moodScore)];
}