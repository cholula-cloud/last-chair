# Last Chair — simulation spec (Dutch Hill v0)

**Version:** 0.4 · **Updated:** 2026-11-17  
**Scope:** Numbers for the Dutch Hill core loop and Act I winter. Plan and gates: [MASTER_PLAN.md](./MASTER_PLAN.md).

## Implementation status (2026-11-16 audit)

✅ implemented as written · 🟡 partial or approximated · ❌ not implemented. Update this table in the same PR that changes the code.

| Section | Status | Gap | Fixed by PR |
|---|---|---|---|
| Time | 🟡 | Clock, pause, 6–16h work; hidden-tab pause not verified; season is 14 days | 19 |
| Guest day script | 🟡 | Arrival curve, walk-in, energy, laps, lift-close and departure are real (PR 6). No refuel stop | 16 |
| Personas | 🟡 | 2 of 4 (First-Timer, Regular) drive energy, run time, target runs and the satisfaction weights (PR 7); Family Pack and Race Kid not modeled | 9 |
| Satisfaction formula | ✅ | Per guest from five terms, day score is the guest mean, recap stores the per-term breakdown and names the largest negative term (PR 7). The value term judges the fare against what the hill gave that guest in dollars (PR 9). Constants calibrated in PR 10 (see Balance) | — |
| Arrivals | ✅ | Count from `planArrivals`; spawn minutes from a two-part curve over 08:00–13:30 (PR 6, reshaped in PR 10b). Fare elasticity by persona mix against a reputation-based expected value (PR 9) | — |
| Lift types / capacity | 🟡 | Types differ in capacity and ride time, with a FIFO queue and measured waits (PR 5, game-scaled numbers). No wind or closures | 15 |
| Viability rule | 🟡 | Lift line (bottom to top) checked for bounds, base area, grade, drop, length, spacing and crossing (PR 12a); tap placement UI PR 12b–c; trail path test PR 13 | 12–13 |
| Trail graph | ❌ | Single implicit run | 13 |
| Snow | ✅ | Six segments per lift trail with depth, quality, coverage (PR 8). One trail per lift top; no trail graph yet (PR 13). Numbers uncalibrated | — |
| Economy | 🟡 | Costs and revenue as written; lift cost from length and vertical (PR 12a); no loan / fail-soft | 20 |
| Night choices | ✅ | Fare + snow/service presets with costs. Tiles preview tomorrow's expected skiers (`expectedArrivals`) and morning cover (`previewOvernight`) before Sleep (PR 9). The weather is a formula, so the preview is exact; a seeded forecast (PR 18) turns it into an expectation | 18 |
| Crew talents | 🟡 | 12 in order; 4 have effects (`trail_guns`, `groom_pass`/`corduroy`, `ticket_booth`, `school_day`, `patrol_radio`) | 21 |
| Founder modifiers | 🟡 | Mood, fixed cost, snow expectation live; loan rate, repair, forecast, clearing cost, demolition lock missing | 22 |
| Story beat gates | 🟡 | Six beats gated; thresholds differ slightly from table (Saturday ≥22, dry week depth <0.35, school bus also on lodge) | 23 |
| Save format | 🟡 | Key `last-chair-v1`, schema version 7 with migration; cloud later | 25 |
| Balance harness | ✅ | `balance.ts` plays whole seasons through the real rules; `balance.test.ts` asserts the properties; `npm run balance` prints the 40-seed table (PR 10). Device re-sign pending | — |
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
| First-Timer | 60% / 40% | 0.13 (tired after 8) | 14 min | 4–8 | see Balance |
| Saturday Regular | 40% / 60% | 0.075 (tired after 13) | 8 min | 9–13 | see Balance |

Targets and energy were raised in PR 10 so a long line can cut a guest's runs (before: First-Timer 0.18 energy, 3–6 runs; Regular 0.11, 6–10; observed 4.4 and 8.0–8.3 before the retune, at the PR 6 capacities). Family Pack and Race Kid are not modeled. The satisfaction weights in the next table apply to the queue, snow and value terms (see Satisfaction below).

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
| `value` | `clamp(30 × valueWeight × (hillValue − fare) / fare, −20, +10)` | `hillValue` is dollars, see Ticket value below |
| `runs` | finished guests only: `share = min(1, runs / targetRuns)`; `5 × (share − 0.6) / 0.4` from 0.6 up, `−8 × (0.6 − share) / 0.6` below | Full target +5, 0.6 of target 0, zero runs (turned away) −8 |

