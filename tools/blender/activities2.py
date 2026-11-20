"""A3 and A4: apres bar and village decor (fire pit, string lights, ski rack, bench, picnic table,
direction sign). Metres, Blender +Z up, front = -Y. Run headless:
  sys.path.insert(0, "<repo>/tools/blender"); import activities2 as m; rows = m.build_all(out)
"""
import os, math, json
import lib
from lib import *

PALETTE.setdefault("sign-green", ("#0b6b3a", 0.6))
PALETTE.setdefault("sign-white", ("#f4f7fb", 0.6))
# Runtime texture slot for the top direction board. Neutral cream so the untextured fallback still reads.
PALETTE.setdefault("arrow-face", ("#efe2c4", 0.8))

HERE = os.path.dirname(os.path.abspath(__file__))


# ---------- helpers ----------
def _rod(a, p, q, r, m, seg=3):
    """Open prism from p to q (no caps): 2*seg tris."""
    p, q = Vector(p), Vector(q)
    d = q - p
    M = Matrix.Translation(p) @ d.normalized().to_track_quat('Z', 'Y').to_matrix().to_4x4()
    vs = []
    for k in range(seg):
        t = 2 * math.pi * k / seg
        vs += [(r * math.cos(t), r * math.sin(t), 0.0), (r * math.cos(t), r * math.sin(t), d.length)]
    faces = [(2 * k, 2 * ((k + 1) % seg), 2 * ((k + 1) % seg) + 1, 2 * k + 1) for k in range(seg)]
    a.poly(vs, faces, m, M)


def _swag(a, p0, p1, sag, bulbs, wire="timber-dark", bulb_r=0.15, wire_r=0.035):
    """Sagging line of lamp-glow bulbs between p0 and p1 (parabolic sag). Bulbs are octahedra (8 tris)."""
    p0, p1 = Vector(p0), Vector(p1)

    def at(t):
        v = p0.lerp(p1, t)
        v.z -= sag * 4 * t * (1 - t)
        return v
    ts = [i / (bulbs + 1) for i in range(bulbs + 2)]
    pts = [at(t) for t in ts]
    for i in range(len(pts) - 1):
        _rod(a, pts[i], pts[i + 1], wire_r, wire)
    for v in pts[1:-1]:
        a.sphere((v.x, v.y, v.z - bulb_r * 0.9), bulb_r, "lamp-glow", seg=4, rings=2)


def _ski(a, c, m, lean=-14, rz=0, length=1.75):
    a.box(c, (0.12, 0.05, length), m, rot=(lean, 0, rz))


