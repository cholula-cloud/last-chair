# Last Chair — implementation roadmap

**Version:** 0.4 · **Updated:** 2026-11-13  
**Focus:** **ICR Simple loop feel** in Story Mode ([FEEL_SCORECARD](./FEEL_SCORECARD.md)) → Sandbox → **110% pass**  
**Platform:** Phase A1 exit on **iOS Safari** — [PLATFORM_MOBILE.md](./PLATFORM_MOBILE.md)

---

## Principles

1. **Story Mode = ICR Simple loop** + light narrative hooks.
2. **Don't over-simulate:** defer Director ops and full accounting UI.
3. **Sandbox** after Dutch Hill day-loop is fun.
4. **110%** features only from [IMPROVEMENTS_PASS.md](./IMPROVEMENTS_PASS.md).

---

## Architecture

`web/` Next.js + R3F + Zustand. Blender GLB when assets exist. **No worker sim yet** (main-thread tick is fine for P0 guest counts).

```
web/src/game/     # pure TS sim (ICR rules)
web/src/render/   # R3F
web/src/ui/       # night recap, build sheets
```

**Active triage:** [SHIP_SHAPE_REVIEW.md](./SHIP_SHAPE_REVIEW.md) — honesty + legible art before A2 winter systems.

---

## Phase A — loop-feel core (Story Mode)

### A1 Vertical slice

**Exit:** playable `/play` on **iPhone Safari** (touch-first UI).

- [x] Day / pause / close
- [x] One lift, descent check, ~20 guests, follow via Guests list
- [x] Night **bottom sheet**: fare + snow/service presets
- [x] Cash + satisfaction one-liners

### A2 One winter (simplified)

- [x] 28-day calendar (can shorten for internal test to 14)
- [x] Weather stubs (snow, thaw)
- [x] Warming hut → build menu basics
- [x] Crew overnight + talents 1–12 (ordered list in `web/src/game/content.ts`)

### A3 Story Mode shell

- [x] Founder pick (stats only, minimal copy)
- [x] 6 story beats Act I (radio text)
- [ ] Career hub: map placeholder, level, talent progress read-only (P2)

### A4 Parity expansion

- [x] 2 lift types, snow guns, groom visible (trail draw still later)
- [x] Café + shop; lodge tier 1
- [x] Winter review; mountain 2 stub; caretaker idle $ later
- [ ] Crew talents → 25+; satisfaction breakdown on tap

**Exit:** Side-by-side with ICR Simple on comparable hill—same verbs, our art.

---

## Phase B — Sandbox

- [ ] Main menu: Story | Sandbox
- [ ] Economy toggles, no story
- [ ] Save slots
- [ ] Optional: all talents / unlimited $

**Exit:** Streamers can build without debt anxiety.

---

## Phase C — 110% pass

Only after [IMPROVEMENTS_PASS.md](./IMPROVEMENTS_PASS.md) gate.

---

## Open engineering tasks (now)

1. ~~`web/src/game/` types + sim v0 — [SIMULATION_SPEC.md](./SIMULATION_SPEC.md)~~
2. ~~R3F scene on `/play`~~
3. ~~Night recap bottom sheet~~
4. ~~Descent validation UI + local save + ops strip~~
5. ~~P0 mobile viewport playtest + P1 Dutch Hill winter (14-day)~~ — next: external PLAYTEST_P1 sign-off, P2 career hub
