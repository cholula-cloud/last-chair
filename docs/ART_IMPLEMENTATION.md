# Art implementation plan (Tier 1 — legible diorama)

**Status:** Plan ready · **Executor:** Composer 2.5 (Opus 5.5 medium blocked by spend limit)  
**Branch:** `cursor/honest-loop-art-721c`  
**Owns:** `web/src/render/**` only

Palette: navy `#0b1628`, snow `#f4f7fb`, accent `#e85d26`, pine `#2d5a4a`.

---

## Goal

Make Dutch Hill readable at a glance on phone: slope, lift line, trail, lodge, forest bowl, snow payoff after Sleep. Paths and follow camera are part of art ownership (they live in the scene).

---

## File layout

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

## Coordinates (world)

| Landmark | Approx | Notes |
|----------|--------|--------|
| Base / lodge | `(2.2, 0, 2.4)` | Keep near current hut |
| Default lift top | `liftAnchor` from store (default ~`-1.2, 0.2`) | Ride path uses this |
| Slope | Rise toward −Z / uphill | Visual: base lower Y, top higher Y |
| Trail corridor | Line from lift top → base | Ribbon + tree clear-cut |

### `guestPaths.ts`

```ts
// Given liftAnchor, guest state, progress ∈ [0,1], index → {x,y,z}
queue: near lift bottom, slight offset by index
ride:  lerp(base → top) along lift line; y follows slope
ski:   lerp(top → base) along trail ribbon (slight lateral ease)
arrive/depart: near lodge / parking
```

**Hard rule:** no hardcoded ride `x = -1.2` — always `liftAnchor`.

---

## Components

### Terrain
- `planeGeometry` with segments, vertex Y displaced into a gentle bowl/slope (or a rotated wedge + snow plane).
- Material color from `snowQuality`: higher → brighter/cleaner `#f4f7fb`; lower → dirtier grey-blue patches (lerp or second translucent layer).
- Optional subtle roughness bump via vertex noise (cheap).

### Lift (T-bar)
- Two uprights (top + bottom), cable between them, simple T-bar cross at mid.
- Group positioned/rotated so cable follows lift top → base.
- Build mode invalid: warm red metal; valid: slate/steel.

### TrailRibbon
- Thin plane or ribbon mesh along ski corridor.
- `buildMode`: opacity 0.55, green if descent valid else red (`checkDescentValid(liftAnchor)`).
- Confirmed: softer white/groom stripe always visible.

### Lodge
- Box body + triangular roof (two planes or extruded).
- 1–2 emissive window quads (`#f97316` low intensity).
- Sits at base zone.

### Trees
- InstancedMesh of simple cone+trunk (8–20 instances).
- Scatter around bowl; **reject** positions within ~0.6 of trail segment.
- Color pine `#2d5a4a`.

### Guests
- Capsule body + tiny head sphere + two thin pole lines (or box skis).
- Colors by state (queue amber, ride blue, ski green) — keep current language.
- Followed: ring + slight scale; **OrbitControls `target` = guest position** (smooth lerp OK).

### Lighting
- Background `#0b1628`.
- Ambient ~0.55, key directional from upper right.
- No volumetric snow / golden hour (110% later).

---

## Store reads (render only)

`guests`, `followId`, `snowQuality`, `liftAnchor`, `buildMode`, `liftConfirmed` — same as today. Keep `useFrame` → `tick`.

---

## Acceptance

1. At a glance: uphill vs downhill clear.  
2. Move lift in Build → guests ride the new line.  
3. Follow guest → camera target tracks them.  
4. Sleep with high snow → mountain reads cleaner than minimal.  
5. `cd web && npm run build` green.

---

## Out of scope (Composer Tier 0 / later)

Fare→arrivals, home copy, build labels Ridge/Mid/Creek, sleep stats — `game/` + `ui/` + `app/`.  
GLB pipeline, audio, story — later.