# ---------- A3: apres bar ----------
def b_bar():
    a = Asset("apres-bar")
    W, D, F, H = 13.0, 8.0, 0.6, 4.6          # walls x, y, foundation, eave
    rise = 4.3
    fy = -D / 2
    a.box((0, 0, F / 2), (W + 0.3, D + 0.3, F), "stone-grey")
    a.box((0, 0, F + (H - F) / 2), (W, D, H - F), "timber-brown")
    # log-cabin bands and cream corner boards
    for z in (1.35, 2.25, 3.15, 4.05):
        a.box((0, 0, z), (W + 0.1, D + 0.1, 0.16), "timber-dark")
    for sx in (-1, 1):
        for sy in (-1, 1):
            a.box((sx * W / 2, sy * D / 2, F + (H - F) / 2), (0.3, 0.3, H - F), "cream-sign")
    # big main gable, ridge along X, deep snow
    a.gable_end((0, 0, H), W, D, rise, "timber-brown")
    a.gable_roof((0, 0, H), W, D, rise, "slate-roof", thick=0.26, overhang=0.65,
                 snow_thick=0.55, snow_over=0.16, snow_bevel=0.16)
    # front cross gable (bump-out with the entrance), ridge along Y
    Wc, proj, rc = 6.2, 0.9, 3.6
    gy0, gy1 = fy - proj, -1.1
    a.box((0, fy - proj / 2, F / 2), (Wc + 0.3, proj + 0.3, F), "stone-grey")
    a.box((0, fy - proj / 2, F + (H - F) / 2), (Wc, proj, H - F), "timber-brown")
    for z in (1.35, 2.25, 3.15, 4.05):
        a.box((0, fy - proj / 2, z), (Wc + 0.1, proj + 0.1, 0.16), "timber-dark")
    for sx in (-1, 1):
        a.box((sx * Wc / 2, gy0, F + (H - F) / 2), (0.3, 0.3, H - F), "cream-sign")
    a.gable_end((0, (gy0 + gy1) / 2, H), gy1 - gy0, Wc, rc, "timber-brown", rz=90)
    a.gable_roof((0, (gy0 + gy1) / 2, H), gy1 - gy0, Wc, rc, "slate-roof", rz=90, thick=0.24,
                 overhang=0.55, snow_thick=0.5, snow_over=0.14, snow_bevel=0.15)
    # entrance: double door with glowing glass, lanterns
    a.box((0, gy0 - 0.06, F + 1.3), (2.2, 0.16, 2.6), "cream-sign")
    a.box((0, gy0 - 0.12, F + 1.2), (1.8, 0.12, 2.4), "barn-red")
    for x in (-0.45, 0.45):
        a.box((x, gy0 - 0.2, F + 1.5), (0.6, 0.06, 1.3), "window-glow")
    for x in (-1.45, 1.45):
        a.box((x, gy0 - 0.15, F + 2.2), (0.28, 0.28, 0.42), "lamp-glow")
    for x in (-2.3, 2.3):
        a.window((x, gy0, 2.2), 0.9, 1.9, '-Y', frame="cream-sign", mullion=False, sill=False)
    a.window((0, gy0, H + 1.25), 2.4, 1.5, '-Y', frame="cream-sign")      # loft gable window
    # hanging sign: beam on two brackets over the door, board on chains
    sz = 3.85
    for x in (-1.5, 1.5):
        a.box((x, gy0 - 0.35, 4.45), (0.14, 0.7, 0.14), "timber-dark")
    a.box((0, gy0 - 0.66, 4.45), (3.4, 0.14, 0.14), "timber-dark")
    for x in (-1.15, 1.15):
        a.box((x, gy0 - 0.66, 4.25), (0.06, 0.06, 0.3), "timber-dark")
    a.box((0, gy0 - 0.66, sz), (3.0, 0.14, 0.95), "barn-red")
    a.box((0, gy0 - 0.75, sz + 0.05), (2.5, 0.03, 0.22), "cream-sign")
    a.box((0, gy0 - 0.66, sz + 0.52), (3.1, 0.2, 0.1), "snow")
    # shed dormers with glowing windows on the front slope
    slope = rise / (D / 2)
    for x in (-4.6, 4.6):
        yf = -2.9
        zr = H + slope * (D / 2 + yf)
        a.box((x, yf + 1.1, zr + 1.25), (2.2, 2.2, 2.5), "timber-brown")
        a.box((x, yf - 0.03, zr + 1.75), (1.75, 0.04, 1.15), "cream-sign")
        a.box((x, yf - 0.05, zr + 1.75), (1.45, 0.06, 0.9), "window-glow")
        a.box((x, yf + 1.0, zr + 2.62), (2.6, 2.7, 0.32), "snow", rot=(-10, 0, 0))
    # wide glowing front windows on the main wall
    for x in (-4.85, 4.85):
        a.window((x, fy, 2.4), 2.7, 2.1, '-Y', frame="cream-sign")
    # sides, back, gable ends
    for y in (-1.8, 1.8):
        a.window((-W / 2, y, 2.4), 1.6, 1.6, '-X', frame="cream-sign")
    a.window((W / 2, -2.2, 2.4), 1.6, 1.6, '+X', frame="cream-sign")
    for x in (-3.5, 3.5):
        a.window((x, D / 2, 2.4), 1.4, 1.4, '+Y', frame="cream-sign", mullion=False, sill=False)
    a.window((-W / 2, 0, H + 1.3), 1.2, 1.2, '-X', frame="cream-sign", mullion=False, sill=False)
    # stone chimney on +X gable end
    cx, cy = W / 2 + 0.8, 1.4
    a.box((cx, cy, 1.6), (1.9, 2.1, 3.2), "stone-grey")
    a.box((cx, cy, 6.4), (1.45, 1.55, 6.8), "stone-grey")
    for z in (3.3, 6.8):
        a.box((cx, cy, z), (1.6, 1.7, 0.18), "stone-dark")
    a.box((cx, cy, 9.95), (1.8, 1.9, 0.3), "stone-dark")
    a.box((cx, cy, 10.25), (1.6, 1.7, 0.3), "snow", bevel=0.1)
    # firewood stack beside the chimney
    a.box((cx + 0.1, cy - 2.2, 0.55), (0.7, 1.8, 1.1), "timber-dark")
    a.box((cx + 0.1, cy - 2.2, 1.16), (0.8, 1.9, 0.14), "snow")
    # front deck with railing, steps
    dy0, dy1 = fy - 0.05, fy - 3.6
    dcy = (dy0 + dy1) / 2
    rx = W / 2 + 0.1
    a.box((0, dcy, F - 0.1), (2 * rx + 0.2, dy0 - dy1, 0.2), "timber-brown")
    a.box((0, dcy, F / 2 - 0.15), (2 * rx - 0.2, dy0 - dy1 - 0.3, F - 0.3), "timber-dark")
    for i in range(2):
        a.box((0, dy1 - 0.35 - i * 0.35, F - 0.25 - i * 0.22), (2.6, 0.4, 0.2), "timber-brown")
    sx_open = 1.4
    for x in (-rx, -4.0, -sx_open, sx_open, 4.0, rx):
        a.box((x, dy1, F + 0.55), (0.18, 0.18, 1.1), "timber-brown")
    for sx in (-1, 1):
        a.box((sx * rx, dy0 + 0.1, F + 0.55), (0.18, 0.18, 1.1), "timber-brown")
        L = rx - sx_open
        x = sx * (rx + sx_open) / 2
        a.box((x, dy1, F + 1.05), (L + 0.2, 0.14, 0.12), "timber-brown")
        a.box((x, dy1, F + 1.15), (L + 0.26, 0.22, 0.1), "snow")
        a.box((sx * rx, dcy, F + 1.05), (0.14, dy0 - dy1, 0.12), "timber-brown")
        a.box((sx * rx, dcy, F + 1.15), (0.22, dy0 - dy1, 0.1), "snow")
    # deck tables (pedestal + snowy top)
    for x in (-4.4, 4.4):
        a.box((x, dcy - 0.2, F + 0.38), (0.16, 0.16, 0.76), "timber-dark")
        a.box((x, dcy - 0.2, F + 0.8), (1.6, 0.9, 0.1), "timber-brown")
        a.box((x, dcy - 0.2, F + 0.89), (1.4, 0.7, 0.08), "snow")
    # string lights: tall posts at deck front, swags across the front and back to the eaves
    pz = F + 3.2
    lp = (-rx, -sx_open, sx_open, rx)
    for x in lp:
        a.box((x, dy1, F + 1.6), (0.14, 0.14, 3.2), "timber-dark")
    for x0, x1, n in ((-rx, -sx_open, 5), (-sx_open, sx_open, 3), (sx_open, rx, 5)):
        _swag(a, (x0, dy1, pz), (x1, dy1, pz), 0.55, n)
    for sx in (-1, 1):
        _swag(a, (sx * rx, dy1, pz), (sx * (W / 2 - 0.2), fy - 0.1, H - 0.15), 0.45, 3)
    # skis leaning on the front rail and stuck in the snowbank by the steps
    for i, (x, m) in enumerate(((-5.6, "amber-accent"), (-5.35, "navy"), (-3.1, "barn-red"), (-2.85, "amber-accent"))):
        _ski(a, (x, dy1 - 0.32, 0.95), m, lean=-12)
    for x, m, rz in ((2.4, "navy", 0), (2.75, "amber-accent", 8)):
        _ski(a, (x, dy1 - 1.4, 0.9), m, lean=6, rz=rz)
    a.box((2.6, dy1 - 1.4, 0.2), (1.6, 1.2, 0.4), "snow", bevel=0.15)
    # snow drifts at the corners
    a.box((-W / 2 - 0.4, D / 2 - 0.4, 0.25), (1.6, 2.4, 0.5), "snow")
    a.box((W / 2 + 0.6, D / 2 + 0.3, 0.25), (2.2, 1.4, 0.5), "snow")
    return a.finish()


