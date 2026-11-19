# Last Chair — art direction

**Version:** 1.2 · **Updated:** 2026-11-19  
**Strategy:** Match ICR's cozy New England diorama feel with original assets. Readability is gameplay: each M1–M3 PR adds the visuals it needs. **M4** (code) covers snow shader, lighting, licensed audio, UI juice, and build-overlay polish — see [MASTER_PLAN.md](./MASTER_PLAN.md#m4-polish-and-feel-code-only). **M4b** is the Blender-only asset pass (guest silhouettes, lodge/lift kit, styles, activities). Extra lighting and VFX juice beyond M4 row 31 lives in M7.

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

Phase 2 and 3 (village/lift kit, lodge tiers, extra silhouettes) map to **M4b** (rows 28–29, S, A). Snow shader and day/night rig map to **M4** rows 30–31. The 110% lighting pass is M7.

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
| `game/terrain.ts` | The heightfield (`TERRAIN.height`) read by the sim and the renderer; Dutch Hill is data in `game/mountains/dutchHill.ts` (flat base apron, meadow, steep face with a rollover, summit dome, side ridges). Render helpers `liftLine.ts`, `trail.ts` and `guestPlacement.ts` hold the lift tower layout, trail curve, tidy queue snake, guest placement and poses. |
| `TrailRibbon.tsx` | Terrain-hugging groomed corridor with a procedural corduroy texture (crisper when `groomVisible`); green/red translucent preview in build mode. |
| `TrailSign.tsx` | **Placeholder (M3):** canvas texture on a billboard plane + box post at each trail entrance; stacks near lift tops. **Target (M4b row T1):** Blender `trail-sign-*` kit; names and conditions also on the **Trails** map layer (M4 row O5). |
| `Lift.tsx` | Merged towers, crossarms, bull wheels, up/return cables and two terminal huts; instanced moving T-bars or chairs; translucent green/red ghost for the build preview. |
| `Trees.tsx` | Three tiered conifer variants with a snow cap on every tier, instanced (up to 480 each), cleared along trails, lift lines, the base and the road. |
| `Lodge.tsx` | Base village: red clapboard lodge with steep snowy gable, stone chimney, deck and warm windows; café and shop when built; parked cars; lamp posts with additive light pools that glow at dusk and night. |
| `Guests.tsx` | Instanced toy skiers (legs, skis, poles, face, tinted jacket and beanie); T-bar or chair attached to riders; amber ring and marker for the followed guest. |
| `SnowGuns.tsx` | Tower guns with a yellow fan housing and an animated plume when running. |
| `geo.ts` | Helper that bakes coloured primitives into one merged geometry per prop. |

**Camera:** per-aspect default framing (portrait: wider FOV and farther back; landscape: tighter), elevated 3/4 view from the south-west so the lift and trail cross the screen. Orbit is limited in polar angle, azimuth, distance and pan so the camera stays above the valley; follow mode still lerps the target to the guest and eases home afterwards.

**Performance:** about 22 draw calls in the main pass and about 14 in the shadow pass (counted by mesh, not profiled on device): one merged mesh each for village and lift, three instanced tree meshes, four instanced guest meshes, instanced carriers and plume puffs. Sun is the only shadow caster light. No post-processing. Canvas uses `dpr={[1, 2]}` and Neutral tone mapping.

## UI language: toy box with Route 100 signs (UI pass 2, PR 10c)

Replaces UI pass 1 (lodge paperwork: cream paper, Fraunces serif, amber). The UI now matches the toy-scale diorama: chunky white panels with thick navy outlines that press down like toy keys, on a sky-blue ground. Meaning comes from US road-sign colours, borrowed from Route 100, the road Dutch Hill sits on. Each sign colour has one job and is never decorative.

