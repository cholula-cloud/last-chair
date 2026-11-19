import type {
  FounderDef,
  StoryBeatDef,
  TalentDef,
} from "./types";

export const FOUNDERS: FounderDef[] = [
  {
    id: "elena",
    name: "Elena Vargas",
    title: "The Caretaker",
    blurb: "Families arrive happier. Warming hut stays.",
    arrivalMoodBonus: 0.08,
    fixedCostDelta: 0,
    snowExpectationPenalty: 0,
  },
  {
    id: "tom",
    name: "Tom Keene",
    title: "The Refi",
    blurb: "Softer cash stress. Warm weeks sting mood.",
    arrivalMoodBonus: 0,
    fixedCostDelta: 0,
    snowExpectationPenalty: 0.03,
  },
  {
    id: "riley",
    name: "Riley Otis",
    title: "The Rigger",
    blurb: "Lift limps overnight. Turns down SummitLink deals.",
    arrivalMoodBonus: 0.02,
    fixedCostDelta: 0,
    snowExpectationPenalty: 0,
  },
  {
    id: "amira",
    name: "Amira Chen",
    title: "The Forecast",
    blurb: "Clearer weather read. Guests expect better snow.",
    arrivalMoodBonus: 0,
    fixedCostDelta: 0,
    snowExpectationPenalty: 0.05,
  },
  {
    id: "juniper",
    name: "Juniper Hale",
    title: "The Preservationist",
    blurb: "Glade reputation. Clearing costs more later.",
    arrivalMoodBonus: 0.04,
    fixedCostDelta: 0,
    snowExpectationPenalty: 0,
  },
  {
    id: "marco",
    name: "Marco Russo",
    title: "The Showman",
    blurb: "Après buzz. Higher daily fixed cost.",
    arrivalMoodBonus: 0.03,
    fixedCostDelta: 80,
    snowExpectationPenalty: 0,
  },
];

/** Ordered crew overnight learning list (P1: 12 talents). */
export const CREW_TALENTS: TalentDef[] = [
  { id: "rope_tow", name: "Rope Tow", effect: "Surface lift ops +5% efficiency" },
  { id: "trail_guns", name: "Trail Guns", effect: "Gun reach + snow depth overnight" },
  { id: "house_band", name: "House Band", effect: "Village mood +3" },
  { id: "groom_pass", name: "Groom Pass", effect: "Morning corduroy quality +0.05" },
  { id: "ticket_booth", name: "Ticket Booth", effect: "Arrivals +1 on weekends" },
  { id: "patrol_radio", name: "Patrol Radio", effect: "Lift capacity +5%" },
  { id: "cafe_shift", name: "Café Shift", effect: "Café guests linger happier" },
  { id: "school_day", name: "School Day", effect: "Weekday bus arrivals unlocked" },
  { id: "wind_hold", name: "Wind Hold", effect: "Chair stays open in gusts" },
  { id: "corduroy", name: "Corduroy", effect: "Groom visual stripes stronger" },
  { id: "night_lights", name: "Night Lights", effect: "Evening ops stub ready" },
  { id: "heritage_sign", name: "Heritage Sign", effect: "Reputation +2 each week" },
];

export const STORY_BEATS: StoryBeatDef[] = [
  {
    id: "first_load",
    title: "First uphill load",
    radio:
      "First tickets since 1985, and Superintendent Al Waters is listening. He wants the Readsboro bus back up here. Get the lodge to Tier 2, run a ski lesson, and give him a hill that can stay open.",
  },
  {
    id: "saturday",
    title: "Saturday corridor",
    radio:
      "Plates from Bennington, Williamstown, Brattleboro. Route 100 is a parade. Keep the queue moving.",
  },
  {
    id: "school_bus",
    title: "School bus",
    radio:
      "Al Waters: Readsboro wants to bring a school bus to Dutch Hill. Can you make room?",
  },
  {
    id: "dry_week",
    title: "Dry week",
    radio:
      "No guns at the start — wait for cold or close the lower third. Frank says the diesel can wait; the snow can’t be invented.",
  },
  {
    id: "summit_link",
    title: "SummitLink stop",
    radio:
      "Vivian Cho pulls off Route 100: add us to the map, keep the name if you like. The pass wants the dot.",
  },
  {
    id: "winter_review",
    title: "Winter review",
    radio:
      "Last chair for the winter. Maris has the season’s news from Dutch Hill.",
  },
];

export function founderById(id: string | null): FounderDef | undefined {
  return FOUNDERS.find((f) => f.id === id);
}
