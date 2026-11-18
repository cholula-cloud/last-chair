"""Kit additions: birch, vehicles, signs, guest silhouettes.
Same conventions as props.py: metres, Blender +Z up (glTF +Y up on export), front = -Y.
Run inside Blender: sys.path.insert(0, "<repo>/tools/blender"); import extras; extras.build_all()
"""
from lib import *

PALETTE["birch-bark"] = ("#ece8de", 0.9)
PALETTE["birch-mark"] = ("#2b2622", 0.9)
PALETTE["birch-leaf"] = ("#c9a24a", 0.9)
PALETTE["paint"] = ("#c8c8c8", 0.45)      # tinted per instance in game
PALETTE["sign-green"] = ("#0b6b3a", 0.6)
PALETTE["sign-white"] = ("#f4f7fb", 0.6)
PALETTE["sign-yellow"] = ("#f6c700", 0.6)
PALETTE["coat"] = ("#4a3f35", 0.85)
PALETTE["board"] = ("#2f7de1", 0.4)
PALETTE["pack"] = ("#3d4650", 0.85)


# ---------- trees ----------
def b_birch():
    a = Asset("birch")
    a.cyl((0, 0, 0), 0.2, 0.12, 6.0, 5, "birch-bark", caps=False)
    a.cyl((0, 0, 0), 0.26, 0.2, 0.3, 5, "snow", caps=False)
    for z, rz in ((0.9, 0), (2.2, 60), (3.6, 120), (4.8, 30)):
        a.box((0.0, 0.0, z), (0.34, 0.3, 0.1), "birch-mark", rot=(0, 0, rz))
    a.cyl((0.1, 0, 3.4), 0.05, 0.03, 1.8, 4, "birch-bark", rot=(0, 38, 0))
    a.cyl((-0.1, 0, 4.2), 0.05, 0.03, 1.6, 4, "birch-bark", rot=(0, -40, 20))
    for c, r, sc in (((0.0, 0.0, 6.4), 1.0, (1, 1, 0.8)), ((1.1, 0.2, 5.2), 0.85, (1, 1, 0.8)),
                     ((-1.1, -0.3, 5.0), 0.85, (1, 1, 0.8)), ((0.2, 0.9, 4.4), 0.7, (1, 1, 0.8)),
                     ((-0.3, -1.0, 5.8), 0.75, (1, 1, 0.8))):
        a.sphere(c, r, "birch-leaf", seg=6, rings=4, scale=sc)
    a.sphere((0.0, 0.0, 6.95), 0.55, "snow", seg=5, rings=3, scale=(1, 1, 0.45))
    return a.finish()


# ---------- vehicles (front = -Y, wheels on ground) ----------
def _wheels(a, xs, ys, r=0.34, w=0.24):
    for x in xs:
        for y in ys:
            a.cyl((x - w / 2 * (1 if x > 0 else -1), y, r), r, r, w, 8, "rubber-black", rot=(0, 90, 0))


def b_sedan():
    a = Asset("sedan")
    L, W = 4.6, 1.8
    _wheels(a, (-W / 2 + 0.05, W / 2 - 0.05), (-1.45, 1.4))
    a.box((0, 0, 0.62), (W, L, 0.62), "paint", bevel=0.08)                       # body
    a.box((0, 0.1, 1.15), (W - 0.2, 2.4, 0.55), "paint", bevel=0.1)              # cabin
    a.box((0, -1.07, 1.17), (W - 0.34, 0.06, 0.42), "glass-dark", rot=(-28, 0, 0))
    a.box((0, 1.27, 1.17), (W - 0.34, 0.06, 0.42), "glass-dark", rot=(28, 0, 0))
    for sx in (-1, 1):
        a.box((sx * (W / 2 - 0.09), 0.1, 1.17), (0.04, 2.0, 0.38), "glass-dark")
    a.box((0, -L / 2, 0.45), (W - 0.1, 0.12, 0.18), "steel")
    a.box((0, L / 2, 0.45), (W - 0.1, 0.12, 0.18), "steel")
    for sx in (-1, 1):
        a.box((sx * 0.62, -L / 2 - 0.02, 0.78), (0.28, 0.05, 0.14), "lamp-glow")
        a.box((sx * 0.62, L / 2 + 0.02, 0.78), (0.28, 0.05, 0.14), "amber-accent")
    a.box((0, 0.1, 1.46), (W - 0.3, 2.3, 0.1), "snow", bevel=0.04)
    return a.finish()


