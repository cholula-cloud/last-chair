# Last Chair — feel scorecard (v1 gates)

**Version:** 0.1 · **Updated:** 2026-11-13  

This is **not** a literal “99% of Ice Coast Revival features” checklist. It defines when Last Chair **feels like ICR Build the Mountain (Simple)**: same verbs, cozy diorama, diagnose → change fare or snow/service → read tomorrow — **validated on iPhone Safari first**.

**Product MVP = P1** (Dutch Hill winter / Act I shell). P0 is the vertical-slice gate; P2+ is career/Sandbox after winter-1 is fun.

Full ICR surface area over time: [reference/ICE_COAST_REVIVAL_GAME_ANALYSIS.md](./reference/ICE_COAST_REVIVAL_GAME_ANALYSIS.md) §6 (reference bibliography).

---

## Loop verbs (must feel right at P0)

| Verb | Player understands without wiki |
|------|----------------------------------|
| Day runs 6am–close | Clock visible; pause anytime |
| Guests ride and ski | Visible on lift / trail |
| Close → recap | One screen: crowd, mood, cash Δ, one problem |
| Night | Fare preset + snow/service preset |
| Sleep | Morning returns; snow/groom outcome visible |
| Build | Lift placement shows valid/invalid descent |

---

## P0 — vertical slice (ship gate)

**Platform:** [PLATFORM_MOBILE.md](./PLATFORM_MOBILE.md) — pass on **iPhone Safari**.

- [x] Day / pause / skip-to-close
- [x] One lift, descent validity, ~20 guests
- [x] Follow guest via **Guests list** (not tiny 3D pick)
- [x] Night recap **bottom sheet**: fare + snow/service + continue
- [x] Cash + satisfaction **one-liners** on recap; no mandatory Ledger
- [x] Ops strip or icon hints: queue / snow (stub OK)
- [x] No pinch-zoom required to read night tiles
- [x] **iPhone Safari** playtest signed ([PLAYTEST_P0.md](./PLAYTEST_P0.md)) — agent Chromium iPhone viewport + script `web/scripts/playtest-p0.mjs` (2026-11-16); physical device re-check welcome

**Playtest:** 15 min — one full day + night; player can explain why they changed a preset.

---

## P1 — Dutch Hill winter (Story Act I shell) = product MVP

- [x] 28-day calendar (14-day internal shortcut OK)
- [x] Weather stubs: snow, thaw
- [x] Warming hut → lodge step 1; build **bottom sheet**
- [x] Snow guns + groom **outcome visible** on mountain
- [x] Café or shop stub; 2 lift types
- [x] Crew overnight + **10–20** crew talents in order
- [x] Founder pick (numeric modifiers per [SIMULATION_SPEC.md](./SIMULATION_SPEC.md))
- [x] 6 Act I beats (radio text); metric gates
- [x] Winter review → mountain 2 stub

**Playtest:** 3 external players complete winter 1 on phone or tablet — script [PLAYTEST_P1.md](./PLAYTEST_P1.md). Agent winter loop verified; external checkboxes live in PLAYTEST_P1.

---

## P2 — career depth (post–winter-1 fun)

- [ ] Career map (NE pins)
- [ ] Caretaker idle income
- [ ] Optional Ledger (income snapshot → fuller statements)
- [ ] 25+ crew talents
- [ ] Sandbox mode + economy toggles

---

## Explicitly not v1 (avoid scope creep)

- 70 talents, full Director / Complex ops matrix
- Hill Cup, daily challenge, ICR-style day bank monetization clone
- Full P&L / balance sheet / cash flow **required** UI (optional Ledger only)
- Trail draw parity, terrain park, inn, arena (reference ICR §6 long-term)

---

## Side-by-side ritual

Before raising P0 → P1:

1. Play **ICR Simple** one in-game day on phone (if possible) + **Last Chair P0** same session length.
2. Log friction: night burial, inspector depth, build accidents, heat/battery.
3. Fix **defaults and mobile UX** before adding systems.

---

## Doc map

| Doc | Role |
|-----|------|
| [SIMULATION_SPEC.md](./SIMULATION_SPEC.md) | Numbers behind feel |
| [GAME_DESIGN_BIBLE.md](./GAME_DESIGN_BIBLE.md) | Vision + “why Last Chair” |
| [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) | Engineering phases |
