"""Lift kit leftovers: surface-lift terminals, platter, derelict tower, lodge-tier-1.
Metres, Blender +Z up, front = -Y. Rope lines at x = +/-GAUGE along Y. Run in Blender:
  sys.path.insert(0, "<repo>/tools/blender"); import lift2; lift2.build_all(out)
"""
import os, json, math
import lib
from lib import *

_here = os.path.dirname(os.path.abspath(__file__))
_ns = {}
exec("from lib import *\n" + open(os.path.join(_here, "buildings.py")).read(), _ns)
b_lodge = _ns["b_lodge"]
_nl = {}
exec("from lib import *\n" + open(os.path.join(_here, "lift.py")).read(), _nl)
GAUGE = _nl["GAUGE"]
b_tower_ref = _nl["b_tower"]
b_terminal_bottom_ref = _nl["b_terminal_bottom"]

PALETTE.setdefault("rust", ("#a5532a", 0.9))
PALETTE.setdefault("steel-weathered", ("#6d7176", 0.6))

ROPE_Y_SURFACE = 2.5     # rope height at surface-lift terminals (T-bar grip 2.31 above bar foot)
ROPE_Y_TOWER = 7.12      # top of the sheave line on lift-tower (sheave centre 6.92 + r 0.2)


def _ring(a, z, r_out, r_in, h, n, m):
    """Flat ring (rim) of n segments, base at z. Closed quads: top, bottom, outer wall, inner wall."""
    pts = []
    for r in (r_out, r_in):
        for zz in (z, z + h):
            for i in range(n):
                t = 2 * math.pi * i / n
                pts.append((r * math.cos(t), r * math.sin(t), zz))
    # index: ring k (0 outer-bottom, 1 outer-top, 2 inner-bottom, 3 inner-top) * n + i
    def v(k, i):
        return k * n + i % n
    faces = []
    for i in range(n):
        faces.append((v(1, i), v(1, i + 1), v(3, i + 1), v(3, i)))      # top
        faces.append((v(0, i + 1), v(0, i), v(2, i), v(2, i + 1)))      # bottom
        faces.append((v(0, i), v(0, i + 1), v(1, i + 1), v(1, i)))      # outer wall
        faces.append((v(2, i + 1), v(2, i), v(3, i), v(3, i + 1)))      # inner wall
    a.poly(pts, faces, m)


def _wheel(a, rope_z, hub_m, spokes=2, n=10):
    """Bullwheel reading as a wheel: thin dark rim ring, steel spokes, amber hub. Rope tangent at x = +/-GAUGE."""
    R = GAUGE + 0.08
    _ring(a, rope_z - 0.1, R, R - 0.14, 0.2, n, "steel-dark")
    for i in range(spokes):
        a.box((0, 0, rope_z), (2 * (R - 0.1), 0.1, 0.1), "steel", rot=(0, 0, i * 180 / spokes))
    a.cyl((0, 0, rope_z - 0.2), 0.3, 0.3, 0.4, 6, hub_m)


def _hood(a, c, length, width, rise, over=0.3):
    """Shallow peaked hood (ridge along X) with a snow cap, base centre c."""
    x, y, z = c
    a.prism((x, y, z), length, width, rise, "slate-roof")
    a.prism((x, y, z + 0.1), length + 0.1, width - 0.3, rise + 0.1, "snow")


def b_surface_bottom():
    a = Asset("surface-terminal-bottom")
    rz = ROPE_Y_SURFACE
    a.box((0, 0, 0.15), (4.0, 3.0, 0.3), "stone-grey")
    a.box((0, 0, (rz - 0.4) / 2 + 0.3), (0.5, 0.5, rz - 0.7), "steel")          # wheel column
    _wheel(a, rz, "amber-accent")
    # hood on two posts beside the rope lines
    for sx in (-1, 1):
        a.box((sx * 2.15, 0, 1.8), (0.2, 0.2, 3.0), "steel-dark")
    _hood(a, (0, 0, 3.3), 4.9, 1.9, 0.5)
    # groomed loading pad, -Y
    a.box((0, -2.6, 0.12), (4.0, 2.4, 0.24), "snow")
    a.box((0, -3.7, 0.28), (4.0, 0.1, 0.08), "amber-accent")
    # timber motor shed on +X
    hx, hy = 4.6, 0.2
    a.box((hx, hy, 0.15), (2.4, 2.4, 0.3), "stone-grey")
    a.box((hx, hy, 0.3 + 0.95), (2.2, 2.2, 1.9), "timber-brown")
    a.gable_end((hx, hy, 2.2), 2.2, 2.2, 0.9, "timber-brown", rz=90)
    a.gable_roof((hx, hy, 2.2), 2.2, 2.2, 0.9, "slate-roof", rz=90, thick=0.12, overhang=0.4,
                 snow_thick=0.42, snow_over=0.25, snow_bevel=0)
    a.box((hx + 0.6, hy - 1.12, 1.45), (0.5, 0.08, 0.6), "window-glow")
    a.box((hx - 0.5, hy - 1.12, 1.2), (0.7, 0.1, 1.8), "slate-roof")
    return a.finish()


