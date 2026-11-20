type CrewMember = "Frank" | "Dana" | "Elena";
type Facility = "surface" | "chair" | "cafe" | "gun";

function talent<Id extends string, Effects extends object>(
  id: Id, name: string, crew: CrewMember, effect: string, effects: Effects, needs?: Facility,
) {
  return { id, name, crew, effect, needs, ...effects, learned: (owned: readonly string[]) => owned.includes(id) };
}

/** Object insertion order is the crew's fixed learning order. */
export const TALENT = {
  ropeTow: talent("rope_tow", "Rope Tow", "Frank",
    "Saves $40 a day on every working surface lift.", { savings: 40 }, "surface"),
  trailGuns: talent("trail_guns", "Trail Guns", "Frank",
    "Snow guns throw 25% farther since Frank rebuilt the nozzles.", { extraReach: 0.25 }, "gun"),
  groomPass: talent("groom_pass", "Groom Pass", "Frank",
    "Grooming covers 20% more trail and lifts groom quality by 7 points.", { quality: 0.07, capacity: 1.2 }),
  ticketBooth: talent("ticket_booth", "Ticket Booth", "Elena",
    "One more guest on weekends and holidays.", { visitors: 1 }),
  patrolRadio: talent("patrol_radio", "Patrol Radio", "Dana",
    "Every lift loads 5% faster with Dana on the radio.", { capacity: 1.05 }),
  schoolDay: talent("school_day", "School Day", "Elena",
    "Two more guests on weekdays.", { visitors: 2 }),
  houseBand: talent("house_band", "House Band", "Elena",
    "Guests arrive 3 points happier Friday through Sunday and on holidays. Somebody’s cousin plays banjo.", { mood: 0.03 }),
  cafeShift: talent("cafe_shift", "Café Shift", "Elena",
    "The café adds $2 to what guests think a day is worth.", { value: 2 }, "cafe"),
  windHold: talent("wind_hold", "Wind Hold", "Dana",
    "Gusty-day chair holds shrink to 11:00 AM through 12:15 PM.", { fromMin: 660, toMin: 735 }, "chair"),
  corduroy: talent("corduroy", "Corduroy", "Frank",
    "Groom quality rises another 3 points.", { quality: 0.03 }),
  snowFences: talent("snow_fences", "Snow Fences", "Frank",
    "The bottom two segments of each trail lose 30% less depth in a thaw.", { depthLoss: 0.7, segments: 2 }),
  heritageSign: talent("heritage_sign", "Heritage Sign", "Elena",
    "Gains 2 reputation every Sunday.", { reputation: 2 }),
  bullWheel: talent("bull_wheel", "Bull Wheel Tune", "Frank",
    "Chairs load 5% faster after Frank tunes the bull wheel.", { capacity: 1.05 }, "chair"),
  skiSchool: talent("ski_school", "Ski School", "Elena",
    "First-timers arrive 5 points happier.", { mood: 0.05 }),
  earlyPlow: talent("early_plow", "Early Plow", "Frank",
    "Three more guests make it up during storms.", { stormPenalty: 2 }),
  volunteerPatrol: talent("volunteer_patrol", "Volunteer Patrol", "Dana",
    "Saves $50 in fixed costs every day.", { savings: 50 }),
  nightLights: talent("night_lights", "Night Lights", "Frank",
    "Lifts stay open ten extra minutes at closing.", { minutes: 10 }),
  groomerRebuild: talent("groomer_rebuild", "Groomer Rebuild", "Frank",
    "Mid service drops from $150 to $120 a night, and High from $350 to $300.", { mid: 120, high: 300 }),
  firstAidHut: talent("first_aid_hut", "First Aid Hut", "Dana",
    "Poor snow costs guests 15% fewer satisfaction points.", { penaltyScale: 0.85 }),
  route100Billboard: talent("route100_billboard", "Route 100 Billboard", "Elena",
    "Guests expect a day here to be worth $2 more.", { value: 2 }),
} as const;

export const CREW_TALENTS = Object.values(TALENT);
export type TalentId = typeof CREW_TALENTS[number]["id"];
