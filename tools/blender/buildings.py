PALETTE["sage-green"] = ("#7d9a82", 0.85)

def snow_strip(a, c, s, bevel=0.05):
    a.box(c, s, "snow", bevel=bevel)

def b_lodge(name="base-lodge", extra=None):
    a = Asset(name)
    W, D, H = 12.0, 9.0, 6.4      # walls x, y, eave height
    F = 0.7                        # foundation height
    a.box((0, 0, F / 2), (W + 0.3, D + 0.3, F), "stone-grey")
    a.box((0, 0, F + (H - F) / 2), (W, D, H - F), "barn-red")
    # corner trim + floor band
    for sx in (-1, 1):
        for sy in (-1, 1):
            a.box((sx * W / 2, sy * D / 2, F + (H - F) / 2), (0.32, 0.32, H - F), "trim-white")
    a.box((0, 0, 3.6), (W + 0.1, D + 0.1, 0.22), "trim-white")
    # steep front-facing gable (ridge along Y)
    rise = 6.6
    a.gable_end((0, 0, H), D, W, rise, "barn-red", rz=90)
    a.gable_roof((0, 0, H), D, W, rise, "slate-roof", rz=90, thick=0.3, overhang=0.7,
                 snow_thick=0.45, snow_over=0.15, snow_bevel=0.14)
    # front (-Y) windows
    fy = -D / 2
    for x in (-3.6, 3.6):
        a.window((x, fy, 2.15), 2.4, 1.8, '-Y')
    for x in (-3.8, 3.8):
        a.window((x, fy, 5.0), 1.3, 1.5, '-Y')
    a.window((0, fy, 8.5), 1.8, 2.2, '-Y')       # big gable window
    # door
    a.box((0, fy - 0.06, F + 1.25), (1.9, 0.16, 2.5), "trim-white")
    a.box((0, fy - 0.12, F + 1.15), (1.5, 0.12, 2.3), "timber-dark")
    a.box((0, fy - 0.2, F + 1.45), (1.1, 0.06, 0.9), "window-glow")
    # sides
    for y in (-2.4, 2.4):
        a.window((W / 2, y, 2.15), 1.6, 1.5, '+X')
        a.window((W / 2, y, 5.0), 1.3, 1.4, '+X')
    a.window((-W / 2, 3.4, 5.4), 1.0, 1.2, '-X', mullion=False)
    for x in (-3.6, 3.6):
        a.window((x, D / 2, 3.0), 1.4, 1.5, '+Y', mullion=False)
    # stone chimney on +X side, chunky
    cx = W / 2 + 0.75
    a.box((cx, 1.2, 1.5), (1.9, 2.0, 3.0), "stone-grey")
    a.box((cx, 1.2, 8.0), (1.5, 1.5, 10.2), "stone-grey")
    a.box((cx, 1.2, 13.2), (1.8, 1.8, 0.35), "stone-dark")
    a.box((cx, 1.2, 13.55), (1.6, 1.6, 0.3), "snow", bevel=0.1)
    for z in (4.5, 9.0, 12.0):
        a.box((cx, 1.2, z), (1.6, 1.6, 0.18), "stone-dark")
    # single-storey dining wing on -X, ridge along X
    wx0, wx1, wd, wh = -W / 2 + 0.2, -W / 2 - 4.6, 6.4, 3.6
    wcx = (wx0 + wx1) / 2
    wl = wx0 - wx1
    a.box((wcx, -0.6, F / 2), (wl, wd + 0.2, F), "stone-grey")
    a.box((wcx, -0.6, F + (wh - F) / 2), (wl, wd, wh - F), "barn-red")
    a.box((wx1, -0.6 - wd / 2, F + (wh - F) / 2), (0.3, 0.3, wh - F), "trim-white")
    a.box((wx1, -0.6 + wd / 2, F + (wh - F) / 2), (0.3, 0.3, wh - F), "trim-white")
    a.gable_end((wcx - 0.3, -0.6, wh), wl + 0.6, wd, 2.9, "barn-red")
    a.gable_roof((wcx - 0.3, -0.6, wh), wl + 0.6, wd, 2.9, "slate-roof", thick=0.25, overhang=0.5,
                 snow_thick=0.4, snow_over=0.12, snow_bevel=0.13)
    for x in (wcx - 1.2, wcx + 1.2):
        a.window((x, -0.6 - wd / 2, 2.05), 1.6, 1.6, '-Y')
    a.window((wx1, -0.6, 2.05), 1.8, 1.6, '-X')
    # front deck
    dy0, dy1 = fy - 0.1, fy - 3.4
    dz = F
    a.box((0, (dy0 + dy1) / 2, dz - 0.1), (10.4, dy0 - dy1, 0.2), "timber-brown")
    a.box((0, (dy0 + dy1) / 2, dz / 2 - 0.15), (10.0, dy0 - dy1 - 0.3, dz - 0.3), "timber-dark")
    # steps
    for i in range(2):
        a.box((0, dy1 - 0.35 - i * 0.35, dz - 0.25 - i * 0.22), (2.4, 0.4, 0.2), "timber-brown")
    # railing
    rx = 5.1
    posts = [(-rx, dy1), (-rx, dy0), (rx, dy1), (rx, dy0), (-1.3, dy1), (1.3, dy1), (-3.2, dy1), (3.2, dy1),
             (-rx, (dy0 + dy1) / 2), (rx, (dy0 + dy1) / 2)]
    for (x, y) in posts:
        a.box((x, y, dz + 0.55), (0.18, 0.18, 1.1), "timber-brown")
    rails = [((-rx + -1.3) / 2, dy1, abs(-1.3 + rx)), ((rx + 1.3) / 2, dy1, abs(rx - 1.3))]
    for (x, y, L) in rails:
        a.box((x, y, dz + 1.05), (L + 0.2, 0.14, 0.12), "timber-brown")
        a.box((x, y, dz + 0.55), (L, 0.08, 0.08), "timber-brown")
        a.box((x, y, dz + 1.15), (L + 0.2, 0.2, 0.09), "snow")
    for sx in (-1, 1):
        L = dy0 - dy1
        a.box((sx * rx, (dy0 + dy1) / 2, dz + 1.05), (0.14, L, 0.12), "timber-brown")
        a.box((sx * rx, (dy0 + dy1) / 2, dz + 0.55), (0.08, L, 0.08), "timber-brown")
        a.box((sx * rx, (dy0 + dy1) / 2, dz + 1.15), (0.2, L, 0.09), "snow")
    # entry porch: small gable on two posts over the door
    for x in (-1.6, 1.6):
        a.box((x, fy - 2.0, F + 1.35), (0.24, 0.24, 2.7), "trim-white")
    a.box((0, fy - 1.0, F + 2.75), (3.6, 2.2, 0.22), "trim-white")
    a.gable_end((0, fy - 1.0, F + 2.85), 2.2, 3.6, 1.5, "barn-red", rz=90)
    a.gable_roof((0, fy - 1.0, F + 2.85), 2.4, 3.6, 1.5, "slate-roof", rz=90, thick=0.18,
                 overhang=0.3, snow_thick=0.32, snow_over=0.1, snow_bevel=0.1)
    # lanterns either side of door
    for x in (-1.25, 1.25):
        a.box((x, fy - 0.15, F + 2.3), (0.26, 0.26, 0.38), "lamp-glow")
    # snow drifts at base corners
    a.box((-W / 2 - 0.2, D / 2 + 0.2, 0.25), (2.2, 1.4, 0.5), "snow", bevel=0.18)
    a.box((W / 2 + 1.0, -D / 2 + 0.5, 0.25), (1.6, 2.2, 0.5), "snow", bevel=0.18)
    if extra:
        extra(a, W, D, H, F)
    return a.finish()

