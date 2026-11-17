# Last Chair — simulation spec (Dutch Hill v0)

**Version:** 0.3 · **Updated:** 2026-11-16  
**Scope:** Numbers for the Dutch Hill core loop and Act I winter. Plan and gates: [MASTER_PLAN.md](./MASTER_PLAN.md).

## Implementation status (2026-11-16 audit)

✅ implemented as written · 🟡 partial or approximated · ❌ not implemented. Update this table in the same PR that changes the code.

| Section | Status | Gap | Fixed by PR |
|---|---|---|---|
| Time | 🟡 | Clock, pause, 6–16h work; hidden-tab pause not verified; season is 14 days | 19 |
| Guest day script | 🟡 | Arrival curve, walk-in, energy, laps, lift-close and departure are real (PR 6). No refuel stop | 16 |
| Personas | 🟡 | 2 of 4 (First-Timer, Regular) drive energy, run time, target runs and the satisfaction weights (PR 7); Family Pack and Race Kid not modeled | 9 |
| Satisfaction formula | ✅ | Per guest from five terms, day score is the guest mean, recap stores the per-term breakdown and names the largest negative term (PR 7). The value term is 🟡: fare preset vs a fixed expectation until PR 9 judges fare against what the hill offered | 9 |
| Arrivals | ✅ | Count from `planArrivals`; spawn minutes from a bell curve over 08:00–14:00 (PR 6). Fare elasticity by persona waits for PR 9 | 9 |
| Lift types / capacity | 🟡 | Types differ in capacity and ride time, with a FIFO queue and measured waits (PR 5, game-scaled numbers). No wind or closures | 15 |
| Viability rule | 🟡 | Zone check on three fixed slots, not a terrain/trail test | 11–13 |
| Trail graph | ❌ | Single implicit run | 13 |
| Snow | 🟡 | One global depth + quality; no per-segment coverage; thaw is hill-wide | 8 |
| Economy | 🟡 | Costs and revenue as written; no loan / fail-soft | 20 |
| Night choices | ✅ | Fare + snow/service presets with costs | — |
| Crew talents | 🟡 | 12 in order; 4 have effects (`trail_guns`, `groom_pass`/`corduroy`, `ticket_booth`, `school_day`, `patrol_radio`) | 21 |
| Founder modifiers | 🟡 | Mood, fixed cost, snow expectation live; loan rate, repair, forecast, clearing cost, demolition lock missing | 22 |
| Story beat gates | 🟡 | Six beats gated; thresholds differ slightly from table (Saturday ≥22, dry week depth <0.35, school bus also on lodge) | 23 |
| Save format | 🟡 | Key `last-chair-v1`, schema version 1 with migration; cloud later | 25 |
| Randomness | 🟡 | Seeded RNG injected (PR 3); weather still a formula | 18 |

---

## Time

| Constant | Value |
|----------|--------|
| Day start | 07:30 (first arrivals 08:00; moved from 06:00 in PR 6 to remove an empty two hours) |
| Day end (close) | 16:00 |
| Realtime 1× | 1 in-game minute ≈ 0.5 s (tunable) |
| Speed | 1× default; 2× after tutorial beat |
| Season | 28 days (internal test: 14) |

**Pause:** `dayClock` frozen; build allowed.  
**Visibility:** when `document.hidden`, pause clock (mobile Safari).

---

## Guest agent

### Day script (states)

```text
Pending → Arrive → QueueAtLift → RideLift → SkiRun → (loop SkiRun / Refuel) → Depart → Gone
```

Implemented in `sim.ts` `tickGuests` and `lifts.ts` `stepLifts`. The whole roster exists at day start (07:30) as `pending` (not drawn) and each guest switches on at their arrival minute. `arrive`, `ski` and `depart` are timed states: `progress = elapsed / duration`. `gone` is terminal and not drawn.

- **Arrive:** at the guest's arrival minute they walk from parking to the lift line (3 game minutes), then join the line.
- **QueueAtLift:** FIFO per lift; wait time affects satisfaction.
- **RideLift:** fixed ride duration by lift type.
- **SkiRun:** duration from the persona table, scaled by snow quality (`× (1 + 0.3 × (1 − quality))`, so Mid snow at 0.55 is +13%). At the bottom the run is counted and energy drops by the persona's cost. The guest laps unless energy ≤ 0, runs reach their target, or `now + expected wait + ride + next run > 15:45`.
- **Refuel:** optional café if energy low and venue exists (P1, PR 16). Not built.
- **Depart:** 3 game minutes to the car park, then `gone`. Lifts stop loading at 15:45: everyone still in a line leaves it and departs, and counts in `turnedAway` if they had not ridden yet. By 16:00 every guest is `gone` or `depart`.

