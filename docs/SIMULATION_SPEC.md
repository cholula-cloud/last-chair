# Last Chair — simulation spec (Dutch Hill v0)

**Version:** 0.4 · **Updated:** 2026-11-18

**Scope:** Numbers for the Dutch Hill core loop and Act I winter. Plan and gates: [MASTER_PLAN.md](./MASTER_PLAN.md).

## Implementation status (2026-11-18 audit)

✅ implemented as written · 🟡 partial or approximated · ❌ not implemented. Update this table in the same PR that changes the code.

| Section | Status | Gap | Fixed by PR |
|---|---|---|---|
| Time | 🟡 | Clock, pause, 07:30–16:00 day; hidden-tab pause not verified; season is 28 days; saved 14-day winters finish at 14; day is about 4 minutes at 1×, row L-F targets about 2 | 19, L-F |
| Guest day script | 🟡 | Arrival curve, walk-in, energy, laps, lift-close and departure, plus seat-limited venue stops, rentals, lessons and queue balks | 16d |
| Personas | 🟡 | 2 of 4 (First-Timer, Regular) drive energy, run time, target runs and the satisfaction weights (PR 7); Family Pack and Race Kid not modeled | P1 |
| Satisfaction formula | ✅ | Per guest from five terms, day score is the guest mean, recap stores the per-term breakdown and names the largest negative term (PR 7). The value term judges the fare against what the hill gave that guest in dollars (PR 9). Constants calibrated in PR 10 (see Balance) | — |
| Arrivals | ✅ | Count from `planArrivals`; spawn minutes from a two-part curve over 08:00–13:30 (PR 6, reshaped in PR 10b). Fare elasticity by persona mix against a reputation-based expected value (PR 9) | — |
| Lift types / capacity | ✅ | Types differ in capacity, line length, ride time and beginner appeal. Queues account for trail difficulty, closures and chair wind holds | 18 |
| Viability rule | 🟡 | Lift line (bottom to top) checked for bounds, base area, grade, drop, length, spacing and crossing (PR 12a); drag and snap placement checks include lift type and lodge tier | 12–13 |
| Trail graph | ✅ | `GameState.trails[]`, painted width and sustained pitch, guest choice by skill, ski time by length, and segment elevations from the path | — |
| Snow | ✅ | Six segments per trail; elevations, pipe-connected gun coverage, nightly grooming budgets and measured tree clearing influence snow | — |
| Economy | ✅ | Daily upkeep, construction installments, winter loan and bankruptcy. Verified over 40 seeds | 20 |
| Lodge tiers | ✅ | Fixed HQ, paid two-night upgrades, Tier 2 lifts and services, and attach-pad bonus. Tier 3 activities follow in M4b | L1, 16a–16d |
| Night choices | ✅ | Fare and snow/service choices use the forecast odds to estimate turnout and snow quality | 18 |
| Crew talents | ✅ | Twenty ordered talents change lift operations, attendance, guest experience, operating costs or snow service | 21 |
| Founder modifiers | ✅ | Each of the six founders has an operating advantage and a constraint | 22 |
| Story beat gates | ✅ | Nightly events use operating results. School and pass offers require replies, and the season settles in winter review | 23 |
| Save format | ✅ | Three slots (`last-chair-m3-slot-1` to `-3`) with an active-slot pointer, per-slot backup, validation and recovery, a throttled write cadence, and JSON export and import | 25, L-D |
| Balance harness | ✅ | `balance.ts` plays whole seasons through the real rules; `balance.test.ts` asserts the properties; `npm run balance` prints the 40-seed table (PR 10). Device re-sign pending | — |
| Randomness | ✅ | Weather draws use a separate seeded stream from daily guest draws | 18 |

---

## Time

