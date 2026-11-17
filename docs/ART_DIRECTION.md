# Last Chair — art direction

**Version:** 1.0 · **Updated:** 2026-11-16  
**Strategy:** Match ICR's cozy New England diorama feel with original assets. Readability is gameplay: each M1–M3 PR adds the visuals it needs; the dedicated art pass is M4 in [MASTER_PLAN.md](./MASTER_PLAN.md#6-roadmap); lighting and VFX juice is M7.

---

## Reference read (Ice Coast Revival)

What we are matching emotionally—not copying literally:

| Quality | Reference behavior | Our target |
|---------|-------------------|------------|
| Scale | **Toy mountain** in a bowl; readable lift line | Same legibility; slightly wider camera FOV on mobile |
| Forest | Dense New England conifers, white trunks | Original tree kit; instanced |
| Snow | Clean shader, groom stripes optional | Same; night subtle blue fill |
| Buildings | Chunky lodges, warm windows | Modular Blender kit; **our** silhouettes |
| Guests | Tiny colorful figures, readable on lift | Low-poly pool, 4 silhouettes |
| Mood | Cozy, serious-not-grim | Warmer UI accent (see below) |

**We do not** rip models, textures, fonts, or audio from ICR.

---

## Loop-feel pass — art deliverables (P0/P1)

**Status (2026-11-16):** Art pass 1 shipped (PR 4c): a procedural diorama of Dutch Hill in a forested valley, with soft sun and shadows, a groomed trail cut through dense snowy conifers, a T-bar with towers and cable, a red clapboard lodge and toy-scale skiers. See "Art pass 1" below. GLB kits (Phase 2) replace the procedural props later.

**Phase 1 (vertical slice) — still required:**

- Procedural heightfield + snow cap shader (no bespoke hero mesh yet).
- Placeholder lift: T-bar mesh (simple) **aligned to guest ride path**.
- Placeholder hut: box + roof + emissive windows.
- Guest: capsule or stock low-poly rig (prefer readable skier silhouette).
- Trail ribbon for descent validity; instanced tree scatter framing the bowl.

**Phase 2 (P1 look):**

- Blender **village kit v1:** warming hut, café, small shop.
- Blender **lift kit v1:** rope/surface, double chair.
- Tree scatter system + trail corridor clear visual.

**Phase 3:** Lodge tiers, night lights, chalet on slope.

Phase 2 and 3 map to M4 (PRs 27–32) in the master plan. The 110% lighting pass is M7.

---

## 110% pass — art upgrades (post-review)

- Volumetric-ish snowfall (shader, not heavy sim).
- Slightly **richer golden hour** key light vs flat midday default.
- Queue **heat shimmer** along lift line (subtle).
- Story billboard / heritage plaque at base.
- UI motion: night recap slide, satisfaction pulse (respect reduced motion).

---

## Art pass 1 (procedural diorama, PR 4c)

**Look:** a tabletop miniature of a small Vermont ski hill seen from an elevated 3/4 angle. The hill sits in a valley framed by hazy ridges. Trails and the lift line read as cleared white corridors through a dense, snow-capped conifer forest, following Ice Coast Revival's readability language with our own assets. Light is a warm late-morning sun with soft shadows and a cool blue-lavender sky fill, so shaded snow goes blue and lit snow goes warm white. Skiers are deliberately oversized and brightly dressed so they read on a phone.

### Extended palette

Anchors stay navy `#0b1628`, snow `#f4f7fb`, amber `#e85d26`, pine `#2d5a4a`. Scene colours live in `web/src/render/palette.ts`.

| Role | Hex |
|------|-----|
| Shaded snow (hollows) | `#bccbec` |
| Sun-warm snow | `#fff4e4` |
| Tired snow | `#c8cfd9` |
| Rock / bare earth | `#5d5650` / `#7a6850` |
| Pine variants | `#1f4a3d`, `#2d5a4a`, `#356b5e` |
| Barn red / clapboard / shutter | `#a8382b` / `#ece6da` / `#24313f` |
| Roof slate / stone | `#3a4250` / `#8b8682` |
| Window and lamp glow | `#ffc46b` / `#ffb35c` |
| Lift steel / cable | `#56616e` / `#2b3138` |
| Sky top / horizon haze | `#8fb6e3` / `#e9e7e6` |
| Ridges near / mid / far | `#7f93ad` / `#a3b2c8` / `#c3ccdb` |
| Night sky / horizon | `#081226` / `#24365a` |
| Jackets | `#d7263d`, `#f2c014`, `#0fa3a3`, `#f2711c`, `#7b4fc9`, `#2f7de1`, `#e8467c` |