def b_house():
    a = Asset("clapboard-house")
    W, D, H, F = 8.4, 6.4, 5.6, 0.5
    a.box((0, 0, F / 2), (W + 0.2, D + 0.2, F), "stone-dark")
    a.box((0, 0, F + (H - F) / 2), (W, D, H - F), "clapboard-white")
    # clapboard lap rings
    for i in range(9):
        z = F + 0.35 + i * 0.55
        if 2.9 < z < 3.2: continue
        a.box((0, 0, z), (W + 0.07, D + 0.07, 0.08), "clapboard-white")
    for sx in (-1, 1):
        for sy in (-1, 1):
            a.box((sx * W / 2, sy * D / 2, F + (H - F) / 2), (0.26, 0.26, H - F), "trim-white")
    rise = 4.6
    a.gable_end((0, 0, H), W, D, rise, "clapboard-white")
    a.gable_roof((0, 0, H), W, D, rise, "slate-roof", thick=0.25, overhang=0.5,
                 snow_thick=0.4, snow_over=0.12, snow_bevel=0.13)
    fy = -D / 2
    for x in (-2.8, 0, 2.8):
        a.window((x, fy, 3.95), 1.0, 1.3, '-Y', shutters="shutter-black", sill=False)
    for x in (-2.8, 2.8):
        a.window((x, fy, 2.05), 1.0, 1.5, '-Y', shutters="shutter-black", sill=False)
    for sx, face in ((-1, '-X'),):
        a.window((sx * W / 2, 0, 2.05), 1.0, 1.4, face, shutters="shutter-black", sill=False, mullion=False)
    a.window((-W / 2, 0, 3.95), 0.9, 1.2, '-X', shutters="shutter-black", sill=False, mullion=False)
    for sx, face in ((-1, '-X'), (1, '+X')):
        a.window((sx * W / 2, 0, H + 1.4), 0.7, 0.9, face, sill=False, mullion=False)
    for x in (-2.0, 2.0):
        a.window((x, D / 2, 2.05), 1.0, 1.4, '+Y', sill=False, mullion=False)
    # door + portico
    a.box((0, fy - 0.05, F + 1.15), (1.5, 0.14, 2.3), "trim-white")
    a.box((0, fy - 0.1, F + 1.05), (1.1, 0.12, 2.1), "shutter-green")
    a.box((0, fy - 0.15, F + 2.0), (0.9, 0.05, 0.25), "window-glow")
    a.box((0, fy - 0.7, 0.3), (2.0, 1.4, 0.2), "stone-grey")
    for x in (-0.85, 0.85):
        a.box((x, fy - 1.2, F + 1.3), (0.16, 0.16, 2.6), "trim-white")
    a.gable_end((0, fy - 0.7, F + 2.6), 1.4, 2.1, 0.9, "trim-white", rz=90)
    a.gable_roof((0, fy - 0.7, F + 2.6), 1.4, 2.1, 0.9, "slate-roof", rz=90, thick=0.12,
                 overhang=0.2, snow_thick=0.2, snow_over=0.06, snow_bevel=0.07)
    # one-storey ell on +X
    ex = W / 2 + 1.6
    a.box((ex, 0.8, 0.25), (3.4, 4.2, 0.5), "stone-dark")
    a.box((ex, 0.8, 0.5 + 1.45), (3.2, 4.0, 2.9), "clapboard-white")
    a.gable_end((ex + 0.1, 0.8, 3.4), 3.4, 4.0, 2.2, "clapboard-white")
    a.gable_roof((ex + 0.1, 0.8, 3.4), 3.4, 4.0, 2.2, "slate-roof", thick=0.2, overhang=0.35,
                 snow_thick=0.34, snow_over=0.1, snow_bevel=0.11)
    a.window((ex, 0.8 - 2.0, 1.9), 0.9, 1.1, '-Y', shutters="shutter-black", sill=False, mullion=False)
    a.window((ex + 1.6, 0.8, 1.9), 0.9, 1.1, '+X', sill=False, mullion=False)
    # chunky brick chimney through ridge
    a.box((1.9, 0.0, H + 4.0), (1.5, 1.2, 5.0), "brick")
    a.box((1.9, 0.0, H + 6.55), (1.75, 1.45, 0.3), "stone-dark")
    a.box((1.9, 0.0, H + 6.85), (1.6, 1.3, 0.3), "snow", bevel=0.1)
    a.box((1.9, 0.0, H + 7.1), (0.7, 0.6, 0.35), "brick")
    a.box((-W / 2 + 0.3, fy - 0.5, 0.225), (1.8, 1.2, 0.45), "snow", bevel=0.16)
    return a.finish()