# ---------- A4: decor ----------
def b_fire_pit():
    a = Asset("fire-pit")
    a.cyl((0, 0, 0), 0.8, 0.72, 0.38, 8, "stone-grey")
    for rz in (0, 120, 240):
        _rod(a, (0.5 * math.cos(math.radians(rz)), 0.5 * math.sin(math.radians(rz)), 0.36),
             (0.0, 0.0, 0.95), 0.08, "timber-dark", seg=3)
    a.cyl((0, 0, 0.36), 0.44, 0.0, 0.85, 5, "window-glow", caps=False)
    a.cyl((0.06, -0.08, 0.36), 0.26, 0.0, 1.1, 4, "lamp-glow", caps=False, rot=(0, 0, 20))
    for sy in (-1, 1):
        a.cyl((-0.85, sy * 1.55, 0.24), 0.24, 0.24, 1.7, 6, "timber-dark", rot=(0, 90, 0))
    return a.finish()


def b_string_lights():
    a = Asset("string-lights")
    span, h = 10.0, 3.4
    for sx in (-1, 1):
        a.box((sx * span / 2, 0, h / 2), (0.16, 0.16, h), "timber-brown")
        a.box((sx * span / 2, 0, h + 0.06), (0.24, 0.24, 0.12), "snow")
    _swag(a, (-span / 2, 0, h - 0.15), (span / 2, 0, h - 0.15), 0.9, 9, bulb_r=0.16)
    return a.finish()


