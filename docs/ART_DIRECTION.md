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
| Snow | GPU patches + corduroy stripes from preset | Minimal reads scraped/grey; Mid/High mornings show groom stripes; night subtle fill |
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

- **Shipped (110% polish pass):**
  - Weather-driven `Snowfall` shaders (`90` light / `240` heavy storm flakes) + single-draw skier carving `SkierVfx` spray + Last Saturday torchlight descent ribbon + dual snowcat headlight cones & amber beacon (`Lodge.tsx`).
  - Richer `14:30` golden hour + `16:45`–`18:30` twilight lighting keyframes (`lighting.ts`) for Mount Tom **Lights On** sessions, backed by `RangeLights` sodium floodlight towers & ground glow pools.
  - Per-mountain visual identities (`mountainThemes.ts`): basalt dark rock ledges & 16% paper birch (`mount_tom`), sugarbush maples & apple orchard (`maple_valley`), Vermont ridge blues (`dutch_hill`).
  - `DioramaLandmarks` (Route 100 Welcome Arch, safety-orange snow fencing & lift corrals, steep-face rock outcrops, plowed apron & guard posts) + upgraded procedural `Vehicles` (pickups, wood-panel wagons, school bus, Sloane's SUV, Whiterock Express coach) + Blender source recipes in `tools/blender/props.py`.
  - Woven 3px-ink SVG `CastPatches` and shared cardstock `PunchCard` interactive Winter Review ceremony.
- Future candidates: queue heat shimmer along lift line, interactive heritage plaque modal.

---

## Art pass 1 (procedural diorama, PR 4c)

**Look:** a tabletop miniature of a small Vermont ski hill seen from an elevated 3/4 angle. The hill sits in a valley framed by hazy ridges. Trails and the lift line read as cleared white corridors through a dense, snow-capped conifer forest, following Ice Coast Revival's readability language with our own assets. Light is a warm late-morning sun with soft shadows and a cool blue-lavender sky fill, so shaded snow goes blue and lit snow goes warm white. Skiers are deliberately oversized and brightly dressed so they read on a phone.

### Extended palette

Anchors stay navy `#0b1628`, snow `#f8fbff`, amber `#e85d26`, pine `#1e5e41`. Scene colours live in `web/src/render/palette.ts`.

| Role | Hex |
|------|-----|
| Shaded snow (hollows) | `#b9d4f7` |
| Sun-warm snow | `#fff8eb` |
| Tired / icy snow | `#d9e3f0` / `#c2d4e8` |
| Rock / bare earth | `#6b7382` / `#7a6850` |
| Pine variants | `#194f39`, `#1e5e41`, `#246e4c`, `#348a5e` |
| Barn red / clapboard / shutter | `#c93b2b` / `#f2ece1` / `#24313f` |
| Roof slate / stone | `#2d3b4e` / `#87847e` |
| Window and lamp glow | `#ffc46b` / `#ffb35c` |
| Lift steel / cable | `#56616e` / `#222933` |
| Sky top / mid / horizon | `#4fa0e8` / `#9ad7f5` / `#dceffc` |
| Ridges near / mid / far | `#7aa3cf` / `#9abce0` / `#bed7f0` |
| Night sky / horizon | `#081226` / `#24365a` |
| Jackets | `#d7263d`, `#f2c014`, `#0fa3a3`, `#f2711c`, `#7b4fc9`, `#2f7de1`, `#e8467c` |

### Components

| File | What it draws |
|------|---------------|
| `Atmosphere.tsx` | Three-stop sky dome, layered ridge silhouettes, fog, hemisphere fill and shadow-casting sun (`2048` shadow map on standard detail, `1024` when `lowDetail`, `±18` bounds). Lerps to night when `phase === "night"` and warms toward 4 PM. Exposes `sceneMood` for glass, lamps and hearth light. |
| `Terrain.tsx` | Valley heightfield with `MeshStandardMaterial` vertex colours (cobalt hollows, warm sun-facing slopes, rock on steep faces, bare earth at low `snowDepth`, canopy wash). Also the Route 100 road with dashed yellow stripe and sculpted snowbanks. |
| `game/terrain.ts` | The heightfield (`TERRAIN.height`) read by the sim and renderer; Dutch Hill is data in `game/mountains/dutchHill.ts`. |
| `TrailRibbon.tsx` | Terrain-hugging groomed corridor with a procedural corduroy texture; green/red translucent preview in build mode. |
| `TrailSign.tsx` | Kit-instanced `trail-sign` / `trail-sign-double` posts at trail entrances. |
| `Lift.tsx` | Merged PBR towers, crossarms, bullwheels, up/return cables and terminals; instanced carriers; translucent ghost for build preview. |
| `Trees.tsx` | Kit-instanced chunky 3-tier pines (`pine-a..d`) and ~9% winter birches (`birch`) via `treeKit.ts` (`TREE_TOY_SCALE = 1.6`, `GRID_SPACING = 0.76`); `lowDetail` falls back to cones. Far ring uses crossed billboard impostors. |
| `Lodge.tsx` | Base village merged into PBR `matte`, `semiGloss`, `glass` (warm reflective by day → hearth glow at dusk/night) and `glow` meshes, plus a dusk/night hearth `PointLight` and lamp pools. |
| `ChimneySmoke.tsx` | Single `InstancedMesh` of stylized low-poly smoke puffs drifting from the lodge and warming-hut chimneys (pauses when `prefers-reduced-motion` is set). |
| `Guests.tsx` | Instanced toy skiers (legs, skis, poles, face, tinted jacket and helmet); T-bar or chair attached to riders; amber ring for followed guest. |
| `SnowGuns.tsx` | PBR tower guns with animated snow plumes when running. |
| `geo.ts` | Helper that bakes coloured primitives into one merged geometry per prop. |

**Camera:** per-aspect default framing (portrait: wider FOV and farther back; landscape: tighter), elevated 3/4 view from the south-west so the lift and trail cross the screen. Orbit is limited in polar angle, azimuth, distance and pan so the camera stays above the valley; follow mode still lerps the target to the guest and eases home afterwards.

**Performance:** merged village/lift PBR buckets plus instanced trees, guests, carriers, chimney puffs and snow plumes. Sun is the only shadow caster light (`2048` standard / `1024` lowDetail). No post-processing. Canvas uses `dpr={[1, 2]}` and `ACESFilmicToneMapping`.

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
| `gold` | `#FFC93C` | Cash only (Office Money totals and chart currency series) |
| `barn` | `#E0483E` | Problems, losses, Close hill |

### Shape

- Every panel, chip and button has a 3 px `ink` border and a hard offset shadow (`0 Npx 0 ink`, no blur). No gradients, no soft grey shadows, no translucency.
- Radius follows hierarchy: sheet top 28 px, panel 20, button and option 16, chip 12.
- Sign surfaces (green, brown, yellow panels) use highway-sign framing: coloured fill, 4–5 px padding, then an inner 2 px white border (ink on yellow).
- **Day HUD Radio & Night Recap Radio:** by day, `HudRadio` rests as a compact `44 px` key below the Play button with an unread badge dot and transient `6 s` peek toast for fresh intraday broadcasts (tapping opens the 3-band tuner); at night and on the Office Desk, `RadioCard` spans full width with an integrated `RadioDiamond` + `100.7 WVTK` masthead in `sign-yellow-soft`.
- Options are raised white keys. The selected one turns sign green and sits pressed down, with `aria-pressed`.

### Day is mountainous, night is cozy

- **Day surfaces** (HUD, Build, Guests, title screen): bottom sheets rise with a jagged ridgeline top edge instead of rounded corners; the title screen has layered ridges with snow caps and small pines; fare options carry elevation glyphs (one peak for Cheap, two for Balanced, a jagged range for Expensive); the results sign wears a small "Dutch Hill, Monday night" tab. Speed control shows tier glyphs (`SpeedIcon`: `Calm`, `Normal`, `Fast`).
- **Day HUD on phone and iPad (PR #102 + UI revamp):** keep the mountain as the hero. The conditions board defaults to one scannable line (queue, snow, mood) with tone dots; expanded chips match art-direction voice, not dashboard density. Primary day chrome sits in the bottom thumb zone; **Hide HUD** removes bottom bar and map tools, leaving only a **Show HUD** pill. Map tools (`Layers`, `Grid`, `Recenter`, `Hide`) use the same rounded keys in a vertical rail (portrait) or top-right horizontal strip (iPad). During placement, direct one-tap primary CTAs (`Cut trail`, `Place for $N`, `Build here`) sit alongside `Cancel` and an optional `Details` toggle, **Minimize** collapses tool panels to a slim `trail-bar-in` strip, and trail paint includes a `[Draw | Erase | Pan]` switcher.
- **Night surfaces** (the closing recap): panels warm to `#FFF8EC`, outlines deepen to `#13283F`, radii grow by 2 px, a red-and-cream Nordic knit band sits under the "Closing recap" heading with "Lights on in the lodge" opposite it, the radio bubble warms to `#FFF1C2`, and Sleep shows a mug of cocoa. Night values are CSS variable overrides under a mood attribute, so the same components serve both.

### Type

- **Lilita One** for headings, big numbers, section titles and primary button labels. Never body text.
- **Nunito** (600–800, default 700) for everything else. Live numbers (clock, cash, queue, percentages) use tabular figures.
- **Office Stats charts (row F3):** axis labels in Nunito; headline metric in Lilita when a chart has one hero number. SVG strokes use `ink` at 3 px; positive cash/margin may use `sign-green`, shortfalls `barn`. Pair colour with pattern or label (§10). Table fallback uses the same formatted numbers as the SVG, not a second rounding.
- Sentence case. No all-caps labels, middle-dot meta strings, em dashes or emoji in UI copy.

### Voice

Last Chair sounds like the person who runs the lift shack at a small Vermont hill: warm, dry, a little salty, and knows every bolt on the T-bar. They talk to you like a neighbor, not like a dashboard. The humor comes from operations, weather and small-town life (corduroy, chowder, the plow, the county road), never from mocking guests.

**How to write it**

- Write it the way a local would say it out loud. Use contractions. Vary sentence length. A fragment is fine when a person would say it that way.
- Instructions come first and stay clear. A gesture, a button or an error says what to do in plain words; a wink can follow. "Drag uphill from the base to string up a lift."
- Everything else gets personality: recap headlines, radio, coach tips, empty states, the winter review, the title screen, confirmations and toasts.
- One joke per screen, tops. Puns are fine in flavor text, never inside an instruction. No "wicked" parody, no emoji, no all-caps shouting.
- Numbers stay exact. Money has a dollar sign and thousands separators; units are spelled out ("4 min wait", "1,240 ft"). Live numbers sit in their own chips.
- Name things the same way every time: Dutch Hill, winter (never season), lodge Tier 2, guests.
- Errors say what went wrong and what to do next, in the house voice: "Wallet says no. Close out the day or go see the bank about that loan."
- No developer words (stub, flag, preset, state, toggle). Accessibility labels (`aria-label`, screen-reader text) stay plain and literal; personality lives in visible text.

**Before and after**

| Old | New |
|---|---|
| Lift limps overnight. | Riley's babying the T-bar tonight. Expect a few extra stops tomorrow. |
| Not enough cash. Close a day or take the loan. | Wallet says no. Close out the day or go see the bank about that loan. |
| Guests want: shorter lines. | The lift line's getting long enough to need its own zip code. |
| Trail confirmed. | That's a trail. Somebody's going to love it. |

**Cast voices**

| Who | Voice | Sample |
|---|---|---|
| House voice and coach | Friendly old-timer showing you around. Second person, encouraging, never a cheerleader. | "Start small. One lift, one trail, and see who shows up." |
| Maris Shaw, Route 100 Radio | Concord NH morning-show veteran. Gabby, warm, weather proverbs, real town names, says Worcester wrong on purpose. One to three sentences. | "Morning, Route 100. Plows are out on the county road, which means the lot fills by ten. You heard it here." |
| Riley Otis, rigger | Few words, dry, mechanical metaphors, secretly proud. | "T-bar sounds like a coffee grinder. It'll run." |
| Frank Oka, garage | Gruff, diesel-stained, fond of the groomer. | "Groomer's fed and grumpy. Corduroy by six." |
| Chief Dana Holt, patrol | Calm, deadpan, safety first. | "Wind's up top. We're holding the chair. Nobody's happy, everybody's safe." |
| Elena Vargas | Kind, teacherly, knows every bus driver. | "The Readsboro kids are coming Tuesday. Keep the bunny slope soft." |
| Vivian Cho, Abominable Snowglomerate | Polished, friendly, a touch too smooth. Corporate-plain, never a cartoon villain. | "We love what you're building up there. We'd love it even more at a predictable price point." |

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

**Materials.** Kit material colours are baked to vertex colours and bucketed by `bakeKit()` into PBR `MeshStandardMaterial` pools (`matte` roughness 0.82 for timber/stone/snow, `semiGloss` roughness 0.36 / metalness 0.25 for roofs/steel/skis/awnings, and `glass` for `window-glow` / `glass-dark`, which renders as warm reflective glass by day and blooms into hearth amber via `emissiveIntensity` at dusk and night). `snow` is remapped to `PALETTE.snow`. `lamp-glow` stays in an untonemapped `MeshBasicMaterial` pool (`glow`). Skier `jacket` and `helmet` are split out and take per-instance colour; `pants` stays navy. **Architecture:** `lib.py` seals `gable_roof()` peaks with a rounded cylindrical snow ridge cap and recesses `window()` glazing behind proud mullions; base venues use distinct silhouettes (`cafe` striped awning + yellow patio umbrella, `waffle-haus` steep timber A-frame, `ski-shop` cobalt roof + colorful exterior ski rack, `lodge-tier-2` side dining wing, `lodge-tier-3` stepped cupola + dual stone chimneys).

**Draw cost.** Static kit pieces (village, towers, terminals, guns) are merged per component into one body and one glow mesh. Pines, skiers and carriers are instanced. Trees and skiers cast shadows through cheap proxies on `SHADOW_LAYER` (a 6-triangle cone per tree, a box per skier), which only the sun's shadow camera renders. Distant trees (behind the hill, outside `NEAR_R`) use an 18-triangle stand-in.

**Rebuild.** The Blender build scripts are in `tools/blender/` (`lib.py` helpers and palette, `buildings.py`, `lift.py`, `props.py`, `scenes.py` for renders). Output goes to `$LAST_CHAIR_KIT_ROOT` (default `~/Documents/Last Chair/asset-kit-v1`) under `glb/`, `renders/` and `blend/`. Run them in Blender's Python (e.g. through the Blender MCP or `blender --background --python`), then copy `glb/*` into `web/public/models/`. Exports use `export_yup=True` and Draco level 6.

---

## Audio direction

- **Story:** Route 100 Radio VO/text first; music bed second.
- **Sandbox:** same ambience, no story stingers.
- Reference vibe: acoustic + light electronic, not epic orchestra.
- **Runtime (row Q3 + 32):** Web Audio with effects, ambience and voice buses under one master. Optional AAC clips in `web/public/audio/` (manifest in `audio-manifest.json`) play when present; otherwise procedural synth covers wind, UI tap, build thunk, radio sting and tier-up chime. Clips are generated on ElevenLabs free-tier credits only (`tools/audio/elevenlabs.mjs --estimate` first, one take each). Licence and source for every file live in the manifest; non-CC0 authors belong on the credits screen.
- **Gesture rules:** sound starts on the first `pointerup`, `touchend`, `click` or `keydown`; iOS uses `navigator.audioSession.type = "ambient"` when available; the tab hidden suspends the context. UI effects load after unlock; ambient beds load after `data-scene-ready`.
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
