"""S2 style pack: 1970s chalet (`chalet70s`) variants of the lodge tiers and the base-area venues.
The default kit style is `timber50s` (buildings.py, buildings2.py). Each variant keeps its base's
footprint (within 5%) and its front door near the same x, so placement, collision and the lodge
attach pads do not change.

Family look: very steep gables in dark cedar shake with a band of shake showing below deep snow,
dark stained vertical-board walls, full-height glowing gable glazing with dark mullions, ochre
bargeboards and railings, burnt-orange doors, fieldstone foundations and chimneys.
Metres, Blender +Z up, front = -Y. Run in Blender:
  sys.path.insert(0, "<repo>/tools/blender"); import styles; styles.build_all(out)
"""
import math
import os
import bmesh
import lib
from lib import *

STYLE = "chalet70s"

PALETTE.setdefault("cedar-stain", ("#5e3a28", 0.9))     # dark stained vertical boards
PALETTE.setdefault("cedar-batten", ("#3a2419", 0.9))    # battens, mullions, deck framing
PALETTE.setdefault("cedar-shake", ("#4b3a30", 0.95))    # roof shakes (shows below the snow)
PALETTE.setdefault("ochre-trim", ("#d99a2b", 0.7))      # bargeboards, rails, window frames
PALETTE.setdefault("burnt-orange", ("#c4561c", 0.7))    # doors, small accents
PALETTE.setdefault("fieldstone", ("#a0968a", 0.95))
PALETTE.setdefault("fieldstone-dark", ("#6c645b", 0.95))

WALL, BAT, SHAKE = "cedar-stain", "cedar-batten", "cedar-shake"
OCH, ORG = "ochre-trim", "burnt-orange"
STONE, STONED = "fieldstone", "fieldstone-dark"

FACE_RZ = {'-Y': 0, '+Y': 180, '-X': -90, '+X': 90}


# ---------- helpers ----------
def _mbox(a, M, m, bevel=0.0):
    v = bmesh.ops.create_cube(a.bm, size=1.0, matrix=M)['verts']
    return a._tag(v, m, bevel)


def roof(a, c, length, width, rise, rz=0, ov=1.0, thick=0.3, snow=0.5, short=0.5, ends=(-1, 1),
         gable_m=WALL, board=0.3, eave=None):
    """Steep chalet gable, ridge along local X. Dark shake slabs; deep snow that stops `eave` metres
    shy of the eaves and `short` metres shy of the gable ends so a band of shake shows; ochre
    bargeboards on the listed gable ends."""
    eave = short * 1.6 if eave is None else eave
    if gable_m:
        a.gable_end(c, length, width, rise, gable_m, rz=rz)
    M0 = Matrix.Translation(Vector(c)) @ R(0, 0, rz)
    W = width / 2
    ang = math.atan2(rise, W)
    sl = math.hypot(W, rise)
    Ls = sl + ov
    Lx = length + 1.4 * ov
    bt = thick + 0.32
    for side in (-1, 1):
        n = Vector((0, side * math.sin(ang), math.cos(ang)))
        ridge = Vector((0, 0, rise))
        d = Vector((0, side * W, -rise)).normalized()
        rot = R(-side * math.degrees(ang), 0, 0)
        _mbox(a, M0 @ Matrix.Translation(ridge + d * (Ls / 2) + n * (thick / 2)) @ rot @ S(Lx, Ls, thick), SHAKE)
        Lsn = Ls - eave + 0.05
        _mbox(a, M0 @ Matrix.Translation(ridge + d * (Lsn / 2 - 0.05) + n * (thick + snow / 2 - 0.02)) @ rot
              @ S(Lx - 2 * short, Lsn, snow), "snow", bevel=0.12)
        for e in ends:
            x = e * (Lx / 2 - board / 2 + 0.03)
            _mbox(a, M0 @ Matrix.Translation(ridge + d * (Ls / 2) + n * (bt / 2 - 0.04) + Vector((x, 0, 0)))
                  @ rot @ S(board, Ls + 0.12, bt), OCH)
    rz_top = rise + thick / math.cos(ang) + snow * 0.25
    _mbox(a, M0 @ Matrix.Translation((0, 0, rz_top)) @ R(45, 0, 0) @ S(Lx - 2 * short, snow * 1.25, snow * 1.25), "snow")
    return ang