### Components

| File | What it draws |
|------|---------------|
| `Atmosphere.tsx` | Gradient sky dome, three layered ridge silhouettes, fog, hemisphere fill and the shadow-casting sun (1024 shadow map, ±11 bounds). Lerps to a cool night when `phase === "night"` and warms toward 4 PM. Exposes `sceneMood` for window and lamp glow. |
| `Terrain.tsx` | Valley heightfield (dense grid in the play area, coarse toward the fog) with vertex colours: blue hollows, warm sun-facing slopes, rock on steep faces, bare earth that spreads from the bottom as `snowDepth` falls. Also the valley road. |
| `guestPaths.ts` | `terrainHeight` (base flat, steep lower face, summit dome, side ridges), lift tower layout, trail curve, tidy queue snake, guest placement and poses. |
| `TrailRibbon.tsx` | Terrain-hugging groomed corridor with a procedural corduroy texture (crisper when `groomVisible`); green/red translucent preview in build mode. |
| `Lift.tsx` | Merged towers, crossarms, bull wheels, up/return cables and two terminal huts; instanced moving T-bars or chairs; translucent green/red ghost for the build preview. |
| `Trees.tsx` | Three tiered conifer variants with a snow cap on every tier, instanced (up to 480 each), cleared along trails, lift lines, the base and the road. |
| `Lodge.tsx` | Base village: red clapboard lodge with steep snowy gable, stone chimney, deck and warm windows; café and shop when built; parked cars; lamp posts with additive light pools that glow at dusk and night. |
| `Guests.tsx` | Instanced toy skiers (legs, skis, poles, face, tinted jacket and beanie); T-bar or chair attached to riders; amber ring and marker for the followed guest. |
| `SnowGuns.tsx` | Tower guns with a yellow fan housing and an animated plume when running. |
| `geo.ts` | Helper that bakes coloured primitives into one merged geometry per prop. |

**Camera:** per-aspect default framing (portrait: wider FOV and farther back; landscape: tighter), elevated 3/4 view from the south-west so the lift and trail cross the screen. Orbit is limited in polar angle, azimuth, distance and pan so the camera stays above the valley; follow mode still lerps the target to the guest and eases home afterwards.

**Performance:** about 22 draw calls in the main pass and about 14 in the shadow pass (counted by mesh, not profiled on device): one merged mesh each for village and lift, three instanced tree meshes, four instanced guest meshes, instanced carriers and plume puffs. Sun is the only shadow caster light. No post-processing. Canvas uses `dpr={[1, 2]}` and Neutral tone mapping.

## UI language: lodge paperwork on a phone (UI pass 1, PR 4d)

The UI reads as paperwork from the lodge office laid on a dark table: cream paper slips, pine name plates, a lift-ticket day pass, a little transistor radio. Warmth comes from Ice Coast Revival's desk metaphor; the layout is our own and phone-native (bottom sheets, thumb zone, few large targets). We do not reuse ICR's layouts, labels or assets.

### Materials and colour

Tokens live in `web/src/app/globals.css` (`:root` and `@theme inline`).

| Token | Hex | Use |
|-------|-----|-----|
| `paper` / `paper-deep` | `#f4efe4` / `#e8dfcb` | Cards and sheets; unselected tiles. Fibre grain from an inline SVG noise filter, no image download |
| `ink` / `ink-soft` | `#1e2420` / `#545a50` | Text on paper (13.8:1 and 5.7:1) |
| `pine` / `pine-deep` | `#2d5a4a` / `#1f4236` | Section plates, ticket stub, good state, icons |
| `navy` | `#0b1628` | Page, scrim, radio body |
| `amber` | `#e85d26` | Accent: selected rings, callouts, focus ring |
| `amber-fill` | `#c94b18` | Fill for the one primary button per screen; deeper than `amber` so white labels pass 4.5:1 |
| `barn` | `#a8382b` | Warnings, bad state, negative cash |
| `ochre` | `#8a5a10` | Watch state |
| `kraft` | `#e3cf9f` | Price tags |

Paper casts a two-layer soft shadow, like a card on wood. A dashed "stitch" rule separates a sheet's pinned footer and the cells of the conditions board. State is never colour-only: every good/watch/bad colour is paired with a word (Short queue, Thin snow, Mixed mood).