### Persona table (implemented values)

Each guest draws a persona from the day's mix, a target run count in the persona's range, and an arrival minute.

| Persona | Weekday / weekend mix | Energy cost per run (start 1.0) | Run time at quality 1 | Target runs | Observed runs per day |
|---|---|---|---|---|---|
| First-Timer | 60% / 40% | 0.18 (tired after 6) | 14 min | 3–6 | 4.4 |
| Saturday Regular | 40% / 60% | 0.11 (tired after 10) | 8 min | 6–10 | 8.0–8.3 |

Observed runs are the mean over 20 seeds on a day with short queues (surface + chair). Family Pack and Race Kid are not modeled. The satisfaction weights in the next table apply to the queue, snow and value terms (see Satisfaction below).

### Personas (weights on satisfaction terms)

| Persona | Queue pain | Snow quality | Ticket value |
|---------|------------|--------------|----------------|
| First-Timer | 1.2 | 1.0 | 0.8 |
| Saturday Regular | 1.5 | 1.1 | 1.3 |
| Family Pack | 1.4 | 0.9 | 1.0 |
| Race Kid | 1.0 | 1.4 | 0.9 |

P0: pool **First-Timer + Saturday Regular** only.

### Satisfaction (guest, 0–100)

Each guest's score is built from what happened to them. The day score is the mean over guests who arrived: guests gone home count their finished day, guests still on the hill their day so far, guests turned away count their low score. The HUD reading (`liveSatisfaction`) and the closing recap use the same function, so they agree at close. Revenue uses the day score; reputation is unchanged.

`score = clamp(70 + arrivalMood + queue + snow + value + runs, 0, 100)`

Every term is signed points from a neutral baseline, in `satisfaction.ts` (`SAT`). Persona weights are in `personas.ts`.

| Term | Formula | Constants |
|---|---|---|
| `arrivalMood` | `40 × (mood − 0.70)` | `mood` = `arrivalMood(buildings, founder, weather)`: 0.65 + hut 0.05 + lodge 0.08 + café 0.04 + founder bonus, weather snow +0.06 / thaw −0.08, clamped 0–0.95. Hut only on a clear day is 0 |
| `queue` | `−min(35, 3.5 × queueWeight × pain)` | `pain(w)` for mean wait per ride `w` minutes: 0 up to 1 min, then `w − 1` up to 6 min, then 5 + half a point per minute beyond. Includes the line the guest is standing in; a line left at closing counts as a wait |
| `snow` | `50 × snowWeight × (avgQuality − expected)` | `expected` = 0.55 + founder `snowExpectationPenalty`; `avgQuality` is the mean snow quality under the guest's finished runs; 0 before the first run |
| `value` | `10 × valueWeight × step` | `step`: Cheap +0.4, Balanced 0, Expensive −1. Fare preset vs a fixed expectation (🟡; PR 9 replaces it with fare vs what the hill offered) |
| `runs` | finished guests only: `share = min(1, runs / targetRuns)`; `5 × (share − 0.6) / 0.4` from 0.6 up, `−8 × (0.6 − share) / 0.6` below | Full target +5, 0.6 of target 0, zero runs (turned away) −8 |

Persona weights:

| Persona | queueWeight | snowWeight | valueWeight |
|---|---|---|---|
| First-Timer | 1.2 | 1.0 | 0.8 |
| Saturday Regular | 1.5 | 1.1 | 1.3 |

Family Pack (1.4 / 0.9 / 1.0) and Race Kid (1.0 / 1.4 / 0.9) have weights in the design but are not modeled yet.

**Day breakdown.** `nightRecap.breakdown` holds the mean of each term over the guests who arrived, in signed points (PR 9 shows it under "Why?").

**Problem line.** The term with the largest negative breakdown, if it is below −3 points, gives the recap sentence (with the real number); otherwise "Good day on the hill." Terms: `queue` (mean wait per ride), `snow` (snow quality %), `value` (the fare), `runs` (guests turned away, else runs per guest), `arrivalMood` (the mood on arrival).