def b_wagon():
    a = Asset("wagon")
    L, W = 4.8, 1.85
    _wheels(a, (-W / 2 + 0.05, W / 2 - 0.05), (-1.5, 1.45))
    a.box((0, 0, 0.64), (W, L, 0.64), "paint", bevel=0.08)
    a.box((0, 0.5, 1.2), (W - 0.15, 3.4, 0.62), "paint", bevel=0.1)
    a.box((0, -1.2, 1.17), (W - 0.34, 0.06, 0.46), "glass-dark", rot=(-26, 0, 0))
    for sx in (-1, 1):
        a.box((sx * (W / 2 - 0.08), 0.5, 1.22), (0.04, 3.0, 0.42), "glass-dark")
        a.box((sx * 0.7, 0.5, 1.58), (0.08, 2.8, 0.06), "steel")                  # roof rail
    a.box((0, L / 2 + 0.01, 1.2), (W - 0.4, 0.05, 0.42), "glass-dark")
    a.box((0, -L / 2, 0.45), (W - 0.1, 0.12, 0.18), "steel")
    a.box((0, L / 2, 0.45), (W - 0.1, 0.12, 0.18), "steel")
    for sx in (-1, 1):
        a.box((sx * 0.64, -L / 2 - 0.02, 0.8), (0.28, 0.05, 0.14), "lamp-glow")
        a.box((sx * 0.64, L / 2 + 0.02, 0.8), (0.14, 0.05, 0.3), "amber-accent")
    a.box((0, 0.5, 1.56), (W - 0.3, 3.3, 0.1), "snow", bevel=0.04)
    return a.finish()


def b_pickup():
    a = Asset("pickup")
    L, W = 5.2, 1.95
    _wheels(a, (-W / 2 + 0.05, W / 2 - 0.05), (-1.6, 1.5), r=0.38)
    a.box((0, 0, 0.78), (W, L, 0.7), "paint", bevel=0.08)
    a.box((0, -0.85, 1.4), (W - 0.1, 1.7, 0.7), "paint", bevel=0.1)              # cab
    a.box((0, -1.72, 1.4), (W - 0.3, 0.06, 0.5), "glass-dark", rot=(-22, 0, 0))
    for sx in (-1, 1):
        a.box((sx * (W / 2 - 0.06), -0.85, 1.45), (0.04, 1.3, 0.45), "glass-dark")
    # bed walls + load of snow
    a.box((0, 1.4, 1.2), (W - 0.1, 2.1, 0.08), "steel-dark")
    for sx in (-1, 1):
        a.box((sx * (W / 2 - 0.08), 1.4, 1.22), (0.12, 2.1, 0.4), "paint")
    a.box((0, L / 2 - 0.06, 1.22), (W - 0.1, 0.12, 0.4), "paint")
    a.box((0, 1.4, 1.34), (W - 0.34, 1.9, 0.2), "snow", bevel=0.06)
    a.box((0, -L / 2, 0.5), (W - 0.1, 0.16, 0.22), "steel")
    a.box((0, L / 2, 0.5), (W - 0.1, 0.16, 0.22), "steel")
    for sx in (-1, 1):
        a.box((sx * 0.68, -L / 2 - 0.02, 0.92), (0.3, 0.05, 0.16), "lamp-glow")
    a.box((0, -0.85, 1.78), (W - 0.2, 1.6, 0.1), "snow", bevel=0.04)
    return a.finish()


