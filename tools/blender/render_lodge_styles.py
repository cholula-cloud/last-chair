"""Build lodge tiers in both styles and write EEVEE review PNGs (run inside Blender)."""
import importlib.util
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "../.."))
OUT = os.environ.get(
    "LAST_CHAIR_LODGE_RENDERS",
    os.path.join(REPO, "docs/reference/lodge-style-renders"),
)
os.makedirs(OUT, exist_ok=True)
os.environ["LAST_CHAIR_KIT_ROOT"] = os.path.join(REPO, ".kit/lodge-review")
sys.path.insert(0, HERE)


def _load_module(name: str):
    path = os.path.join(HERE, f"{name}.py")
    ns = {"__name__": name, "__file__": path}
    exec("from lib import *\n" + open(path, encoding="utf-8").read(), ns)
    return ns


import lib  # noqa: E402

lib.ROOT = os.environ["LAST_CHAIR_KIT_ROOT"]
lib.GLB = os.path.join(lib.ROOT, "glb")
lib.REN = OUT
os.makedirs(lib.GLB, exist_ok=True)

buildings = _load_module("buildings")
buildings2 = _load_module("buildings2")
styles = _load_module("styles")
import lift2  # noqa: E402

buildings["b_lodge"]("base-lodge")
lift2.b_lodge_tier1()
buildings2["b_lodge_annex_2"]()
buildings2["b_lodge_annex_3"]()
buildings2["b_lodge2"]()
buildings2["b_lodge3"]()
for builder, _, _ in styles["VARIANTS"][:5]:
    builder()

NAMES = [
    "base-lodge",
    "lodge-tier-1",
    "lodge-tier-2",
    "lodge-tier-3",
    "lodge-annex-2",
    "lodge-annex-3",
    "lodge-tier-1-chalet70s",
    "lodge-tier-2-chalet70s",
    "lodge-tier-3-chalet70s",
    "lodge-annex-2-chalet70s",
    "lodge-annex-3-chalet70s",
]

import bpy  # noqa: E402

lib.setup_render(900)
for name in NAMES:
    if not bpy.data.objects.get(name):
        print(f"skip {name}")
        continue
    lib.render_asset(name, res=900)
    print("wrote", os.path.join(OUT, f"{name}.png"))