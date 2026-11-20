# M4b asset spec, batch 1

**Scope:** Blender output only (GLB, manifest v2 rows, review renders) for rows 29 (leftovers), T1, A1 to A4 and S2. Game wiring (catalog rows, `TrailSign.tsx` swap, style picker, `kit.ts` reading the manifest) ships later in each row's code PR. Written 2026-11-19.

## Shared rules

**Conventions.** Metres. Blender +Z up, front faces −Y (glTF +Z after `export_yup`). Origin at base centre, lowest vertex at z = 0. Vertex colour only: every surface is a named material from `lib.PALETTE`; the game bakes material colour to vertex colour. Emissive names the game already handles: `window-glow`, `lamp-glow`. Add new palette colours with `PALETTE.setdefault(...)` inside your own module, not by editing `lib.py`.

**Readability.** Buildings draw at `METERS_TO_WORLD = 0.075`: a 10 m lodge is about 0.75 world units, 40 to 80 px tall on a phone at home distance. Detail under about 0.3 m disappears. Spend triangles on silhouette, roof shape, snow caps, warm windows and one strong accent colour. Every roof and flat top carries a snow cap (`snow`). Bevel chunky edges with the `bevel=` argument where it reads.

**Code pattern.** Copy `tools/blender/buildings2.py`: `import lib; from lib import *`, `b_*()` builders using `Asset` (`box`, `cyl`, `sphere`, `poly`) ending in `a.finish()`, a `BUILDERS` list, and `build_all(out=None, export_glb=True)` that returns rows.

**Running.** Headless, one process per module so builders can run in parallel:

```
KIT=<your scratch kit root>
LAST_CHAIR_KIT_ROOT=$KIT /Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \
  --python-expr "import sys; sys.path.insert(0,'<repo>/tools/blender'); import <module> as m; import json; rows=m.build_all('<repo>/web/public/models'); ..."
```

Never touch the interactive Blender session (the MCP one); it belongs to the owner. Renders go to `$KIT/renders/` via `lib.render_asset(name)`. Look at every render and iterate until it reads well at thumbnail size.

**Manifest rows.** Each module writes `$KIT/rows-<module>.json`, a list of manifest v2 entries:

```json
{"name": "trail-sign", "file": "trail-sign.glb", "tris": 140, "sizeBytes": 5120,
 "heightMeters": 2.6, "footprintMeters": [1.2, 0.2], "tags": ["prop"],
 "split": ["sign-face"], "style": "chalet70s", "styleOf": "lodge-tier-1"}
```

`split`, `style`, `styleOf`, `ropeYMeters`, `ropeOffsetXMeters`, `gripHeightMeters` only when they apply. Tags: `building`, `lift`, `carrier`, `guest`, `tree`, `prop`, `vehicle`, `activity`, `decor`, `sign`. `tools/blender/manifest.py` merges rows into `web/public/models/manifest.json` (v2).

**Names.** Hyphenated file stems, no underscores. Style variants are `<base>-<style>.glb`, e.g. `lodge-tier-1-chalet70s.glb`.

**Split materials with UVs.** Where an asset has a runtime texture slot (sign faces, map faces), that face is its own quad with material named as listed and UVs spanning 0 to 1 with the stated aspect. All other faces can keep whatever UVs bmesh gives.

## Row 29 leftovers (module `lift2.py`, plus `manifest.py`)

| Asset | Tris max | Size max | Spec |
|---|---|---|---|
| `surface-terminal-bottom` | 350 | 10 KB | Low bullwheel shed for a T-bar or platter: horizontal bullwheel, small timber motor shed, rope lines at x = ±1.6 m along Y (`GAUGE`), rope height recorded as `ropeYMeters` |
| `surface-terminal-top` | 300 | 9 KB | Return bullwheel on an A-frame steel post, no shed, same gauge and rope height convention |
| `platter` | 80 | 4 KB | Pole with disc seat, spring box and grip; grip at top recorded as `gripHeightMeters` |
| `lift-tower-derelict` | 228 | 7 KB | `b_tower` without sheaves, rust tint (new `rust` colour), crossarm slightly askew, no snow on crossarm |
| `lodge-tier-1` | 2,000 | 25 KB | Exact copy of `base-lodge` under the tier name. Keep `base-lodge.glb` until the code PR switches |

`manifest.py`: plain Python (no `bpy` import at module top), `merge(rows_files, manifest_path)` upserts rows by `name` into the existing manifest, converts it to v2 (`version: 2`, `front: "+Z"`, `recolorMaterials` becomes `split` when non-empty), preserves existing rope and grip fields, and adds `tags` to every legacy entry. Also runnable as `python3 tools/blender/manifest.py <manifest.json> <rows.json>...`.

## T1 trail signage (module `signage.py`)

