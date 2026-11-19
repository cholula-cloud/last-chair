# Last Chair: world scale 2b handoff and full plan

> **Historical (2026-11-18):** everything this file specifies is merged. Current plan: `docs/MASTER_PLAN.md`.

Written 2026-11-17 for handoff to Cursor. Source of truth for game rules stays `docs/MASTER_PLAN.md`; this file records the work since PR 11 and specifies PR 2b and everything after it.

Contents

1. Where things stand
2. The feedback that started this
3. Decisions already made
4. PR 2b specification
5. The rest of the plan, in order
6. Working rules
7. Known issues and debt
8. Limitations

---

## 1. Where things stand

> **Pointer (2026-11-18):** This section predates several M2 merges. For **current `main`**, merged GitHub PRs through **#46**, save **v10**, and the **unfixed mobile hill** (HUD loads, WebGL canvas blank on real iPhone — see owner screenshot), read **`docs/Last Chair Roadmap Handoff M2 to M7.md`** → *Where things stand* and *Known blocker — mobile 3D hill not visible*. Do **row 14** only after that blocker is cleared on device.

### Repo, remote, deploy

| Item | Value |
|---|---|
| Repo | `cholula-cloud/last-chair`, app in `web/` |
| Live game | https://cholula-cloud.github.io/last-chair/play/ |
| Landing page | https://cholula-cloud.github.io/last-chair/ |
| Deploy | `.github/workflows/pages.yml` publishes on every push to `main` (static export, about 1 minute) |
| CI | `.github/workflows/ci.yml` runs `npm run check` on every PR: lint, typecheck, test, build |
| Stack | Next.js 16, React 19, TypeScript, React Three Fiber, Zustand, Tailwind 4, Vitest, Playwright |
| Node | 22 (CI) |

Hosting is GitHub Pages only. Vercel was removed in PR 28. A leftover "Vercel Preview Comments" check still appears on PRs; it is a GitHub App integration, not repo config, and can be uninstalled from the repo settings.

### Pull requests

| PR | Title | State |
|---|---|---|
| 29 | PR 11: terrain as data (heightfield in `game/`, portrait framing) | merged |
| 30 | PR 12a: free lift placement rules (game layer) | merged |
| 31 | Camera part 1: free camera controls, recenter, Menu confirm | open, needs fixes (section 1.3) |
| 32 | World scale part 2a: per-mountain scale as data | merged, `407848e` |

`main` is at `407848e`. It contains PRs 11, 12a and 2a. It does not contain PR 31.

### 1.1 What is on main

- `web/src/game/terrain.ts`: one analytic heightfield used by sim and render. `createTerrain(def, scale)` returns world height `V * h(x/H, z/H)`. Exposes `bounds`, `base`, `height`, `gradient`, `grade`, `gradeAlong`, `sustainedPitch`, `feetPerUnit`, `horizontalFeetPerUnit`, `toWorld`, `toDesign`, `scale`. `TERRAIN = createTerrain(DUTCH_HILL)`.
- `web/src/game/mountains/dutchHill.ts`: Dutch Hill as data in design units, `scale: { horizontal: 1, vertical: 1 }`, `horizontalFeetPerUnit: 420`, `verticalFeet: 570`.
- `web/src/game/descent.ts`: `checkLiftLine({bottom, top}, terrain)`, `checkSpacing`, `placementReason`, `rulesFor(terrain)`, `REFERENCE_TOPS`, constants `MIN_LIFT_VERTICAL` 0.85, `MAX_LIFT_LENGTH` 3.4, `MAX_LOAD_GRADE` 1.25, `BASE_AREA_RADIUS` 0.6, `MAX_LIFTS` 3, `MIN_TOP_SPACING` 0.8, `MIN_LINE_CLEARANCE` 0.4. All are design values; `rulesFor` converts them to world limits.
- `web/src/game/rules.ts`: `checkPlacement`, `placeLift`, `undoLift`, `undoableLiftIndex`. Lift identity is the array index; `lifts` is append-only within a season.
- `web/src/game/types.ts`: `LIFT_COST_PARAMS` and `liftCost(type, line, terrain)`, priced in design units. A chair at the Mid reference top costs exactly $2,500.
- Save version is 7 (`SAVE_VERSION` in `web/src/game/state.ts`).
- Interim Build sheet: Ridge, Mid and Creek buttons with valid or blocked reasons, price, Place, Undo.
- `web/src/render/cameraFraming.ts`: `frameView` fits key points into a safe rectangle for a given aspect; `homeView(aspect)` frames the base, lodge, lift and trail.
- Tests: about 299, including the season characterization snapshot at `web/src/game/__snapshots__/season.characterization.test.ts.snap`.

### 1.2 Branches and worktrees on this machine