def b_ski_rack():
    a = Asset("ski-rack")
    L = 3.0
    for sx in (-1, 1):
        a.box((sx * L / 2, 0, 0.6), (0.14, 0.5, 1.2), "timber-dark")
    a.box((0, 0.12, 1.1), (L + 0.1, 0.14, 0.14), "timber-dark")
    a.box((0, -0.15, 0.3), (L + 0.1, 0.2, 0.12), "timber-dark")
    a.box((0, 0.12, 1.22), (L + 0.2, 0.22, 0.1), "snow")
    for x, m in ((-1.05, "amber-accent"), (-0.85, "amber-accent"), (-0.2, "navy"), (0.0, "navy"),
                 (0.75, "amber-accent")):
        _ski(a, (x, -0.05, 0.86), m, lean=-10, length=1.7)
    return a.finish()


def b_bench():
    """Adirondack two-seater: slanted seat, raked wide back, broad flat arms."""
    a = Asset("bench")
    Wb = 1.5
    a.box((0, 0.0, 0.4), (Wb, 0.62, 0.07), "timber-brown", rot=(-8, 0, 0))            # seat
    for x, w, h, rz in ((-0.5, 0.42, 1.2, 4), (0.0, 0.46, 1.38, 0), (0.5, 0.42, 1.2, -4)):    # fanned back
        a.box((x, 0.5, h / 2 + 0.05), (w, 0.07, h), "timber-brown", rot=(-22, rz, 0))
    for sx in (-1, 1):
        a.box((sx * (Wb / 2 + 0.06), -0.08, 0.66), (0.2, 0.86, 0.05), "timber-brown")    # arm
        a.box((sx * (Wb / 2 + 0.06), -0.38, 0.32), (0.09, 0.09, 0.64), "timber-brown")   # front leg
        a.box((sx * (Wb / 2 + 0.06), -0.1, 0.7), (0.2, 0.7, 0.04), "snow")
    return a.finish()


def b_picnic_table():
    a = Asset("picnic-table")
    L = 1.9
    a.box((0, 0, 0.76), (L, 0.8, 0.07), "timber-brown")
    a.box((0, 0, 0.82), (L - 0.12, 0.68, 0.06), "snow")
    for sy in (-1, 1):
        a.box((0, sy * 0.68, 0.45), (L, 0.28, 0.06), "timber-brown")
        for sx in (-1, 1):
            a.box((sx * 0.62, sy * 0.36, 0.38), (0.08, 0.08, 0.92), "timber-dark", rot=(sy * 33, 0, 0))
    return a.finish()


