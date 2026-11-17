import bpy, bmesh, math, os, json
from mathutils import Matrix, Vector

# Output root (glb/, renders/, blend/). Override with LAST_CHAIR_KIT_ROOT.
ROOT = os.environ.get("LAST_CHAIR_KIT_ROOT", os.path.expanduser("~/Documents/Last Chair/asset-kit-v1"))
GLB = ROOT + "/glb"
REN = ROOT + "/renders"
BLEND = ROOT + "/blend/last-chair-kit.blend"

def srgb(h):
    h = h.lstrip('#')
    c = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c) + (1.0,)

PALETTE = {
    "snow": ("#f4f7fb", 0.9),
    "clapboard-white": ("#ece6da", 0.85),
    "barn-red": ("#9e2b25", 0.8),
    "timber-brown": ("#6b4a2f", 0.85),
    "timber-dark": ("#4a3220", 0.9),
    "slate-roof": ("#3d4650", 0.75),
    "shutter-green": ("#1f3b2d", 0.7),
    "shutter-black": ("#1c1c1c", 0.7),
    "trim-white": ("#f2eee6", 0.8),
    "stone-grey": ("#8a8780", 0.95),
    "stone-dark": ("#5f5c57", 0.95),
    "brick": ("#8c3b2c", 0.9),
    "amber-accent": ("#e85d26", 0.6),
    "navy": ("#0b1628", 0.6),
    "pine": ("#2d5a4a", 0.9),
    "pine-dark": ("#21463a", 0.9),
    "steel": ("#9aa3ab", 0.45),
    "steel-dark": ("#4b525a", 0.5),
    "rubber-black": ("#202326", 0.8),
    "cream-sign": ("#efe2c4", 0.8),
    "glass-dark": ("#1d2a38", 0.25),
    "skin": ("#e8b48f", 0.7),
    "jacket": ("#e85d26", 0.7),
    "pants": ("#2a3a5a", 0.8),
    "helmet": ("#f4f7fb", 0.4),
    "goggles": ("#f2a33a", 0.2),
    "ski": ("#1c1c1c", 0.4),
    "awning-red": ("#c8432b", 0.8),
}
EMISSIVE = {"window-glow": "#ffb347", "lamp-glow": "#ffc46b"}

def mat(name):
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    if name in EMISSIVE:
        c = srgb(EMISSIVE[name])
        b.inputs["Base Color"].default_value = c
        b.inputs["Emission Color"].default_value = c
        b.inputs["Emission Strength"].default_value = 2.0
        b.inputs["Roughness"].default_value = 0.4
    else:
        hx, r = PALETTE[name]
        b.inputs["Base Color"].default_value = srgb(hx)
        b.inputs["Roughness"].default_value = r
    m.diffuse_color = b.inputs["Base Color"].default_value
    return m

def R(rx=0, ry=0, rz=0):
    return (Matrix.Rotation(math.radians(rz), 4, 'Z') @ Matrix.Rotation(math.radians(ry), 4, 'Y')
            @ Matrix.Rotation(math.radians(rx), 4, 'X'))

def S(sx, sy, sz):
    m = Matrix.Identity(4); m[0][0] = sx; m[1][1] = sy; m[2][2] = sz
    return m

