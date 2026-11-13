# Last Chair — 110% improvement plan

**Goal:** Same fantasy as Ice Coast Revival, but **clearer, richer, and more emotionally sticky** — without dumbing down the simulation.

---

## North-star pillars

| Pillar | ICR baseline | Last Chair “110%” |
|--------|--------------|-------------------|
| **Narrative** | Lost hills + founders + megapass outline | **Serialized season story**, town NPCs, radio/news feed, consequences that persist across mountains |
| **Design / UI** | Functional inspect panels, 3D diorama | **Design system** (typography, snow-glass panels, data viz), **one-glance ops dashboard**, accessibility |
| **Gameplay** | Deep but opaque levers | **Problem cards** at close (“Queue ↑ 40% — suggest second lift or express talent”), optional **Complexity layers** |
| **3D art** | Charming miniature | **HDR-ish lighting, volumetric snow**, Blender-authored landmarks; consistent scale readable on mobile |

Keep: **pause-first planning**, **follow guest**, **financial statements**, **talent identity across career**.

---

## A. Narrative upgrades (biggest differentiation)

### A1. Season story engine

- **3-act structure per mountain** (reopening → first profitable week → independence crisis).
- **Beat triggers** tied to sim metrics (e.g. first Saturday sellout, first injury cluster, megapass poaching event).
- **Mountain Radio** (already in ICR fantasy): dynamic segments reacting to yesterday’s recap + weather.

### A2. Cast

- **Founders** → expand to **full relationship map** (lender, school superintendent, patrol captain).
- **Guest personas** with names and multi-visit arcs (regulars, race kids, park rats) — visible in Guests tab.
- **Antagonist corp** (not ICR’s name): buyout pressure, trail lease fights, **moral choices** (sell vs cooperative).

### A3. Lost mountains

- Original peaks inspired by **public lost-area research**, each with a **one-page “heritage card”** in-game.
- Optional **archive mode**: compare your rebuild vs historical photos (illustrated, not copyrighted).

---

## B. UI / UX revamp

### B1. Information architecture

```
Home (mountain)     → 3D view + minimal HUD
Operations          → today’s levers (fare, snow, staffing)
Finance             → statements + cash runway forecast
Guests              → moods, personas, follow
Build               → lifts, terrain, village (contextual)
Career              → map, talents, founders, story log
```

**Mobile:** bottom nav + **swipe sheets**; no buried tabs mirroring desktop 1:1.

### B2. Visual language

- **Palette:** midnight blue, birch white, patrol orange accent, pine green secondary (high contrast for sun-on-snow readability).
- **Typography:** Display for mountain names; tabular nums for finance.
- **3D HUD:** frosted panels anchored to world (lift status orbs, queue heat along line).

### B3. Onboarding

- **First Chair** tutorial mountain (single lift loop) — named after our repo.
- Teach: complete trip → read recap → one overnight improvement.
- **Glossary** for finance terms (operating net vs cash).

### B4. Talents UX

- **Planner** like ICR’s site but **in-game**: prerequisites graph, facility badges (“needs gondola”).
- **Sets** show progress ring; hover explains **dormant** vs **active** effects.

---

## C. Gameplay upgrades

### C1. “Tomorrow cards” (closing ritual)

After each day, surface **3 ranked suggestions** from rule engine (queues, snow, empty venues). Player picks **one focus** for crew (+small bonus) — teaches without auto-playing.

### C2. Difficulty & modes

- **Simple / Standard / Director** (maps to ICR Simple / light Complex / full Complex).
- **Scenario mode:** 7-day challenges (ice storm, bus tour, race weekend).

### C3. Simulation depth (optional toggles)

- **Staff scheduling** (part-time vs peak weekend).
- **Energy / utilities** for snowmaking (ties to finance tutorial).
- **Parking & access road** (from newer ICR village features) — fee vs goodwill.

### C4. Social / async (phase 2)

- **Hill Cup**-style weekly snapshot (our own rules).
- **Ghost hills:** visit a friend’s export layout (read-only).

---

## D. 3D & art pipeline (Blender)

| Asset class | Tooling | Notes |
|-------------|---------|-------|
| Terrain mesh | Blender + heightmap sculpt | Export GLB; LOD in Three.js |
| Lifts / buildings | Blender modular kits | Shared material library |
| Trees | Instanced billboards + hero glades | Performance on mobile |
| Characters | Low-poly rigs, 3–4 body types | Pool + palette swap |
| VFX | GPU particles (snow, breath) | Shader-based fall |

**Art direction:** slightly **more cinematic lighting** than ICR; keep **toy-scale readability** (clear lift line, queue visible).

Workflow:

1. Concept → blockout in Blender.
2. GLB + Draco compress → `public/assets/`.
3. React Three Fiber scene graph; shared `MountainScene` component.

---

## E. What we intentionally defer (post-v1)

- Full 70-talent parity before core loop fun.
- Native store wrappers (TWA / Capacitor) after web polish.
- Multiplayer.

---

## F. Success metrics

- **D1 retention:** player completes day 3 with positive cash runway understanding.
- **Session:** avg 25–40 min (one in-game week).
- **NPS proxy:** “I understood why I lost money yesterday” survey in-game after day 7.

---

## G. One-line positioning

> **Last Chair** is the browser ski tycoon where **every guest has a story**, **every dollar has a receipt**, and **every lost hill deserves one more winter.**
