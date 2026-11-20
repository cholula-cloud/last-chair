"""Activities batch 1 (A1 tubing hill, A2 ice rink): tubing-hut, tube, magic-carpet, tubing-lane, ice-rink, skater.
Metres, Blender +Z up, front = -Y. Tiling pieces (magic-carpet, tubing-lane) run exactly y = -5 .. +5.
Run in Blender:
  sys.path.insert(0, "<repo>/tools/blender"); import activities1; rows = activities1.build_all(out)
"""
import os
import math
import json
import lib
from lib import *

PALETTE.setdefault("tube", ("#c8432b", 0.55))          # split, tinted per instance in game
PALETTE.setdefault("ice", ("#9fcbe2", 0.15))
PALETTE.setdefault("rink-blue", ("#2f5fa8", 0.6))
PALETTE.setdefault("lane", ("#a9c3da", 0.6))          # groomed lane floor, a shade under snow
PALETTE.setdefault("tunnel", ("#b9d3e2", 0.3))         # pale translucent-looking carpet cover
PALETTE.setdefault("scarf", ("#efe2c4", 0.9))

_DIR = os.path.dirname(os.path.abspath(__file__))
TILE = 5.0  # tiling pieces span y = -TILE .. +TILE


# ---------- helpers ----------
def _torus(a, c, R, r, nu, nv, m, rot=(0, 0, 0), phase=45.0, zs=1.0):
    """Low-poly torus around local Z. nu ring segments, nv cross-section segments."""
    pts, faces = [], []
    for i in range(nu):
        u = 2 * math.pi * i / nu
        for j in range(nv):
            v = 2 * math.pi * j / nv + math.radians(phase)
            rr = R + r * math.cos(v)
            pts.append((rr * math.cos(u), rr * math.sin(u), r * math.sin(v) * zs))
    for i in range(nu):
        for j in range(nv):
            i2, j2 = (i + 1) % nu, (j + 1) % nv
            faces.append((i * nv + j, i2 * nv + j, i2 * nv + j2, i * nv + j2))
    M = Matrix.Translation(Vector(c)) @ R_(*rot)
    return a.poly(pts, faces, m, M)


def R_(rx=0, ry=0, rz=0):
    return lib.R(rx, ry, rz)


def _extrude_y(a, outline, y0, y1, m):
    """Closed (x, z) polygon extruded along Y from y0 to y1, with end caps."""
    n = len(outline)
    pts = [(x, y0, z) for x, z in outline] + [(x, y1, z) for x, z in outline]
    faces = [tuple(range(n - 1, -1, -1)), tuple(range(n, 2 * n))]
    for i in range(n):
        j = (i + 1) % n
        faces.append((i, j, n + j, n + i))
    return a.poly(pts, faces, m)


def _rrect(hx, hy, r, seg):
    """Rounded rectangle outline (CCW, z = 0), corner radius r, seg segments per corner."""
    pts = []
    for cx, cy, a0 in ((hx - r, hy - r, 0), (-hx + r, hy - r, 90), (-hx + r, -hy + r, 180), (hx - r, -hy + r, 270)):
        for k in range(seg + 1):
            t = math.radians(a0 + 90 * k / seg)
            pts.append((cx + r * math.cos(t), cy + r * math.sin(t)))
    return pts


def _ring(a, outer, inner, z0, z1, m, zin=None, outer_face=True):
    """Wall ring between two matching outlines: outer face, inner face, top. zin = inner top height."""
    n = len(outer)
    zin = z1 if zin is None else zin
    pts = ([(x, y, z0) for x, y in outer] + [(x, y, z1) for x, y in outer] +
           [(x, y, z0) for x, y in inner] + [(x, y, zin) for x, y in inner])
    faces = []
    for i in range(n):
        j = (i + 1) % n
        if outer_face:
            faces.append((i, j, n + j, n + i))                     # outer
        faces.append((2 * n + j, 2 * n + i, 3 * n + i, 3 * n + j))  # inner
        faces.append((n + i, n + j, 3 * n + j, 3 * n + i))          # top
    return a.poly(pts, faces, m)