def b_cafe():
    a = Asset("cafe")
    W, D, H, F = 7.0, 6.0, 3.8, 0.35
    a.box((0, 0, F / 2), (W + 0.2, D + 0.2, F), "stone-dark")
    a.box((0, 0, F + (H - F) / 2), (W, D, H - F), "sage-green")
    for i in range(5):
        a.box((0, 0, F + 0.4 + i * 0.6), (W + 0.06, D + 0.06, 0.07), "sage-green")
    for sx in (-1, 1):
        for sy in (-1, 1):
            a.box((sx * W / 2, sy * D / 2, F + (H - F) / 2), (0.24, 0.24, H - F), "trim-white")
    rise = 4.0
    a.gable_end((0, 0, H), D, W, rise, "sage-green", rz=90)
    a.gable_roof((0, 0, H), D, W, rise, "slate-roof", rz=90, thick=0.22, overhang=0.45,
                 snow_thick=0.38, snow_over=0.12, snow_bevel=0.12)
    fy = -D / 2
    # big glowing shop window + door
    a.window((-1.3, fy, 1.85), 3.0, 1.9, '-Y', sill=True)
    a.box((2.0, fy - 0.05, F + 1.15), (1.4, 0.14, 2.3), "trim-white")
    a.box((2.0, fy - 0.1, F + 1.05), (1.05, 0.12, 2.1), "window-glow")
    a.box((2.0, fy - 0.16, F + 1.05), (0.1, 0.06, 2.1), "trim-white")
    a.window((0, fy, H + 1.3), 1.1, 1.1, '-Y', mullion=True, sill=False)
    # striped awning sloping down and out from wall
    n = 7
    aw = 5.4
    ang = 20
    for i in range(n):
        x = -aw / 2 + aw / n * (i + 0.5) - 0.3
        m = "awning-red" if i % 2 == 0 else "trim-white"
        a.box((x, fy - 0.78, 3.06), (aw / n + 0.005, 1.6, 0.08), m, rot=(ang, 0, 0))
        a.box((x, fy - 1.53, 2.62), (aw / n + 0.005, 0.06, 0.36), m)
    a.box((-0.3, fy - 0.35, 3.3), (aw, 0.6, 0.1), "snow", rot=(ang, 0, 0), bevel=0.04)
    # side windows
    for sx, face in ((-1, '-X'), (1, '+X')):
        a.window((sx * W / 2, -0.6, 2.0), 1.2, 1.2, face)
    # stove pipe
    a.cyl((-1.8, 1.2, H + 1.5), 0.22, 0.22, 3.2, 6, "steel-dark")
    a.cyl((-1.8, 1.2, H + 4.7), 0.36, 0.36, 0.2, 6, "snow")
    # outdoor patio in front of the door (+x, guest side)
    px, py, pw, pd = 1.4, fy - 1.25, 2.7, 2.1
    a.box((px, py, 0.07), (pw, pd, 0.14), "stone-dark", bevel=0.05)
    for sx in (-1, 1):
        a.box((px + sx * (pw / 2 + 0.04), py, 0.46), (0.1, pd + 0.12, 0.92), "timber-brown")
    a.box((px, py - pd / 2 - 0.05, 0.46), (pw + 0.16, 0.1, 0.92), "timber-brown")
    for tx, ty in ((px - 0.55, py + 0.35), (px + 0.55, py + 0.35)):
        a.cyl((tx, ty, 0), 0.06, 0.06, 0.88, 5, "shutter-black")
        a.cyl((tx, ty, 0.88), 0.38, 0.38, 0.06, 8, "shutter-black")
    a.box((W / 2 + 0.05, fy + 0.3, 3.0), (0.1, 0.6, 0.6), "shutter-black")
    a.box((W / 2 + 0.25, fy + 0.3, 2.6), (0.3, 0.3, 0.4), "lamp-glow")
    return a.finish()

