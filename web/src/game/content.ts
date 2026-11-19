import type {
  FounderDef,
  StoryBeatDef,
  TalentDef,
} from "./types";

export const WINTER_GOAL = "Finish day 28 with enough cash to pay off your loan and any unpaid construction bills.";

export const FOUNDERS: FounderDef[] = [
  {
    id: "elena",
    name: "Elena Vargas",
    title: "The Caretaker",
    bonus: "Happier families bring two extra guests.",
    constraint: "Keep the warming hut.",
    arrivalMoodBonus: 0.08,
    fixedCostDelta: 0,
    snowExpectationPenalty: 0,
  },
  {
    id: "tom",
    name: "Tom Keene",
    title: "The Refi",
    bonus: "Borrow at 7% for the winter.",
    constraint: "Repeated thaw days cost 3 welcome points.",
    arrivalMoodBonus: 0,
    fixedCostDelta: 0,
    snowExpectationPenalty: 0,
  },
  {
    id: "riley",
    name: "Riley Otis",
    title: "The Rigger",
    bonus: "Spend 15% less on lift operations.",
    constraint: "Must decline Vivian’s offer.",
    arrivalMoodBonus: 0,
    fixedCostDelta: 0,
    snowExpectationPenalty: 0,
  },
  {
    id: "amira",
    name: "Amira Chen",
    title: "The Forecast",
    bonus: "See two days of forecasts.",
    constraint: "Guests expect 5% better snow.",
    arrivalMoodBonus: 0,
    fixedCostDelta: 0,
    snowExpectationPenalty: 0.05,
  },
  {
    id: "juniper",
    name: "Juniper Hale",
    title: "The Preservationist",
    bonus: "Gain extra reputation each night.",
    constraint: "Lift lines and tree clearing cost 15% more.",
    arrivalMoodBonus: 0,
    fixedCostDelta: 0,
    snowExpectationPenalty: 0,
  },
  {
    id: "marco",
    name: "Marco Russo",
    title: "The Showman",
    bonus: "Earn 10% more from venues.",
    constraint: "Pay $80 more per day.",
    arrivalMoodBonus: 0,
    fixedCostDelta: 80,
    snowExpectationPenalty: 0,
  },
];

export const CREW_TALENTS: TalentDef[] = [
  { id: "rope_tow", name: "Rope Tow", crew: "Frank", effect: "Save $40 per operating surface lift." },
  { id: "trail_guns", name: "Trail Guns", crew: "Frank", effect: "Snow guns reach 25% farther." },
  { id: "groom_pass", name: "Groom Pass", crew: "Frank", effect: "Groom 20% farther and raise groom quality by 7 points." },
  { id: "ticket_booth", name: "Ticket Booth", crew: "Elena", effect: "One more guest on weekends and holidays." },
  { id: "patrol_radio", name: "Patrol Radio", crew: "Dana", effect: "All lifts load 5% faster." },
  { id: "school_day", name: "School Day", crew: "Elena", effect: "Two more guests on weekdays." },
  { id: "house_band", name: "House Band", crew: "Elena", effect: "Welcome mood rises 3 points Friday through Sunday and on holidays." },
  { id: "cafe_shift", name: "Café Shift", crew: "Elena", effect: "Café adds $2 to perceived value." },
  { id: "wind_hold", name: "Wind Hold", crew: "Dana", effect: "Gusty chair holds run from 11:00 to 12:15." },
  { id: "corduroy", name: "Corduroy", crew: "Frank", effect: "Groom quality rises another 3 points." },
  { id: "snow_fences", name: "Snow Fences", crew: "Frank", effect: "Bottom two segments lose 30% less depth in thaws." },
  { id: "heritage_sign", name: "Heritage Sign", crew: "Elena", effect: "Gain 2 reputation each Sunday." },
  { id: "bull_wheel", name: "Bull Wheel Tune", crew: "Frank", effect: "Chairs load 5% faster." },
  { id: "ski_school", name: "Ski School", crew: "Elena", effect: "First-timer welcome mood rises 5 points." },
  { id: "early_plow", name: "Early Plow", crew: "Frank", effect: "Three more guests reach the hill during storms." },
  { id: "volunteer_patrol", name: "Volunteer Patrol", crew: "Dana", effect: "Save $50 in daily fixed costs." },
  { id: "night_lights", name: "Night Lights", crew: "Frank", effect: "Lifts stay open ten extra minutes." },
  { id: "groomer_rebuild", name: "Groomer Rebuild", crew: "Frank", effect: "Mid service costs $120 and High costs $300." },
  { id: "first_aid_hut", name: "First Aid Hut", crew: "Dana", effect: "Poor snow costs 15% fewer satisfaction points." },
  { id: "route100_billboard", name: "Route 100 Billboard", crew: "Elena", effect: "Expected hill value rises by $2." },
];

export function talentDescription(name: string, state: Pick<import("./state").GameState, "lifts" | "buildings" | "guns">): string {
  const talent = CREW_TALENTS.find(entry => entry.name === name);
  if (!talent) return name;
  const waiting = (talent.id === "wind_hold" || talent.id === "bull_wheel") && !state.lifts.some(l => l.confirmed && l.type === "chair")
    ? "Waits for a chair." : talent.id === "cafe_shift" && !state.buildings.includes("cafe")
      ? "Waits for a café." : talent.id === "trail_guns" && !state.guns.length ? "Waits for a snow gun." : "";
  return [talent.name + " (" + talent.crew + ")", talent.effect, waiting].filter(Boolean).join(" ");
}

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
    title: "Abominable Snowglomerate stop",
    radio:
      "Vivian Cho pulls off Route 100: add us to the map, keep the name if you like. The pass wants the dot.",
  },
  {
    id: "winter_review",
    title: "Winter review",
    radio:
      "Last chair for the winter. Maris has the winter’s news from Dutch Hill.",
  },
];

export function founderById(id: string | null): FounderDef | undefined {
  return FOUNDERS.find((f) => f.id === id);
}