def _seg(a, p0, p1, w, d, m):
    """Box of cross-section w x d spanning p0 -> p1."""
    p0, p1 = Vector(p0), Vector(p1)
    v = p1 - p0
    e = v.to_track_quat('Z', 'Y').to_euler('XYZ')
    a.box((p0 + p1) / 2, (w, d, v.length), m, rot=tuple(math.degrees(x) for x in e))


def _gable_shed(a, cx, cy, W, D, H, wall, rise, F=0.25, roof="slate-roof"):
    """Small shed body, W along X, D along Y, with a front-facing gable (ridge along Y)."""
    a.box((cx, cy, F / 2), (W + 0.2, D + 0.2, F), "stone-dark")
    a.box((cx, cy, F + (H - F) / 2), (W, D, H - F), wall)
    for sx in (-1, 1):
        a.box((cx + sx * W / 2, cy - D / 2, F + (H - F) / 2), (0.2, 0.2, H - F), "trim-white")
    a.gable_end((cx, cy, H), D, W, rise, wall, rz=90)
    a.gable_roof((cx, cy, H), D, W, rise, roof, rz=90, thick=0.18, overhang=0.4,
                 snow_thick=0.36, snow_over=0.12, snow_bevel=0.11)


# ---------- A1 tubing hill ----------
TUBE_R, TUBE_r = 0.37, 0.19   # 1.12 m across


def b_tube():
    a = Asset("tube")
    _torus(a, (0, 0, 0), TUBE_R, TUBE_r, 7, 4, "tube", phase=0, zs=0.85)
    return a.finish()


def b_tubing_hut():
    a = Asset("tubing-hut")
    W, D, H = 5.0, 4.0, 2.7
    _gable_shed(a, 0, 0, W, D, H, "timber-brown", 2.3, F=0.3)
    for z in (1.15, 2.0):
        a.box((0, 0, z), (W + 0.06, D + 0.06, 0.1), "timber-dark")
    fy = -D / 2
    # wide service window with counter and red awning
    a.box((-0.75, fy - 0.02, 1.65), (2.5, 0.12, 1.2), "trim-white")
    a.box((-0.75, fy - 0.08, 1.65), (2.2, 0.06, 0.92), "window-glow")
    a.box((-0.75, fy - 0.08, 1.65), (0.08, 0.08, 0.92), "trim-white")
    a.box((-0.75, fy - 0.35, 1.05), (2.6, 0.6, 0.12), "timber-dark")
    a.box((-0.75, fy - 0.5, 2.48), (2.9, 1.0, 0.1), "awning-red", rot=(-20, 0, 0))
    # door
    a.box((1.55, fy - 0.03, 0.3 + 1.05), (1.1, 0.12, 2.1), "trim-white")
    a.box((1.55, fy - 0.08, 0.3 + 1.0), (0.85, 0.1, 1.95), "timber-dark")
    a.box((1.55, fy - 0.14, 0.3 + 1.45), (0.45, 0.04, 0.5), "window-glow")
    # gable sign with a tube emblem
    a.box((0, fy - 0.08, H + 0.75), (1.9, 0.12, 0.9), "cream-sign")
    _torus(a, (0, fy - 0.16, H + 0.75), 0.24, 0.1, 6, 4, "awning-red", rot=(90, 0, 0))
    # lantern by the door
    a.box((2.3, fy - 0.12, 2.25), (0.22, 0.22, 0.34), "lamp-glow")
    # stack of rental tubes on +X, plus one leaning at the back corner
    for i in range(4):
        _torus(a, (W / 2 + 0.9, -0.7, 0.16 + i * 0.32), TUBE_R, TUBE_r, 5, 4, "awning-red",
               rot=(0, 0, i * 30), phase=0, zs=0.85)
    a.box((W / 2 + 0.9, -0.7, 1.32), (0.6, 0.6, 0.12), "snow", bevel=0.04)
    _torus(a, (W / 2 + 0.75, 1.0, 0.0), TUBE_R, TUBE_r, 5, 4, "awning-red", rot=(0, 0, 18), phase=0, zs=0.85)
    a.box((-W / 2 - 0.4, 0.6, 0.25), (1.2, 1.8, 0.5), "snow", bevel=0.16)
    return a.finish()