Persona weights:

| Persona | queueWeight | snowWeight | valueWeight |
|---|---|---|---|
| First-Timer | 1.2 | 1.0 | 0.8 |
| Saturday Regular | 1.5 | 1.1 | 1.3 |

Family Pack (1.4 / 0.9 / 1.0) and Race Kid (1.0 / 1.4 / 0.9) have weights in the design but are not modeled yet.

**Ticket value (`satisfaction.ts` `VALUE`).** A guest judges the ticket against what the day gave them, in dollars:

`hillValue = max(10, 45 + 40 × (avgSnow − snowExpectation) − min(20, 0.35 × excessWaitMin) + venues + 8 × runsFraction)`

| Part | Rule |
|---|---|
| Base | $45, a Dutch Hill day with middling snow and the warming hut |
| Snow | $40 per 1.0 of mean snow quality under the guest's finished runs above their expectation (0 before the first run) |
| Waiting | $0.35 per minute in lift lines beyond the free minute per ride (the line they stand in counts), capped at $20 |
| Venues | Lodge +$4, café +$3 (`venueValue`) |
| Runs | Finished guests only: +$8 at the full target, 0 at 0.6 of target, −$8 at zero runs (the same fraction as the runs term) |

The value term is `valueWeight × 30 × (hillValue − fare) / fare`, clamped to −20…+10 points (a deal helps less than a rip-off hurts). Fares are $35 / $48 / $62. A neutral finished regular scores about +4 at Balanced, +10 (the cap) at Cheap and −6 at Expensive; on a great day (snow 0.85, no queue, lodge and café, full runs) Expensive is +6, and on an awful day (snow 0.3, an hour in line, 3 of 8 runs) Cheap is −20. Regulars (1.3) move 1.6 times as far as first-timers (0.8) until the clamp. Constants were calibrated in PR 10 (see Balance).

**Day breakdown.** `nightRecap.breakdown` holds the mean of each term over the guests who arrived, in signed points. `nightRecap.facts` holds the numbers behind them (mean wait, snow quality and word, fare, mean `hillValue`, runs per guest, turned away, arrival mood). The recap's "Why?" list (`why.ts` `whyLines`) shows the five terms largest effect first with those numbers.

**Yesterday.** `lastDay` (`arrivals`, `satisfaction`, `cashDelta`, `avgWaitMin`, `fare`, `snow`) is written at Sleep and cleared by a new season. The next recap shows today-versus-yesterday deltas (hidden on day 1).

**Problem line.** The term with the largest negative breakdown, if it is below −3 points, gives the recap sentence (with the real number); otherwise "Good day on the hill.", or, when today lost cash, "Lost $N today — running costs beat ticket sales on a quiet day." (PR 10b). A story beat's +2 reputation is applied when the night opens (`openNight`), so the recap previews do not move when the beat is acknowledged Terms: `queue` (mean wait per ride), `snow` (snow quality %), `value` (the fare), `runs` (guests turned away, else runs per guest), `arrivalMood` (the mood on arrival).

**Observed (mean of 10 seeds, Elena, balanced fare, snow 0.55):** weekday surface + chair 78; weekday surface only 76 (queue −2); Saturday surface only 50 (queue −28); Saturday surface + chair 78; weekday snow 0.30 65 (snow −13); weekday snow 0.85 94; weekday Expensive 68 (value −10); weekday Cheap 82; Saturday surface only and Expensive 39.

### Arrivals (Dutch Hill P0)