| Path | Branch | Notes |
|---|---|---|
| `/Users/griffinod/personal-griffin/last-chair` | `claude/camera-controls` | PR 31. Working tree has uncommitted partial fixes in six files (section 1.3) |
| `/Users/griffinod/personal-griffin/last-chair-scale` | `claude/world-scale-2a` | merged branch; this file lives here, untracked |
| `/Users/griffinod/personal-griffin/last-chair-ui` | `claude/ui-pass-2` | merged branch, stale |
| `/Users/griffinod/personal-griffin/last-chair-pages` | `claude/github-pages` | merged branch, stale |

The two stale worktrees and the merged branches can be removed; nothing has been deleted without approval.

### 1.3 PR 31 state and the fixes it still needs

PR 31 has two commits and passes CI. An Opus review returned "merge after fixes". A Sonnet agent started the fixes and stopped on a usage limit, leaving uncommitted edits in `MountainScene.tsx`, `cameraControls.ts`, `cameraControls.test.ts`, `useCameraKeys.ts`, `Hud.tsx` and `PlayExperience.tsx`. Treat those edits as unreviewed. Either continue from them or `git checkout -- .` and start from the list below.

Findings to fix before merge, with locations as of commit `ef66eb2`:

1. `MountainScene.tsx` near line 189 and the glide loop near 250. A double-tap outside `PLAY_AREA` starts a glide that never ends: the glide pulls 14% per frame toward the hit, the soft clamp pulls 10% back, and the stop thresholds are never met. Fix: glide to a point inside the area, cancel the glide when follow is active, cap it at about 90 frames.
2. `MountainScene.tsx` near lines 172 and 197. The `pointerup` listener is on the canvas only, so a mouse release over a HUD button or outside the window leaves the `down` counter stuck at 1; double-tap focus and "pan ends follow" stop working. Fix: listen for `pointerup` and `pointercancel` on `window`, track active pointer ids in a Set.
3. `useCameraKeys.ts` near lines 44 to 54. Arrow keys pan the map behind open sheets and break list scrolling. Fix: return early when the event target is inside `[role=dialog]` or `[role=alertdialog]`. Keys also stick because press and release are matched by `e.key` (Shift+= gives "+", release gives "="). Fix: key held-state on `e.code`; clear held keys on Meta keydown, window blur and visibility change.
4. `PlayExperience.tsx` near line 163. The recenter row adds about 56 px to the bottom HUD stack, which probably covers the base and lodge at 375x667 (PR 11 framing reserves about 150 px at the bottom). Fix: position the recenter button absolutely beside the ActionBar, outside the stack, at least 44x44. Screenshot at 390x844, 375x667, 844x390 and 820x1180.
5. `PlayExperience.tsx` near line 108 and `Hud.tsx` near line 124. The morning note dismisses on a wall-clock timer that runs while paused, behind the founder pick and in background tabs, and its text is lost once dismissed. Fix: start the timer only while the day clock runs; make the full text reachable again, for example by tapping the weather icon.
6. World-unit constants that will not scale with a 6x play area: `TARGET_Y_MAX = 6` (`MountainScene.tsx` near 44), `marchToTerrain` `maxDist = 120` (`cameraControls.ts` near 93), `SOFT_MARGIN = 0.6`, `FOCUS_DISTANCE`, min and max camera distance. Fix: derive all of them from one `WORLD_SCALE`-style source in `cameraControls.ts`. Part 1 sets it to 1 and 2b sets it to 6.
7. `MountainScene.tsx` near line 288. `clampTarget` returns the area centre for non-finite input but the raw target is never reset, so a NaN persists. Fix: when the raw target is not finite, set `rawReady = false` and restore a finite target.
8. Weak tests: `cameraControls.test.ts` near lines 47 and 60 cannot fail. Assert the true maximum excursion (area plus soft margin), that home distance and angles sit inside the OrbitControls limits at several aspects, and test the gesture state machine if extracted as a pure function.
9. Smaller: keyboard moves should set `userMoved`; the Menu confirm should close on Escape from anywhere, return focus to the Menu button, carry modal semantics and close on a map tap.

Item 6 is the one that matters for 2b. If PR 31 merges without it, 2b must do it.

Not verified for PR 31: real touch input (one-finger pan, pinch, two-finger orbit), the Resume follow chip live, wheel zoom-to-cursor feel. The browser tools produce mouse events only.

---

## 2. The feedback that started this

From the game's owner, after playing the live build on a phone:

1. "I can't move around the game, I want to move more freely, not just adjust the camera."
2. "The map is way too small." Later: the playable area must be "wayyy bigger", 6 to 15 times, depending on the mountain. The first map is meant to be small and quaint, "maybe only 6x".
3. "The game needs to be more playable."
4. Add a small parking lot, at least on the first map; other maps should differ. "Let's build out the world."

Audit of the live build (390x844):