**Observed (mean of 10 seeds, Elena, balanced fare, snow 0.55):** weekday surface + chair 78; weekday surface only 76 (queue −2); Saturday surface only 50 (queue −28); Saturday surface + chair 78; weekday snow 0.30 65 (snow −13); weekday snow 0.85 94; weekday Expensive 68 (value −10); weekday Cheap 82; Saturday surface only and Expensive 39.

### Arrivals (Dutch Hill P0)

- Base guests/day: **18–28** uniform by weekend flag (Sat/Sun +30%), then modifiers (`planArrivals`).
- Spawn minute per guest: the mean of two triangular draws on 08:00–14:00 with its mode at 10:00 (seeded). About 80% of guests arrive between 09:00 and 11:30, 2% between 08:00 and 09:00, and under 1% after 13:00; the tails stay inside the window. A single triangular draw (63% in 09:00–11:00) spreads the day wider but needs a lower surface capacity to give weekday waits above a minute, which pushes Saturday past 12.
- Day stats: `arrivals` (roster size), `guestsArrived`, `completedRuns`, `runsPerGuest`, `turnedAway`, `peakOnHill`, plus the lift waits below.

---

## Lifts & terrain

### Lift types (P0 / P1)

Each confirmed lift is a server: a FIFO queue of guest ids plus a dispatch accumulator. Every sim step adds `minutes × capacity/60` to the accumulator and, while it is at least 1 and the queue is not empty, the guest at the front boards (wait = now − time joined). An idle lift keeps at most one unit, so it never banks capacity. A ride ends after the ride time, then the guest skis. Guests who finish a run join the lift with the shortest expected wait (queue length ÷ capacity, ties to the higher capacity). Sim ticks longer than 0.5 game minutes are split into 0.5 minute steps so measured waits stay accurate.

| Type | Ride time | Capacity/hr (game-scaled) | Real-world nominal |
|------|-----------|---------------------------|--------------------|
| Surface (rope/T) | 4 min | 46 | 600 |
| Double chair (P1) | 3 min | 70 | 900 |

**Game-scaled:** days have 12–40 guests, so real capacities would never queue. PR 5 tuned 70 and 110 per hour against the old 06:00 burst. PR 6 retuned against the arrival curve and the persona table. Headless experiment, 20 seeds per cell, full day, Elena as founder, balanced fare, snow 0.55; surface only versus surface plus chair:

| Day | Guests | Surface only: avg / peak wait | Surface + chair: avg / peak wait | Runs per guest |
|-----|--------|-------------------------------|----------------------------------|----------------|
| Weekday | 18–22 | 1.1 / 5.1 min | 0.03 / 0.65 min | 5.9 |
| Saturday | 31–40 | 10.8 / 22.9 min | 0.16 / 1.65 min | 6.6 |

Sweep that led to 46 per hour (surface capacity, avg wait weekday / Saturday): 36 → 3.5 / 20.2, 40 → 2.4 / 15.6, 45 → 1.2 / 11.4, 48 → 0.8 / 9.5, 50 → 0.7 / 8.5. One capacity cannot put both days in a 1–3 and 5–10 minute band, because Saturday carries about 1.8× the guests and queues grow faster than linearly. 46 keeps the weekday near 1 minute and Saturday just over 10; the chair removes both. Saturday's wait is the day's peak pressure, which PR 8–9 and the lever work should lean on.

Talent **Patrol Radio** adds 5% to every lift's capacity. The HUD queue reading is the expected wait at the busiest lift (queue length ÷ capacity per minute); the day average (`avgQueueMin`) is the measured mean wait of guests dispatched today, alongside `maxQueueLength` and `peakWaitMin`.

### Viability rule (build preview)

A lift placement is **valid** iff:

1. Load and unload stations on buildable tiles with slope ≤ max load grade.
2. From unload, path exists on trail graph with continuous downhill to base (no uphill segment > 5 m equivalent).
3. At least one run segment has `snow.depth ≥ minDepth` (0.15 m P0).

Invalid preview: red ghost; cannot confirm.

### Trail graph (P0)

Single cleared run from mid-mountain to base + optional stub. P1: second run + glade flag.

---

## Snow (v0)

Three scalars per run segment (0–1 normalized):

| Field | Meaning |
|-------|---------|
| `depth` | Keeps route open |
| `quality` | Corduroy / fresh / ice |
| `coverage` | Fraction skiable |