- Base guests/day: **18–22** on a weekday and **24–28** on a weekend (uniform noise of 0–4), Sat/Sun ×1.3, then the fare multiplier and modifiers (`planArrivals`).
- Fare elasticity: `expected = max(10, 45 + 0.6 × (reputation − 50) + venues)` is what the town expects a day here to be worth (word of mouth plus the lodge and café). Each persona's demand is `clamp(1 + 0.8 × valueWeight × (expected / fare − 0.8125), 0.75, 1.3)`, and the day's multiplier is the mean over the roster mix (weekday 60% first-timers, weekend 60% regulars). The reference ratio 0.8125 (39 / 48) is Balanced at the starting reputation (40) with no venues, which gives 1.0. Cheaper fares, better reputation and venues raise arrivals; regulars swing further. The old flat ±10% is gone. The result is clamped to 12–48.
- `meanArrivals` / `rules.expectedArrivals(state, fare, snow)` is the same count with the noise replaced by its mean (2) and no RNG; the night sheet shows it on each fare tile. `rules.previewOvernight(state, snow)` runs `applyOvernight` on the current trails and returns the morning's worst-segment word, mean quality and cost.
- Spawn minute per guest (PR 10b): a mix of early birds (30%, triangle 08:00–10:00, mode 09:00) and the main crowd (70%, triangle 08:00–13:30, mode 09:30), seeded. The first guests arrive at 08:00, about 22% are in by 09:00, about 79% by 11:00, under 1% after 13:00, and no one comes after 13:30. The earlier mean-of-two-triangulars curve (PR 6) left the hill empty until about 09:25 while the clock ran from 07:30.
- Day stats: `arrivals` (roster size), `guestsArrived`, `completedRuns`, `runsPerGuest`, `turnedAway`, `peakOnHill`, plus the lift waits below.

---

## Lifts & terrain

### Lift types (P0 / P1)

Each confirmed lift is a server: a FIFO queue of guest ids plus a dispatch accumulator. Every sim step adds `minutes × capacity/60` to the accumulator and, while it is at least 1 and the queue is not empty, the guest at the front boards (wait = now − time joined). An idle lift keeps at most one unit, so it never banks capacity. A ride ends after the ride time, then the guest skis. Guests who finish a run join the lift with the shortest expected wait (queue length ÷ capacity, ties to the higher capacity). Sim ticks longer than 0.5 game minutes are split into 0.5 minute steps so measured waits stay accurate.

| Type | Ride time | Capacity/hr (game-scaled) | Real-world nominal |
|------|-----------|---------------------------|--------------------|
| Surface (rope/T) | 4 min | 47 | 600 |
| Double chair (P1) | 3 min | 50 | 900 |

**Game-scaled:** days have 12–48 guests, so real capacities would never queue. PR 5 tuned 70 and 110 per hour against the old 06:00 burst. PR 6 retuned against the arrival curve and the persona table. Headless experiment, 20 seeds per cell, full day, Elena as founder, balanced fare, snow 0.55; surface only versus surface plus chair:

| Day | Guests | Surface only: avg / peak wait | Surface + chair: avg / peak wait | Runs per guest |
|-----|--------|-------------------------------|----------------------------------|----------------|
| Weekday | 18–22 | 1.1 / 5.1 min | 0.03 / 0.65 min | 5.9 |
| Saturday | 31–40 | 10.8 / 22.9 min | 0.16 / 1.65 min | 6.6 |

Sweep that led to 46 per hour (surface capacity, avg wait weekday / Saturday): 36 → 3.5 / 20.2, 40 → 2.4 / 15.6, 45 → 1.2 / 11.4, 48 → 0.8 / 9.5, 50 → 0.7 / 8.5. One capacity cannot put both days in a 1–3 and 5–10 minute band, because Saturday carries about 1.8× the guests and queues grow faster than linearly. 46 keeps the weekday near 1 minute and Saturday just over 10; the chair removes both. Saturday's wait is the day's peak pressure, which PR 8–9 and the lever work should lean on. The two tables above are the PR 6 measurements at 46 and 70 per hour; PR 10 retuned the capacities to 52 and 56, and PR 10b to 47 and 50 (see Balance).

Talent **Patrol Radio** adds 5% to every lift's capacity. The HUD queue reading is the expected wait at the busiest lift (queue length ÷ capacity per minute); the day average (`avgQueueMin`) is the measured mean wait of guests dispatched today, alongside `maxQueueLength` and `peakWaitMin`.

### Viability rule (build preview)

A lift placement is **valid** iff:

1. Load and unload stations on buildable tiles with slope ≤ max load grade.
2. From unload, path exists on trail graph with continuous downhill to base (no uphill segment > 5 m equivalent).
3. At least one run segment has `snow.depth ≥ minDepth` (0.15 m P0).

Invalid preview: red ghost; cannot confirm.

**Implemented (PR 12a):** rule 1 is a terrain test; rules 2 and 3 are not yet. A lift is a line `{bottom, top}`; `bottom` is absent on a lift stored without one and means `TERRAIN.base`. `checkLiftLine(line)` in `game/descent.ts` returns `{ok: true, length, vertical}` or `{ok: false, reason}`. Vertical and length are measured from the bottom. Reasons in check order:

| Code | Fails when |
|------|-----------|
| `max_lifts` | `MAX_LIFTS` (3, default lift included) are already open |
| `off_map` | a terminal is non-finite or outside the map bounds |
| `bottom_far` | the bottom is more than `BASE_AREA_RADIUS` (0.6) from `TERRAIN.base` |
| `too_steep` | grade at either terminal exceeds `MAX_LOAD_GRADE` (1.25) |
| `too_low` | vertical is under `MIN_LIFT_VERTICAL` (0.85) |
| `too_long` | length exceeds `MAX_LIFT_LENGTH` (3.4) |
| `too_close` | the top is under `MIN_TOP_SPACING` (0.8) from another top, or under `MIN_LINE_CLEARANCE` (0.4) from another lift's line, or another top is that close to the new line |
| `crosses` | the new line properly intersects another line outside the base area (bottoms may coincide) |
| `cash` | cash is below `liftCost` |

`checkPlacement(state, type, line)` in `game/rules.ts` runs all nine checks (the first six and `too_close`, `crosses` through `checkSpacing`). `placementReason(code, ctx)` holds the player-facing copy. `placeLift` rounds coordinates to 0.01, appends the lift with `builtDay`, `builtAtMin` and `paid`, deducts the cost and closes build mode; it acts only in the day phase and returns the state unchanged on any failed check. `undoLift` removes the last lift and refunds `paid`, only while `builtDay` is today and `builtAtMin` equals the clock (nothing has ticked) and never for the default lift. Lift identity is the array index, so `lifts` only grows within a season: undo pops the last entry, and any later closure sets `confirmed: false`. `setBuildMode(true)` pauses the day.

Thresholds are unchanged from PR 11 and calibrated on three reference tops (`REFERENCE_TOPS`: Ridge and Mid valid from the base, Creek fails `too_low`; Ridge and Mid are 2.04 apart, so both stay placeable together). The interim Build sheet offers those three tops; tapping the terrain arrives in PR 12b–c. The trail path test arrives with PR 13.

### Terrain (PR 11)

One heightfield serves the sim and the renderer (`game/terrain.ts`, pure TypeScript). A mountain is a `TerrainDef` (data, `game/mountains/dutchHill.ts`); `createTerrain(def)` returns a `Terrain` and `TERRAIN` is Dutch Hill. Height is analytic (no baked grid), so a query at any x, z is exact and deterministic.

| Member | Meaning |
|--------|---------|
| `bounds`, `base` | Map extent and the lift loading point; vertical is measured from `height(base)` |
| `height(x, z)` | Height in world units |
| `gradient`, `grade(x, z)` | Central difference (h = 0.01 * H); grade is world rise over world run, dimensionless |
| `gradeAlong(a, b, step)` | Signed downhill grade samples along a segment (positive going down) |
| `sustainedPitch(path, window = 0.6 * H)` | Largest mean downhill grade over any stretch at least `window` long, so one steep sample does not set it (PR 13 trail difficulty) |
| `feetPerUnit` | Vertical feet per world unit of height: `verticalFeet / (summit world height - base world height)` (Dutch Hill: 570 ft) |
| `horizontalFeetPerUnit` | Horizontal feet per world unit: `def.horizontalFeetPerUnit / H` (Dutch Hill def 420, so 70 at 6/3) |
| `scale`, `toWorld(p)`, `toDesign(p)` | See world scale below |

Dutch Hill's features are named in the data: base apron (flat village ground at z ≥ 2.1, height 0.1), meadow (gentle novice apron), face (fall-line control points with a monotone cubic and one steeper rollover band), summit and east shoulder domes, side ridges, bowl and noise. The characterization snapshot does not depend on terrain.

#### World scale (part 2a, no visible change)

A `TerrainDef` is written in design units. `createTerrain(def, scale = def.scale ?? {1, 1})` maps it to world units with `scale = { horizontal: H, vertical: V }`: world x, z = H * design, world height = V * design height, so world grade = (V / H) * design grade. Bounds and `base` scale by H. `toWorld` and `toDesign` convert points (x, z only). The central-difference step and the default `gradeAlong` step and `sustainedPitch` window scale by H, so they sample the same design points. `gradeAlong`, `grade` and `sustainedPitch` return world grades. Dutch Hill is 6× horizontal and 3× vertical in part 2b (save v8 migrates v7 lift anchors and bottoms by frozen H = 6); tests still build an explicit 1/1 terrain where needed.