| Constant | Value |
|----------|--------|
| Day start | 07:30 (first arrivals 08:00; moved from 06:00 in PR 6 to remove an empty two hours) |
| Day end (close) | 16:00 |
| Realtime 1× | 120 seconds from opening to close |
| Speed | 1×, 2× and 4× in the top bar. The selected speed carries into the next morning. New sessions use the speed in Settings (initially 1×). |
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
- **SkiRun:** duration from the persona table, scaled by snow quality (`× (1 + 0.3 × (1 − quality))`, so Mid snow at 0.55 is +13%). At the bottom the run is counted. Stamina cost is the persona's per-run cost multiplied by the trail length relative to Dutch Meadows, with a 0.5 minimum multiplier for short runs. The guest laps unless energy ≤ 0, runs reach their target, or `now + expected wait + ride + next run > 15:45`.
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

**Implemented (PR 12a):** rule 1 is a terrain test; rules 2 and 3 are not yet. A lift is a line `{bottom, top}`; `bottom` is absent on a lift stored without one and means `TERRAIN.base`. `checkLiftLine(line)` in `game/descent.ts` returns `{ok: true, length, vertical}` or `{ok: false, reason}`. Vertical and length are measured from the bottom. Reasons in check order (`off_lease` is the PR L-C lease rule; painted trails, base assets and snow guns refuse every point outside the lease with the same copy, "Outside the Dutch Hill lease. Build inside the dashed line."):

| Code | Fails when |
|------|-----------|
| `max_lifts` | `MAX_LIFTS` (3, default lift included) are already open |
| `off_map` | a terminal is non-finite or outside the map bounds |
| `off_lease` | a terminal, or any sampled point of the line, is outside the mountain's lease polygon (`game/lease.ts`, `onLease`) |
| `bottom_far` | the bottom is more than `BASE_AREA_RADIUS` (0.6) from `TERRAIN.base` |
| `too_steep` | grade at either terminal exceeds `MAX_LOAD_GRADE` (1.25) |
| `too_low` | vertical is under `MIN_LIFT_VERTICAL` (0.85) |
| `too_long` | length exceeds `MAX_LIFT_LENGTH` (3.4) |
| `too_close` | the top is under `MIN_TOP_SPACING` (0.8) from another top, or under `MIN_LINE_CLEARANCE` (0.4) from another lift's line, or another top is that close to the new line |
| `crosses` | the new line properly intersects another line outside the base area (bottoms may coincide) |
| `cash` | cash is below `liftCost` |

`checkPlacement(state, type, line)` in `game/rules.ts` runs all nine checks (the first six and `too_close`, `crosses` through `checkSpacing`). `placementReason(code, ctx)` holds the player-facing copy. `placeLift` rounds coordinates to 0.01, appends the lift with `builtDay`, `builtAtMin` and `paid`, deducts the cost and closes build mode; it acts only in the day phase and returns the state unchanged on any failed check. `undoLift` removes the last lift and refunds `paid`, only while `builtDay` is today and `builtAtMin` equals the clock (nothing has ticked) and never for the default lift. Lift identity is the array index, so `lifts` only grows within a season: undo pops the last entry, and any later closure sets `confirmed: false`. `setBuildMode(true)` pauses the day.

Thresholds are unchanged from PR 11 and calibrated on three reference tops (`REFERENCE_TOPS`: Ridge and Mid valid from the base, Creek fails `too_low`; Ridge and Mid are 2.04 apart, so both stay placeable together). Lift placement is two-tap on the terrain from the Build sheet (**Place on the hill**); tops snap to the nearest valid point within a screen-pixel radius. The trail path test arrives with PR 13.

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

Each open lift has up to three named runs (paths stored on `TrailRun`); guests pick by skill at unload; the Build sheet cuts new routes. Segment `elevations[]` are derived from terrain height along each path (normalised to the Ridge top). P1: glade flag and more choice rules (PR 14). **B2 (brush trails, spec):** a trail becomes a painted centreline with a width per point (`widths[]`, design feet). Width sets acres cleared (clearing cost per acre), grooming and snowmaking cost (scale with acres) and crowding (skiers per acre on a busy day). Difficulty stays sustained pitch along the centreline. Save version bumps when it lands.