def glaze(a, O, face, x0, x1, zb, top0, k, mull=(), transoms=(), frame=BAT):
    """Full-height glazed gable on a wall plane. O = wall point on the gable centre line at z = 0.
    Glass spans u in [x0, x1] (u along the wall, 0 under the ridge) from zb up to the roof line
    top(u) = top0 - k * |u|. Dark mullions and transoms on top."""
    rz = FACE_RZ[face]
    M = Matrix.Translation(Vector(O)) @ R(0, 0, rz)
    top = lambda u: top0 - k * abs(u)
    pts = [(x0, -0.06, zb), (x1, -0.06, zb), (x1, -0.06, top(x1))]
    if x0 < 0 < x1:
        pts.append((0, -0.06, top0))
    pts.append((x0, -0.06, top(x0)))
    a.poly(pts, [tuple(range(len(pts)))], "window-glow", M)

    def B(lc, s, m=frame, rx=0.0, ry=0.0):
        Mb = M @ Matrix.Translation(Vector(lc)) @ R(rx, ry, 0) @ S(*s)
        _mbox(a, Mb, m)
    f = 0.16
    B(((x0 + x1) / 2, -0.1, zb - f / 2), (x1 - x0 + 2 * f, 0.16, f))          # sill
    for u in (x0, x1):
        h = top(u) - zb
        B((u, -0.1, zb + h / 2), (f, 0.16, h + f))                               # jambs
    # raking head boards following the roof line
    for ua, ub in ((x0, min(0, x1)), (max(0, x0), x1)):
        if ub - ua < 0.05:
            continue
        za, zb2 = top(ua), top(ub)
        L = math.hypot(ub - ua, zb2 - za)
        ry = -math.degrees(math.atan2(zb2 - za, ub - ua))
        B(((ua + ub) / 2, -0.1, (za + zb2) / 2 + f / 2), (L + f, 0.16, f), ry=ry)
    for u in mull:
        h = top(u) - zb
        B((u, -0.12, zb + h / 2), (0.12, 0.12, h))
    for z in transoms:
        lim = (top0 - z) / k if k else 99
        ua, ub = max(x0, -lim), min(x1, lim)
        if ub > ua:
            B(((ua + ub) / 2, -0.12, z), (ub - ua, 0.12, 0.12))


def door(a, x, fy, F, w=1.3, h=2.3, face='-Y'):
    """Burnt-orange door in an ochre frame with a small glowing light, on the -Y face."""
    a.box((x, fy - 0.08, F + h / 2 + 0.05), (w + 0.36, 0.16, h + 0.2), OCH)
    a.box((x, fy - 0.15, F + h / 2), (w, 0.1, h), ORG)
    a.box((x, fy - 0.21, F + h * 0.68), (w * 0.4, 0.04, h * 0.32), "window-glow")


def battens(a, xs, y, z0, z1, face_y=True):
    for x in xs:
        if face_y:
            a.box((x, y, (z0 + z1) / 2), (0.14, 0.1, z1 - z0), BAT)
        else:
            a.box((y, x, (z0 + z1) / 2), (0.1, 0.14, z1 - z0), BAT)


def chimney(a, x, y, base, w, top, footing=None):
    """Fieldstone stack with dark courses, a cap and a snow lid. footing = (sx, sy, h) for a
    wider base."""
    if footing:
        fx, fy, fh = footing
        a.box((x, y, fh / 2), (fx, fy, fh), STONE)
    a.box((x, y, (base + top) / 2), (w, w, top - base), STONE)
    z = base + 2.2
    while z < top - 1.0:
        a.box((x, y, z), (w + 0.12, w + 0.12, 0.18), STONED)
        z += 2.6
    a.box((x, y, top + 0.15), (w + 0.3, w + 0.3, 0.3), STONED)
    a.box((x, y, top + 0.43), (w + 0.1, w + 0.1, 0.28), "snow", bevel=0.1)


