"""Export lodge/venue kit pass into LAST_CHAIR_KIT_ROOT/glb and write rows JSON.

  LAST_CHAIR_KIT_ROOT=/path LAST_CHAIR_ROWS_OUT=/path/rows.json \\
    blender --background --factory-startup --python tools/blender/export_kit_pass.py
"""
import importlib.util
import json
import os
import sys

DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, DIR)

KIT = os.environ.get("LAST_CHAIR_KIT_ROOT", os.path.join(DIR, "_scratch", "kit-pass"))
ROWS = os.environ.get("LAST_CHAIR_ROWS_OUT", os.path.join(KIT, "rows.json"))
os.makedirs(os.path.join(KIT, "glb"), exist_ok=True)
os.environ["LAST_CHAIR_KIT_ROOT"] = KIT

import bpy
bpy.ops.wm.read_factory_settings(use_empty=True)

import lib
from lib import info, export

lib.ROOT = KIT
lib.GLB = os.path.join(KIT, "glb")
lib.REN = os.path.join(KIT, "renders")
os.makedirs(lib.GLB, exist_ok=True)


def load_py(module):
    path = os.path.join(DIR, module)
    name = module.replace(".py", "")
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


def load_exec(module):
    ns = {}
    exec("from lib import *\n" + open(os.path.join(DIR, module), encoding="utf-8").read(), ns)
    return ns


def row_from_ob(ob, tags, extra=None):
    i = info(ob)
    r = {
        "name": ob.name, "file": ob.name + ".glb", "tris": i["tris"],
        "sizeBytes": export(ob.name), "heightMeters": i["h"],
        "footprintMeters": [i["fx"], i["fy"]], "tags": tags,
    }
    if extra:
        r.update(extra)
    return r


rows = []

# Core timber buildings (including new venues)
b = load_exec("buildings.py")
for fn, tags in (
    ("b_lodge", ["building"]),
    ("b_house", ["building"]),
    ("b_cafe", ["building"]),
    ("b_shop", ["building"]),
    ("b_hut", ["building"]),
    ("b_rental_shop", ["building"]),
    ("b_waffle_haus", ["building", "activity"]),
    ("b_ski_school", ["building"]),
):
    rows.append(row_from_ob(b[fn](), tags))

# Annexes, full-shell tiers, ticket/patrol/garage (skip venue re-export from BUILDERS)
b2 = load_py("buildings2.py")
for fn in (
    "b_lodge_annex_2", "b_lodge_annex_3", "b_lodge2", "b_lodge3", "b_aframe",
    "b_ticket", "b_patrol", "b_garage",
):
    rows.append(row_from_ob(getattr(b2, fn)(), ["building"]))

# lodge-tier-1 alias + surface lift pieces (keep existing lift2 assets)
lift2 = load_py("lift2.py")
for r in lift2.build_all(export_glb=True):
    rows.append(r)

# Chalet70s + three new theme packs
st = load_py("styles.py")
for r in st.build_all(export_glb=True):
    rows.append(r)

tp = load_py("themes_pack.py")
for r in tp.build_all(export_glb=True):
    rows.append(r)

by = {r["name"]: r for r in rows if r.get("name")}
out_rows = list(by.values())
os.makedirs(os.path.dirname(os.path.abspath(ROWS)), exist_ok=True)
with open(ROWS, "w", encoding="utf-8") as f:
    json.dump(out_rows, f, indent=2)
print(f"wrote {len(out_rows)} rows to {ROWS}")
print("glb files", len([x for x in os.listdir(lib.GLB) if x.endswith(".glb")]))