---

## Snow (PR 8)

Each open `TrailRun` has six segments (`snow[]`) with `depth`, `quality` and `coverage` in 0–1, plus `elevations[]` (0 = base, 1 ≈ Ridge top) for weather and gun reach. `snowQuality` and `snowDepth` in game state are derived: the means over every open segment (`deriveSnow`).

| Field | Meaning |
|-------|---------|
| `depth` | Keeps the run open; below 0.15 the cover breaks up |
| `quality` | Corduroy / fresh (high) to scraped / ice (low) |
| `coverage` | Fraction skiable; falls with depth under 0.15, restored by snow days, a High groom (fully) or a Mid groom (+0.3) where depth ≥ 0.15 |

**Overnight, per segment** (preset first, then the morning weather):

| Preset | Guns | Groom | Quality |
|--------|------|-------|---------|
| Minimal | off | none | −0.04 (floor 0.2); depth unchanged |
| Mid | placed guns add +0.14 depth within reach; groomed segments gain +0.04 | yes | `max(q, 0.6) + 0.03` |
| High | placed guns add +0.20 depth within reach; groomed segments gain +0.06 | yes | `max(q, 0.75) + 0.06` |

`groom_pass` / `corduroy` add +0.07 to the groom target. Quality caps at 0.95. Cost unchanged (+$0 / +$150 / +$350).

**Weather** (`e` = elevation, `low = (1 − e)²`): snow day depth +0.12 + 0.08e, quality +0.06 + 0.04e, coverage restored where depth ≥ 0.15. Thaw depth −(0.02 + 0.12·low), quality −(0.04 + 0.16·low): the bottom takes 0.14 / 0.20, the top 0.02 / 0.04. Clear: depth −0.01, quality −0.02.

Storms add 0.22 + 0.10e depth and 0.10 quality. Storm roads reduce turnout, while snowfall usually brings more people. Typical days start with a base demand of 22 skiers on weekdays and 28 on weekends before weather, pricing, random variation and other adjustments.

The season stores one seeded weather outcome per day. Conditions influence the next day's odds, with fewer early thaws and more late thaws. Forecast odds weight all four conditions when estimating turnout and snow quality. On gusty days, chairs stop boarding from 10:30 AM to 1 PM. Riders already on the chair finish their ride, and guests in line can move to a running surface lift.

**Day.** Each finished run takes 0.0006 quality off every segment of that lift's trail (a 150-run day costs about 0.09). On a thaw day from 11:00 the low segments lose a further 0.0007 × (0.15 + low) per game minute (about 0.2 at the bottom by close). The tick aggregates runs per lift per step; nothing is per guest per frame.

**Guests.** The snow a guest feels on a run is `0.5 × worst + 0.5 × mean` segment quality of that lift's trail, minus 0.10 if any segment has coverage < 0.3 (thin) and a further 0.15 if the bottom has coverage < 0.1 (bare; they still ski it). This value feeds `snowSum` (satisfaction) and the run time multiplier.

**Words.** The conditions board shows the worst segment ("Icy bottom", "Thin snow", "Bare bottom", "Good cover", "Fresh corduroy") beside the mean quality, and the snow problem line names where ("Bare patches at the bottom of the trail", "Icy up top").

**Render.** Terrain vertex colours near the trail use the segment values (grey-blue ice, bare earth where coverage is low, bright white where freshly groomed); the trail ribbon shows corduroy stripes only where quality is high, with patchy holes where coverage is low. Both repaint when the snow snapped to 0.05 changes, not per frame. Guns plume only on the segments inside last night's reach (`gunReach`).

Persistence: save version 5. A v4 save gets every lift a trail with all segments at the old global depth and quality.

---

## Economy (Dutch Hill)