class Asset:
    def __init__(self, name):
        self.name = name
        self.bm = bmesh.new()
        self.mats = []

    def mi(self, m):
        if m not in self.mats:
            self.mats.append(m)
        return self.mats.index(m)

    def _tag(self, verts, m, bevel=0.0, bevel_edges=None):
        idx = self.mi(m)
        faces = {f for v in verts for f in v.link_faces}
        for f in faces:
            f.material_index = idx
        if bevel > 0:
            vs = set(verts)
            edges = [e for e in self.bm.edges if e.verts[0] in vs and e.verts[1] in vs]
            if bevel_edges:
                edges = [e for e in edges if bevel_edges(e)]
            res = bmesh.ops.bevel(self.bm, geom=edges, offset=bevel, segments=1, profile=0.5,
                                  affect='EDGES', clamp_overlap=True)
            for f in res['faces']:
                f.material_index = idx
        return verts

    def box(self, c, s, m, rot=(0, 0, 0), bevel=0.0, pivot=None):
        """c = centre; s = size; rot degrees about centre."""
        M = Matrix.Translation(Vector(c)) @ R(*rot) @ S(*s)
        v = bmesh.ops.create_cube(self.bm, size=1.0, matrix=M)['verts']
        return self._tag(v, m, bevel)

    def cyl(self, base, r1, r2, h, seg, m, rot=(0, 0, 0), caps=True, bevel=0.0):
        """base = centre of bottom cap; axis along local Z rotated by rot."""
        M = Matrix.Translation(Vector(base)) @ R(*rot) @ Matrix.Translation((0, 0, h / 2))
        v = bmesh.ops.create_cone(self.bm, cap_ends=caps, cap_tris=False, segments=seg,
                                  radius1=r1, radius2=r2, depth=h, matrix=M)['verts']
        return self._tag(v, m, bevel)

    def sphere(self, c, r, m, seg=8, rings=6, scale=(1, 1, 1)):
        M = Matrix.Translation(Vector(c)) @ S(*scale)
        v = bmesh.ops.create_uvsphere(self.bm, u_segments=seg, v_segments=rings, radius=r, matrix=M)['verts']
        return self._tag(v, m)

    def poly(self, verts, faces, m, M=None):
        vs = [self.bm.verts.new((M @ Vector(p)) if M else p) for p in verts]
        for f in faces:
            self.bm.faces.new([vs[i] for i in f])
        return self._tag(vs, m)

    def prism(self, c, length, width, height, m, rz=0):
        """Gable prism: ridge along local X, base at c (z = bottom), base width in Y."""
        L, W = length / 2, width / 2
        pts = [(-L, -W, 0), (-L, W, 0), (-L, 0, height), (L, -W, 0), (L, W, 0), (L, 0, height)]
        M = Matrix.Translation(Vector(c)) @ R(0, 0, rz)
        return self.poly(pts, [(0, 2, 1), (3, 4, 5), (0, 3, 5, 2), (1, 2, 5, 4), (0, 1, 4, 3)], m, M)

    def gable_roof(self, c, length, width, rise, roof_m, snow_m="snow", thick=0.22, overhang=0.45,
                   snow_thick=0.3, snow_over=0.12, rz=0, gable_m=None, gable_inset=0.0, snow_bevel=0.09):
        """Gable roof sitting on walls of (length x width) with eave at c.z. Ridge along local X.
        Adds roof slabs (roof_m), snow slabs on top, optional gable-end triangle in gable_m."""
        cx, cy, cz = c
        W = width / 2
        ang = math.atan2(rise, W)
        M0 = Matrix.Translation(Vector(c)) @ R(0, 0, rz)
        if gable_m:
            self.gable_end(c, length - gable_inset, width, rise, gable_m, rz=rz)
        for side in (-1, 1):
            # slope surface from eave (y = side*W, z=0) to ridge (0, rise)
            slope_len = math.hypot(W, rise)
            n = Vector((0, side * math.sin(ang), math.cos(ang)))
            mid = Vector((0, side * W / 2, rise / 2))
            # extend outward along slope by overhang
            d = Vector((0, side * W, -rise)).normalized()
            Ls = slope_len + overhang
            centre = mid + d * (overhang / 2) + n * (thick / 2)
            rot = -side * math.degrees(ang)
            Mb = M0 @ Matrix.Translation(centre) @ R(rot, 0, 0) @ S(length + 2 * overhang * 0.7, Ls, thick)
            v = bmesh.ops.create_cube(self.bm, size=1.0, matrix=Mb)['verts']
            self._tag(v, roof_m)
            # snow
            Ls2 = slope_len + overhang + snow_over - 0.05
            centre2 = mid + d * ((overhang + snow_over) / 2 - 0.05) + n * (thick + snow_thick / 2 - 0.02)
            Ms = M0 @ Matrix.Translation(centre2) @ R(rot, 0, 0) @ S(length + 2 * overhang * 0.7 + 2 * snow_over, Ls2, snow_thick)
            v = bmesh.ops.create_cube(self.bm, size=1.0, matrix=Ms)['verts']
            self._tag(v, snow_m, bevel=snow_bevel)
        # ridge snow roll
        rz_top = rise + thick / math.cos(ang) + snow_thick * 0.25
        rl = length + 2 * overhang * 0.7 + 2 * snow_over
        Mr = M0 @ Matrix.Translation((0, 0, rz_top)) @ R(45, 0, 0) @ S(rl, snow_thick * 1.25, snow_thick * 1.25)
        v = bmesh.ops.create_cube(self.bm, size=1.0, matrix=Mr)['verts']
        self._tag(v, snow_m)
        return ang

    def gable_end(self, c, length, width, rise, m, rz=0):
        M = Matrix.Translation(Vector(c)) @ R(0, 0, rz)
        L, W = length / 2, width / 2
        pts = [(-L, -W, 0), (-L, W, 0), (-L, 0, rise), (L, -W, 0), (L, W, 0), (L, 0, rise)]
        return self.poly(pts, [(0, 2, 1), (3, 4, 5), (0, 3, 5, 2), (1, 2, 5, 4), (0, 1, 4, 3)], m, M)

    def window(self, c, w, h, face='-Y', frame="trim-white", depth=0.12, mullion=True, shutters=None,
               sill=True, glow="window-glow"):
        """Window on wall plane at c (c is point on wall surface). face: -Y,+Y,-X,+X."""
        x, y, z = c
        rz = {'-Y': 0, '+Y': 180, '-X': -90, '+X': 90}[face]
        M = Matrix.Translation(Vector(c)) @ R(0, 0, rz)
        def B(lc, s, m):
            Mb = M @ Matrix.Translation(Vector(lc)) @ S(*s)
            v = bmesh.ops.create_cube(self.bm, size=1.0, matrix=Mb)['verts']
            self._tag(v, m)
        f = 0.12
        B((0, 0, 0), (w + 2 * f, depth, h + 2 * f), frame)
        B((0, -depth / 2 - 0.01, 0), (w, 0.04, h), glow)
        if mullion:
            B((0, -depth / 2 - 0.04, 0), (0.07, 0.05, h), frame)
            B((0, -depth / 2 - 0.04, 0), (w, 0.05, 0.07), frame)
        if sill:
            B((0, -depth / 2 - 0.05, -h / 2 - f), (w + 0.4, 0.22, 0.1), frame)
        if shutters:
            for sx in (-1, 1):
                B((sx * (w / 2 + f + 0.04 + w * 0.27), -0.02, 0), (w * 0.5, 0.08, h + 0.2), shutters)

    def finish(self, smooth=False):
        me = bpy.data.meshes.get(self.name)
        old = bpy.data.objects.get(self.name)
        if old:
            bpy.data.objects.remove(old, do_unlink=True)
        if me:
            bpy.data.meshes.remove(me)
        me = bpy.data.meshes.new(self.name)
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        zmin = min(v.co.z for v in self.bm.verts)
        for v in self.bm.verts:
            v.co.z -= zmin
        self.bm.to_mesh(me)
        self.bm.free()
        for m in self.mats:
            me.materials.append(mat(m))
        ob = bpy.data.objects.new(self.name, me)
        kit = bpy.data.collections.get("kit") or bpy.data.collections.new("kit")
        if kit.name not in bpy.context.scene.collection.children:
            bpy.context.scene.collection.children.link(kit)
        kit.objects.link(ob)
        return ob