- One finger rotated the camera instead of panning. Panning was clamped to about 6 by 5 world units. A one-finger drag tipped the view top-down.
- The hill was a cone with mean grade about 0.83 (40 degrees). Real Dutch Hill averages about 0.29 (16 degrees).
- Lifts and the hill were short next to the props. The Mid chair was about 300 ft at the old scale; the real T-bar was 2,000 ft.
- The playable hill and village used about 3.5% of the 48 by 40 map.
- The morning note covered a third of the screen. "Home" in the action bar left the game. There was no speed control; a game day takes about 4.3 minutes.

Ice Coast Revival research found no public numbers for map size, camera controls or vertical scale. Its Steam page and every news post are silent on them. Targets therefore come from Dutch Hill's real figures (NELSAP and New England Ski History: 570 ft vertical, 1,900 ft base elevation, a 2,000 ft T-bar, 5 to 8 trails) and from standard desktop and mobile builder camera conventions.

---

## 3. Decisions already made

| Decision | Value | Source |
|---|---|---|
| Scale is per-mountain data | `scale: { horizontal H, vertical V }` | owner, Opus design |
| Dutch Hill | H = 6 linear, V = 3 | owner chose 6x; V is a design choice |
| Other mountains | H from 6 to 15; choose V so average grade is 0.35 to 0.5 | owner, Opus design |
| Props keep toy size | skiers, buildings, towers unchanged | Opus design |
| Sim numbers unchanged | ride times, capacities, satisfaction, snow do not read geometry | verified in code audit |
| Placement valid before = valid after | `rulesFor` derives limits from scale | PR 32, tested |
| Mid chair price | exactly $2,500 at any scale | PR 32, tested |
| Arrival area is per-mountain data | Dutch Hill: gravel lot off Route 100 | owner |
| A full lot is visual only | a real cap that turns guests away is a later sim change | Opus design |
| Merge policy | the agent merges its own PRs after green CI and review | owner |

Why V = 3 for Dutch Hill: pure 6x horizontal with V = 1 gives average grade 0.14 (8 degrees), too flat. True scale (V about 2.15) gives 0.30. V = 3 gives 0.415 (22.5 degrees), a 1.4x vertical exaggeration over true that reads as a hill and not a cone. This is a judgment call to tune on screen.

---

## 4. PR 2b specification

### 4.1 Goal

Dutch Hill becomes 6x larger across and 3x taller, the camera and render handle that size, and nothing in the sim outcome changes. The player sees a large quiet hill with a small village at its foot, can pan across it with one finger, and sees chairs and skiers move at believable speeds.

Size estimate: about 390 lines of non-test code. If it passes 550, cut after item 8 (render scale) and put items 9 to 12 in a follow-up.

### 4.2 Preconditions

- PR 32 merged (done).
- PR 31 merged with finding 6 fixed, so camera constants hang off one scale source. If not, do finding 6 first in 2b.

### 4.3 Setup

```bash
git clone https://github.com/cholula-cloud/last-chair.git   # or cd into an existing checkout
cd last-chair
git fetch origin && git checkout main && git pull --ff-only
git checkout -b claude/world-scale-2b
cd web && npm ci
npm run check          # baseline: expect about 299 tests passing, 1 skipped
npm run dev            # http://localhost:3000/play
```

`npm run check` stops at the first failure. Under heavy machine load some tests time out at 5 s or 10 s (`guestDay`, `balance`, `season.characterization`); rerun once before treating that as a failure.

### 4.4 The numbers at 6 and 3

Design values are what the code constants hold. World values are what `rulesFor` and the terrain return after the flip.

| Quantity | Design | World (H = 6, V = 3) | Scales by |
|---|---|---|---|
| Bounds | ±24 by ±20 | ±144 by ±120 | H |
| Base | (0.45, 2.55) | (2.7, 15.3) | H |
| Summit height above base | about 3.77 | about 11.3 | V |
| Mean grade base to summit | 0.83 | 0.415 | V/H |
| Rollover band grade | 1.8 | 0.9 | V/H |
| `feetPerUnit` (vertical) | about 151 | 50.4 | |
| `horizontalFeetPerUnit` | 420 | 70 | 1/H |
| `MAX_LIFT_LENGTH` | 3.4 | 20.4 u (1,428 ft) | H |
| `MIN_LIFT_VERTICAL` | 0.85 | 2.55 u (128 ft) | V |
| `MAX_LOAD_GRADE` | 1.25 | 0.625 | V/H |
| `BASE_AREA_RADIUS` | 0.6 | 3.6 | H |
| `MIN_TOP_SPACING` | 0.8 | 4.8 | H |
| `MIN_LINE_CLEARANCE` | 0.4 | 2.4 | H |
| `sustainedPitch` window | 0.6 | 3.6 | H |
| `gradeAlong` step | 0.05 | 0.3 | H |
| Gradient step | 0.01 | 0.06 | H |

Reference lifts after the flip:

| Lift | Length | Vertical |
|---|---|---|
| Ridge | about 17.2 u, 1,205 ft | about 4.8 u |
| Mid | about 11.9 u, 830 ft | about 150 ft (unchanged in feet) |
| Real summit T-bar | about 27 u | beyond the cap; raising the cap is a later balance decision |

