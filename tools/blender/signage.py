"""Row T1 trail signage kit: trail entrance signs, trail-map kiosk, rope closure gate.
Metres, Blender +Z up, front = -Y (glTF +Z after export_yup). Run in Blender:
  sys.path.insert(0, "<repo>/tools/blender"); import signage; signage.build_all(out)

Texture-slot faces (sign-face, sign-face-2, map-face, closed-face) are single quads with their own
material and UVs spanning 0..1: u grows toward +X, v grows toward +Z, so a texture reads upright and
un-mirrored from the front (-Y). They export as plain cream-sign; the game draws onto them at runtime.
"""
import math
import os
import random
import bmesh
from mathutils import Vector
import lib
from lib import *

PALETTE.setdefault("sign-yellow", ("#f6c700", 0.6))
PALETTE.setdefault("timber-weathered", ("#5c4430", 0.95))
# Runtime texture slots: plain cream-sign in the GLB.
FACES = ("sign-face", "sign-face-2", "map-face", "closed-face")
for _f in FACES:
    PALETTE.setdefault(_f, PALETTE["cream-sign"])

POST_W = 0.15


def _rough_post(a, x, y, h, w=POST_W, seed=0, m="timber-weathered", lean=0.012):
    """Rough-sawn square post: jittered corners, slight lean, pyramid-cut top. 18 tris."""
    rnd = random.Random(seed)
    j = lambda: rnd.uniform(-0.012, 0.012)
    hw = w / 2
    bot = [(x - hw + j(), y - hw + j(), 0), (x + hw + j(), y - hw + j(), 0),
           (x + hw + j(), y + hw + j(), 0), (x - hw + j(), y + hw + j(), 0)]
    top = [(px + lean * h * 0.5 + j() * 0.6, py + j() * 0.6, h - 0.06) for px, py, _ in bot]
    tip = (x + lean * h * 0.5, y, h)
    verts = bot + top + [tip]
    faces = [(0, 3, 2, 1), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7),
             (4, 5, 8), (5, 6, 8), (6, 7, 8), (7, 4, 8)]
    a.poly(verts, faces, m)
    return x + lean * h * 0.5


def _face_quad(a, verts, m):
    """Mark the board's front face (min y) as the texture slot: own material, UV 0..1 with
    u -> +X and v -> +Z. Returns the face."""
    faces = {f for v in verts for f in v.link_faces}
    f = min(faces, key=lambda f: f.calc_center_median().y)
    return f


def _uv_face(a, f, m):
    uv = a.bm.loops.layers.uv.verify()
    f.material_index = a.mi(m)
    xs = [l.vert.co.x for l in f.loops]
    zs = [l.vert.co.z for l in f.loops]
    x0, x1, z0, z1 = min(xs), max(xs), min(zs), max(zs)
    for l in f.loops:
        l[uv].uv = ((l.vert.co.x - x0) / (x1 - x0), (l.vert.co.z - z0) / (z1 - z0))


def _board(a, c, face_w, face_h, face_m, border=0.03, thick=0.06, m="timber-brown", recess=0.012):
    """Routed timber board: raised frame of `border`, face recessed by `recess`; the inner quad
    is exactly face_w x face_h and carries face_m. 20 tris."""
    vs = a.box(c, (face_w + 2 * border, thick, face_h + 2 * border), m)
    front = _face_quad(a, vs, face_m)
    res = bmesh.ops.inset_individual(a.bm, faces=[front], thickness=border, depth=-recess)
    for f in res["faces"]:
        f.material_index = a.mi(m)
    # inset_individual does not give an exact border; snap the inner quad to face_w x face_h
    cx, cz = c[0], c[2]
    for v in front.verts:
        v.co.x = cx + math.copysign(face_w / 2, v.co.x - cx)
        v.co.z = cz + math.copysign(face_h / 2, v.co.z - cz)
    _uv_face(a, front, face_m)
    return front


def _snow_strip(a, c, length, depth, h=0.07):
    a.box(c, (length, depth, h), "snow", bevel=0.025)


def _post_cap(a, x, y, top):
    a.box((x, y, top - 0.015), (POST_W + 0.05, POST_W + 0.05, 0.07), "snow", bevel=0.025)


def _sign_on_post(name, boards):
    """boards: list of (centre z, face material)."""
    a = Asset(name)
    H = 2.4
    tx = _rough_post(a, 0, 0, H, seed=len(name))
    fw, fh = 1.2, 0.45                       # 8:3
    by = -POST_W / 2 - 0.03 - 0.002          # board behind-face sits on the post front
    for z, fm in boards:
        x = tx * (z / H)                     # follow the post lean
        _board(a, (x, by, z), fw, fh, fm)
        _snow_strip(a, (x, by, z + fh / 2 + 0.03 + 0.03), fw + 0.1, 0.1)
    _post_cap(a, tx, 0, H)
    # small drift banked against the post
    a.cyl((0, 0, -0.02), 0.32, 0.12, 0.16, 6, "snow", caps=False)
    return a.finish()