def tris(ob):
    me = ob.data
    me.calc_loop_triangles()
    return len(me.loop_triangles)

def info(ob):
    bb = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
    xs = [v.x for v in bb]; ys = [v.y for v in bb]; zs = [v.z for v in bb]
    return {"tris": tris(ob), "h": round(max(zs), 2), "zmin": round(min(zs), 3),
            "fx": round(max(xs) - min(xs), 2), "fy": round(max(ys) - min(ys), 2),
            "mats": [m.name for m in ob.data.materials]}

# ---------- rendering ----------
def setup_render(res=800):
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE'
    sc.render.resolution_x = res; sc.render.resolution_y = res
    sc.render.film_transparent = False
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.look = 'None'
    sc.view_settings.exposure = -0.15
    try:
        sc.eevee.taa_render_samples = 32
    except Exception:
        pass
    w = bpy.data.worlds.get("studio") or bpy.data.worlds.new("studio")
    w.use_nodes = True
    bg = w.node_tree.nodes.get("Background")
    bg.inputs[0].default_value = srgb("#9fb3c8")
    bg.inputs[1].default_value = 0.75
    sc.world = w
    sun = bpy.data.objects.get("key-sun")
    if not sun:
        ld = bpy.data.lights.new("key-sun", 'SUN'); ld.energy = 2.6; ld.angle = math.radians(8)
        ld.color = (1.0, 0.95, 0.88)
        sun = bpy.data.objects.new("key-sun", ld); sc.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(50), 0, math.radians(35))
    cam = bpy.data.objects.get("render-cam")
    if not cam:
        cd = bpy.data.cameras.new("render-cam")
        cam = bpy.data.objects.new("render-cam", cd); sc.collection.objects.link(cam)
    sc.camera = cam
    g = bpy.data.objects.get("snow-ground")
    if not g:
        a = Asset("snow-ground-mesh")
        a.box((0, 0, -0.05), (400, 400, 0.1), "snow")
        g = a.finish(); g.name = "snow-ground"
        bpy.data.collections["kit"].objects.unlink(g)
        sc.collection.objects.link(g)
    return cam