### Type

- **Fraunces** (variable, via `next/font/google`, `--font-fraunces`) for headings, the numbers that matter (cash, clock, recap stats) and section plates. Plates use small capitals; numbers use tabular lining figures. The SOFT axis is raised for a rounder, friendlier cut; the italic with WONK on is the "pencil" hand for notes.
- **Geist Sans** for body copy, labels and buttons.

### Components (`web/src/ui/kit/`)

| Primitive | What it is |
|-----------|------------|
| `PaperSheet` | Bottom sheet: grab handle, serif title, scrolling body, optional pinned footer for the primary action. Optional scrim. Close by X, Escape, or a downward drag/flick on the handle. `wide` gives two columns on short landscape screens |
| `PlateHeading` | Section header: serif small caps on a pine plate with a hairline running out to an optional aside |
| `StatTile` | Large serif number over a small label, with a tone (good/watch/bad) and optional word |
| `ChoiceTiles` | Three ≥56 px segmented tiles (`aria-pressed`), amber ring and check badge when selected, optional price line |
| `PriceTag` | Kraft tag with a punched hole for costs |
| `PrimaryButton` | The amber action |
| `RadioCard` | Route 100 Radio beat: navy radio with speaker grille and a dial parked on 100, host Maris Shaw, message on a paper slip |
| `icons.tsx` | Line icons drawn on a 24 px grid (play, pause, build, guests, moon, home, queue, snow, mood face whose mouth follows the score, weather) |

**Day HUD** (`web/src/ui/Hud.tsx`): a lift-ticket strip at the top (pine stub with the labelled Resume/Pause button, perforation with notches, day and weekday, clock, cash); one dismissible morning note card with weather, headline and what the crew learned; a conditions board (queue, snow cover and depth, mood) at the bottom; and a thumb-zone action row (Home, Build, Guests, Close hill in amber). On the first morning the stub pulses and a small callout under it says "Tap Resume to open the hill", so nothing covers the lift. At ≥640 px wide the top and bottom groups each sit in one row.

