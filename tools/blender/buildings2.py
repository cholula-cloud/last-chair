"""Building kit additions: lodge tiers 2 and 3, A-frame lodge, ticket booth, patrol hut, maintenance garage.
Metres, Blender +Z up, front = -Y. Run in Blender:
  sys.path.insert(0, "<repo>/tools/blender"); import buildings2; buildings2.build_all(out)
"""
import os
import lib
from lib import *

_ns = {}
exec("from lib import *\n" + open(os.path.join(os.path.dirname(__file__), "buildings.py")).read(), _ns)
b_lodge = _ns["b_lodge"]

PALETTE["patrol-red"] = ("#c8302b", 0.7)
PALETTE["garage-grey"] = ("#6f7a84", 0.7)
PALETTE.setdefault("sign-green", ("#0b6b3a", 0.6))
PALETTE.setdefault("sign-white", ("#f4f7fb", 0.6))
PALETTE.setdefault("sign-yellow", ("#f6c700", 0.6))


def _deck(a, x0, x1, y0, y1, z, rail=True):
    """Timber deck with posts and snow-capped rails. x0<x1, y0<y1."""
    cx, cy, w, d = (x0 + x1) / 2, (y0 + y1) / 2, x1 - x0, y1 - y0
    a.box((cx, cy, z - 0.1), (w, d, 0.2), "timber-brown")
    a.box((cx, cy, z / 2 - 0.15), (w - 0.4, d - 0.4, z - 0.3), "timber-dark")
    if not rail:
        return
    for x, y in ((x0, y0), (x1, y0), (x0, y1), (x1, y1), ((x0 + x1) / 2, y1)):
        a.box((x, y, z + 0.55), (0.18, 0.18, 1.1), "timber-brown")
    for (bx, by, sx, sy) in (((x0 + x1) / 2, y1, w, 0.14), (x1, cy, 0.14, d), (x0, cy, 0.14, d)):
        a.box((bx, by, z + 1.05), (sx, sy, 0.12), "timber-brown")
        a.box((bx, by, z + 1.15), (sx + (0.06 if sx > 0.2 else 0.0), sy + (0.06 if sy > 0.2 else 0.0), 0.09), "snow")


def _tier2(a, W, D, H, F):
    """Timber rear wing with its own gable and a side deck."""
    wx0, wx1 = -3.0, 5.0
    wy0, wy1 = 2.0, 10.6
    wh = 4.2
    cx, cy = (wx0 + wx1) / 2, (wy0 + wy1) / 2
    ww, wl = wx1 - wx0, wy1 - wy0
    a.box((cx, cy, F / 2), (ww + 0.2, wl + 0.2, F), "stone-grey")
    a.box((cx, cy, F + (wh - F) / 2), (ww, wl, wh - F), "timber-brown")
    for x in (wx0, wx1):
        a.box((x, wy1, F + (wh - F) / 2), (0.3, 0.3, wh - F), "trim-white")
    for z in (1.6, 2.7):
        a.box((cx, cy, z), (ww + 0.08, wl + 0.08, 0.1), "timber-dark")
    a.gable_end((cx, cy, wh), wl + 0.6, ww, 2.8, "timber-brown", rz=90)
    a.gable_roof((cx, cy, wh), wl + 0.6, ww, 2.8, "slate-roof", rz=90, thick=0.22, overhang=0.5,
                 snow_thick=0.4, snow_over=0.12, snow_bevel=0.12)
    # windows: +X side facing the deck, rear end
    for y in (5.0, 8.0):
        a.window((wx1, y, 2.3), 1.4, 1.5, '+X')
    for y in (4.6, 8.0):
        a.window((wx0, y, 2.3), 1.2, 1.4, '-X', mullion=False)
    a.window((cx, wy1, 2.3), 1.6, 1.5, '+Y')
    a.window((cx, wy1, 5.0), 0.9, 1.0, '+Y', mullion=False)
    # side deck with steps and a ski rack
    _deck(a, wx1 + 0.1, wx1 + 3.8, 3.4, wy1 - 0.4, F)
    for i in range(2):
        a.box((wx1 + 3.8 + 0.35 + i * 0.35, 6.0, F - 0.25 - i * 0.22), (0.4, 2.2, 0.2), "timber-brown")
    a.box((wx1 + 2.4, wy1 - 1.0, F + 0.6), (2.2, 0.12, 0.12), "steel-dark")
    for x in (wx1 + 1.4, wx1 + 3.4):
        a.box((x, wy1 - 1.0, F + 0.35), (0.1, 0.1, 0.7), "steel-dark")
    for i, x in enumerate((2.0, 2.6)):
        a.box((wx1 + x - 0.0, wy1 - 1.25, F + 1.0), (0.1, 0.1, 1.5), "ski", rot=(-8, 0, 0))
    a.box((wx1 + 2.4, wy1 - 1.0, F + 1.7), (2.4, 0.3, 0.16), "snow", bevel=0.06)
    # lantern
    a.box((wx1 + 0.02, 3.8, F + 2.4), (0.2, 0.26, 0.38), "lamp-glow")
    a.box((0, cy + wl / 2 + 0.2, 0.25), (3.0, 1.2, 0.5), "snow", bevel=0.18)