| Item | Value |
|------|--------|
| Starting cash | $12,000 |
| Ticket fare presets | Cheap $35 / Balanced $48 / Expensive $62 |
| Daily fixed cost | $1,095 plus the founder's fixed cost adjustment |
| Lift operations per day | $180 per operating lift, with a $180 minimum. Each operating chair adds $5. A lift operates when confirmed and serving an open trail |
| Upkeep per day | Lodge $60, café $40 each, shop $25 each, snow gun $60 each, rentals $20 each, ski school desk $25 each, warming hut $0 |
| Snow and service | Minimal $0 / Mid $150 / High $350 per night |
| Lift build cost | `roundTo50(base + perLength × length + perVertical × vertical)`, per type (below) |

**Lift build cost (PR 12a).** Length is the distance along the line in the horizontal plane. Vertical is the gain from bottom to top. The formula divides these measurements by the terrain's respective scale factors to recover design units. Parameters live in `LIFT_COST_PARAMS` (`game/types.ts`).

| Type | base | perLength | perVertical | At Mid from the base (length 1.98, vertical 0.99) |
|------|------|-----------|-------------|------|
| Surface | $300 | $250 | $150 | $950 |
| Double chair | $1,000 | $500 | $500 | $2,500 (exact; asserted in a test) |

**Construction payments.** Lifts, lodge upgrades, venues and snow guns take a 40% deposit at purchase, with 30% due that night and the rest due the next night. The first two payments round to the nearest dollar, and the last covers the remainder. A day-two café costs $480 up front and $360 on each of nights two and three. Buying requires cash for the deposit. Undoing a lift at its construction minute refunds the deposit and cancels both installments. Trail survey and clearing charges are paid when the trail is built.

**Daily settlement.** Ticket revenue is `round(arrivals × fare × (0.5 + 0.7 × satisfaction / 100))`. The recap adds actual venue receipts and subtracts fixed costs, the founder adjustment, lift operations and upkeep to get the rounded operating cash change. Projected morning cash adds that change to current cash and subtracts tonight's snow service and any construction installments due. The recap's cash breakdown also shows construction paid earlier in the day and any borrowing or repayment that night.

**Cash warnings and winter loan.** The cash badge warns below $1,500 and flags a negative balance. Before the final night, the bank offers one $10,000 loan per winter when projected morning cash is below zero. Taking it adds the principal to cash immediately. At each Sleep, the balance accrues simple interest on the remaining principal at `0.08 / seasonLength`. A loan taken on night one and carried through all 28 Sleeps has a $10,800 payoff. The recap offers full repayment on any night when the payment leaves at least $2,000 in projected morning cash. The rules also support partial repayments against principal under the same eligibility condition.

**Bankruptcy and the final night.** Three consecutive mornings below zero end the winter in the winter review. A morning at zero or above resets the count. The last Sleep posts the operating result, charges construction installments due that night and adds interest to any outstanding loan. It skips snow service and new loan offers. The winter review accounts for any later installments and remaining loan balance in liquid net worth. A bankrupt review lets the player start a new winter.

### Lodge tiers (rows L1 and 16a to 16d)

The lodge is a fixed HQ, present from day 1. Its tier is one number in state (`lodgeTier`, 1 to 3). A tier gates assets and changes the lodge's look; it adds no seats, no venue and no arrival cap. All values are placeholders until the balance harness tunes them.

| | Tier 1 | Tier 2 | Tier 3 |
|---|---|---|---|
| Upgrade cost | free | $3,500 | $9,000 |
| Car park stalls | 30 | 50 | 80 |
| Attach pads | 2 | 4 | 6 |