`rulesFor(terrain)` (`game/descent.ts`) derives the placement limits from the scale. The named constants stay design values:

| Scales by | Limits |
|-----------|--------|
| H | `MAX_LIFT_LENGTH`, `BASE_AREA_RADIUS`, `MIN_TOP_SPACING`, `MIN_LINE_CLEARANCE` |
| V | `MIN_LIFT_VERTICAL` |
| V / H | `MAX_LOAD_GRADE` |

`checkLiftLine`, `checkSpacing` and `checkPlacement` use `rulesFor(terrain)`. `LIFT_COST_PARAMS` stays in design units: `liftCost(type, line, terrain)` divides world length by H and world vertical by V before pricing, then rounds to $50, so a chair at Mid costs $2,500 at any scale. `REFERENCE_TOPS` are world literals at Dutch Hill 6/3 (Ridge, Mid, Creek).

### Trail graph (P0)

Single cleared run from mid-mountain to base + optional stub. P1: second run + glade flag.

---

## Snow (PR 8)

Each confirmed lift has one trail of 6 segments from the top (index 0, elevation 1) to the bottom (index 5, elevation 0), stored as `lift.trail` (`game/snow.ts`). Each segment has `depth`, `quality` and `coverage` in 0–1. `snowQuality` and `snowDepth` in game state are derived: the means over every open segment (`deriveSnow`).

| Field | Meaning |
|-------|---------|
| `depth` | Keeps the run open; below 0.15 the cover breaks up |
| `quality` | Corduroy / fresh (high) to scraped / ice (low) |
| `coverage` | Fraction skiable; falls with depth under 0.15, restored by snow days, a High groom (fully) or a Mid groom (+0.3) where depth ≥ 0.15 |

**Overnight, per segment** (preset first, then the morning weather):

| Preset | Guns | Groom | Quality |
|--------|------|-------|---------|
| Minimal | off | none | −0.04 (floor 0.2); depth unchanged |
| Mid | owned guns add +0.14 depth on the bottom half (+0.25 reach with `trail_guns`); groomer +0.04 everywhere | yes | `max(q, 0.6) + 0.03` |
| High | owned guns (or `trail_guns`) add +0.20 on every segment; groomer +0.06 | yes | `max(q, 0.75) + 0.06` |

`groom_pass` / `corduroy` add +0.07 to the groom target. Quality caps at 0.95. Cost unchanged (+$0 / +$150 / +$350).

**Weather** (`e` = elevation, `low = (1 − e)²`): snow day depth +0.12 + 0.08e, quality +0.06 + 0.04e, coverage restored where depth ≥ 0.15. Thaw depth −(0.02 + 0.12·low), quality −(0.04 + 0.16·low): the bottom takes 0.14 / 0.20, the top 0.02 / 0.04. Clear: depth −0.01, quality −0.02.

**Day.** Each finished run takes 0.0006 quality off every segment of that lift's trail (a 150-run day costs about 0.09). On a thaw day from 11:00 the low segments lose a further 0.0007 × (0.15 + low) per game minute (about 0.2 at the bottom by close). The tick aggregates runs per lift per step; nothing is per guest per frame.

**Guests.** The snow a guest feels on a run is `0.5 × worst + 0.5 × mean` segment quality of that lift's trail, minus 0.10 if any segment has coverage < 0.3 (thin) and a further 0.15 if the bottom has coverage < 0.1 (bare; they still ski it). This value feeds `snowSum` (satisfaction) and the run time multiplier.

**Words.** The conditions board shows the worst segment ("Icy bottom", "Thin snow", "Bare bottom", "Good cover", "Fresh corduroy") beside the mean quality, and the snow problem line names where ("Bare patches at the bottom of the trail", "Icy up top").

**Render.** Terrain vertex colours near the trail use the segment values (grey-blue ice, bare earth where coverage is low, bright white where freshly groomed); the trail ribbon shows corduroy stripes only where quality is high, with patchy holes where coverage is low. Both repaint when the snow snapped to 0.05 changes, not per frame. Guns plume only on the segments inside last night's reach (`gunReach`).

