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
    "Save $40 per operating surface lift.", { savings: 40 }, "surface"),
  trailGuns: talent("trail_guns", "Trail Guns", "Frank",
    "Snow guns reach 25% farther.", { extraReach: 0.25 }, "gun"),
  groomPass: talent("groom_pass", "Groom Pass", "Frank",
    "Groom 20% farther and raise groom quality by 7 points.", { quality: 0.07, capacity: 1.2 }),
  ticketBooth: talent("ticket_booth", "Ticket Booth", "Elena",
    "One more guest on weekends and holidays.", { visitors: 1 }),
  patrolRadio: talent("patrol_radio", "Patrol Radio", "Dana",
    "All lifts load 5% faster.", { capacity: 1.05 }),
  schoolDay: talent("school_day", "School Day", "Elena",
    "Two more guests on weekdays.", { visitors: 2 }),
  houseBand: talent("house_band", "House Band", "Elena",
    "Welcome mood rises 3 points Friday through Sunday and on holidays.", { mood: 0.03 }),
  cafeShift: talent("cafe_shift", "Café Shift", "Elena",
    "Café adds $2 to perceived value.", { value: 2 }, "cafe"),
  windHold: talent("wind_hold", "Wind Hold", "Dana",
    "Gusty chair holds run from 11:00 to 12:15.", { fromMin: 660, toMin: 735 }, "chair"),
  corduroy: talent("corduroy", "Corduroy", "Frank",
    "Groom quality rises another 3 points.", { quality: 0.03 }),
  snowFences: talent("snow_fences", "Snow Fences", "Frank",
    "Bottom two segments lose 30% less depth in thaws.", { depthLoss: 0.7, segments: 2 }),
  heritageSign: talent("heritage_sign", "Heritage Sign", "Elena",
    "Gain 2 reputation each Sunday.", { reputation: 2 }),
  bullWheel: talent("bull_wheel", "Bull Wheel Tune", "Frank",
    "Chairs load 5% faster.", { capacity: 1.05 }, "chair"),
  skiSchool: talent("ski_school", "Ski School", "Elena",
    "First-timer welcome mood rises 5 points.", { mood: 0.05 }),
  earlyPlow: talent("early_plow", "Early Plow", "Frank",
    "Three more guests reach the hill during storms.", { stormPenalty: 2 }),
  volunteerPatrol: talent("volunteer_patrol", "Volunteer Patrol", "Dana",
    "Save $50 in daily fixed costs.", { savings: 50 }),
  nightLights: talent("night_lights", "Night Lights", "Frank",
    "Lifts stay open ten extra minutes.", { minutes: 10 }),
  groomerRebuild: talent("groomer_rebuild", "Groomer Rebuild", "Frank",
    "Mid service costs $120 and High costs $300.", { mid: 120, high: 300 }),
  firstAidHut: talent("first_aid_hut", "First Aid Hut", "Dana",
    "Poor snow costs 15% fewer satisfaction points.", { penaltyScale: 0.85 }),
  route100Billboard: talent("route100_billboard", "Route 100 Billboard", "Elena",
    "Expected hill value rises by $2.", { value: 2 }),
} as const;

export const CREW_TALENTS = Object.values(TALENT);
export type TalentId = typeof CREW_TALENTS[number]["id"];
