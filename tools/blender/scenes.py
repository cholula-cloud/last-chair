def _scene_coll():
    c = bpy.data.collections.get("scenes")
    if c:
        for o in list(c.objects):
            bpy.data.objects.remove(o, do_unlink=True)
    else:
        c = bpy.data.collections.new("scenes"); bpy.context.scene.collection.children.link(c)
    return c

def inst(c, name, loc, rz=0, jacket=None, newname=None):
    src = bpy.data.objects[name]
    o = bpy.data.objects.new(newname or (name + "-inst"), src.data)
    o.location = loc; o.rotation_euler = (0, 0, math.radians(rz))
    c.objects.link(o)
    if jacket:
        for i, m in enumerate(src.data.materials):
            if m.name in jacket:
                o.material_slots[i].link = 'OBJECT'
                nm = bpy.data.materials.get(jacket[m.name][0]) or m.copy()
                nm.name = jacket[m.name][0]
                b = nm.node_tree.nodes["Principled BSDF"]
                b.inputs["Base Color"].default_value = srgb(jacket[m.name][1])
                o.material_slots[i].material = nm
    return o

def _render_scene(path, res=(1600, 900)):
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y = res
    bpy.data.collections["kit"].hide_render = True
    bpy.data.collections["scenes"].hide_render = False
    for o in bpy.data.collections["scenes"].objects:
        o.hide_render = False
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    bpy.data.collections["kit"].hide_render = False

def lineup():
    cam = setup_render()
    c = _scene_coll()
    rows = [
        (["base-lodge", "clapboard-house", "cafe", "ski-shop", "warming-hut"], 0, 3.5),
        (["lift-terminal-bottom", "lift-tower", "lift-terminal-top", "snowcat", "snow-gun"], -17, 3.0),
        (["pine-a", "pine-b", "pine-c", "lamp-post", "chair-double", "t-bar", "skier"], -29, 2.0),
    ]
    for names, y, gap in rows:
        widths = [bpy.data.objects[n].dimensions.x for n in names]
        total = sum(widths) + gap * (len(names) - 1)
        x = -total / 2
        for n, w in zip(names, widths):
            inst(c, n, (x + w / 2, y, 0))
            x += w + gap
    look(cam, (0, -14, 2.5), 18, 34, 92, lens=40)
    _render_scene(f"{REN}/kit-lineup.png")

def vignette():
    cam = setup_render()
    c = _scene_coll()
    # packed-snow road
    a = Asset("road-strip"); a.box((0, 0, 0.01), (60, 5.5, 0.04), "stone-grey"); r = a.finish()
    bpy.data.collections["kit"].objects.unlink(r); c.objects.link(r)
    inst(c, "base-lodge", (0, 12, 0))
    inst(c, "clapboard-house", (-17, 9, 0), rz=8)
    inst(c, "cafe", (13, 7.5, 0), rz=-6)
    inst(c, "ski-shop", (13, -9.5, 0), rz=180)
    inst(c, "warming-hut", (-12, -9, 0), rz=170)
    for i, x in enumerate((-22, -8, 6, 20)):
        inst(c, "lamp-post", (x, -3.3, 0))
        inst(c, "lamp-post", (x + 7, 3.3, 0))
    pines = [("pine-b", -27, 15), ("pine-a", -24, 22), ("pine-c", -6, 24), ("pine-b", 8, 25), ("pine-a", 22, 18),
             ("pine-c", 27, 6), ("pine-a", -26, -8), ("pine-b", -22, -16), ("pine-c", 3, -14), ("pine-a", 24, -16),
             ("pine-b", 15, 27), ("pine-c", -16, 26), ("pine-a", 30, 24), ("pine-b", -33, 4)]
    for i, (n, x, y) in enumerate(pines):
        inst(c, n, (x, y, 0), rz=i * 37)
    inst(c, "skier", (-2.5, -0.8, 0), rz=-25)
    inst(c, "skier", (3.2, 1.2, 0), rz=200, jacket={"jacket": ("jacket-teal", "#1f8a8a"), "helmet": ("helmet-navy", "#22324f")})
    look(cam, (0, 4, 1.5), 28, 38, 62, lens=35)
    _render_scene(f"{REN}/village-vignette.png")
