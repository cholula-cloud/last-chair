# Snow service revision plan

**Status:** Approved direction from design conversation (2026-11-21).  
**Authority:** Design and build order for snow guns + grooming. Numbers land in [SIMULATION_SPEC.md](../SIMULATION_SPEC.md) as each phase ships. When this doc and the spec disagree after a phase merges, the spec wins.

**Parent roadmap:** [MASTER_PLAN.md](../MASTER_PLAN.md) rows **SM1–SM4** (queued after M4).

---

## 1. Problem

Players read **Snow & service** (Minimal / Mid / High) as one knob. Guns and grooming both touch **depth** in the overnight math, so the hill does not teach:

- **Guns** = hold snow on the hill (depth → coverage; fight thin and bare, especially on **thaw**).
- **Grooming** = fix how it skis (quality and coverage on the chunks the cat reaches).

Build UX is tight (pipe chain, cap 10, no reach rings while placing). The sim does not reward guns on **thaw** nights or punish **wind** on exposed guns. Radio copy mentions cold air; weather does not change gun output.

---

## 2. Player-facing target

| Tool | Job | Skier pain it fixes |
|------|-----|---------------------|
| **Snow guns** | Add **volume** and **hold base** on covered segments | Bare bottom, thin cover, “is the trail still open?” |
| **Grooming** | Add **smooth surface** (quality) and patch **coverage** where depth allows | Icy/scraped feel, “why does it ski bad?” |

**Thaw nights:** Paying Mid/High should read as “guns held the base, groom fixed the ride” — not “everyone got +depth.”

**One control for now:** Keep a single nightly **Minimal / Mid / High** choice. Split tiles later only if playtests need it.

---

## 3. Principles

1. **Different levers:** Guns mainly change `depth` and `coverage`; grooming mainly changes `quality` and `coverage`, with a small depth nudge only.
2. **Weather-aware guns:** Guns are **strongest when thaw** (or warm overnight) erodes the hill; weaker bonus on natural **snow/storm** nights (avoid double-dip).
3. **Wind uses existing data:** `trailExposure` from clearing (B5) shrinks gun **reach** or skips exposed segments on **gusty** nights.
4. **Honest forecast:** Night sheet and map **Tomorrow** scrub show **gun segments** vs **groomed segments** separately.
5. **Balance harness:** Re-baseline characterization snapshot after SM2; tune constants in spec, not in scattered magic numbers.

---

## 4. Phased work

### SM1 — Explain and preview (no sim change)

**Goal:** Players see guns and grooming as two tools before we change formulas.

| Area | Work |
|------|------|
| Night sheet | Each snow tile: “Guns on **N** segments · Cat **M** ft” (from existing `gunCoverage` + `groomCoverage` on close state). On thaw-heavy outlook, one line: “Thaw tomorrow — guns matter on thin trails.” |
| Coach / problem guide | When demand is snow + forecast thaw: point at **Snow-making** layer + **High/Mid** tile, not generic “bump snow service.” |
| Map layer **Guns** | During placement draft: overlay **pipe reach** (chain) and **snow radius** at cursor (reuse `gunRadius`, `PIPE_REACH_DESIGN` like lift reach arc). |
| Copy | Align `dry_week` / coach with SM2 behavior or add “(full effect lands in an update)” only if SM1 ships alone — prefer shipping SM1+SM2 back-to-back. |

**Files (likely):** `NightRecapSheet.tsx`, `coach.ts`, `problemGuide.ts`, `PlacementBar.tsx`, new small helper in `render/buildGridModel.ts` or `render/GunPlacementGuide.tsx`, `mapLayers.ts` readout already close.

**Tests:** Night preview pure tests unchanged; optional snapshot on new recap strings.

**Acceptance:** A new player placing a gun sees **where** it will reach; night UI states **guns vs groom** counts before Sleep.

---

### SM2 — Sim: thaw guns, wind reach, man-made quality cap

**Goal:** Overnight math matches the table in §2.

**2a. Guns on thaw**

In `overnightTrail` (`snow.ts`), after preset + gun depth, when `weather === "thaw"`:

- On **gun-covered** segments: apply a **thaw shield** (reduce depth/quality loss by X%, or add extra depth before thaw step — pick one formulation in spec).
- On **snow/storm** nights: apply a **gun diminishing return** (e.g. 50% gun depth add) so storms are not “guns + huge natural snow.”

Tune X in `SIMULATION_SPEC.md`; add unit tests in `snow.test.ts` or extend `rules.test.ts` `previewOvernight` thaw matrix.

**2b. Wind**

In `applyOvernight` / `gunCoverage` (`guns.ts`):

- Input: `weatherTomorrow.wind === "gusty"`.
- Multiply effective gun radius by `(1 - k * exposure[segment])` or zero out top-exposure segments above threshold.

Reuse `exposureFor(state)` already passed into `nightFor`.

**2c. Man-made surface (light)**

On segments that received **only** gun depth this night (no groom on that segment):

- Cap **quality** gain from depth alone; optional small **quality** penalty until groomed (“man-made chop”) — small enough not to punish first-time gun buyers.

**2d. Legacy cleanup**

- `hasPlacedGuns`: only `state.guns.length > 0`; remove `buildings.includes("snow_guns")` fallback in `sim.ts`.
- Remove stale `BUILDING_COSTS.snow_guns` if nothing reads it.