def b_magic_carpet():
    a = Asset("magic-carpet")
    y0, y1 = -TILE, TILE
    # base frame, belt, low side rails
    _extrude_y(a, [(-0.85, 0.0), (0.85, 0.0), (0.85, 0.22), (-0.85, 0.22)], y0, y1, "steel-dark")
    _extrude_y(a, [(-0.52, 0.22), (0.52, 0.22), (0.52, 0.27), (-0.52, 0.27)], y0, y1, "rubber-black")
    for sx in (-1, 1):
        x = sx * 0.7
        _extrude_y(a, [(x - 0.12, 0.22), (x + 0.12, 0.22), (x + 0.12, 0.42), (x - 0.12, 0.42)], y0, y1, "amber-accent")
    # covered tunnel: pale shell with darker hoops, open bottom, profile in x/z
    def arch(o, t):
        bx, sx_, top = 0.78 + o, 0.55 + o, 1.95 + o
        outer = [(-bx, 0.42), (-sx_, top), (sx_, top), (bx, 0.42)]
        bx2, sx2, top2 = bx - t, sx_ - t * 0.7, top - t
        inner = [(bx2, 0.42), (sx2, top2), (-sx2, top2), (-bx2, 0.42)]
        return outer + inner
    _extrude_y(a, arch(0.0, 0.07), y0, y1, "tunnel")
    for yc in (-3.75, -1.25, 1.25, 3.75):
        _extrude_y(a, arch(0.05, 0.16), yc - 0.14, yc + 0.14, "steel")
    # light snow along the tunnel crown
    _extrude_y(a, [(-0.42, 2.0), (0.42, 2.0), (0.32, 2.12), (-0.32, 2.12)], y0, y1, "snow")
    return a.finish()


def b_tubing_lane():
    a = Asset("tubing-lane")
    y0, y1 = -TILE, TILE
    L = 1.25  # half lane width
    a.poly([(-L, y0, 0.12), (L, y0, 0.12), (L, y1, 0.12), (-L, y1, 0.12)], [(0, 1, 2, 3)], "lane")
    for sx in (-1, 1):
        prof = [(L - 0.05, 0.0), (L + 0.3, 0.55), (L + 0.6, 0.78), (L + 0.95, 0.72), (L + 1.35, 0.0)]
        if sx < 0:
            prof = [(-x, z) for x, z in reversed(prof)]
        _extrude_y(a, prof, y0, y1, "snow")
    # timber edge boards on the inside face of each berm
    for sx in (-1, 1):
        x = sx * (L + 0.1)
        _extrude_y(a, [(x - 0.06, 0.0), (x + 0.06, 0.0), (x + 0.06, 0.3), (x - 0.06, 0.3)], y0, y1, "timber-brown")
    return a.finish()