**Overnight (player snow/service preset):**

| Preset | Guns effect | Groom effect |
|--------|-------------|--------------|
| Minimal | +0 depth on 1 segment | none |
| Mid | +depth spread, quality → 0.6 | groom stripes, quality +0.2 |
| High | +depth all served runs | quality cap 0.85 |

**Thaw stub (daytime):** if temp > threshold, `depth -= 0.05`, `quality -= 0.15` on lowest third of mountain.

Weather P0: random **snow day** (+depth) or **thaw day** — icon in morning headline.

---

## Economy (Dutch Hill P0)

| Item | Value |
|------|--------|
| Starting cash | $12,000 |
| Ticket fare presets | Cheap $35 / Balanced $48 / Expensive $62 |
| Daily fixed cost | $400 (power, staff stub) |
| Lift ops / day | $180 per open lift |

**Revenue/day:** `arrivals × fare × (satisfaction/100)` simplified multiplier 0.7–1.1.

**Fail soft:** cash &lt; 0 → warning + loan offer $10k (interest stub P1).

---

## Night choices (ICR Simple mapping)

| Control | Options | Sim effect |
|---------|---------|------------|
| Fare | Cheap / Balanced / Expensive | `ticketMismatch`, arrivals ±10% |
| Snow & service | Minimal / Mid / High | overnight table above + fixed cost +$0 / +$150 / +$350 |

Max **2** player choices Act I (+ optional story reply when beat ready).

---

## Crew talents (P0 stub)

Overnight picks **first unowned** talent in crew order (list in `web/src/game/content.ts`). P0 implements **3 placeholders:**

1. **Rope Tow** — surface lift ops efficiency  
2. **Trail Guns** — +gun reach P1  
3. **House Band** — village mood stub P1  

Player sees: “Tomorrow the crew learns: *Rope Tow*” on level readout.

---

## Founder modifiers (P1 — numeric)

Apply at career start; one founder:

| Founder | Bonus | Constraint |
|---------|-------|------------|
| Elena Vargas | arrivalMood +0.08 | cannot demolish warming hut |
| Tom Keene | loan rate −1% | warm-week satisfaction −3 |
| Riley Otis | overnight repair 15% | no SummitLink equity |
| Amira Chen | +1 day forecast | snow expectation +5% penalty |
| Juniper Hale | glade rep + | clearing cost +15% |
| Marco Russo | après rev +10% | starting fixed cost +$80/day |

P0: founder pick UI only; apply Elena default silently for tests.

---

## Story beat gates (Act I)

| Beat | Gate (metric) |
|------|----------------|
| First uphill load | `lifts.open ≥ 1` and `guests.completedRun ≥ 5` |
| Saturday | `dayIndex` is Sat and `arrivals ≥ 25` |
| School bus | `lessons booked ≥ 1` OR `arrivals ≥ 40` on weekday (P1) |
| Dry week | `daysWithoutSnow ≥ 3` and `snow.depth &lt; 0.2` |
| SummitLink | `reputation ≥ 50` (stub from satisfaction avg) |
| Winter review | `dayIndex == seasonLength` |

Fail-forward: beats delay to next eligible day; no hard fail.

---

## Save format (v1)

JSON blob in localStorage under the key `last-chair-v1`, written by zustand `persist` with `version: 2` (v2 added lift queues and queue statistics; older saves migrate with empty queues). The key kept its name so earlier saves still load. The blob is `PersistedState` (`game/state.ts`): clock, phase, cash, presets, snow, guests, lifts, buildings, talents, beats, weather, reputation, `rngState`, plus `nightRecap` and `dayStats` so a reload during the night restores the night sheet exactly.

`migrate(persisted, fromVersion)` fills fields missing from older saves from a fresh state. An unversioned (v0) save has no `rngState`, `nightRecap` or `dayStats`; a v0 save made during the night has no recap to restore and loads as a day.

Cloud sync: P2; on `visibilitychange` hidden → write localStorage.

---

## Implementation map

```
web/src/game/types.ts      — entities
web/src/game/sim.ts        — tick day, overnight
web/src/game/store.ts      — zustand bridge to UI
web/src/render/MountainScene.tsx
web/src/ui/NightRecapSheet.tsx
```

Refs: [MASTER_PLAN.md](./MASTER_PLAN.md) (session flow, mobile rules).