def rail(a, x0, x1, y0, y1, z, posts=True, gap=None, balusters=0.0):
    """Ochre railing along an axis-aligned segment, snow on the top rail. gap = (g0, g1) leaves an
    opening along the run. balusters = spacing for vertical boards (0 for none)."""
    horiz = abs(x1 - x0) > abs(y1 - y0)
    runs = [tuple(sorted((x0, x1) if horiz else (y0, y1)))]
    if gap:
        lo, hi = runs[0]
        runs = [(lo, gap[0]), (gap[1], hi)]
    for lo, hi in runs:
        L, mid = hi - lo, (lo + hi) / 2
        cx, cy = (mid, y0) if horiz else (x0, mid)
        sz = (L + 0.14, 0.14, 0.14) if horiz else (0.14, L + 0.14, 0.14)
        a.box((cx, cy, z + 1.0), sz, OCH)
        a.box((cx, cy, z + 1.11), (sz[0] + 0.04, sz[1] + 0.04, 0.09), "snow")
        a.box((cx, cy, z + 0.45), (sz[0], sz[1], 0.1), OCH)
        if posts:
            for p in (lo, hi):
                px, py = (p, y0) if horiz else (x0, p)
                a.box((px, py, z + 0.5), (0.2, 0.2, 1.0), BAT)
        if balusters:
            n = max(1, int(L / balusters))
            for i in range(1, n):
                p = lo + L * i / n
                px, py = (p, y0) if horiz else (x0, p)
                a.box((px, py, z + 0.72), (0.12, 0.12, 0.55), OCH)


def deck(a, x0, x1, y0, y1, z):
    a.box(((x0 + x1) / 2, (y0 + y1) / 2, z - 0.1), (x1 - x0, y1 - y0, 0.2), BAT)
    a.box(((x0 + x1) / 2, (y0 + y1) / 2, z / 2 - 0.15), (x1 - x0 - 0.4, y1 - y0 - 0.4, z - 0.3), STONED)


def side_window(a, c, w, h, face):
    a.window(c, w, h, face, frame=OCH, mullion=False, sill=False, depth=0.14)