# ---------- A2 ice rink ----------
def b_ice_rink():
    a = Asset("ice-rink")
    HX, HY, RC, SEG = 15.0, 7.5, 4.0, 4
    ice = _rrect(HX - 0.08, HY - 0.08, RC - 0.08, SEG)
    a.poly([(x, y, 0.15) for x, y in ice], [tuple(range(len(ice)))], "ice")
    # painted centre line and two blue lines, flush on the ice
    for x, m in ((0.0, "barn-red"), (-5.0, "rink-blue"), (5.0, "rink-blue")):
        a.poly([(x - 0.15, -HY + 0.1, 0.17), (x + 0.15, -HY + 0.1, 0.17), (x + 0.15, HY - 0.1, 0.17),
                (x - 0.15, HY - 0.1, 0.17)], [(0, 1, 2, 3)], m)
    # white boards with a red top rail
    bo, bi = _rrect(HX + 0.12, HY + 0.12, RC + 0.12, SEG), _rrect(HX, HY, RC, SEG)
    _ring(a, bo, bi, 0.0, 0.95, "trim-white")
    ro, ri = _rrect(HX + 0.16, HY + 0.16, RC + 0.16, SEG), _rrect(HX - 0.04, HY - 0.04, RC - 0.04, SEG)
    _ring(a, ro, ri, 0.95, 1.12, "barn-red")
    # cleared-snow bank around the outside
    so, si = _rrect(HX + 1.3, HY + 1.3, RC + 1.3, SEG), _rrect(HX + 0.12, HY + 0.12, RC + 0.12, SEG)
    _ring(a, so, si, 0.0, 0.0, "snow", zin=0.6, outer_face=False)
    # two light poles on the far long side
    for x in (-7.5, 7.5):
        py = HY + 1.0
        a.cyl((x, py, 0), 0.14, 0.1, 7.6, 6, "steel-dark", caps=False)
        a.box((x, py - 0.5, 7.5), (1.6, 0.16, 0.16), "steel-dark")
        for dx in (-0.6, 0.6):
            a.box((x + dx, py - 0.55, 7.3), (0.5, 0.42, 0.26), "steel-dark")
            a.box((x + dx, py - 0.55, 7.15), (0.4, 0.34, 0.06), "lamp-glow")
        a.box((x, py - 0.5, 7.63), (1.5, 0.22, 0.1), "snow")
    # bench row facing the ice on the near long side
    by = -HY - 1.7
    for x0, x1 in ((-12.0, -6.5), (-5.5, 0.0)):
        cx, L = (x0 + x1) / 2, x1 - x0
        a.box((cx, by, 0.45), (L, 0.45, 0.1), "timber-brown")
        a.box((cx, by - 0.24, 0.8), (L, 0.08, 0.36), "timber-brown", rot=(-10, 0, 0))
        for x in (x0 + 0.3, x1 - 0.3):
            a.box((x, by - 0.05, 0.2), (0.12, 0.5, 0.4), "timber-dark")
    # skate rental shed on the near long side
    sx, sy = 9.0, -HY - 3.7
    W, D, H = 4.0, 3.0, 2.6
    _gable_shed(a, sx, sy, W, D, H, "barn-red", 2.0)
    fy = sy - D / 2
    a.box((sx - 0.5, fy - 0.02, 1.6), (2.0, 0.12, 1.0), "trim-white")
    a.box((sx - 0.5, fy - 0.08, 1.6), (1.75, 0.06, 0.75), "window-glow")
    a.box((sx - 0.5, fy - 0.3, 1.05), (2.1, 0.5, 0.1), "timber-dark")
    a.box((sx + 1.35, fy - 0.03, 1.2), (0.9, 0.12, 1.9), "trim-white")
    a.box((sx + 1.35, fy - 0.08, 1.15), (0.7, 0.1, 1.75), "timber-dark")
    a.box((sx, fy - 0.06, H + 0.6), (1.6, 0.1, 0.6), "cream-sign")
    a.box((sx, fy - 0.12, H + 0.6), (1.1, 0.03, 0.14), "barn-red")
    a.box((sx + 1.95, fy - 0.1, 2.15), (0.2, 0.2, 0.3), "lamp-glow")
    return a.finish()