- **No arrival cap.** Tier does not change `planArrivals`. Car park stalls are visual, as today.
- **Upgrade timing.** The deposit starts construction. The old tier operates until the upgrade completes after two Sleeps.
- **Asset gates.** Each catalog row has `opensAtTier`: surface lift, trails, warming hut, café, shop at 1; double chair, snow guns, rentals, ski school desk, tubing, basic decor at 2; bar, restaurant, ice rink, events, premium decor at 3. Moving the double chair and guns to Tier 2 changes the season characterization snapshot and the balance harness (the chair on day 4 needs Tier 2); row 16b re-baselines both.
- **Attach bonus.** A venue on a lodge attach pad earns `ATTACH_BONUS = 0.05` extra on its revenue and its effect. Lifts, guns, activities and decor cannot attach.
- **Replaces** the old `lodge` building: its +$4 `venueValue` and +0.08 `arrivalMood` leave with it, and the $1,800 cost is removed. Row L1 sets the replacement values so Tier 1 matches today's season.

---

### M2 build and operations

- The build rules quote survey and preparation at $150 for a new painted trail. Clearing is $300 per acre of new 15-foot cells. Repainting charges only for newly cleared ground. Erasing a route leaves its clearing in place. The clear proportion within 90 ft of each snow segment raises thaw losses by up to 30%.
- The warming hut charges $2 per stop. Café, shop, rentals and lessons record receipts from actual visits. First-timers can visit rentals and lessons before their first lift. After tiring or facing a long queue, guests can stop in the café or hut if seats are available. Attach pads add 5% to the venue's effects and receipts.
- Snow guns cost $250 each in Tier 2. They extend pipe reach from the base or an existing gun. Mid and High groom 3,000 and 5,000 ft respectively, busiest trails first. The Groom Pass adds 20%. Actual segments drive groomed stripes and covered trails.

## Night choices (ICR Simple mapping)

| Control | Options | Sim effect |
|---------|---------|------------|
| Fare | Cheap / Balanced / Expensive | Value term (fare vs `hillValue`) and arrivals elasticity; tiles show `~N skiers` |
| Snow & service | Minimal / Mid / High | Costs $0 / $150 / $350 when there is a next morning. Tiles show expected morning conditions and mean snow quality |

Max **2** player choices Act I (+ optional story reply when beat ready).

---

## Crew talents

Each overnight settlement before the next playable morning teaches the first unowned talent in the order defined in `web/src/game/talents.ts`. The twenty talents name their crew member and explain their effect. Equipment-specific skills take effect when their equipment is available.

| Order | Talent | Crew | Effect |
|---|---|---|---|
| 1 | Rope Tow | Frank | Save $40 per operating surface lift. |
| 2 | Trail Guns | Frank | Snow guns reach 25% farther. |
| 3 | Groom Pass | Frank | Groom 20% farther and raise groom quality by 7 points. |
| 4 | Ticket Booth | Elena | One more guest on weekends and holidays. |
| 5 | Patrol Radio | Dana | All lifts load 5% faster. |
| 6 | School Day | Elena | Two more guests on weekdays. |
| 7 | House Band | Elena | Welcome mood rises 3 points Friday through Sunday and on holidays. |
| 8 | Café Shift | Elena | Café adds $2 to perceived value. |
| 9 | Wind Hold | Dana | Gusty chair holds run from 11:00 to 12:15. |
| 10 | Corduroy | Frank | Groom quality rises another 3 points. |
| 11 | Snow Fences | Frank | Bottom two segments lose 30% less depth in thaws. |
| 12 | Heritage Sign | Elena | Gain 2 reputation each Sunday. |
| 13 | Bull Wheel Tune | Frank | Chairs load 5% faster. |
| 14 | Ski School | Elena | First-timer welcome mood rises 5 points. |
| 15 | Early Plow | Frank | Three more guests reach the hill during storms. |
| 16 | Volunteer Patrol | Dana | Save $50 in daily fixed costs. |
| 17 | Night Lights | Frank | Lifts stay open ten extra minutes. |
| 18 | Groomer Rebuild | Frank | Mid service costs $120 and High costs $300. |
| 19 | First Aid Hut | Dana | Poor snow costs 15% fewer satisfaction points. |
| 20 | Route 100 Billboard | Elena | Expected hill value rises by $2. |

