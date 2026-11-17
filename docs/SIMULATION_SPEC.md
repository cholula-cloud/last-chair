# Last Chair — simulation spec (Dutch Hill v0)

**Version:** 0.2 · **Updated:** 2026-11-16  
**Scope:** Numbers for the Dutch Hill core loop and Act I winter. Plan and gates: [MASTER_PLAN.md](./MASTER_PLAN.md).

## Implementation status (2026-11-16 audit)

✅ implemented as written · 🟡 partial or approximated · ❌ not implemented. Update this table in the same PR that changes the code.

| Section | Status | Gap | Fixed by PR |
|---|---|---|---|
| Time | 🟡 | Clock, pause, 6–16h work; hidden-tab pause not verified; season is 14 days | 19 |
| Guest day script | ❌ | Random state machine; no arrival curve, energy or refuel | 6 |
| Personas | ❌ | Not modeled | 6, 9 |
| Satisfaction formula | 🟡 | Formula matches. The queue input is now the measured mean wait of guests dispatched so far today (PR 5); still one day-level number, not per guest | 7 |
| Arrivals | 🟡 | Weekend/fare/weather modifiers exist; no spawn curve | 6, 9 |
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
| Day start | 06:00 |
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
Arrive → QueueAtLift → RideLift → SkiRun → (loop SkiRun / Refuel) → Depart
```

- **Arrive:** spawn at parking / base by arrival curve.
- **QueueAtLift:** FIFO per lift; wait time affects satisfaction.
- **RideLift:** fixed ride duration by lift type.
- **SkiRun:** descend along trail graph; duration by difficulty + snow quality.
- **Refuel:** optional café if energy low and venue exists (P1).
- **Depart:** before 16:00 or energy exhausted.

### Personas (weights on satisfaction terms)

| Persona | Queue pain | Snow quality | Ticket value |
|---------|------------|--------------|----------------|
| First-Timer | 1.2 | 1.0 | 0.8 |
| Saturday Regular | 1.5 | 1.1 | 1.3 |
| Family Pack | 1.4 | 0.9 | 1.0 |
| Race Kid | 1.0 | 1.4 | 0.9 |

P0: pool **First-Timer + Saturday Regular** only.

### Satisfaction (session, 0–100)

Aggregate weighted terms (display as emoji tier on recap):

| Term | Source (v0) |
|------|-------------|
| `queue` | avg wait min × persona weight |
| `snow` | trail average quality 0–1 |
| `ticketValue` | fare preset vs persona expectation |
| `arrivalMood` | lodge tier + weather (stub 0.7 P0) |

**Formula (v0):**  
`satisfaction = clamp(70 - 8*queueMinutes + 25*snow - 15*ticketMismatch + 10*arrivalMood, 0, 100)`

`ticketMismatch` ∈ {0, 0.5, 1} for fare Cheap/Balanced/Expensive vs crowd mix.

### Arrivals (Dutch Hill P0)

- Base guests/day: **18–28** uniform by weekend flag (Sat/Sun +30%).
- Spawn spread: 08:00–14:00 bell curve.

---

## Lifts & terrain

### Lift types (P0 / P1)

Each confirmed lift is a server: a FIFO queue of guest ids plus a dispatch accumulator. Every sim step adds `minutes × capacity/60` to the accumulator and, while it is at least 1 and the queue is not empty, the guest at the front boards (wait = now − time joined). An idle lift keeps at most one unit, so it never banks capacity. A ride ends after the ride time, then the guest skis. Guests who finish a run join the lift with the shortest expected wait (queue length ÷ capacity, ties to the higher capacity). Sim ticks longer than 0.5 game minutes are split into 0.5 minute steps so measured waits stay accurate.

| Type | Ride time | Capacity/hr (game-scaled) | Real-world nominal |
|------|-----------|---------------------------|--------------------|
| Surface (rope/T) | 4 min | 70 | 600 |
| Double chair (P1) | 3 min | 110 | 900 |

**Game-scaled:** days have 12–40 guests, so real capacities would never queue. The numbers were tuned against today's guest behaviour (everyone arrives in one burst; PR 6 replaces it, then retune). Headless experiment, 20 seeds per cell, full day, surface only versus surface plus chair:

| Day | Guests | Surface only: avg / peak wait | Surface + chair: avg / peak wait |
|-----|--------|-------------------------------|----------------------------------|
| Weekday | 18–22 | 1.8 / 10.1 min | 0.1 / 1.2 min |
| Saturday | 31–40 | 5.5 / 23.1 min | 0.9 / 5.2 min |

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
