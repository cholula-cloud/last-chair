# Last Chair — ship-shape review

**Version:** 0.1 · **Updated:** 2026-11-16  
**Scope:** Full docs + `web/` codebase audit. Goal: make the product **copacetic** — purpose-aligned, usable, and visually readable — without scope creep.

**Verdict:** Design intent is clear and strong. Code is a working **P0 vertical slice** (~1.2k LOC) with procedural placeholders. Docs are ahead of the build. The gap is not “more features” — it is **make the existing loop honest, readable, and pretty enough that playtesters care.**

---

## Purpose (keep this north star)

> Cozy 3D browser ski-hill tycoon: reopen a lost New England mountain, watch tiny skiers, pick **two night choices** (fare + snow/service), sleep, repeat — on **iPhone Safari first**.

| Keep | Defer / cut for now |
|------|---------------------|
| Day → night → sleep loop | Full Director / Complex ops |
| Visible guests + follow | 70-talent tree UI |
| Fare + snow/service presets | Full P&L / three-statement Ledger |
| Dutch Hill identity | Career map, mountain 2, Sandbox |
| Mobile bottom sheets | Trail-draw parity, Hill Cup |
| Cozy diorama (toy mountain) | 110% VFX / golden hour polish |

The bible already says this. **Ship shape means obeying it.**

---

## What's confusing (docs + product)

### Docs overweight vs code

| Docs claim | Reality in `web/` |
|------------|-------------------|
| Story Mode + Sandbox | Neither — one “Preview build” loop |
| Founders, radio, talents, Ledger | Marketing copy only on home |
| Worker sim + Blender GLB pipeline | Absent |
| Heightfield + snow shader | Flat plane + HSL tint |
| Build on the mountain | Three numeric slot buttons |

**Confusion risk:** New contributors (or future-you) treat lore / 110% docs as sprint backlog.  
**Fix:** Keep those docs, but mark **active sprint** = FEEL_SCORECARD P0 sign-off → P1 winter only. Home page must not advertise unbuilt systems as if they ship in the preview.

### Code honesty gaps (loop feels fake)

These undermine the “see it, fix it” pillar:

1. **Follow does not follow** — ring on guest; camera barely moves.
2. **Lift move ≠ guest paths** — ride path hardcodes `x = -1.2`.
3. **Queue metric is invented** — `2 + queueCount * 0.12`, not wait time.
4. **Fare barely matters** — does not change arrivals; only a satisfaction term.
5. **Build UI shows coordinates** — `(-1.2, 0.2)` is not player language.
6. **Sleep arrivals bug** — randomized guest count, then `arrivals` forced to `22`.
7. **Hydrate night → day** — can skip unpaid night on reload.
8. **Dead fields** — `liftOpen`, `Guest.mood`, `resetDay`, `snowRef` unused.

Players will not articulate “why I changed fare” (P0 playtest gate) if fare does not visibly change tomorrow.

### Naming / messaging

- `MotionHero` = static text.
- Home feature cards promise books / talents / founders not in `/play`.
- Roadmap still says “worker sim”; none exists.
- Save key `last-chair-v0` vs spec `last-chair-save-v0`.
- Stock `web/README.md` and create-next-app SVGs still in tree.

---

## Art: not optional — readability is gameplay

Docs say Phase 1 placeholders are OK. **Playtest reality:** if the mountain does not look like a ski hill, guests/queues/snow are illegible and the fantasy dies.

### Current art state

| Element | Now | Problem |
|---------|-----|---------|
| Terrain | Flat plane + green box | No slope, no Dutch Hill silhouette |
| Lift | Grey stick + bar | Not a T-bar / rope; path ignoreable |
| Hut | Brown box | No roof language, no “lodge paperwork” warmth |
| Guests | Capsules, state colors | OK for debug; not “tiny skiers” |
| Forest | None | Loses NE cozy diorama identity |
| Trails | None | Descent validity is abstract UI only |
| Snow | Color shift only | Overnight snow choice has no mountain payoff |
| Assets folder | Next.js stock SVGs | No `public/assets/` game kit |

### Art that must ship for usable P0/P1 (functional, not pretty-for-pretty)

Priority order — **usable first**:

1. **Readable slope** — procedural heightfield or extruded wedge so lift-up / ski-down is obvious at a glance.
2. **Lift silhouette** — simple T-bar or rope tow mesh that **matches guest ride path**.
3. **Trail corridor** — green/red ribbon on snow when placing; ski path follows it after confirm.
4. **Lodge / hut** — pitched roof, warm window emissive, clear base zone.
5. **Tree scatter (instanced)** — NE conifers framing the bowl; clear corridor for trails.
6. **Guest silhouettes** — 2–4 low-poly bodies (not capsules); state still readable (jacket color or trail).
7. **Snow quality visible** — coverage / patchiness / groom stripes tied to overnight preset.
8. **Day/night lighting stub** — cooler ambient at night recap; warmer day key (cheap, big mood win).