## Founder modifiers

| Founder | Bonus | Constraint |
|---|---|---|
| Elena Vargas | +0.08 arrival mood and two additional planned guests | Keeps the warming hut |
| Tom Keene | Winter loan rate of 7% | Loses three welcome points on a thaw day with at least three thaws in the last seven days |
| Riley Otis | Lift operations cost 15% less | Must decline the pass offer |
| Amira Chen | Two-day forecast | Expected snow quality rises by 0.05 |
| Juniper Hale | +0.5 before rounding the nightly reputation update when guests arrive | Lift and clearing quotes rise by 15% |
| Marco Russo | Venue revenue rises by 10% | Fixed operating costs rise by $80 per day |

## Story beat gates (Act I)

The first eligible outstanding beat appears at closing. A delayed beat can appear on a later eligible night.

| Beat | Gate and outcome |
|---|---|
| First uphill load | At least one open lift and five completed runs |
| Saturday | Saturday with at least 22 arrivals |
| School bus | Tier 2 lodge, installed ski school and a completed pupil lesson. Accept to book six pupils for the next eligible school day, or decline. |
| Dry week | Three or more days without snowfall and snow depth below 0.35 |
| Abominable Snowglomerate | Reputation of at least 55 from day 18 through the penultimate night. Acceptance pays $6,000 and limits fares. |
| Winter review | The final night settles the winter. Three consecutive mornings with negative cash trigger early review. |

---

## Save format (M3 v8)

Zustand saves `PersistedState` in an envelope `{ state, version, savedAt }`. `savedAt` is the epoch milliseconds of the write and is used only for the "last played" line on the Load list. Launching M3 clears the previous `last-chair-v1` save and its backup. An unreadable M3 save starts at founder selection and shows a recovery notice.

**Slots.** There are three slots under the keys `last-chair-m3-slot-1`, `last-chair-m3-slot-2` and `last-chair-m3-slot-3`. The key `last-chair-m3-active` holds `1`, `2` or `3` and names the slot the game reads and writes. A missing or invalid pointer means slot 1. On first load, a save under the old key `last-chair-m3` moves into slot 1 when slot 1 is empty: the writer copies it, removes the old key, moves `last-chair-m3-backup` to `last-chair-m3-slot-1-backup` and sets the pointer to 1. Each slot has its own backup under `<slot key>-backup`. A save that fails `migrate()` or `validateSave()` is copied verbatim to that slot's backup before the slot is replaced with a fresh winter and the recovery notice appears. Deleting a slot removes the slot key and its backup. Importing into a slot replaces the slot and removes its old backup.

**Write cadence.** The store keeps the latest state in memory and writes it to the active slot when any of these happens:

| Trigger | Write |
|---|---|
| Phase change (into night, into day, into setup and review) | Immediately |
| Any action except `tick` and camera or build-mode state (build, undo, close lift, sleep, founder, loan, season, pause, fare and snow choices) | Immediately |
| Tab hidden (`visibilitychange`) or page closing (`pagehide`) | Immediately |
| Leaving the hill from the Menu button | Immediately |
| `tick` during the day | At most once every 10 000 ms of wall time since the last write |

A failed write (storage full or denied) keeps the latest state in memory and retries at the next trigger.

**Export file.** `{ "app": "last-chair", "format": 1, "exportedAt": <ISO time>, "version": <save version>, "state": <PersistedState> }`, named like `last-chair-dutch-hill-day-12.json`. Import checks `app` and `format`, rejects a `version` newer than the game, then runs `state` through `migrate()` and `validateSave()`. A file that fails any check is rejected with a plain message and nothing is written. There is no checksum. Importing into an occupied slot asks first.

**Settings.** Radio, voice volume, captions, reduce motion and default speed live apart from the save under `last-chair-settings`. Turning radio off hides optional broadcasts and leaves contract replies available. Voice volume and captions are stored for future voice playback. Reduce motion sets `data-reduce-motion` on the page root. Default speed sets the day speed at the start of a winter.