def _tier3_delta(a, W, D, H, F):
    """Tier-3-only addition: second storey on dining wing, cupola, extra stack."""
    wcx, wcy = -8.2, -0.6
    wl, wd = 4.8, 6.2
    z0, z1 = 3.6, 6.4
    a.box((wcx, wcy, (z0 + z1) / 2), (wl, wd, z1 - z0), "barn-red")
    for sy in (-1, 1):
        a.box((wcx - wl / 2, wcy + sy * wd / 2, (z0 + z1) / 2), (0.28, 0.28, z1 - z0), "trim-white")
    a.box((wcx, wcy, z0), (wl + 0.1, wd + 0.1, 0.2), "trim-white")
    rise = 2.7
    cx2, len2 = wcx + 0.7, wl + 2.2
    a.gable_end((cx2, wcy, z1), len2, wd, rise, "barn-red")
    a.gable_roof((cx2, wcy, z1), len2, wd, rise, "slate-roof", thick=0.22, overhang=0.5,
                 snow_thick=0.4, snow_over=0.12, snow_bevel=0.12)
    fy = wcy - wd / 2
    for x in (wcx - 1.2, wcx + 1.2):
        a.window((x, fy, 5.0), 1.1, 1.4, '-Y')
    a.window((wcx - wl / 2, wcy - 1.6, 5.0), 1.0, 1.3, '-X')
    # second stone stack on the dining wing end
    sx, sy = wcx - wl / 2 - 0.9, wcy + 1.4
    a.box((sx, sy, 1.8), (1.8, 1.9, 3.6), "stone-grey")
    a.box((sx, sy, 7.5), (1.4, 1.5, 7.8), "stone-grey")
    a.box((sx, sy, 11.55), (1.7, 1.7, 0.3), "stone-dark")
    a.box((sx, sy, 11.85), (1.5, 1.5, 0.28), "snow", bevel=0.1)
    for z in (5.0, 8.5):
        a.box((sx, sy, z), (1.55, 1.6, 0.16), "stone-dark")
    # ridge cupola
    cz = H + 6.6
    a.box((0, 0.2, cz + 0.55), (1.6, 1.6, 1.2), "trim-white")
    for face, (x, y) in {'-Y': (0, -0.6), '+Y': (0, 1.0), '-X': (-0.8, 0.2), '+X': (0.8, 0.2)}.items():
        a.window((x, y, cz + 0.6), 0.7, 0.6, face, sill=False, mullion=False, frame="trim-white")
    a.cyl((0, 0.2, cz + 1.15), 1.35, 0.0, 1.1, 4, "slate-roof", rot=(0, 0, 45))
    a.cyl((0, 0.2, cz + 1.7), 0.5, 0.0, 0.55, 4, "snow", rot=(0, 0, 45))


def _tier3(a, W, D, H, F):
    """Tier 2 plus tier-3 delta."""
    _tier2(a, W, D, H, F)
    _tier3_delta(a, W, D, H, F)


def _lodge_dims():
    return 12.0, 9.0, 6.4, 0.7


def b_lodge_annex_2():
    a = Asset("lodge-annex-2")
    W, D, H, F = _lodge_dims()
    _tier2(a, W, D, H, F)
    return a.finish()


