/** The cold open: four story cards with a voice-over. Pure data and timing; the screen lives in ColdOpen.tsx. */

export type ColdOpenCard = {
  id: string;
  /** Caption shown over the still when captions are enabled or narration is unavailable. */
  caption: string;
  /** Still image under /story. */
  image: string;
  /** Second the voice-over starts this line. Found by detecting the pauses in cold-open.mp3. */
  cue: number;
};

export const COLD_OPEN_AUDIO = "/story/cold-open.mp3";

export const COLD_OPEN_CARDS: readonly ColdOpenCard[] = [
  {
    id: "closed",
    caption: "Dutch Hill ran from 1944 to 1985. Then the lifts stopped.",
    image: "/story/card-1.webp",
    cue: 0,
  },
  {
    id: "burned",
    caption: "In 1990 the lodge burned. The forest started taking the slope back.",
    image: "/story/card-2.webp",
    // Silence runs 5.36 to 6.12 seconds; the line starts at 6.12.
    cue: 6.0,
  },
  {
    id: "town",
    caption: "Heartwellville wants its hill back. The town has leased it to you, with $12,000 to start.",
    image: "/story/card-3.webp",
    // Silence runs 10.48 to 11.30 seconds.
    cue: 11.2,
  },
  {
    id: "pick",
    caption: "Pick who runs it with you.",
    image: "/story/card-4.webp",
    // Silence runs 16.78 to 17.42 seconds.
    cue: 17.3,
  },
];

/** The card that should show at a playback time, in seconds. */
export function cardAtTime(seconds: number, cards: readonly ColdOpenCard[] = COLD_OPEN_CARDS): number {
  let index = 0;
  cards.forEach((card, i) => {
    if (seconds >= card.cue) index = i;
  });
  return index;
}

/** Where to seek the voice-over when the player moves to a card by hand. */
export function cueOf(index: number, cards: readonly ColdOpenCard[] = COLD_OPEN_CARDS): number {
  const clamped = Math.min(cards.length - 1, Math.max(0, index));
  return cards[clamped]?.cue ?? 0;
}

/**
 * Seconds a card stays up when the voice-over is silent (muted, blocked or still loading):
 * the gap to the next cue. The last card waits for the player.
 */
export function silentHoldSeconds(index: number, cards: readonly ColdOpenCard[] = COLD_OPEN_CARDS): number | null {
  const next = cards[index + 1];
  const here = cards[index];
  if (!next || !here) return null;
  return next.cue - here.cue;
}
