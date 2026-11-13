# Last Chair — art direction

**Version:** 0.3 · **Updated:** 2026-11-13  
**Strategy:** Match **ICR cozy NE diorama feel** with **original assets**; **110%** = lighting, juice, UI polish **after** [FEEL_SCORECARD](./FEEL_SCORECARD.md) P0 on mobile.

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

**Phase 1 (vertical slice):**

- Procedural heightfield + snow cap shader (no bespoke hero mesh yet).
- Placeholder lift: T-bar mesh (simple).
- Placeholder hut: box + roof + emissive windows.
- Guest: capsule or stock low-poly rig.

**Phase 2 (P1 look):**

- Blender **village kit v1:** warming hut, café, small shop.
- Blender **lift kit v1:** rope/surface, double chair.
- Tree scatter system + trail corridor clear visual.

**Phase 3:** Lodge tiers, night lights, chalet on slope.

110% lighting pass waits until Phase 3 review ([IMPROVEMENTS_PASS.md](./IMPROVEMENTS_PASS.md)).

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
