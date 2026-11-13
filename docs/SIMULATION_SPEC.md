# Last Chair — simulation spec (Dutch Hill v0)

**Version:** 0.1 · **Updated:** 2026-11-13  
**Scope:** P0/P1 **feel** on mobile — not full ICR parity. Tune against [FEEL_SCORECARD.md](./FEEL_SCORECARD.md).

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

| Type | Ride time | Capacity/hr (nominal) |
|------|-----------|------------------------|
| Surface (rope/T) | 4 min | 600 |
| Double chair (P1) | 3 min | 900 |

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

Overnight picks **first unowned** talent in crew order (see future `TALENTS_AND_CREW_ORDER.md`). P0 implements **3 placeholders:**

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

## Save format (v0)

JSON blob, localStorage key `last-chair-save-v0`:

- `dayIndex`, `cash`, `farePreset`, `snowPreset`
- lift placements, guest seed
- `talents[]`, `founderId`, `storyFlags`

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

Refs: [GAMEPLAY_AND_FLOW.md](./GAMEPLAY_AND_FLOW.md), [PLATFORM_MOBILE.md](./PLATFORM_MOBILE.md).