Exploration of six directions (Trail Map, Lift Ticket, Night Groomer, Après '85, Route 100, Toy Box) and the chosen combination lives on a private design canvas; this section is the authority.

### Colour

Tokens live in `web/src/app/globals.css` (`:root` and `@theme inline`).

| Token | Hex | One job |
|-------|-----|---------|
| `ink` | `#1B3A57` | Outlines, hard shadows, primary text |
| `ink-soft` | `#4B6580` | Secondary text |
| `sky` | `#9AD7F5` | Ground behind panels and on the title screen |
| `snow` / `snow-2` | `#FFFFFF` / `#E3F2FA` | Panels / inset wells and title-screen hills |
| `sign-green` | `#0B6B3A` | Guide sign: results and summaries, the play key, the selected option, gains |
| `sign-yellow` / `sign-yellow-soft` | `#F6C700` / `#FFF6CC` | Warning diamond: Route 100 Radio, alerts / the radio message bubble |
| `sign-brown` | `#7A4524` | Recreation sign: only the action that ends the day (Sleep until morning) |
| `gold` | `#FFC93C` | Cash only |
| `barn` | `#E0483E` | Problems, losses, Close hill |

### Shape

- Every panel, chip and button has a 3 px `ink` border and a hard offset shadow (`0 Npx 0 ink`, no blur). No gradients, no soft grey shadows, no translucency.
- Radius follows hierarchy: sheet top 28 px, panel 20, button and option 16, chip 12.
- Sign surfaces (green, brown, yellow panels) use highway-sign framing: coloured fill, 4–5 px padding, then an inner 2 px white border (ink on yellow).
- Radio: a yellow diamond with broadcast waves beside a speech bubble whose corner nearest the diamond is tight.
- Options are raised white keys. The selected one turns sign green and sits pressed down, with `aria-pressed`.

### Day is mountainous, night is cozy

- **Day surfaces** (HUD, Build, Guests, title screen): bottom sheets rise with a jagged ridgeline top edge instead of rounded corners; the title screen has layered ridges with snow caps and small pines; fare options carry elevation glyphs (one peak for Cheap, two for Balanced, a jagged range for Expensive); the results sign wears a small "Dutch Hill, Monday night" tab.
- **Night surfaces** (the closing recap): panels warm to `#FFF8EC`, outlines deepen to `#13283F`, radii grow by 2 px, a red-and-cream Nordic knit band sits under the "Closing recap" heading with "Lights on in the lodge" opposite it, the radio bubble warms to `#FFF1C2`, and Sleep shows a mug of cocoa. Night values are CSS variable overrides under a mood attribute, so the same components serve both.

### Type

- **Lilita One** for headings, big numbers, section titles and primary button labels. Never body text.
- **Nunito** (600–800, default 700) for everything else. Live numbers (clock, cash, queue, percentages) use tabular figures.
- Sentence case. No all-caps labels, middle-dot meta strings, em dashes or emoji in UI copy.

### Copy

- Write complete short sentences with a subject and a verb. "Your lift breaks down more often." Not "Lift limps overnight."
- Plain words. No developer words (stub, flag, preset), no unexplained acronyms, no puns in instructions.
- One idea per line. Instructions name the gesture and the result: "Drag uphill from the base to place a lift."
- Spell units: "4 min wait", "1,240 ft". Money always has a dollar sign and thousands separators.
- Name things the same way every time: Dutch Hill, winter (never season), lodge Tier 2, guests.
- Errors say what to do next: "Not enough cash. Close a day or take the loan."
- Live numbers sit in separate chips rather than one joined string.

### Motion

Principles from Apple's fluid-interface talks and Emil Kowalski's design engineering: respond on press, keep everything interruptible, animate only transform and opacity.

- Press: on pointer-down the key moves down 3 px and its shadow shrinks by 3 px (100–120 ms, `--ease-out`); release snaps back.
- Sheets: CSS transitions driven by `data-state` so they can be interrupted; enter 360 ms on `--ease-drawer`, exit 200 ms; drag-to-dismiss with pointer capture and flick velocity.
- Selection changes ≤160 ms. Nothing pressed many times a night animates beyond the press.
- One bounce in the whole UI: the radio diamond arrives with a small overshoot (≤300 ms, from scale 0.9), because radio beats are rare.
- Hover only for fine pointers. `prefers-reduced-motion` replaces movement with short opacity fades.

### Accessibility

Text contrast ≥4.5:1 on every surface pairing; state is never colour-only (a word or icon goes with it); targets ≥44 px; focus ring 3 px `sign-yellow` with an ink edge; safe-area insets; layouts checked at 390×844 and 844×390.

---


## Blender pipeline

Asset kit v1 is in the game (Art pass 2). Seventeen Draco GLBs, 204 KB in total.

**Location.** `web/public/models/<name>.glb` plus `manifest.json` (tris, size, height, footprint, `gripHeightMeters` on carriers, `ropeOffsetXMeters` on lift pieces). The loader is `web/src/render/kit.ts`: it maps asset name to URL, preloads every model on the client, and `bakeKit()` flattens each asset into one vertex-coloured body geometry, one emissive `glow` geometry, and optional split material groups.

**Draco decoder.** Self-hosted at `web/public/draco/` (copied from `three/examples/jsm/libs/draco/gltf/`); `useGLTF(url, "/draco/")` never fetches from a CDN. Refresh it after a three upgrade with `cp node_modules/three/examples/jsm/libs/draco/gltf/* public/draco/`. ESLint ignores that folder.

**Conventions.** Metres, +Y up, origin at base centre. Front faces **+Z** in glTF (Blender −Y; the manifest's "-Z" note is wrong). Lift rope runs along Z at x = ±1.6 m.

**Scales** (`kit.ts`):

| Constant | Value | Used for |
|---|---|---|
| `METERS_TO_WORLD` | 0.075 | Buildings: base lodge ≈ Art pass 1 lodge footprint (1.46 world units wide). Café / shop ×1.05, warming hut ×1.1, snowcat ×1.25 |
| `TOY_SCALE` | 2 | Skiers and carriers (t-bar, double chair): a 1.8 m skier is 0.27 units tall |
| `LIFT_TOY_SCALE` | 1.67 | Towers, terminals, snow guns, lamp posts: puts the 1.6 m rope gauge on `LIFT_CABLE_OFFSET` (0.2) |
| Pines | 0.11 / 0.085 / 0.098 | pine-a / b / c, each ~0.75–0.9 units tall before scatter scale |

Towers stretch vertically so their sheaves meet the span-cleared cable height; terminals keep a uniform scale, with the bullwheel at `LIFT_TERMINAL_H`.

**Materials.** Kit material colours are baked to vertex colours and drawn with one Lambert material per mesh. `snow` is remapped to `PALETTE.snow`. Emissive materials (`window-glow` #ffb347, `lamp-glow` #ffc46b) go to an untonemapped `MeshBasicMaterial` whose brightness rises from 0.62 by day to 1.15 at night, so the amber stays warm under Neutral tone mapping. Skier `jacket` and `helmet` are split out and take per-instance colour; `pants` stays navy.

**Draw cost.** Static kit pieces (village, towers, terminals, guns) are merged per component into one body and one glow mesh. Pines, skiers and carriers are instanced. Trees and skiers cast shadows through cheap proxies on `SHADOW_LAYER` (a 6-triangle cone per tree, a box per skier), which only the sun's shadow camera renders. Distant trees (behind the hill, outside `NEAR_R`) use an 18-triangle stand-in.

**Rebuild.** The Blender build scripts are in `tools/blender/` (`lib.py` helpers and palette, `buildings.py`, `lift.py`, `props.py`, `scenes.py` for renders). Output goes to `$LAST_CHAIR_KIT_ROOT` (default `~/Documents/Last Chair/asset-kit-v1`) under `glb/`, `renders/` and `blend/`. Run them in Blender's Python (e.g. through the Blender MCP or `blender --background --python`), then copy `glb/*` into `web/public/models/`. Exports use `export_yup=True` and Draco level 6.

---

## Audio direction (stub)

- **Story:** Route 100 Radio VO/text first; music bed second.
- **Sandbox:** same ambience, no story stingers.
- Reference vibe: acoustic + light electronic, not epic orchestra.
- **Implemented (row Q3):** procedural Web Audio with effects, ambience and voice buses under one master; a wind bed, a UI tap, a build thunk, a three-note radio sting and a tier-up chime. No files ship. Sound starts on the first gesture and stops when the tab hides.
- **Day tint (row Q3):** light is cool at opening, neutral at midday and warm by closing, at most 12 percent per channel.

---

## Accessibility

- Color-blind safe satisfaction indicators (icon + color).
- Minimum 44px touch targets on night choices.
- Reduced motion disables camera follow swings.

---

## Current scene (implemented, Tier 1 diorama)

Terrain, sky, trail ribbon, cables, road and cars are procedural R3F primitives; buildings, lift hardware, skiers, guns and near pines come from the Blender kit (see Blender pipeline).

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
- `buildMode`: opacity 0.55, green if descent valid else red (`checkLiftLine({ bottom, top })`).
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
