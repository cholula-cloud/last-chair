/**
 * Coach tips for the first winter. A table of short tips, each shown once at the right moment.
 * Row 26 (the full coached winter) extends this table; the UI only reads `nextTip`.
 */

/** What the coach needs to know, gathered by the screen from game state and the build UI. */
export type CoachContext = {
  phase: "setup" | "day" | "night" | "winter_review" | "mountain2";
  dayIndex: number;
  /** The first-morning step still waiting on the player, if any (see `openingStep`). */
  opening: "lift" | "trail" | null;
  /** True once the day clock has started on day 1 or any later day. */
  running: boolean;
  placementActive: boolean;
  buildOpen: boolean;
  /** The night recap is open and has a "Guests want" line. */
  hasGuestsWant: boolean;
  /** Tips are switched on in Settings. */
  enabled: boolean;
};

export type CoachTip = {
  id: string;
  /** One complete sentence naming the gesture and the result. */
  text: string;
  when: (ctx: CoachContext) => boolean;
};

const idle = (ctx: CoachContext) => ctx.phase === "day" && !ctx.placementActive && !ctx.buildOpen;

/** In the order they are offered when several apply. */
export const COACH_TIPS: readonly CoachTip[] = [
  {
    id: "lift",
    text: "Drag uphill from the base to place a lift.",
    when: (c) => idle(c) && c.opening === "lift",
  },
  {
    id: "pan",
    text: "Use two fingers to move the map.",
    when: (c) => idle(c) && c.opening === "lift" && c.dayIndex === 1,
  },
  {
    id: "review",
    text: "Tap Review to see the cost, then tap Place.",
    when: (c) => c.phase === "day" && c.placementActive,
  },
  {
    id: "trail",
    text: "Paint a trail from the top of the lift down to the base.",
    when: (c) => idle(c) && c.opening === "trail",
  },
  {
    id: "speed",
    text: "Tap the speed button to make the day go faster.",
    when: (c) => idle(c) && c.running && c.opening === null && c.dayIndex === 1,
  },
  {
    id: "lease",
    text: "The lease line shows the land you may build on.",
    when: (c) => c.phase === "day" && c.buildOpen,
  },
  {
    id: "recap",
    text: "The night recap shows how the day went and sets tomorrow’s fare.",
    when: (c) => c.phase === "night",
  },
  {
    id: "guestsWant",
    text: "The Guests want line names the one thing guests asked for most.",
    when: (c) => c.phase === "night" && c.hasGuestsWant,
  },
  {
    id: "goal",
    text: "The goal strip under the date shows what to finish this winter.",
    when: (c) => idle(c) && c.running && c.dayIndex >= 2,
  },
  {
    id: "guns",
    text: "Snow guns make snow overnight. Build them from the Build sheet.",
    when: (c) => idle(c) && c.running && c.dayIndex >= 3,
  },
];

export const COACH_TIP_IDS: readonly string[] = COACH_TIPS.map((tip) => tip.id);

/** The one tip to show now, or null. Never two at once. */
export function nextTip(seen: readonly string[], ctx: CoachContext): CoachTip | null {
  if (!ctx.enabled) return null;
  return COACH_TIPS.find((tip) => !seen.includes(tip.id) && tip.when(ctx)) ?? null;
}

/** The seen list after a tip is dismissed. Unknown ids are ignored and repeats are not added. */
export function withTipSeen(seen: readonly string[], id: string): string[] {
  if (!COACH_TIP_IDS.includes(id) || seen.includes(id)) return [...seen];
  return [...seen, id];
}