def b_trail_sign():
    return _sign_on_post("trail-sign", [(2.02, "sign-face")])


def b_trail_sign_double():
    return _sign_on_post("trail-sign-double", [(2.08, "sign-face"), (1.5, "sign-face-2")])


def b_trail_map_kiosk():
    a = Asset("trail-map-kiosk")
    fw, fh = 2.4, 1.5                        # 8:5
    border = 0.09
    px = fw / 2 + border + 0.09
    H = 2.75
    for i, sx in enumerate((-1, 1)):
        _rough_post(a, sx * px, 0, H, w=0.18, seed=7 + i, lean=0.0)
    zc = 0.95 + fh / 2 + border
    _board(a, (0, -0.06, zc), fw, fh, "map-face", border=border, thick=0.1)
    # header beam and lower rail tie the posts together
    a.box((0, 0, H - 0.1), (2 * px + 0.34, 0.2, 0.16), "timber-dark")
    a.box((0, 0, 0.95 - 0.07), (2 * px, 0.12, 0.12), "timber-dark")
    # shallow gable roof, ridge along X, snow on top
    a.gable_roof((0, 0, H), 2 * px + 0.2, 0.7, 0.24, "timber-dark", thick=0.07, overhang=0.28,
                 snow_thick=0.11, snow_over=0.06, snow_bevel=0.035)
    for sx in (-1, 1):
        a.cyl((sx * px, 0, -0.02), 0.36, 0.14, 0.18, 6, "snow", caps=False)
    return a.finish()


def _tube(a, p0, p1, r, m, sides=3):
    """Open n-sided tube between two points (2*sides tris)."""
    p0, p1 = Vector(p0), Vector(p1)
    d = (p1 - p0).normalized()
    up = Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((1, 0, 0))
    s = d.cross(up).normalized()
    u = s.cross(d).normalized()
    ring = lambda p: [p + (s * math.cos(t) + u * math.sin(t)) * r
                      for t in (2 * math.pi * k / sides + math.pi / 2 for k in range(sides))]
    vs = ring(p0) + ring(p1)
    faces = [(k, (k + 1) % sides, sides + (k + 1) % sides, sides + k) for k in range(sides)]
    a.poly([tuple(v) for v in vs], faces, m)


def b_rope_gate():
    a = Asset("rope-gate")
    span, ph, r = 3.0, 1.8, 0.035
    bands = ("sign-yellow", "shutter-black", "sign-yellow", "shutter-black")
    seg = ph / len(bands)
    for sx in (-1, 1):
        for i, m in enumerate(bands):
            a.cyl((sx * span / 2, 0, i * seg), r, r, seg, 4, m, caps=(i == len(bands) - 1),
                  rot=(0, 0, 45))
    # sagging rope: tie-off at 1.25 m, board hangs from the low point at mid-span
    fw, fh = 0.6, 0.3                       # 2:1
    tie = 1.25
    low = 0.98
    bx = fw / 2 - 0.03
    for sx in (-1, 1):
        x0 = sx * span / 2
        xm = sx * (span / 4 + bx / 2)
        p = [(x0, 0, tie), (xm, 0, (tie + low) / 2 - 0.06), (sx * bx, 0, low)]
        for q0, q1 in zip(p, p[1:]):
            _tube(a, q0, q1, 0.018, "sign-yellow")
    _board(a, (0, 0, low - fh / 2 - 0.02), fw, fh, "closed-face", border=0.025, thick=0.04,
           m="shutter-black", recess=0.006)
    return a.finish()


BUILDERS = [b_trail_sign, b_trail_sign_double, b_trail_map_kiosk, b_rope_gate]

ROW_META = {
    "trail-sign": {"split": ["sign-face"]},
    "trail-sign-double": {"split": ["sign-face", "sign-face-2"]},
    "trail-map-kiosk": {"split": ["map-face"]},
    "rope-gate": {"split": ["closed-face"]},
}