# ---------- signs ----------
def b_signpost():
    a = Asset("sign-post")
    a.cyl((0, 0, 0), 0.05, 0.05, 2.2, 5, "steel-dark", caps=False)
    a.box((0, 0, 2.15), (0.9, 0.06, 0.6), "sign-green", bevel=0.03)
    a.box((0, -0.035, 2.15), (0.78, 0.02, 0.48), "sign-white")
    a.box((0, -0.045, 2.15), (0.6, 0.02, 0.1), "sign-green")
    a.box((0, 0, 2.5), (0.94, 0.08, 0.06), "snow")
    return a.finish()


def b_areasign():
    a = Asset("area-sign")
    for sx in (-1, 1):
        a.cyl((sx * 1.1, 0, 0), 0.08, 0.08, 2.4, 5, "timber-dark", caps=False)
    a.box((0, 0, 1.8), (2.6, 0.12, 1.2), "timber-brown", bevel=0.04)
    a.box((0, -0.07, 1.8), (2.4, 0.04, 1.0), "cream-sign")
    a.box((0, -0.09, 2.1), (2.0, 0.03, 0.18), "sign-green")
    a.box((0, -0.09, 1.7), (1.5, 0.03, 0.1), "timber-dark")
    a.box((0, -0.09, 1.5), (1.2, 0.03, 0.1), "timber-dark")
    a.box((0, 0, 2.45), (2.7, 0.2, 0.18), "snow", bevel=0.06)
    for sx in (-1, 1):
        a.box((sx * 1.1, 0, 2.55), (0.3, 0.3, 0.12), "snow", bevel=0.04)
    return a.finish()


# ---------- guests ----------
def _skier(name, s=1.0, poles=True, coat=False, backpack=False):
    """Skier with all dimensions scaled by s (kid = 0.66). Skis along Y, tips -Y. Hip stays at 0.98*s."""
    a = Asset(name)
    for sx in (-1, 1):
        x = sx * 0.14 * s
        a.box((x, 0.05 * s, 0.03), (0.1 * s, 1.6 * s, 0.04), "ski")
        a.box((x, -0.82 * s, 0.07), (0.1 * s, 0.18 * s, 0.04), "ski", rot=(-25, 0, 0))
        a.box((x, 0, 0.16 * s), (0.15 * s, 0.3 * s, 0.22 * s), "rubber-black")
        a.box((x, -0.08 * s, 0.43 * s), (0.17 * s, 0.18 * s, 0.42 * s), "pants", rot=(18, 0, 0))
        a.box((x, -0.06 * s, 0.8 * s), (0.19 * s, 0.2 * s, 0.42 * s), "pants", rot=(-22, 0, 0))
    a.box((0, 0.02 * s, 0.98 * s), (0.44 * s, 0.28 * s, 0.2 * s), "pants")
    if coat:
        a.cyl((0, 0.0, 0.5 * s), 0.3 * s, 0.24 * s, 0.62 * s, 6, "jacket", rot=(10, 0, 0))   # coat skirt
    a.cyl((0, 0, 0.98 * s), 0.25 * s, 0.22 * s, 0.58 * s, 6, "jacket", rot=(10, 0, 0))
    a.box((0, -0.07 * s, 1.57 * s), (0.3 * s, 0.24 * s, 0.1 * s), "jacket")
    for sx in (-1, 1):
        a.box((sx * 0.31 * s, -0.12 * s, 1.3 * s), (0.15 * s, 0.15 * s, 0.45 * s), "jacket", rot=(-35, 0, sx * -8))
        a.box((sx * 0.31 * s, -0.3 * s, 1.1 * s), (0.13 * s, 0.13 * s, 0.13 * s), "navy")
        if poles:
            a.cyl((sx * 0.31 * s, -0.3 * s, 1.1 * s), 0.018, 0.018, 1.15 * s, 4, "steel-dark", rot=(-152, -sx * 6, 0))
            a.cyl((sx * 0.37 * s, 0.2 * s, 0.12), 0.07, 0.07, 0.02, 6, "steel-dark")
    a.box((0, -0.04 * s, 1.5 * s), (0.62 * s, 0.3 * s, 0.16 * s), "jacket")
    if backpack:
        a.box((0, 0.25 * s, 1.25 * s), (0.4 * s, 0.22 * s, 0.5 * s), "pack", bevel=0.03)
    hs = 1.15 if s < 1 else 1.0           # kid head is proportionally larger
    a.sphere((0, -0.08 * s, 1.74 * s), 0.17 * s * hs, "skin", seg=6, rings=4)
    a.sphere((0, -0.06 * s, 1.8 * s), 0.195 * s * hs, "helmet", seg=7, rings=4, scale=(1, 1.05, 0.82))
    a.box((0, -0.24 * s * hs, 1.76 * s), (0.3 * s * hs, 0.07, 0.1 * s), "goggles")
    return a.finish()


