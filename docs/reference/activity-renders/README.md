# Activity & decor reference renders

Headless contact sheets for M4b batch 1 activity and decor kits. Roadmap status: [MASTER_PLAN.md](../../MASTER_PLAN.md) § M4b ([#144](https://github.com/cholula-cloud/last-chair/pull/144)–[#146](https://github.com/cholula-cloud/last-chair/pull/146)). The script **rebuilds meshes from `tools/blender/` builders** (no Draco GLB import), then renders each asset with `lib.render_asset`.

```bash
blender --background --factory-startup \
  --python tools/blender/render_activities.py
```

PNG outputs land in this folder (`tubing-hut.png`, `ice-rink.png`, etc.). Override output with `LAST_CHAIR_RENDER_OUT`.