def b_direction_sign():
    """Wayfinding post, three arrow boards. Top board front is the split quad `arrow-face`
    (UV 0..1, 4:1, facing -Y, u to the right, v up)."""
    a = Asset("direction-sign")
    post_h = 2.7
    a.box((0, 0.1, post_h / 2), (0.14, 0.14, post_h), "timber-brown")
    a.box((0, 0.1, post_h + 0.05), (0.2, 0.2, 0.1), "snow")
    fw, fh = 1.4, 0.35                   # face 4:1
    t, tip = 0.07, 0.32

    def board(zc, direction, m_face):
        """Rectangle centred on the post with an arrow tip toward +X (direction 1) or -X (-1)."""
        y = 0.03 - t / 2 - 0.04
        a.box((0, y, zc), (fw + 0.08, t, fh + 0.08), "timber-brown")
        bx = direction * (fw / 2 + 0.04)
        hh = (fh + 0.08) / 2 + 0.06
        pts = [(bx, y - t / 2, zc - hh), (bx, y - t / 2, zc + hh), (bx + direction * tip, y - t / 2, zc),
               (bx, y + t / 2, zc - hh), (bx, y + t / 2, zc + hh), (bx + direction * tip, y + t / 2, zc)]
        faces = [(0, 1, 2), (3, 5, 4), (0, 3, 4, 1), (1, 4, 5, 2), (2, 5, 3, 0)]
        a.poly(pts, faces, "timber-brown")
        fyf = y - t / 2 - 0.005
        x0, x1, z0, z1 = -fw / 2, fw / 2, zc - fh / 2, zc + fh / 2
        quad = [(x0, fyf, z0), (x1, fyf, z0), (x1, fyf, z1), (x0, fyf, z1)]
        vs = a.poly(quad, [(0, 1, 2, 3)], m_face)
        return vs

    top = board(2.35, 1, "arrow-face")
    a.box((0, -0.04, 2.35 + 0.27), (fw + 0.1, t + 0.04, 0.07), "snow")
    board(1.82, -1, "cream-sign")
    board(1.29, 1, "cream-sign")
    # UVs for the arrow-face quad only: u = x, v = z (0..1)
    uv = a.bm.loops.layers.uv.verify()
    f = next(iter(top[0].link_faces))
    xs = [v.co.x for v in f.verts]; zs = [v.co.z for v in f.verts]
    for loop in f.loops:
        loop[uv].uv = ((loop.vert.co.x - min(xs)) / (max(xs) - min(xs)),
                       (loop.vert.co.z - min(zs)) / (max(zs) - min(zs)))
    ob = a.finish()
    _face_front(ob, "arrow-face")
    return ob


def _face_front(ob, mname):
    """finish() recalculates normals; an isolated quad can end up flipped. Force it to face -Y."""
    import bmesh as _bm
    me = ob.data
    idx = [m.name for m in me.materials].index(mname)
    bm = _bm.new(); bm.from_mesh(me)
    bm.normal_update()
    flip = [f for f in bm.faces if f.material_index == idx and f.normal.y > 0]
    if flip:
        _bm.ops.reverse_faces(bm, faces=flip)
    bm.to_mesh(me); bm.free()