Areas:

- Playable area: 72 by 60 u (5,040 by 4,200 ft, about 486 acres). It is today's village-and-hill rectangle times 6. In world units: x from -33 to 39, z from -33 to 27. This is the part-1 `PLAY_AREA` (x -5.5 to 6.5, z -5.5 to 4.5) times 6.
- Total map: 288 by 240 u, about 7,800 acres.

### 4.5 Work items, in order

**Item 1. Flip Dutch Hill to 6 and 3.**
File: `web/src/game/mountains/dutchHill.ts`. Set `scale: { horizontal: 6, vertical: 3 }`. Keep `horizontalFeetPerUnit: 420` (world value 70) and `verticalFeet: 570`. Expected: `TERRAIN.feetPerUnit` about 50.4, `TERRAIN.horizontalFeetPerUnit` 70, `TERRAIN.base` (2.7, 15.3).
Effect on tests: every test that uses `TERRAIN` with design-unit literals now breaks. Fix them by converting with `TERRAIN.toWorld(...)` or by building an explicit 1/1 terrain with `createTerrain(DUTCH_HILL, UNIT_SCALE)`. Check `worldScale.test.ts` first: its golden-height test must construct the 1/1 terrain explicitly, otherwise it fails after the flip. Affected files likely include `terrain.test.ts`, `descent.test.ts`, `placement.test.ts`, `rules.test.ts`, `terrainMesh.test.ts`, `guestPlacement.test.ts`, `cameraFraming.test.ts`, `layout.test.ts`. Do not weaken assertions; change the literals.

**Item 2. REFERENCE_TOPS in world units.**
File: `web/src/game/descent.ts`. Write the tops as exact two-decimal world literals, because `0.2 * 6` is `1.2000000000000002`:

| Top | Design | World |
|---|---|---|
| Ridge | (-1.2, 0.2) | (-7.2, 1.2) |
| Mid | (0.8, 0.6) | (4.8, 3.6) |
| Creek | (-0.2, 1.0) | (-1.2, 6.0) |

Keep labels. Add a test asserting each literal equals `TERRAIN.toWorld(design)` within 1e-9. `defaultLifts()` keeps using `REFERENCE_TOPS[0]`.
Expected results at 6/3: Ridge and Mid valid, Creek invalid for too little vertical, same as before (Ridge shows as blocked in the Build sheet because it is too close to the default surface lift).

**Item 3. Save v8.**
File: `web/src/game/state.ts` (`SAVE_VERSION` 7 to 8, `migrate()` in `store.ts`). For `fromVersion < 8`, multiply each lift's `anchor.x`, `anchor.z` and, when present, `bottom.x`, `bottom.z` by a frozen literal `V7_DUTCH_HILL_H = 6`, never the live scale. Round to 1e-6. Leave snow trails, queues and guests alone. A lift that fails `checkLiftLine` after migration falls back to the default lift, as v7 does.
Test: a v7 fixture with Ridge, Mid and a custom bottom. After migration every lift is valid and every cost is identical to before.

**Item 4. Village layout from data.**
File: `web/src/render/layout.ts` (and `Lodge.tsx` where it reads positions). Today the buildings sit around the base in design units. After the flip the base is at (2.7, 15.3), so every position must move. Rule: new position = world base + 1.5 times the old offset from the old base, so the village stays cosy and props keep toy size. First-layout targets in world units (tune from screenshots):

| Item | Position (x, z) |
|---|---|
| Warming hut | (3.6, 14.5) |
| Lodge | (5.3, 15.1) |
| Café | (7.7, 14.7) |
| Shop | (8.9, 15.9) |
| Houses | z about 25.5, across Route 100 |
| Parking | keep the current relationship to the lodge; PR 2d replaces it |

Check against the existing constants (`LODGE`, `PARKING`, `CAFE`, `SHOP`, `WARMING_HUT`, `HOUSES`, `LIFT_BASE`) before applying. Buildings must sit on the flat apron: the existing apron test in `render/layout.test.ts` asserts `|height - base height| < 0.05` at each position; keep it and update the positions it reads.

**Item 5. Terrain mesh.**
File: `web/src/render/terrainMesh.ts` and `terrainMesh.test.ts`. Grid 192 by 160 cells, about 31k vertices and 61k triangles. Axis warping gives a dense core:
`gridX(s) = 3.6 + 51 s + 93 s^3` (spans ±144 about the centre), `gridZ(s) = -2.4 + 42 s + 66 s^3` (spans ±108 about the centre), with `s` from -1 to 1. Centre cell is about 0.53 u (37 ft). The mesh test recomputes the grid from literals and compares every vertex y with `TERRAIN.height`; update the literals.

**Item 6. Camera, play area, framing.**
Files: `web/src/render/cameraControls.ts`, `cameraFraming.ts`, `MountainScene.tsx`.