def b_lodge_annex_3():
    a = Asset("lodge-annex-3")
    W, D, H, F = _lodge_dims()
    _tier3_delta(a, W, D, H, F)
    return a.finish()


def b_lodge2():
    return b_lodge("lodge-tier-2", _tier2)


def b_lodge3():
    return b_lodge("lodge-tier-3", _tier3)


def b_aframe():
    """Tenney base lodge: steep A-frame, 1960s. Ridge along Y, front glazing faces -Y."""
    a = Asset("a-frame-lodge")
    Wd, L, rise = 11.0, 13.0, 10.5          # base width (x), length (y), ridge height
    F = 0.6
    a.box((0, 0, F / 2), (Wd + 0.4, L + 0.4, F), "stone-grey")
    # A-frame body: timber prism on the foundation, ridge along Y
    a.prism((0, 0, F), L, Wd, rise, "timber-brown", rz=90)
    a.gable_roof((0, 0, F), L, Wd, rise, "slate-roof", rz=90, thick=0.26, overhang=0.7,
                 snow_thick=0.6, snow_over=0.2, snow_bevel=0.18)
    fy = -L / 2
    # glazed front triangle
    a.gable_end((0, fy - 0.12, F + 0.6), 0.14, Wd - 1.8, rise - 2.4, "window-glow", rz=90)
    a.box((0, fy - 0.2, F + 3.4), (0.14, 0.12, 6.2), "timber-dark")           # centre mullion (approx)
    for z, w in ((F + 2.6, 7.4), (F + 5.0, 5.0), (F + 7.2, 2.6)):
        a.box((0, fy - 0.2, z), (w, 0.12, 0.12), "timber-dark")
    for sx in (-1, 1):
        a.box((sx * 2.4, fy - 0.2, F + 3.4), (0.1, 0.12, 4.0), "timber-dark")
    # entrance box at the base with flat roof and door
    a.box((0, fy - 0.8, F + 1.4), (3.4, 1.8, 2.8), "timber-dark")
    a.box((0, fy - 1.72, F + 1.15), (1.6, 0.14, 2.3), "trim-white")
    a.box((0, fy - 1.8, F + 1.1), (1.2, 0.1, 2.1), "window-glow")
    a.box((0, fy - 0.9, F + 2.95), (4.0, 2.4, 0.22), "trim-white")
    a.box((0, fy - 0.9, F + 3.2), (3.8, 2.2, 0.3), "snow", bevel=0.1)
    for x in (-1.5, 1.5):
        a.box((x, fy - 2.0, F + 1.3), (0.22, 0.22, 2.6), "trim-white")
    # side dormers (shed boxes) on the long faces
    for sx in (-1, 1):
        for y in (-2.8, 2.8):
            a.box((sx * (Wd / 2 - 3.0), y, F + 3.8), (1.4, 2.2, 1.7), "timber-brown", rot=(0, sx * 28, 0))
            a.box((sx * (Wd / 2 - 2.3), y, F + 3.3), (0.12, 1.6, 1.1), "window-glow", rot=(0, sx * 28, 0))
    # stone chimney through the roof on +X
    cx = Wd / 2 - 1.6
    a.box((cx + 1.5, 2.0, 3.2), (1.9, 2.2, 6.4), "stone-grey")
    a.box((cx + 1.3, 2.0, 9.0), (1.5, 1.6, 4.0), "stone-grey")
    a.box((cx + 1.3, 2.0, 11.1), (1.8, 1.8, 0.3), "stone-dark")
    a.box((cx + 1.3, 2.0, 11.42), (1.6, 1.6, 0.26), "snow", bevel=0.1)
    # wrap-around deck on +X, rear glazing slit and lantern
    _deck(a, Wd / 2 + 0.6, Wd / 2 + 4.4, -L / 2 + 1.0, L / 2 - 1.0, F)
    a.box((0, L / 2 - 0.05, F + 1.2), (1.6, 0.14, 2.4), "timber-dark")
    a.box((0, L / 2 + 0.03, F + 1.1), (1.2, 0.08, 2.0), "window-glow")
    for x in (-1.3, 1.3):
        a.box((x, fy - 1.82, F + 2.4), (0.24, 0.24, 0.38), "lamp-glow")
    a.box((-Wd / 2 - 0.3, fy + 0.4, 0.25), (2.2, 1.6, 0.5), "snow", bevel=0.18)
    return a.finish()