# ---------- lodge ----------
def _lodge(name, tier):
    a = Asset(name)
    W, D, H, F = 12.0, 9.0, 4.6, 0.7
    rise, ov = 8.0, 1.4
    k = rise / (W / 2)
    fy = -D / 2
    a.box((0, 0, F / 2), (W + 0.3, D + 0.3, F), STONE)
    a.box((0, 0, F + (H - F) / 2), (W, D, H - F), WALL)
    roof(a, (0, 0, H), D, W, rise, rz=90, ov=ov, thick=0.32, snow=0.55, short=0.8, eave=1.55)
    # full-height glazed front gable
    glaze(a, (0, fy, 0), '-Y', -3.6, 3.6, F + 0.15, H + rise - 0.75, k,
          mull=(-2.4, -1.2, 1.2, 2.4), transoms=(F + 2.75, H + 2.7))
    battens(a, (-5.4, -4.5, 4.5, 5.4), fy - 0.04, F, H)
    door(a, 0, fy - 0.1, F, w=1.5, h=2.4)
    for x in (-1.3, 1.3):
        a.box((x, fy - 0.3, F + 2.2), (0.26, 0.26, 0.38), "lamp-glow")
    # balcony across the gable glass
    bz, by0, by1 = F + 3.4, fy, fy - 1.7
    a.box((0, (by0 + by1) / 2, bz - 0.12), (8.0, by0 - by1, 0.24), BAT)
    rail(a, -4.0, 4.0, by1, by1, bz, posts=False, balusters=0.55)
    for sx in (-1, 1):
        rail(a, sx * 4.0, sx * 4.0, by0, by1, bz, posts=False)
        a.box((sx * 3.9, by1 + 0.1, (F + bz) / 2), (0.26, 0.26, bz - F), BAT)
    # front deck and steps
    dy0, dy1 = fy - 0.1, fy - 3.4
    deck(a, -5.2, 5.2, dy1, dy0, F)
    for i in range(2):
        a.box((0, dy1 - 0.35 - i * 0.35, F - 0.25 - i * 0.22), (2.4, 0.4, 0.2), BAT)
    rail(a, -5.1, 5.1, dy1, dy1, F, gap=(-1.3, 1.3))
    for sx in (-1, 1):
        rail(a, sx * 5.1, sx * 5.1, dy0, dy1, F)
    # sides and rear
    for y in (-2.8, 3.4):
        side_window(a, (W / 2, y, 2.4), 1.4, 1.5, '+X')
    battens(a, (-1.2, -0.3), W / 2 + 0.04, F, H, face_y=False)
    for x in (-3.0, 3.0):
        side_window(a, (x, D / 2, 2.4), 1.4, 1.5, '+Y')
    side_window(a, (0, D / 2, H + 2.6), 1.6, 2.0, '+Y')
    # fieldstone chimney on +X, piercing the eave
    chimney(a, W / 2 + 0.75, 1.2, 3.0, 1.6, 14.2, footing=(2.0, 2.2, 3.0))
    # dining wing on -X (two storeys at tier 3)
    wx0, wx1, wy, wd = -W / 2 + 0.2, -W / 2 - 4.6, -0.6, 6.4
    wcx, wl = (wx0 + wx1) / 2, wx0 - wx1
    wh = 6.0 if tier >= 3 else 3.4
    wrise, wov = 4.4, 0.95
    wk = wrise / (wd / 2)
    a.box((wcx, wy, F / 2), (wl, wd + 0.2, F), STONE)
    a.box((wcx, wy, F + (wh - F) / 2), (wl, wd, wh - F), WALL)
    roof(a, (wcx - 0.3, wy, wh), wl + 0.6, wd, wrise, ov=wov, thick=0.28, snow=0.48, short=0.5, ends=(-1,))
    glaze(a, (wx1, wy, 0), '-X', -1.8, 1.8, F + 0.15, wh + wrise - 0.6, wk,
          mull=(-0.9, 0, 0.9), transoms=(F + 2.4,) + ((F + 5.0,) if tier >= 3 else ()))
    for x in (wcx - 1.2, wcx + 1.2):
        side_window(a, (x, wy - wd / 2, 1.85), 1.5, 1.4, '-Y')
    battens(a, (wcx,), wy - wd / 2 - 0.04, F, wh)
    if tier >= 3:
        # upper balcony on the wing gable and a second fieldstone stack
        bz = F + 2.8
        a.box((wx1 - 0.7, wy, bz - 0.12), (1.4, 4.4, 0.24), BAT)
        rail(a, wx1 - 1.35, wx1 - 1.35, wy - 2.2, wy + 2.2, bz, posts=False, balusters=0.55)
        for sy in (-1, 1):
            rail(a, wx1, wx1 - 1.35, wy + sy * 2.2, wy + sy * 2.2, bz, posts=False)
        chimney(a, wx1 - 0.9, wy + 2.35, 3.6, 1.4, 12.2, footing=(1.8, 1.9, 3.6))
        # glazed cross gable on the wing front
        gy = wy - wd / 2
        a.box((wcx, gy + 0.9, (3.4 + wh) / 2), (3.0, 1.8, wh - 3.4), WALL)
        roof(a, (wcx, gy + 1.0, wh), 2.4, 3.0, 2.6, rz=90, ov=0.5, thick=0.22, snow=0.4, short=0.35,
             ends=(-1,), board=0.24)
        glaze(a, (wcx, gy, 0), '-Y', -1.1, 1.1, 3.55, wh + 2.6 - 0.4, 2.6 / 1.5, mull=(0,),
              transoms=(wh,))
        _lookout(a, H + rise)
    if tier >= 2:
        _wing(a, F)
    a.box((-W / 2 - 0.2, D / 2 + 0.2, 0.25), (2.2, 1.4, 0.5), "snow", bevel=0.18)
    a.box((W / 2 + 1.0, -D / 2 + 0.5, 0.25), (1.6, 2.2, 0.5), "snow", bevel=0.18)
    return a.finish()