Persistence: save version 5. A v4 save gets every lift a trail with all segments at the old global depth and quality.

---

## Economy (Dutch Hill P0)

| Item | Value |
|------|--------|
| Starting cash | $12,000 |
| Ticket fare presets | Cheap $35 / Balanced $48 / Expensive $62 |
| Daily fixed cost | $750 (power, staff stub; PR 10, was $400) |
| Lift ops / day | $180 per open lift |
| Lift build cost | `roundTo50(base + perLength × length + perVertical × vertical)`, per type (below) |

**Lift build cost (PR 12a).** Length is the horizontal distance bottom to top and vertical the height of the top above the bottom, both in world units (`liftLength`, `liftVertical`). Parameters live in `LIFT_COST_PARAMS` (`game/types.ts`):

| Type | base | perLength | perVertical | At Mid from the base (length 1.98, vertical 0.99) |
|------|------|-----------|-------------|------|
| Surface | $300 | $250 | $150 | $950 |
| Double chair | $1,000 | $500 | $500 | $2,500 (exact; asserted in a test) |

The default surface lift is pre-built and free. The cost is deducted when the lift is placed and refunded exactly by undo. The old flat $400 charge for a second lift of a type is gone. `LIFT_OPS_COST` still counts open lifts.

**Revenue/day:** `arrivals × fare × (0.5 + 0.7 × satisfaction/100)`, a multiplier of 0.5 at satisfaction 0 to 1.2 at 100 (PR 10; was 0.75 + 0.35 × s).

**Fail soft:** cash &lt; 0 → warning + loan offer $10k (interest stub P1).

---

## Night choices (ICR Simple mapping)

| Control | Options | Sim effect |
|---------|---------|------------|
| Fare | Cheap / Balanced / Expensive | Value term (fare vs `hillValue`) and arrivals elasticity; tiles show `~N skiers` |
| Snow & service | Minimal / Mid / High | overnight table above + fixed cost +$0 / +$150 / +$350; tiles show the predicted morning word and mean quality |

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

JSON blob in localStorage under the key `last-chair-v1`, written by zustand `persist` with `version: 7` (v2 lift queues, v3 guest day script, v4 satisfaction tallies, v5 trail snow segments, v6 `lastDay` and recap `facts`, v7 free lift placement: `selectedSlotIndex` is removed and a lift may carry `bottom`, `builtDay`, `builtAtMin` and `paid`; v7 keeps saved lifts unless they are missing, empty, hold a non-finite terminal or number more than `MAX_LIFTS`, which reset to the default lift; each older save migrates forward in `migrate()`). The key kept its name so earlier saves still load. The blob is `PersistedState` (`game/state.ts`): clock, phase, cash, presets, snow, guests, lifts, buildings, talents, beats, weather, reputation, `rngState`, plus `nightRecap` and `dayStats` so a reload during the night restores the night sheet exactly.

`migrate(persisted, fromVersion)` fills fields missing from older saves from a fresh state. An unversioned (v0) save has no `rngState`, `nightRecap` or `dayStats`; a v0 save made during the night has no recap to restore and loads as a day.

Cloud sync: P2; on `visibilitychange` hidden → write localStorage.

---

## Balance (PR 10)

`web/src/game/balance.ts` `runSeason(seed, strategy, founder = Elena)` plays a 14-day winter headlessly through the real rules: `pickFounder`, then each day optional builds, `skipToClose`, `acknowledgeBeat`, the two night presets, `sleep`. It returns end and minimum cash, end reputation, mean satisfaction, arrivals, runs, mean wait, problem days, a went-negative flag, beats, talents and a per-day record. Same seed and strategy give the same result.

Strategies: the nine fixed combinations {Cheap, Balanced, Expensive} × {Minimal, Mid, High} (no building); `adaptive` (reads the last recap: queue problem buys a chair if cash after it stays above $2,500, else Cheap; snow problem High; value problem fare one step down; a good day fare one step up; snow High only on a thaw morning, thin cover or a snow problem, else Mid); `builder` (chair on day 1–3 when it can afford it, then Balanced / Mid); `stingy` (never builds, Minimal, Expensive; plays the same winter as Expensive / Minimal). `npm run balance` prints the table over 40 seeds (`BALANCE_SEEDS=N`); `balance.test.ts` asserts the properties on 6 seeds in about 4 s.