def uv_report(ob):
    """For each texture-slot material: face count, UV bounds, face size, normal, orientation check."""
    me = ob.data
    uvl = me.uv_layers.active
    out = {}
    for mi, m in enumerate(me.materials):
        if m.name.split(".")[0] not in FACES:
            continue
        polys = [p for p in me.polygons if p.material_index == mi]
        pts = []
        for p in polys:
            for li in p.loop_indices:
                co = me.vertices[me.loops[li].vertex_index].co
                u, v = uvl.data[li].uv
                pts.append((co.x, co.z, u, v))
        us = [q[2] for q in pts]; vs = [q[3] for q in pts]; ok = True
        xs = [q[0] for q in pts]; zs = [q[1] for q in pts]
        w, h = max(xs) - min(xs), max(zs) - min(zs)
        for x, z, u, v in pts:   # u must track +X, v must track +Z
            ok &= abs(u - (x - min(xs)) / w) < 1e-3 and abs(v - (z - min(zs)) / h) < 1e-3
        out[m.name.split(".")[0]] = {"polys": len(polys), "verts": len({(q[0], q[1]) for q in pts}),
                       "u": [round(min(us), 4), round(max(us), 4)],
                       "v": [round(min(vs), 4), round(max(vs), 4)],
                       "sizeMeters": [round(w, 4), round(h, 4)], "aspect": round(w / h, 4),
                       "normals": sorted({tuple(round(c, 3) + 0.0 for c in p.normal) for p in polys}), "upright_unmirrored": ok}
    return out


def build_all(out=None, export_glb=True):
    if out:
        lib.GLB = out
        os.makedirs(out, exist_ok=True)
    rows = []
    for b in BUILDERS:
        ob = b()
        row = dict(name=ob.name, **info(ob))
        row["uv"] = uv_report(ob)
        if export_glb:
            row["bytes"] = lib.export(ob.name)
        rows.append(row)
    return rows


def manifest_rows(rows):
    return [dict(name=r["name"], file=r["name"] + ".glb", tris=r["tris"], sizeBytes=r["bytes"],
                 heightMeters=r["h"], footprintMeters=[r["fx"], r["fy"]], tags=["sign", "prop"],
                 **ROW_META[r["name"]]) for r in rows]


# ---------- review-only placeholder look for the texture slots ----------
def _placeholder_image(name, w, h, kind):
    """Pixel-drawn stand-in for what the game will paint: brown routed board, difficulty shape,
    cream name bar, condition dot. Review renders only; never exported."""
    img = bpy.data.images.get(name) or bpy.data.images.new(name, w, h)
    px = [0.0] * (w * h * 4)
    def put(x, y, c):
        i = (y * w + x) * 4
        px[i:i + 4] = c
    lin = lambda hx: [int(hx[i:i + 2], 16) / 255 for i in (1, 3, 5)] + [1.0]
    bg, cream, green, dark, red, blue = (lin("#5a3d26"), lin("#f1e6c8"), lin("#197641"),
                                         lin("#222233"), lin("#c8302b"), lin("#195dc4"))
    for y in range(h):
        for x in range(w):
            c = bg
            if kind == "closed":
                c = lin("#f6c700") if (x // 8 + y // 8) % 2 == 0 and (y < h * 0.12 or y > h * 0.88) else cream
                if h * 0.3 < y < h * 0.7 and w * 0.12 < x < w * 0.88:
                    c = red
            elif kind == "map":
                c = lin("#e9eef2")
                # three trail ribbons and a lift line on a pale map
                for k, (col, off) in enumerate(((green, 0.25), (blue, 0.5), (dark, 0.75))):
                    if abs(x / w - (off + 0.12 * math.sin(y / h * 5 + k))) < 0.018:
                        c = col
                if abs(x / w - 0.52) < 0.006 and y > h * 0.1:
                    c = red
                if y > h * 0.86:
                    c = lin("#25374a")
            else:
                shape = green if kind == "sign" else blue
                cx, cy, rr = h * 0.5, h * 0.5, h * 0.3
                inside = ((x - cx) ** 2 + (y - cy) ** 2 < rr ** 2) if kind == "sign" else \
                    (abs(x - cx) < rr * 0.85 and abs(y - cy) < rr * 0.85)
                if inside:
                    c = shape
                elif h * 0.95 < x < w * 0.82 and h * 0.36 < y < h * 0.64:
                    c = cream
                elif (x - w * 0.9) ** 2 + (y - cy) ** 2 < (h * 0.12) ** 2:
                    c = cream
            put(x, y, c)
    img.pixels = px
    return img


def placeholder_faces():
    specs = {"sign-face": (240, 90, "sign"), "sign-face-2": (240, 90, "sign2"),
             "map-face": (240, 150, "map"), "closed-face": (120, 60, "closed")}
    for name, (w, h, kind) in specs.items():
        m = bpy.data.materials.get(name)
        if not m:
            continue
        nt = m.node_tree
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.image = _placeholder_image("ph-" + name, w, h, kind)
        tex.interpolation = "Closest"
        nt.links.new(tex.outputs["Color"], nt.nodes["Principled BSDF"].inputs["Base Color"])