def _lookout(a, ridge):
    """Tier 3: 1970s lookout cupola astride the main ridge, glass on all sides, ochre trim."""
    y, z0, z1 = 0.6, ridge - 1.2, ridge + 1.75
    a.box((0, y, (z0 + z1) / 2), (2.6, 2.6, z1 - z0), WALL)
    gz = ridge + 0.85
    a.box((0, y, gz), (2.72, 1.8, 1.25), "window-glow")
    a.box((0, y, gz), (1.8, 2.72, 1.25), "window-glow")
    a.box((0, y, ridge + 0.12), (2.85, 2.85, 0.22), OCH)
    a.box((0, y, z1 + 0.1), (3.0, 3.0, 0.22), OCH)
    a.cyl((0, y, z1 + 0.2), 2.35, 0.0, 1.45, 4, SHAKE, rot=(0, 0, 45))
    a.cyl((0, y, z1 + 0.42), 1.95, 0.0, 1.25, 4, "snow", rot=(0, 0, 45))


def _wing(a, F):
    """Tier 2: rear wing with its own steep glazed gable, and the side deck."""
    wx0, wx1, wy0, wy1 = -3.0, 5.0, 2.0, 10.6
    wh, rise, ov = 3.6, 5.4, 1.0
    cx, cy, ww, wl = (wx0 + wx1) / 2, (wy0 + wy1) / 2, wx1 - wx0, wy1 - wy0
    a.box((cx, cy, F / 2), (ww + 0.2, wl + 0.2, F), STONE)
    a.box((cx, cy, F + (wh - F) / 2), (ww, wl, wh - F), WALL)
    roof(a, (cx, cy, wh), wl + 0.6, ww, rise, rz=90, ov=ov, thick=0.28, snow=0.5, short=0.5, ends=(1,))
    glaze(a, (cx, wy1, 0), '+Y', -2.4, 2.4, F + 0.15, wh + rise - 0.65, rise / (ww / 2),
          mull=(-1.2, 0, 1.2), transoms=(F + 2.5,))
    for y in (5.0, 8.0):
        side_window(a, (wx1, y, 2.0), 1.4, 1.3, '+X')
        side_window(a, (wx0, y, 2.0), 1.2, 1.3, '-X')
    battens(a, (3.6, 6.5, 9.4), wx1 + 0.04, F, wh, face_y=False)
    # side deck with steps, ochre rails, ski rack
    x0, x1, y0, y1 = wx1 + 0.1, wx1 + 3.8, 3.4, wy1 - 0.4
    deck(a, x0, x1, y0, y1, F)
    rail(a, x1, x1, y0, y1, F, gap=(4.9, 7.1))
    rail(a, x0, x1, y1, y1, F)
    rail(a, x0, x1, y0, y0, F)
    for i in range(2):
        a.box((x1 + 0.35 + i * 0.35, 6.0, F - 0.25 - i * 0.22), (0.4, 2.2, 0.2), BAT)
    a.box((x0 + 2.3, y1 - 0.7, F + 0.6), (2.2, 0.12, 0.12), "steel-dark")
    for i, x in enumerate((1.8, 2.4, 3.0)):
        a.box((x0 + x, y1 - 0.95, F + 1.0), (0.1, 0.1, 1.5), ("ski", ORG, "ski")[i], rot=(-8, 0, 0))
    a.box((wx1 + 0.05, 3.8, F + 2.2), (0.2, 0.26, 0.38), "lamp-glow")
    a.box((0, wy1 + 0.4, 0.25), (3.0, 1.2, 0.5), "snow", bevel=0.18)


def c_lodge1():
    return _lodge("lodge-tier-1-" + STYLE, 1)


def c_lodge2():
    return _lodge("lodge-tier-2-" + STYLE, 2)


def c_lodge3():
    return _lodge("lodge-tier-3-" + STYLE, 3)