def b_skater():
    """Adult guest on skates in a gliding stride. Same proportions as `skier` (hip 0.98 m), no skis or poles.
    Faces -Y. Left leg carries the weight, right leg pushes back and out."""
    a = Asset("skater")
    lean = 16.0
    H = Vector((0, 0.02, 0.98))
    Rl = Matrix.Rotation(math.radians(lean), 4, 'X')

    def U(x, y, z):
        return H + Rl @ Vector((x, y, z))

    legs = (
        ((-0.12, 0.02, 0.92), (-0.12, -0.16, 0.56), (-0.11, -0.02, 0.17), 0),
        ((0.12, 0.04, 0.92), (0.24, 0.22, 0.56), (0.36, 0.44, 0.17), -28),
    )
    for hip, knee, ankle, yaw in legs:
        _seg(a, hip, knee, 0.19, 0.2, "pants")
        _seg(a, knee, ankle, 0.17, 0.18, "pants")
        ax, ay, _ = ankle
        a.box((ax, ay - 0.04, 0.14), (0.15, 0.3, 0.2), "rubber-black", rot=(0, 0, yaw))
        a.box((ax, ay - 0.04, 0.025), (0.04, 0.4, 0.05), "steel", rot=(0, 0, yaw))
    a.box((0, 0.02, 0.98), (0.44, 0.28, 0.2), "pants")
    a.cyl(tuple(H), 0.25, 0.22, 0.58, 6, "jacket", rot=(lean, 0, 0))
    a.box(U(0, -0.04, 0.52), (0.62, 0.3, 0.16), "jacket", rot=(lean, 0, 0))
    # arms swing opposite the legs: right arm forward, left arm back
    for sx, elbow, hand in ((1, (0.36, -0.22, 0.28), (0.26, -0.44, 0.18)),
                            (-1, (-0.36, 0.2, 0.3), (-0.34, 0.38, 0.14))):
        sh = U(sx * 0.3, -0.04, 0.5)
        el, hd = U(*elbow), U(*hand)
        _seg(a, sh, el, 0.15, 0.15, "jacket")
        _seg(a, el, hd, 0.14, 0.14, "jacket")
        a.box(hd, (0.13, 0.13, 0.13), "navy")
    # knit scarf with a trailing tail
    a.box(U(0, -0.05, 0.62), (0.34, 0.28, 0.1), "scarf", rot=(lean, 0, 0))
    _seg(a, U(0.08, 0.1, 0.6), U(0.12, 0.42, 0.42), 0.12, 0.05, "scarf")
    # head, knit hat (helmet material), pom-pom
    a.sphere(U(0, -0.08, 0.76), 0.17, "skin", seg=6, rings=4)
    a.cyl(U(0, -0.08, 0.8), 0.19, 0.12, 0.26, 6, "helmet", rot=(lean, 0, 0))
    a.cyl(U(0, -0.08, 0.78), 0.205, 0.205, 0.09, 6, "helmet", rot=(lean, 0, 0), caps=False)
    a.sphere(U(0, -0.08, 1.1), 0.08, "helmet", seg=5, rings=3)
    return a.finish()


BUILDERS = [b_tubing_hut, b_tube, b_magic_carpet, b_tubing_lane, b_ice_rink, b_skater]

META = {
    "tubing-hut": dict(tags=["activity", "building"]),
    "tube": dict(tags=["activity", "prop"], split=["tube"]),
    "magic-carpet": dict(tags=["activity"]),
    "tubing-lane": dict(tags=["activity"]),
    "ice-rink": dict(tags=["activity"]),
    "skater": dict(tags=["guest"], split=["jacket", "helmet"]),
}
BUDGET = {"tubing-hut": (700, 18), "tube": (60, 3), "magic-carpet": (220, 8), "tubing-lane": (80, 4),
          "ice-rink": (1800, 40), "skater": (350, 12)}


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


def manifest_rows(rows):
    out = []
    for r in rows:
        e = {"name": r["name"], "file": r["name"] + ".glb", "tris": r["tris"], "sizeBytes": r.get("bytes", 0),
             "heightMeters": r["h"], "footprintMeters": [r["fx"], r["fy"]]}
        e.update(META[r["name"]])
        out.append(e)
    return out


def write_rows(rows, path=None):
    path = path or os.path.join(lib.ROOT, "rows-activities1.json")
    with open(path, "w") as f:
        json.dump(manifest_rows(rows), f, indent=2)
    return path


# ---------- review renders ----------
def _load(module, builder_names):
    ns = {}
    exec("from lib import *\n" + open(os.path.join(_DIR, module)).read(), ns)
    return [ns[n]() for n in builder_names]


def _hide_strays():
    for col in bpy.data.collections:
        if col.name not in ("kit", "scenes"):
            col.hide_render = True