Row 20 introduces M3 schema v5 with construction installments, loan and repayment records, the negative morning count and the winter outcome. The migration treats existing construction as fully paid and keeps an open recap's recorded operating cash change. A saved negative balance starts with one negative morning.

Schema v6 records the school contract and pass offer. Schema v7 adds dated operating and radio history and winter career records. Schema v8 records each new nightly settlement in the Office ledger. Earlier saves begin with an empty ledger, preserving the outcomes already known. Historical saves retain their recorded cash, season length and outcomes.

---

## Balance

### M3 operating balance

Run `npm run balance` from `web/` for the full 40-seed report. The harness starts with a surface lift, a trail and a warming hut so that it can compare operating policies. Opening construction is exercised separately in the browser playthrough. Coached uses Balanced and Mid for the first week, follows the recap thereafter and waits for a Saturday queue problem before buying a chair. Each founder plays the same Adaptive seeds.

The winter score gives equal weight to mean satisfaction and mean daily closing reputation over days with guests. Solvency uses closing cash less debt and unpaid construction. A cheap fare and generous service can produce a high guest score while consuming capital. The harness reports both outcomes and tests the solvency rule. The best mean strategy score must stay below 90. Using only final-day reputation gave Careless a six-seed mean score of 93.3. Scoring the same days for guest satisfaction and reputation gave 88.0.

For each strategy the report counts winters containing each of the three local events. It also counts school offers, bookings, declined visits, completed visit days, actual pupil arrivals and lessons. Vivian offers, acceptances and declines appear separately. Matched Adaptive runs answer both offers when eligible. Most runs decline, and the acceptance comparison takes both offers. A missing offer contributes to neither reply count.

The crew benefits raised mean six-seed Balanced/Mid closing cash to $16,541 and left Careless above zero in all six winters. The February vacation calendar now adds $425 per day to fixed operating costs on days 20–28. The recap itemizes staffing and shorter winters do not incur it. At $350, 6 of 40 Careless winters had projected shortfalls. At $425, 14 of 40 had shortfalls; each received a loan offer and 7 went bankrupt when the operator declined borrowing.

### Row 20 economy checks

`web/src/game/balance.ts` uses the regular build and Sleep rules to play a seeded winter with Elena by default. Strategy runs record cash, attendance, satisfaction, reputation, waits, runs and story progress, plus projected cash shortfalls, loans taken, bankruptcy and ending liquid net worth. It reports projected shortfalls even when borrowing covers the payment. Runs use 28 days by default and can also use 14 days to check legacy winters. `npm run balance` verifies the economy over 40 seeds by default and prints a strategy table. `balance.test.ts` checks the same thresholds on six seeds.

Fixed strategies use the nine fare and snow combinations. Builder upgrades the lodge, adds a chair when it can keep a $2,500 reserve in liquid net worth and uses Balanced fares and Mid snow service. Adaptive uses the last recap to adjust fares, prioritizes a chair when lift lines are the main problem and raises snow service on thin cover, a snow problem or a thaw forecast of at least 50%. Careless buys lodge upgrades, a café, a shop, a snow gun and a chair as deposits and lodge tiers allow. It runs Cheap fares and High snow service. The longer report also runs Careless with loan offers declined to verify the first projected shortfall came with an offer.

1. No strategy has a projected cash shortfall in a 14-day winter.
2. Careless has a projected cash shortfall within 28 days in at least two of six test seeds and at least a quarter of the report seeds.
3. The fixed fare and snow combinations, Adaptive and Builder finish the 28-day test winters without bankruptcy.

The original row 20 calibration passed all three checks. In 28 days, Careless had 10 projected shortfalls and received a loan offer before each first shortfall. All 10 offers were taken in the default runs. Five winters ended in bankruptcy when Careless declined borrowing.