- Replace the fixed `PLAY_AREA` with `playArea(site)` or `PLAY_AREA * WORLD_SCALE` (6). Result: x -33 to 39, z -33 to 27.
- Distances: `MIN_DISTANCE` 6, `MAX_DISTANCE` 170 (the whole play area in portrait), `FOCUS_DISTANCE` 18, `TARGET_Y_MAX` 14, `frameView` maximum 800.
- `marchToTerrain` `maxDist` scales with the world; `SOFT_MARGIN` scales.
- Home view key points: base, lodge, lot centre and far corner (once 2d lands; in 2b the parking position), the default lift's bottom and lower tower, the houses. Portrait home distance is about 40; the test asserts at most 55. The summit may sit in haze.
- Keep the PR 11 behaviour that resizes inside one orientation do not re-home after the user moved the camera (`userMoved`), using the floor-rounded aspect.

**Item 7. Fog and far plane.**
Fog near and far 38 to 110 become 140 to 420. Camera far plane 1000 (in `PlayExperience.tsx` or the Canvas config). `Atmosphere.tsx` scales with it.

**Item 8. Trails and lift towers.**
Files: `TrailRibbon.tsx`, `trail.ts`, `liftLine.ts`, `Lift.tsx`.
- Trail corridor core 3.0 and fade 6.3 (6 times the old values); ribbon width times 6 (0.86 becomes about 5.2; tune so a trail reads at home distance).
- Tower count `inner = clamp(round(length / 3), 3, 10)` replaces the fixed 3 to 5. Toy tower height and the 0.7 cable clearance stay.
- New test: cable clearance of at least 0.5 above the ground at 20 samples per span for every default and reference lift.

**Item 9. Chair speed.**
File: `web/src/render/Lift.tsx` near line 152, currently `phase.current = (phase.current + delta * 0.035) % 1`. Replace the constant with
`rate = 1 / (LIFT_SPECS[type].rideMinutes * MS_PER_GAME_MINUTE / 1000 * speed)`
where `MS_PER_GAME_MINUTE` is 500 (`types.ts`) and `speed` is the sim speed multiplier (1 until part 3). A carrier then crosses the lift in exactly the ride time at any lift length.

**Item 10. Skier minimum size.**
File: `web/src/render/Guests.tsx`. Skiers are toy-size, so at home distance they would vanish. Scale `max(1, cameraDistance / 25)` on the skier mesh. Guest positions stay driven by `progress` along the scaled polyline, so world speed is path length over state minutes. The sim does not change.

**Item 11. Trees.**
File: `web/src/render/Trees.tsx`. Keep today's instance budget and scatter the same count over a radius scaled around the base. The forest will look sparse; PR 2c replaces this with tiered chunked forest. Do not raise the instance count in 2b.

**Item 12. Scene-ready marker.**
Set `data-scene-ready="true"` on the canvas wrapper after the first rendered frame, so screenshot scripts can wait on it instead of fixed sleeps.

### 4.6 Snapshot change

`web/src/game/__snapshots__/season.characterization.test.ts.snap` changes in exactly two lines, near lines 41 and 42, the default lift's top:

```
-      "x": -1.2,   "z": 0.2
+      "x": -7.2,   "z": 1.2
```

Verify line numbers when you get there. Run the test, then `git diff` on the `.snap`. If the diff is exactly those two lines, update with `npx vitest run -u src/game/season.characterization.test.ts`. Any other changed line (cash, arrivals, satisfaction, snow, nights) is a bug in your change. Fix the code; never accept it. Paste the two-line diff into the PR description.

### 4.7 Tests to add or update

- `terrainMesh.test.ts`: literals for the new grid; every vertex equals `TERRAIN.height`.
- `terrain.test.ts` and `worldScale.test.ts`: explicit 1/1 terrain for golden heights; `feetPerUnit` 50.4 and `horizontalFeetPerUnit` 70 on `TERRAIN`.
- `descent.test.ts`, `placement.test.ts`: Ridge and Mid valid, Creek invalid (`too_low`), costs unchanged ($2,500 chair at Mid), reference-top literals equal `toWorld(design)`.
- Save: v7 to v8 fixture (item 3).
- `cameraFraming.test.ts`: at 390x844 the whole play area fits at the maximum distance; home distance at most 55; a skier at home distance is at least 10 px tall (use the real projection).
- Cable clearance (item 8).
- Do not weaken or delete existing tests. Do not touch the snapshot beyond the two lines.

### 4.8 Verification

1. `cd web && npm run check` green.
2. `git diff main...HEAD --stat -- '*.snap'` shows only the two-line change.
3. Run `npm run dev`. Look at the game at 390x844, 844x390, 820x1180 and 375x667, home view and after panning to each edge. Confirm: the village and the lower part of the default lift are visible and clear of the HUD, a one-finger drag pans along the ground, pinch zooms between the limits, chairs take about the ride time to cross, skiers are visible.
4. `npm run playtest:p0` is flaky on this machine (timeouts at different steps, also on a clean `main`). Use it if it runs; do not rely on it.
5. Real iPhone Safari if available; nothing so far has run on a real touch device.
6. Frame rate on a mid-range iPhone: budget at most 200k triangles and 40 draw calls in the main pass.

