export type CrewMember = "Frank" | "Dana" | "Elena";
export type Facility = "surface" | "chair" | "cafe" | "gun";

export const CREW_ROLES: Record<CrewMember, { name: CrewMember; role: string }> = {
  Frank: { name: "Frank", role: "Ops and Grooming" },
  Dana: { name: "Dana", role: "Ski Patrol" },
  Elena: { name: "Elena", role: "Base and Guest Services" },
};

function talent<Id extends string, Effects extends object>(
  id: Id, name: string, crew: CrewMember, effect: string, effects: Effects, needs?: Facility,
) {
  return { id, name, crew, effect, needs, ...effects, learned: (owned: readonly string[]) => owned.includes(id) };
}

/** Object insertion order is the crew's fixed learning order. */
export const TALENT = {
  ropeTow: talent("rope_tow", "Surface Lift Tune", "Frank",
    "Saves $40 a day on every working surface lift.", { savings: 40 }, "surface"),
  trailGuns: talent("trail_guns", "Nozzle Rebuild", "Frank",
    "Snow guns reach 25% farther across nearby trails.", { extraReach: 0.25 }, "gun"),
  groomPass: talent("groom_pass", "Wide Grooming Pass", "Frank",
    "Grooming covers 20% more trail and boosts snow quality by 7%.", { quality: 0.07, capacity: 1.2 }),
  ticketBooth: talent("ticket_booth", "Express Ticket Window", "Elena",
    "Brings 1 extra skier on weekends and holidays.", { visitors: 1 }),
  patrolRadio: talent("patrol_radio", "Lift Line Radio", "Dana",
    "Every lift loads 5% faster with patrol coordinating queues.", { capacity: 1.05 }),
  schoolDay: talent("school_day", "Midweek Local Pass", "Elena",
    "Brings 2 extra skiers on weekdays.", { visitors: 2 }),
  houseBand: talent("house_band", "Weekend Live Music", "Elena",
    "Skiers arrive in a better mood on weekends and holidays.", { mood: 0.03 }),
  cafeShift: talent("cafe_shift", "Fresh Coffee and Chili", "Elena",
    "Your cafe adds $2 to what skiers think a day here is worth.", { value: 2 }, "cafe"),
  windHold: talent("wind_hold", "Fast Wind Checks", "Dana",
    "Gusty chair wind holds shorten to 11:00 AM through 12:15 PM.", { fromMin: 660, toMin: 735 }, "chair"),
  corduroy: talent("corduroy", "Morning Corduroy", "Frank",
    "Overnight grooming lifts snow quality by another 3%.", { quality: 0.03 }),
  snowFences: talent("snow_fences", "Lower-Trail Snow Fences", "Frank",
    "The bottom two trail segments lose 30% less snow during a thaw.", { depthLoss: 0.7, segments: 2 }),
  heritageSign: talent("heritage_sign", "Route 100 Trail Sign", "Elena",
    "Adds 2 reputation every Sunday.", { reputation: 2 }),
  bullWheel: talent("bull_wheel", "Bull Wheel Tune", "Frank",
    "Double chairs load 5% faster on top of patrol radio.", { capacity: 1.05 }, "chair"),
  skiSchool: talent("ski_school", "Beginner Welcome", "Elena",
    "First-time skiers arrive happier and stick with their runs.", { mood: 0.05 }),
  earlyPlow: talent("early_plow", "Dawn Plow Run", "Frank",
    "Clears the lot early so 3 more skiers make it up on storm days.", { stormPenalty: 2 }),
  volunteerPatrol: talent("volunteer_patrol", "Volunteer Ski Patrol", "Dana",
    "Cuts daily fixed operating costs by $50.", { savings: 50 }),
  nightLights: talent("night_lights", "Late-Day Base Lights", "Frank",
    "Lifts run 10 extra minutes before last chair.", { minutes: 10 }),
  groomerRebuild: talent("groomer_rebuild", "Groomer Overhaul", "Frank",
    "Cuts Mid snow service from $150 to $120 a night, and High from $350 to $300.", { mid: 120, high: 300 }),
  firstAidHut: talent("first_aid_hut", "Trailside Patrol Aid", "Dana",
    "Cuts guest unhappiness from rough snow by 15%.", { penaltyScale: 0.85 }),
  route100Billboard: talent("route100_billboard", "Valley Word of Mouth", "Elena",
    "Raises what skiers think a day at Dutch Hill is worth by $2.", { value: 2 }),
} as const;

export const CREW_TALENTS = Object.values(TALENT);
export type TalentId = typeof CREW_TALENTS[number]["id"];