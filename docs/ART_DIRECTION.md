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

**Status (2026-11-16):** Phase 1 shipped as procedural R3F primitives (sloped terrain, T-bar, trail ribbon, hut with roof, instanced trees, low-poly guests). See "Current scene" below.

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

## UI (Story Mode = simple)

**Principle:** UI feels like **lodge paperwork**, not Bloomberg terminal.

- **Palette:** navy `#0b1628`, snow `#f4f7fb`, accent amber `#e85d26`, pine `#2d5a4a`.
- **Night screen:** three big tiles (Fare · Snow & crew · Continue)—ICR recap spirit.
- **Data:** numbers only when tapping “Why?” or Ledger.

Sandbox can expose **debug overlays** (depth map, agent paths)—off in Story.

---

## Blender pipeline

1. Blockout in Blender (metric: 1 unit = 1 m).
2. Materials: limited palette; one roughness map per kit.
3. Export GLB, Draco compress &lt; 500 KB per building where possible.
4. `web/public/assets/...` + manifest JSON.

Characters: shared rig, texture swap for jackets.

---

## Audio direction (stub)

- **Story:** Mountain Radio VO/text first; music bed second.
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