def b_skier_kid():
    return _skier("skier-kid", s=0.66, poles=False)


def b_skier_coat():
    return _skier("skier-coat", s=1.0, coat=True, backpack=True)


def _boarder(name, s=1.0, board_len=1.5):
    """Board along local X, front foot +X; rider faces -Y (sideways to the board)."""
    a = Asset(name)
    a.box((0, 0, 0.04), (board_len, 0.28 * s, 0.05), "board", bevel=0.02)
    for sx in (-1, 1):
        a.box((sx * board_len / 2, 0, 0.1), (0.3, 0.28 * s, 0.04), "board", rot=(0, -sx * 20, 0))
    for sx in (-1, 1):
        x = sx * 0.3 * s
        a.box((x, 0, 0.2 * s), (0.2 * s, 0.3 * s, 0.26 * s), "rubber-black")
        a.box((x * 0.9, 0, 0.5 * s), (0.18 * s, 0.2 * s, 0.4 * s), "pants", rot=(0, sx * 6, 0))
        a.box((x * 0.7, 0, 0.85 * s), (0.2 * s, 0.22 * s, 0.4 * s), "pants", rot=(0, -sx * 8, 0))
    a.box((0, 0, 1.0 * s), (0.5 * s, 0.3 * s, 0.2 * s), "pants")
    a.cyl((0, 0, 1.0 * s), 0.25 * s, 0.22 * s, 0.56 * s, 6, "jacket")
    a.box((0, 0, 1.55 * s), (0.5 * s, 0.34 * s, 0.14 * s), "jacket")
    # arms out for balance
    a.box((0.5 * s, -0.05 * s, 1.35 * s), (0.5 * s, 0.14 * s, 0.14 * s), "jacket", rot=(0, 20, 0))
    a.box((-0.45 * s, 0.0, 1.3 * s), (0.45 * s, 0.14 * s, 0.14 * s), "jacket", rot=(0, -25, 0))
    a.box((0.76 * s, -0.05 * s, 1.18 * s), (0.12 * s, 0.12 * s, 0.12 * s), "navy")
    a.box((-0.66 * s, 0, 1.1 * s), (0.12 * s, 0.12 * s, 0.12 * s), "navy")
    hs = 1.15 if s < 1 else 1.0
    a.sphere((0, -0.04 * s, 1.74 * s), 0.17 * s * hs, "skin", seg=6, rings=4)
    a.sphere((0, -0.02 * s, 1.8 * s), 0.195 * s * hs, "helmet", seg=7, rings=4, scale=(1, 1.05, 0.82))
    a.box((0, -0.2 * s * hs, 1.76 * s), (0.3 * s * hs, 0.07, 0.1 * s), "goggles")
    return a.finish()


def b_boarder():
    return _boarder("boarder", 1.0, 1.5)


def b_boarder_kid():
    return _boarder("boarder-kid", 0.72, 1.1)


BUILDERS = [b_birch, b_sedan, b_wagon, b_pickup, b_signpost, b_areasign,
            b_skier_kid, b_skier_coat, b_boarder, b_boarder_kid]


def build_all(out=None, export_glb=True):
    import os
    if out:
        import lib
        lib.GLB = out
        os.makedirs(out, exist_ok=True)
    rows = []
    for b in BUILDERS:
        ob = b()
        row = dict(name=ob.name, **info(ob))
        if export_glb:
            import lib
            row["bytes"] = lib.export(ob.name)
        rows.append(row)
    return rows