def b_ticket():
    a = Asset("ticket-booth")
    W, D, H, F = 3.2, 2.4, 2.7, 0.25
    a.box((0, 0, F / 2), (W + 0.2, D + 0.2, F), "stone-grey")
    a.box((0, 0, F + (H - F) / 2), (W, D, H - F), "timber-brown")
    for sx in (-1, 1):
        for sy in (-1, 1):
            a.box((sx * W / 2, sy * D / 2, F + (H - F) / 2), (0.16, 0.16, H - F), "trim-white")
    # single-pitch roof (shed) sloping to the front
    a.box((0, 0, H + 0.25), (W + 1.0, D + 1.0, 0.2), "slate-roof", rot=(-8, 0, 0))
    a.box((0, 0, H + 0.5), (W + 1.1, D + 1.1, 0.34), "snow", rot=(-8, 0, 0), bevel=0.1)
    fy = -D / 2
    # service window with counter and awning
    a.box((0, fy - 0.01, 1.7), (1.9, 0.12, 1.1), "trim-white")
    a.box((0, fy - 0.07, 1.7), (1.6, 0.06, 0.8), "window-glow")
    a.box((0, fy - 0.3, 1.1), (2.1, 0.5, 0.1), "timber-dark")
    a.box((0, fy - 0.45, 2.45), (2.4, 0.9, 0.1), "awning-red", rot=(-18, 0, 0))
    # side door and sign board
    a.box((W / 2 + 0.02, 0.3, F + 1.1), (0.1, 0.9, 2.1), "trim-white")
    a.box((W / 2 + 0.07, 0.3, F + 1.0), (0.06, 0.7, 1.9), "timber-dark")
    a.box((0, fy - 0.1, H + 0.95), (2.0, 0.12, 0.55), "sign-green")
    a.box((0, fy - 0.17, H + 0.95), (1.7, 0.03, 0.15), "sign-white")
    a.box((-W / 2 - 0.55, 0, 0.35), (0.9, 1.4, 0.7), "snow", bevel=0.2)
    return a.finish()


def b_patrol():
    a = Asset("patrol-hut")
    W, D, H, F = 5.6, 4.4, 3.2, 0.4
    a.box((0, 0, F / 2), (W + 0.2, D + 0.2, F), "stone-dark")
    a.box((0, 0, F + (H - F) / 2), (W, D, H - F), "patrol-red")
    for sx in (-1, 1):
        for sy in (-1, 1):
            a.box((sx * W / 2, sy * D / 2, F + (H - F) / 2), (0.2, 0.2, H - F), "trim-white")
    a.box((0, 0, 1.4), (W + 0.06, D + 0.06, 0.16), "trim-white")
    a.gable_end((0, 0, H), W, D, 1.9, "patrol-red")
    a.gable_roof((0, 0, H), W, D, 1.9, "slate-roof", thick=0.2, overhang=0.5,
                 snow_thick=0.36, snow_over=0.12, snow_bevel=0.12)
    fy = -D / 2
    a.window((-1.5, fy, 2.2), 1.2, 1.1, '-Y')
    a.window((1.8, fy, 2.2), 1.0, 1.1, '-Y', mullion=False)
    a.box((0.2, fy - 0.03, F + 1.05), (1.1, 0.14, 2.1), "trim-white")
    a.box((0.2, fy - 0.08, F + 1.0), (0.85, 0.1, 1.95), "timber-dark")
    a.window((W / 2, 0, 2.2), 1.2, 1.1, '+X')
    # white cross on the front gable
    a.box((-W / 2 - 0.05, 0, 2.0), (0.08, 0.9, 0.28), "sign-white")
    a.box((-W / 2 - 0.05, 0, 2.0), (0.08, 0.28, 0.9), "sign-white")
    # porch stoop, stretcher sled, antenna
    a.box((0.2, fy - 0.7, 0.2), (1.8, 1.0, 0.2), "timber-brown")
    a.box((-W / 2 - 0.9, -0.2, 0.18), (0.7, 2.2, 0.12), "sign-yellow", rot=(0, 0, 8))
    a.box((-W / 2 - 0.9, -0.2, 0.3), (0.5, 1.9, 0.12), "patrol-red", rot=(0, 0, 8))
    a.cyl((W / 2 - 0.6, 0.6, H + 0.6), 0.04, 0.03, 2.6, 4, "steel-dark")
    a.box((W / 2 - 0.6, 0.6, H + 3.2), (0.4, 0.04, 0.04), "steel-dark")
    a.box((W / 2 + 0.5, fy + 0.4, 0.25), (1.4, 1.4, 0.5), "snow", bevel=0.18)
    return a.finish()