### 4.9 Acceptance

- Dutch Hill at 6 and 3 on the live build; hill about 27 u across from base to summit.
- Existing saves migrate to v8 with every lift valid and priced the same.
- Only two snapshot lines change.
- Placement outcomes and costs match the 1/1 results for the same design points.
- Home view at 390x844 frames village and lower lift; the player can pan to any part of the play area.

### 4.10 Risks and open tuning

- V = 3 and the 6 times ratios are first values. Tune the look on screen.
- Village coordinates and the 1.5 compaction factor are a first layout.
- At 6x, tap precision for lift placement drops: at home distance 40, 44 px is about 1.9 u, under the 3.6 base radius. 12c handles this (snap taps to the nearest valid point within 22 px, bottom auto-snaps to the base area, placement mode caps camera distance at 90).
- Guests cover 6 times the distance in the same game minutes, so zoomed in they look fast. Ride time from length belongs to PR 15. Slowing the game clock would be a sim change and is out of scope.
- Frame rate from the larger mesh. Triangle counts are estimates until a throttled run on a device.
- Float drift at validity thresholds: covered by the migration's frozen literal and by the invariance test's skip band.

### 4.11 Out of scope for 2b

Tiered forest and backdrop ridges (2c), parking lot and arrivals (2d), speed control and Build sheet camera focus (part 3), tap-on-terrain placement (12c), remote lift bottoms and trail graph (13), ride time from length (15).

### 4.12 PR description (repo template)

```
Goal: Dutch Hill becomes 6x larger across and 3x taller; camera and render handle the size; no rule outcome changes.
Changes:
- dutchHill.ts scale 6/3; REFERENCE_TOPS as world literals
- save v8 migration (frozen H = 6 on lift anchors and bottoms)
- village layout read at world scale; terrain mesh 192x160; playArea, camera limits, fog, far plane
- trail width, tower count, chair speed from ride time, skier minimum size, data-scene-ready
Out of scope: forest tiers and ridges (2c), parking lot (2d), speed control (part 3), tap placement (12c)
Tests: mesh literals, scale-aware terrain/descent/placement tests, v7 to v8 fixture, camera framing and skier size, cable clearance; snapshot changes in two lines (lift anchor x, z)
Phone check: screenshots at 390x844, 844x390, 820x1180, 375x667; real device not checked unless noted
Roadmap: 12-pre part 2b done
```

---

## 5. The rest of the plan, in order

Status key: done, open, planned.

### 5.1 World scale and camera (row 12-pre in MASTER_PLAN)

| Part | Content | Status |
|---|---|---|
| Camera part 1 (PR 31) | one-finger pan, pinch zoom, two-finger orbit, double-tap focus, keyboard, recenter, Resume follow chip, Menu confirm, shorter morning note | open, needs section 1.3 fixes |
| 2a (PR 32) | scale as data, `rulesFor`, cost conversion, invariance tests | done |
| 2b | section 4 | next |
| 2c | tiered forest, birch, backdrop ridges, shadow follow | planned |
| 2d | arrival area, parked cars, walking paths, berms, signs, vehicle kit | planned |
| Part 3 | speed control, Build camera focus, lengths in feet, phone script | planned |

**2c (about 350 lines, no snapshot change).** Forest in 32-unit chunks; instance lists rebuilt when the camera target moves more than 6 u.

| Tier | Radius around target | Density | Count | Triangles |
|---|---|---|---|---|
| Near: kit pines and birch | up to 12 u | 1.5 per u² | about 450 | about 45k |
| Mid: 18-triangle stand-ins | 12 to 45 u | 0.6 per u² | about 2,500 | about 45k |
| Beyond | none; dark canopy vertex colour on the terrain | | | |

Mid density can drop to 0.4 per u² if frame rate needs it. Total budget about 180k triangles, at most 200k, at most 40 draw calls. Shadows: only near-tier proxies cast; the shadow camera follows the target (±14, far 80). Backdrop ridge silhouettes beyond the playable area at radii 320, 420 and 520, fog-free. Forest species mix 75% conifer, 25% birch; corridors are cleared from trail and lift data; clearings at the lot, the village and Dutch Meadows.

**2d (about 380 lines, no snapshot change).** Per-mountain site data in `web/src/game/mountains/dutchHill.site.ts`:
`SiteDef = { arrival, road, paths, buildings, berms, signs, forest, water, backdrop, homeFrame }`. `layout.ts` reads it.