**Properties** (all pass; `balance.test.ts`):

1. No fixed combination is best on both end cash (Expensive / Mid) and satisfaction (Cheap / High). Adaptive beats the median fixed combination on cash and satisfaction scaled 0–1 and averaged (0.95 against 0.43).
2. Stingy ends with lower reputation (34 against 53) and fewer arrivals (286 against 416) than Balanced / Mid. Cheap / High ends $4,350 below Balanced / Mid. Five fixed combinations end below the starting cash.
3. With the chair, weekend waits fall from about 16 to 1.6 minutes (Saturdays 1.25, Sundays about 2) and stay above one minute on the busiest days.
4. A passive Balanced / Mid winter ends at $14,200 from $12,000 (+18%); adaptive ends at $15,300 with 23 more satisfaction points.
5. The runs term is +5.0 on weekdays and +4.0 on weekends without a chair, back to +5.0 with one.

**Constants changed** (one lever each; the first column is the symptom):

| Constant | Before → after | Why |
|---|---|---|
| `DAILY_FIXED_COST` | 400 → 750 | A passive Balanced / Mid winter ended at $19,500 (+63%); Cheap / High printed $14,300 |
| `computeDayRevenue` multiplier | 0.75 + 0.35 s → 0.5 + 0.7 s | Satisfaction barely moved revenue, so a 12-minute Saturday line cost 16% and the chair never paid back (builder ended below passive) |
| `DEMAND.ELASTICITY` | 0.45 → 0.8 | Expensive lost only 8% of arrivals for 29% more fare, so it won on cash |
| `DEMAND.REF_RATIO` | 41/48 → 39/48 | Keeps Balanced at starting reputation at a multiplier of 1.0 after `REP_PER_POINT` moved |
| `VALUE.REP_PER_POINT` | 0.4 → 0.6 | Reputation climbs to 60–80 over the season; word of mouth should show in arrivals |
| `planArrivals` clamp | 12–40 → 12–48 | The high clamp hid reputation growth on weekends |
| Surface capacity per hour | 46 → 52 | Longer targets (below) raised lift load; weekday waits stayed near 1–2 minutes |
| Chair capacity per hour | 70 → 56 | At 70 the two lifts removed every queue (Saturday 0.16 min) |
| Regular: targets, energy per run | 6–10, 0.11 → 9–13, 0.075 | Every guest finished their target, so the runs term sat at +5 |
| First-Timer: targets, energy per run | 3–6, 0.18 → 4–8, 0.13 | Same, scaled with the Regular |

Not changed: satisfaction weights, snow numbers, snow night costs, lift ops cost, weekend multiplier, arrival base counts.

**PR 10b retune (arrival curve).** The new curve (see Arrivals) spreads guests earlier and thinner through the morning, which cut the Saturday wait with a chair to 0.5–0.7 minutes and broke property 3 (it needs waits above one minute). One lever moved, lift capacity scaled by about 0.9 for both lifts: surface 52 → 47 and chair 56 → 50 per hour. The chair stays faster than the surface. Capacity alone does not fix the chair-only wait, since guests join the shorter line and the chair carries them; lowering the surface alone (52 → 46) left the chair-day wait at 0.87. Other properties hold. 40 seeds, Elena, 14 days, after PR 10b:

| Strategy | End cash | Min cash | rep | sat | arrivals | wait | neg |
|---|---|---|---|---|---|---|---|
| Cheap / Minimal | 9,383 | 9,383 | 31.0 | 36.6 | 405 | 8.56 | 0 |
| Cheap / Mid | 11,271 | 10,924 | 56.4 | 60.0 | 452 | 11.26 | 0 |
| Cheap / High | 9,867 | 9,557 | 67.8 | 71.8 | 452 | 11.49 | 0 |
| Balanced / Minimal | 10,685 | 10,648 | 32.8 | 37.0 | 335 | 4.91 | 0 |
| Balanced / Mid | 14,236 | 11,832 | 53.8 | 57.7 | 416 | 9.61 | 0 |
| Balanced / High | 13,630 | 11,402 | 63.4 | 68.2 | 430 | 10.69 | 0 |
| Expensive / Minimal | 11,836 | 11,504 | 34.0 | 37.3 | 286 | 2.95 | 0 |
| Expensive / Mid | 16,091 | 11,939 | 55.2 | 58.6 | 356 | 6.01 | 0 |
| Expensive / High | 15,866 | 11,645 | 64.2 | 68.5 | 375 | 7.25 | 0 |
| Adaptive | 15,223 | 9,245 | 79.3 | 80.4 | 404 | 1.04 | 0 |
| Builder | 14,297 | 9,012 | 79.5 | 80.4 | 438 | 0.80 | 0 |
| Stingy | 11,836 | 11,504 | 34.0 | 37.3 | 286 | 2.95 | 0 |