| Asset | Tris max | Size max | Spec |
|---|---|---|---|
| `trail-sign` | 150 | 6 KB | US ski-area trail entrance sign: one rough timber post (about 0.15 m square, 2.4 m), one board about 1.2 × 0.45 m mounted near the top, small snow cap. Board front is split material `sign-face`, UV 0 to 1, aspect 8:3; the game draws difficulty shape, trail name and condition glyph onto it |
| `trail-sign-double` | 220 | 8 KB | Same post with two stacked boards (fork at an entrance), faces `sign-face` (upper) and `sign-face-2` (lower) |
| `trail-map-kiosk` | 400 | 12 KB | One per lift unload: two posts, shallow gable roof with snow, board about 2.4 × 1.5 m, face `map-face`, UV 0 to 1, aspect 8:5 |
| `rope-gate` | 120 | 5 KB | Trail closure: two bamboo poles (yellow-black bands) 3 m apart, sagging rope, small `closed-face` board (UV, 2:1) hanging in the middle |

## A1 and A2: tubing hill and ice rink (module `activities1.py`)

| Asset | Tris max | Size max | Spec |
|---|---|---|---|
| `tubing-hut` | 700 | 18 KB | Tube rental and ticket hut at the tubing top, about 5 × 4 m, with a stack of inner tubes beside it and a warm window |
| `tube` | 60 | 3 KB | Single inner tube, about 1.1 m across; split material `tube` so the game can tint it; instanced |
| `magic-carpet` | 220 | 8 KB | Conveyor segment 10 m long along Y, about 1 m wide, low side rails, translucent-looking covered tunnel arches (use `glass-dark` or a pale `tunnel` colour); tiles end to end up a slope |
| `tubing-lane` | 80 | 4 KB | Snow berm pair framing one lane, 10 m segment along Y, lane 2.5 m wide; tiles along the slope |
| `ice-rink` | 1,800 | 40 KB | Rink about 30 × 15 m with rounded corners: `ice` surface (new pale blue-white), white boards with a red top rail, two light poles with `lamp-glow`, a bench row and a small skate-rental shed on one long side |
| `skater` | 350 | 12 KB | Guest silhouette on skates, no skis or poles, adult proportions matching `skier` (hip 0.98 m); split materials `jacket` and `helmet` (helmet reads as a knit hat) |

## A3 and A4: bar and decor (module `activities2.py`)

| Asset | Tris max | Size max | Spec |
|---|---|---|---|
| `apres-bar` | 2,200 | 40 KB | Tier 3 bar and restaurant, about 14 × 10 m, 1950s timber to match Dutch Hill: big snow-covered gable, wide glowing windows, deck on the front with railings, string lights along the deck, stone chimney, a hanging sign board |
| `fire-pit` | 150 | 6 KB | Stone ring about 1.6 m across, crossed logs, flame from `lamp-glow`, two log benches |
| `string-lights` | 200 | 6 KB | Two timber posts 10 m apart with a sagging line of `lamp-glow` bulbs |
| `ski-rack` | 150 | 5 KB | Timber rack about 3 m long with a few skis leaning in it |
| `bench` | 120 | 4 KB | Adirondack-style timber bench |
| `picnic-table` | 100 | 4 KB | Timber picnic table, snow on the top |
| `direction-sign` | 120 | 5 KB | Base-area wayfinding post with three arrow boards (split `arrow-face` UV 0 to 1, aspect 4:1 on the top board only) |

## S2 style pack: 1970s A-frame chalet (module `styles.py`)

The existing kit is the default style `timber50s`. This module builds the alternate style `chalet70s` for the same assets.

| Variant | Base | Tris max |
|---|---|---|
| `lodge-tier-1-chalet70s` | `lodge-tier-1` | 2,300 |
| `lodge-tier-2-chalet70s` | `lodge-tier-2` | 3,200 |
| `lodge-tier-3-chalet70s` | `lodge-tier-3` | 4,100 |
| `cafe-chalet70s` | `cafe` | 1,000 |
| `ski-shop-chalet70s` | `ski-shop` | 650 |
| `warming-hut-chalet70s` | `warming-hut` | 460 |

Each variant keeps its base's footprint within ±5% and its door on the front face near the same x, so placement, collision and the lodge attach pads do not change. Look: steep A-frame or very steep gable roofs in dark cedar shake, dark stained vertical board walls, full-height gable-end glazing glowing amber, ochre or burnt-orange trim, a stone chimney, deep snow on the roof. Tiers step up the same way as the base kit (tier 2 adds a wing and deck, tier 3 a second storey). Rows carry `style: "chalet70s"` and `styleOf: <base>`.

## Review

Each module ships its renders. Opus reviews every render on a contact sheet next to the existing kit for scale and palette match. Budget check: tris and bytes against the tables above, using the manifest rows.
