# Last Chair roadmap handoff: next PRs and M2 to M7

The [master plan](./MASTER_PLAN.md) defines the game and milestone order. This document records the implementation briefs and acceptance criteria for individual roadmap rows. Use the current A.0 for M2 and treat the [world scale 2b handoff](./Last%20Chair%20World%20Scale%202b%20Handoff%20and%20Full%20Plan.md) as historical.

1. Read the master plan's status snapshot and roadmap before picking a row.
2. For M2, use A.0 for dependencies and save compatibility. Historical sections retain their original assumptions.
3. Use `SIMULATION_SPEC.md` and the code for implemented values. Tune proposed numbers in the balance harness and document the results.

| Part | Covers |
|---|---|
| Part A | Foundation briefs, M2 builder and operations rows, M2 gate |
| Part B | M3, rows 18 to 27, M3 gate |
| Part C | M4 to M7, rows 28 to 40, 110% pass and cross-cutting work |

## Numbering

"PR 12" or "row 28" means a row in the MASTER_PLAN roadmap, not a GitHub pull request number. The two sets collide (GitHub PR 28 removed Vercel; roadmap row 28 is guest models). Use the row in branch names and titles, for example `claude/row28-guest-models`.

## Where things stand (updated 2026-11-19)

- The starting point for the M2 finish work was `main` through #54. It included two-tap lift placement, the trail graph (13a to 13c, save v10), the restored 3D scene (#48), the smoothed trail ribbon (#49), and the convex Dutch Hill crest (#50).
- The M2 release integrates the remaining builder features, lodge tiers, venue visits, lift operations, and snow and clearing rules. The automated gates pass on the integrated version. First-time player sign-off remains open.
- The live game is https://cholula-cloud.github.io/last-chair/play/. GitHub Pages serves a static export.

### Render verification

From #39 until #48, the HUD and simulation ran but the 3D scene stayed blank. `RenderStats` passed a positive priority to React Three Fiber's `useFrame`, taking over rendering without drawing. The hook now uses default priority. The phone check samples a canvas screenshot to confirm the scene actually drew.

PR #49 smoothed the rendered ribbon where tight path turns folded quads into dark shards. The starter and painted corridors passed the 390×844 Chromium review. PR 55 records row 13e.

### Roadmap order

