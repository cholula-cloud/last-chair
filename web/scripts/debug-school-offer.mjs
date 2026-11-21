import { createBuiltHill } from "../src/game/__fixtures__/built-hill.ts";
import { lodgeAttachPads } from "../src/game/base.ts";
import { DUTCH_HILL_SITE } from "../src/game/mountains/dutchHill.site.ts";
import { ADAPTIVE } from "../src/game/balance.ts";
import {
  acknowledgeBeat,
  beginLodgeUpgrade,
  buyBuilding,
  placeAsset,
  pickFounder,
  schoolContractOfferDay,
  skipToClose,
  sleep,
} from "../src/game/rules.ts";

let state = pickFounder(
  { ...createBuiltHill(1), seasonLength: 28, weatherDays: createBuiltHill(1).weatherDays.slice(0, 28) },
  "elena",
);
const build = ADAPTIVE.build;

for (let guard = 0; state.phase === "day" && guard++ < 400; ) {
  for (const a of build?.({ state, recap: state.nightRecap, sawSaturdayQueue: false, problem: null }) ?? []) {
    if (a === "upgrade_lodge") state = beginLodgeUpgrade(state);
    else if (a === "cafe") state = buyBuilding(state, "cafe");
    else if (a === "rentals" || a === "ski_school") {
      let placed = false;
      for (const pad of lodgeAttachPads(state.lodgeTier)) {
        const next = placeAsset(state, a, pad);
        if (next !== state) {
          state = next;
          placed = true;
          break;
        }
      }
      if (!placed) {
        const next = placeAsset(state, a, DUTCH_HILL_SITE.buildings.cafe);
        if (next !== state) state = next;
        else console.log("FAILED", a, "day", state.dayIndex, "tier", state.lodgeTier);
      }
    }
  }
  state = skipToClose(state);
  const proven =
    state.schoolProgramProven ||
    (state.lodgeTier >= 2 && state.guests.some((g) => g.schoolLessonCompleted));
  const offer = schoolContractOfferDay({ ...state, schoolProgramProven: proven });
  if (offer !== null) {
    console.log("offer day", offer, "current", state.dayIndex, "proven", proven, "assets", state.assets.map((x) => x.id));
  }
  if (state.pendingBeat === "school_bus") {
    console.log("SCHOOL BEAT at night", state.dayIndex);
    break;
  }
  state = acknowledgeBeat(state);
  state = sleep(state);
}

console.log("final", {
  tier: state.lodgeTier,
  assets: state.assets.map((a) => ({ id: a.id, pad: a.attachPad })),
  proven: state.schoolProgramProven,
  programGuests: state.guests.filter((g) => g.schoolLessonCompleted).length,
});