def vignette_tubing():
    _hide_strays()
    ns = {}
    exec("from lib import *\n" + open(os.path.join(_DIR, "scenes.py")).read(), ns)
    cam = setup_render()
    c = ns["_scene_coll"]()
    inst = ns["inst"]
    _load("props.py", ["b_pines"])
    slope, run = 15.0, 15.0
    ca, sa = math.cos(math.radians(slope)), math.sin(math.radians(slope))
    zoff = run * sa
    # hill: slope plank, top platform; flat runout is the studio snow ground
    g = Asset("vig-hill")
    g.box((0, 0, zoff - 0.06), (44, 2 * run + 0.6, 0.12), "snow", rot=(slope, 0, 0))
    g.box((0, run * ca + 7, 2 * zoff - 6), (44, 14, 12), "snow")
    zmin = min(v.co.z for v in g.bm.verts)
    h = g.finish()
    h.location.z = zmin
    bpy.data.collections["kit"].objects.unlink(h)
    c.objects.link(h)

    def on_slope(name, x, s, rz=0, lift=0.0, **kw):
        o = inst(c, name, (x, s * ca, zoff + s * sa + lift), rz=rz, **kw)
        o.rotation_euler = (math.radians(slope), 0, math.radians(rz))
        return o

    lanes = (-9.8, -4.9, 0.0)
    for x in lanes:
        for s in (-10, 0, 10):
            on_slope("tubing-lane", x, s)
    for s in (-10, 0, 10):
        on_slope("magic-carpet", 4.6, s)
    top = 2 * zoff
    inst(c, "tubing-hut", (-14.5, run * ca + 4.0, top), rz=0)
    tints = [None, {"tube": ("tube-blue", "#2f7de1")}, {"tube": ("tube-yellow", "#f6c700")},
             {"tube": ("tube-green", "#2f8f5a")}]
    on_slope("tube", -9.8, 6.0, rz=10, jacket=tints[1])
    on_slope("tube", -4.9, -4.0, rz=40)
    on_slope("tube", 0.0, 11.0, rz=70, jacket=tints[2])
    inst(c, "tube", (-6.0, -run * ca - 4.0, 0), rz=20, jacket=tints[3])
    inst(c, "tube", (-2.5, -run * ca - 5.5, 0), rz=50, jacket=tints[1])
    inst(c, "tube", (-4.0, run * ca + 2.2, top), rz=0)
    inst(c, "tube", (-6.0, run * ca + 2.6, top), rz=30, jacket=tints[2])
    for i, (n, x, y, z) in enumerate((("pine-a", -16, 10, 0), ("pine-b", -18, -4, 0), ("pine-c", 12, 6, 0),
                                       ("pine-a", 14, -8, 0), ("pine-b", -12, run * ca + 10, top),
                                       ("pine-c", 10, run * ca + 9, top))):
        zz = z if z else zoff + (y / ca) * sa
        inst(c, n, (x, y, zz), rz=i * 41)
    look(cam, (-2, 0, 3.5), 32, 30, 62, lens=35)
    ns["_render_scene"](f"{REN}/vignette-tubing-hill.png")
    return f"{REN}/vignette-tubing-hill.png"


def vignette_rink():
    _hide_strays()
    ns = {}
    exec("from lib import *\n" + open(os.path.join(_DIR, "scenes.py")).read(), ns)
    cam = setup_render()
    c = ns["_scene_coll"]()
    inst = ns["inst"]
    _load("buildings.py", ["b_hut"])
    _load("props.py", ["b_pines"])
    inst(c, "ice-rink", (0, 0, 0))
    inst(c, "warming-hut", (-14.5, -12.0, 0), rz=200)
    sk = [((-6, 1.5), 200, None),
          ((3, -3.0), 120, {"jacket": ("jacket-teal", "#1f8a8a"), "helmet": ("helmet-red", "#c8302b")}),
          ((8, 3.5), 300, {"jacket": ("jacket-navy", "#22324f"), "helmet": ("helmet-cream", "#efe2c4")}),
          ((-1, 4.0), 60, {"jacket": ("jacket-green", "#2f8f5a"), "helmet": ("helmet-yellow", "#f6c700")})]
    for (x, y), rz, j in sk:
        inst(c, "skater", (x, y, 0.15), rz=rz, jacket=j)
    for i, (n, x, y) in enumerate((("pine-a", -21, 6), ("pine-b", -19, 14), ("pine-c", 20, 12),
                                   ("pine-a", 22, -4), ("pine-b", 4, 15), ("pine-c", -8, 16))):
        inst(c, n, (x, y, 0), rz=i * 37)
    look(cam, (-1, -2, 1.5), 22, 34, 50, lens=35)
    ns["_render_scene"](f"{REN}/vignette-ice-rink.png")
    return f"{REN}/vignette-ice-rink.png"


def render_all():
    paths = []
    for b in BUILDERS:
        name = b.__name__[2:].replace("_", "-")
        paths.append(render_asset(name))
    paths.append(vignette_tubing())
    paths.append(vignette_rink())
    return paths