M2 implementation and its numerical checks shipped. Its uncoached opening remains a separate sign-off. M3 rows 25, 18, 19 and 20 shipped in that order. Use the [master roadmap](./MASTER_PLAN.md#m3-one-full-winter-product-mvp) for current row status.

## Corrections to earlier documents

The agents that drafted Parts A to C checked the plan against the repo and found these differences. Treat them as corrections to the 2b handoff doc and to MASTER_PLAN or TESTING until those docs are edited.

| Where | Correction |
|---|---|
| 2b doc, item 3 | `migrate()` is in `web/src/game/state.ts`, not `store.ts`. The save v8 step goes in `state.ts` |
| MASTER_PLAN M3 order | Land row 25 (save versioning) before row 18. Every other M3 PR adds saved fields |
| MASTER_PLAN row 29 | Most of the Blender kit already exists as 17 GLB files in `web/public/models/`. The code never reads a `manifest.json`. Part C recommends keeping `models/` and not creating `web/public/assets/` |
| MASTER_PLAN row 28 and ART_DIRECTION | `Guests.tsx` draws up to 48 guests (`MAX = 48`); the iPhone budget allows at most 24 |
| TESTING.md | It names `smoke-winter.mjs`, which is not in `web/scripts/` |
| SIMULATION_SPEC founders | The code has bonuses the spec does not list: Tom carries a snow-expectation penalty of 0.03; Riley, Juniper and Marco have mood bonuses; `arrivalCount` adds `round(bonus * 20)` guests per day for the founder |
| Winter review gate | It reads the 14-day constant instead of the saved season length, so it breaks when row 19 moves the season to 28 days |

## Conventions that apply to every PR

These are stated in full in section 6 of the 2b doc and in MASTER_PLAN section 8. In short:

- One goal per PR, about 400 changed lines of non-test code or fewer; each section says where to cut.
- `web/src/game/` is pure TypeScript and never imports from `render/` or `ui/`, tests included.
- `npm run check` green. Sim changes ship with unit tests.
- The characterization snapshot changes only where a section says, with the diff checked line by line.
- Docs move with code: MASTER_PLAN roadmap status and SIMULATION_SPEC markers in the same PR.
- File names have no underscores.
- Merge with a merge commit after CI is green (`gh pr merge <n> --merge`); GitHub auto-merge is disabled on the repo.

---

# Part A: Build the mountain

## A.0 Order, dependencies and safety nets

Write the row brief before implementation and use current `main` as the checkout baseline. Follow the finish order in the master plan.

- **Snapshot:** Review changes to `season.characterization.test.ts.snap` against the intended gameplay changes. The fixture must buy Tier 2 before placing its chair. Explain the rebaseline in terms of changed costs, guest choices, and snow.
- **Save:** v10 is the pre-M2-finish format. Shipped v11 saves start with the fixed lodge, and v12 adds widths. The v14 migration backfills catalog assets, stats, guns and the clearing grid on those saves. Check the code for the current version before further changes. Populate nested fields explicitly because shallow hydration cannot fill them in.
- **Determinism:** The day simulation must not draw from the seeded RNG for choices that depend on the player's build. Derive guest variety from the guest ID and run count. Branch from the same morning state to keep the roster fixed for the M2 gate.
- **Verification:** Run `npm run check` and `npm run phone-check` for player-facing changes. Record phone coverage and gate results in `TESTING.md`.

## Current briefs for the remaining M2 rows

| Row | Implementation and acceptance |
|---|---|
| **B1 — Bigger mountain** | Preserve the 6× horizontal and 3× vertical coordinate system, reference terminals, 570-foot vertical, starter run and base path. Widen the outer shoulders while keeping the lift crest convex. Check six viable routes in a three-lift layout and fit both shoulders, the lodge, and arrival lot inside the upright phone's safe frame. Use instanced and distance-tiered forest within the existing mesh budget. |
| **L1 — Fixed lodge** | The lodge occupies its mountain site from day one, remains reachable from the car park, and has no purchase or demolition action. An old lodge purchase maps to the single Tier 1 HQ. Show its card from the scene and at the top of Build. |
| **B3 — Drag lifts** | Start from a base terminal the player can move within its valid zone. Drag or tap the top with a ghost line, snapping, and live length, vertical, price, ride time and capacity. Two fingers retain camera control. Review and commit use the same placement checks and line coordinates. |
| **B4 — Build impact** | Reuse one review card for lifts, trails, venues, guns and lodge upgrades. Give cost, area, vertical, difficulty and guest skill where applicable, plus tier, attachment bonus and queue effects for builds that change them. Derive quotes and estimates from build and sim rules. Invalid drafts show the reason and cannot commit. |
| **16a — Catalog** | Define hut, café, shop, rentals, ski school and guns in one table with category, footprint, price, upkeep, effect, opening tier, placement zone, attachment eligibility and default style ID. Persist the style per venue and cap the base at 12 placed assets. Preserve existing venues at their legacy locations. |
| **16b — Lodge tiers** | Tier 2 costs $3,500 and Tier 3 costs $9,000. Advance construction through two Sleeps, show scaffolding while the old tier keeps operating, and announce completion in the morning. Show greyed assets with the opening tier and list the next unlocks on the lodge card. Tier 2 opens the double chair, guns, rentals and ski school. The tiers have 2/4/6 attach pads and 30/50/80 visual stalls. Ticket availability is independent of parking and tier. Tier 3 venues and styles belong to M4b. |
| **16c — Place and attach venues** | Pick flat ground inside the base zone. Validate footprints against assets, walking paths, the lift, snowcat and future parking. Snap eligible venues to free lodge pads, show **+5% attached** in review, and apply the bonus once to effects and revenue. A free-standing venue has its base effect regardless of distance from the lift. |
| **16d — Guest reasons and revenue** | Simulate refuelling and services with guest visits, seating and elapsed time. Give First-Timers a reason to use rentals and lessons, and give impatient guests a way to leave a long queue for the village. Credit each visit once and show takings per venue in the recap. |
| **B5 — Clearing** | Store the union of cleared 15-foot grid cells. At confirmation, charge $300 per acre of newly cleared ground and retain clearings when a trail is erased. Use nearby cleared area to change snow exposure. Remove trees once the cut is confirmed and verify that overlapping strokes cannot charge twice for the same ground. |

Historical briefs for PR 31 through 13c follow. Their original paths, numbers, and preconditions describe the older checkout. The older briefs for 14, 15 and 17 still explain the mechanics. Use A.0 and the simulation spec for current save versions, tier dependencies, and test fixtures.

## PR 31 finish: camera part 1

### Goal
Merge camera part 1 (free pan, pinch zoom, two-finger orbit, double-tap focus, keyboard, recenter, Resume follow chip, Menu confirm, shorter morning note) with the review findings fixed.

### Depends on
Nothing. 2b can proceed in parallel; if PR 31 merges without finding 6, 2b does finding 6 first (2b doc section 4.2).

### Player-visible result
One finger pans along the ground, pinch zooms, two fingers orbit and tilt, double-tap focuses, a recenter button returns home, the morning note no longer covers a third of the screen and can be reopened.

### Design
What remains is the nine findings in 2b doc section 1.3 (against `ef66eb2`). The working tree at `/Users/griffinod/personal-griffin/last-chair` holds uncommitted edits in six files that appear to cover all nine, including a `WORLD_SCALE` constant in `cameraControls.ts` from which every camera world distance derives (finding 6) and a pure `gestureStep` pointer reducer (findings 2 and 8). The edits are unreviewed and untested: review them against section 1.3, run `npm run check`, take the screenshots, commit, merge.

### Files
- PR 31: `web/src/render/cameraControls.ts`, `cameraControls.test.ts`, `useCameraKeys.ts`, `web/src/ui/cameraUi.ts`; changed: `web/src/render/MountainScene.tsx`, `cameraFraming.ts`, `web/src/ui/Hud.tsx`, `PlayExperience.tsx`, `web/src/ui/kit/icons.tsx`, `docs/MASTER_PLAN.md` (adds row 12-pre).

### Tests
- `cameraControls.test.ts`: maximum excursion equals area plus soft margin; `clampTarget({x: NaN, z: 0})` returns the centre; `gestureStep`: two taps within 300 ms and 24 px give `DOUBLE_TAP`, a lost `up` then a `down` with the same id starts fresh, a one-pointer move past 8 px yields `END_FOLLOW` once.
- `homeView(aspect)` distance and angles sit inside the OrbitControls limits for aspects 0.46, 0.75, 1.0, 1.55, 2.16.
- Snapshot: no change.

### Verification
`npm run check`. Screenshots at 390x844, 844x390, 820x1180 and 375x667: the recenter button is at least 44x44, sits beside the action bar and does not cover the base or lodge at 375x667; the morning note stays up while paused and reopens from the weather button. Real touch is not testable with the current browser tools; part 3's script adds CDP touch.

### Acceptance criteria
- Every finding in 2b doc section 1.3 is fixed or explicitly deferred in the PR description.
- `WORLD_SCALE` is the only place camera world distances come from.
- CI green; merged with `gh pr merge 31 --merge`.

### Risks and edge cases
Pointer capture differences between iOS Safari and Chromium; a `pointercancel` from an iOS system gesture mid-pinch must clear the gesture state.

### Out of scope
World scale (2b), speed control and Build focus (part 3), tap placement (12c).

### Docs to update
`docs/MASTER_PLAN.md` row 12-pre: part 1 merged. `docs/ART_DIRECTION.md` camera paragraph: replace "Orbit is limited..." with the new controls.

### Size
Already over budget (about 700 changed lines). If review asks for a split, move `useCameraKeys.ts` and its wiring to a follow-up.

### Open decisions
Keep keyboard controls in this PR. Recommended: yes, they are written and tested.

---

## PR 2c: tiered forest, birch, backdrop ridges, shadow follow

### Goal
The 6x hill reads as a forested Vermont valley at any camera position within a fixed triangle and draw-call budget.

### Depends on
2b (scale, `data-scene-ready`), PR 31 (camera target moves freely).

### Player-visible result
Dense conifers with birch near the camera, a lighter stand of simple trees farther out, a dark canopy tint beyond that, cleared corridors along trails and lift lines, three ridge silhouettes on the horizon, and shadows that stay crisp wherever the player pans.

### Design
Numbers from 2b doc section 5.1, labelled there as design values.

| Tier | Radius around camera target | Density | Count | Triangles |
|---|---|---|---|---|
| Near: kit pines and birch | 0 to 12 u | 1.5 per u² | about 450 | about 45k |
| Mid: 18-triangle stand-ins | 12 to 45 u | 0.6 per u² | about 2,500 | about 45k |
| Beyond 45 u | none; dark canopy vertex colour on the terrain | | | |

**One candidate set, tiers are subsets.** Divide the map into 32 by 32 u chunks keyed by integer `(cx, cz)`. A chunk's candidate spots are generated once, on first need, by a jittered grid at the near density (1.5 per u², spacing about 0.82 u), seeded by `hash(cx, cz)`. Each spot carries `keep = hash01(spot)`. Near tier draws spots with `keep < 1` inside 12 u; mid tier draws spots with `keep < 0.4` (0.6 / 1.5) inside 45 u. A tree that moves from mid to near keeps its position and only swaps model. Rebuild instance buffers when the target has moved more than 6 u since the last rebuild; chunks farther than 77 u (45 + 32) are dropped from the cache.

**Forest mask.** A pure function `forested(x, z, clearings): boolean` in a new `web/src/render/forest.ts` rejects spots inside: the village apron rectangle around the base (from `layout.ts` positions plus 2 u), the road band `|z - ROAD_Z| < 1.5`, each lift line within 3.0 u (proposed: today's `LIFT_CLEAR` of 0.5 u times 6), each trail polyline within 3.84 u (today `TRAIL_CLEAR` 0.64 u times 6), and the Dutch Meadows clearing (an ellipse centred on the meadow above the apron, proposed centre `toWorld(0.3, 1.6)` = (1.8, 9.6), radii 7 by 4 u). The same function drives the canopy tint in `Terrain.tsx` so cleared ground beyond 45 u stays white.

**Species.** 75% conifer (the three kit pines, chosen by `hash % 3`), 25% birch (`hash01 < 0.25`). Birch is a new kit asset, `birch.glb`, under 300 triangles, white trunk with dark marks and a sparse ochre crown, built in `tools/blender/props.py` with the existing conventions (metres, +Y up, Draco level 6).

**Ridges.** `Atmosphere.tsx` `RIDGES` radii change from 27, 38, 52 to 320, 420, 520 (2b doc), with `base` and `amp` scaled by 6 as a first value (proposed: base 21, 36, 54; amp 24, 33, 42) and `fog={false}` kept so they read through the 140 to 420 fog set in 2b.

**Shadow follow.** Today the sun's shadow camera is fixed at ±11 with near 8, far 60 and a 1024 map. Make it ±14 with far 80 (2b doc) and move the light and its target with the camera target each frame. To stop shimmer, snap the followed point to the shadow texel grid: `texel = 28 / 1024 = 0.0273 u`, `snapped = round(p / texel) * texel` in the light's view space. Only near-tier proxies cast shadows (one 6-triangle cone per near tree on `SHADOW_LAYER`).

Budget, main pass: at most 200k triangles and 40 draw calls (2b doc 4.8). Draw calls for the forest: 3 pine variants plus 1 birch (near), 1 stand-in (mid, birch uses the same stand-in with a pale vertex colour), 1 shadow proxy mesh.

### Files
- New: `web/src/render/forest.ts` (chunk generation, mask, tier selection, pure), `web/src/render/forest.test.ts`, `web/public/models/birch.glb`.
- Change (exist): `web/src/render/Trees.tsx` (rewritten around `forest.ts`), `Atmosphere.tsx`, `Terrain.tsx` (canopy tint), `kit.ts` (add `birch`), `web/public/models/manifest.json`, `tools/blender/props.py`.

### Tests
- Same chunk key gives identical spots on two calls; spots from adjacent chunks never coincide within 0.3 u across the shared edge.
- Mid-tier spots are a subset of near-tier candidates (every mid spot exists in the chunk list).
- For target (2.7, 15.3): no spot within 3.0 u of the default lift line or within 3.84 u of its trail; near count between 300 and 600; mid count between 1,500 and 3,500 (proposed bands around the doc estimates).
- Moving the target 5 u does not trigger a rebuild; 7 u does.
- Snapshot: no change.

### Verification
Four viewports, home view, each play-area edge and `MAX_DISTANCE`. Look for popping at chunk edges, a visible ring at 45 u, shadow shimmer while panning. Read triangles and draw calls from `renderer.info` (automated by part 3's script).

### Acceptance criteria
- Main pass at most 200k triangles and 40 draw calls at home view and at max distance.
- Every trail and lift line has a visible cleared corridor.
- No tree inside the village apron or on the road.

### Risks and edge cases
A rebuild writes about 2,950 instance matrices; spread it over two frames if it exceeds 4 ms on a phone. The canopy tint must repaint when trails change (hook into the `snowKey` repaint path).

### Out of scope
Arrival area (2d), forest as a sim input (Juniper's glade reputation, PR 22), clearing cost.

### Docs to update
`docs/ART_DIRECTION.md`: Components table (`Trees.tsx`, `Atmosphere.tsx` ridges and shadow), Blender pipeline asset count, Performance paragraph. `docs/MASTER_PLAN.md` row 12-pre: 2c merged.

### Size
About 350 lines. If over 400, ship the tiers and mask first and move birch plus ridges to a follow-up.

### Open decisions
1. Mid density 0.6 or 0.4 per u². Recommended: 0.6, drop to 0.4 only if the throttled run in part 3 shows under 30 fps.
2. Dutch Meadows clearing shape. Recommended: the ellipse above, tuned on screen.

---

## PR 2d: arrival area, parked cars, walking paths, berms, signs, vehicle kit

### Goal
Each mountain carries its own site layout as data, and Dutch Hill gains a gravel lot off Route 100 whose parked cars track the guests on the hill.

### Depends on
2b (village positions at world scale), 2c (forest mask must clear the lot and road).

### Player-visible result
Cars pull into a 30-stall gravel lot as guests arrive and leave when they go home; on a busy Saturday cars line the road shoulder. Guests walk from their car along a path past the lodge to the lift line. Plow berms edge the lot, a Route 100 shield stands at the junction and a "Dutch Hill" sign stands at the entrance.

### Design
**Data model.** New `web/src/game/site.ts` (pure types) and `web/src/game/mountains/dutchHill.site.ts`:

```ts
export type ArrivalKind = "gravel_lot" | "roadside" | "paved_lot";
export type SiteDef = {
  arrival: { kind: ArrivalKind; center: XZ; size: { w: number; d: number }; yaw: number;
             stalls: number; rows: number; overflow: { kind: "road_shoulder"; spots: number; from: XZ; to: XZ } };
  road: { z: number; xFrom: number; xTo: number; spur: XZ[] };
  paths: { id: "lot_lodge" | "lodge_lift"; points: XZ[] }[];
  buildings: { lodge: XZ; warmingHut: XZ; cafe: XZ; shop: XZ; houses: { at: XZ; yaw: number }[]; snowcat: XZ & { yaw: number } };
  berms: { from: XZ; to: XZ; height: number }[];
  signs: { kind: "route_shield" | "area_sign"; at: XZ; yaw: number; text?: string }[];
  water: { kind: "pond" | "creek"; points: XZ[] }[];
  backdrop: { radii: number[] };
  homeFrame: XZ[]; // extra key points for the home view
};
```

Dutch Hill values (2b doc section 5.1, world units): lot `kind "gravel_lot"`, centre (7.2, 19.8), size 5.0 by 2.0, 30 stalls in 2 rows of 15, overflow `road_shoulder` with 12 spots along Route 100; Route 100 at z = 24 across the map with a spur from (7.2, 24) to the lot; lot-to-lodge path about 3.3 u, lodge-to-lift path about 2.6 u; two berms 0.25 high and 4 u long on the lot's north and east edges; signs as above; `water: []` (WORLD.md documents no creek or pond); building positions copied from 2b's `layout.ts` values. `layout.ts` keeps its exported names (`LODGE`, `PARKING`, `CAFE_POS`, `SHOP_POS`, `WARMING_HUT_POS`, `HOUSES`, `SNOWCAT_POS`, `ROAD_Z`) but reads them from the site, so no consumer changes. `PARKING` becomes the lot centre.

Toy-scale check: a 4.5 m car at 0.15 u per metre (`METERS_TO_WORLD * TOY_SCALE`) is 0.68 by 0.27 u; 15 stalls in 5.0 u give 0.33 u each, and two rows leave a 0.6 u aisle.

**Cars follow guests, no sim change.** A guest has a car while their state is neither `pending` nor `gone`. A pure helper `assignStalls(prev, guests, stalls, shoulder)` in `web/src/render/parking.ts` keeps a `Map<guestId, slot>` across frames: guests are visited in `(arriveAtMin, id)` order; a guest already mapped keeps its slot; a new guest takes `hash(id) % stalls` with linear probing; when all stalls are taken it takes the next shoulder spot; a guest in `gone` frees its slot. The map lives in a `useRef` and resets when `dayIndex` changes. A full lot is visual only (decision already made); arrivals are not capped.

**Walking.** `guestPlacement.ts` `arrive()` and `depart()` stop using the fixed `PARKING` offsets and instead interpolate along `stall → lot exit → paths.lot_lodge → paths.lodge_lift → queue spot` by progress. `ARRIVE_WALK_MIN` and `DEPART_WALK_MIN` stay 3 game minutes, so walking looks fast at 1x (about 7 u in 1.5 s); changing those constants is a sim change and stays out of this PR.

**Vehicle kit.** New Blender assets under 1.5k triangles total: `pickup.glb`, `wagon.glb`, `sedan.glb`, `sign-post.glb`, `area-sign.glb`. Mix: pickups 35%, wagons 25%, sedans 40% by `hash(id)`, period colours from a new `PALETTE.cars` list. One instanced mesh per vehicle type with per-instance colour: 3 draw calls. The four procedural cars in `Lodge.tsx` are removed.

### Files
- New: `web/src/game/site.ts`, `web/src/game/mountains/dutchHill.site.ts`, `web/src/render/parking.ts`, `web/src/render/parking.test.ts`, `web/src/render/Vehicles.tsx`, `web/src/render/Signs.tsx`, five GLBs in `web/public/models/`.
- Change (exist): `web/src/render/layout.ts`, `guestPlacement.ts`, `Lodge.tsx`, `Terrain.tsx` (road along `site.road`, berms as raised strips), `cameraFraming.ts` (`keyPoints` adds `site.homeFrame` and the lot's far corner), `MountainScene.tsx`, `kit.ts`, `palette.ts`, `manifest.json`, `tools/blender/props.py`, `web/src/render/forest.ts` (mask clears lot, spur and berms).

### Tests
- `assignStalls`: 30 guests arriving fill 30 distinct stalls; the 31st goes to shoulder spot 0; a guest's slot never changes across 100 calls while they stay on the hill; when guest k goes `gone`, the next new guest may take k's stall and no other mapping moves; guests in `pending` get no slot.
- Site sanity: every building, stall centre and path point sits on the apron: `|TERRAIN.height(p) - TERRAIN.height(base)| < 0.05` (same rule as the existing apron test in `layout.test.ts`); path lengths 3.3 ± 0.3 and 2.6 ± 0.3.
- `keyPoints()` includes the lot's far corner.
- Snapshot: no change; `git diff main --stat -- '*.snap'` empty.

### Verification
Four viewports: home view shows lot, lodge and lift bottom. On a Saturday over 30 arrivals the shoulder fills; cars appear at `arrive` and vanish at `gone`.

### Acceptance criteria
- `layout.ts` holds no position literals; all come from `dutchHill.site.ts`.
- Cars count equals guests with state in `arrive | queue | ride | ski | depart` at all times.
- Vehicles add at most 3 draw calls and 1.5k triangles of mesh data.

### Risks and edge cases
A mid-day reload reassigns stalls in arrival order, so cars may shift once. Site data is static content, so saves are unaffected. Tenney needs the `roadside` kind (no stalls, all overflow).

### Out of scope
A parking cap that turns guests away (later sim PR), road traffic, night lot lights.

### Docs to update
`docs/WORLD.md` Part 1 "Sim template": add "Arrival: gravel lot off Route 100, 30 stalls, shoulder overflow". `docs/ART_DIRECTION.md`: coordinates table replaced by a pointer to `dutchHill.site.ts`; Blender asset list. `docs/MASTER_PLAN.md` row 12-pre: 2d merged; row 34 (mountain definitions as data) note that site data exists.

### Size
About 380 lines. Cut: ship site data, layout and parking first; move signs, berms and the three vehicle models (keep a single procedural car) to a follow-up.

### Open decisions
1. Stall count 30. Recommended: 30, since weekday rosters are 18 to 26 and Saturdays reach the 48 clamp, so the shoulder fills on busy days and shows demand.
2. Walking speed. Recommended: leave the 3-minute walk; revisit with PR 16 if it looks wrong.

---

## Camera and playability part 3: speed control, Build focus, feet, phone script

### Goal
The player can run the day at 1x, 2x or 3x, sees lift sizes in feet, the camera shows the lift they are considering, and every visual PR can be checked by a reliable phone-viewport script.

### Depends on
2b (`data-scene-ready`, chair rate divides by `speed`), PR 31 (glide helper).

### Player-visible result
A speed chip in the top bar cycles 1x, 2x, 3x. Picking Ridge, Mid or Creek in the Build sheet eases the camera to that line. The Build sheet reads "1,206 ft long, 242 ft vertical" for Ridge.

### Design
1. **Speed.** Session-only state in a new `web/src/ui/speed.ts` zustand store `{ speed: 1 | 2 | 3 }`, never saved (same pattern as `cameraUi.ts`). `MountainScene` calls `tick(Math.min(delta, 0.1) * 1000 * speed)`; the 0.1 s clamp stops a background-tab return from simulating a burst. `rules.tick` already splits into 0.5-minute steps, so 3x at 30 fps (0.2 game minutes per frame) stays accurate. `Lift.tsx` chair rate reads the same store (2b item 9). The chip sits in `TopBar` right of the clock chip, 48 px tall, label "1x"/"2x"/"3x" plus `aria-label="Game speed 2x, tap to change"`. Speed resets to 1x at night and on founder pick.
2. **Build focus.** `web/src/ui/placementDraft.ts` gains `focus: { points: XZ[]; nonce: number } | null` and `requestFocus(points)`. Selecting a top calls `requestFocus([TERRAIN.base, top])`. `CameraRig` watches the nonce and glides (PR 31 `glideTo`) to `frameView` of those two points plus their midpoint raised by `LIFT_TERMINAL_H`, at the current aspect and the home view's angles, with a safe rect whose bottom edge is the Build sheet's top: `yMin = 1 - 2 * sheetTopPx / viewportHeightPx` read from the sheet element when the request is made. 12c reuses `requestFocus` for the draft line.
3. **Feet.** `web/src/game/format.ts` gains `formatFeet(units, feetPerUnit)` returning a whole number with thousands separators and " ft". Length uses `liftLength(line) * TERRAIN.horizontalFeetPerUnit` (70 at 6/3), vertical uses `liftVertical(line) * TERRAIN.feetPerUnit` (about 50.4). Ridge reads about 1,206 ft and 242 ft; Mid about 832 ft and 150 ft (computed from `main`'s terrain at 6/3).
4. **Phone script.** New `web/scripts/phone-check.mjs`, npm script `phone-check`. Chromium and WebKit through Playwright; viewports 390x844 (touch, DPR 3), 844x390 (touch, DPR 3), 820x1180 (touch, DPR 2), 375x667 (touch, DPR 2). For each: clear storage, pick Elena, wait for `[data-scene-ready="true"]` (timeout 60 s, one retry), screenshot home; pan to each play-area edge; zoom in and out; screenshot each. Touch: Chromium via CDP `Input.dispatchTouchEvent` for one-finger pan, two-finger pinch and double-tap; WebKit has no CDP, so it runs `page.touchscreen.tap` only and skips pan and pinch (record "skipped" in the JSON). Performance (Chromium only): `Emulation.setCPUThrottlingRate` 4, sample `requestAnimationFrame` for 5 s, fail below 30 fps. Render stats: a `RenderStats` component writes `window.__lcStats = { calls, triangles }` from `gl.info.render` once per second when the URL has `?stats=1`, so it works on the static production build too; fail above 200k triangles or 40 draw calls. Output to `$PLAYTEST_OUT/phone-check/` (`<engine>-<w>x<h>-<shot>.png`, `summary.json`); exit code 1 on any failure.

### Files
- New: `web/src/ui/speed.ts`, `web/src/render/RenderStats.tsx`, `web/scripts/phone-check.mjs`, `web/src/game/format.test.ts` cases (file exists).
- Change (exist): `web/src/render/MountainScene.tsx`, `Lift.tsx`, `web/src/ui/Hud.tsx`, `PlayExperience.tsx`, `BuildSheet.tsx`, `placementDraft.ts`, `web/src/game/format.ts`, `web/package.json`; PR 31: `cameraControls.ts` if `glideTo` moves there.

### Tests
- `formatFeet(17.2285, 70)` is "1,206 ft"; `formatFeet(0, 70)` is "0 ft"; `formatFeet(2.973, 50.44)` is "150 ft".
- Speed: a pure helper `scaledTickMs(delta, speed)` returns `min(delta, 0.1) * 1000 * speed`; `(0.5, 3)` gives 300.
- Snapshot: no change (speed only scales the delta passed to `tick`).

### Verification
`npm run phone-check` against `npm run dev` and against the static build. The speed chip must not wrap the top bar at 375x667; at 3x chairs cross in a third of the ride time.

### Acceptance criteria
- Speed chip works, resets at night, never persists.
- `phone-check` passes on a clean `main` five runs in a row (the flakiness that `playtest:p0` shows must not carry over).
- Build sheet shows feet for length and vertical.

### Risks and edge cases
Triangle counts from `gl.info` include the shadow pass unless read after the main render only; read `info.render` with `autoReset` off and reset manually after the main pass. WebKit headless WebGL may be software-rendered; skip its fps check.

### Out of scope
4x speed (MASTER_PLAN: never force 4x), skip-to-close timing rules, lift-tap inspection.

### Docs to update
`docs/TESTING.md`: test layers table gets a "Phone check" row and `playtest:p0` is marked superseded for viewport checks; P0 step 5 mentions feet. `docs/SIMULATION_SPEC.md` Time section: "Speed: 1x, 2x, 3x chip, session-only". `docs/MASTER_PLAN.md` row 12-pre: part 3 merged.

### Size
About 200 lines including the script. Cut: the script can ship alone if the rest slips.

### Open decisions
1. Speed available from day 1 or after the tutorial beat (MASTER_PLAN §5 says 2x after the tutorial). Recommended: from day 1, because PR 26 (coached winter) does not exist yet; gate it when PR 26 lands.
2. Retire `playtest:p0`. Recommended: keep it until `phone-check` has passed five clean runs, then delete it with owner approval.

---

## PR 12b: render reads placed lift lines, terrainPick

### Goal
Every render helper draws a lift from its stored `{bottom, top}` line instead of assuming the bottom is `LIFT_BASE`, and the scene can turn a screen point into a terrain point.

### Depends on
2b. PR 31 if `marchToTerrain` is reused.

### Player-visible result
None for lifts built at the base. A lift whose stored `bottom` differs from the base (possible since 12a through `placeLift`) now draws, loads guests and clears trees at its real bottom.

### Design
`liftLineOf(lift)` in `rules.ts` (exists) is the one source of a lift's line. Today `liftLine.ts` `liftFrame(anchor)` and `liftTowers(anchor)`, `guestPlacement.ts` `queueSpot`, `ride`, `arrive`, `Guests.tsx` carrier positions, `Lift.tsx` carriers, `Trees.tsx` `distSqToLiftLine` and `trail.ts` all use `LIFT_BASE` (= `TERRAIN.base`) as the bottom. Change their signatures to take `LiftLine`:

```ts
liftFrame(line: LiftLine)            // vector bottom→top
liftTowers(line: LiftLine)           // first terminal at line.bottom
distSqToLiftLine(px, pz, line)
trailPoint(t, line)                  // ends at line.bottom + (LODGE - TERRAIN.base)
guestWorldPosition(i, state, progress, line, opts)
type PlacedLift = { line: LiftLine; type: LiftType; towers?: LiftPoint[] }
keyPoints(lines: LiftLine[])         // replaces the REFERENCE_TOPS loop with the confirmed lifts' tops and trail midpoints
```

The trail end rule keeps today's default trail identical (bottom = base gives `LODGE`). PR 13 replaces `trailPoint` with stored trail paths.

**terrainPick.** New `web/src/render/terrainPick.ts`: `pickTerrain(ndc: {x, y}, camera): XZ | null` builds the ray with `Raycaster.setFromCamera` and calls a pure `marchToTerrain(origin, dir, height, maxDist, step)`. If PR 31 has merged, move `marchToTerrain` from `cameraControls.ts` into this file and re-export it. Re-derived numbers for 6/3 (the old brief said 0.05 u steps to 80 u): march step 1.5 u (PR 31's 0.25 times `WORLD_SCALE` 6), max distance 1,000 u (the 2b far plane), then bisect 20 times (precision 1.5 / 2^20, about 1.4e-6 u). A 1.5 u step cannot skip terrain features: the shortest bump wavelength in Dutch Hill's noise is about 10 u in world units (frequency 0.6 per design unit at H = 6).

### Files
- New: `web/src/render/terrainPick.ts`, `web/src/render/terrainPick.test.ts`.
- Change (exist): `web/src/render/liftLine.ts`, `trail.ts`, `guestPlacement.ts`, `guestPlacement.test.ts`, `Guests.tsx`, `Lift.tsx`, `Trees.tsx` (or `forest.ts` after 2c), `Terrain.tsx` (`trailInfluence` takes lines), `TrailRibbon.tsx`, `SnowGuns.tsx`, `cameraFraming.ts`, `MountainScene.tsx`.

### Tests
- For the default lift, `liftTowers(liftLineOf(lift))` equals today's `liftTowers(anchor)` output element-wise (regression).
- A line with bottom `{x: 0.9, z: 15.3}` (1.8 u west of base, inside the 3.6 u base area): first tower at (0.9, 15.3); cable clearance at least 0.5 above ground at 20 samples per span (2b item 8 test, applied to this line).
- `guestWorldPosition(0, "queue", 0, line)` lies within 2.0 u of `line.bottom`.
- `pickTerrain`: camera at (2.7, 40, 45) looking at (2.7, 0, 15.3), NDC (0, 0) returns a point within 0.01 u of where `marchToTerrain` with step 0.001 lands; a ray pointing up returns null; a straight-down ray from (5, 50, 5) returns (5, 5) within 1e-6.
- Snapshot: no change.

### Verification
Dev console: `useGameStore.getState().placeLift({type: "chair", bottom: {x: 0.9, z: 15.3}, top: {x: 4.8, z: 3.6}})` on day 1; check at the four viewports that towers, cables, carriers, queue and riders follow the new bottom.

### Acceptance criteria
No render file imports `LIFT_BASE` for a lift's bottom (only for the base area marker). `pickTerrain` exists with tests.

### Risks and edge cases
Lift identity is the array index and closed lifts stay in the array (from PR 14); every render map must keep `lifts[i]` alignment with `guest.liftIndex`, so filter confirmed lifts only for drawing, never for indexing.

### Out of scope
Any input handling (12c), trail data (13).

### Docs to update
`docs/ART_DIRECTION.md` render helpers sentence; `docs/MASTER_PLAN.md` row 12 status text: 12b merged.

### Size
About 250 lines, mostly signature changes. Cut: `terrainPick.ts` can move into 12c.

### Open decisions
None.

---

## PR 12c: two-tap placement UI with snapping

### Goal
The player places a lift by tapping its top on the terrain and confirming, with pan and zoom still available, and taps snap to the nearest valid point.

### Depends on
12b (`pickTerrain`, line-aware preview), PR 31 (gesture reducer), part 3 (`requestFocus`).

### Player-visible result
Build sheet → "Place on the hill" closes the sheet and shows a placement bar: "Tap where the lift should unload." A tap shows a green or red ghost lift from the base with the reason and price; another tap re-aims; "Move bottom" sets the bottom inside the base area; "Place for $2,500" builds. A "Placed. Undo" chip stays until the clock moves. The Ridge, Mid and Creek buttons are gone.

### Design
**Draft state** (`web/src/ui/placementDraft.ts`, session-only):

```ts
type PlacementDraft = {
  active: boolean; type: LiftType; step: "top" | "bottom";
  top?: XZ; bottom?: XZ;        // bottom undefined = TERRAIN.base
  snapped: boolean;             // last tap moved to a valid point
  focus: { points: XZ[]; nonce: number } | null;   // from part 3
};
```

`active` also sets `buildMode` (which pauses the day, existing rule) and ends follow.

**Taps.** `PlacementController` (new, inside the Canvas) feeds pointer events to PR 31's `gestureStep`. While placement is active, `DOUBLE_TAP` focus is off and a finished single-pointer `TAP` becomes a placement tap. Thresholds: PR 31's 8 px slop; the duration limit for placement taps is 400 ms (proposed; PR 31 uses 250 ms for camera taps, which is short for a deliberate tap). Pan, pinch and orbit stay on.

**Camera cap.** While active, OrbitControls `maxDistance` is 90 (decision already made); if the camera is farther, glide to 90 along the current view direction.

**Snap radius.** World size of one CSS pixel at the hit point: `w = 2 * d * tan(fov / 2) / viewportHeightPx`, with `d` the camera-to-hit distance. Snap radius `r = clamp(22 * w, 0.5, 4.8)` (proposed bounds; 4.8 is `minTopSpacing` at 6/3, so a snap never jumps past another lift's exclusion zone).

| View | fov | Viewport height | d | u per px | 22 px | 44 px |
|---|---|---|---|---|---|---|
| Portrait home | 50 | 844 | 40 | 0.044 | 0.97 u (68 ft) | 1.94 u |
| Portrait placement cap | 50 | 844 | 90 | 0.099 | 2.19 u (153 ft) | 4.38 u |
| Sideways phone at cap | 38 | 390 | 90 | 0.159 | 3.51 u (246 ft) | 7.0 u |

**Top snap.** If `checkPlacement(state, type, {bottom, top: hit})` passes, use the hit. Otherwise sample the hit plus rings at r/4, r/2, 3r/4 and r with 8, 12, 16 and 24 directions (61 points), run `checkPlacement` on each and take the valid point nearest the hit; ties go to the larger vertical. If none is valid, keep the raw hit and show its reason. Put this in game as a pure `snapTop(state, type, line, r): { top: XZ; snapped: boolean; reason?: PlacementReason }` in `web/src/game/rules.ts` so it is unit-tested without a camera. Cost per tap is about 61 checks, each a few dozen height evaluations.

**Bottom.** Defaults to `TERRAIN.base`. In step "bottom", a tap is projected into the base disc: if `|hit - base| > R` (R = `baseAreaRadius` 3.6) the bottom is `base + (hit - base) * (R - 0.01) / |hit - base|`; then the line is re-checked.

**Placement bar** (`web/src/ui/PlacementBar.tsx`, new): type toggle (Surface / Double chair), step hint, reason line, length and vertical in feet (part 3 `formatFeet`), Cancel, Move bottom, "Place for $N". Every target at least 44 px; bar sits in the bottom third above the safe-area inset. Placing calls the existing `placeLift`, ends placement and shows the Undo chip while `undoableLiftIndex(state) >= 0`.

**Build sheet.** Remove the Ridge / Mid / Creek `TopButton` group and the "Show placement preview" checkbox; add "Place on the hill". `REFERENCE_TOPS` stays in `descent.ts` for the default lift, the balance harness and tests.

### Files
- New: `web/src/ui/PlacementBar.tsx`, `web/src/render/PlacementController.tsx`, `web/src/game/placement.test.ts` cases (file exists).
- Change (exist): `web/src/ui/placementDraft.ts`, `BuildSheet.tsx`, `PlayExperience.tsx`, `Hud.tsx` (Undo chip), `web/src/render/MountainScene.tsx` (preview from draft line), `web/src/game/rules.ts` (`snapTop`), `docs/TESTING.md`, `web/scripts/playtest-p0.mjs` or `phone-check.mjs` (step 5 no longer finds the Ridge button).

### Tests
- `snapTop` with the hit on a too-steep point beside a valid one within r returns the valid point and `snapped: true`; with r = 0.5 and no valid point within it returns the hit and the reason `too_steep`.
- A hit at Mid (4.8, 3.6) returns Mid unchanged, `snapped: false`.
- Snapped tops never violate `checkSpacing` against the default lift.
- Bottom projection: hit (10, 15.3) with base (2.7, 15.3) gives bottom x = 2.7 + 3.59 = 6.29.
- Snapshot: no change (`placeLift` unchanged).

### Verification
At 390x844, 844x390 and 375x667: pinch out (stops at 90), tap a steep face (red, reason), tap near Mid (green), pan with the ghost shown, Move bottom, Place, Undo. The bar must not cover the ghost's bottom terminal.

### Acceptance criteria
- A lift can be placed anywhere `checkPlacement` allows, on a phone viewport, without zooming past 90.
- Two taps (top, Place) suffice when the bottom is the base.
- No Ridge / Mid / Creek buttons remain.

### Risks and edge cases
A tiny pan reads as a tap; ignore taps within 150 ms of a pinch ending. At `max_lifts`, "Place on the hill" is disabled with the reason.

### Out of scope
Trail drawing (13), gun placement (17, reuses this pipeline), moving or closing an existing lift (14).

### Docs to update
`docs/MASTER_PLAN.md` row 12 status ☑ (12a to 12c done). `docs/SIMULATION_SPEC.md` "Viability rule" row: tap placement implemented; remove "The interim Build sheet offers those three tops". `docs/TESTING.md` P0 step 5 rewritten for tap placement.

### Size
About 300 lines. Cut: Move bottom and the Undo chip can follow in a small PR.

### Open decisions
1. Placement tap duration 400 ms or PR 31's 250 ms. Recommended: 400 ms, placement only.
2. Show a snap indicator (a short line from the tap to the snapped point). Recommended: yes, 300 ms fade, so the player sees why the ghost moved.

---

## PR 13: trail graph

Shipped as three PRs so each snapshot change has one cause.

### Goal
Trails become stored paths from a lift top to the base area, with difficulty from sustained real pitch; guests ski the trails their skill allows, and run time follows trail length.

### Depends on
12b (line-aware render). 12c for the trail UI pattern (13b).

### Player-visible result
13a: the default trail is drawn along a real route ("Dutch Meadows") instead of a fixed S-curve; nothing else changes. 13b: each trail shows a green circle, blue square or black diamond with its name and length; the Build sheet has a Trails section where the player cuts up to three trails per lift from offered routes; first-timers stay on greens. 13c: low trails hold snow worse than high ones.

### Design

**Real grade (decision already made).** `realGrade = worldGrade * feetPerUnit / horizontalFeetPerUnit`. Substituting `feetPerUnit = 570 / (V * Δh_design)`, `horizontalFeetPerUnit = 420 / H` and `worldGrade = (V / H) * designGrade` gives `realGrade = designGrade * 570 / (420 * Δh_design)`: the classification does not move when V or H is retuned. At 6/3 the factor is 50.44 / 70 = 0.72.

**Difficulty thresholds (proposed).**

| Difficulty | Sustained real pitch | Icon and word |
|---|---|---|
| green | ≤ 0.25 | circle, "Easy" |
| blue | ≤ 0.45 | square, "Intermediate" |
| black | > 0.45 | diamond, "Advanced" |

Why 0.45 and not the common 0.40 rule of thumb: a probe on `main`'s terrain at 6/3 measured straight fall-line pitch from 50 valid tops beside the default lift at 0.33 to 0.42, mostly 0.39 to 0.41, so a 0.40 cut would split neighbouring tops on float noise. At 0.45 every Dutch Hill fall line is blue and greens need traverses.

**Data model** (`web/src/game/trails.ts`, new):

```ts
export type Difficulty = "green" | "blue" | "black";
export type TrailRun = {
  liftIndex: number;          // owning lift; index into GameState.lifts
  name: string;               // "Dutch Meadows", "Windmill", "Mid Run 1"
  path: XZ[];                 // world, top first, last point inside the base area, rounded to 0.01
  lengthFt: number;           // sum of segment lengths × horizontalFeetPerUnit
  pitch: number;              // sustained real pitch (terrain.sustainedPitch × 0.72 at 6/3)
  difficulty: Difficulty;
  open: boolean;
  snow: Trail;                // the six Segment[] that lived on LiftSlot.trail
  builtDay?: number; paid?: number;
};
```

`GameState.trails: TrailRun[]` is append-only within a season, like `lifts`. `LiftSlot.trail` is removed. `deriveSnow`, `readSnow`, `snowKey`, `overnightTrail`, `wearTrail`, `softenTrail` keep their signatures; callers pass `{ confirmed: t.open, trail: t.snow }`.

**Route generation (proposed algorithm).** `routeOptions(terrain, top, existing): RouteOption[]` runs A* on a grid of cell size `H / 6` world units (1 u at Dutch Hill) over the box spanning top and base plus 12 u. Moves: 16 neighbours (offsets (1,0), (1,1), (2,1) and their rotations), giving headings every 22.5 to 26.6 degrees so traverses exist. Edge cost for a step of horizontal length L and drop D (world): `L * (1 + 100 * max(0, realGrade - target)^2)`, plus `2 L` when D < 0; a step that climbs more than 16.4 ft (5 m, SIMULATION_SPEC Viability rule 2) is forbidden. Goal: any cell within `baseAreaRadius` of base; the path then ends at base. Heuristic: distance to the base disc. Run three targets: 0.22 (gentle), 0.36 (cruiser), unconstrained (fall line). Smooth each path with two Chaikin passes, resample at 0.5 u, classify by `sustainedPitch` on the smoothed path with the default window (0.6 H). Drop an option whose path stays within 2 u of another option for more than 80% of its length.

A prototype of this A* (unsmoothed, 1 u grid) on `main`'s terrain at 6/3 gave:

| Top | Target 0.22 | Target 0.36 | Fall line |
|---|---|---|---|
| Ridge (-7.2, 1.2) | 1,452 ft, pitch 0.237, green | 1,229 ft, 0.377, blue | 1,229 ft, 0.369, blue |
| Mid (4.8, 3.6) | 998 ft, 0.236, green | 825 ft, 0.351, blue | 825 ft, 0.390, blue |

Expect a few percent difference after smoothing. Runtime was under 0.1 s for all six routes in Node.

**Default trails.** `defaultTrails()` returns one trail for the default lift: the gentle route from Ridge, named "Dutch Meadows" (WORLD.md Part 4 §15 names Dutch Meadows as the novice pitch and Windmill as the steep one). A newly placed lift gets its fall-line option for free (keeps `liftCost` exact; the Mid chair stays $2,500). Further trails are cut by the player.

**13a, no behaviour change.** Add `trails.ts`, `GameState.trails`, `defaultTrails()`, and migrate v8 to v9: each lift's `trail` becomes `trails[i] = { liftIndex: i, path: its fall-line route (Dutch Meadows for the default lift), ..., snow: lift.trail }` and `lift.trail` is deleted. Each lift has exactly one trail, so trail index equals lift index and ski time still ignores length. Wear, thaw, overnight and experienced snow move to trails. `placeLift` appends the lift and its fall-line trail (`snow: averageTrail(...)` as today). `TrailRibbon`, `Terrain` trail influence, the forest mask and guest ski placement read `trail.path` by arc length instead of `trailPoint`.

**13b, guests ski trails.**
- Personas (`personas.ts`) gain `maxDifficulty` and `preferred`: First-Timer green / green; Regular black / blue (proposed).
- At the top, a guest picks among the lift's open trails at or below `maxDifficulty`: trails of the `preferred` difficulty first, otherwise the hardest available within skill; ties broken by `hash(guest.id, guest.runs) % n`. If no trail is within skill, they take the easiest open trail on that lift and ski it over their head.
- `Guest.trailIndex?: number` records the trail (optional field, no migration).
- Ski time (replaces `skiMinutes(persona, q)`):

```ts
skiMinutes = persona.skiMin
           * (trail.lengthFt / REF_TRAIL_FT)
           * (1 + 0.3 * (1 - q))
           * (overSkill ? OVER_SKILL_MULT : 1)
REF_TRAIL_FT = defaultTrails()[0].lengthFt   // computed, so the default lift's runs keep today's 14 / 8 minutes
OVER_SKILL_MULT = 1.6                         // proposed
```

- `lapOverheadMin` and the lap-or-leave check use the chosen trail's time.
- Experienced snow is per trail (`experiencedSnow(trail.snow)`).
- New rule `cutTrail(state, liftIndex, optionIndex)`: day phase only, lift confirmed, at most 3 open trails per lift and 8 in all (proposed), cost `trailCost = roundTo50(150 + 0.4 * lengthFt)` (proposed: 1,000 ft costs $550), snow from `averageTrail`. `trailOptions(state, liftIndex)` returns the route options not already cut, each with name, difficulty, length and cost. Undo follows the lift rule: same day, clock unmoved.
- UI: Build sheet "Trails" panel lists open lifts; each shows its trails (badge, name, feet) and up to three offered routes with "Cut for $N". Choosing an option calls `requestFocus(path)` and previews the ribbon on the hill.

**13c, snow elevation from height.** `segmentElevation(i, n)` is index-based today (1 at the top segment, 0 at the bottom). Replace it per trail with the normalised real height of each segment's midpoint along the path:

```ts
e_i = clamp01((height(mid_i) - height(base)) / (REF_SNOW_H - height(base)))
REF_SNOW_H = height of the default lift's top (Ridge), proposed
```

Normalising by Ridge keeps the calibrated thaw and snowfall numbers about where they are for the default trail while giving the lower Mid trail (top about 150 ft against Ridge's 242 ft) a maximum e of about 0.62, so it thaws harder. Store `elevations: number[]` on each trail at creation (pure function of path) so overnight stays cheap; `inReach` and gun reach keep using these until PR 17 replaces reach.

### Files
- New: `web/src/game/trails.ts`, `web/src/game/trails.test.ts`, `web/src/ui/TrailsPanel.tsx` (13b), `web/src/ui/kit` difficulty icons in `icons.tsx` (exists).
- Change (exist): `web/src/game/state.ts` (`trails`, v9 migration, `defaultLifts` without `trail`), `types.ts`, `snow.ts` (`segmentElevation` per trail in 13c), `sim.ts` (`tickGuests` ski time, `applyOvernight` over trails), `rules.ts` (`tick` wear and thaw per trail, `placeLift` appends a trail, `cutTrail`, `previewOvernight`, `sleep`), `personas.ts`, `balance.ts` (harness strategies cut a green after the chair, see Risks), `web/src/render/TrailRibbon.tsx`, `Terrain.tsx`, `forest.ts` or `Trees.tsx`, `guestPlacement.ts`, `Guests.tsx`, `MountainScene.tsx`, `web/src/ui/BuildSheet.tsx`.

### Tests
- `routeOptions` from Ridge at 6/3 includes a green with pitch ≤ 0.25 and length between 1,300 and 1,600 ft, and a fall-line option classified blue; from Mid, a green between 900 and 1,100 ft.
- Every route: first point equals the top, last point within `baseAreaRadius` of base, no step climbs more than 16.4 ft, deterministic across two calls.
- `classify(0.25)` is green, `classify(0.2501)` blue, `classify(0.45)` blue, `classify(0.4501)` black.
- Scale invariance: the pitch of the Ridge fall line on `createTerrain(DUTCH_HILL, UNIT_SCALE)` and on the 6/3 terrain differ by less than 0.01 (design points mapped with `toWorld`).
- v8 to v9 fixture: a save with Ridge default and a Mid chair loads with two trails whose `snow` equals the old `lift.trail` arrays exactly and `lifts[*].trail` absent.
- 13b: a first-timer at the top of a lift with one blue and one green trail picks green on every run; a regular picks blue; with only a blue trail the first-timer skis it with `OVER_SKILL_MULT`. Default-trail ski time for a regular at q = 1 is exactly 8 minutes.
- `cutTrail` deducts `trailCost`, refuses a fourth trail on a lift, refuses at night.
- 13c: on the default trail, elevations run from about 1 at the top to 0 at the base; on Mid's fall line the top segment is between 0.5 and 0.7.
- **Snapshot.** 13a: nights identical; the final block changes (`lifts[0].trail` removed, a `trails` array of one trail added). 13b: nights 1 to 3 identical (single lift, its only trail is Dutch Meadows, `REF_TRAIL_FT` equals its length so ski times are unchanged); nights 4 to 14 change because the chair placed on day 4 gets a blue fall-line trail whose length and difficulty now set ski times. 13c: every night may change in `snowQuality`, `snowDepth` and their consequences (`satisfaction`, `cashDelta`, `cash`, `reputation`, `arrivals` on later nights, possibly `beats`).
- `balance.test.ts` must stay green; see Risks.

### Verification
Four viewports: trails follow their paths, badges legible at 375x667, the Trails panel fits the two-column `short:` layout at 844x390. On a Saturday with the chair and a green cut, follow a first-timer down the green.

### Acceptance criteria
- `SIMULATION_SPEC` Viability rule 2 (continuous downhill to base) is enforced by construction for every trail.
- Difficulty uses `sustainedPitch` on real grade; the thresholds live in one constant.
- Nights 1 to 3 of the snapshot are byte-identical after 13a and 13b.

### Risks and edge cases
- Balance: first-timers (60% of weekday rosters, 40% of weekend) ski the blue Mid trail 1.6 times slower in 13b and avoid it after PR 14, so "the chair cuts weekend queues but leaves a line" may fail. Fix the harness, not the test: `BUILDER` and `ADAPTIVE` cut the cheapest green on the chair the day after buying it if cash stays above `CASH_RESERVE`. Record the new 40-seed table.
- A top with no route to the base: offer fewer options. Forbid grid cells inside building footprints plus 0.5 u.

### Out of scope
Freehand trail drawing, glades, grooming per trail (17), lift choice by skill (14), trail closures for thin snow.

### Docs to update
`docs/SIMULATION_SPEC.md`: status table "Trail graph" ✅ (PR 13), "Viability rule" note rule 2 enforced, "Snow" (segments per trail, elevation by height in 13c), "Guest day script" (ski time), Personas table (`maxDifficulty`, `preferred`), Save format (v9), Balance table. `docs/MASTER_PLAN.md` row 13 ☑. `docs/WORLD.md` Part 1 sim template: trail names Dutch Meadows (green) and Windmill (reserved for a black).

### Size
13a about 380 lines, 13b about 300, 13c about 60. If 13a goes over 450, render reading `trail.path` moves into 13b and 13a keeps drawing the old S-curve from the lift line.

### Open decisions
1. Thresholds 0.25 / 0.45. Recommended: as proposed.
2. A black on Dutch Hill. The real hill had a steep "Windmill"; at 6/3 every top within `MAX_LIFT_LENGTH` 20.4 u yields fall lines under 0.45. Options: raise `MAX_LIFT_LENGTH` so a summit lift (about 29 u straight, pitch about 0.6) fits; or accept no black on the starter hill. Recommended: no black in M2; revisit with the owner's "real summit T-bar" length decision (2b doc 4.4).
3. `REF_SNOW_H` normalised by the Ridge top or the summit. Recommended: Ridge for M2 (keeps calibration); summit with PR 18's weather model.

---

## Row B2: brush trails

Added 2026-11-18 with MASTER_PLAN v2.0. Owner direction: a trail is painted like a brush stroke you drag down the hill, and the brush size is adjustable.

### Goal

Replace "tap a top, pick a route" with a brush. The player drags one finger from a lift top down through the trees; the trail follows the finger and is as wide as the brush. A size control changes the brush.

### Depends on

13d (convex hill), B1 (bigger mountain, so strokes have room). Lift placement (12a to 12c) and the trail graph (13a to 13c) stay as they are underneath.

### Player-visible result

- **Build → Trails → Paint.** A brush ring appears under the finger, sized to the current brush.
- **Size control** in the thumb zone: four labelled stops, Narrow, Standard, Wide, Boulevard (proposed 30, 60, 100, 150 ft). Each is a 44 px key with its width in feet. The ring and the next stroke use the selected size.
- **Painting:** one finger paints, two fingers pan, zoom and orbit. The stroke must start on a lift top or an existing trail. While painting, the corridor fills in, coloured by difficulty (green, blue, black, double black) from sustained pitch along the centreline; a ticker shows length, vertical, acres and cost.
- **Problems show in red on the stroke:** a section that runs uphill, crosses a lift line, or is too steep for any guest. The stroke can still be painted; Review will not confirm it until fixed.
- **Widen and narrow:** painting over an existing trail with a larger brush widens that stretch; an Erase toggle removes paint (narrows or deletes) before confirm.
- **Undo and redo** per stroke. **Review** opens a card: name, difficulty, length, vertical, acres, cost, which guest types can ski it. **Cut trail** confirms; trees in the corridor fall.

### Design

- **Data:** a trail is a centreline `path: XZ[]` plus `widths: number[]` (design feet, one per path point). Existing trails migrate with a uniform Standard width.
- **Stroke to trail (pure, `game/`):** sample the finger's terrain hits, simplify (Ramer–Douglas–Peucker, tolerance proposed 0.05 design units), resample at a fixed spacing, attach the brush width to each point. Overpaint merges by taking the max width per resampled point within the brush radius; erase reduces it, and points under a minimum width end the trail there.
- **Rules (pure):** valid when it starts at a lift top or joins a trail, ends at the base or joins a trail, never climbs more than the existing uphill tolerance, does not cross a lift line, and has a sustained pitch some persona can ski. Difficulty is `sustainedPitch` on the centreline, unchanged.
- **Costs:** clearing cost = acres × price per acre (proposed); grooming and snowmaking costs scale with acres; crowding uses skiers per acre. Numbers go in SIMULATION_SPEC as "proposed" until tuned in the harness.
- **Render:** the corridor ribbon reads `widths[]`; trees inside the corridor are culled at confirm (not while painting, so the player sees the forest they are cutting). Preview corridor is semi-transparent with the difficulty colour.

### Splits

| PR | Scope | Size |
|---|---|---|
| B2a | `game/`: `widths[]` on trails, save migration, stroke-to-trail, overpaint and erase merge, validation, acres and cost. Unit tests only, no UI | ~300 lines |
| B2b | Brush UI: stroke capture on terrain, ring cursor, size control, live coloured preview, ticker, undo and redo | ~350 lines |
| B2c | Review card, Cut trail confirm, tree culling by width, Erase toggle | ~250 lines |

### Tests

Stroke simplification keeps endpoints and stays within tolerance; overpaint never narrows; erase below the minimum splits or ends a trail; a stroke that climbs or crosses a lift fails with the right reason; acres scale with width; migrated saves get Standard width and an unchanged season snapshot except where width now drives cost (diff explained line by line).

### Verification

`npm run check`; `npm run phone-check` at 390x844 with a scripted stroke; on a real iPhone, paint a Standard trail from the Ridge top to base in under 30 seconds and widen its top half with Wide.

### Acceptance criteria

A new player paints a trail and changes the brush size without instructions. One finger always paints and two fingers always move the camera while in Paint. Every number on the Review card comes from the sim.

### Out of scope

Glades (B5), variable width inside one stroke by pressure, trail names chosen by the player, terrain parks.

### Open decisions

1. Brush sizes: four fixed stops (recommended) or a continuous slider.
2. Pinch to resize the brush while painting: no (recommended; pinch stays camera zoom).
3. Price per acre: set in B2a from the balance harness.

## PR 14: multi-lift choice

### Goal
Guests pick the lift whose trails suit their skill and whose expected wait plus ride is shortest, and the player can close a lift to move it.

### Depends on
13b (trails with difficulty per lift).

### Player-visible result
With a surface lift and a blue-only chair, first-timers stay in the surface line and regulars spread across both; cutting a green on the chair pulls first-timers over. The Build sheet's lift list offers "Close lift" (no refund); a lift closed mid-day stops at Sleep.

### Design
**Choice** (replaces `chooseLift` in `web/src/game/lifts.ts`), evaluated when a guest enters `queue`:

```ts
score(lift) = waitMin(lift) + rideMinutes(lift) + skillPenalty(guest, lift)
skillPenalty = lift has an open trail within guest.maxDifficulty ? 0 : SKILL_AVOID_MIN  // 30, proposed
```

Lowest score wins; ties go to higher capacity, then `hash(guest.id, guest.runs)` parity, then lower index. `waitMin` stays queue length ÷ capacity per minute. Guests do not switch lines once seated in a queue. All lift bottoms lie inside the base area, so the walk between lifts is treated as zero (proposed). The HUD queue reading stays "busiest lift"; `lapOverheadMin` uses the guest's chosen lift.

**Close and move.** New rule `closeLift(state, i)`: day phase; refused for the last open lift. If the clock is at `DAY_START_MIN` and no guest is on the hill, it sets `confirmed: false` and closes its trails immediately; otherwise it sets `closing: true` and `sleep` applies the close before the overnight snow step. No refund (proposed). Lift identity stays the array index; `checkPlacement` already counts confirmed lifts against `MAX_LIFTS`. Cap the `lifts` array at 12 entries per season (proposed) to bound save size. "Moving a lift" is close plus place.

**Stats.** `DayStats.byLift: { rides: number; waitSumMin: number }[]` (length = `lifts.length`, filled in `tick`). The recap "Why?" queue line names the busiest lift: "Most of the wait was at the Surface lift (12 min a ride)". Nested key, so `SAVE_VERSION` 9 to 10 with `byLift: []` filled for old saves.

### Files
- Change (exist): `web/src/game/lifts.ts`, `lifts.test.ts`, `rules.ts` (`closeLift`, `tick` per-lift stats, `sleep` applies closes, `lapOverheadMin`), `state.ts` (`closing?`, v10), `types.ts` (`DayStats.byLift`), `sim.ts` (`emptyDayStats`), `why.ts`, `why.test.ts`, `web/src/ui/BuildSheet.tsx` (open lifts list with Close), `web/src/render/MountainScene.tsx` (closing lifts drawn with a "Closing tonight" tint).

### Tests
- Two lifts, A surface with a green trail and empty queue, B chair with only a blue trail and empty queue: a first-timer joins A; a regular joins B (ride 3.0 beats 4.0).
- A has 20 in line (wait 25.5 min at 47 per hour), B empty with only blue: a first-timer still joins A (25.5 + 4 < 0 + 3 + 30).
- Determinism: same guests and lifts give the same choices on two calls; no call to the RNG (spy on `createRng`).
- `closeLift` at 07:30 with no one on the hill closes immediately; at 10:00 sets `closing` and `sleep` closes it; closing the last open lift is refused.
- `byLift` rides sum to `dayStats.dispatched`.
- v9 to v10 fixture fills `byLift`.
- **Snapshot:** nights 1 to 3 identical; nights 4 to 14 change (two lifts, choice now skill-aware); the final block gains `"byLift": []` in `dayStats`.
- `balance.test.ts` green after the 13b harness change; rerun `npm run balance` and record.

### Verification
At 390x844 on a Saturday: a followed first-timer uses only the surface lift, a regular uses the chair; closing the chair at 07:30 removes it at once.

### Acceptance criteria
- First-timers never ride a lift without a green trail while one with a green trail is open (unit test).
- Moving a lift is possible in the UI as close plus place.

### Risks and edge cases
First-timers avoiding a blue-only chair can make Saturday surface lines worse than before the chair; this is the lever the gate measures.

### Out of scope
Balking to the village (16), lift type penalties (15), per-lift HUD chips.

### Docs to update
`docs/SIMULATION_SPEC.md` Lift types / capacity section: choice rule replaces "shortest expected wait"; Save format v10. `docs/MASTER_PLAN.md` row 14 ☑.

### Size
About 250 lines.

### Open decisions
1. Refund on close. Recommended: none in M2; salvage value belongs to PR 20 economy.
2. `SKILL_AVOID_MIN` 30. Recommended: 30, high enough that a first-timer only rides a blue-only lift when no other lift is open.

---

## PR 15: lift types matter

### Goal
Ride time follows lift length and type, surface lifts have a shorter length limit and are less attractive to beginners, so choosing a type changes queues.

### Depends on
14.

### Player-visible result
The placement bar shows "Ride 4.0 min, 47 skiers an hour" and updates as the top moves; a long surface lift is refused with "Too long for a surface lift. Try a chair or a closer top."; first-timers prefer the chair when both serve a green.

### Design
**Ride time** (replaces the fixed `LIFT_SPECS[type].rideMinutes` everywhere: `lifts.ts` ride end, `rules.ts` `lapOverheadMin`, `Lift.tsx` carrier rate):

```ts
rideMinutes(type, line) = round1(LOAD_MIN + lengthFt(line) / SPEED_FPM[type])
LOAD_MIN = 0.5                       // proposed
SPEED_FPM = { surface: 345, chair: 333 }   // proposed, game-scaled
```

Calibration: Ridge (about 1,206 ft) gives 0.5 + 1206 / 345 = 3.996, rounded 4.0; Mid (about 832 ft) gives 2.998, rounded 3.0: today's ride times exactly. Rounding to 0.1 minute absorbs float drift. Computed on demand, never stored, so saves and the final block do not change.

**Capacity** stays `LIFT_SPECS` (surface 47, chair 50 per hour, SIMULATION_SPEC Balance PR 10b). **Cost** is already per type (`LIFT_COST_PARAMS`, PR 12a).

**Length limit per type** (proposed): surface `MAX_LIFT_LENGTH_SURFACE = 3.0` design (1,260 ft at 6/3); chair keeps 3.4 (1,428 ft). Ridge is 2.87 design, so the default lift stays valid. `rulesFor` takes a type.

**Beginner preference** (proposed): in PR 14's score, a first-timer adds `SURFACE_BEGINNER_MIN = 2` to a surface lift.

**Wind** is deferred to PR 18, because weather has no wind today (`rollMorningWeather` returns snow, clear or thaw) and MASTER_PLAN rule 7 forbids building on a fake number.

### Files
- Change (exist): `web/src/game/types.ts` (`LIFT_SPECS` drops `rideMinutes`, adds `SPEED_FPM`, `LOAD_MIN`), `lifts.ts` (`rideMinutes(lift)`), `descent.ts` (`rulesFor(terrain, type)`, `too_long` copy per type), `rules.ts`, `web/src/render/Lift.tsx`, `web/src/ui/PlacementBar.tsx`.

### Tests
- `rideMinutes("surface", ridgeLine)` is exactly 4; `rideMinutes("chair", midLine)` exactly 3.
- A 1,400 ft chair rides 4.7 minutes; a 1,400 ft surface line fails `too_long`.
- With a surface and a chair both serving a green and equal queues, a first-timer picks the chair.
- **Snapshot:** no change expected. Ride times for the scenario's two lifts are unchanged and the beginner preference only acts when both lifts serve a green (the scenario's chair has only blue). Any diff is a bug.

### Verification
Placement at 390x844: ride time updates while re-aiming; a long surface top shows the type-specific reason.

### Acceptance criteria
No code reads a fixed ride time. Snapshot untouched.

### Risks and edge cases
`SPEED_FPM` literals encode Dutch Hill's reference lengths; a mountain with a different `horizontalFeetPerUnit` gets different ride times for the same design line, which is correct (feet are feet).

### Out of scope
Wind holds (18), per-type operating cost (20), lift upgrades.

### Docs to update
`docs/SIMULATION_SPEC.md` Lift types table: ride time formula and per-type length; status row "Lift types / capacity" partial until wind (18). `docs/MASTER_PLAN.md` row 15 ☑ with "wind in 18".

### Size
About 150 lines.

### Open decisions
1. Wind now or in 18. Recommended: 18.
2. Per-type operating cost now. Recommended: PR 20.

---

## PR 16: village venues

> **Superseded 2026-11-18.** MASTER_PLAN v2.1 replaces this row with 16a asset catalog, 16b lodge tiers, 16c free venue placement and attach, and 16d venues with guest reasons. The lodge is now a fixed HQ whose tiers gate what can be built and earned from; it no longer adds seats (§3 of the plan). Use the L1 and 16a to 16d briefs in A.0. The text below preserves the original guest-state and revenue design.

### Goal
The warming hut, lodge and café give guests somewhere to refuel and to sit out a long line, and village spending becomes real revenue.

### Depends on
14 (lift choice computes expected wait per lift).

### Player-visible result
Tired guests head into the hut or lodge mid-day and come back out; on a Saturday with a 15-minute line some guests skip it for cocoa; the recap shows "Café and shop took $186" and "21 guests sat out the line".

### Design
**Seats** (proposed): warming hut 12, lodge +24 (lodge tier 1), café +12. Seats in use = guests in the new state `refuel`.

**New guest state `refuel`** (SIMULATION_SPEC's Refuel). Entered:
1. Refuel: at the bottom of a run, if `energy < 0.4`, not yet refuelled today and a seat is free. Duration 20 game minutes; energy +0.35 (capped at 1).
2. Balk: when a guest would join a line whose expected wait exceeds 12 minutes and a seat is free; duration 15 minutes; at most 2 balks per guest per day. Balking does not add to `waitMin`.

After `refuel` the guest re-enters lift choice. Lifts close at 15:45 as today; a guest leaving `refuel` after that departs.

**Spending** (proposed): each refuel or balk spends $9 with a café, $4 without (hut cocoa); the shop adds $5 for guests who refuelled at least once while the shop is owned. `NightRecap.cashDelta = ticket revenue + villageRevenue − costs`. Today the shop has no effect, so this is its first real number.

**Satisfaction.** No new term. The queue term improves because balked minutes are not waits; `venueValue` (lodge +$4, café +$3) stays. `arrivalMood` contributions of hut, lodge and café stay.

**Stats.** `DayStats` gains `villageRevenue`, `refuels`, `balked`, `seatsFullMin` (minutes all seats were taken); `RecapFacts` gains `villageRevenue` and `balked`; "Why?" adds a village line. Nested keys, so `SAVE_VERSION` 10 to 11.

**Render.** Guests in `refuel` walk to the nearest owned building door (2d site data) and stand on its deck or go inside.

### Files
- Change (exist): `web/src/game/types.ts` (`GuestState` adds `refuel`, seat constants), `sim.ts` (`tickGuests` refuel entry and exit, `computeDayRevenue`, `buildNightRecap`), `rules.ts` (`tick` counts, balking at line join), `lifts.ts`, `satisfaction.ts` (wait counting), `state.ts` (v11), `why.ts`, `content.ts` (shop note), `web/src/render/guestPlacement.ts`, `Guests.tsx`, `web/src/ui/NightRecapSheet.tsx`, `BuildSheet.tsx` (building notes show seats).
- New: none.

### Tests
- A guest at energy 0.35 finishing a run with a free hut seat enters `refuel` for 20 minutes and leaves with energy 0.70.
- With 12 guests in `refuel` and no lodge, the 13th tired guest does not refuel.
- A guest facing a 13-minute expected wait with a free seat balks; facing 11 minutes does not; a third balk is refused.
- `villageRevenue` for 10 refuels with a café and shop is 10 × 9 + 5 × (distinct guests).
- Every guest is `gone` or `depart` by 16:00 (existing invariant in `guestDay.test.ts`).
- **Snapshot:** all nights may change (the hut exists from day 1, so tired first-timers refuel on night 1; the café bought on day 2 raises spending). `dayIndex`, `phase`, `weather`, `talents` unchanged; diff summary in the PR.
- `balance.test.ts`: properties 1 to 7 must hold; if the passive Balanced / Mid season now ends above 1.3 times starting cash, lower the spending constants (one lever) and record the 40-seed table.

### Verification
At 390x844, a Saturday at 3x: watch the hut fill, read the recap line. At 844x390, check the recap layout with the extra "Why?" line.

### Acceptance criteria
- The shop and café produce revenue traceable in "Why?".
- MASTER_PLAN row 16's "guests leave a long lift line for the village" holds in a unit test.

### Risks and edge cases
Refuel changes lap-or-leave decisions; check `runsPerGuest` against the Personas table. The 2-balk cap prevents loops.

### Out of scope
Lodge tiers beyond tier 1, per-venue pricing (M7 Ledger), Marco's après bonus (22), meals as a separate need.

### Docs to update
`docs/SIMULATION_SPEC.md`: Guest day script (Refuel implemented), Economy (village revenue), Satisfaction (balked minutes), Save v11, Balance table; status rows "Guest day script" and "Economy". `docs/MASTER_PLAN.md` row 16 ☑.

### Size
About 380 lines. Cut: render of guests at buildings and the "Full" sign move to a follow-up.

### Open decisions
1. Seat counts 12 / 24 / 12. Recommended: as proposed, tuned by the harness.
2. Balk threshold 12 minutes. Recommended: 12, just above the 10-minute Saturday surface-only band in SIMULATION_SPEC Lifts.

---

## PR 17: snowmaking and grooming

### Goal
Snow guns are placed on the hill and cover the trail segments near them, and the crew grooms a limited length of trail each night, both visible the next morning.

### Depends on
12c (tap pipeline), 13b (trails with stored paths and elevations).

### Player-visible result
"Place snow guns" in the Build sheet: tap points on the hill, each within pipe reach of the base or another gun. Plumes rise only at the guns and the morning cover is fresh only on the segments they reach. Mid service grooms about 3,000 ft of trail, busiest first; ungroomed trails show no corduroy.

### Design
**Guns** (replace the `snow_guns` building):

```ts
type SnowGun = { at: XZ; builtDay: number; paid: number };
GameState.guns: SnowGun[]
GUN_COST = 400            // proposed; the old building cost 2,200
MAX_GUNS = 10             // proposed
PIPE_REACH = 0.6 * H      // 3.6 u at 6/3: a gun must be this close to base or to another gun
GUN_RADIUS = 0.5 * H      // 3.0 u: a trail segment is covered if its midpoint is this close to a gun
```

"Reach uphill from base" is the pipe chain. `trail_guns` multiplies `GUN_RADIUS` by 1.25 (replaces +0.25 reach). Night inputs: a segment gets `GUN_DEPTH[preset]` (Mid 0.14, High 0.20, unchanged) when covered and the preset fires (Mid or High with at least one gun). The old rule that High plus `trail_guns` fires without guns is dropped. `hasGuns` for `rollMorningWeather` becomes `guns.length > 0`. `gunReach` (a fraction) is replaced by `trail.gunCovered: boolean[]` per trail.

**Grooming capacity** (proposed): `GROOM_FT = { minimal: 0, mid: 3000, high: 5000 }`; `groom_pass` adds 20%. The crew grooms open trails in descending order of yesterday's runs (ties by index); a trail is groomed whole if it fits, then the remaining feet groom the next trail's segments from the bottom up. Groomed segments get today's groom target and push; ungroomed segments on a Mid or High night take the Minimal drift (quality −0.04, floor 0.2). `trail.groomed: boolean[]` drives the corduroy.

**Placement.** Reuse 12c: draft `kind: "gun"`, snap to the nearest point satisfying the pipe rule within the snap radius.

**Migration** (v11 to v12): a save owning `snow_guns` gets it removed from `buildings` and receives guns along each open trail's path at 95%, 80% and 65% of length (the bottom half the old reach covered), no refund; `GROOM_FT` applies from the next night.

### Files
- New: `web/src/game/guns.ts`, `guns.test.ts`.
- Change (exist): `web/src/game/snow.ts` (`overnightTrail` takes `covered` and `groomed` per segment; `gunReach` removed), `sim.ts` (`applyOvernight`, weather `hasGuns`), `rules.ts` (`placeGun`, `undoGun`, `previewOvernight`), `types.ts` (`BuildingId` keeps `snow_guns` for migration only; remove from `BUILD_OPTIONS`), `state.ts` (v12), `web/src/render/SnowGuns.tsx` (guns at `at`, plumes where fired), `TrailRibbon.tsx` (corduroy per segment), `MountainScene.tsx`, `web/src/ui/BuildSheet.tsx`, `PlacementBar.tsx`, `placementDraft.ts`.

### Tests
- A gun at 5 u from base is refused; at 3 u accepted; a second gun 3.5 u beyond the first accepted.
- With one gun at the base, on the Dutch Meadows trail only segments with midpoints within 3.0 u are covered; High night adds 0.20 depth to exactly those.
- Grooming: two trails of 1,450 and 830 ft at Mid: both fully groomed; three trails of 1,450, 1,000 and 830 ft with the 1,000 ft trail busiest: it and the 1,450 ft trail are groomed whole and 550 ft of the 830 ft trail from the bottom.
- v11 fixture with `snow_guns`: loads with 3 guns per open trail and no `snow_guns` building.
- **Snapshot:** nights unchanged (the scenario buys no guns; its two trails, about 1,450 ft and 830 ft, fit inside Mid's 3,000 ft and High's 5,000 ft). The final block gains `"guns": []` and per-trail `groomed` and `gunCovered` arrays.
- `balance.test.ts` green; strategies that bought `snow_guns` (none today) unaffected.

### Verification
Four viewports: three guns, sleep on High, plumes at the guns and whiter cover only nearby; with a third trail on Mid, one trail shows no corduroy.

### Acceptance criteria
Guns and grooming both read geometry; MASTER_PLAN row 17's "visible gun plumes and fresh corduroy where the crew worked" is true in a screenshot.

### Risks and edge cases
Migration roughly preserves what a $2,200 gun purchase covered. Grooming order needs per-trail run counts from yesterday (add `runsByTrail` to `lastDay`); day 1 orders by index.

### Out of scope
Water supply, compressor power, gun types, groomer machines as units.

### Docs to update
`docs/SIMULATION_SPEC.md` Snow (guns by coverage, groom capacity), Economy (gun cost), Save v12. `docs/MASTER_PLAN.md` row 17 ☑.

### Size
About 380 lines. Cut: grooming capacity can ship before placed guns.

### Open decisions
1. Gun cost and cap. The first-winter calibration sets installation at $250 and daily upkeep at $60, with a cap of 10.
2. Partial grooming from the bottom up or top down. Recommended: bottom up, where thaw hits first.

---

## M2 gate: simulation and phone playtest

### Headless comparisons

Run `npm test -- src/game/m2gate.test.ts` for six deterministic seeds and the Tier 2 revenue check. For milestone acceptance, run `npm run m2-gate` with the numerical floors on 40 paired seeds. Pick Elena and reach Tier 2 through the normal lodge upgrade before placing the second lift. Use a weekend morning fixture with legal terminals on final terrain. Fork that morning into three scenarios and run each through the real closing rules.

1. **Control.** Repeat the unchanged day and expect equal results.
2. **Add a trail.** Paint and commit a usable green serving the second lift. Require at least one minute less mean waiting, two points more satisfaction, and more distinct first-timers actually boarding the chair in each seed. Track total chair rides as a diagnostic.
3. **Move a lift.** Start with the developed chair serving both the original route and the new green. Close it before guests arrive and build a legal replacement. Compare against the developed chair. Require at least half a minute of absolute mean wait difference and one satisfaction point. Completed runs must differ in at least five sixths of seeds.

Check equal guest IDs and arrival counts per seed. After B5, report the same comparisons over 40 seeds via `npm run m2-gate` (the balance report also includes the means) and record measured effects in `SIMULATION_SPEC.md`. Calibrate thresholds to half the 40-seed effect without lowering the floors. Separately check that upgrading to Tier 2 unlocks rentals and that guest visits earn revenue.

### Closing phone viewport playtest

After the headless gate passes, use fresh saves at 390×844 in mobile WebKit and Chromium. Time a first-time tester placing a lift and painting a trail, using the game's own cues, from the first playable frame. The target is three minutes. Use a prepared save to exercise a lodge upgrade, an unlocked revenue source, and the recap after changing the hill. Document results, friction, and screenshots in `TESTING.md`. Scripted checks can verify interactions. Record first-time usability separately.

## Limitations

Numbers marked proposed are design choices to be tuned with the balance harness and on screen. The route lengths, pitches and valid-top list come from a prototype run of the described A* and straight-line probes against `main`'s Dutch Hill at an explicit 6/3 scale, before 2b merged; 2b changes nothing in the terrain function, but smoothing and grid choices will move the figures by a few percent. Snapshot predictions assume the characterization scenario stays as written (café day 2, chair at Mid day 4, seed 42). The PR 31 description relies on a read of the uncommitted working tree, which has not been run or reviewed. Triangle, draw-call and frame-rate budgets are estimates until part 3's throttled script runs. Real touch input and real iPhone Safari remain unverified for every PR here. Section 1.3 line references and file line counts drift with each merge.


---

# Part B: M3, one full winter

### Current handoff

The common goal is to finish day 28 with nonnegative cash after debt and unpaid construction. Readsboro is optional. Vivian’s offer trades $6,000 for a fare cap. GitHub PR #77 delivered the revised first-winter sequence and #78 recorded hosted verification. The briefs below preserve design history, including proposed values. Use the [M3 roadmap](./MASTER_PLAN.md#m3-one-full-winter-product-mvp) for delivery status and the [device playtest](./TESTING.md) for optional device sessions.

The owner deferred all M3 human testing on November 19. Safari, VoiceOver and outside-player sessions are optional follow-up. The separate M2 opening also needs a first-time player.

## Rules for every M3 PR

**Determinism.** All randomness comes from seeded RNGs whose state lives in `GameState`. M3 adds one rule: season-level draws (weather, the radio filler pick) come from a second stream seeded once per season, `seasonSeed`, so they never consume draws from the day stream (`rngState`) that rosters and arrivals use. That keeps arrival noise identical when weather changes, which makes snapshot diffs readable.

```ts
// game/rng.ts (exists): add
export function mix32(x: number): number; // splitmix-style 32-bit hash, pure
export function streamFor(seasonSeed: number, salt: number): Rng; // createRng(mix32(seasonSeed ^ salt))
export const STREAM = { WEATHER: 0x57ea7e2, RADIO: 0x4ad10 } as const;
```

`seasonSeed = mix32(state.rngState)` is set in `pickFounder` and `startNewSeason` without advancing `rngState`.

**Layering.** `web/src/game/` stays pure TypeScript and never imports from `render/` or `ui/`, tests included. Content (talents, beats, calendar, coach lines) is data in `game/`. UI reads state and calls store actions.

**Characterization snapshot.** `web/src/game/__snapshots__/season.characterization.test.ts.snap` changes only on a deliberate re-baseline. Each PR below states which lines may move. Procedure: run the test, read `git diff` on the `.snap`, confirm every changed line is in the allowed set, then `npx vitest run -u src/game/season.characterization.test.ts`, and paste a summary of the diff (first changed night, which keys) into the PR description. A changed line outside the allowed set is a bug in the PR.

**Saves.** A PR that adds or reshapes a `PersistedState` field bumps `SAVE_VERSION` by one and registers one migration step with a fixture (PR 25 policy). The version numbers below are written as "next version" because M2 PRs after 2b (v8) may also bump it.

**Phone verification (all PRs with visible change).** Screenshots at 390x844, 844x390, 820x1180 and 375x667, home view and with each new sheet or card open. No overlap with the HUD or safe areas; every new control at least 44x44 px; night tiles full width and at least 56 px tall; every control labelled. Accessibility from MASTER_PLAN section 9 on every new surface: state shown as icon plus colour (never colour alone), reduced motion disables new animations, radio can be off, heritage text optional. Wait on `[data-scene-ready="true"]` (2b item 12) instead of fixed sleeps. Use `web/scripts/phone-check.mjs` from camera part 3 if it has landed.

**Size.** About 400 changed lines of non-test code per PR. Each PR names where to cut.

---

## PR 18: Weather model

**Goal:** replace the `(day*17+3) % 10` formula with a seeded season of weather (clear, snow, storm, thaw, plus wind) that the night sheet shows as a forecast with honest odds.

**Depends on:** PR 25 (save registry). Reads lift wind sensitivity from PR 15 if it exists (see Design).

**Player-visible result:** the night sheet shows tomorrow's outlook ("Snow likely, 60%") and the fare and snow tiles show expected values under that uncertainty. Thaws come in runs of days, storms bury the hill and keep some people home, and gusty days close the chair for the late morning with a HUD notice. The morning note names the weather that arrived.

### Design

State additions:

```ts
// game/types.ts (exists)
export type WeatherKind = "clear" | "snow" | "storm" | "thaw"; // adds "storm"
export type Wind = "calm" | "gusty";

// game/weather.ts (new)
export type DayWeather = { kind: WeatherKind; wind: Wind };
export type Outlook = Record<WeatherKind, number>; // probabilities summing to 1

// PersistedState additions (game/state.ts, exists)
seasonSeed: number;
/** Actual weather for days 1..seasonLength, generated once per season. */
weatherDays: DayWeather[];
// `weather` stays and always equals weatherDays[dayIndex - 1].kind
```

Generation (proposed numbers). A four-state Markov chain from yesterday's kind to today's, with a season arc on the thaw column. Day 1 is drawn from the `clear` row.

| From \ to | clear | snow | storm | thaw |
|---|---|---|---|---|
| clear | 0.45 | 0.25 | 0.08 | 0.22 |
| snow | 0.40 | 0.30 | 0.10 | 0.20 |
| storm | 0.55 | 0.25 | 0.00 | 0.20 |
| thaw | 0.35 | 0.15 | 0.05 | 0.45 |

Season arc: multiply the thaw entry by 0.7 on days 1 to 9 and by 1.3 on days 20 to 28, then renormalise the row. Over 4,000 simulated 28-day seasons this gives clear 42%, snow 24%, storm 7%, thaw 27%; mean thaw run 1.8 days; 61% of seasons have a thaw run of three days or more (the "thaw runs" requirement); every season has a three-day dry spell, so the Dry week beat can fire. The old formula gave a gun-less hill 50% thaw days (14 of 28), so this model is wetter and kinder; expect the balance table to move (see Tests).

Wind (proposed): `gusty` with probability 0.12 on clear days, 0.25 on storm days, 0.05 otherwise, drawn after the kind from the same stream.

```ts
export function generateSeasonWeather(seasonSeed: number, length: number, calendar: CalendarDef): DayWeather[];
export function chainRow(prev: WeatherKind, day: number): Outlook;      // arc applied
export function outlookFor(state: GameState, dayAhead: 1 | 2): Outlook | null;
```

Forecast skill (proposed). A displayed outlook blends the chain row with the truth: `shown = (1 - s) * chainRow(prevActual, day) + s * onehot(actual)`. Skill `s` is 0.5 for tomorrow and nothing beyond tomorrow; Amira (PR 22) gets `s = 0.7` for tomorrow and a day-2 outlook at `s = 0.4` built from the two-step chain. `outlookFor` returns null for a day outside the season or beyond the founder's horizon. It is pure and reads only state, so previews never draw from an RNG.

Effects of each kind (snow and clear keep today's numbers from SIMULATION_SPEC, Snow; storm and wind are proposed):

| Kind | Overnight trail (per segment, `e` = elevation) | Arrivals | Arrival mood |
|---|---|---|---|
| clear | depth −0.01, quality −0.02 | 0 | 0 |
| snow | depth +0.12 + 0.08e, quality +0.06 + 0.04e, coverage restored where depth ≥ 0.15 | +3 | +0.06 |
| storm | depth +0.22 + 0.10e, quality +0.10, coverage restored | −5 (roads) | +0.06 |
| thaw | depth −(0.02 + 0.12 low), quality −(0.04 + 0.16 low), afternoon softening from 11:00 | −4 | −0.08 |

Wind hold (proposed): on a gusty day every chair stops loading from 10:30 to 13:00. Guests in its queue rejoin the surface line (`chooseLift` skips a held lift; `confirmed` stays true). If PR 15 added a `windSensitive` flag to `LIFT_SPECS`, hold the lifts with that flag; otherwise add `windHold: boolean` to `LIFT_SPECS` (surface false, chair true). The hold window lives in `game/weather.ts` as `WIND_HOLD = { fromMin: 630, toMin: 780 }`.

Code changes in the sim:

- `sim.ts` `rollMorningWeather` is deleted. `applyOvernight` takes `weatherTomorrow: DayWeather` from `state.weatherDays[dayIndex]` (index of tomorrow) instead of rolling. Snow guns no longer change the weather.
- `snow.ts` `overnightTrail` gains the storm case.
- `rules.ts` `previewOvernight` returns `outlook` and per-kind results; the tile shows the probability-weighted mean quality and the word for the most likely kind. `expectedArrivals` returns `Σ p(kind) × meanArrivals(kind)`.
- `lifts.ts` `stepLifts` and `chooseLift` skip a lift whose type is held at `clockMin`.
- `sim.ts` `arrivalCount` adds the storm row.
- `balance.ts` `ADAPTIVE` changes `previewOvernight(state, "mid").weather === "thaw"` to `outlook.thaw >= 0.5`.

Seeding rule: `weatherDays` is generated in `pickFounder` and `startNewSeason` from `streamFor(seasonSeed, STREAM.WEATHER)` and never regenerated mid-season. Migration of a mid-season save generates it from the save's `rngState` with day 1 to `dayIndex` set to the saved `weather` for today and `clear` for earlier days.

### Files

- `web/src/game/weather.ts` (new): chain, arc, wind, generation, outlook.
- `web/src/game/rng.ts` (exists): `mix32`, `streamFor`, `STREAM`.
- `web/src/game/types.ts` (exists): `WeatherKind` adds storm; `Wind`; lift hold flag if PR 15 did not add one.
- `web/src/game/sim.ts`, `snow.ts`, `lifts.ts`, `rules.ts`, `state.ts`, `balance.ts` (exist).
- `web/src/game/migrations.ts` (from PR 25): one step.
- `web/src/ui/NightRecapSheet.tsx` (exists): forecast row above the tiles.
- `web/src/ui/Hud.tsx` (exists): storm icon in `WEATHER`; wind-hold chip on the ConditionsBoard while a hold is active.
- `web/src/ui/kit/icons.tsx` (exists): `StormIcon`, `WindIcon`.

### Tests

- `weather.test.ts` (new): `generateSeasonWeather(7, 28, DUTCH_HILL_CALENDAR)` is identical on two calls and differs from seed 8. Over 2,000 seeds: thaw share in 0.24 to 0.30, storm share in 0.05 to 0.09, mean thaw run in 1.6 to 2.0, share of seasons with a thaw run of at least 3 above 0.5. No storm follows a storm. Every `chainRow` sums to 1 within 1e-12.
- `outlookFor`: sums to 1; with `s = 0.5`, the true kind has probability at least 0.5; returns null for day 2 unless the founder is Amira; returns null past the last day.
- Determinism: `pickFounder` leaves `rngState` exactly as `createInitialState(seed)` left it before arrivals are drawn (weather consumes nothing from the day stream).
- Storm trail: a fresh trail after a storm night has depth at least 0.67 at the bottom segment and coverage 1 everywhere.
- Wind hold: a chair-plus-surface day with `wind: "gusty"` dispatches zero chair riders between 630 and 780 minutes, and the surface lift's mean wait over that window is higher than on the same seed with `wind: "calm"`.
- `previewOvernight` and `expectedArrivals` are pure: calling them 100 times leaves `rngState` and every field unchanged.
- Snapshot. Add a second characterization case, "legacy formula weather", that injects `weatherDays` built from the old formula (no guns). Its `nights` must equal the current snapshot's `nights` line for line; only `final` differs (new fields `seasonSeed`, `weatherDays`). This proves the refactor is behaviour-neutral. Then the main case re-baselines: `weather`, `snowDepth`, `snowQuality`, `arrivals`, `satisfaction`, `cashDelta`, `cash`, `reputation`, `beats`, `pendingBeat` may move from night 1; `final` gains `seasonSeed` and `weatherDays`.
- Balance harness: run `npm run balance` before and after and paste both tables. Expect higher end cash and satisfaction across the board because thaw days fall from about 50% to about 27%. If property 2 ("some combinations lose money") or the passive-season band breaks, do not retune in this PR; record the failure, mark the property `it.fails` with a comment pointing at PR 20, and fix it there. (Proposed default; see open decisions.)

### Verification

Night sheet at the four viewports with the forecast row; the forecast row reads as icon plus words plus percent. A gusty day at 1x shows the chair stop at 10:30 and restart at 13:00, with the hold chip on the ConditionsBoard. Reduced motion: no wind animation on the chip.

### Acceptance criteria

- `rollMorningWeather` no longer exists; `grep -rn "% 10" web/src/game` finds no weather code.
- Same seed, same strategy, same 28 days of weather.
- The legacy case reproduces the old snapshot's nights exactly.
- Night sheet shows tomorrow's odds; Amira's shows two days.
- Chair holds on gusty days and the HUD says why.

### Risks and edge cases

- Saves: a v8 save has no `weatherDays`. Migration generates the remainder of the season from the save's `rngState` via `mix32`, so the same save always migrates to the same weather.
- Determinism: never call `Math.random` in weather code; a lint rule (`no-restricted-properties` on `Math.random` inside `src/game/`, except `store.ts` `freshSeed`) catches it.
- Balance: a wetter winter makes the hill easier; PR 20 and PR 27 own the retune.
- The preview's per-kind arrivals call `meanArrivals` four times per fare tile (12 calls per render); memoise per night on `dayIndex`.

### Scope, docs, size, decisions

Out of scope: temperature as a number, multi-day storms with snowfall totals, wind on surface lifts, weather visuals (snowfall shader is M4 PR 30).

Docs: SIMULATION_SPEC "Weather" section (new), Randomness row to implemented, Night choices row; MASTER_PLAN row 18 and the "Weather is a formula" audit line; ART_DIRECTION icon list.

Size: about 330 lines. Cut wind holds into PR 18b if over 400.

Open decisions:
1. Retune balance in PR 18 or defer to PR 20. Default: defer, mark broken properties `it.fails` with a pointer.
2. Forecast skill 0.5 for everyone. Default: yes; a sharper forecast for everyone would erase Amira's bonus.

---

## PR 19: 28-day calendar

**Goal:** make season length, weekdays, weekends and holidays per-mountain calendar data and move Dutch Hill to 28 days.

**Depends on:** PR 25, PR 18 (weather generation takes the calendar).

**Player-visible result:** the top bar reads "Day 22/28 · Mon 16 Feb" and flags holidays; the last week is February vacation week with bigger crowds; the season ends after day 28.

### Design

```ts
// game/calendar.ts (new)
export type DayKind = "weekday" | "weekend" | "holiday";
export type CalendarDef = {
  length: number;                 // 28
  startWeekday: 0;                // 0 = Monday; day 1 is a Monday
  startDate: { month: 1; day: 26 }; // labels only, year-free
  holidays: { day: number; label: string }[];
  holidayWeeks: { from: number; to: number; label: string }[];
};
export const DUTCH_HILL_CALENDAR: CalendarDef = {
  length: 28,
  startWeekday: 0,
  startDate: { month: 1, day: 26 },
  holidays: [{ day: 22, label: "Presidents' Day" }],
  holidayWeeks: [{ from: 20, to: 28, label: "February vacation week" }],
};
export function dayKind(cal: CalendarDef, day: number): DayKind;
export function dayLabel(cal: CalendarDef, day: number): { weekday: string; date: string; note?: string };
```

Day 1 is Monday 26 January, so day 6 stays a Saturday (the current `isWeekend` mapping is unchanged), day 22 is Monday 16 February and day 28 is Sunday 22 February. All holidays fall on day 20 or later, so days 1 to 14 behave exactly as today. That gives a clean snapshot check (see Tests). The calendar matches MASTER_PLAN's season shape: days 1 to 7 learn the loop, 8 to 21 expand, 22 to 28 peak week.

Calendar lives on the mountain definition: add `calendar: CalendarDef` to the Dutch Hill mountain data (`game/mountains/dutchHill.ts`, or the site file from 2d). `createInitialState` sets `seasonLength = calendar.length`. `SEASON_LENGTH` in `types.ts` is deleted.

Demand (proposed): a holiday uses the weekend base (24 + noise) and the ×1.3 multiplier; a weekday inside a holiday week uses the weekday base ×1.15 and the weekend persona mix (60% regulars). `isWeekend(day)` is replaced by `dayKind(calendar, day)` at every call site: `sim.ts` `arrivalCount`, `createInitialGuests` (mix), `readyStoryBeat` (Saturday beat stays Saturday only), `balance.ts` `DayRecord.weekend`, `NightRecapSheet` tab label.

No new persisted field is needed if the calendar is looked up from the mountain id. Add `mountainId: "dutch_hill"` to `PersistedState` now (M5 needs it anyway) and bump the version.

Fix while here: `sim.ts` `beatGateMet` case `winter_review` reads the constant `SEASON_LENGTH`; it must read the state's season length. It is dead code today (`readyStoryBeat` skips that beat) and PR 23 replaces it; delete it.

### Files

- `web/src/game/calendar.ts` (new); `web/src/game/mountains/dutchHill.ts` (exists).
- `web/src/game/types.ts`, `sim.ts`, `state.ts`, `rules.ts`, `balance.ts`, `weather.ts` (exist).
- `web/src/ui/Hud.tsx` (exists): `TopBar` shows `dayLabel`; a small holiday flag chip (flag icon plus "Holiday") when `dayKind` is holiday or holiday week.
- `web/src/ui/NightRecapSheet.tsx` (exists): tab reads "Dutch Hill, Monday 16 Feb night".
- `web/src/game/balance.test.ts`, `balance.report.test.ts` (exist).

### Tests

- `calendar.test.ts` (new). `dayKind` covers single days and `inHolidayWeek(cal, day)` is a separate boolean, so a holiday-week Tuesday is a weekday in a holiday week. Assert with `DUTCH_HILL_CALENDAR`: `dayKind(6)` and `dayKind(7)` are `"weekend"`, `dayKind(8)` is `"weekday"`, `dayKind(22)` is `"holiday"`, `dayKind(23)` is `"weekday"` with `inHolidayWeek(23) === true`, `inHolidayWeek(19) === false`. `dayLabel(cal, 1)` is `{ weekday: "Mon", date: "26 Jan" }`; `dayLabel(cal, 7).date === "1 Feb"`; `dayLabel(cal, 28).date === "22 Feb"`.
- Arrivals: for the same seed and inputs, day 23 (holiday-week Tuesday) plans at least as many guests as day 16 (plain Tuesday), and its roster mix is 60% regulars within sampling over 200 seeds.
- `runSeason` returns 28 days; `sleep` on day 28 opens `winter_review`.
- Snapshot. Allowed changes: `nights` grows from 14 to 28 entries. The first 14 entries must be byte-identical to the PR 18 snapshot (assert this in the PR by diffing; the calendar does not touch days 1 to 14). `final.seasonLength` 14 to 28; `final.mountainId` appears. Nothing else.
- Balance harness: the property file switches to 28 days. Keep a 14-day run available (`runSeason(seed, strategy, founder, { seasonLength: 14 })`) because PR 20's requirement compares both. Re-run the 40-seed table at 28 days and paste it. SIMULATION_SPEC predicted Cheap / Minimal ends near $6,800 at 28 days with the old weather; record the real figure.

### Verification

Top bar at 375x667 must fit "Day 22/28 · Mon 16 Feb" plus the holiday chip without wrapping the clock; if it cannot, drop the date at widths under 380 px and keep it in the night tab. The flag chip has a text label.

### Acceptance criteria

- `seasonLength` comes from calendar data; changing `DUTCH_HILL_CALENDAR.length` to 21 in a test gives a 21-day season with no other edit.
- Days 1 to 14 of the characterization season are unchanged.
- Holiday days and the vacation week draw more and different guests, shown in the arrivals test.

### Risks and edge cases

- Saves: a mid-season save from a 14-day build keeps `seasonLength` 14 and finishes that winter at 14; the next `startNewSeason` uses 28. A save already in `winter_review` stays there.
- Weather for a migrated mid-season save must cover days up to the save's `seasonLength`, so PR 18's migration reads `seasonLength`.
- Session length: at 1x a day takes about 255 s (510 game minutes at 0.5 s), so 28 days are about 2 hours of day time plus nights. The P1 script's "45 to 60 minutes" cannot cover a full winter without skipping. See PR 27.

### Scope, docs, size, decisions

Out of scope: year-specific dates, Christmas week, season start choice, night skiing hours.

Docs: SIMULATION_SPEC Time (season 28), new Calendar subsection, Arrivals (holiday rows); MASTER_PLAN row 19 and the audit line "Season is 14 days".

Size: about 170 lines.

Open decisions:
1. Season dates. Default: 26 January to 22 February, which keeps days 1 to 14 identical and puts the peak week last. Alternative: start on 22 December with Christmas week as days 4 to 10; rejected because it reshapes the learn-the-loop week.
2. Holiday-week multiplier 1.15. Default: yes, tune in PR 27.

---

## PR 20: Economy and fail-soft

**Goal:** make money a real constraint over 28 days: complete daily costs, construction paid in stages, a low-cash warning, one bank loan and a bankruptcy ending, with a balance requirement that no strategy goes broke in 14 days and a careless one risks it in 28.

**Depends on:** PR 25, PR 19. Reads venue revenue from PR 16 if present.

**Player-visible result:** the night sheet shows a one-line money summary with a "Why?" breakdown of today's costs; buildings and lifts show "40% now, rest over two nights"; the cash chip turns yellow under $1,500 and red below zero; when tomorrow morning would start below zero, a bank card offers a $10,000 loan; three negative mornings in a row end the winter early with "The bank called".

### Design

Costs at the time this row was written: `DAILY_FIXED_COST` $750 (retuned to $1,095 in PR 68; SIMULATION_SPEC holds the live value), founder `fixedCostDelta` (Marco +$80), `LIFT_OPS_COST` $180 per open lift with a minimum of one, snow and service $0 / $150 / $350 charged at Sleep, lift and building prices charged in full at purchase. Revenue: `arrivals × fare × (0.5 + 0.7 × satisfaction / 100)`.

Additions (proposed numbers):

| Item | Value |
|---|---|
| Building upkeep per day | lodge $60, café $40, shop $25, snow guns $40; warming hut $0 |
| Construction draw | 40% at purchase, 30% at each of the next two Sleeps |
| Low-cash warning | cash below $1,500 |
| Loan | $10,000 once per winter; 8% for the winter, accrued daily on the balance (`0.08 / seasonLength` per day); Tom 7% (PR 22) |
| Repayment | optional at night when cash ≥ balance + $2,000; any balance is deducted from net worth at the winter review |
| Bankruptcy | three consecutive mornings with cash below $0 end the season |

Construction stays usable immediately (a lift placed at 11:00 carries guests at 11:00), so "see it, fix it" holds; only the cash leaves in stages. Undo before the clock moves refunds the deposit and cancels the payable.

```ts
// game/economy.ts (new)
export type Payable = { what: "lift" | BuildingId; liftIndex?: number; amount: number; dueDay: number };
export type Loan = { principal: number; balance: number; ratePerDay: number; takenDay: number } | null;
export type CostLines = {
  fixed: number; founder: number; liftOps: number; upkeep: number;
  snowNight: number; draws: number; interest: number;
};
export function dailyCosts(state: GameState): CostLines;          // pure
export function morningCash(state: GameState): number;           // cash after tonight's Sleep, pure
export function loanOffered(state: GameState): boolean;           // morningCash < 0 && !loanTakenThisWinter
// PersistedState additions
payables: Payable[];
loan: Loan;
loanTaken: boolean;      // one per winter
debtMornings: number;    // consecutive mornings below $0
outcome: "playing" | "finished" | "bankrupt";
```

Rules: `rules.takeLoan(state)` (night only, when offered) adds $10,000 to cash. `rules.repayLoan(state)`. `sleep` charges snow and service, due payables, upkeep is part of `cashDelta` at `openNight`, interest at Sleep; after Sleep, `debtMornings = cash < 0 ? debtMornings + 1 : 0`; at 3 the phase becomes `winter_review` with `outcome: "bankrupt"`. `buyBuilding` and `placeLift` check `cash >= deposit`, not the full price, so a player can overcommit; that is intended pressure.

`NightRecap` gains `costs: CostLines` and `revenue: number`; `why.ts` gets `moneyLines(recap)` for a second "Why?" disclosure under Cash today.

Balance harness:

- `runSeason(seed, strategy, founder, opts?: { seasonLength?: number; takeLoan?: boolean })`; strategies take the loan when offered (default true).
- New strategy `CARELESS` (proposed): Cheap / High every night; buys lodge, café, snow guns and shop on day 1 to 3 as deposits allow, and the chair on the first day it can pay the deposit, ignoring any reserve.
- `SeasonResult` gains `wentBankrupt`, `tookLoan`, `endNetWorth`.

Requirement as properties:

1. With `seasonLength: 14`, no strategy in `STRATEGIES` plus `CARELESS` has `minCash < 0` on any of the 6 test seeds (and none of the 40 report seeds).
2. With 28 days, `CARELESS` goes below $0 on at least 2 of the 6 test seeds and at least 25% of the 40 report seeds.
3. With 28 days, no fixed combination and neither adaptive nor builder goes bankrupt on any seed.

Tuning arithmetic for properties 1 and 2: with total spend `S` and a steady daily loss `L`, the careless player goes negative between day 14 and day 28 when `(12000 − S) / 28 < L < (12000 − S) / 14`. With all four buildings plus the chair at Mid (S = $8,600 with today's prices) that window is $121 to $243 a day. Cheap / High lost about $150 a day over 14 days in the PR 10b table before upkeep; upkeep adds $165. Expect to trim upkeep or the careless spend list until the careless loss sits near $180 a day; tune one lever, record it in the PR.

### Files

- `web/src/game/economy.ts` (new).
- `web/src/game/rules.ts`, `sim.ts` (`buildNightRecap` takes cost lines), `state.ts`, `types.ts` (`BUILDING_UPKEEP`, `CONSTRUCTION_DRAW`, `LOAN`), `why.ts`, `balance.ts`, `balance.test.ts` (exist).
- `web/src/ui/LoanCard.tsx` (new): bank card on the night sheet.
- `web/src/ui/NightRecapSheet.tsx`, `Hud.tsx` (cash chip states), `BuildSheet.tsx` (deposit and schedule line) (exist).

### Tests

- `economy.test.ts` (new): `dailyCosts` on a fresh Elena state with one surface lift returns `{ fixed: 750, founder: 0, liftOps: 180, upkeep: 0, ... }`; with lodge and café, `upkeep` is 100.
- Buying the café ($1,200) on day 2 takes $480 at purchase, $360 at the day-2 Sleep and $360 at the day-3 Sleep; total equals `BUILDING_COSTS.cafe`. Undo of a lift before the clock moves restores cash exactly and empties `payables`.
- `loanOffered` is false at cash $500 with morningCash $200, true when morningCash is −$1; false after `takeLoan`.
- Interest is simple, on the principal still owed (proposed): a $10,000 loan taken before the day-1 Sleep of a 28-day winter, never repaid, has `balance` 10,800 after 28 Sleeps (`10000 + 28 × 10000 × 0.08 / 28`). Repaying $4,000 on night 10 lowers later daily interest to `6000 × 0.08 / 28`.
- Bankruptcy: force cash to −$100 for three Sleeps; the third Sleep returns `phase: "winter_review"`, `outcome: "bankrupt"`. Two negative mornings then a positive one reset `debtMornings` to 0.
- Fail-soft order: the first negative morning is always preceded by a night where `loanOffered` was true (property over the 40-seed CARELESS runs with `takeLoan: false`).
- Balance properties 1 to 3 above. Existing properties re-checked at 28 days; any margin that moves gets a new number with the 40-seed table pasted in the PR.
- Snapshot. Allowed changes: `cash` and `cashDelta` on nights 2 onward (the café on day 2, the chair on day 4, upkeep); `final` gains `payables`, `loan`, `loanTaken`, `debtMornings`, `outcome`. `arrivals`, `satisfaction`, `snowQuality`, `snowDepth`, `weather`, `reputation`, `beats`, `talents` must not change. If an Abominable Snowglomerate or other beat gate reads cash later, that changes in PR 23, not here.

### Verification

Cash chip: yellow with a warning-diamond icon under $1,500, red with a minus sign below $0, readable at 375x667. Loan card at the four viewports: two full-width buttons, "Take the $10,000 loan" and "Not tonight", each at least 56 px, with the rate and the repayment rule in one sentence. The money "Why?" list is reachable by keyboard and screen reader (disclosure button with `aria-expanded`).

### Acceptance criteria

- Every dollar that leaves cash appears on a recap line or the money "Why?" list.
- The three balance properties pass on 6 seeds in `npm test` and on 40 seeds in `npm run balance`.
- A bankrupt season ends in the winter review, never a dead end.

### Risks and edge cases

- Saves: a save made mid-construction under the old rule has no payables; migration sets `payables: []`, `loan: null`, `loanTaken: false`, `debtMornings: cash < 0 ? 1 : 0`, `outcome: "playing"`.
- A lift undone after a Sleep cannot be undone (existing rule), so payables never refund after the first night.
- Determinism: no RNG in economy code.
- Balance: building upkeep makes the lodge and café worse investments until PR 16's venue revenue is tuned; check builder and adaptive in the table.

### Scope, docs, size, decisions

Out of scope: wages, hiring, per-venue pricing (M7 Ledger), loan refinancing, multiple loans, the Ledger itself (M5 PR 38).

Docs: SIMULATION_SPEC Economy (upkeep, staged draws, loan, bankruptcy; remove "interest stub"), Balance (requirement and the 14 vs 28 tables); MASTER_PLAN row 20.

Size: about 380 lines. Cut repayment and the money "Why?" list into a follow-up if over 400.

Open decisions:
1. Simple or compound interest. Default: simple, shown as one dollar figure.
2. Bankruptcy after three negative mornings. Default: three; two felt abrupt in the arithmetic above because a single thaw day can cost $400.
3. Construction draw 40/30/30. Default: yes.

---

## PR 21: Crew talents with real effects

**Goal:** expand the crew list from 12 to 20 talents in a fixed crew order, give every talent a numeric effect in the sim, and test each one.

**Depends on:** PR 18 (wind, storm), PR 19 (weekdays, Sundays), PR 20 (costs). Talent 8 reads PR 16's café; talents 9 and 13 need a chair (PR 15).

**Player-visible result:** each morning note names what the crew learned and what it does in one line ("Crew learned Snow Fences: thaw strips 30% less snow at the bottom"). Talents whose facility is missing say so ("waits for a chair").

### Design

Today 12 talents exist in `content.ts`; five have effects in code (`trail_guns`, `groom_pass` and `corduroy` sharing one bonus, `ticket_booth`, `patrol_radio`, `school_day`). The crew learns the first unowned talent every Sleep (`learnNextTalent`), so a 28-day winter learns all 20 by the morning of day 21. Keep that pace.

```ts
// game/types.ts (exists)
export type CrewMember = "frank" | "dana" | "elena";
export type TalentDef = {
  id: TalentId;           // string union of the 20 ids below
  name: string;
  crew: CrewMember;
  effect: string;         // one line, shown in the morning note
  needs?: "chair" | "cafe" | "lodge";  // dormant until present
};
// game/talents.ts (new)
export const TALENT = { /* every numeric constant below, by id */ } as const;
export function hasTalent(state: Pick<GameState, "talentsOwned">, id: TalentId): boolean;
export function activeTalent(state: GameState, id: TalentId): boolean; // owned and its `needs` met
```

Crew order and effects (constants proposed unless the "Today" column says implemented):

| # | Id | Name | Crew | Effect | Today |
|---|---|---|---|---|---|
| 1 | `rope_tow` | Rope Tow | Frank | Surface lift ops $180 → $140 per day | text only |
| 2 | `trail_guns` | Trail Guns | Frank | Gun reach +0.25 at Mid; guns cover every segment at High | implemented |
| 3 | `groom_pass` | Groom Pass | Frank | Groom target +0.07 | implemented |
| 4 | `ticket_booth` | Ticket Booth | Elena | Weekend and holiday arrivals +1 | implemented (weekends) |
| 5 | `patrol_radio` | Patrol Radio | Dana | All lift capacity ×1.05 | implemented |
| 6 | `school_day` | School Day | Elena | Weekday arrivals +2; opens the School bus beat gate | implemented |
| 7 | `house_band` | House Band | Elena | Arrival mood +0.03 on Fri, Sat, Sun and holidays | text only |
| 8 | `cafe_shift` | Café Shift | Elena | Café venue value +$2 (needs café) | text only |
| 9 | `wind_hold` | Wind Hold | Dana | Chair hold window 10:30 to 13:00 shrinks to 11:00 to 12:15 (needs chair) | text only |
| 10 | `corduroy` | Corduroy | Frank | Groom target +0.03 more (stacks with Groom Pass) | shares Groom Pass bonus |
| 11 | `snow_fences` | Snow Fences | Frank | Thaw depth loss ×0.7 on the bottom two segments | new |
| 12 | `heritage_sign` | Heritage Sign | Elena | Reputation +2 at each Sunday Sleep | text only |
| 13 | `bull_wheel` | Bull Wheel Tune | Frank | Chair capacity ×1.05 (stacks with Patrol Radio) (needs chair) | new |
| 14 | `ski_school` | Ski School | Elena | First-timer arrival mood +0.05 | new |
| 15 | `early_plow` | Early Plow | Frank | Storm-day arrival penalty −5 → −2 | new |
| 16 | `volunteer_patrol` | Volunteer Patrol | Dana | Daily fixed cost −$50 | new |
| 17 | `night_lights` | Night Lights | Frank | Lifts load until 15:55 instead of 15:45 | text only |
| 18 | `groomer_rebuild` | Groomer Rebuild | Frank | Snow & service cost Mid $150 → $120, High $350 → $300 | new |
| 19 | `first_aid_hut` | First Aid Hut | Dana | Negative snow term ×0.85 (guests forgive ice with patrol on hand) | new |
| 20 | `route100_billboard` | Route 100 Billboard | Elena | Expected hill value +$2 (more arrivals at every fare) | new |

Order rationale: Frank's snow and lift work comes first because thaw and ice are the first problems a new player sees; Elena's people talents arrive in the first weekend; Dana's patrol talents follow the first gusty days.

Moved versus today: `groom_pass` 4 → 3, `ticket_booth` 5 → 4, `patrol_radio` 6 → 5, `school_day` 8 → 6, `house_band` 3 → 7, `cafe_shift` 7 → 8, `night_lights` 11 → 17. `rope_tow`, `trail_guns`, `wind_hold`, `corduroy` and `heritage_sign` keep positions 1, 2, 9, 10 and 12. A save that owns talents not yet reached in the new order keeps them (ownership is a set); the next learned talent is the first unowned in the new order.

Where each effect lands in code:

| Id | Code site |
|---|---|
| rope_tow, volunteer_patrol | `economy.ts` `dailyCosts` |
| groomer_rebuild | `economy.ts` snow night cost; `rules.previewOvernight` cost |
| trail_guns, groom_pass, corduroy, snow_fences | `snow.ts` `overnightTrail` (and `softenTrail` for snow fences) |
| ticket_booth, school_day, early_plow, route100_billboard | `sim.ts` `arrivalCount`, `satisfaction.ts` `expectedHillValue` |
| house_band, ski_school, cafe_shift, first_aid_hut | `satisfaction.ts` (arrival mood, venue value, snow term) via `SatisfactionContext` |
| patrol_radio, bull_wheel | `lifts.ts` `liftCapacityPerHour` |
| wind_hold | `weather.ts` hold window |
| night_lights | `sim.ts` `tickGuests` lift close, `rules.ts` lap overhead |
| heritage_sign | `rules.ts` `sleep` on Sundays |

`SatisfactionContext` gains `firstTimerMoodBonus`, `snowPenaltyScale`; `arrivalMood` is computed per persona for Ski School. `liftCapacityPerHour(type, talentsOwned)` keeps its signature.

### Files

- `web/src/game/talents.ts` (new); `web/src/game/content.ts` (exists, the 20-row list).
- `web/src/game/types.ts`, `sim.ts`, `snow.ts`, `lifts.ts`, `satisfaction.ts`, `economy.ts`, `rules.ts`, `weather.ts` (exist).
- `web/src/ui/Hud.tsx` `MorningNote` (exists): learned talent name plus its `effect` line; dormant note.
- `web/src/ui/NightRecapSheet.tsx` (exists): "Tomorrow the crew learns X: effect" line.

### Tests

`talents.test.ts` (new). Each talent gets one test that compares a state with and without the talent and nothing else different:

| Id | Assertion |
|---|---|
| rope_tow | `dailyCosts(s).liftOps` 180 → 140 with one surface lift; 180 → 140 + 180 with surface plus chair |
| trail_guns | High night with guns: every segment gains depth 0.20 with the talent, bottom half only without (existing test moves here) |
| groom_pass | Mid night from quality 0.4 followed by a clear morning (−0.02): 0.61 without, 0.68 with |
| ticket_booth | `meanArrivals` on a Saturday +1; on a Tuesday unchanged; on day 22 (holiday) +1 |
| patrol_radio | `liftCapacityPerHour("surface")` 47 → 49.35 |
| school_day | `meanArrivals` on a Tuesday +2; `beatMetrics(s).schoolDay` true |
| house_band | `arrivalMood` on a Saturday +0.03; Tuesday unchanged |
| cafe_shift | `venueValue` with café +2; without café 0 (dormant) |
| wind_hold | gusty day: chair dispatches resume at 735 minutes instead of 780 |
| corduroy | same night with Groom Pass: 0.68 → 0.71 |
| snow_fences | thaw night: bottom segment depth loss 0.14 → 0.098 |
| heritage_sign | Sunday Sleep: reputation +2; Monday Sleep: +0 |
| bull_wheel | chair capacity 50 → 52.5; with Patrol Radio 55.125 |
| ski_school | first-timer arrival mood +0.05, regular unchanged |
| early_plow | storm-day `meanArrivals` +3 versus without |
| volunteer_patrol | `dailyCosts(s).fixed` 750 → 700 |
| night_lights | a regular finishing a run at 15:40 joins the line with the talent and departs without it |
| groomer_rebuild | Sleep at Mid charges 120, at High 300; `previewOvernight(s, "high").cost === 300` |
| first_aid_hut | a guest with snow term −10 scores −8.5 |
| route100_billboard | `expectedHillValue(40, ["warming_hut"])` 39 → 41 |

Plus: `CREW_TALENTS.length === 20`, ids unique, every id appears in `TALENT` or the table above; a 28-day season owns exactly 20 talents at the review (28 Sleeps, one talent per Sleep while any remain); a dormant talent counts as owned and the morning note says what it waits for.

Snapshot: re-baseline. Allowed first changed night: night 2 (Rope Tow is learned on the night-1 Sleep and changes day 2's costs). Every key may move from night 2 on; `final.talentsOwned` is empty after `startNewSeason` as before. In the PR, list the first night each key changed and the talent that caused it.

Balance harness: re-run the 40-seed table; talents make every strategy better, so the PR 20 properties are the ones to watch. Retune by one lever if property 2 (careless goes negative) breaks, and record it.

### Verification

Morning note with a two-line talent message at 375x667 does not cover the ConditionsBoard; the dormant line uses a muted icon plus text.

### Acceptance criteria

- 20 talents, each with a passing with-and-without test.
- No talent id is checked with a string literal outside `talents.ts` and the table's code sites (`grep -rn 'includes("' web/src/game` shows only `talents.ts`).

### Risks and edge cases

- Saves: talent ids are strings in `talentsOwned`; the eight new ids need no migration. The order change is safe because learning picks the first unowned id. No version bump unless the `TalentDef` change touches persisted data (it does not).
- Balance: 20 small boosts compound; the passive Balanced / Mid season may leave its band. PR 27 owns the final tune; record the drift here.
- Determinism: none of the effects draw randomness.

### Scope, docs, size, decisions

Out of scope: a talent tree, manual picking (Sandbox M6), founder-specific talents, talent visuals beyond the existing groom stripes and gun plumes.

Docs: SIMULATION_SPEC "Crew talents" rewritten as the table above with implemented markers; WORLD.md "Relationship to talents and crew" (crew owners); MASTER_PLAN row 21 and the audit line "8 of 12 crew talents do nothing".

Size: about 300 lines of non-test code. Cut talents 13 to 20 into PR 21b if over 400; 12 tested talents still meet the row.

Open decisions:
1. One talent per night for 28 nights. Default: yes; the last week runs with the full crew, which suits the peak week.
2. First Aid Hut softens a negative term, which is a judgment call on "honest simulation". Default: keep, and show it in the "Why?" snow line as "patrol on hand".

---

## PR 22: Founders complete

**Goal:** make all six founders' bonus and constraint from the SIMULATION_SPEC table live in the sim, with one test per modifier.

**Depends on:** PR 18 (Amira's forecast, Tom's thaw weeks), PR 20 (loan rate, fixed cost, lift ops). Juniper's clearing cost reads PR 13's trail clearing if it exists. Riley's Abominable Snowglomerate lock lands in PR 23 using the flag defined here.

**Player-visible result:** the founder pick lists each founder's bonus and constraint as two short lines with icons, and the effects show up in play: Amira sees two days of forecast, Tom pays less interest and his guests sour in warm weeks, Riley's lifts cost less to run, and so on.

### Design

```ts
// game/types.ts (exists)
export type FounderDef = {
  id: FounderId; name: string; title: string;
  bonus: string; constraint: string;          // replaces `blurb`
  arrivalMoodBonus: number;                    // Elena 0.08
  fixedCostDelta: number;                      // Marco 80
  snowExpectationPenalty: number;              // Amira 0.05
  loanRateDelta: number;                       // Tom −0.01
  warmWeekMoodPenalty: number;                 // Tom 0.075 (= −3 points)
  liftOpsDiscount: number;                     // Riley 0.15
  noSummitLinkEquity: boolean;                 // Riley true
  forecastDays: 1 | 2;                         // Amira 2
  forecastSkill: number;                       // Amira 0.7, others 0.5
  reputationDrift: number;                     // Juniper +0.5 per night
  clearingCostMult: number;                    // Juniper 1.15
  apresRevenueMult: number;                    // Marco 1.10
  lockedBuildings: BuildingId[];               // Elena ["warming_hut"]
};
```

| Founder | Bonus (spec) | Implementation | Constraint (spec) | Implementation |
|---|---|---|---|---|
| Elena | arrivalMood +0.08 | live | cannot demolish warming hut | `lockedBuildings`; no demolish action exists, so the rule is a data flag with a test on a `canDemolish(state, id)` helper that PR 16 or M5 calls |
| Tom | loan rate −1% | `LOAN.rate + loanRateDelta` (8% → 7%) | warm-week satisfaction −3 | on a thaw day when the trailing 7 days (today included) hold 3 or more thaw days, arrival mood −0.075 for every guest (40 × 0.075 = 3 points, shown on the "Welcome" line) |
| Riley | overnight repair 15% | lift ops cost ×0.85 ($180 → $153) (proposed reading; see decisions) | cannot accept Vivian's Dutch Hill offer | Founder restriction enforced by PR 23's reply and explained on the offer |
| Amira | +1 day forecast | `forecastDays: 2`, skill 0.7 / 0.4 | snow expectation +5% | live (0.05) |
| Juniper | glade reputation + | reputation +0.5 per night before rounding (proposed), cap 100 | clearing cost +15% | lift price ×1.15 (a lift line is a cleared corridor); trail clearing ×1.15 if PR 13 priced clearing |
| Marco | après revenue +10% | venue revenue (PR 16 café, shop, lodge) ×1.10; ticket revenue unchanged | fixed cost +$80/day | live |

Mismatches on `main` to fix in this PR, all verified in `content.ts` and `sim.ts`:

- Tom has `snowExpectationPenalty: 0.03`; the spec gives Tom none. Set it to 0.
- Riley 0.02, Juniper 0.04 and Marco 0.03 carry `arrivalMoodBonus` values the spec does not list. Set them to 0 (proposed; see decisions).
- `sim.ts` `arrivalCount` adds `round(arrivalMoodBonus × 20)` guests per day (Elena +2). It is undocumented in SIMULATION_SPEC. Keep it for Elena and document it as "families arrive", or remove it; default keep and document.
- `FOUNDERS[].blurb` copy contradicts some rules ("Lift limps overnight"). Replace with `bonus` and `constraint` lines generated from the table.

### Files

- `web/src/game/content.ts`, `types.ts`, `rules.ts` (`arrivalMood`, `satisfactionContext`), `economy.ts`, `weather.ts`, `sim.ts`, `satisfaction.ts` (exist).
- `web/src/ui/FounderPick.tsx` (exists): two lines per card, each with an icon (plus sign for bonus, warning diamond for constraint).
- `web/src/game/founders.test.ts` (new).

### Tests

One test per modifier, each comparing the founder against Elena with all else equal:

- Elena: `arrivalMood(["warming_hut"], "elena") === 0.78`; `canDemolish(elenaState, "warming_hut") === false`, `true` for others.
- Tom: loan balance after 28 Sleeps is $10,700; on a thaw day with thaw on 3 of the last 7 days, Tom's arrival mood is 0.075 lower than the same state with 2 thaw days.
- Riley: `dailyCosts(rileyState).liftOps === 153` with one lift.
- Amira: `outlookFor(state, 2)` is non-null for Amira and null for Elena; tomorrow's true kind has probability at least 0.7; her snow expectation is 0.60.
- Juniper: call the reputation update directly with reputation 40 and day satisfaction 60 and no beat: Juniper gets `round(40 × 0.85 + 60 × 0.15 + 0.5) = 44`, any other founder `round(43.0) = 43`. A chair at Mid costs $2,900 for Juniper (2,500 × 1.15 = 2,875, rounded to $50).
- Marco: venue revenue ×1.10 when PR 16 revenue exists; fixed cost 830.
- Balance: `runSeason` accepts each founder; the report prints a founder table (adaptive strategy, 40 seeds, all six). Property (proposed): no founder's adaptive end score (PR 24 formula, or cash plus satisfaction until then) is more than 15% above or below the median founder.

Snapshot: the characterization plays Elena and none of Elena's numbers change, so the snapshot must not change at all. If it does, the PR changed shared code; fix it.

### Verification

Founder pick at 375x667: six cards, each with name, title and two one-line modifiers, all readable without truncation; cards at least 56 px tall; modifier lines carry an icon plus text.

### Acceptance criteria

- All twelve modifiers in the table are live or, for Elena's lock, enforced by a tested helper.
- No founder carries a numeric field that the spec table does not list, unless the spec is updated in the same PR.
- Snapshot unchanged.

### Risks and edge cases

- Saves: founder data is content, not persisted. No version bump.
- Juniper's reputation drift plus the beat bonus could push reputation to 100 by week 3; clamp and check her row in the founder table.
- Marco's bonus is zero until PR 16 venue revenue exists; if PR 16 shipped without revenue, give Marco ticket revenue ×1.03 as an interim and log the debt (proposed).

### Scope, docs, size, decisions

Out of scope: founder portraits, founder voice lines beyond PR 26's coach intro, demolition as a player action, lift breakdowns.

Docs: SIMULATION_SPEC founder table with implemented markers and the concrete numbers above; WORLD.md founders (bonus lines match the sim); MASTER_PLAN row 22 and the audit line.

Size: about 220 lines.

Open decisions:
1. Riley's "overnight repair 15%". Default: lift ops cost −15%, no new system. Alternative: add nightly lift breakdowns (seeded from the season stream) with Riley repairing overnight; rejected for M3 because it adds a failure system the player has no lever for.
2. Zero the unlisted mood bonuses for Riley, Juniper and Marco. Default: yes, so each founder is exactly their two spec lines.
3. Juniper's glade reputation as +0.5 per night. Default: yes until trails and glades exist (PR 13).

---

## PR 23: Route 100 Radio and Act I choices

Implement this row in Dutch Hill first-winter PRs 3–5. PR 3 delivers the local surprises. PR 4 adds the optional Readsboro visit with L-E. PR 5 adds Vivian's offer with row 22. The first operating decision (first-winter PR 2) comes before these events. Row 24 uses the event and decision records in the winter review.

### Local surprises (first-winter PR 3)

Deliver these after the first operating day. Use the seeded winter and genuine day records. Each day can generate one local moment, which the night recap can report alongside a contract. Keep each occurrence linked to its original day and facts. Hearing a local report requires no acknowledgement. Contract decisions require an explicit reply.

| Event | What happens | What the recap can say |
|---|---|---|
| Pie at the lodge | A quiet local moment at the lodge after operations begin. | Report the pie on the lodge counter. Its baker can remain a mystery. This event has no hidden changes to cash, arrivals, mood or reputation. |
| Former regulars | On some weekdays former regulars arrive together. Use the simulated group and arrival time for the account. | Report the group that actually arrived and use measured wait or demand when it shows up in the recap. |
| Frosty road | Road frost delays some planned arrivals. The same total remains scheduled that day. | Report the delay when it occurs. A quiet opening from delayed arrivals is different from weak demand over the whole day. |

Record the event facts in the save so the recap, winter review and a future story-log screen can draw on the same occurrence. Test the seeded arrival changes through normal day simulation, reload during an event day, a single local report per day, and the pie's lack of mechanical effects. Preserve readable controls on a 390×844 viewport.

### Readsboro school visit (first-winter PR 4)

Once a pupil completes a lesson at the Tier 2 ski school and at least one school weekday outside weekends, holidays and school vacations remains, offer one visit from Readsboro. Show the upcoming weekday, six pupils, the discounted ticket fare and the school capacity needed; allow the operator to accept or decline. The offer is optional and does not change the posted fare for the rest of the guests. Acceptance schedules six pupils for one weekday; it does not credit the optional goal. Record the booked count, actual visits, discounted ticket receipts, lessons delivered and lessons missed. Report the actual visit after close and credit the optional goal from delivered lessons. A visit with no lessons delivered is incomplete. Show any partial result as a count out of six.

Verify accepting, declining, reloading after booking and submitting a repeated reply without rescheduling the visit. Verify an accepted visit that cannot deliver all the lessons through the same guest and school rules used on other days. Keep the common solvency goal visible for either path.

### Vivian's offer (first-winter PR 5)

On or after day 18, Vivian may make the first Abominable Snowglomerate offer if reputation is at least 55 and an operating day remains. Show both terms together: $6,000 cash once and a ceiling of Balanced on ticket fares for the rest of this winter. "Stay independent" leaves cash and fare controls as they were. If accepted, apply the cap to the next operating day and every remaining day. Reduce a selected Expensive fare to Balanced and enforce the cap in both the simulation and fare controls. Cheap remains available. Riley can decline and sees the reason he cannot accept before replying. Keep any earlier winter's decision in its record; clear the offer's active cap when a new winter starts.

Record the offer day, actual answer, receipt and the fare cap. Apply the money exactly once and surface it separately from operating revenue. Test accept, decline, Riley, a fare already set to Expensive, repeated replies and reload. A pending, missed or unavailable offer must not appear as an accepted or declined agreement in the review.

### Save and verification

Use the current save versioning and preserve previously recorded events and known facts. Leave unknown dates, counts or decisions unknown. A historical school-bus radio card gives no credit for a visit and an old Abominable Snowglomerate tease gives no credit for a deal. Validate at the rule layer as well as the UI. Report local event incidence, school visits booked and delivered, and actual Abominable Snowglomerate responses in the balance run. Verify night recap and story log at phone sizes with real event facts and both offers.

Out of scope: audio production, Act II, and career consequences beyond the saved Act I record.

---

## PR 24: Winter review

First-winter PR 6 implements this row with the row 27 playthrough and balance checks. End every winter, including bankruptcy, with a review and a record M5 can read.

### Common goal and settlement

The same rule applies to every founder and every combination of answers: complete the 28-day winter with liquid net worth at or above zero. Use end cash after the last operating result and due charges, less the outstanding loan balance and unpaid construction installments. Property resale estimates stay outside this settlement. Three consecutive negative mornings end the winter in bankruptcy as before. An early bankruptcy or negative final liquid net worth leaves the common goal unmet. Show the math and the outcome in terms that agree with the goal card. The current review can record eligibility for the next hill; the career map itself belongs to M5.

### Season record and presentation

- Record day, founder, finished or bankrupt outcome, cash, debt, unpaid construction, liquid net worth, completed days and common-goal result. Write the last day before closing the season.
- Use measured satisfaction and reputation if showing a grade. Keep the grade separate from the common goal and the eligibility decision. Optional story participation earns no points toward solvency or career eligibility. Show the source for every part-score that remains.
- Show a short account of choices and observed results. Use recorded fare or snow tier changes with the corresponding measured comparison where there is one. Include local events only when they occurred. State whether Readsboro was declined, accepted with its actual delivered lesson count, or never scheduled. State whether Vivian was accepted or declined if a decision was recorded, and show the actual $6,000 receipt and fare cap for acceptance. An offer that never arrived needs no reply in the review.
- For an older save, show known facts and let missing history stay unknown. Never infer a successful school visit from a radio message, fill in a season average from reputation, or count an available option as a decision.
- Store the record once on close and keep it through reload and replay. Carry-forward effects belong to M5.

### Verification

Test solvent completion at and above zero, a finished season below zero, and early bankruptcy. Check that all paths use the same settlement, including seasons with a loan, unpaid installments or Abominable Snowglomerate funding. Run review fixtures for an optional school visit declined, an incomplete visit, a delivered visit, Vivian accepted and declined, Riley, and older saves with absent history. Check a 390×844 phone layout and reload before and after the review. Season grading and balance targets should be evaluated with the measured record and remain independent of which offers were accepted.

---

## PR 25: Save versioning

The M3 opening starts a new save under `last-chair-m3` and clears the M2 save and backup. The legacy migration plan below describes the previous format. Apply future schema changes to the M3 save format.

**Goal:** replace the single growing `migrate()` with a versioned migration registry, a validation step and a clean reset path, with a fixture save for every version.

**Depends on:** nothing in M3. Land it first.

**Player-visible result:** old saves keep loading. A save that cannot be loaded starts a fresh game with a one-line notice ("Your last winter couldn't be loaded on this version; starting fresh"), and the old data is kept in a backup key.

### Design

Facts on `main`: `SAVE_KEY = "last-chair-v1"`, `SAVE_VERSION = 7`, and `migrate(persisted, fromVersion)` live in `web/src/game/state.ts`; `store.ts` passes them to zustand `persist` (`version`, `migrate`, `merge: hydrate`). World scale 2b adds v8 (lift coordinates ×6). The handoff brief places `migrate()` in `store.ts`; it is in `state.ts`.

Policy:

1. Any change to `PersistedState` (new field, renamed field, changed meaning or units) bumps `SAVE_VERSION` by exactly one and adds one migration `vN-1 → vN`.
2. A migration is pure, takes the previous version's object and returns the next; it never reads live constants that may change later (freeze literals, as 2b does with `V7_DUTCH_HILL_H = 6`).
3. Every version has a fixture JSON in the repo; fixtures are never edited after merge.
4. After the chain, `validateSave` must return no errors or the save resets.
5. A save from a newer version than the build (a rollback) resets, with backup.
6. The storage key never changes.

```ts
// game/migrations.ts (new)
export type Raw = Record<string, unknown>;
export type Migration = { to: number; note: string; up: (p: Raw) => Raw };
export const MIGRATIONS: Migration[];           // to = 1..SAVE_VERSION, contiguous
export function migrate(persisted: unknown, from: number):
  { state: PersistedState; reset: false } | { state: PersistedState; reset: true; reason: string };
export function validateSave(p: unknown): string[];  // [] means valid
```

The current body of `migrate()` splits into steps 1 to 7 (8 from 2b) with their existing doc-comment text as `note`. `validateSave` checks: `phase` in the enum; `dayIndex` integer in 1..`seasonLength`; `cash`, `reputation`, `rngState` finite; `lifts` passes the existing `liftsUsable` and every lift passes `checkLiftLine` (2b rule); arrays are arrays; `nightRecap` present when `phase === "night"`; every M3 field present with the right type.

Store: zustand's `migrate` cannot report a reset, so `store.ts` wraps it: on `reset: true` it sets a session-only `saveNotice` string and writes the raw blob to `last-chair-v1-backup` (one backup, overwritten) before the new state is persisted. The wrapper lives in `store.ts` because `game/` must not touch `localStorage`.

Mid-season saves across M3 changes:

| From | Handling |
|---|---|
| any save before PR 18 | weather generated for the rest of the season from `mix32(rngState)`; today's `weather` kept |
| before PR 19 | `seasonLength` kept (14) for the current winter; next winter 28 |
| before PR 20 | `payables: []`, `loan: null`, `debtMornings` from cash |
| before PR 23 | `beatLog` from `completedBeats` with `day: 0` |
| before PR 24 | `seasonLog: []`, `career: { records: [], pins: ["dutch_hill"] }` |

### Files

- `web/src/game/migrations.ts` (new); `web/src/game/state.ts` (exists, loses `migrate`, keeps `SAVE_VERSION`, `toPersisted`, `hydrate`).
- `web/src/game/store.ts` (exists): wrapper, backup, `saveNotice`.
- `web/src/game/__fixtures__/saves/v0.json` … `v8.json` (new), then one per later version.
- `web/src/ui/PlayExperience.tsx` (exists): notice chip on load.
- `web/src/game/migrations.test.ts` (new); existing migration tests in `sim.test.ts` or `rules.test.ts` move here.

### Tests

- Registry: `MIGRATIONS.map(m => m.to)` equals `[1..SAVE_VERSION]`.
- Every fixture: `migrate(fixture, n)` returns `reset: false` and `validateSave` returns `[]`; then `rules.tick` to close, `openNight`, `sleep` run without throwing and keep `validateSave` clean.
- Day replay: a v7 fixture mid-day migrated, then played to close, gives the same recap on two runs.
- Reset paths: `migrate({...}, SAVE_VERSION + 1)` resets with reason "newer version"; a fixture with `cash: "NaN"` resets with reason naming the field; `migrate(null, 3)` returns a fresh setup state.
- Existing behaviour kept: the v0 night-without-recap rule, the v7 unusable-lift reset, 2b's v8 coordinate scaling (one assertion each, moved from the old tests).
- Snapshot: no change. Balance: no change.

### Verification

Load the game with each fixture injected into `localStorage` (a Playwright helper in `scripts/` sets the key and reloads) at 390x844; the game opens on the right phase. Inject a corrupt blob; the notice shows, can be dismissed with a 44 px button and is announced (`role="status"`).

### Acceptance criteria

- One migration per version, each with a fixture and a test.
- No save can crash the app on load; every failure path ends in a playable state with a backup.
- `migrate` no longer lives in `state.ts`.

### Risks and edge cases

- Writing fixtures for v0 to v6 by hand: build each from the schema described in the old `migrate()` doc comment; keep them minimal (one guest, one lift) so they are reviewable.
- Zustand calls `migrate` only when the stored version differs; validation of a same-version save needs a `merge` check too (`hydrate` runs `validateSave` and resets on failure).
- Determinism: a migration that needs randomness must use `mix32` of saved data, never `Math.random` (today's v0 path uses `Math.random` for `rngState`; keep that single exception documented, since v0 has nothing to hash).

### Scope, docs, size, decisions

Out of scope: save slots (M6 PR 40), cloud sync, export or import.

Docs: SIMULATION_SPEC "Save format" rewritten as the policy plus a version table; MASTER_PLAN row 25; TESTING P1 setup line ("Clear site data once if an old save is incompatible") replaced by the reset notice.

Size: about 260 lines of non-test code plus fixtures.

Open decisions:
1. Land PR 25 before PR 18. Default: yes.
2. Keep one backup or one per version. Default: one, overwritten; localStorage space on Safari is limited.

---

## PR 26: Coached first winter

**Goal:** the chosen founder walks a new player from placing the first lift and trail to the first Sleep in ten short, skippable tips anchored to real controls, without pausing the day.

**First-winter PR 2** delivers the operator’s first operating decision under L-E and row 26. The later radio and choice PRs build on it. Use the existing founder and speed controls.

**Player-visible result:** after picking a founder, a small speech card with the founder's initials points at one control at a time. Each tip is one sentence, advances when the player does the thing (or after a short timeout), and has "Skip tips". The coach ends at the first Sleep. 2x speed appears after the coach ends.

### Design

Dutch Hill starts with the lodge. Guide the player through placing a lift and painting a connected trail before prompting Play. Tips never pause the clock or cover the night tiles.

At the first recap, use the recorded problem and its evidence to point to a choice the operator can make. Fare shows the trade between ticket price and expected attendance. Snow & service shows cost and its weather-dependent effect. Use the direction supported by the sim, and keep forecasts and expected effects labelled. Show today's count, wait, snow or cash as measured. The next recap can compare the relevant outcome with the prior day's actual value; both numbers need to exist, and intervening changes such as weather and day type remain visible. A quiet or incomplete day still gets an honest recap. Surface the common goal of finishing the winter solvent and leave the optional Readsboro goal to first-winter PR 4.

| # | Step id | Shows when | Anchor (`data-coach`) | Text (Elena's voice; ≤ 90 chars) | Done when |
|---|---|---|---|---|---|
| 1 | `open_tow` | day 1 opening | opening control | "Place a lift and paint a trail that skis back to the base." | lift and trail are ready and clock moves |
| 2 | `first_rider` | first guest dispatched | `ops-queue` | "First rider up. This number is the wait at the busiest lift." | 20 game minutes pass |
| 3 | `mood` | `completedRuns >= 5` or 10:00 | `ops-mood` | "Guests judge lines, snow and price. Their mood shows here." | 20 game minutes |
| 4 | `follow` | after 3 | `guests` | "Tap Guests and follow someone. You'll see their day." | `followId` set, or 45 s real time |
| 5 | `build` | after 4, cash ≥ chair deposit | `build` | "One lift won't hold a Saturday. Build has a chair when you're ready." | Build opened, or 30 s |
| 6 | `close` | clock ≥ 14:00 | `close` | "Seen enough? Close the hill and we'll talk tonight." | night opens |
| 7 | `problem` | night 1 open | `recap-problem` | "Tonight's biggest problem. Tap Why? to see what moved mood." | Why opened, or 20 s |
| 8 | `fare` | after 7 | `fare` | "Cheaper brings more skiers, each paying less. Pick tomorrow's fare." | any fare tile tapped |
| 9 | `snow` | after 8 | `snow` | "More service costs cash. See what tonight’s weather lets the crew do." | any snow tile tapped |
| 10 | `sleep` | after 9 | `sleep` | "Sleep runs the night. The crew learns something by morning." | `sleep` |

Founder voice: step 1's text has a variant per founder in `COACH_INTROS` (six lines); steps 2 to 10 are shared and signed with the founder's name. Timeouts use wall-clock seconds only while the tab is visible and the day is running (the PR 31 morning-note lesson).

```ts
// game/coach.ts (new, pure)
export type CoachStepId = "open_tow" | "first_rider" | "mood" | "follow" | "build" | "close" | "problem" | "fare" | "snow" | "sleep";
export type CoachStep = {
  id: CoachStepId; anchor: string; text: string;
  shows: (s: GameState) => boolean;
  done: (s: GameState, prev: GameState, ui: CoachUiEvents) => boolean;
  timeoutSec?: number; gameMinutes?: number;
};
export const COACH_STEPS: CoachStep[];
export function nextCoachStep(progress: CoachProgress, s: GameState): CoachStep | null;
// ui/coachStore.ts (new): { stepIndex, skipped, finished } persisted under "last-chair-coach"
```

`CoachUiEvents` carries UI-only facts (Why opened, Build opened, tile tapped) that the game state does not hold. Coach progress is per device: a player who finished it on day 1 never sees it again, including after "Replay Dutch Hill winter". A "Replay tips" switch sits in the Story log sheet next to the Radio switch.

UI: `CoachCard` positions itself next to the element with the matching `data-coach` attribute, above it in the thumb zone, with a pointer notch; if the anchor is off-screen it docks at the top under the TopBar. `role="status"`, `aria-live="polite"`, text at least 16 px, "Skip tips" and "Next" buttons at least 44 px. It never traps focus and never blocks taps on the anchored control. Reduced motion: no slide or pulse; the anchored control gets a static 3 px outline instead of the `pulse-ring` animation.

### Files

- `web/src/game/coach.ts` (new); `web/src/game/content.ts` (exists): `COACH_INTROS`.
- `web/src/ui/coachStore.ts`, `web/src/ui/CoachCard.tsx` (new).
- `data-coach` attributes in `web/src/ui/Hud.tsx`, `NightRecapSheet.tsx`, `PlayExperience.tsx` (exist).
- `web/src/ui/StoryLog.tsx` (from PR 23): "Replay tips" switch.

### Tests

- `coach.test.ts` (new): a scripted day-1 state sequence (unpause, first dispatch, five runs, follow, 14:00, close, fare tap, snow tap, Sleep) walks steps 1 to 10 in order; `nextCoachStep` returns null after `sleep`.
- Skipping at step 4 returns null for every later state.
- No step's `shows` is true during `phase: "setup"`; steps 7 to 10 only at night.
- Every step text is ≤ 90 characters; six intros exist, one per founder id.
- The game state after a coached day equals the state after the same inputs without the coach (the coach never writes `GameState`).
- Snapshot: no change. Balance: no change.

### Verification

Run the coach end to end at 390x844 and 844x390, and steps 7 to 10 at 820x1180 and 375x667: the card never covers the anchored control or the Sleep button; every anchor exists at every viewport (a test in the Playwright script fails if `[data-coach="fare"]` is missing). VoiceOver on iPhone if available: each tip is read once.

### Acceptance criteria

- A new player sees ten tips at most, each one sentence, in order, and reaches the first Sleep.
- "Skip tips" ends the coach at any step; it does not return unless replayed.
- The day clock never pauses for the coach.

### Risks and edge cases

- A player who closes the hill before 14:00 skips step 6; steps chain on `shows` so the coach moves to step 7.
- First-night help and any existing radio card leave the decision controls and Sleep reachable.
- No save change; the coach store is separate, so wiping it replays the coach without touching the winter.

### Scope, docs, size, decisions

Out of scope: voice-over, coached later days (the radio and morning notes carry those), a tutorial mountain.

Docs: MASTER_PLAN row 26 and the "2x after the tutorial beat" speed line; TESTING P1 steps 1 and 2.

Size: about 280 lines.

Open decisions:
1. Coach per device. Default: yes.
2. Step 5 suggests a chair the player may not afford. Default: show only when cash covers the chair deposit; otherwise skip to step 6.

---

## PR 27: MVP balance and winter playthrough

**Goal:** tune the full 28-day winter with an expanded balance harness, then verify the winter end to end with the automated P1 script.

**Depends on:** PRs 18 to 26 merged.

**Player-visible result:** numbers change where the harness says they must; nothing new to see. The balance report and automated playthrough record the release evidence.

### Design: harness expansion

`balance.ts` additions:

- `runSeason(seed, strategy, founder, { seasonLength, takeLoan, radio })` already exists from PR 19 to 23; add `allFounders` runs and a founder axis to the report.
- Strategies: the 12 existing, `CARELESS` (PR 20), and `COACHED` (proposed): plays like a first-timer who follows the coach and the problem line: Balanced and Mid for the first week, then the adaptive rules, chair only after the first Saturday queue problem.
- Metrics per strategy: end cash, min cash, net worth, score and grade (PR 24), share of seeds bankrupt, below $0 and solvent at close, local events and actual choice outcomes, mean satisfaction, Saturday and holiday-week waits with and without a chair.

Properties for the MVP (`balance.test.ts`, 6 seeds; report on 40):

| # | Property | Source |
|---|---|---|
| 1 | No fixed combination is best on both end cash and satisfaction | PR 10 |
| 2 | Adaptive beats the median fixed combination on the combined score by 0.15 | PR 10 |
| 3 | No strategy goes below $0 within 14 days | PR 20 |
| 4 | Careless goes below $0 on ≥ 25% of 40 seeds over 28 days | PR 20 |
| 5 | No fixed, adaptive, builder or coached run goes bankrupt | PR 20 |
| 6 | Adaptive and Coached mean winter scores reach 65 (the original “Solid winter” threshold). Stingy stays below 50 (“Held on”). Use measured season satisfaction and reputation. The settlement independently decides solvency. | PR 24 |
| 7 | Each founder's adaptive mean score within ±15% of the median founder | PR 22 |
| 8 | Holiday-week Saturdays without a chair average over 12 minutes in line; with a chair 1 to 5 | PR 19 |
| 9 | The common solvency goal is achievable with no accepted offer. The Readsboro and Vivian paths resolve through the regular simulation. Report local event incidence and offer, reply, and delivery counts separately | PR 23, PR 24 |
| 10 | The game is not solved: the best strategy's score is under 90 on 40 seeds | MASTER_PLAN, ICR "easy once solved" lesson |

Tuning rule (as PR 10): move one constant per symptom, record before and after in SIMULATION_SPEC's Balance section with the 40-seed tables, and say why. Candidate levers in order of preference: building upkeep, holiday-week multiplier, storm arrival penalty, careless spend list, `DAILY_FIXED_COST`.

Snapshot: re-baseline once at the end of tuning. Every key may move; list the constants changed in the PR description next to the diff summary.

### Design: P1 device playtest

The script in TESTING.md predates M3. Replace its table with this one (proposed):

| Step | Action | Pass if |
|---|---|---|
| 1 | Open the link, pick a founder | Bonus and constraint readable; Day 1/28 and the date show |
| 2 | Follow the coach to the first Sleep (or skip it) | Each tip points at a real control; no stuck tip |
| 3 | Guests → Follow | Camera tracks the guest |
| 4 | Build a chair; buy a lodge or café | Deposit taken, schedule shown; change visible on the mountain |
| 5 | Use the first recap to pick an operating change; read the next recap | Player can name the tradeoff and distinguish the forecast from what happened |
| 6 | Read a local event; answer Readsboro or Vivian if offered | Story matches measured events; replies and any effects match the terms |
| 7 | Sleep through a thaw run and a storm | Snow change visible next morning; crew talent line each morning |
| 8 | Reach day 28 (skip to close allowed) | Winter review gives the actual solvency result and accounts for choices and outcomes |
| 9 | Reload mid-night once during the winter | Night sheet restores exactly |
| 10 | Continue → mountain 2 stub → Replay | New winter starts on day 1; career record kept |

At 1×, 28 two-minute days take about 56 minutes of running time, plus time spent building and making night choices. Players can use 2× or 4× speed, close early and resume their saved winter later.

### Optional device sessions

The owner will choose when to play on hardware. Use the P1 protocol in TESTING.md for any future session.


### Files

- `web/src/game/balance.ts`, `balance.test.ts`, `balance.report.test.ts` (exist).
- Constants in `types.ts`, `economy.ts`, `calendar.ts`, `weather.ts`, `talents.ts` as the tuning requires (exist after M3 PRs).
- `web/scripts/playtest-p1.mjs` (new): Playwright run of steps 1 to 10 at 390x844 with skip-to-close and 3x speed, screenshots to `PLAYTEST_OUT`. TESTING.md names `smoke-winter.mjs` for the old P1 run; that file is not in `web/scripts/` on `main`.
- `docs/TESTING.md`, `docs/SIMULATION_SPEC.md`, `.github/ISSUE_TEMPLATE/playtest.md` (new).

### Tests

- The ten properties above.
- `playtest-p1.mjs` completes a 28-day winter in Chromium at 390x844 and WebKit at 390x844 (WebKit from Playwright, closer to Safari) without console errors.

### Verification

Agent run of `playtest-p1.mjs` at the four viewports for M3. Accessibility spot check during the agent run: every interactive element at least 44x44 px (script measures bounding boxes), reduced motion on (`prefers-reduced-motion: reduce` emulation) shows no sheet or coach animation, radio off completes the winter.

### Acceptance criteria

- `npm run check` green with all ten properties.
- 40-seed table and constant changes recorded in SIMULATION_SPEC.
- TESTING.md records the automated results and offers a device script for later.

### Risks and edge cases

- Tuning one property breaks another; keep each change to one constant and rerun the full table.
- External players find a blocking bug late; budget one fix round before the gate.
- Real-device performance: nothing has run on a real iPhone yet (handoff known issues). Do one owner device run before recruiting.

### Scope, docs, size, decisions

Out of scope: analytics or telemetry, more than three external players, Android.

Docs: SIMULATION_SPEC Balance (M3 table, properties, constants changed), TESTING P1 script and sign-off log, MASTER_PLAN row 27 and Gate M3 status.

Size: about 200 lines of non-test code plus the script; constant edits are small.

Open decisions:
1. P1 length: up to 90 minutes over two sittings with speed and skip allowed. Default: yes; the alternative is a shorter 14-day "first winter" for new players, which changes the product.
2. Pay testers. Default: no payment, a thank-you in the credits if they want it.
3. Observed sitting by video call. Default: allowed; in person preferred.

---

## Gate M3 test plan

Use the automated checks below for M3 acceptance. Manual device and accessibility observations can be added when the owner is ready.

| # | Check | How | Pass if |
|---|---|---|---|
| 1 | CI | `cd web && npm run check` on `main` | green |
| 2 | Snapshot history | `git log -p -- web/src/game/__snapshots__/` since 2b | review and explain the current snapshot diff. Historical terrain, lodge and trail changes also updated snapshots before M3. |
| 3 | Determinism | test: `runSeason(s, adaptive)` twice for s in 1..6, and a serialize-reload in the middle of day 10 and night 10 | identical results |
| 4 | Balance | `npm run balance` with `BALANCE_SEEDS=40` | ten PR 27 properties hold; table pasted in SIMULATION_SPEC |
| 5 | Saves | M3 save fixtures v1 to current, in every slot | all load, validate and play one day |
| 6 | Talents | `talents.test.ts` | 20 with-and-without tests pass |
| 7 | Founders | `founders.test.ts` | twelve modifier tests pass |
| 8 | Story | Rule tests and balance report | At most one local moment and one eligible story beat per night. An offer can accompany a local observation. Recorded results agree with the sim |
| 9 | Review | `review.test.ts`; a bankrupt run in the harness | every season ends in a review with a record |
| 10 | Agent P1 | `playtest-p1.mjs` at 390x844, 844x390, 820x1180, 375x667 in Chromium and WebKit | completes; no console errors; no element under 44 px; no overlap in screenshots |
| 11 | Accessibility | same run with reduced motion and radio off | no animation; winter completes; coach and radio announced once |

Docs at the gate: MASTER_PLAN M3 rows all ☑ and Gate M3 status filled; SIMULATION_SPEC implementation table has no 🟡 or ❌ for Time, Economy, Crew talents, Founder modifiers, Story beat gates, Save format, Randomness; WORLD.md beats and founders match the sim.

## Limitations

Numbers labelled proposed (weather transition matrix, storm and wind effects, holiday multipliers, upkeep, construction draw, loan terms, bankruptcy rule, eight new talents and several talent constants, Juniper's drift, Riley's reading, beat thresholds, Abominable Snowglomerate reply, score weights and grades, coach timings) are first values chosen to make each mechanic testable; PR 27 tunes them against the harness and three players, and the weather statistics quoted come from a 4,000-season simulation of the proposed chain, not from Vermont records. The plan assumes M2 (PRs 12b to 17 and world scale 2b to 2d) is merged; where M2 did not add something M3 reads (wind sensitivity in PR 15, venue revenue in PR 16, trail clearing in PR 13), the PR says what to do instead. Save version numbers are relative because M2 may bump the version after v8. Line counts are estimates from similar past PRs. The 14-day balance figures used in worked examples are the PR 10b table, measured before the M3 changes. Dutch Hill is the only mountain in M3; the career record is written for M5 to read, and nothing carries into Tenney yet.


---

# Part C: M4 to M7

This part specifies roadmap rows 28 to 40 and the M7 pass. Row numbers are MASTER_PLAN plan rows. GitHub PR numbers are separate and already collide (GitHub PR #28 removed Vercel; plan row 28 is guest models). Write the plan row in branch names and PR titles, for example `claude/row28-guest-models`, "Row 28: guest models".

Every PR below follows MASTER_PLAN section 7: one goal, under about 400 changed lines of non-test code, `cd web && npm run check` green, phone check, docs in the same PR, merge with `gh pr merge <n> --merge` after green CI. Layering holds throughout: `web/src/game/` is pure TypeScript and never imports from `render/` or `ui/`, tests included. The season characterization snapshot (`web/src/game/__snapshots__/season.characterization.test.ts.snap`) is the sim safety net. A PR marked "no snapshot change" must leave it byte-identical; a PR that changes it pastes the exact `.snap` diff into its description and explains every line.

Hosting is GitHub Pages as a static export (`next.config.ts`: `output: "export"`, `basePath` from `PAGES_BASE_PATH`, `/last-chair` in the deploy workflow). There is no server code, no API routes, no runtime image optimisation. Every asset is a static file under `web/public/`, and every URL in code is built from `process.env.NEXT_PUBLIC_BASE_PATH` the way `render/kit.ts` does it (`${BASE}/models/${name}.glb`).

Standard phone check for every player-visible PR in this part, unless a PR says otherwise:

| Viewport | Device stand-in | What to look at |
|---|---|---|
| 390x844 | iPhone 12 to 15 portrait | Home view, sheets, HUD overlap |
| 844x390 | iPhone wide | Day view (the main play orientation on iPhone) |
| 820x1180 | iPad Air 11" portrait | Sheet widths, map scale |
| 375x667 | iPhone SE | Smallest target; bottom HUD stack and safe areas |

Use `web/scripts/phone-check.mjs` from world-scale part 3 when it exists (waits on `[data-scene-ready="true"]`, reports draw calls and triangles). Until then, take screenshots with Playwright Chromium at those sizes and attach them to the PR. Real iPhone Safari has not run anything since PR 10; each PR records whether a real device was used.

Preconditions for the whole of Part C: M3 gate passed (rows 18 to 27 merged, automated P1 checks passed), world scale 2b, 2c, 2d and part 3 merged, rows 12b, 12c, 13 to 17 merged. Where a PR below names a file or field from those rows, it is the planned name from Part B and the 2b handoff; confirm it exists before coding.

---

## PR 28: Guest models

### Goal
Replace the single kit skier with a small pool of readable skier and snowboarder silhouettes whose jacket colour can show guest state, without adding draw calls.

### Depends on
2b (skier minimum size `max(1, cameraDistance / 25)` in `Guests.tsx`), 12b (guests read `LiftLine` and `bottom`). No sim dependency.

### Player-visible result
Skiers come in a few body shapes: adult, kid, a long-coat adult, and snowboarders riding sideways. Riders on the chair sit, T-bar riders lean. A "Colour by mood" lens in the Guests sheet recolours every jacket by mood band so the player can see where the unhappy guests are.

### Design

What exists: one `skier.glb` (468 tris, 12.5 KB) with split materials `jacket`, `pants`, `helmet`. `Guests.tsx` draws four instanced meshes (body, jacket, hat, shadow proxy), `MAX = 48` instances, jacket colour from `idHash(id) % JACKETS.length`. Nothing reads guest state for colour.

Assets (Blender, `tools/blender/lift.py` `b_skier` is the template; add the new builders beside it):

| Asset | Silhouette | Tris max | Size max | Notes |
|---|---|---|---|---|
| `skier.glb` (rework) | adult skier, poles | 450 | 15 KB | keep hip at 0.98 m (`HIP_M`) |
| `skier-kid.glb` | 1.2 m, no poles | 350 | 12 KB | scale in mesh, not at runtime |
| `skier-coat.glb` | adult, long coat, backpack | 450 | 15 KB | reads as a different person at toy scale |
| `boarder.glb` | sideways stance, board 1.5 m | 400 | 14 KB | board along local X; front foot +X |
| `boarder-kid.glb` | 1.3 m boarder | 350 | 12 KB | |

Material contract for all five: `jacket` and `helmet` materials stay named exactly so; everything else is baked to vertex colour. In-game the jacket and helmet are no longer separate meshes. `bakeKit` gains a mode that writes a per-vertex `tint` attribute (1 on jacket vertices, 2 on helmet, 0 elsewhere) into the body geometry; a small `onBeforeCompile` patch on the Lambert material multiplies vertex colour by `instanceColor` where `tint == 1` and by a second per-instance attribute `aHat` where `tint == 2`. Result: one instanced mesh per silhouette.

Draw calls, main pass:

| | Today | After |
|---|---|---|
| Skier body, jacket, hat | 3 | 0 |
| Silhouettes (5, each one instanced mesh) | 0 | 5 |
| Carriers (T-bar, chair) | 2 | 2 |
| Follow ring and marker | 2 | 2 |
| Total | 7 | 9 |

The shadow proxy stays one instanced box on `SHADOW_LAYER` (shadow pass only). If the main pass is over 40 at this point (see M7 performance), drop `skier-coat` and `boarder-kid` first.

Assignment is render-only and deterministic: `variantOf(id, persona)` in a new `render/guestLook.ts`. First-timers draw 40% kid, 45% adult, 15% boarder; regulars 50% adult, 20% coat, 30% boarder (proposed). Personas come from `Guest.persona` (`first_timer`, `regular` today; more after row 9 or 22). The sim does not know about boards; a boarder is a skier in every rule. Snapshot unchanged.

Poses: boarders yaw +90 degrees about Y while skiing (`placeGuests` already returns `yaw`, `lean`, `roll`); in the queue and on a T-bar they stand facing uphill; on a chair every silhouette uses its seated pose, done by a per-variant vertical offset and a lean, not a second mesh.

Jacket colour by state. The roadmap row asks for it; the current code uses identity colour so a followed guest can be picked out. Proposed: identity colour by default, plus a lens.

| Lens | Jacket | Helmet |
|---|---|---|
| Off (default) | `JACKETS[hash % 7]` | `HATS[...]` |
| Mood | happy (score at least 70): `#2f7de1` blue; okay (50 to 69): `#f2c014` yellow; unhappy (under 50): `#d7263d` red | unchanged |

Bands match the HUD mood tone (`band(mood, 70, 50)` in `Hud.tsx`). Blue, yellow and red stay distinguishable under the common colour-vision deficiencies; the lens also shows a legend with the same icon set as the ops strip, so colour is never the only cue. Mood per guest comes from `guestSatisfaction` in `game/satisfaction.ts`, computed in a selector, not per frame: recompute when `guests` changes (it already changes per tick) and memoise per guest id plus `runs` plus `state`.

### Files
- `tools/blender/lift.py` (exists): rework `b_skier`; add `b_skier_kid`, `b_skier_coat`, `b_boarder`, `b_boarder_kid`
- `web/public/models/*.glb` and `manifest.json` (exist): four new files, one changed
- `web/src/render/kit.ts` (exists): new names in `KIT_ASSETS`; `bakeKit(scene, { tint: ["jacket", "helmet"] })` option
- `web/src/render/guestLook.ts` (new): `variantOf`, `moodBand`, `jacketFor(guest, lens)`
- `web/src/render/Guests.tsx` (exists): one instanced mesh per variant; tint patch; lens
- `web/src/render/guestPlacement.ts` (exists): boarder yaw and seated offsets
- `web/src/ui/GuestsSheet.tsx` (exists): "Colour by mood" toggle with legend
- `web/src/game/store.ts` (exists): session-only `guestLens: "off" | "mood"` (not persisted)

### Tests
- `guestLook.test.ts`: `variantOf` is stable for an id; distribution over 10,000 ids within 3 points of the proposed shares; `moodBand` boundaries at 49.9, 50, 69.9, 70.
- `guestPlacement.test.ts`: a boarder's ski yaw differs from a skier's by pi/2; seated offset applied only in `ride` on a chair.
- Asset check (see cross-cutting): each new GLB under its tri and size budget, `jacket` and `helmet` materials present.
- Visual: screenshots at the four viewports at home distance and zoomed to 10 u; lens on and off.

### Verification
Standard viewports. At home distance at 390x844 a guest must be at least 10 px tall (the 2b framing test asserts this; rerun it). Follow a boarder from arrive to depart. Real device: check that the tint patch compiles on iPhone Safari (WebGL2); Safari shader compile errors only show in the Web Inspector console.

### Acceptance criteria
- Five silhouettes in game; total guest tris at 48 instances under 22k.
- Main-pass draw calls for guests and carriers at most 9.
- Lens on: every visible jacket is one of three colours matching the HUD band; legend visible; lens off restores identity colours.
- Snapshot unchanged; `npm run check` green.

### Risks
`onBeforeCompile` patches break on three.js upgrades (pin the replaced chunk names in a comment and a test that the patched shader string contains them). Kid models at toy scale may read as distant adults; tune height from screenshots.

### Out of scope
Animation rigs, falls, lesson groups, persona-driven sim behaviour for boarders (no terrain park in v1).

### Docs to update
ART_DIRECTION "Blender pipeline" asset list and draw-cost paragraph; MASTER_PLAN row 28 status; SIMULATION_SPEC nothing (render only).

### Size
About 300 lines of non-test code plus Blender scripts (Blender Python is not counted in the 400-line budget but stays in the same PR). If over, ship the shader tint and two silhouettes first, the lens second.

### Open decisions
1. Jacket colour default: identity colour with a mood lens (recommended) or colour by mood always.
2. Boarder share: 15% and 30% by persona (recommended) or a flat 25%.

---

## PR 29: Lift and lodge GLB kit

### Goal
Finish the Blender kit so every lift type and lodge tier the sim can produce has a model, and make the manifest the single source the loader and CI read.

### Depends on
Row 15 (lift types final: surface and double chair; any new type such as a triple must exist in `LiftType` first), row 16 (lodge tier 1 exists in sim), 2d (vehicle kit already added there).

### Player-visible result
Buying a lodge tier changes the building. A surface lift has a distinct bottom station from a chair. Tenney's base lodge (row 36) has its own 1960s silhouette.

### Design

What exists, verified in the repo: art pass 2 shipped 17 Draco GLBs in `web/public/models/` with `manifest.json` (total 164,732 bytes and 8,076 tris by the manifest; ART_DIRECTION says 204 KB, which is out of date). The roadmap row says "manifest in `web/public/assets/`"; that folder does not exist. `kit.ts` does not read the manifest; it hard-codes `KIT_ASSETS` and rope and grip heights (`KIT_ROPE_Y`, `KIT_GRIP_Y`). The manifest's `"front": "-Z (Blender -Y)"` is wrong; ART_DIRECTION states glTF front is +Z. No script in `tools/blender/` writes the manifest. `tools/blender/lib.py` differs from the copy in `~/Documents/Last Chair/asset-kit-v1/scripts/lib.py`; the repo copy is the one to keep after a diff review.

Recommendation: keep `web/public/models/` (moving it buys nothing and breaks cached URLs) and update the roadmap row text.

New and reworked assets:

| Asset | Tris max | Size max | Spec |
|---|---|---|---|
| `lodge-tier-1.glb` | 2,000 | 25 KB | today's `base-lodge`, renamed |
| `lodge-tier-2.glb` | 2,800 | 35 KB | tier 1 plus a timber wing and deck |
| `lodge-tier-3.glb` | 3,600 | 45 KB | tier 2 plus a second storey and stone chimney |
| `surface-terminal-bottom.glb` | 350 | 10 KB | low bullwheel shed for T-bar or platter |
| `surface-terminal-top.glb` | 300 | 9 KB | |
| `a-frame-lodge.glb` | 2,400 | 30 KB | Tenney base lodge, steep A-frame, 1960s |
| `platter.glb` | 80 | 4 KB | Tenney's lower-mountain surface lift carrier |
| `lift-tower-derelict.glb` | 228 | 7 KB | rust tint, no sheaves; start-state dressing |

Every file stays far under the 500 KB per-GLB limit; the real budget is tris, because all static pieces are merged per component and village tris count toward the 200k main-pass cap. Lodge tiers are mutually exclusive, so only one is ever drawn.

Manifest v2, written by Blender, read by the game:

```ts
// web/src/render/kitManifest.ts (types only; data is public/models/manifest.json)
export type KitEntry = {
  name: string;            // file stem, hyphenated
  file: string;            // "lodge-tier-2.glb"
  tris: number;
  sizeBytes: number;
  heightMeters: number;
  footprintMeters: [number, number];
  split?: string[];        // materials kept apart for tint (jacket, helmet)
  ropeYMeters?: number;    // towers and terminals
  ropeOffsetXMeters?: number;
  gripHeightMeters?: number;
  tags: ("building" | "lift" | "carrier" | "guest" | "tree" | "prop" | "vehicle")[];
};
export type KitManifest = { version: 2; units: "meters"; upAxis: "+Y"; front: "+Z"; draco: true; assets: KitEntry[] };
```

Loader: `kit.ts` imports `manifest.json` at build time (a JSON import is bundled, so no runtime fetch and no basePath issue), derives `KitAsset` from it, and reads rope and grip heights from it instead of `KIT_ROPE_Y` and `KIT_GRIP_Y`. Preload stays eager for the village, lift and skier assets; Tenney-only assets (`a-frame-lodge`, `platter`) preload only when the active mountain needs them (row 34 gives the mountain id).

Blender side: add `tools/blender/manifest.py` with `write_manifest(entries)` called at the end of every build script; `export()` in `lib.py` returns size, `tris(ob)` already exists. Copy step stays manual: `cp "$LAST_CHAIR_KIT_ROOT"/glb/* web/public/models/`.

### Files
- `tools/blender/lib.py`, `buildings.py`, `lift.py` (exist): new builders
- `tools/blender/manifest.py` (new)
- `web/public/models/manifest.json` (exists): v2
- `web/public/models/*.glb` (exist): 8 new, `base-lodge.glb` renamed
- `web/src/render/kitManifest.ts` (new): types and lookups
- `web/src/render/kit.ts` (exists): read manifest
- `web/src/render/Lodge.tsx` (exists): tier from `buildings` (row 16 field)
- `web/src/render/Lift.tsx` (exists): surface terminals for `type === "surface"`
- `web/scripts/check-assets.mjs` (new, also used by CI, see cross-cutting)

### Tests
- `kitManifest.test.ts` (node): every `KIT_ASSETS` name has an entry; every entry's file exists on disk; `sizeBytes` matches `fs.statSync` within 1%; tris within budget table; rope heights equal the old constants for unchanged assets (guards the cable test from 2b).
- Existing cable-clearance test from 2b passes with manifest-sourced heights.
- Visual: village at each lodge tier; surface vs chair terminals; screenshots at 390x844 and 844x390.

### Verification
Standard viewports. Network panel at 390x844 with "Slow 4G": first scene within 6 s from cold cache on the live Pages URL. Confirm all `.glb` requests go to `/last-chair/models/...` on Pages (check the deploy preview or the live site after merge).

### Acceptance criteria
- Manifest v2 in repo, generated by `manifest.py`, read by `kit.ts`; `KIT_ROPE_Y` and `KIT_GRIP_Y` constants deleted.
- Lodge tiers 1 to 3 render from sim state; surface lifts use surface terminals.
- Every GLB under 500 KB and under its tri budget; `check-assets.mjs` passes in CI.
- Snapshot unchanged.

### Risks
Renaming `base-lodge` breaks any cached service worker entry once PWA lands; do this PR before M7. Lodge tier 3 footprint may overlap the café position in `layout.ts`; check the apron test in `render/layout.test.ts`.

### Out of scope
Vehicles, birch, signs (2d). Triple chair or gondola models (no sim type). Texture maps (the kit is vertex colour only).

### Docs to update
ART_DIRECTION "Blender pipeline" (manifest v2, front axis, totals); MASTER_PLAN row 29 text (`models/` not `assets/`).

### Size
About 250 lines of TypeScript plus Blender Python. Cut point: lodge tiers 2 and 3 move to a follow-up if row 16 only defines tier 1.

### Open decisions
1. Keep `web/public/models/` (recommended) or move to `web/public/assets/` as the roadmap row says.
2. A-frame for Tenney's lodge: a period guess, not a documented building. Recommended: label it a fictional rebuild per WORLD.md, same as Dutch Hill's lodge.

---

## PR 30: Snow shader

### Goal
Draw snow coverage patches and groom stripes on the GPU from per-trail snow state, so last night's preset is visible on the mountain the next morning at no per-frame CPU cost.

### Depends on
Row 13 (trail graph: trails have ids and polylines), row 17 (nightly groom capacity: which segments were groomed). If row 17 does not store a per-segment groomed flag, derive it from the preset as today (`Mid` and `High` groom every segment).

### Player-visible result
After a Minimal night, trails look scraped and grey-blue, with bare brown patches where coverage is low. After Mid, fresh corduroy on groomed segments. After High, crisp, tight corduroy everywhere the crew reached. Stripes wear away through the day as runs accumulate. Patches grow from the bottom on thaw days.

### Design

What exists: `Terrain.tsx` paints vertex colours on the CPU (`paint()`), blending segment quality, depth and coverage near trails; `TrailRibbon.tsx` builds a `CanvasTexture` corduroy (`corduroyTexture(groomed ? 30 : 14)`) and repaints when snow values snapped to 0.05 change. That stays the fallback.

Approach: keep one `MeshLambertMaterial` per surface and patch it with `onBeforeCompile`. Snow state goes into one small float texture; geometry carries static trail coordinates.

Inputs from game state (no new sim fields beyond row 17's groomed flag):

| Input | Source | Update |
|---|---|---|
| Segment depth, quality, coverage, groomed | `trail.segments[i]` per trail (`game/snow.ts`) | on change of the 0.05-snapped values |
| Runs today per trail | `dayStats` or per-trail counter from row 13 | every 10 game minutes |
| Last night's preset | `state.snow` (the preset the crew worked) | at morning |
| Weather today | `state.weather` | at morning |
| Night mood | `sceneMood.night` (`Atmosphere.tsx`) | per frame (uniform write only) |

Snow state texture: `DataTexture` RGBA float (or half float), width = max segments per trail (6 today), height = trail count (at most 8 proposed). R depth, G quality, B coverage, A groomed (0 or 1). Built by a pure function so it is testable:

```ts
// web/src/render/snowTexture.ts
export function snowTextureData(trails: readonly Trail[], width = 6): Float32Array; // length width * trails.length * 4
```

Per-vertex attributes, baked once when trail geometry changes (lift placed, trail added):

| Attribute | Meaning |
|---|---|
| `aTrail` | trail row index, or -1 off-trail |
| `aT` | 0 at the top to 1 at the bottom along that trail |
| `aU` | signed distance across the trail in world units |
| `aW` | influence weight 0 to 1 (the existing `trailInfluence` corridor) |

Uniforms:

| Uniform | Type | Value |
|---|---|---|
| `uSnow` | sampler2D | snow state texture |
| `uTrailCount` | float | rows in use |
| `uGroomStrength` | float | Minimal 0, Mid 0.6, High 1.0 (proposed) |
| `uStripePitch` | float | world units per corduroy groove; Mid 0.22, High 0.16 (proposed) |
| `uWear` | float | `min(1, runsToday / 150)` (150 runs costs about 0.09 quality, SIMULATION_SPEC Snow, Day) |
| `uPatchScale` | float | noise frequency for bare patches, 0.9 per world unit at H = 6 (scale with 1/H for other mountains) |
| `uNight` | float | `sceneMood.night` |
| `uColors` | vec3[6] | `snow`, `snowShade`, `snowOld`, `snowIce`, `earth`, `rock` from `palette.ts` |

Fragment logic, in words: sample the segment at `aT` with linear filtering. Coverage patch: `bare = step(coverage, noise(worldXZ * uPatchScale))` so lower coverage shows more earth, with a 0.08 soft edge. Quality tint: mix `snowIce` toward `snow` by quality. Stripes: `stripe = 0.5 + 0.5 * sin(aU / uStripePitch * 2pi)`, amplitude `uGroomStrength * groomed * quality * (1 - uWear)`, faded to zero over the last 15% of trail width. At night, stripes darken 20% so the recap scene still reads.

The ribbon (`TrailRibbon.tsx`) drops its canvas texture and uses the same patch on its own geometry, with `aU` from the ribbon's cross coordinate. Terrain outside trails keeps CPU vertex colours (hollows, warm slopes, rock); those do not depend on snow state per segment.

### Files
- `web/src/render/snowTexture.ts` (new): texture data, attribute bake
- `web/src/render/snowMaterial.ts` (new): `patchSnowMaterial(mat, uniforms)` with the GLSL chunks
- `web/src/render/Terrain.tsx` (exists): drop per-segment CPU blend near trails; add attributes
- `web/src/render/TrailRibbon.tsx` (exists): use the patch; delete `corduroyTexture`
- `web/src/render/trail.ts` (exists): export cross coordinate for `aU`

### Tests
- `snowTexture.test.ts`: two trails, known segments; texel values equal segment values; row order equals trail order; groomed flag from preset when the sim gives none.
- Attribute bake: `aT` monotone along a trail; `aW` zero beyond the corridor fade (6.3 u at H = 6 from 2b).
- Shader text test: patched shader source contains the injected chunk names (catches three.js chunk renames).
- Visual: one seed, three mornings after Minimal, Mid and High, same camera; and a thaw afternoon at 15:00. Six screenshots per viewport in the PR.

### Verification
Standard viewports. Pass condition from MASTER_PLAN row 8 and ICR lesson "snow tools must be visible": a tester who did not set the preset can say which morning followed High. Real iPhone: confirm float textures work (WebGL2 on iOS 15+ supports `RGBA32F` sampling with nearest filtering; use `HalfFloatType` with linear filtering, or do manual two-tap interpolation if linear float filtering is unavailable).

### Acceptance criteria
- Minimal, Mid and High mornings are distinguishable in screenshots without labels.
- No CPU repaint of the terrain when snow values change; a snow change costs one texture upload.
- Frame time at 844x390 unchanged within 1 ms on Chromium with 4x CPU throttle.
- Snapshot unchanged.

### Risks
Linear filtering of float textures on older iOS. Stripe aliasing at home distance: fade stripes by screen-space derivative (`fwidth(aU)`) when the pitch drops under 2 px. Trail graph changes in row 13 may change how many trails exist; cap and assert.

### Out of scope
Snowfall particles and sparkle (M7 art list), gun plume rework (row 17), footprints and tracks.

### Docs to update
ART_DIRECTION Snow row and "Components" table; SIMULATION_SPEC Snow "Render" paragraph.

### Size
About 330 lines. Cut point: ship terrain patches first, ribbon stripes second.

### Open decisions
1. Groom strength per preset: Minimal none, Mid 0.6, High 1.0 (recommended), or Mid and High identical with High only wider.

---

## PR 31: Day and night lighting

### Goal
Turn the lighting in `Atmosphere.tsx` into one testable rig function of clock, phase and weather, with a warm moving day key and a cool, readable night recap scene.

### Depends on
2b (fog 140 to 420, far plane 1000), 2c (shadow camera follows the target), row 18 (weather kinds; today `snow | clear | thaw`).

### Player-visible result
The sun moves across the day: crisp morning, warm golden light after 14:30, a short dusk at close. At night the hill turns blue, lodge windows and lamp pools glow amber, and the night sheet sits over a scene that still shows the lift line. Snow days are flat and soft; thaw days are bright and warm.

### Design

What exists: `Atmosphere.tsx` lerps sky, fog, sun colour and intensity, hemisphere light and ridges between `DAY` and `NIGHT` with `mood` (eased to phase) and `dusk = smoothstep(14:00, 16:00)`. The sun position is fixed (`SUN_DIR`, east-south-east). Shadow map 1024, bounds ±11. Tone mapping Neutral. Glow 0.62 day to 1.15 night (`kit.ts`).

Move the numbers into a pure function:

```ts
// web/src/render/lighting.ts
export type RigInput = { clockMin: number; night: number /* 0..1 eased */; weather: WeatherKind };
export type Rig = {
  sunDir: [number, number, number]; sunColor: string; sunIntensity: number;
  hemiSky: string; hemiGround: string; hemiIntensity: number;
  skyTop: string; skyHorizon: string; fogNear: number; fogFar: number;
  exposure: number; glow: number; shadowStrength: number;
};
export function lightRig(i: RigInput, scale: { horizontal: number }): Rig;
```

`Atmosphere.tsx` calls it per frame and copies the values (no allocation: return into a reused object).

Proposed values (tune on screen; these extend the existing palette, not replace it):

| Key | 08:00 | 12:00 | 15:30 | Night recap |
|---|---|---|---|---|
| Sun azimuth from +X toward -Z | 110 deg (ESE) | 170 deg (S) | 230 deg (SW) | moon fixed at 200 deg |
| Sun elevation | 18 deg | 32 deg | 12 deg | 40 deg |
| Sun colour | `#ffe2c0` | `#fff0da` | `#ffbd85` | `#9db4ff` |
| Sun intensity | 2.2 | 2.6 | 1.9 | 0.35 |
| Hemi sky / ground | `#b4c6f2` / `#e2d3bf` | same | `#c9b8d8` / `#e8cdb0` | `#3b5188` / `#1a2236` |
| Hemi intensity | 1.2 | 1.25 | 1.1 | 0.75 |
| Tone mapping exposure | 1.0 | 1.0 | 1.0 | 0.9 |
| Kit glow | 0.62 | 0.62 | 0.8 | 1.15 |

Weather modifiers: snow day sun ×0.65, hemi ×1.2, sky top 60% toward `overcastTop`; thaw sun ×1.08 and a warmer horizon. Elevation never under 10 degrees, so slopes do not go black and shadows stay under the shadow camera range. Sun position moves the directional light around the shadow target from 2c, at a fixed distance of 60 u × H/6.

Night recap readability: the sheet covers the bottom half in portrait; the lift line and village must stay visible above it. Add lamp pools on the lift line (one every third tower, additive quad, no light) and keep the trail ribbon 15% brighter than the snow around it at night.

### Files
- `web/src/render/lighting.ts` (new)
- `web/src/render/Atmosphere.tsx` (exists): use `lightRig`; move sun
- `web/src/render/palette.ts` (exists): add `sunMorning`, `hemiSkyDusk`, `hemiGroundDusk`
- `web/src/render/Lift.tsx` (exists): night tower lamps (merged into the lift's glow geometry)
- `web/src/ui/PlayExperience.tsx` (exists): `gl.toneMappingExposure` from the rig

### Tests
- `lighting.test.ts`: elevation at least 10 degrees for every minute 07:30 to 16:00; azimuth monotone through the day; `night = 1` returns the night column exactly; snow day sun intensity lower than clear at the same minute; output object identity reused between calls.
- Visual: 08:00, 12:00, 15:30, night recap, snow day noon; at 390x844 and 844x390.

### Verification
Standard viewports, plus the night sheet open at 390x844 and 375x667: lift line and lodge windows visible above the sheet. Check contrast of HUD text over the brightest sky (the HUD sits on panels, so this should hold; confirm).

### Acceptance criteria
- Lighting values come only from `lightRig`; no lighting literals left in `Atmosphere.tsx`.
- Shadows visible at every daytime minute; no frame where the slope goes black.
- Night recap shows lit windows and the lift line in portrait.
- Snapshot unchanged.

### Risks
A moving sun moves shadows every frame; with a 1024 shadow map, shadow edges may shimmer. Snap the light position to shadow-map texels (standard stabilisation) if visible.

### Out of scope
Snowfall, golden-hour god rays, post-processing (none in the budget), real-time night skiing gameplay.

### Docs to update
ART_DIRECTION Art pass 1 "Look" paragraph and `Atmosphere.tsx` component row.

### Size
About 220 lines.

### Open decisions
1. Moving sun (recommended) or fixed sun with colour change only (cheaper, no shadow shimmer risk).

---

## PR 32: Audio

### Goal
Add an ambient bed, short UI sounds and a Route 100 Radio sting through Web Audio, started only after a user gesture, with a labelled mute control and licensed assets.

### Depends on
Row 23 (radio beats delivered at night), row 26 (coached first winter, so the first gesture is known). Nothing in `game/`.

### Player-visible result
Wind and a distant lift hum by day, a fire and quiet room tone at night, soft clicks on keys, a chime when cash comes in, a short jingle when Route 100 Radio has a story. A "Sound" key in the Menu turns all of it off, and the choice is remembered.

### Design

What exists: no audio code (`AudioContext` and `<audio>` appear nowhere in `web/src`). ART_DIRECTION has an audio stub: acoustic plus light electronic, no epic orchestra; Sandbox has no story stingers.

Asset list (all original or licensed; none from Ice Coast Revival):

| Id | Use | Length | Format | Size max | Loop |
|---|---|---|---|---|---|
| `bed-day` | wind, far lift motor, occasional crow | 60 to 90 s | AAC `.m4a`, 96 kbps stereo | 1.1 MB | yes, gapless |
| `bed-night` | lodge room tone, wood stove | 45 to 60 s | `.m4a` 96 kbps | 0.75 MB | yes |
| `ui-tap` | key press | under 0.1 s | `.m4a` 64 kbps mono | 6 KB | no |
| `ui-select` | option chosen | 0.15 s | same | 8 KB | no |
| `ui-sheet` | sheet open | 0.2 s | same | 8 KB | no |
| `ui-blocked` | invalid placement | 0.25 s | same | 8 KB | no |
| `build-place` | lift placed | 0.6 s | same | 15 KB | no |
| `cash-in` | night revenue | 0.5 s | same | 12 KB | no |
| `sleep` | Sleep pressed | 1.2 s | same | 25 KB | no |
| `morning` | morning headline | 1.5 s | same | 30 KB | no |
| `radio-sting` | Route 100 Radio beat | 3 to 4 s | `.m4a` 96 kbps | 60 KB | no |

Total under 2.2 MB, of which beds are 1.85 MB and load lazily.

Format: AAC in `.m4a` decodes through `decodeAudioData` in Safari, Chrome and Firefox on macOS, Windows, iOS and Android. Firefox on some Linux builds lacks AAC; that is dev-only and acceptable. Loops use `AudioBufferSourceNode.loop` with `loopStart` and `loopEnd` set past the encoder priming samples (AAC adds about 2,112 samples of padding), so the loop has no gap; record each loop's sample offsets in the audio manifest.

Engine, `web/src/audio/` (a new top-level folder beside `render/` and `ui/`, not under `game/`):

```ts
// web/src/audio/engine.ts
export type SoundId = "ui-tap" | "ui-select" | ... | "radio-sting";
export type BedId = "bed-day" | "bed-night";
export const audio: {
  start(): Promise<void>;          // create or resume the AudioContext inside a gesture
  play(id: SoundId): void;          // no-op until started or when muted
  setBed(id: BedId | null): void;   // 1.5 s crossfade
  setMuted(m: boolean): void;
  suspend(): void; resume(): void;  // visibility
};
```

iOS Safari rules the code must follow:
- Create the `AudioContext` lazily and call `resume()` inside a `pointerup` or `touchend` handler; `pointerdown` alone has not counted as activation on some iOS versions. Register one capture-phase listener on `window` that calls `audio.start()` and removes itself.
- Set `navigator.audioSession.type = "ambient"` where it exists (Safari 16.4+), so the game respects the ring/silent switch and mixes with the player's own music. Feature-detect; no-op elsewhere.
- On `visibilitychange` to hidden, `ctx.suspend()`; on visible, `resume()` only if previously started. The store already pauses the clock when hidden (SIMULATION_SPEC Time); confirm it, since the spec marks it unverified.
- iOS can put the context in `"interrupted"` after a phone call; on `statechange`, try `resume()` on the next gesture.

Loading: UI sounds (under 200 KB) fetch after start; beds fetch after `data-scene-ready` and after start, never before first paint. All URLs from `${NEXT_PUBLIC_BASE_PATH}/audio/...`. Files live in `web/public/audio/` with `audio-manifest.json`:

```json
{ "version": 1, "sounds": [ { "id": "bed-day", "file": "bed-day.m4a", "bytes": 0, "loopStart": 0.048, "loopEnd": 74.2, "license": "CC0", "source": "URL or 'original'", "author": "name" } ] }
```

Mute and volume: preferences go in a separate localStorage key `last-chair-prefs` (`{ muted, ambient: 0..1, ui: 0..1 }`), not in the game save, so a save reset does not unmute. Default: sound on, ambient 0.5, UI 0.7. Controls: a labelled "Sound: on" or "Sound: off" key in the Menu sheet (camera PR 31 adds the Menu confirm; put it beside it), 44 px minimum, `aria-pressed`. MASTER_PLAN section 9 says radio can be turned off; add "Radio sting" as a separate toggle only if the owner wants it (open decision).

Where calls go: `ui/kit/parts.tsx` keys call `audio.play("ui-tap")` on press; `Sheet.tsx` on enter; `NightRecapSheet.tsx` cash line on reveal; `RadioCard.tsx` on arrive; store subscriptions in `PlayExperience.tsx` switch beds on phase. Sandbox mode (row 39) skips `radio-sting`.

Licensing: accept CC0, original recordings, or commercial royalty-free libraries whose licence allows web game distribution. No CC-BY-NC. Each file's licence, source URL and author go in the manifest; the credits screen (row 35 hub or title page) lists every non-CC0 author. Check `audio-manifest.json` in the asset CI check: every file has `license` and `source`.

### Files
- `web/src/audio/engine.ts`, `web/src/audio/prefs.ts`, `web/src/audio/useAudioStart.ts` (new)
- `web/public/audio/*.m4a`, `audio-manifest.json` (new)
- `web/src/ui/PlayExperience.tsx`, `ui/kit/parts.tsx`, `ui/kit/Sheet.tsx`, `ui/kit/RadioCard.tsx`, `ui/NightRecapSheet.tsx`, `ui/Hud.tsx` (exist)
- `web/eslint.config.mjs` (exists): no change expected

### Tests
- `prefs.test.ts`: read defaults on missing or corrupt JSON; round trip.
- `engine.test.ts` with a fake `AudioContext`: `play` before `start` is a no-op; muted is a no-op; `setBed` crossfades by scheduling gain ramps; `suspend` on hidden.
- Manifest test: every `SoundId` has a file and licence fields; total bytes under 2.2 MB.
- Manual: real iPhone required for this PR (simulators and desktop Safari do not show the gesture and silent-switch behaviour).

### Verification
Real iPhone Safari: first tap starts audio; silent switch silences it; locking the phone and returning resumes it without a tap only if iOS allows, otherwise the next tap does; a phone call interruption recovers. Desktop Chrome: no console autoplay warnings before the first click.

### Acceptance criteria
- No sound before the first gesture on any browser; no autoplay console warnings.
- Mute persists across reloads and save resets.
- Silent switch on iPhone silences the game (with `audioSession` support).
- Audio stops within 0.5 s of the tab going hidden.
- Every file has a licence entry; total under 2.2 MB; beds loaded after scene ready.

### Risks
AAC loop gaps if offsets are wrong (test by ear on device). iOS audio session API is new; behaviour without it is that Web Audio ignores the silent switch on some iOS versions.

### Out of scope
Music tracks, voice-over, positional 3D audio, per-guest sounds.

### Docs to update
ART_DIRECTION "Audio direction (stub)" becomes a real section (asset list, format, licence rule); MASTER_PLAN section 5 "Audio only after a user gesture" points to it.

### Size
About 280 lines.

### Open decisions
1. Separate "Radio sting" toggle: no, one Sound toggle (recommended for v1) or yes.
2. Source: CC0 libraries plus a few original field recordings (recommended) or commission a sound designer.

---

## PR 33: Mobile juice

### Goal
Add small, interruptible feedback motion (satisfaction pulse, cash count, build-place pop, sheet polish) and make one reduced-motion switch govern every JS-driven animation, including the follow camera.

### Depends on
PR 31 camera part 1 (follow and recenter), 12c (placement flow), rows 28 to 32 merged (so motion is tuned against final visuals and sound).

### Player-visible result
When mood changes by five points or more, the mood chip on the ops strip pulses once and shows "+6" or "−7" briefly. Night revenue counts up over 600 ms. A placed lift's towers pop up in sequence. With reduced motion on, all of that becomes short fades, the follow camera cuts instead of swinging, and nothing loops.

### Design

What exists: sheets already animate with CSS driven by `data-state` (enter 360 ms `--ease-drawer`, exit 200 ms), drag-to-dismiss with flick velocity (`Sheet.tsx`: `DISMISS_DISTANCE = 110`, `DISMISS_VELOCITY = 0.11`). `globals.css` has a `prefers-reduced-motion` block for `.press`, `.sheet`, `.note-in`, `.callout-in`, `.arrive`, `.pop` and `.pulse-ring`. The `.pulse-ring` on the Play key loops forever (`animation: pulse-ring 1.8s infinite`) when not reduced. Nothing in JS reads reduced motion (`matchMedia` appears nowhere), so the follow camera swing ignores it, which contradicts MASTER_PLAN section 9.

One source of truth:

```ts
// web/src/ui/motion.ts
export function useReducedMotion(): boolean; // OS setting OR in-game override
export const motionPref: { get(): boolean }; // non-React read for useFrame code
```

In-game override in `last-chair-prefs` (`reduceMotion: "system" | "on" | "off"`, default `"system"`), shown in the Menu as "Reduce motion: system" with three options. When on, set `data-reduce-motion` on `<html>` and extend the CSS block to match `[data-reduce-motion]` as well as the media query.

Motions, all transform and opacity only (ART_DIRECTION Motion rules), all interruptible:

| Motion | Trigger | Full | Reduced |
|---|---|---|---|
| Mood pulse | `|mood − moodAt(10 game min ago)| >= 5` | chip scale 1 to 1.08 to 1, 280 ms; delta label fades in 120 ms, holds 1.2 s | delta label fades only |
| Cash count | night recap opens | number counts from yesterday to today, 600 ms, ease-out; tabular figures so width does not jump | final value shown at once |
| Build-place pop | lift placed | towers scale Y 0 to 1, 40 ms stagger, 220 ms each | towers appear, 150 ms fade of the ghost |
| Undo | undo pressed | towers scale down 160 ms | instant |
| Follow camera | follow start or end | existing lerp | cut to target, then hold |
| Play key ring | game not started | 3 pulses then stop (WCAG 2.2.2) | none |
| Radio diamond | beat arrives | existing one overshoot | fade |

The pulse threshold reads from a ring buffer of mood samples kept in the HUD component (session state, not saved). The mood value is the same one the ops strip shows; no new sim number.

No haptics: `navigator.vibrate` is not available in iOS Safari, and the primary target is iPhone.

### Files
- `web/src/ui/motion.ts` (new)
- `web/src/app/globals.css` (exists): `[data-reduce-motion]` selectors, finite pulse-ring
- `web/src/ui/Hud.tsx` (exists): mood pulse, delta label; finite play ring
- `web/src/ui/NightRecapSheet.tsx` (exists): cash count
- `web/src/render/Lift.tsx` (exists): tower pop
- `web/src/render/MountainScene.tsx` (exists): follow cut when reduced
- `web/src/ui/PlayExperience.tsx` (exists): Menu "Reduce motion" control

### Tests
- `motion.test.ts`: override `"on"` wins over system false; `"system"` follows the media query (inject a fake `matchMedia`).
- Pure `moodPulse(samples, now)` test: fires at 5, not at 4.9; at most once per 30 game minutes.
- Pure `countUp(from, to, t)` test: endpoints exact; monotone.
- Visual: short screen recording (Playwright video) of a pulse and a lift placement at 390x844, full and reduced.

### Verification
Standard viewports. macOS System Settings, Accessibility, Display, Reduce motion on: confirm every motion row's reduced column. iPhone: Settings, Accessibility, Motion, Reduce Motion. Check the follow camera cut on device.

### Acceptance criteria
- Every row of the motion table matches its full and reduced behaviour.
- No infinite animation anywhere in the UI.
- One hook and one CSS attribute govern reduced motion; no other `matchMedia("(prefers-reduced-motion` calls.
- Snapshot unchanged.

### Risks
Cash count can disagree with the final value if the sheet re-renders mid-count; drive it from a ref and always land on the store value.

### Out of scope
Particle effects, queue heat shimmer (M7 art), haptics.

### Docs to update
ART_DIRECTION Motion and Accessibility sections; MASTER_PLAN section 9.

### Size
About 230 lines.

### Open decisions
1. Mood pulse threshold: 5 points (recommended) or 3.

---

## PR 34: Mountain definitions as data

### Goal
Define a mountain as one `MountainDef` object (terrain, scale, site, start state, climate, economy, archetype tags, beats, heritage) and move Dutch Hill into that shape with zero change in behaviour.

### Depends on
2b, 2d (`SiteDef` in `game/mountains/dutchHill.site.ts`), row 18 (weather model to receive climate data), row 20 (economy constants), row 23 (beats), row 25 (save versioning policy).

### Player-visible result
None. This is the refactor that lets PR 36 add Tenney as data.

### Design

Today the active mountain is a module singleton: `TERRAIN = createTerrain(DUTCH_HILL)` in `game/terrain.ts`, imported by 19 non-test files (`game/balance.ts`, `descent.ts`, `rules.ts`, `state.ts`, `terrain.ts`, `types.ts`; `render/Lodge.tsx`, `MountainScene.tsx`, `SnowGuns.tsx`, `Terrain.tsx`, `TrailRibbon.tsx`, `Trees.tsx`, `cameraFraming.ts`, `guestPlacement.ts`, `layout.ts`, `liftLine.ts`, `terrainMesh.ts`, `trail.ts`; `ui/BuildSheet.tsx`). Weather is `rollMorningWeather(dayIndex, hasGuns)` until row 18 replaces it. Economy numbers are constants in `types.ts` (`DAILY_FIXED_COST`, `LIFT_OPS_COST`, `FARE_PRICES`, `BUILDING_COSTS`). Starting cash $12,000 is in `createInitialState`.

Shape (`web/src/game/mountains/types.ts`, new):

```ts
export type MountainId = "dutch_hill" | "tenney";
export type UsState = "VT" | "NH" | "MA" | "ME";
export type ArchetypeTag =
  | "rural_sticks" | "natural_snow_only" | "weekends_family" | "no_snowmaking_start"
  | "southern_thaw" | "family_ropetow" | "exposed_summit" | "gondola_vintage" | "night_show"
  | "cold_north" | "big_vertical";                       // last two proposed for Tenney
export type ArrivalKind = "gravel_lot" | "roadside" | "paved_lot";

export type ClimateDef = {
  /** Base daily weather weights before season shape and seed (row 18 consumes these). */
  weights: Record<WeatherKind, number>;
  /** Multiplier on thaw depth and quality loss (Dutch Hill 1). */
  thawSeverity: number;
  /** Chance per day of a wind hold on exposed lifts (row 15); 0 disables. */
  windHold: number;
};

export type EconomyDef = {
  startCash: number;
  dailyFixedCost: number;
  liftOpsCost: number;
  fares: Record<FarePreset, number>;
  buildingCosts: Record<BuildingId, number>;
  /** Added to expected hill value: guests expect more here (satisfaction value term). */
  expectationBonus: number;
};

export type StartState = {
  lifts: { type: LiftType; bottom?: XZ; top: XZ; condition: "working" | "limping" | "derelict"; repairCost?: number }[];
  buildings: BuildingId[];
  reputation: number;
  guns: boolean;
};

export type BeatDef = { id: StoryBeatId; title: string; radio: string; thresholds: Record<string, number> };
export type HeritageCard = { opened: string; quiet: string; missed: string; goal: string; sourceUrl: string; sources: string[] };

export type MountainDef = {
  id: MountainId;
  name: string; town: string; state: UsState; act: 1 | 2 | 3 | 4 | 5;
  map: { lat: number; lon: number };   // career hub pin
  terrain: TerrainDef;                 // carries scale { horizontal, vertical }
  site: SiteDef;                       // from 2d, includes arrival { kind, ... }
  rules?: Partial<DesignRules>;        // overrides of descent.ts design constants
  start: StartState;
  climate: ClimateDef;
  economy: EconomyDef;
  archetypes: ArchetypeTag[];
  beats: BeatDef[];
  heritage: HeritageCard;
  oneLine: string;                     // locked-pin history line
};
```

Beat gates stay code: `game/beats.ts` maps `StoryBeatId` to a predicate that reads `thresholds` from the active mountain's `BeatDef`. Data carries copy and numbers, code carries logic. That keeps "content is data" without inventing a rule language.

`DesignRules` is the set of design constants in `descent.ts` (`MIN_LIFT_VERTICAL`, `MAX_LIFT_LENGTH`, `MAX_LOAD_GRADE`, `BASE_AREA_RADIUS`, `MAX_LIFTS`, `MIN_TOP_SPACING`, `MIN_LINE_CLEARANCE`); `rulesFor(terrain, overrides)` merges them before scaling.

Registry and access (`game/mountains/index.ts`, new):

```ts
export const MOUNTAINS: Record<MountainId, MountainDef>;
export function mountainOf(state: { mountainId: MountainId }): MountainDef;
export function terrainOf(state: { mountainId: MountainId }): Terrain; // memoised per id
```

Migration path, in this order, each step green:
1. Add types and `DUTCH_HILL_MOUNTAIN` whose values equal today's constants exactly (`economy.startCash` 12,000, `dailyFixedCost` from row 20, fares 35, 48, 62, and so on).
2. Add `mountainId: MountainId` to `PersistedState`; `createInitialState(seed, mountainId = "dutch_hill")`; save version N+1 (current version at the time; 8 after 2b, higher after row 25) with migration setting `"dutch_hill"`.
3. Replace constant reads in `game/` with `mountainOf(state).economy...` and `terrainOf(state)`; keep `TERRAIN` exported as `terrainOf({ mountainId: "dutch_hill" })` for tests and a deprecation comment.
4. Render and UI read the terrain through a `useTerrain()` hook (`render/useTerrain.ts`) that selects `mountainId` from the store. `layout.ts` constants become `layoutFor(site, terrain)`.

Rule for step 3: no numeric literal moves without a test proving the old and new values are equal. The snapshot must not change.

### Files
- `web/src/game/mountains/types.ts`, `index.ts` (new)
- `web/src/game/mountains/dutchHill.ts` (exists): exports `DUTCH_HILL_MOUNTAIN` around the existing `DUTCH_HILL` terrain def
- `web/src/game/mountains/dutchHill.site.ts` (from 2d)
- `web/src/game/beats.ts` (new or from row 23)
- `web/src/game/state.ts`, `store.ts`, `rules.ts`, `descent.ts`, `types.ts`, `sim.ts`, `balance.ts` (exist)
- `web/src/render/useTerrain.ts` (new); the 12 render files and `ui/BuildSheet.tsx` listed above (exist)

### Tests
- `mountains.test.ts`: Dutch Hill def values equal the old constants (one assertion per moved constant); `terrainOf` returns the same instance per id; every `MountainDef` has a site with an arrival, a heritage `sourceUrl`, scale H in 6 to 15, and mean world grade base to summit in 0.35 to 0.5 (computed from the terrain).
- Save: vN fixture loads with `mountainId: "dutch_hill"`.
- Snapshot byte-identical. Balance property test unchanged.
- Layering test (cross-cutting): no file under `game/` imports `render/` or `ui/`.

### Verification
Standard viewports, smoke only: the game looks and plays the same. Compare home-view screenshots before and after pixel-for-pixel (Playwright `toHaveScreenshot` with a small threshold, or an image diff by eye).

### Acceptance criteria
- `TERRAIN` has no importers outside tests and `mountains/index.ts`.
- All economy, climate and start values come from `MountainDef`.
- Snapshot unchanged; balance table unchanged on 6 seeds.
- Grade-rule test passes for Dutch Hill (0.415 at 6 and 3).

### Risks
This touches 19 files; it will exceed 400 lines. Split as below. Memoised terrain per id must not leak between tests; reset the memo in a test helper.

### Out of scope
Any second mountain; career state; the hub.

### Docs to update
SIMULATION_SPEC Terrain and Economy (values now per mountain); WORLD.md Part 3 "Implementation order" points to `MountainDef`; MASTER_PLAN section 6 "Content is data".

### Size
About 600 lines across all steps. Split: 34a types, registry, `mountainId` in state and save (steps 1 and 2, about 250 lines); 34b `game/` reads through `mountainOf` (step 3, about 200); 34c render and UI through `useTerrain` (step 4, about 200). Each part keeps the snapshot unchanged.

### Open decisions
1. Beat gates as code with data thresholds (recommended) or a small declarative gate language in data.

---

## PR 35: Career map hub

### Goal
Add a New England career map that shows played, current and locked mountains as pins, opens a heritage card for each, and replaces the `mountain2` stub after a winter review.

### Depends on
PR 34, row 24 (winter review carry-forward data). Tenney playable only after PR 36; until then its pin shows "Coming next winter".

### Player-visible result
After the winter review, Continue opens a map of Vermont, New Hampshire, Massachusetts and Maine. Dutch Hill has a green flag with its season score. Tenney is the next pin, with a "Start Tenney" button once available. Further pins are grey with the real name and one line of history. Range names (Green Mountains, White Mountains, Berkshires, Taconic Range) sit across the map in italic serif. The map is also reachable from the Menu.

### Design

What exists: `phase: "mountain2"` in `GamePhase`, rendered by `WinterReviewSheet.tsx` as a stub ("Tenney isn't playable yet..."), with "Replay Dutch Hill winter".

Career state (game, pure):

```ts
// web/src/game/career.ts
export type HillRecord = {
  mountainId: MountainId; seasons: number; bestScore: number; lastReputation: number;
  lifts: number; buildings: BuildingId[]; leftOnDay?: number;
};
export type CareerState = {
  current: MountainId;
  records: Partial<Record<MountainId, HillRecord>>;
  /** Order is the roster order in MOUNTAIN_ORDER. */
};
export const MOUNTAIN_ORDER: MountainId[]; // dutch_hill, tenney, then locked-only entries
export function pinStatus(c: CareerState, id: MountainId): "played" | "current" | "next" | "locked";
export function startMountain(state: GameState, id: MountainId): GameState; // new season on that hill
```

Locked-only entries (no `MountainDef` yet) are a lighter type: `{ id, name, town, state, map, oneLine, sourceUrl }`, held in `game/mountains/roster.ts`. Proposed pins from WORLD.md Part 3, coordinates approximate to two decimals, to verify before ship:

| Mountain | Town | lat, lon (approx.) | One line (draft, verify against NELSAP) |
|---|---|---|---|
| Dutch Hill | Heartwellville, VT | 42.80, -72.93 | Skied 1944 to 1985 on natural snow; lodge gone in 1990 |
| Tenney Mountain | Plymouth, NH | 43.74, -71.78 | 1,400 ft of vertical, opened 1960, closed and reopened more than once |
| Maple Valley | Dummerston, VT | 42.94, -72.62 | Family hill on Route 30 with a long closure |
| Mount Whittier | West Ossipee, NH | 43.82, -71.21 | Remembered for its gondola |
| Hogback Mountain | Marlboro, VT | 42.86, -72.81 | Steep, windy hill on Route 9 |
| Brodie Mountain | New Ashford, MA | 42.62, -73.23 | Night skiing and showmanship |
| Crotched West | Bennington, NH | 43.00, -71.88 | Half of a split ski area |

Map art: an SVG of the four states' outlines, simplified from US Census cartographic boundary files (public domain), at most 30 KB, in `web/public/map/new-england.svg` or inlined as a React component (inlining avoids a fetch and basePath handling; recommended). Projection: equirectangular with a cos(44 deg) longitude factor, a pure function `project(lat, lon, box)` in `ui/careerMap.ts`. Pins are buttons at least 44x44 px with a visible label; the map pans with one finger and pinch-zooms between 1x and 3x (CSS transform on an SVG group; no three.js). Range labels are SVG text in a serif italic at 12 to 14 px, `ink-soft`, rotated along the range. Font: see open decisions.

Flow:

```
Winter review → Continue → Career map (sheet over the night scene)
  pin tap → Heritage card sheet: opened/quiet, what locals miss, your goal, "Read more at NELSAP" (external link, opens a new tab)
  current pin → "Keep playing <name>"
  next pin (available) → "Start <name>" → confirm sheet: "Dutch Hill keeps running with a caretaker" (row 37) → loading → founder stays
  locked pin → name, one line, "Finish <previous> to open"
Menu → "Career map" (same screen, no start buttons mid-season except "Back")
```

A list view toggle ("Map" / "List") shows the same pins as rows for VoiceOver and small screens; the list is the accessible representation of the map.

WORLD.md rules: heritage cards state documented facts with sources; the player's rebuild is fiction; no logos or copied trail maps; dignified tone; credit NELSAP. Every `oneLine` and heritage field must cite a `sourceUrl`; the hub shows "Inspired by New England ski history" and NELSAP credit at the bottom.

### Files
- `web/src/game/career.ts`, `game/mountains/roster.ts` (new)
- `web/src/game/state.ts` (exists): `career: CareerState`; save version bump; migrate `phase: "mountain2"` saves to the hub
- `web/src/game/types.ts` (exists): replace `"mountain2"` with `"career_map"`
- `web/src/ui/CareerMap.tsx`, `ui/HeritageCardSheet.tsx`, `ui/careerMap.ts` (new)
- `web/src/ui/WinterReviewSheet.tsx`, `ui/PlayExperience.tsx` (exist)
- `web/src/app/layout.tsx` (exists): serif font if chosen

### Tests
- `career.test.ts`: pin status for each case; `startMountain` resets day, guests, lifts to the new mountain's start state and keeps founder and talents per MASTER_PLAN (talents persist across career? confirm with row 24's carry-forward); records update after a review.
- `careerMap.test.ts`: `project` puts Dutch Hill south-west of Tenney; all pins inside the SVG box.
- Save: a v-old save in `"mountain2"` loads into `"career_map"`.
- Visual: map at the four viewports, list view, heritage card.

### Verification
Standard viewports; 375x667 must show all pins without overlap at 1x or let the list view cover it. VoiceOver on iPhone: list view reads each pin as "Tenney Mountain, New Hampshire, next, button".

### Acceptance criteria
- `"mountain2"` gone from code; old saves load.
- Every pin has a source URL; heritage text matches WORLD.md rules.
- Pins and list rows at least 44 px; external links open in a new tab with `rel="noopener"`.
- Snapshot unchanged (career state is outside the day sim).

### Risks
Facts in one-liners can be wrong; treat the table above as draft and verify each line against its NELSAP page before merge. Map SVG size; keep under 30 KB after simplification.

### Out of scope
Maine pins, more than one playable mountain beyond Tenney, travel animations.

### Docs to update
WORLD.md Part 3 "Map UI" and roster table (coordinates, verified lines); MASTER_PLAN section 5 screen map ("Career hub").

### Size
About 380 lines. Cut point: list view first (it is the accessible version), pan and zoom second.

### Open decisions
1. Range-label font: add one serif (Fraunces italic, map only, via `next/font/google`, about 25 KB) as the roadmap row asks (recommended), or reuse Nunito italic to stay within the UI pass 2 type rule of two families.
2. Do talents carry to the next mountain: yes, the crew moves with you (recommended, matches ICR career persistence) or reset per hill.

---

## PR 36: Tenney Mountain, NH (Act II)

### Goal
Add Tenney Mountain as the second playable `MountainDef`: colder, steeper, more capital, a roadside arrival area, and measurably harder than Dutch Hill in the balance harness.

### Depends on
PRs 34 and 35; rows 15 (wind sensitivity per lift type), 18 (climate weights), 20 (economy and fail-soft), 22 and 23 (founders and beats engine); 2c and 2d (forest tiers and site rendering read data).

### Player-visible result
"Start Tenney" opens a bigger, steeper hill in central New Hampshire. Cars line the access road shoulder instead of a gravel lot. The summit chair line exists but is derelict; repairing it is the first big decision. Cold days keep snow better, but wind holds close the summit lift some mornings. Guests pay more and expect more. A Dutch Hill strategy that worked does not carry over unchanged.

### Design

Facts used (NELSAP Tenney page, last updated January 2015): Plymouth, NH; operated from 1960; closed and reopened under several owners in the 1990s and 2000s, listed closed after 2010; 1,400 ft vertical; summit double chair (Stadeli, later Borvig chairs), Eclipse triple (Borvig), Hornet double (Stadeli), a platter on the lower trails; snowmaking pond proposed. Current status after 2015 is not on that page and must be checked before writing any heritage or radio copy.

Scale, using the rule "mean world grade base to summit in 0.35 to 0.5", where mean world grade = (V / H) × mean design grade:

| Quantity | Dutch Hill | Tenney (proposed) |
|---|---|---|
| Real vertical | 570 ft | 1,400 ft |
| Design run base to summit | about 4.6 | 4.6 (reuse the Dutch Hill profile scale) |
| Design rise base to summit | about 3.77 | 3.9 |
| Mean design grade | 0.83 | 0.85 |
| H, V | 6, 3 | 10, 5.5 |
| Mean world grade | 0.415 | 0.466 |
| World run, rise | about 27 u, 11.3 u | 46 u, 21.5 u |
| `feetPerUnit` (vertical) | 50.4 | about 65 |
| `horizontalFeetPerUnit` (def, world) | 420, 70 | 920, 92 |
| Implied real mean grade | about 0.30 | about 0.33 (1,400 / 4,230 ft) |
| Vertical exaggeration | 1.4x | 1.4x |
| Bounds (world) | ±144 by ±120 | ±240 by ±200 |
| Play area (world) | 72 by 60 | 120 by 100 |

Tenney is steeper (0.466 against 0.415) and inside the band. The real horizontal run of 4,230 ft is an assumption chosen to give the same 1.4x exaggeration as Dutch Hill; check it against a topographic map before tuning.

Terrain def: a new `TENNEY` `TerrainDef` with its own face profile: a longer, steadier lower face, a steep upper headwall (rollover band design grade 2.0, world 1.1), a north-facing summit ridge, and a lower mountain bench where the platter ran. Keep the same field set as Dutch Hill so `createTerrain` needs no change.

Rules overrides (`rules` in the def): `MAX_LIFT_LENGTH` design 3.4 gives 34 u, short of the 46 u summit run. Set `maxLiftLength: 4.8` design (48 u, about 4,400 ft) so the summit chair line is placeable. `MAX_LIFTS: 4`.

Camera and render: every world-scale constant from 2b and PR 31 finding 6 already hangs off one scale source; Tenney sets it to 10. Proposed: `MAX_DISTANCE` 283, fog 233 to 700, far plane 1600, terrain grid unchanged in cell count (192 by 160) so centre cells grow from 0.53 u to 0.88 u. Triangle count is unchanged by construction. Forest chunk radii from 2c scale with H.

Site (`tenney.site.ts`):

```ts
arrival: { kind: "roadside", road: [{x:-60,z:62},{x:70,z:58}], stalls: 44, side: "uphill", overflow: "none" }
```

Cars park nose-in along the uphill shoulder of the access road, walking path up a short bank to the base lodge (`a-frame-lodge` from PR 29). No gravel lot. The road name is not set in data until verified.

Start state (proposed):

| Field | Value | Why |
|---|---|---|
| Lifts | platter on the lower bench (working); summit double chair line placed, `condition: "derelict"`, repair $9,000 | first decision: repair the summit chair or build elsewhere |
| Buildings | warming hut | lodge is a purchase |
| Guns | none; snowmaking pond is a purchase ($4,500) | matches "proposed pond" history |
| Reputation | 35 | new owners, skeptical locals |

Climate (proposed, consumed by row 18): Dutch Hill weights snow 0.3, clear 0.4, thaw 0.3 roughly match the current formula. Tenney: snow 0.35, clear 0.5, thaw 0.15; `thawSeverity` 0.7; `windHold` 0.12 on chairs above 70% of summit height (row 15 defines which lifts are exposed).

Economy (proposed): start cash $28,000; daily fixed cost 1.8x Dutch Hill's; lift ops 1.5x; fares Cheap $45, Balanced $59, Expensive $74; building costs 1.6x; `expectationBonus` +8 hill-value points so the same snow and queues feel worse.

Beats (Act II, copy drafts only; thresholds are data): first summit ride, a cold snap Saturday, a ski club bus from Plymouth (school bus analogue), a wind-hold week, Abominable Snowglomerate's second offer, winter review. Writers follow WORLD.md Part 4; no named living operators.

Harder, defined as balance properties over the harness (`balance.ts`, 28 days, 6 seeds in CI, 40 in the report):

1. Adaptive on Tenney ends with a lower end-cash ratio (end / start) than adaptive on Dutch Hill, and lower mean satisfaction by at least 5 points.
2. At least three of the nine fixed fare-and-snow combinations go below $0 at some point on Tenney (passive play fails).
3. A Tenney-specific strategy (repair the summit chair by day 5, Balanced, High on wind or thaw mornings) beats adaptive on the combined cash and satisfaction score, so a better plan exists and is not the Dutch Hill plan.
4. No fixed combination is best on both cash and satisfaction (the existing property 1 holds on Tenney).

`runSeason` gains a `mountainId` argument; strategies gain `repairDerelict` as an action. Tuning order if a property fails: economy multipliers first, `expectationBonus` second, climate weights last.

### Files
- `web/src/game/mountains/tenney.ts`, `tenney.site.ts` (new)
- `web/src/game/mountains/index.ts` (from 34): register
- `web/src/game/rules.ts` (exists): `repairLift(state, index)`; derelict lifts closed and not drawn as running
- `web/src/game/balance.ts`, `balance.test.ts`, `balance.report.test.ts` (exist): mountain argument, Tenney properties
- `web/src/render/Lift.tsx` (exists): derelict towers (`lift-tower-derelict`)
- `web/src/ui/BuildSheet.tsx` (exists): "Repair summit chair, $9,000" row with reason when unaffordable
- `web/src/game/content.ts` (exists): Act II beat copy

### Tests
- `tenney.test.ts`: mean world grade in 0.35 to 0.5 and above Dutch Hill's; summit chair line passes `checkLiftLine` with the overrides; default platter valid; site stalls fit the road length.
- `rules.test.ts`: repair deducts cost once, opens the lift, refuses when short of cash with a reason.
- `balance.test.ts`: the four properties above on 6 seeds.
- New characterization snapshot `tenney.characterization.test.ts.snap` (a second safety net, created in this PR; Dutch Hill's snapshot unchanged).
- Visual: Tenney home view, roadside arrival, derelict chair, wind hold morning at the four viewports.

### Verification
Standard viewports, plus performance at 844x390 on Chromium 4x throttle: Tenney within the same triangle and draw-call budget as Dutch Hill. Real iPhone if available: frame rate at home view and fully zoomed out.

### Acceptance criteria
- Tenney playable from the career map through a 28-day winter to its review.
- Four balance properties pass; numbers pasted into SIMULATION_SPEC.
- Dutch Hill snapshot unchanged; Tenney snapshot added.
- Main pass at most 200k triangles and 40 draw calls at Tenney's home view and maximum zoom-out.

### Risks
Harness strategies are Dutch Hill shaped; property 3 needs a new strategy, which can bias the result. The 1.4x exaggeration and the 4,230 ft run are assumptions. Wind and weather depend on rows 15 and 18 existing as designed.

### Out of scope
Triple chair as a lift type, snowmaking pond as water rendering (keep a placeholder), Maple Valley and later mountains.

### Docs to update
WORLD.md Part 3 roster row and a Tenney heritage card draft with sources; SIMULATION_SPEC Balance (Tenney table) and Economy (per-mountain values); MASTER_PLAN row 36; ART_DIRECTION scale notes.

### Size
About 450 lines including data. Split: 36a terrain, site, start state, repair rule, render (about 280); 36b climate, economy, beats, balance properties (about 200).

### Open decisions
1. H = 10, V = 5.5 (recommended) or H = 12, V = 6.6 (same grade, more room, coarser terrain cells at 1.06 u).
2. Repair cost $9,000 for the summit chair (recommended as the first big decision) or start with it limping.

---

## PR 37: Caretaker idle income

### Goal
Pay the player a small daily income from each mountain they have left, computed from how that hill ended, credited during play on the current hill.

### Depends on
PRs 34 to 36; row 20 (economy and loan). WORLD.md lists "The Caretaker (per hill): off-screen manager, idle income sim on departed mountains".

### Player-visible result
On Tenney, the night recap shows "Dutch Hill caretaker +$140" with a "Why?" that says "Reputation 72, 2 lifts, café: about 31 skiers a day at Balanced". The career map shows each departed hill's caretaker line.

### Design

"Idle" means game days on another hill, not real wall-clock time. Wall-clock income invites clock-change exploits, needs a timestamp in the save, and fights the honest-simulation pillar. Open decision below.

Formula (pure, `game/caretaker.ts`), proposed:

```ts
export function caretakerDay(rec: HillRecord, def: MountainDef, dayOfWeek: number): CaretakerLine {
  // guests ≈ 0.35 × base weekday arrivals × reputation/60, weekend × 1.6
  // revenue = guests × def.economy.fares.balanced × 0.85
  // costs = 0.5 × def.economy.dailyFixedCost + lifts × 0.5 × liftOpsCost
  // net = max(0, round to $10 (revenue − costs) × 0.25)   // caretaker's share to you
}
export type CaretakerLine = { mountainId: MountainId; net: number; guests: number; reason: string };
```

Deterministic, no RNG draw (so the active hill's RNG sequence and its snapshot do not change). Reputation of a departed hill decays 0.5 per game day toward 40, so neglect shows. Credited at Sleep as one recap line per hill; included in the Ledger (PR 38) as its own row.

Proposed target: about 6% to 10% of the active hill's net per day, never enough to cover a bad Tenney season alone. Check with the harness: property "a Tenney passive strategy still goes negative with Dutch Hill's caretaker income at reputation 80".

### Files
- `web/src/game/caretaker.ts` (new)
- `web/src/game/rules.ts` (exists): apply at Sleep
- `web/src/game/career.ts` (from 35): decay
- `web/src/ui/NightRecapSheet.tsx`, `ui/CareerMap.tsx` (exist by then)

### Tests
- `caretaker.test.ts`: zero for no records; monotone in reputation; weekend higher; never negative; decay toward 40.
- Harness property above.
- Dutch Hill snapshot unchanged (no records on a first-hill season); Tenney snapshot changes only in cash lines, by exactly the caretaker sums (paste the diff).

### Verification
Standard viewports for the recap line and "Why?" text.

### Acceptance criteria
- One recap line per departed hill with a "Why?" naming reputation, lifts and guest estimate.
- No wall-clock reads in `game/`.
- Harness property passes.

### Risks
Any extra cash eases Tenney; the property guards it.

### Out of scope
Managing departed hills, caretaker hiring, events on departed hills.

### Docs to update
SIMULATION_SPEC new "Caretaker" section; WORLD.md NPC table row.

### Size
About 150 lines.

### Open decisions
1. Game-day income (recommended) or real-time idle income while the app is closed.

---

## PR 38: Ledger

### Goal
Give every dollar a receipt: a per-day income snapshot that reconciles exactly to the cash change, then season statements, both optional and one tap from the night recap.

### Depends on
Row 16 (venue revenue), row 20 (costs, loan), PR 37 (caretaker lines). MASTER_PLAN: "One summary line, tap Why? for the breakdown; Ledger is optional (M5)"; required three-statement accounting is out of scope for v1.

### Player-visible result
38a: on the night recap, "Ledger" opens today's lines: tickets, café, shop, caretaker; fixed cost, lift ops, snow and service, construction, loan interest; net equals the recap's cash change. 38b: a season tab with a day-by-day table, a revenue and cost summary, cash low point, and a simple cash-flow view.

### Design

Ledger entries are produced by the sim where money moves, not reconstructed afterwards:

```ts
// web/src/game/ledger.ts
export type LedgerKind =
  | "tickets" | "cafe" | "shop" | "caretaker" | "loan_in"
  | "fixed" | "lift_ops" | "snow_service" | "construction" | "repair" | "loan_interest" | "loan_repay" | "refund";
export type LedgerLine = { kind: LedgerKind; amount: number; ref?: string /* lift index, building id, mountain id */ };
export type LedgerDay = { day: number; mountainId: MountainId; lines: LedgerLine[]; open: number; close: number };
export function postLine(state: GameState, line: LedgerLine): GameState;
export function closeDay(state: GameState): GameState; // pushes LedgerDay, caps history
```

Every cash write in `rules.ts` and `sim.ts` goes through `postLine` (grep for `cash:` assignments; each becomes a posting). Invariant: `open + sum(lines) === close` for every day, and `close` equals `state.cash` after Sleep. History capped at the season length (28 days); season totals kept as one summary per finished season in `career.records`.

UI: `LedgerSheet.tsx` with two tabs. Lines grouped "Money in" and "Money out", each with a one-line description ("Lift ops: 2 open lifts × $180"). Numbers right-aligned, tabular figures, gains in `sign-green` with a "+" and losses in `barn` with "−" so sign does not rely on colour. Phone: one column at 390x844; the season table scrolls horizontally inside its panel at 375x667 with the day column sticky.

Statements in 38b: Income statement (revenue by kind, costs by kind, net) for the season so far; Cash flow (opening cash, operating net, construction and repairs, loan in and out, closing cash). No balance sheet (no asset valuation in the sim; adding one would invent numbers).

Save: `ledger: LedgerDay[]` in `PersistedState`, version bump; migration starts an empty ledger with a note "Ledger starts today".

### Files
- `web/src/game/ledger.ts` (new)
- `web/src/game/rules.ts`, `sim.ts`, `state.ts`, `caretaker.ts` (exist): postings
- `web/src/ui/LedgerSheet.tsx` (new), `ui/NightRecapSheet.tsx` (exists): entry point

### Tests
- `ledger.test.ts`: reconciliation invariant over a full 28-day season for every harness strategy (run inside `balance.test.ts` to reuse seasons); undo of a lift posts a `refund` that nets to zero; history cap.
- Snapshot: if `ledger` is part of the snapshot output, update with a diff that adds only ledger fields; cash, arrivals, satisfaction lines unchanged.
- Visual: both tabs at the four viewports.

### Verification
Standard viewports; VoiceOver reads each row as "Lift ops, minus 360 dollars".

### Acceptance criteria
- Reconciliation holds for every day of every harness season.
- No cash change in code bypasses `postLine` (a test greps `game/` for direct `cash:` writes outside `ledger.ts`).
- Ledger reachable from the recap in one tap; recap still fits without it.

### Risks
Missed cash writes; the grep test catches them. Snapshot churn; keep ledger out of the characterization output unless needed.

### Out of scope
Per-venue pricing (M7 candidate), balance sheet, valuation, CSV export (save export covers it).

### Docs to update
SIMULATION_SPEC Economy (postings list); MASTER_PLAN row 38 and section 2 Finance row.

### Size
38a about 260 lines; 38b about 180.

### Open decisions
1. Keep history for the current season only (recommended) or all seasons (larger saves).

---

## PR 39: Main menu, Story and Sandbox

### Goal
Add a main menu with Story and Sandbox, where Sandbox starts a new game from settings for mountain, money, weather and talents, with story off.

### Depends on
PR 34 (mountains as data), row 18 (weather model to accept a fixed schedule), row 21 (talent order), PR 40 can land before or after; without slots, Sandbox replaces the single save after a confirm.

### Player-visible result
`/play` opens a menu: Continue (if a save exists), Story, Sandbox, Settings (sound, motion), Credits. Sandbox shows four setting groups and Start. In a Sandbox game the HUD shows a small "Sandbox" tag, no radio beats fire, and the winter review ends with "Play another winter" instead of the career map.

### Design

Settings and their effects:

| Setting | Options | Effect |
|---|---|---|
| Mountain | Dutch Hill template, Tenney (once played in Story or always, see open decisions), Blank hill | `mountainId`; Blank is a generic 1,200 ft New England hill `MountainDef` with no beats and no heritage (WORLD.md Part 3 "Sandbox") |
| Money | Normal, Comfortable, Unlimited | start cash × 1, × 3; Unlimited: costs still posted to the Ledger, cash shown as "Unlimited", never blocks |
| Weather | Live random, Fixed sunny, Storm week | row 18 model; Fixed: every day `clear`; Storm week: a 7-day cycle of snow, snow, clear, thaw, thaw, clear, snow |
| Talents | Crew order, All learned, Pick each night | All: `talentsOwned` = full list at start; Pick: night sheet shows a third tile "Crew learns tonight" with the next three |
| Story | off (fixed) | no beats, no Abominable Snowglomerate |

State:

```ts
export type GameMode = "story" | "sandbox";
export type SandboxSettings = {
  money: "normal" | "comfortable" | "unlimited";
  weather: "live" | "sunny" | "storm_week";
  talents: "crew" | "all" | "pick";
};
// PersistedState gains: mode: GameMode; sandbox: SandboxSettings | null
```

Every rule that consults beats, cash checks or weather branches on `mode` in exactly one place each: `beats.ts` (skip when sandbox), `canAfford(state, cost)` (true when unlimited), `rollWeather(state)` (schedule when set). Balance harness runs Story only.

Routes: keep `/` as the landing page and `/play/` for the game (static export with `trailingSlash: true`). The menu is a game screen inside `PlayExperience` (`phase: "menu"`), not a new route, so deep links and Pages paths stay as they are. Sandbox Start with an existing Story save: if PR 40 is in, it writes a new slot; if not, a confirm sheet says "This replaces your Story save on this device" with Export first (PR 40) or Cancel.

### Files
- `web/src/game/types.ts`, `state.ts`, `rules.ts`, `beats.ts`, `sim.ts` (exist): mode branches
- `web/src/game/mountains/blank.ts` (new)
- `web/src/ui/MainMenu.tsx`, `ui/SandboxSetup.tsx` (new); `ui/PlayExperience.tsx`, `ui/Hud.tsx`, `ui/NightRecapSheet.tsx`, `ui/WinterReviewSheet.tsx` (exist)

### Tests
- `sandbox.test.ts`: no beat fires over a sandbox season; unlimited never blocks a purchase and still posts costs; sunny gives 28 clear days; storm week repeats; all-talents state has every talent day 1; pick mode learns the chosen talent.
- Story snapshot unchanged (mode defaults to story).
- Save: old saves load as `mode: "story"`.
- Visual: menu and setup at the four viewports.

### Verification
Standard viewports; the menu works with VoiceOver (each option a button with its description).

### Acceptance criteria
- Story behaviour byte-identical (snapshot).
- Every sandbox setting has a test and a visible label with a one-line description.
- Continue resumes the last game; a fresh device shows Story highlighted (MASTER_PLAN first launch).

### Risks
Mode branches spreading through rules; the "one place each" rule and a grep test on `mode ===` count keep it contained.

### Out of scope
Imported layouts, new build tools in Sandbox, Director manual ops.

### Docs to update
MASTER_PLAN section 3 Modes and "Sandbox settings"; SIMULATION_SPEC new "Modes" section.

### Size
About 380 lines. Cut point: "Pick each night" talents move to a follow-up.

### Open decisions
1. Tenney in Sandbox before it is reached in Story: available from the start (recommended, Sandbox is for trying things) or only after Story reaches it.

---

## PR 40: Save slots

### Goal
Store several games side by side with a versioned format, migrate the existing single save into slot one, and let players export and import a save file.

### Depends on
Row 25 (save version policy and migrations), PR 39 (mode in state).

### Player-visible result
Continue opens the last slot. A Saves screen lists up to three Story and three Sandbox slots with mountain, day, cash and last played time; each has Play, Rename, Export, Delete (with confirm). Import reads a `.json` file. Old players find their game as "Story 1".

### Design

What exists: zustand `persist` writes one blob to localStorage key `last-chair-v1` with `version` (7 on main; 8 after 2b; higher after row 25), `partialize: toPersisted`, `merge: hydrate`, `migrate()` in `state.ts`.

Storage format:

```ts
// localStorage "last-chair-index"
type SaveIndex = {
  format: 1;
  lastSlot: string | null;
  slots: { id: string; name: string; mode: GameMode; mountainId: MountainId; day: number; cash: number; updatedAt: number; version: number }[];
};
// localStorage "last-chair-slot:<id>"  →  { state: PersistedState, version: number }  (same shape zustand writes today)
// export file
type SaveFile = { app: "last-chair"; format: 1; exportedAt: string; version: number; state: PersistedState; checksum: string };
```

Slot ids are short random strings (`crypto.randomUUID().slice(0, 8)`). The store keeps one active slot: switching calls `useGameStore.persist.setOptions({ name: "last-chair-slot:" + id })` then `useGameStore.persist.rehydrate()`. `updatedAt` and the index summary update on each persist write through a small wrapper around `createJSONStorage`.

Migration of the legacy key, run once on load before the store hydrates: if `last-chair-v1` exists and the index does not, copy it to `last-chair-slot:<new id>`, create the index with that slot as "Story 1", and leave the old key in place for one release (a rollback safety), then remove it in the following PR. Nothing is deleted in this PR.

Export: `JSON.stringify(SaveFile)`, `checksum` = SHA-256 of the state JSON via `crypto.subtle.digest`, saved through a Blob and an `<a download="last-chair-dutch-hill-day-12.json">`. iPhone Safari shows a download prompt and saves to Files; in a home-screen web app, download links may open a share sheet instead; test both. Import: `<input type="file" accept="application/json,.json">`, validate `app`, `format`, checksum, then run `migrate(state, version)` and create a new slot (never overwrite silently).

Size: a save holds guests (up to 48) and lifts with trails; measure on day 28 and assert under 200 KB. Six slots plus index stay well under Safari's roughly 5 MB localStorage quota. Wrap writes in try/catch for `QuotaExceededError` and show "Storage full: export and delete a slot".

Safari storage eviction: Safari may delete script-written storage for a site after 7 days without user interaction when the site is not a home-screen web app. Show a one-time note on the Saves screen: "Safari can clear saves after a week away. Export a backup or add Last Chair to your Home Screen." This is the main reason export and PWA install (M7) matter.

### Files
- `web/src/game/saveFormat.ts` (new, pure): types, `validateSaveFile`, `summaryOf(state)`
- `web/src/ui/saves.ts` (new, browser): index read and write, legacy migration, export, import, checksum
- `web/src/game/store.ts` (exists): slot-aware storage
- `web/src/ui/SavesScreen.tsx` (new); `ui/MainMenu.tsx` (from 39)

### Tests
- `saveFormat.test.ts`: valid file passes; wrong app, wrong format, bad checksum and future version fail with reasons; old version migrates.
- `saves.test.ts` with a fake `localStorage`: legacy key becomes slot one, index created, old key kept; quota error surfaces; six-slot cap.
- Round trip: export then import yields equal `PersistedState`.
- Visual: Saves screen at the four viewports; delete confirm.

### Verification
Real iPhone Safari for export and import (Files app). Reload with each slot active restores it, including mid-night state (P0 step 9).

### Acceptance criteria
- Existing players see their game as Story 1 with no loss.
- Export and import round-trip on iPhone Safari and desktop Chrome.
- Delete asks for confirmation and names the slot.
- No game state in localStorage outside the index and slot keys (plus `last-chair-prefs` and the legacy key for one release).

### Risks
zustand `persist` rename and rehydrate timing (hydration is async with `createJSONStorage`; gate the UI on `persist.hasHydrated()`). Two tabs writing the same slot; last write wins, document it.

### Out of scope
Cloud saves, sync across devices, automatic backups.

### Docs to update
SIMULATION_SPEC "Save format" (index, slots, file format); TESTING P0 step 9 wording.

### Size
About 380 lines. Cut point: Rename and the Safari note can follow.

### Open decisions
1. Slot cap 3 Story plus 3 Sandbox (recommended) or unlimited with a storage meter.

---

## M7: 110% pass

M7 starts only after M3's gate and M4 to M6 are merged, and after one full winter is fun on a phone (MASTER_PLAN section 8, M7). It has five work streams. The first decides what else gets built.

### M7.1 Side-by-side ritual

Goal: pick the top five improvements from evidence, tuning defaults before adding systems.

Setup:
- Ice Coast Revival: one winter of "Build the Mountain (Simple)", 28 days, on whatever build the owner can run (Steam on macOS, or the web or phone build ICR ships outside Steam). Do not copy assets or screenshots into the repo.
- Last Chair: one Story winter on Dutch Hill on the live Pages build, on a real iPhone, from founder pick to winter review.
- Same player, same week, ICR first. Each session is timed. Record the screen if the player agrees (iOS screen recording for Last Chair).

Friction log template (one file per session, `docs/playtests/2026-xx-xx side-by-side <game>.md`, hyphens or spaces in names):

| # | Game day and clock | Screen | What I tried | What happened | What I expected | Severity | Category | Time lost | Fix idea |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Day 3, 10:40 | Build | place a chair to the summit | blocked, reason "too long" | longer cap or a hint | annoying | control | 2 min | show max length while placing |

Severity: blocker (stopped play or needed help), annoying (slowed or confused), polish (noticed, no cost). Category: readability, control, feedback, pacing, economy, story, performance. Also note moments of delight with the same columns, so tuning does not remove them.

Ranking:
1. Merge duplicate frictions across both logs.
2. Score each: `severity weight (blocker 5, annoying 2, polish 1) × occurrences × pillar fit (1 to 3: does fixing it serve "see it, fix it", "fun first", "honest simulation") ÷ cost (S 1, M 2, L 4)`.
3. Any friction fixable by a constant or copy change goes into a "defaults" PR first, regardless of score, and the ritual repeats on that build before any new system is chosen.
4. Map the top frictions onto the candidate list below; pick five whose combined score is highest; if a top friction maps to nothing, it becomes a candidate.

Candidates (MASTER_PLAN section 8, M7 candidate list), with the friction each answers:

| Candidate | Answers | Depends on | Size |
|---|---|---|---|
| Named regulars with bios after N visits | guests feel anonymous | rows 6, 9; persona pool | M |
| Radio serial "Ledger & Cocoa" | nights repetitive | row 23 | M (writing heavy) |
| Heritage card per mountain | history thin | PR 35 | S |
| Abominable Snowglomerate arc branches; co-op ending | Act end flat | rows 23, 24 | L |
| Tomorrow cards on the night recap | cause and effect unclear | row 9 preview | S |
| Talent synergy view (dormant until facility exists) | talents confusing | row 21 | M |
| One-glance ops dashboard | too many taps for status | HUD | M |
| Swipe sheets | sheet switching slow | `Sheet.tsx` | S |
| Scenarios (7-day ice storm) | replay value | rows 18, 39 | M |
| Director manual ops (Sandbox only) | experts want control | row 39 | L |
| Deeper finance; per-venue pricing in Ledger | "only tickets matter" (ICR review) | PR 38, row 16 | M |
| Light staff management | ICR review asks for wages and hiring | row 20 | L |
| Shareable season card and trail-map poster | end of winter has no keepsake | row 24 | M (canvas render to PNG, static, no server) |
| Golden-hour light, snowfall shader, queue heat shimmer, build-place juice, lodge tier visuals | look | PRs 30, 31, 33, 29 | S to M each |

Hill Cup, dailies, leaderboards and live-service features stay out (MASTER_PLAN out of scope for v1).

Output: a short ranked list in MASTER_PLAN M7 with the five picks, each becoming a PR with the same template as rows 28 to 40.

### Q2 PWA shell

Goal: Last Chair installs from Safari, opens full screen, and gestures do not trigger Safari navigation. No service worker and no offline play; that stays in M7.2.

Files:
- `web/src/app/manifest.ts` (new): static manifest, written to `out/manifest.webmanifest`. `start_url` "/play/" and `scope` "/" under the base path (`NEXT_PUBLIC_BASE_PATH`, set from `PAGES_BASE_PATH`), `display` "standalone", `orientation` "any" (the game works in portrait and landscape and never forces rotation), `background_color` sky, `theme_color` ink.
- `web/public/icons/` (new): `icon.svg` source plus `apple-touch-icon.png` (180), `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`. Rendered by `web/scripts/gen-icons.mjs` (Playwright Chromium, no new dependency). Each file is under 60 KB.
- `web/src/app/layout.tsx`: `icons`, `appleWebApp` with `statusBarStyle: "black"` (an opaque bar keeps the clock readable over the light sky; `black-translucent` would draw white text over it), `viewportFit: "cover"` and `themeColor` were already set.
- `web/src/app/globals.css`: `overscroll-behavior: none` on `html` and `body`, `-webkit-touch-callout: none` on `body`. The 3D canvas already has `touch-none`; sheets use `overscroll-contain`.

Safe areas: the HUD top bar, bottom bar, toast, title screen and sheet footers already pad with `env(safe-area-inset-*)`. No change needed.

Limits: iOS draws the left-edge back swipe itself and a page cannot cancel it. The game never pushes history entries, so a back swipe from `/play/` leaves the app rather than undoing a tap. Only a real device confirms install, icon, status bar and gesture behaviour (docs/TESTING.md, "Install on iPhone").

Tests: build output check (manifest and icon URLs carry the base path, meta tags present). Device: the TESTING.md check.

### M7.2 PWA install

Goal: Last Chair installs to the iPhone Home Screen, opens full screen, works offline after one visit, and updates cleanly.

Files:
- `web/public/manifest.webmanifest` (new): `name` "Last Chair", `short_name` "Last Chair", `start_url` "/last-chair/play/", `scope` "/last-chair/", `display` "standalone", `background_color` "#9AD7F5" (sky), `theme_color` "#1B3A57" (ink), `icons` 192 and 512 PNG plus a 512 maskable. Paths must include the basePath; since the file is static, generate it at build time from `PAGES_BASE_PATH` (a 20-line `web/scripts/gen-pwa.mjs` run after `next build`, writing into `out/`), or hard-code `/last-chair/` and accept that local dev has no install.
- `web/public/icons/` (new): `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png` (180x180). iOS uses `apple-touch-icon`, not the manifest icons.
- `web/src/app/layout.tsx` (exists): `metadata.manifest`, `icons.apple`; `appleWebApp` is already set (`capable: true`); add `statusBarStyle: "black-translucent"` and keep `viewportFit: "cover"` (already set) so safe-area insets apply.
- `out/sw.js` generated by `gen-pwa.mjs`: precache list from the `out/` tree (HTML for `/` and `/play/`, `_next/static/**`, `models/**`, `draco/**`, fonts, icons; audio beds excluded from precache and cached on first play). Strategy: cache-first for hashed `_next/static` and versioned assets; network-first with cache fallback for HTML. Cache name includes the git SHA (`GITHUB_SHA` in the Pages workflow). Registration in `PlayExperience.tsx` with `navigator.serviceWorker.register(BASE + "/sw.js", { scope: BASE + "/" })`.
- Update flow: when a new worker is waiting, show a toast "New version ready" with "Reload" (44 px); never reload mid-day without the player.
- `.github/workflows/pages.yml` (exists): run `node scripts/gen-pwa.mjs` after `npm run build`, before `touch out/.nojekyll`.

iOS caveats to design around:
- No install prompt: `beforeinstallprompt` does not exist in Safari. Show a one-time, dismissible "Add to Home Screen" card in Settings with the Share icon and three steps; detect standalone with `navigator.standalone` or `matchMedia("(display-mode: standalone)")` and hide it there.
- Storage is separate: a home-screen web app has its own storage, so a Safari-tab save does not appear in the installed app. The card says so and points to Export and Import (PR 40).
- Home-screen web apps are exempt from Safari's 7-day storage eviction; say so in the card as the reason to install.
- Orientation in the manifest is not honoured on iOS; the game never forces rotation anyway.
- Audio still needs a gesture after every cold launch.

Tests: `gen-pwa` unit test on a fake `out/` tree (paths include basePath; no file over 5 MB precached; total precache under 6 MB); Playwright check that `/last-chair/sw.js` is served and controls `/last-chair/play/` after reload (run against `npx serve out` with the basePath mirrored). Device: install on iPhone, go offline (airplane mode), cold launch, play a day.

Acceptance: installs and launches standalone with correct icon and status bar; offline cold launch reaches the menu and plays; a deploy shows the update toast within one launch; Lighthouse PWA checks that still apply pass in Chromium.

Size: about 220 lines plus icons. Open decision: precache audio beds (offline sound, plus 1.85 MB) or not (recommended: not).

### M7.3 Performance budget pass

Budget (MASTER_PLAN section 5, ART_DIRECTION, 2b handoff):

| Item | Budget | Where it is measured |
|---|---|---|
| Main pass triangles | at most 200k | `renderer.info.render.triangles` after the main pass |
| Main pass draw calls | at most 40 | `renderer.info.render.calls` |
| Frame rate, mid iPhone | 30 fps floor, 60 stretch | device |
| Simulated guests | 20 to 30 on iPhone, 40 on iPad | sim config |
| Drawn guest meshes on iPhone | at most 24 | `Guests.tsx` `MAX` (currently 48, over the stated budget) |
| Heightfield mesh | at most 2K per side | 192 by 160 after 2b |
| Each GLB | under 500 KB | asset check |
| Shadow map | 1024 | `Atmosphere.tsx` |

Expected main-pass draw calls after M4, to verify (estimates; measure, do not trust):

| Group | Calls |
|---|---|
| Terrain, road, ridges (3), sky | 6 |
| Trail ribbons (one per trail, up to 4) | 4 |
| Forest near and mid tiers (2c: kit pines, birch, stand-ins) | 5 |
| Village body and glow | 2 |
| Lifts body and glow (merged per lift, up to 4 lifts) | 8 |
| Guests (5 silhouettes) and carriers (2) and follow marker (2) | 9 |
| Snow guns and plumes | 2 |
| Parked cars (2d, instanced by type) | 3 |
| Total | 39 |

That is one call under the cap with four lifts. Merge all lifts into one body and one glow mesh if the measured count passes 40.

Method:
1. Add a dev-only overlay behind `?perf=1` (stripped from production by `process.env.NODE_ENV`): fps over 5 s, frame time p95, triangles, calls, geometries, textures, JS heap where available.
2. Automated: `phone-check.mjs` (part 3) in Chromium with CDP `Emulation.setCPUThrottlingRate` 4 at 844x390, home view and zoomed out, Dutch Hill and Tenney; fail under 30 fps, over 200k triangles, over 40 calls. WebKit in Playwright has no CPU throttle; use it for correctness only.
3. Device: iPhone 12 or 13 class (mid in 2026), Safari, connected to a Mac; Safari Web Inspector, Timelines, JavaScript and Rendering frames; record 30 s of a busy Saturday at 1x and 3x speed. Low Power Mode on for one run (caps at 30 fps on iOS).
4. Record numbers in `docs/TESTING.md` sign-off log with device, iOS version and build SHA.

What to cut first, in order, stopping when the budget holds:
1. `dpr` from `[1, 2]` to `[1, 1.5]` on devices with `devicePixelRatio >= 3`.
2. Guest instance cap to 24 on iPhone (MASTER_PLAN number) by device class (screen width under 500 CSS px).
3. Mid forest density 0.6 to 0.4 per u² (2c allows this).
4. Shadow: only near-tier proxies; shadow map stays 1024; drop guest shadow proxies before tree proxies.
5. Fog nearer (shrinks the far forest tier).
6. Merge per-lift meshes into one.
7. Terrain grid 192 by 160 to 160 by 128.
Never cut readability items first: skier minimum size, trail ribbon, lift line.

Sim cost: profile `tick` in Web Inspector; if it exceeds 4 ms per frame at 3x speed, move the sim to a Web Worker (the old MASTER_PLAN allowed it only on profile evidence; v2.0 keeps that rule).

### M7.4 Accessibility audit

Scope: every screen (title, menu, HUD, Build, Guests, night recap, Ledger, career map, Saves, Sandbox setup) at 390x844 and 844x390.

Checks (WCAG 2.2 level AA unless noted), each with a pass or fail and a fix PR:

| Check | WCAG | How | Known risk in code |
|---|---|---|---|
| Text contrast at least 4.5:1, large text 3:1 | 1.4.3 | compute every token pair in `globals.css` with a script; night overrides too | `ink-soft #4B6580` on `snow-2 #E3F2FA` |
| Non-text contrast 3:1 (outlines, chips, focus ring) | 1.4.11 | same script | yellow focus ring on white needs its ink edge |
| Colour not the only cue | 1.4.1 | review mood, gains and losses, valid and invalid placement, pin status | placement ghost is green or red only: add a reason line (12c has one) |
| Target size | 2.5.8 (24 px AA); project rule 44 px | Playwright: measure every button's box | recenter button, chips |
| Focus visible and order | 2.4.7, 2.4.3 | keyboard through every sheet | |
| Keyboard | 2.1.1 | all controls reachable; sheets close on Escape | Menu confirm (PR 31 finding 9) |
| Dialog semantics | 4.1.2 | sheets have `role="dialog"`, `aria-modal`, a name (`SheetTitle`) | |
| Pause, stop, hide | 2.2.2 | no animation over 5 s without a stop | `.pulse-ring` loops forever (fixed in PR 33) |
| Animation from interaction | 2.3.3 (AAA, adopted) | reduced motion governs every motion | PR 33 |
| Orientation | 1.3.4 | both orientations work | |
| Reflow and text size | 1.4.10, 1.4.4 | iOS Settings, Display, Text Size at largest; Safari page zoom 200% | fixed-height chips |
| Status messages | 4.1.3 | morning headline, talent toast, "Placed. Undo" announced with `role="status"` | |
| Canvas alternative | 1.1.1 | canvas has `role="img"` and an `aria-label` summary ("Dutch Hill, 11:42, 23 guests, queue 4 minutes"); Guests sheet and ops strip are the accessible view of the scene | |

Tools: `@axe-core/playwright` as a dev dependency in a script (`web/scripts/a11y-check.mjs`) run on each screen; a contrast script over the CSS tokens; manual VoiceOver.

VoiceOver script (iPhone, about 20 minutes):
1. Open `/play/`; swipe through the menu; start Story; pick a founder by name.
2. Read the HUD: time, cash, queue, snow, mood each read with a word, not only a number.
3. Open Guests; follow a guest; hear the follow state.
4. Open Build; hear why a top is blocked; place and undo.
5. Close the hill; set fare and snow with the rotor; hear the preview text; Sleep.
6. Morning headline is announced.
7. Career map list view; open a heritage card; follow the NELSAP link.

Acceptance: no axe "serious" or "critical" violations; every contrast pair passes; VoiceOver script completes without sighted help; results logged in TESTING.md.

### M7 size and order

Ritual first (no code), then performance (so later picks have headroom), then accessibility, then PWA, then the five picked improvements. Each stream above is one or two PRs of under 400 lines.

---

## Cross-cutting engineering tasks not tied to a roadmap row

### Error reporting
Today there is no error boundary or global error handler in `web/src` (no `ErrorBoundary`, `onerror` or reporting SDK found). Options:

| Option | Data leaves device | Cost |
|---|---|---|
| A. React error boundary around `PlayExperience` with "Something went wrong" sheet, "Copy details" (stack, build SHA, user agent, last 20 console errors from a ring buffer) and "Export save" | no | about 120 lines |
| B. A plus a hosted error tracker (Sentry free tier or similar) | yes, to a third party | SDK about 25 to 70 KB gzip, account, privacy note |
| C. A plus a GitHub issue link prefilled with the copied details | only if the player submits | small |

Recommended: A now, C at M7; B only if the owner asks. Also add `window.addEventListener("unhandledrejection", ...)` into the same ring buffer, and WebGL context loss handling (`webglcontextlost` shows "Graphics reset, tap to reload").

### Analytics
No tracking exists. Nothing gets added without the owner's decision. Options: none (current); page views only through a cookie-less, script-light service (GoatCounter, Plausible); or Cloudflare Web Analytics (would require moving DNS; GitHub Pages exposes no server logs). Recommended: none until external playtests need numbers; then page views only via a cookie-less service, disclosed on the landing page, with no gameplay events and no identifiers.

### Asset pipeline checks in CI
Add `web/scripts/check-assets.mjs` and a `check:assets` npm script included in `npm run check`:
- every `.glb` in `public/models/` is listed in `manifest.json` and vice versa; each under 500 KB; each declares `KHR_draco_mesh_compression` in its JSON chunk; tri counts match the manifest within 1% (count from accessor counts, no decode needed);
- `public/draco/` files match `node_modules/three/examples/jsm/libs/draco/gltf/` byte for byte (catches a three upgrade without a decoder refresh);
- every audio file listed with a licence and under its size;
- no file names with underscores or spaces in `public/` (URL safety; the owner's naming rule).

### Bundle size budget
Measured on the existing `web/out/` build in this worktree (build date unknown, so re-measure): `out/` is 3.0 MB; the largest JS chunk is 1.13 MB raw, about 300 KB gzip (likely three.js); the next two are about 72 KB and 46 KB gzip. Proposed budget, checked by `web/scripts/check-bundle.mjs` after `next build` in CI:

| Item | Budget (gzip) |
|---|---|
| JS loaded by `/play/` before the scene | 450 KB |
| Any single JS chunk | 350 KB |
| Models total | 400 KB raw (Draco already compressed) |
| Audio total | 2.2 MB raw, lazy |
| Precache (PWA) | 6 MB |

Fail CI when a budget is exceeded by more than 5%; print the top five chunks.

### Test timeouts
`guestDay`, `balance` and `season.characterization` tests time out at 5 s or 10 s under machine load (2b handoff section 7); `vitest.config.mts` sets no `testTimeout`, so the default 5 s applies, and only `balance.report.test.ts` sets its own. Set `testTimeout: 20_000` in `vitest.config.mts`, and a per-test `{ timeout: 60_000 }` on whole-season tests. Do not raise further; a test that needs more is a performance bug in the sim.

### Remove the Vercel Preview Comments check
It is a GitHub App installation, not repo config; no repo file references Vercel except the 2b handoff doc. The owner removes it: GitHub, repo Settings, Integrations, GitHub Apps, Vercel, Configure, remove repository access (or uninstall at the account's Applications settings). Agents cannot do this and must not try. Afterwards, confirm a new PR shows only the `check` job, then delete the Vercel paragraph in the 2b doc.

### Stale worktrees and branches
On this machine (from `git worktree list`): `last-chair-ui` on `claude/ui-pass-2` and `last-chair-pages` on `claude/github-pages`, both merged; `last-chair-scale` on `claude/docs-2b-handoff`. Local branches include merged `claude/pr5-lift-server` through `claude/pr12a-lift-rules`, `claude/art-pass-2`, `claude/ui-pass-1`, `claude/render-refactor`, `claude/world-scale-2a`; the remote has several more. Plan, each step only after the owner approves the list:
1. `git worktree remove ../last-chair-ui` and `../last-chair-pages` (refuses if dirty; inspect first).
2. `git branch -d <branch>` for local branches merged into `main` (`-d` refuses unmerged ones; never `-D`).
3. Remote: `git push origin --delete <branch>` for merged remote branches, listed in the approval request.
4. Turn on "Automatically delete head branches" in repo settings (owner action) so this does not recur.

Also turn on branch protection for `main` with the `check` job required (TESTING.md mentions it as optional); the merge policy assumes green CI.

### Layering guard
Add a test (`web/src/game/layering.test.ts`) that reads every file under `src/game/` and fails on an import path containing `/render/`, `/ui/`, `@/render` or `@/ui`. Cheap, and PRs 34 to 40 touch `game/` heavily.

---

## Limitations

Rows 28 to 40 depend on M1 to M3 work that is not on `main` yet (rows 12b to 27, world scale 2b to part 3); file and field names taken from those plans are planned names, and every PR must confirm them before coding. Proposed numbers (lighting values, groom strengths, Tenney's H = 10 and V = 5.5, its 4,230 ft horizontal run, climate weights, economy multipliers, caretaker formula, boarder shares, audio sizes, bundle budgets, the draw-call table) are design starting points, labelled "proposed", to be tuned on screen and in the balance harness. Tenney facts come from the NELSAP page last updated January 2015; its later status, the access road name and all pin coordinates and one-liners are unverified. Draw-call and triangle figures are estimates until measured on a device. The bundle measurement comes from an `out/` build of unknown date. iOS behaviour notes (audio start on gesture, audio session, storage eviction and separation, downloads in standalone mode) reflect Safari as of 2026 and need a real-device check in each PR that relies on them.