# ---------- venues ----------
def c_cafe():
    a = Asset("cafe-" + STYLE)
    W, D, H, F = 7.0, 6.0, 3.0, 0.35
    rise, ov = 5.0, 0.6
    k = rise / (W / 2)
    fy = -D / 2
    a.box((0, 0, F / 2), (W + 0.2, D + 0.2, F), STONE)
    a.box((0, 0, F + (H - F) / 2), (W, D, H - F), WALL)
    roof(a, (0, 0, H), D, W, rise, rz=90, ov=ov, thick=0.26, snow=0.46, short=0.6)
    glaze(a, (0, fy, 0), '-Y', -2.8, 1.0, F + 0.15, H + rise - 0.55, k,
          mull=(-1.8, -0.8, 0.1), transoms=(F + 2.0,))
    battens(a, (-3.2,), fy - 0.04, F, H)
    door(a, 2.0, fy - 0.04, F, w=1.1, h=2.2)
    # ochre canopy over the door
    a.box((2.0, fy - 0.55, F + 2.75), (1.9, 1.1, 0.12), OCH, rot=(14, 0, 0))
    a.box((2.0, fy - 0.5, F + 2.92), (1.8, 1.0, 0.14), "snow", rot=(14, 0, 0), bevel=0.04)
    a.box((W / 2 + 0.25, fy + 0.4, 2.3), (0.3, 0.3, 0.4), "lamp-glow")
    # glazed shed-roof sunroom across the front left, burnt-orange posts
    x0, x1, y0, y1 = -3.4, 0.8, fy, fy - 2.0
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    a.box((cx, cy, F / 2), (x1 - x0 + 0.1, y0 - y1 + 0.1, F), STONE)
    a.box((cx, cy, F + 0.3), (x1 - x0, y0 - y1, 0.6), WALL)
    a.box((cx, y1 + 0.03, F + 1.6), (x1 - x0 - 0.1, 0.06, 2.0), "window-glow")
    for x in (x0 + 0.03, x1 - 0.03):
        a.box((x, cy, F + 1.6), (0.06, y0 - y1 - 0.1, 2.0), "window-glow")
    for x in (x0, x0 + 1.4, x0 + 2.8, x1):
        a.box((x, y1, F + 1.35), (0.22, 0.22, 2.7), ORG)
    for x in (x0, x1):
        a.box((x, y0 - 0.9, F + 1.4), (0.22, 0.18, 2.8), ORG)
    ang = math.degrees(math.atan2(0.75, 2.3))
    a.box((cx, cy - 0.15, F + 2.95), (x1 - x0 + 0.5, 2.5, 0.22), SHAKE, rot=(-ang, 0, 0))
    a.box((cx, cy - 0.05, F + 3.17), (x1 - x0 + 0.1, 1.9, 0.32), "snow", rot=(-ang, 0, 0), bevel=0.08)
    a.box((cx, y1 - 0.4, F + 2.55), (x1 - x0 + 0.55, 0.12, 0.34), OCH)
    for sx, face in ((-1, '-X'), (1, '+X')):
        side_window(a, (sx * W / 2, -0.6, 1.9), 1.2, 1.2, face)
    # patio with a bistro table in front of the door
    a.box((1.9, fy - 1.1, 0.08), (2.6, 2.2, 0.16), STONED)
    a.cyl((1.6, fy - 1.9, 0), 0.06, 0.06, 0.9, 5, BAT)
    a.cyl((1.6, fy - 1.9, 0.9), 0.4, 0.4, 0.06, 8, ORG)
    # blade sign by the door
    a.box((W / 2 - 0.4, fy - 0.45, 3.0), (0.08, 0.9, 0.1), BAT)
    a.box((W / 2 - 0.4, fy - 0.55, 2.55), (0.1, 0.8, 0.7), OCH)
    a.box((W / 2 - 0.4, fy - 0.55, 2.55), (0.14, 0.6, 0.5), "cream-sign")
    chimney(a, 1.7, 1.2, H, 0.9, H + 4.6)
    a.box((W / 2 + 0.2, 1.6, 0.2), (1.2, 1.6, 0.4), "snow", bevel=0.14)
    return a.finish()