def look(cam, target, az, el, dist, lens=50, ortho=None):
    t = Vector(target)
    d = Vector((math.sin(math.radians(az)) * math.cos(math.radians(el)),
                -math.cos(math.radians(az)) * math.cos(math.radians(el)),
                math.sin(math.radians(el))))
    cam.location = t + d * dist
    cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    if ortho:
        cam.data.type = 'ORTHO'; cam.data.ortho_scale = ortho
    else:
        cam.data.type = 'PERSP'; cam.data.lens = lens
    cam.data.clip_end = 2000

def show_only(names):
    for c in bpy.data.collections:
        for o in c.objects:
            o.hide_render = o.name not in names
    for n in ("snow-ground", "key-sun", "render-cam"):
        o = bpy.data.objects.get(n)
        if o: o.hide_render = False

def render_asset(name, res=700, az=35, el=24, pad=0.92):
    cam = setup_render(res)
    ob = bpy.data.objects[name]
    show_only([name])
    for c in bpy.data.collections:
        if c.name != "kit":
            c.hide_render = True
    bpy.data.collections["kit"].hide_render = False
    bb = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
    ctr = sum(bb, Vector()) / 8
    rad = max((v - ctr).length for v in bb)
    dist = rad * pad / math.sin(math.radians(39.6 / 2))
    look(cam, ctr, az, el, dist, lens=50)
    bpy.context.scene.render.filepath = f"{REN}/{name}.png"
    bpy.ops.render.render(write_still=True)
    return f"{REN}/{name}.png"

def export(name):
    ob = bpy.data.objects[name]
    for o in bpy.context.view_layer.objects:
        o.select_set(False)
    ob.hide_set(False)
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    path = f"{GLB}/{name}.glb"
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True,
                              export_apply=True, export_yup=True, export_materials='EXPORT',
                              export_draco_mesh_compression_enable=True,
                              export_draco_mesh_compression_level=6,
                              export_animations=False, export_cameras=False, export_lights=False)
    return os.path.getsize(path)

def save():
    bpy.ops.wm.save_as_mainfile(filepath=BLEND)