def b_garage():
    a = Asset("maintenance-garage")
    W, D, H, F = 11.0, 8.0, 5.0, 0.35
    a.box((0, 0, F / 2), (W + 0.3, D + 0.3, F), "stone-grey")
    a.box((0, 0, F + (H - F) / 2), (W, D, H - F), "garage-grey")
    for i in range(6):
        a.box((0, 0, F + 0.7 + i * 0.7), (W + 0.06, D + 0.06, 0.07), "steel-dark")
    for sx in (-1, 1):
        for sy in (-1, 1):
            a.box((sx * W / 2, sy * D / 2, F + (H - F) / 2), (0.3, 0.3, H - F), "trim-white")
    rise = 2.4
    a.gable_end((0, 0, H), D, W, rise, "garage-grey", rz=90)
    a.gable_roof((0, 0, H), D, W, rise, "slate-roof", rz=90, thick=0.2, overhang=0.5,
                 snow_thick=0.42, snow_over=0.12, snow_bevel=0.12)
    fy = -D / 2
    # two roll-up bay doors with amber hazard header
    for x in (-2.6, 2.6):
        a.box((x, fy - 0.03, F + 1.8), (4.0, 0.14, 3.6), "trim-white")
        a.box((x, fy - 0.1, F + 1.7), (3.6, 0.1, 3.4), "steel")
        for z in (0.9, 1.6, 2.3, 3.0):
            a.box((x, fy - 0.17, F + z), (3.6, 0.05, 0.06), "steel-dark")
        a.box((x, fy - 0.1, F + 3.8), (4.0, 0.14, 0.22), "amber-accent")
    a.box((0, fy - 0.1, F + 4.3), (2.4, 0.12, 0.5), "navy")
    a.box((0, fy - 0.17, F + 4.3), (2.0, 0.03, 0.12), "sign-yellow")
    a.window((W / 2, 0.5, 2.9), 1.6, 1.0, '+X')
    a.window((-W / 2, -1.0, 2.9), 1.6, 1.0, '-X', mullion=False)
    a.box((W / 2 + 0.03, D / 2 - 1.5, F + 1.05), (0.1, 1.0, 2.1), "trim-white")
    # fuel tank and drum stack beside the shed
    a.cyl((W / 2 + 1.6, -1.5, F), 0.8, 0.8, 1.8, 8, "steel", rot=(0, 0, 0))
    a.cyl((W / 2 + 1.6, -1.5, F + 1.8), 0.8, 0.5, 0.25, 8, "steel-dark")
    a.box((W / 2 + 1.6, -1.5, F + 2.4), (0.4, 0.4, 0.2), "steel-dark")
    for i, (dx, dy) in enumerate(((-4.4, fy - 0.9), (-3.7, fy - 0.9), (-4.05, fy - 0.9))):
        a.cyl((dx, dy, 0), 0.28, 0.28, 0.85, 6, "amber-accent" if i < 2 else "navy",
              rot=(0, 0, 0))
    a.box((-W / 2 - 0.9, 1.5, 0.3), (1.6, 2.2, 0.6), "snow", bevel=0.2)
    return a.finish()


BUILDERS = [b_lodge_annex_2, b_lodge_annex_3, b_lodge2, b_lodge3, b_aframe, b_ticket, b_patrol, b_garage]


def build_all(out=None, export_glb=True):
    if out:
        lib.GLB = out
        os.makedirs(out, exist_ok=True)
    rows = []
    for b in BUILDERS:
        ob = b()
        row = dict(name=ob.name, **info(ob))
        if export_glb:
            row["bytes"] = lib.export(ob.name)
        rows.append(row)
    return rows
