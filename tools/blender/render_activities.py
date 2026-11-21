"""Headless renders for M4b activity and decor kits (batch 1 leftovers)."""

import os
import sys

DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, DIR)

OUT = os.environ.get(
    "LAST_CHAIR_RENDER_OUT",
    os.path.join(DIR, "..", "..", "docs", "reference", "activity-renders"),
)
os.makedirs(OUT, exist_ok=True)

import bpy

bpy.ops.wm.read_factory_settings(use_empty=True)
import lib

lib.REN = OUT

ACTIVITY_ASSETS = [
    "tubing-hut",
    "ice-rink",
    "apres-bar",
    "fire-pit",
    "string-lights",
    "bench",
    "ski-rack",
    "direction-sign",
    "rope-gate",
    "magic-carpet",
    "tube",
]

for name in ACTIVITY_ASSETS:
    path = os.path.join(os.path.dirname(DIR), "..", "web", "public", "models", f"{name}.glb")
    path = os.path.abspath(path)
    if not os.path.isfile(path):
        print(f"skip missing: {path}")
        continue
    bpy.ops.import_scene.gltf(filepath=path)
    imported = bpy.context.selected_objects
    if not imported:
        print(f"skip empty import: {name}")
        continue
    root = imported[0]
    while root.parent:
        root = root.parent
    lib.render_asset(root.name, res=800, out_name=f"{name}.png")
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()

print("activity renders in", OUT)