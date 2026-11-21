# Lodge style reference (Blender)

Two cosmetic families ship for the Dutch Hill lodge and base venues:

| Style id | Kit name | Look |
|----------|----------|------|
| `1950s-timber` | `timber50s` | Barn-red walls, white trim, slate roof, timber deck |
| `chalet70s` | S2 pack | Dark cedar, steep gable glazing, ochre trim |

Tier upgrades stack annex GLBs (`base-lodge` + `lodge-annex-2/3`, or the `*-chalet70s` counterparts). Full-shell `lodge-tier-N` meshes match each tier for asset review.

Blender EEVEE review renders (same pipeline as `tools/blender/lib.py` `render_asset`):

![timber vs chalet tiers](lodge-tier-style-compare.png)

![timber50s kit](lodge-timbers50s-grid.png)

![chalet70s kit](lodge-chalet70s-grid.png)

Regenerate headless renders (requires Blender 4+):

```bash
blender --background --factory-startup --python tools/blender/render_lodge_styles.py
```

Output defaults to `docs/reference/lodge-style-renders/`.