def c_shop():
    a = Asset("ski-shop-" + STYLE)
    W, D, H, F = 6.4, 5.2, 2.8, 0.35
    rise, ov = 4.6, 0.65
    k = rise / (W / 2)
    fy = -D / 2
    a.box((0, 0, F / 2), (W + 0.2, D + 0.2, F), STONE)
    a.box((0, 0, F + (H - F) / 2), (W, D, H - F), WALL)
    roof(a, (0, 0, H), D, W, rise, rz=90, ov=ov, thick=0.24, snow=0.44, short=0.55)
    glaze(a, (0, fy, 0), '-Y', -2.6, 0.9, F + 0.15, H + rise - 0.5, k,
          mull=(-1.3, 0.0), transoms=(F + 1.9,))
    door(a, 1.9, fy - 0.04, F, w=1.0, h=2.1)
    # shop board across the glass at the transom
    a.box((-0.85, fy - 0.2, F + 2.0), (3.3, 0.12, 0.62), OCH)
    a.box((-0.85, fy - 0.27, F + 2.0), (3.0, 0.06, 0.4), "cream-sign")
    for x, m in ((-3.0, ORG), (-2.78, OCH), (3.05, ORG)):
        a.box((x, fy - 0.35, 0.95), (0.12, 0.05, 1.8), m, rot=(-10, 0, 0))
    for sx, face in ((-1, '-X'), (1, '+X')):
        side_window(a, (sx * W / 2, 0, 1.8), 1.0, 1.0, face)
    chimney(a, 1.5, 1.0, H, 0.8, H + 4.0)
    a.box((W / 2 + 0.4, -1.0, 0.2), (1.4, 1.6, 0.4), "snow", bevel=0.14)
    return a.finish()


def c_hut():
    a = Asset("warming-hut-" + STYLE)
    W, D, H = 4.0, 3.2, 1.9
    F = 0.2
    rise, ov = 3.4, 0.55
    k = rise / (W / 2)
    fy = -D / 2
    a.box((0, 0, F / 2), (W + 0.2, D + 0.2, F), STONE)
    a.box((0, 0, F + (H - F) / 2), (W, D, H - F), WALL)
    roof(a, (0, 0, H), D, W, rise, rz=90, ov=ov, thick=0.2, snow=0.42, short=0.32, board=0.26)
    glaze(a, (0, fy, 0), '-Y', 0.05, 1.6, F + 0.7, H + rise - 0.45, k, mull=(0.8,))
    door(a, -0.7, fy - 0.02, F, w=0.9, h=1.75)
    chimney(a, 1.1, 0.7, H, 0.7, H + 3.0)
    a.box((-W / 2 - 0.3, 0.5, 0.225), (0.9, 1.6, 0.45), "snow", bevel=0.14)
    a.box((W / 2 + 0.35, 0.2, 0.45), (0.5, 1.6, 0.9), BAT)
    a.box((W / 2 + 0.35, 0.2, 0.95), (0.55, 1.65, 0.12), "snow")
    return a.finish()


VARIANTS = [
    (c_lodge1, "lodge-tier-1", 2300),
    (c_lodge2, "lodge-tier-2", 3200),
    (c_lodge3, "lodge-tier-3", 4100),
    (c_cafe, "cafe", 1000),
    (c_shop, "ski-shop", 650),
    (c_hut, "warming-hut", 460),
]
BUILDERS = [v[0] for v in VARIANTS]


def build_all(out=None, export_glb=True):
    if out:
        lib.GLB = out
        os.makedirs(out, exist_ok=True)
    rows = []
    for b, base, _budget in VARIANTS:
        ob = b()
        i = info(ob)
        row = {"name": ob.name, "file": ob.name + ".glb", "tris": i["tris"],
               "heightMeters": i["h"], "footprintMeters": [i["fx"], i["fy"]],
               "tags": ["building"], "style": STYLE, "styleOf": base}
        if export_glb:
            row["sizeBytes"] = lib.export(ob.name)
        rows.append(row)
    return rows