- Arrival: `{ kind: "gravel_lot", center: (7.2, 19.8), size: 5.0 by 2.0, stalls: 30 (2 rows of 15), overflow: "road_shoulder", 12 }`. Vehicle mix pickups 35%, wagons 25%, sedans 40%, in period colours.
- Route 100 runs along z = 24 across the map; an access spur runs from (7.2, 24) to the lot.
- Lot-to-lodge path about 3.3 u, lodge to lift about 2.6 u.
- Two plow berms, 0.25 high and 4 u long, on the lot's north and east sides.
- Signs: Route 100 shield at the junction (already in the toy box), "Dutch Hill" sign at the lot entrance.
- Water: none, because WORLD.md documents no creek or pond. The schema keeps a `water` list for other mountains.
- Sim tie, with no sim change: one car per guest who has arrived and is not yet gone (state neither pending nor gone); stall = hash of guest id mod 30 with linear probing; extra cars go to the shoulder; cars drop in on arrival and vanish when the guest is gone; guests walk stall, path, lodge, lift. A full lot is visual only.
- New kit assets (Blender, `tools/blender`, under 1.5k triangles total): pickup, wagon, sedan, birch, sign post, area sign.
- Each mountain defines its own arrival kind (Tenney: roadside, for example).

**Part 3 (about 120 lines).**
1. Speed control 1x, 2x, 3x: session-only speed in `store.ts`; `MountainScene` multiplies the tick by it; a chip in the Hud top bar. Chair rate (2b item 9) already divides by `speed`.
2. Build sheet: picking Ridge, Mid or Creek eases the camera to that line (`BuildSheet.tsx`, a focus request in `ui/placementDraft.ts`).
3. Build sheet shows lift length and vertical in feet via `feetPerUnit` and `horizontalFeetPerUnit` (`format.ts`).
4. `web/scripts/phone-check.mjs`: Playwright with Chromium and WebKit at 390x844 (touch, DPR 3), 844x390 and 820x1180; wait on `[data-scene-ready="true"]`; CDP `Input.dispatchTouchEvent` for pan, pinch and double-tap; screenshots of home, edge pan, zoom in and out; read draw calls and triangles (dev builds only); measure fps over 5 s at 4x CPU throttle; fail below 30 fps, above 200k triangles or above 40 draw calls.

### 5.2 PR 12: free lift placement (M2)

| Part | Content | Status |
|---|---|---|
| 12a (PR 30) | game rules | done |
| 12b | render takes `LiftLine` and `bottom`: `liftLine.ts`, `guestPlacement.ts`, `Guests.tsx`, `Lift.tsx`, `trail.ts`, `Trees.tsx`; `keyPoints(lines)` includes placed lifts; new `terrainPick.ts` (march 0.05 u steps to 80 u, bisect 20 times against the analytic heightfield, with tests) | planned, about 250 lines |
| 12c | tap UI: `ui/placementDraft.ts`, `PlacementController` in the Canvas (tap = one pointer, under 10 px, under 400 ms), `PlacementBar` (type toggle, step hint, reason line, Cancel, Move bottom, Place for $N, targets at least 44 px), "Placed. Undo" chip, Build sheet slot buttons removed, docs, phone check | planned, about 300 lines |

The 12b and 12c briefs were written against the old scale. Re-validate them after 2b: in 12c, pan and zoom stay ON during placement (the earlier plan to disable them is dropped), taps snap to the nearest valid point within 22 px converted to world units, the bottom auto-snaps to the base area, and placement mode caps camera distance at 90.

### 5.3 M2 remainder (build the mountain)

| PR | Accomplishes |
|---|---|
| 13 | Trail graph: trails from lift top to base; difficulty from sustained pitch (use `sustainedPitch`, thresholds on `realGrade = worldGrade * feetPerUnit / horizontalFeetPerUnit`); guests choose by skill; snow `segmentElevation` switches to normalized real height and the snapshot is re-baselined deliberately; `BASE_AREA_RADIUS` widens |
| 14 | Multi-lift choice: guests pick lift and trail by queue length and skill |
| 15 | Lift types matter: surface vs double chair capacity, ride time from length, wind sensitivity, cost |
| 16 | Village venues: warming hut and lodge seats, café refuel stop, shop revenue, lodge tier 1, guests leave a long lift line for the village |
| 17 | Snowmaking and grooming: placed guns with reach uphill from base, nightly groom capacity, visible plumes and fresh corduroy; reuse the 12c tap pipeline |

Gate M2: moving a lift or adding a trail measurably changes next-day queues and satisfaction.

### 5.4 M3: one full winter (product MVP)

