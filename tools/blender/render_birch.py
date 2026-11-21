"""Build and render the birch kit tree.

  LAST_CHAIR_KIT_ROOT=/path/to/kit blender --background --factory-startup \\
    --python-expr "import sys; sys.path.insert(0,'<repo>/tools/blender'); import render_birch as m; m.build_all(render=True, export_glb=True)"
"""
import json
import os
import sys

_DIR = os.path.dirname(os.path.abspath(__file__))
if _DIR not in sys.path:
    sys.path.insert(0, _DIR)

import lib  # noqa: E402

_ns = {"__name__": "extras"}
exec("from lib import *\n" + open(os.path.join(_DIR, "extras.py"), encoding="utf-8").read(), _ns)
b_birch = _ns["b_birch"]


def build_all(out=None, export_glb=False, render=False, rows_path=None):
    if out:
        lib.GLB = out
        lib.ROOT = os.path.dirname(out.rstrip("/"))
        lib.REN = os.path.join(lib.ROOT, "renders")
        os.makedirs(out, exist_ok=True)
    if render:
        os.makedirs(lib.REN, exist_ok=True)
    ob = b_birch()
    i = lib.info(ob)
    row = {
        "name": ob.name,
        "file": ob.name + ".glb",
        "tris": i["tris"],
        "sizeBytes": None,
        "heightMeters": i["h"],
        "footprintMeters": [i["fx"], i["fy"]],
        "tags": ["tree"],
    }
    if export_glb:
        row["sizeBytes"] = lib.export(ob.name)
    if render:
        lib.render_asset(ob.name)
    rows = [row]
    if rows_path:
        with open(rows_path, "w") as f:
            json.dump(rows, f, indent=2)
    return rows


if __name__ == "__main__":
    build_all(render=True, export_glb=True)