Capacity before → after PR 10b: surface 52 → 47, chair 56 → 50. Saturday mean wait with a chair: builder 1.19 minutes, adaptive 0.81; without one, Balanced / Mid 17.3. The numbers quoted under Properties and in the PR 10 table above are the PR 10 results.

**Before and after, 40 seeds** (founder Elena, 14 days; `rep` end reputation, `sat` mean satisfaction, `wait` mean minutes per ride, `neg` seeds that went below $0):

| Strategy | End cash before → after | Min cash after | rep | sat | arrivals | wait | neg |
|---|---|---|---|---|---|---|---|
| Cheap / Minimal | 15,823 → 9,413 | 9,413 | 36.0 → 31.1 | 41.4 → 36.4 | 380 → 407 | 6.01 → 7.93 | 0 |
| Cheap / Mid | 16,397 → 11,249 | 10,908 | 64.4 → 56.1 | 67.9 → 59.9 | 419 → 452 | 7.28 → 9.99 | 0 |
| Cheap / High | 14,256 → 9,850 | 9,540 | 74.4 → 67.7 | 78.3 → 71.6 | 421 → 452 | 7.45 → 10.20 | 0 |
| Balanced / Minimal | 17,803 → 10,723 | 10,691 | 34.9 → 32.7 | 39.3 → 36.9 | 332 → 337 | 4.40 → 4.67 | 0 |
| Balanced / Mid | 19,501 → 14,201 | 11,838 | 61.5 → 53.1 | 65.0 → 57.2 | 382 → 416 | 6.17 → 8.61 | 0 |
| Balanced / High | 17,761 → 13,607 | 11,405 | 72.3 → 63.0 | 76.5 → 67.6 | 389 → 431 | 6.56 → 9.50 | 0 |
| Expensive / Minimal | 19,968 → 11,891 | 11,514 | 34.2 → 34.3 | 37.7 → 37.5 | 303 → 286 | 3.18 → 2.78 | 0 |
| Expensive / Mid | 22,422 → 15,995 | 11,951 | 59.1 → 55.0 | 61.9 → 58.1 | 353 → 356 | 5.09 → 5.57 | 0 |
| Expensive / High | 20,799 → 15,752 | 11,661 | 69.7 → 63.6 | 73.4 → 67.9 | 358 → 374 | 5.40 → 6.74 | 0 |
| Adaptive | 18,193 → 15,308 | 9,212 | 80.6 → 79.2 | 81.1 → 80.4 | 365 → 405 | 0.61 → 0.95 | 0 |
| Builder | 16,250 → 14,232 | 9,006 | 82.9 → 79.1 | 82.9 → 80.0 | 389 → 438 | 0.09 → 0.83 | 0 |
| Stingy | 19,968 → 11,891 | 11,514 | 34.2 → 34.3 | 37.7 → 37.5 | 303 → 286 | 3.18 → 2.78 | 0 |

Saturday mean wait, minutes, before → after: Balanced / Mid without a chair 10.6 → 15.3; builder with a chair 0.15 → 1.25; adaptive with a chair 0.12 → 0.87.

**Limitations.** The season is 14 days, so no fixed combination goes below $0: the worst, Cheap / Minimal, loses about $190 a day and ends near $9,400, which a 28-day season (state `seasonLength`) would deepen to about $6,800 without emptying the bank. "At risk of going negative" is tested as a combination ending more than 10% below the starting cash. Adaptive earns 8% more than passive Balanced / Mid and 4% less than Expensive / Mid; its edge is satisfaction and reputation, which the score weights equally with cash. Saturdays without a chair now average 15 minutes in line (Cheap fares 19), where the satisfaction queue term is capped at −35 points, so the line costs revenue through the 0.5 + 0.7 s multiplier more than through mood. Only Elena is run. Persona and snow numbers outside the table above are untouched and still uncalibrated against play.

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