**Defer:** volumetric snow, golden-hour juice, heritage plaques, queue heat shimmer — those are 110% ([IMPROVEMENTS_PASS.md](./IMPROVEMENTS_PASS.md)).

### Pipeline (practical)

Do **not** block P0 on full Blender village kit. Sequence:

```text
A. Procedural / hand-built R3F primitives that look intentional
B. Drop-in GLB for lift + hut when ready (<500 KB Draco)
C. Manifest under web/public/assets/ + ART_DIRECTION update
```

Palette stays: navy `#0b1628`, snow `#f4f7fb`, accent `#e85d26`, pine `#2d5a4a`.

---

## What should change (prioritized)

### Tier 0 — honesty + clarity (before more systems)

Make the slice say what it is and do what it claims.

| # | Change | Why |
|---|--------|-----|
| 0.1 | Home: “Preview — Dutch Hill day/night loop” only; drop talent/founder/ledger claims | Stop false marketing |
| 0.2 | Wire follow camera to followed guest world position | “See it” pillar |
| 0.3 | Guest ride/ski paths driven by `liftAnchor` + descent ribbon | Build choice matters |
| 0.4 | Fare → next-day arrivals (cheap more / expensive fewer) | Night choice consequential |
| 0.5 | Fix sleep `arrivals` reset-to-22 bug; align satisfaction with [SIMULATION_SPEC.md](./SIMULATION_SPEC.md) | Trust the numbers |
| 0.6 | Build slots: “Ridge / Mid / Creek” labels, not coordinates | Player language |
| 0.7 | Delete or use dead code (`liftOpen`, unused exports); fix save key | Reduce confusion |
| 0.8 | Sign off [PLAYTEST_P0.md](./PLAYTEST_P0.md) on iPhone Safari | Close the open P0 gate |

### Tier 1 — art that makes the loop legible

| # | Change | Why |
|---|--------|-----|
| 1.1 | Sloped terrain + clear base / top | Fantasy + readability |
| 1.2 | T-bar / rope mesh + trail ribbon | Build/descent teaches itself |
| 1.3 | Hut with roof + warm windows | Cozy NE identity |
| 1.4 | Instanced trees + trail clear-cut | Diorama feel without hero mesh |
| 1.5 | Snow quality visual after Sleep | Night snow preset payoff |
| 1.6 | Low-poly guest kit (or textured capsules with poles) | “Tiny skiers,” not debugger dots |

### Tier 2 — P1 winter (only after Tier 0–1 feel good)

Stay on [FEEL_SCORECARD.md](./FEEL_SCORECARD.md) P1 — do not invent a third roadmap:

- 14- or 28-day calendar + weather stubs  
- Warming hut → café/shop stubs in build sheet  
- Snow guns / groom **as visible outcomes**  
- Crew overnight talent order (list, no tree UI)  
- Founder pick + 6 Act I radio text beats  
- Winter review stub  

### Tier 3 — explicitly not now

- Sandbox mode, career map, caretaker, full Ledger  
- Worker-thread sim (premature; 22 guests on main thread is fine)  
- 110% narrative / VFX / Director ops  
- Expanding lore docs instead of closing playtest gates  

---

## Doc hygiene (keep plan copacetic)

| Action | Detail |
|--------|--------|
| **Active** | Bible, Feel scorecard, Platform, Sim spec, Roadmap A1–A2, Playtest P0, **this review** |
| **Reference** | ICR analysis, NE mountains/lore, characters, Act I, Story |
| **Parking lot** | Improvements pass, Improvement plan archive |
| **Update roadmap** | Strike “worker sim” until needed; mark art Tier 1 as A1.5 |
| **One sprint board** | Prefer Feel scorecard checkboxes over parallel backlogs |

---

## Recommended next sprint (concrete)

**Theme:** *Honest Dutch Hill preview — looks like a hill, choices matter.*

1. Terrain + lift + trail ribbon + hut + trees (R3F-first).  
2. Paths + follow + fare→arrivals + sleep stats fix.  
3. Home/copy honesty + build labels.  
4. iPhone Safari P0 playtest sign-off.  
5. Only then: calendar / weather / crew order for P1.

**Success check:** A stranger on phone can say: “I put the lift on the ridge, people skied down, queue got long, I cheapened tickets / bumped snow, and tomorrow looked different — and the mountain looked like a mountain.”

---

## File map (current truth)

| Path | Role |
|------|------|
| `docs/GAME_DESIGN_BIBLE.md` | Vision — still correct |
| `docs/FEEL_SCORECARD.md` | Ship gates — obey these |
| `docs/ART_DIRECTION.md` | Targets — Phase 1 under-delivered |
| `web/src/game/*` | Sim + store — thin but real |
| `web/src/render/MountainScene.tsx` | Entire 3D world — placeholder |
| `web/src/ui/*` | Play HUD + sheets — solid mobile skeleton |

Code weight ≈ **1.2k LOC**. Design weight ≈ **17 docs**. Rebalance by **implementing art + honesty**, not by writing more plans.
