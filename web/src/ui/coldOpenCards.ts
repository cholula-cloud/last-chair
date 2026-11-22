/** The cold open: six story cards with voice-over on cards 1-2 and interactive beats on cards 3 and 5. */

export type ColdOpenCard = {
  id: string;
  /** Caption shown over the still when captions are enabled or narration is unavailable. */
  caption: string;
  /** Still image under /story. */
  image: string;
  /** Second the card appears in the timeline. */
  cue: number;
  /** Optional interactive card mode. */
  interactive?: "punchcard" | "lease";
};

export const COLD_OPEN_AUDIO = "/story/cold-open.mp3";
/** Stop the legacy recording before card 3 until cards 3-6 are re-recorded. */
export const COLD_OPEN_AUDIO_STOP_SEC = 11.15;

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
    cue: 6.0,
  },
  {
    id: "shoebox",
    caption: "Grammy Dot sold tickets here for thirty winters. She kept the last punch card, with one ride left on it.",
    image: "/story/card-2.webp",
    cue: 11.2,
    interactive: "punchcard",
  },
  {
    id: "nightcrew",
    caption: "You made snow up north for ten winters. Then Whiterock bought the mountain and put the night crew on a timer.",
    image: "/story/card-3.webp",
    cue: 17.5,
  },
  {
    id: "lease",
    caption: "Heartwellville will lease you Dutch Hill for one winter. Twelve thousand in the till. Most of it is yours, and the rest came out of Grammy Dot's coffee can.",
    image: "/story/card-3.webp",
    cue: 24.0,
    interactive: "lease",
  },
  {
    id: "pick",
    caption: "Nobody runs a hill alone. Who is signing with you?",
    image: "/story/card-4.webp",
    cue: 31.0,
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
 * the gap to the next cue. Interactive and final cards wait for the player.
 */
export function silentHoldSeconds(index: number, cards: readonly ColdOpenCard[] = COLD_OPEN_CARDS): number | null {
  const next = cards[index + 1];
  const here = cards[index];
  if (!next || !here || here.interactive) return null;
  return next.cue - here.cue;
}