def b_shop():
    a = Asset("ski-shop")
    W, D, H, F = 6.4, 5.2, 3.6, 0.35
    a.box((0, 0, F / 2), (W + 0.2, D + 0.2, F), "stone-dark")
    a.box((0, 0, F + (H - F) / 2), (W, D, H - F), "timber-brown")
    for x in (-2.4, -1.2, 0, 1.2, 2.4):
        a.box((x, -D / 2, F + (H - F) / 2), (0.12, 0.1, H - F), "timber-dark")
    for sx in (-1, 1):
        for sy in (-1, 1):
            a.box((sx * W / 2, sy * D / 2, F + (H - F) / 2), (0.26, 0.26, H - F), "cream-sign")
    rise = 3.8
    a.gable_end((0, 0, H), D, W, rise, "timber-brown", rz=90)
    a.gable_roof((0, 0, H), D, W, rise, "barn-red", rz=90, thick=0.22, overhang=0.45,
                 snow_thick=0.36, snow_over=0.12, snow_bevel=0.12)
    fy = -D / 2
    a.window((-1.2, fy, 1.75), 2.4, 1.6, '-Y', frame="cream-sign")
    a.box((1.9, fy - 0.05, F + 1.15), (1.3, 0.14, 2.3), "cream-sign")
    a.box((1.9, fy - 0.1, F + 1.05), (1.0, 0.12, 2.1), "shutter-green")
    a.box((1.9, fy - 0.15, F + 1.45), (0.6, 0.05, 0.8), "window-glow")
    # blank sign board on gable
    a.box((0, fy - 0.12, H + 0.95), (3.6, 0.12, 1.1), "shutter-green")
    a.box((0, fy - 0.2, H + 0.95), (3.3, 0.06, 0.85), "cream-sign")
    a.box((0, fy - 0.2, H + 1.6), (3.6, 0.3, 0.12), "snow")
    # skis leaning on wall
    for i, (x, m) in enumerate(((-3.0, "amber-accent"), (-2.75, "navy"), (3.1, "amber-accent"))):
        a.box((x, fy - 0.35, 0.95), (0.12, 0.05, 1.8), m, rot=(-10, 0, 0))
    a.box((0, D / 2, 2.0), (1.0, 0.1, 1.0), "timber-dark")
    for sx, face in ((-1, '-X'), (1, '+X')):
        a.window((sx * W / 2, 0, 2.0), 1.0, 1.1, face, frame="cream-sign", mullion=False, sill=False)
    a.box((W / 2 + 0.4, -1.0, 0.2), (1.4, 1.6, 0.4), "snow", bevel=0.14)
    return a.finish()

