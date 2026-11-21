"""Headless renders for M4b activity and decor kits.

Rebuilds meshes from Blender builders (no Draco GLB import) and writes PNGs
to docs/reference/activity-renders/ by default.
"""

import importlib.util
import os
import sys

DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, DIR)

OUT = os.environ.get(
    "LAST_CHAIR_RENDER_OUT",
    os.path.join(DIR, "..", "..", "docs", "reference", "activity-renders"),
)
KIT = os.environ.get(
    "LAST_CHAIR_KIT_ROOT",
    os.path.join(DIR, "_scratch", "activity-render-kit"),
)
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
    path = os.path.join(DIR, module)
    name = module.replace(".py", "").replace("/", "_")
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise ImportError(f"cannot load {path}")
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


ACTIVITIES1 = load_py("activities1.py")
ACTIVITIES2 = load_py("activities2.py")
SIGNAGE = load_py("signage.py")

ACTIVITIES1.build_all(export_glb=False)
ACTIVITIES2.build_all(export_glb=False)
SIGNAGE.build_all(export_glb=False)

RENDER_LIST = [
    "tubing-hut",
    "ice-rink",
    "apres-bar",
    "fire-pit",
    "string-lights",
    "bench",
    "ski-rack",
    "picnic-table",
    "direction-sign",
    "rope-gate",
    "magic-carpet",
    "tube",
    "skater",
    "trail-map-kiosk",
]

rendered = []
skipped = []
for name in RENDER_LIST:
    if not bpy.data.objects.get(name):
        skipped.append(name)
        continue
    try:
        lib.render_asset(name, res=800)
        rendered.append(name)
    except Exception as exc:
        print(f"render failed {name}: {exc}")
        skipped.append(name)

print("activity renders in", OUT)
for n in rendered:
    print(" ", n + ".png")
if skipped:
    print("skipped:", ", ".join(skipped))