def b_surface_top():
    a = Asset("surface-terminal-top")
    rz = ROPE_Y_SURFACE
    a.box((0, 0, 0.22), (1.6, 1.6, 0.44), "stone-grey")                           # footing
    a.box((0, 0, 0.49), (1.6, 1.6, 0.1), "snow")
    a.cyl((0, 0, 0.44), 0.42, 0.24, rz - 0.2 - 0.44, 6, "steel")                  # chunky tapered mast, top meets hub
    a.cyl((0, 0, 1.2), 0.36, 0.36, 0.2, 6, "steel-dark")                          # collar
    _wheel(a, rz, "amber-accent")
    a.box((0, 0, rz + 0.45), (0.12, 0.12, 0.5), "steel")                          # cap post above hub
    _hood(a, (0, 0, rz + 0.7), 1.9, 1.5, 0.35)
    return a.finish()


def b_platter():
    a = Asset("platter")
    # z = 0 at disc underside; grip at top
    a.cyl((0, 0, 0.0), 0.2, 0.2, 0.05, 8, "rubber-black")                    # disc seat
    a.box((0, 0, 0.32), (0.05, 0.05, 0.6), "steel")                          # lower pole
    a.box((0, 0, 0.9), (0.14, 0.14, 0.45), "amber-accent")                   # spring box
    a.box((0, 0, 1.6), (0.05, 0.05, 1.0), "steel")                           # upper pole
    a.box((0, 0, 2.2), (0.16, 0.3, 0.16), "steel")                           # rope grip
    return a.finish()


def b_tower_derelict():
    a = Asset("lift-tower-derelict")
    tilt = 6.0
    pz = 7.4
    c, s = math.cos(math.radians(tilt)), math.sin(math.radians(tilt))

    def tp(x, z):   # rotate (x, z) about Y through (0, pz), same sense as rot=(0, tilt, 0)
        dx, dz = x, z - pz
        return dx * c + dz * s, pz - dx * s + dz * c

    a.box((0, 0, 0.25), (1.0, 1.0, 0.5), "stone-grey")
    a.box((0, 0, 0.52), (1.1, 1.1, 0.1), "snow")                                  # snow on the footing only
    a.cyl((0, 0, 0.5), 0.3, 0.22, 7.0, 8, "steel-weathered", caps=False)
    for z, r in ((1.2, 0.3), (3.4, 0.26), (5.6, 0.23)):                           # rust collars
        a.cyl((0, 0, z), r + 0.04, r + 0.04, 0.3, 8, "rust", caps=False)
    a.box((0.0, 0.26, 3.8), (0.3, 0.06, 6.0), "steel-dark")
    # crossarm: left half tilted 6 deg, right half bent down
    p0x, p0z = tp(0, 7.55)
    h = (2 * GAUGE + 0.9) / 2
    bend = 24.0
    lc = (p0x - (h / 2) * c, p0z + (h / 2) * s)
    a.box((lc[0], 0, lc[1]), (h, 0.36, 0.4), "rust", rot=(0, tilt, 0))
    ca, sa = math.cos(math.radians(bend)), math.sin(math.radians(bend))
    a.box((p0x + (h / 2) * ca, 0, p0z - (h / 2) * sa), (h, 0.36, 0.4), "rust", rot=(0, bend, 0))
    a.box((p0x, 0, p0z - 0.3), (0.5, 0.5, 0.3), "steel-dark")
    # sheave beams hang off each arm (no sheaves)
    lx, lz = p0x - GAUGE * c, p0z + GAUGE * s
    a.box((lx, 0, lz - 0.5), (0.12, 0.12, 0.35), "steel-dark", rot=(0, tilt, 0))
    a.box((lx, 0, lz - 0.7), (0.14, 1.7, 0.2), "rust", rot=(0, tilt, 0))
    rx, rz_ = p0x + GAUGE * ca, p0z - GAUGE * sa
    a.box((rx - 0.5 * sa, 0, rz_ - 0.5 * ca), (0.12, 0.12, 0.35), "steel-dark", rot=(0, bend, 0))
    a.box((rx - 0.7 * sa, 0, rz_ - 0.7 * ca), (0.14, 1.7, 0.2), "rust", rot=(0, bend, 0))
    return a.finish()


def b_lodge_tier1():
    return b_lodge(name="lodge-tier-1")


# name -> (builder, tags, extra fields)
SPEC = [
    (b_surface_bottom, ["lift"], {"ropeYMeters": ROPE_Y_SURFACE, "ropeOffsetXMeters": GAUGE}),
    (b_surface_top, ["lift"], {"ropeYMeters": ROPE_Y_SURFACE, "ropeOffsetXMeters": GAUGE}),
    (b_platter, ["carrier"], {}),
    (b_tower_derelict, ["lift"], {"ropeYMeters": ROPE_Y_TOWER, "ropeOffsetXMeters": GAUGE}),
    (b_lodge_tier1, ["building"], {}),
]
BUILDERS = [s[0] for s in SPEC]


def build_all(out=None, export_glb=True, render=False, rows_path=None):
    if out:
        lib.GLB = out
        os.makedirs(out, exist_ok=True)
    rows = []
    for b, tags, extra in SPEC:
        ob = b()
        i = info(ob)
        row = {"name": ob.name, "file": ob.name + ".glb", "tris": i["tris"], "sizeBytes": None,
               "heightMeters": i["h"], "footprintMeters": [i["fx"], i["fy"]], "tags": tags}
        row.update(extra)
        if ob.name == "platter":
            row["gripHeightMeters"] = round(i["h"] - 0.08, 2)
        if export_glb:
            row["sizeBytes"] = lib.export(ob.name)
        if render:
            os.makedirs(lib.REN, exist_ok=True)
            lib.render_asset(ob.name)
        rows.append(row)
    rows_path = rows_path or os.path.join(lib.ROOT, "rows-lift2.json")
    with open(rows_path, "w") as f:
        json.dump(rows, f, indent=2)
    return rows