**Sheets:** Build (lift cards with price tags, lift-top tiles with Valid run / No run, reason line under Place, village cards with "Need $X more" when unaffordable), Guests (list with Follow), Night recap (ledger slip: skiers, happy %, cash Δ as large serif numbers; the day's problem in pencil; radio card; fare and snow tiles; Sleep pinned at the bottom with its disabled hint), Founder pick (six staff badges with a coloured lanyard stripe and monogram), Winter review (stats and the career pin).

**Title screen** (`/`): inline-SVG dusk illustration of Dutch Hill, Fraunces wordmark, one-line pitch, Play, and an honest "In this build" card listing only shipped features.

### Motion

Easing tokens: `--ease-out` `cubic-bezier(0.23,1,0.32,1)`, `--ease-in-out` `cubic-bezier(0.77,0,0.175,1)`, `--ease-drawer` `cubic-bezier(0.32,0.72,0,1)`. No ease-in, no `transition: all`; only transform and opacity move.

- Sheets enter from `translateY(100%)` over 360 ms on the drawer curve and exit in 200 ms. They are CSS transitions driven by `data-state`, so they can be interrupted. Drag-to-dismiss uses pointer capture, closes past 110 px or above 0.11 px/ms, and damps upward pulls.
- Every pressable scales to 0.97 on press (160 ms ease-out).
- Things seen many times a night (fare/snow tiles, clock, cash, conditions) change colour in ≤120 ms and do not move.
- Rare moments get a small entrance (≤280 ms): the radio card, founder badges with a 40 ms stagger, the morning note, the first-day callout (scales from its arrow, from 0.95, never from 0).
- Hover styles exist only for `(hover: hover) and (pointer: fine)`.
- `prefers-reduced-motion`: movement is replaced by opacity fades; the pulse becomes a static ring.

### Accessibility

Contrast AA on paper and navy; every control has a visible label (icons are decorative); targets ≥44 px, night tiles ≥56 px; focus ring 3 px amber; safe-area insets on all edges; layouts checked at 390×844, 844×390 and 1180×820.

---

## Blender pipeline

1. Blockout in Blender (metric: 1 unit = 1 m).
2. Materials: limited palette; one roughness map per kit.
3. Export GLB, Draco compress &lt; 500 KB per building where possible.
4. `web/public/assets/...` + manifest JSON.

Characters: shared rig, texture swap for jackets.

---

## Audio direction (stub)

- **Story:** Route 100 Radio VO/text first; music bed second.
- **Sandbox:** same ambience, no story stingers.
- Reference vibe: acoustic + light electronic, not epic orchestra.

---

## Accessibility

- Color-blind safe satisfaction indicators (icon + color).
- Minimum 44px touch targets on night choices.
- Reduced motion disables camera follow swings.

---

## Current scene (implemented, Tier 1 diorama)

Procedural and hand-built R3F primitives; no GLB yet, no extra npm deps.

### Goal

Make Dutch Hill readable at a glance on phone: slope, lift line, trail, lodge, forest bowl, snow payoff after Sleep. Paths and follow camera are part of art ownership (they live in the scene).

---

### File layout

```
web/src/render/
  MountainScene.tsx     # lights, tick, OrbitControls, compose children
  Terrain.tsx           # sloped snow mesh + snowQuality material
  Lift.tsx              # T-bar / rope at liftAnchor
  TrailRibbon.tsx       # green/red build preview + confirmed ski corridor
  Lodge.tsx             # hut + pitched roof + warm windows
  Trees.tsx             # instanced conifers, trail corridor cleared
  Guests.tsx            # low-poly silhouettes; positions from liftAnchor
  guestPaths.ts         # pure helpers: queue/ride/ski world positions
```

No new npm deps. No GLB yet.

---

### Coordinates (world)

| Landmark | Approx | Notes |
|----------|--------|--------|
| Base / lodge | `(2.2, 0, 2.4)` | Keep near current hut |
| Default lift top | `liftAnchor` from store (default ~`-1.2, 0.2`) | Ride path uses this |
| Slope | Rise toward −Z / uphill | Visual: base lower Y, top higher Y |
| Trail corridor | Line from lift top → base | Ribbon + tree clear-cut |

#### `guestPaths.ts`

```ts
// Given liftAnchor, guest state, progress ∈ [0,1], index → {x,y,z}
queue: near lift bottom, slight offset by index
ride:  lerp(base → top) along lift line; y follows slope
ski:   lerp(top → base) along trail ribbon (slight lateral ease)
arrive/depart: near lodge / parking
```

**Hard rule:** no hardcoded ride `x = -1.2` — always `liftAnchor`.

---

### Components

#### Terrain
- `planeGeometry` with segments, vertex Y displaced into a gentle bowl/slope (or a rotated wedge + snow plane).
- Material color from `snowQuality`: higher → brighter/cleaner `#f4f7fb`; lower → dirtier grey-blue patches (lerp or second translucent layer).
- Optional subtle roughness bump via vertex noise (cheap).

#### Lift (T-bar)
- Two uprights (top + bottom), cable between them, simple T-bar cross at mid.
- Group positioned/rotated so cable follows lift top → base.
- Build mode invalid: warm red metal; valid: slate/steel.

#### TrailRibbon
- Thin plane or ribbon mesh along ski corridor.
- `buildMode`: opacity 0.55, green if descent valid else red (`checkDescentValid(liftAnchor)`).
- Confirmed: softer white/groom stripe always visible.

#### Lodge
- Box body + triangular roof (two planes or extruded).
- 1–2 emissive window quads (`#f97316` low intensity).
- Sits at base zone.

#### Trees
- InstancedMesh of simple cone+trunk (8–20 instances).
- Scatter around bowl; **reject** positions within ~0.6 of trail segment.
- Color pine `#2d5a4a`.

#### Guests
- Capsule body + tiny head sphere + two thin pole lines (or box skis).
- Colors by state (queue amber, ride blue, ski green) — keep current language.
- Followed: ring + slight scale; **OrbitControls `target` = guest position** (smooth lerp OK).

#### Lighting
- Background `#0b1628`.
- Ambient ~0.55, key directional from upper right.
- No volumetric snow / golden hour (110% later).

---

### Store reads (render only)

`guests`, `followId`, `snowQuality`, `liftAnchor`, `buildMode`, `liftConfirmed` — same as today. Keep `useFrame` → `tick`.

---

### Acceptance

1. At a glance: uphill vs downhill clear.  
2. Move lift in Build → guests ride the new line.  
3. Follow guest → camera target tracks them.  
4. Sleep with high snow → mountain reads cleaner than minimal.  
5. `cd web && npm run build` green.

---

#### Out of scope (handled elsewhere)

Sim and UI changes live in `game/` and `ui/`. GLB pipeline, audio and story are M3–M4.