| Strategy | Mean ending cash over 28 days |
|---|---:|
| Balanced / Mid | $13,564 |
| Adaptive | $30,925 |
| Builder | $15,093 |
| Careless | $5,335 |

The first-winter story pass made the Careless shortfall less frequent (7 of 40 seeds). Setting gun installation to $250 and daily upkeep to $60 moved more cost into the operating winter. The full 40-seed report passed. No strategy had a shortfall in the 14-day check. In 28 days, Careless had 10 projected shortfalls and 6 bankruptcies when borrowing was declined. Mean ending cash was $13,388 for Balanced/Mid, $30,467 for Adaptive, $14,974 for Builder and $5,070 for Careless. Placement review displays daily upkeep alongside the construction terms.

### Historical 14-day calibration (PR 10 and PR 10b)

These figures describe the earlier 14-day baseline. It compared nine fixed combinations of fare and snow service, Adaptive, Builder and Stingy. Stingy used the same settings as Expensive / Minimal.

**Historical properties**

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

**Historical 14-day limitations.** The season was 14 days, so no fixed combination goes below $0: the worst, Cheap / Minimal, loses about $190 a day and ends near $9,400, which a 28-day season (state `seasonLength`) would deepen to about $6,800 without emptying the bank. "At risk of going negative" is tested as a combination ending more than 10% below the starting cash. Adaptive earns 8% more than passive Balanced / Mid and 4% less than Expensive / Mid; its edge is satisfaction and reputation, which the score weights equally with cash. Saturdays without a chair now average 15 minutes in line (Cheap fares 19), where the satisfaction queue term is capped at −35 points, so the line costs revenue through the 0.5 + 0.7 s multiplier more than through mood. Only Elena is run. Persona and snow numbers outside the table above are untouched and still uncalibrated against play.

---

### M2 acceptance calibration

The 40-seed paired weekend check kept guest IDs and arrival counts equal within each comparison. The scenario upgrades to Tier 2 through the normal rules, replaces the original surface lift with a short practice tow, and builds a chair on the east shoulder. The new green uses a legal 3,122-foot painted route. The relocation comparison starts with that developed chair and green trail, then closes the chair and builds its replacement on a shorter line. A separate Tier 2 check confirms that rentals unlock and earn revenue.

| Weekend layout | Mean wait (minutes) | Mean satisfaction |
|---|---:|---:|
| East chair, before green trail | 2.645 | 83.342 |
| East chair, added green trail | 1.563 | 91.313 |
| Relocated chair | 2.783 | 82.439 |

Adding the green reduced mean wait by 1.08 minutes and raised satisfaction by 7.97 points. More distinct first-timers boarded the chair in all 40 seeds, confirmed at dispatch. The mean rose from zero to 19.52. Total chair rides also increased in all 40 seeds on this layout. Moving the developed chair changed mean wait by 1.22 minutes and satisfaction by 8.87 points, and changed completed run counts in 39 of 40 seeds. `npm run m2-gate` passed with distinct beginner boardings as the trail access criterion.

## Implementation map

```
web/src/game/types.ts      — entities
web/src/game/sim.ts        — tick day, overnight
web/src/game/store.ts      — zustand bridge to UI
web/src/render/MountainScene.tsx
web/src/ui/NightRecapSheet.tsx
```

Refs: [MASTER_PLAN.md](./MASTER_PLAN.md) (session flow, mobile rules).

### Dutch Hill calendar

New winters last 28 days, from Monday 26 January through Sunday 22 February. Presidents' Day is day 22; days 20–28 are February vacation. Holidays use weekend demand; vacation weekdays receive a 15% base demand increase and the weekend persona mix. Existing 14-day saves retain their length until the next winter.

Before row 20's economy changes, the 40-seed 28-day baseline after row 19 gave mean ending cash of $10,227 for Cheap / Minimal, $23,644 for Balanced / Mid, $41,860 for Adaptive, and $25,303 for Builder. Every modeled strategy stayed above zero.