**Files:** `snow.ts`, `guns.ts`, `sim.ts`, `rules.ts` (`nightFor`), `SIMULATION_SPEC.md`, `guns.test.ts`, `sim.test.ts`, `balance.test.ts` snapshot.

**Acceptance:**

- Thaw morning after Mid + guns on thin trail: **less bare bottom** than same setup without guns (measured in harness).
- Gusty night: fewer gun-covered segments on exposed trails vs calm night with same layout.
- Snow night: gun depth add **less** than clear/thaw night (diminishing return).

---

### SM3 — Build: less restrictive, still legible

**Goal:** Layout mistakes cost money, not confusion.

| Change | Default proposal | Notes |
|--------|------------------|-------|
| `MAX_GUNS` | Scale with open trail length or lease area (floor 10, cap ~18 on Dutch Hill) | Formula in spec |
| `PIPE_REACH_DESIGN` | Slightly longer first hop from base OR allow **one** mid-line “header” gun every N chain links (talent or lodge tier 2) | Playtest A/B |
| Placement | Show invalid reason on ring (pipe / lease / max) | `checkGunPlacement` copy exists |
| Reposition | **Out of scope** for SM3 unless owner wants it — doc as SM3b | Spec today: permanent |

**Files:** `guns.ts`, `rules.ts`, `BuildSheet.tsx`, tests in `guns.test.ts`, `lease.test.ts`.

**Acceptance:** Reach summit-line trails with **fewer** towers than today without breaking balance (harness Careless/Adaptive still solvent on default seeds).

---

### SM4 — Feel: visible payoff

**Goal:** ICR complaint — “guns and grooming have little visible effect” — addressed on device.

| Area | Work |
|------|------|
| `MOUNTAIN_TRAIL_CONDITIONING` | Turn on or partial: groom stripes on `groomed` segments; distinct tint for `gunCovered` vs groomed-only |
| Morning | Plumes on segments that fired, not only tower particles (optional tie to `gunCovered`) |
| Recap | One line when guns saved thaw: “Night crew held snow on {trail} where it thawed.” |
| DH8 groomer down | STORY beat: guns still run; groom miles zero — already in STORY.md; wire `groomerDown` flag in SM2 if not present |

**Files:** `snowMaterial.ts`, `TrailRibbon.tsx`, `SnowGuns.tsx`, `why.ts` or night recap facts, `STORY.md` cross-check.

**Acceptance:** Owner P1 script item: after thaw + High, player can **see** which trail segments were gun-hit vs groomed without opening map layer.

---

## 5. Dependency order

```text
SM1 (UX preview) ──┬──> SM2 (sim) ──> re-baseline balance ──> SM4 (render)
                   │
SM3 (placement) ───┘   (can parallel SM1; merge before SM2 if pipe reach affects coverage tests)
```

**Suggested PRs:** One PR per row, or **SM1+SM2** in one PR if snapshot churn is acceptable.

---

## 6. Testing checklist

- [ ] `guns.test.ts` — wind reach, scaled max guns
- [ ] `snow.ts` / `rules.test.ts` — thaw shield matrix (minimal/mid/high × weather kinds)
- [ ] `sim.test.ts` — `hasPlacedGuns` only from `guns[]`
- [ ] `balance.test.ts` + characterization snapshot — owner sign-off on delta
- [ ] `mapLayers.test.ts` — tomorrow scrub gun vs groom labels
- [ ] `phone-check` / coach strings if night sheet layout shifts
- [ ] Save version bump **only** if new persisted fields (e.g. `groomerDown`); SM2 math alone may need no bump

---

## 7. Copy and voice (C1)

- Night tiles name **two numbers**: gun segments, groom feet.
- Avoid “cold air” as the **only** gun line; thaw + wind are the actionable forecasts.
- Problem guide: `snow` demand + thaw outlook → Snow-making layer + Mid/High.

---

## 8. Explicitly later

- Split night UI into **Groom** vs **Snowmaking** with separate costs.
- Per-trail “run guns here only.”
- Hydraulics graph (pressure by pipe distance).
- Gun reposition / sell-back.
- Trail **width** scaling snow demand (SIMULATION_SPEC B2 brush width).

---

## 9. Open tuning (fill in SM2 PR)

| Constant | Role | Starting idea |
|----------|------|----------------|
| Thaw shield on gun segments | Less depth/quality loss | 40–60% of thaw loss absorbed |
| Gun depth multiplier on snow/storm | Diminishing return | 0.5× gun add |
| Gusty reach factor | Wind | 0.7× radius at max exposure |
| Man-made quality cap | Until groomed | quality ≤ 0.55 on gun-only segments |

Calibrate against `ADAPTIVE` and `CARELESS` strategies and one thaw-heavy seed list in `balance.test.ts`.

---

## 10. Handoff snippet for implementers

Read first:

- `web/src/game/guns.ts` — placement, coverage, groom budget
- `web/src/game/snow.ts` — `overnightTrail`, weather block
- `web/src/game/rules.ts` — `nightFor`, `previewOvernight`
- `web/src/game/mapLayers.ts` — Tomorrow scrub, gun layer readouts

Then implement phases **SM1 → SM2 → SM3 → SM4** in order unless the owner narrows scope.