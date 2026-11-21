"""Build and render pine kit trees (including pine-d).

Headless (set output root with LAST_CHAIR_KIT_ROOT or pass out=):

  LAST_CHAIR_KIT_ROOT=/path/to/kit blender --background --factory-startup \\
    --python-expr "import sys; sys.path.insert(0,'<repo>/tools/blender'); import render_pines as m; m.build_all(render=True)"

Renders land in ``$LAST_CHAIR_KIT_ROOT/renders/<name>.png`` (default ``~/Documents/Last Chair/asset-kit-v1/renders``).
"""
import json
import os
import sys

_DIR = os.path.dirname(os.path.abspath(__file__))
if _DIR not in sys.path:
    sys.path.insert(0, _DIR)

import lib  # noqa: E402
from props import b_pines  # noqa: E402


def build_all(out=None, export_glb=False, render=False, rows_path=None):
    if out:
        lib.GLB = out
        os.makedirs(out, exist_ok=True)
    if render:
        os.makedirs(lib.REN, exist_ok=True)
    rows = []
    for ob in b_pines():
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
        rows.append(row)
    if rows_path:
        with open(rows_path, "w") as f:
            json.dump(rows, f, indent=2)
    return rows


if __name__ == "__main__":
    build_all(render=True, export_glb=True)