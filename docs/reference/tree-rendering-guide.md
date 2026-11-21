# Last Chair — tree rendering guide

**Audience:** art–eng. **Updated:** 2026-11-21 (kit forest + valley glue).

## Tree types (kit + placement)

| Asset | Maps to `variant` | Kit intent | Role on hill |
|-------|-------------------|------------|--------------|
| **pine-a** | 0 | 3 tiers, medium crown | Default conifer |
| **pine-b** | 1 | 4 tiers, tall/slim | Vertical accent |
| **pine-c** | 2 | 3 tiers, widest base | Chunky toy tree |
| **pine-d** | 3 | 2 tiers, short/busy | Understory variety |
| **birch** | `birch: true` (~25%) | White trunk, gold crowns | Breaks green wall |

Placement (`forest.ts`): fixed grid; hash picks variant, birch, **size band** 0/1/2, rotation, tint. Density unchanged since L-C.

## Three rendering tiers

1. **Lease** — kit GLB bake + instancing (`treeKit.ts` → `Trees.tsx`); lowDetail uses procedural cones.
2. **Far** — three-plane impostors, one draw call (`FAR_USE_KIT` stays false).
3. **Valley backdrop** — ridge tree-line colour, fog/horizon, terrain canopy wash (lease + outside).

## Scale

`heightMeters × METERS_TO_WORLD (0.075) × TREE_TOY_SCALE (1.28)` from kitManifest.

## Perf

- Do not raise instance count / `GRID_SPACING`.
- Lease: pine variants + birch + shadow proxy per culled cell.
- Far: one instanced mesh.