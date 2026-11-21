# Lodge style reference (Blender)

Cosmetic families for the Dutch Hill lodge and base venues. Styles never change sim numbers.

| Style id | Manifest suffix | Look |
|----------|-----------------|------|
| `1950s-timber` | _(default, no suffix)_ | Barn-red walls, white trim, slate roof, timber deck |
| `chalet70s` | `chalet70s` | Dark cedar, steep gable glazing, ochre trim |
| `aframe60s` | `aframe60s` | Steep prism lodge, full front glazing, 1960s summit look |
| `adirondack` | `adirondack` | Log + fieldstone, wide eaves, rustic luxury |
| `sugarhouse` | `sugarhouse` | Horizontal clapboard bands, maple-amber trim, roof cupola |

## Camera-facing tier massing

Default phone view is elevated southwest. Blender **front = −Y** (glTF **+Z**).

Shared layout lives in [`tools/blender/lodge_tier_layout.py`](../../tools/blender/lodge_tier_layout.py):

| Tier | Player-facing read |
|------|--------------------|
| **2** | Forward two-story gabled bay on −Y, wider deck + stairs, flank ski rack, modest ±X wing |
| **3** | Portico / porte-cochère on −Y, front gallery, banner poles, ridge cupola, fire pits on approach, flank dining tower |

**Do not** grow primary upgrade mass on **+Y (rear)** — that reads as “behind” the lodge from the game camera.

Tier upgrades stack annex GLBs (`base-lodge` / `lodge-tier-1-{style}` + `lodge-annex-2/3` or styled counterparts). Full-shell `lodge-tier-2*` / `lodge-tier-3*` meshes match for asset review.

## Base venues per theme

Each pack exports: `cafe`, `ski-shop`, `rental-shop`, `warming-hut`, `waffle-haus` (+ styleOf keys).

| Venue | Sim id | Role |
|-------|--------|------|
| Ski shop | `shop` | Retail apparel / display boards |
| Rental shop | `rentals` | Boot wall, counter, returns — **separate GLB** |
| Warming hut | `warming_hut` | Tier 1 refuel shelter |
| Waffle Haus | `waffle_haus` | Tier 3 brunch / hospitality |
| Ski school desk | `ski_school` | Lessons desk GLB (`ski-school-desk`) |

## Unlock

- `1950s-timber`: always
- `chalet70s`: Lodge Tier ≥ 2 or winter review
- `aframe60s` / `adirondack` / `sugarhouse`: Lodge Tier ≥ 3 or winter review

## Renders

```bash
blender --background --factory-startup --python tools/blender/render_lodge_styles.py
```

Output defaults to `docs/reference/lodge-style-renders/`.
