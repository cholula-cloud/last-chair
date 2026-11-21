"""Headless batch: build procedural kit meshes and render lodge / village review PNGs."""

import math
import os
import sys

DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, DIR)

OUT = os.environ.get("LAST_CHAIR_RENDER_OUT", "/opt/cursor/artifacts/blender-renders")
KIT = os.environ.get("LAST_CHAIR_KIT_ROOT", "/opt/cursor/artifacts/blender-kit")
os.makedirs(OUT, exist_ok=True)
os.makedirs(os.path.join(KIT, "glb"), exist_ok=True)
os.environ["LAST_CHAIR_KIT_ROOT"] = KIT

import bpy

bpy.ops.wm.read_factory_settings(use_empty=True)

import lib

lib.ROOT = KIT
lib.GLB = os.path.join(KIT, "glb")
lib.REN = OUT


def load_py(module):
    ns = {}
    path = os.path.join(DIR, module)
    exec("from lib import *\n" + open(path, encoding="utf-8").read(), ns)
    return ns


b = load_py("buildings.py")
for fn in ("b_lodge", "b_house", "b_cafe", "b_shop", "b_hut"):
    b[fn]()

import buildings2
import styles

buildings2.build_all(export_glb=True)
styles.build_all(export_glb=True)

p = load_py("props.py")
for tree in p["b_pines"]():
    tree
p["b_lamp"]()
p["b_snowgun"]()
p["b_snowcat"]()

lift = load_py("lift.py")
for fn in ("b_tower", "b_tbar", "b_chair", "b_terminal_bottom", "b_terminal_top", "b_skier"):
    lift[fn]()

sc = load_py("scenes.py")
sc["lineup"]()
sc["vignette"]()

KEY_ASSETS = [
    "base-lodge",
    "lodge-annex-2",
    "lodge-annex-3",
    "lodge-tier-2",
    "lodge-tier-3",
    "lodge-tier-2-chalet70s",
    "lodge-tier-3-chalet70s",
    "cafe",
    "cafe-chalet70s",
    "ski-shop",
    "ski-shop-chalet70s",
    "warming-hut",
]

for name in KEY_ASSETS:
    if bpy.data.objects.get(name):
        lib.render_asset(name, res=960)
    else:
        print(f"skip missing asset: {name}")

for name in ("pine-a", "pine-b", "pine-c", "pine-d"):
    if bpy.data.objects.get(name):
        lib.render_asset(name, res=700)
    else:
        print(f"skip missing asset: {name}")

# Tier-3 timber vs chalet side-by-side
cam = lib.setup_render(1200)
for c in bpy.data.collections:
    if c.name == "scenes":
        for o in list(c.objects):
            bpy.data.objects.remove(o, do_unlink=True)
pairs = [("lodge-tier-3", -5.0), ("lodge-tier-3-chalet70s", 5.0)]
scene = bpy.data.collections.get("scenes") or bpy.data.collections.new("scenes")
if scene.name not in bpy.context.scene.collection.children:
    bpy.context.scene.collection.children.link(scene)
for name, x in pairs:
    ob = bpy.data.objects.get(name)
    if not ob:
        continue
    o = bpy.data.objects.new(name + "-compare", ob.data)
    o.location = (x, 0, 0)
    scene.objects.link(o)
lib.look(cam, (0, 0, 3.2), 90, 22, 28, lens=45)
bpy.context.scene.render.filepath = os.path.join(OUT, "tier3-timber-vs-chalet.png")
bpy.ops.render.render(write_still=True)

print("renders in", OUT)
for f in sorted(os.listdir(OUT)):
    if f.endswith(".png"):
        print(" ", f)