# Activity & decor reference renders

Headless contact sheets for M4b batch 1 activity and decor kits. Generate on a machine with Draco-enabled Blender (same env as `tools/blender/`):

```bash
blender --background --factory-startup \
  --python tools/blender/render_activities.py
```

Output PNGs land in this folder (`tubing-hut.png`, `ice-rink.png`, etc.). The CI VM may not decode every Draco GLB; run locally if imports fail.