def verify_arrow_face(glb_path, mname="arrow-face"):
    """Re-import the GLB and check the split quad: one quad, faces -Y (Blender), UV spans exactly 0..1,
    u increases with +X and v with +Z (upright, un-mirrored seen from the front), aspect 4:1."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=glb_path)
    new = [o for o in bpy.data.objects if o not in before and o.type == 'MESH']
    ob = new[0]
    me = ob.data
    idx = [m.name.split(".")[0] for m in me.materials].index(mname)
    polys = [p for p in me.polygons if p.material_index == idx]
    uvl = me.uv_layers.active.data
    loops = [li for p in polys for li in p.loop_indices]
    vids = {me.loops[li].vertex_index for li in loops}
    M = ob.matrix_world
    pts = {li: (M @ me.vertices[me.loops[li].vertex_index].co) for li in loops}
    us = [uvl[li].uv[0] for li in loops]; vs = [uvl[li].uv[1] for li in loops]
    n = (M.to_3x3() @ polys[0].normal).normalized()
    xs = [pts[li].x for li in loops]; zs = [pts[li].z for li in loops]
    # correlation of u with x and v with z
    du = [(pts[li].x - min(xs)) / (max(xs) - min(xs)) - uvl[li].uv[0] for li in loops]
    dv = [(pts[li].z - min(zs)) / (max(zs) - min(zs)) - uvl[li].uv[1] for li in loops]
    res = {
        "polys": len(polys), "verts": len(vids), "tris": sum(len(p.vertices) - 2 for p in polys),
        "normal": [round(c, 3) for c in n],
        "u": [round(min(us), 4), round(max(us), 4)], "v": [round(min(vs), 4), round(max(vs), 4)],
        "aspect": round((max(xs) - min(xs)) / (max(zs) - min(zs)), 3),
        "max_uv_err": round(max(abs(e) for e in du + dv), 4),
    }
    res["ok"] = (res["tris"] == 2 and res["verts"] == 4 and n.y < -0.99 and res["u"] == [0.0, 1.0]
                 and res["v"] == [0.0, 1.0] and abs(res["aspect"] - 4) < 0.01 and res["max_uv_err"] < 0.002)
    for o in new:
        bpy.data.objects.remove(o, do_unlink=True)
    return res


BUILDERS = [b_bar, b_fire_pit, b_string_lights, b_ski_rack, b_bench, b_picnic_table, b_direction_sign]
TAGS = {"apres-bar": ["building", "activity"]}
SPLIT = {"direction-sign": ["arrow-face"]}


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
        e = {"name": r["name"], "file": r["name"] + ".glb", "tris": r["tris"], "sizeBytes": r.get("bytes"),
             "heightMeters": r["h"], "footprintMeters": [r["fx"], r["fy"]],
             "tags": TAGS.get(r["name"], ["decor"])}
        if r["name"] in SPLIT:
            e["split"] = SPLIT[r["name"]]
        out.append(e)
    return out


# ---------- review vignette ----------
def _load_buildings():
    ns = {}
    exec("from lib import *\n" + open(os.path.join(HERE, "buildings.py")).read(), ns)
    ns["b_lodge"]()
    ns["b_cafe"]()


def vignette(path=None):
    _load_buildings()
    cam = setup_render(900)
    c = bpy.data.collections.get("scenes") or bpy.data.collections.new("scenes")
    if c.name not in bpy.context.scene.collection.children:
        bpy.context.scene.collection.children.link(c)
    for o in list(c.objects):
        bpy.data.objects.remove(o, do_unlink=True)

    def inst(name, loc, rz=0):
        src = bpy.data.objects[name]
        o = bpy.data.objects.new(name + "-inst", src.data)
        o.location = loc; o.rotation_euler = (0, 0, math.radians(rz))
        c.objects.link(o)
        return o
    inst("apres-bar", (0, 0, 0))
    inst("base-lodge", (-22, 3, 0), rz=4)
    inst("cafe", (17, 1, 0), rz=-6)
    inst("fire-pit", (-4.5, -14.0, 0))
    inst("bench", (-4.5, -16.9, 0), rz=180)
    inst("bench", (-7.5, -13.6, 0), rz=90)
    inst("picnic-table", (3.2, -13.4, 0), rz=8)
    inst("ski-rack", (7.0, -10.6, 0), rz=-8)
    inst("string-lights", (-1.5, -11.2, 0))
    inst("direction-sign", (10.5, -14.5, 0), rz=-12)
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y = 1600, 900
    bpy.data.collections["kit"].hide_render = True
    c.hide_render = False
    look(cam, (-1.5, -5.0, 3.0), 16, 33, 58, lens=35)
    sc.render.filepath = path or f"{lib.REN}/apres-vignette.png"
    bpy.ops.render.render(write_still=True)
    bpy.data.collections["kit"].hide_render = False
    c.hide_render = True
    return sc.render.filepath