| PR | Accomplishes |
|---|---|
| 18 | Weather model: seeded forecast, storms, thaw, wind holds |
| 19 | 28-day calendar: weekends, holiday weeks, season length as config |
| 20 | Economy and fail-soft: fixed and lift ops costs, construction draws cash (staged cost), loan offer, bankruptcy; balance harness expectations |
| 21 | Crew talents with real effects: 12 to 20 talents, each with a test |
| 22 | Founders complete: all six modifiers live |
| 23 | Route 100 Radio and Act I beats: six beats on metric gates, delivered at night |
| 24 | Winter review: season score, beats, talents, carry-forward data |
| 25 | Save versioning: schema version policy, migrations, old saves load or reset |
| 26 | Coached first winter: Elena walks a new player from first lift to first night choice, skippable |
| 27 | MVP balance and external playtest: three outside players finish winter 1 on phone or tablet unaided |

Gate M3: the P1 script in `docs/TESTING.md` signed by three external players.

### 5.5 M4 to M7

| Milestone | PRs |
|---|---|
| M4 / M4b (superseded by MASTER_PLAN v2.3) | M4 code: B6/B7 build UX, P4 polish, 30–33, O4, F3. M4b Blender: 28–29, S1–S3, A1–A5 |
| M5 career | 34 mountain definitions as data (terrain, scale, site, start state, beats), 35 career map hub, 36 Tenney Mountain NH (colder, steeper, more capital; scale up to 15x), 37 caretaker idle income, 38 ledger |
| M6 sandbox | 39 main menu Story and Sandbox with mountain, money, weather, talent settings, 40 save slots |
| M7 110% pass | top five improvements after a side-by-side with Ice Coast Revival, PWA install, performance budget pass, accessibility audit |

PR numbers 28 onward in MASTER_PLAN's roadmap table collide with GitHub PR numbers; the roadmap numbers are plan row numbers and GitHub numbers are separate.

---

## 6. Working rules

From `docs/MASTER_PLAN.md` section 5, applied to every PR:

1. One goal. Aim for under about 400 changed lines of non-test code; split if it grows. Past PRs overran on purpose when parts depended on each other; say so in the description.
2. Sim changes ship with unit tests; bug fixes ship with a regression test.
3. Build, test, refactor, debug. Finish with a cleanup pass on what the PR touched.
4. `npm run check` green.
5. Check anything the player sees on a phone viewport.
6. Docs move with code: update the MASTER_PLAN roadmap status and SIMULATION_SPEC "implemented" markers in the same PR.
7. No new systems on top of a fake one.

Layering: `web/src/game/` is pure TypeScript and never imports from `render/` or `ui/`, tests included. `render/` reads state and never writes rules. Content is data.

Process used so far: an Opus agent writes the implementation brief, a Sonnet agent builds it on a branch, an Opus agent reviews the diff against the brief, a Sonnet agent applies the review fixes, the author re-runs `npm run check`, opens the PR, and merges with a merge commit after CI is green. Each PR description follows the template: Goal, Changes, Out of scope, Tests, Phone check, Roadmap, plus a Size line when over budget. Memory notes for this project say the same: Opus plans and reviews, Sonnet codes, MASTER_PLAN is the authority, no Vercel.

File names: no underscores; use hyphens or spaces. Existing docs use underscores and predate that rule.

The characterization snapshot is the sim safety net. Update it only when the diff is exactly the expected lines.

GitHub auto-merge is disabled on the repo, so merge by hand after CI is green: `gh pr merge <n> --merge`.

---

## 7. Known issues and debt

| Item | Detail |
|---|---|
| PR 31 fixes | section 1.3; uncommitted partial edits sit in the working tree |
| Flaky timeouts | `guestDay`, `balance` and `season.characterization` tests time out at 5 s and 10 s when the machine is loaded; a rerun passes. Consider raising those timeouts |
| `playtest:p0` | times out at different steps on this machine, also on a clean `main`. Part 3 replaces it with a reliable script |
| Real touch input | never exercised; every browser check used mouse events |
| Real device | no iPhone check yet for M1 gate or anything since |
| Vercel check | "Vercel Preview Comments" still reports on PRs; uninstall the integration |
| Stale worktrees and branches | `last-chair-ui`, `last-chair-pages`, merged `claude/*` branches |
| Interim Build sheet | Ridge shows blocked (too close to the default surface lift); Mid is the valid top. 12c replaces the sheet |
| Docs lag | `docs/MASTER_PLAN.md` row 12-pre exists only on the PR 31 branch; `docs/WORLD.md` and `docs/ART_DIRECTION.md` need the scale, site and arrival edits listed in the 2b to 2d sections |
| Ice Coast Revival data | no public map size or controls; the 6 to 15 times figures come from the owner |

---

## 8. Limitations

The scale numbers (V = 3, 70 ft per horizontal unit, village coordinates, the 1.5 compaction factor, 30 stalls, tree densities and triangle counts) are design values chosen to give a hill that reads correctly, not measured figures. The horizontal figure assumes the real T-bar ran base to summit. Triangle and draw-call counts are estimates until a throttled run on a device. The PR 31 review was done by reading code and running one test file; its findings are unverified in a browser. The 12b and 12c briefs predate the scale decision and need revalidation. Line numbers in this file are from the commits named and will drift.