def b_hut():
    a = Asset("warming-hut")
    W, D, H = 4.0, 3.2, 2.5
    a.box((0, 0, 0.1), (W + 0.2, D + 0.2, 0.2), "stone-dark")
    a.box((0, 0, 0.2 + (H - 0.2) / 2), (W, D, H - 0.2), "timber-brown")
    for i in range(5):
        a.box((0, 0, 0.45 + i * 0.45), (W + 0.18, D + 0.18, 0.2), "timber-dark")
    rise = 2.6
    a.gable_end((0, 0, H), D, W, rise, "timber-brown", rz=90)
    a.gable_roof((0, 0, H), D, W, rise, "timber-dark", rz=90, thick=0.2, overhang=0.4,
                 snow_thick=0.45, snow_over=0.14, snow_bevel=0.15)
    fy = -D / 2
    a.box((-0.7, fy - 0.08, 1.15), (1.0, 0.14, 1.9), "timber-dark")
    a.box((-0.7, fy - 0.14, 1.65), (0.5, 0.05, 0.5), "window-glow")
    a.window((0.95, fy - 0.1, 1.5), 0.8, 0.7, '-Y', frame="timber-dark", sill=False, depth=0.3)
    a.cyl((1.2, 0.6, H + 0.6), 0.16, 0.16, 2.3, 6, "steel-dark")
    a.cyl((1.2, 0.6, H + 2.9), 0.28, 0.28, 0.16, 6, "snow")
    a.box((-W / 2 - 0.3, 0.5, 0.225), (0.9, 1.6, 0.45), "snow", bevel=0.14)
    # firewood stack
    a.box((W / 2 + 0.35, 0.2, 0.45), (0.5, 1.6, 0.9), "timber-dark")
    a.box((W / 2 + 0.35, 0.2, 0.95), (0.55, 1.65, 0.12), "snow")
    return a.finish()
