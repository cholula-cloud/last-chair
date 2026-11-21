def _pine(name, H, tiers, R, green, slim=1.0, seg=6):
    a = Asset(name)
    trunk_h = H * 0.16
    a.cyl((0, 0, 0), 0.22 * R / 2.2, 0.16 * R / 2.2, trunk_h + 0.6, 5, "timber-dark", caps=False)
    z = trunk_h
    span = (H - trunk_h) / (tiers * 0.72 + 0.28)
    for i in range(tiers):
        r = R * (1 - i / (tiers + 0.6)) * slim
        h = span * (1.05 - 0.06 * i)
        rot = (0, 0, i * 30)
        a.cyl((0, 0, z), r, 0.0, h, seg, green, rot=rot)
        sz = z + h * 0.42
        a.cyl((0, 0, sz), r * 0.62, 0.0, h * 0.58 + 0.02, seg, "snow", rot=(0, 0, i * 30 + 30))
        # snow skirt on tier rim
        a.cyl((0, 0, z - 0.02), r * 1.04, r * 0.86, h * 0.14, seg, "snow", rot=rot, caps=False)
        z += span * 0.72
    return a.finish()

def b_pines():
    return [_pine("pine-a", 7.0, 3, 2.3, "pine"),
            _pine("pine-b", 10.5, 4, 2.4, "pine-dark", slim=0.85, seg=5),
            _pine("pine-c", 8.5, 3, 2.9, "pine", seg=5),
            _pine("pine-d", 6.2, 2, 3.1, "pine", slim=1.05, seg=5)]

def b_lamp():
    a = Asset("lamp-post")
    a.cyl((0, 0, 0), 0.2, 0.16, 0.35, 6, "shutter-black")
    a.cyl((0, 0, 0.35), 0.07, 0.06, 3.1, 5, "shutter-black", caps=False)
    a.box((0, 0, 3.47), (0.34, 0.34, 0.1), "shutter-black")
    a.box((0, 0, 3.75), (0.3, 0.3, 0.46), "lamp-glow")
    a.cyl((0, 0, 3.98), 0.3, 0.02, 0.28, 4, "shutter-black", rot=(0, 0, 45))
    a.cyl((0, 0, 4.12), 0.22, 0.0, 0.14, 4, "snow", rot=(0, 0, 45))
    return a.finish()

def b_snowgun():
    a = Asset("snow-gun")
    a.box((0, 0, 0.15), (1.2, 1.2, 0.3), "stone-grey")
    a.box((0.45, 0.45, 0.6), (0.35, 0.35, 0.6), "amber-accent")        # hydrant box
    a.cyl((0, 0, 0.3), 0.12, 0.1, 4.6, 6, "steel", caps=False)
    a.box((0, 0, 4.9), (0.3, 0.3, 0.3), "steel-dark")
    # fan head pointing -Y and up, axis via rot about X
    a.box((0, 0, 5.15), (0.1, 0.6, 0.5), "steel-dark")
    a.cyl((0, 0.65, 5.1), 0.62, 0.62, 1.5, 10, "navy", rot=(70, 0, 0))
    a.cyl((0, -0.76, 5.61), 0.66, 0.66, 0.16, 10, "amber-accent", rot=(70, 0, 0))
    a.cyl((0, 0.6, 5.08), 0.45, 0.45, 0.12, 8, "steel-dark", rot=(70, 0, 0))
    a.box((0, 0.1, 5.85), (0.9, 1.0, 0.1), "snow", rot=(-20, 0, 0))
    return a.finish()

def b_snowcat():
    a = Asset("snowcat")
    # tracks along Y, front = -Y
    for sx in (-1, 1):
        x = sx * 1.55
        a.box((x, 0.2, 0.55), (1.0, 4.2, 0.9), "rubber-black")
        a.box((x, -2.15, 0.62), (1.0, 0.8, 0.7), "rubber-black", rot=(35, 0, 0))
        a.box((x, 2.55, 0.62), (1.0, 0.7, 0.7), "rubber-black", rot=(-35, 0, 0))
        for y in (-1.1, 0.2, 1.5):
            a.cyl((x + sx * 0.5, y, 0.5), 0.3, 0.3, 0.06, 6, "steel-dark", rot=(0, 90 * sx, 0))
        a.box((x, 0.2, 1.06), (1.08, 5.0, 0.1), "amber-accent")           # fender
    a.box((0, 0.3, 1.25), (2.3, 4.8, 0.9), "amber-accent")                 # hull
    a.box((0, -1.4, 1.75), (2.2, 1.2, 0.3), "amber-accent", rot=(-15, 0, 0))
    # cab
    a.box((0, -0.3, 2.35), (2.3, 1.9, 1.3), "amber-accent")
    a.box((0, -1.27, 2.42), (2.1, 0.06, 0.9), "glass-dark")
    for sx in (-1, 1):
        a.box((sx * 1.17, -0.3, 2.42), (0.06, 1.6, 0.85), "glass-dark")
    a.box((0, -0.3, 3.05), (2.4, 2.0, 0.12), "trim-white")
    a.box((0, -0.3, 3.18), (2.2, 1.8, 0.16), "snow", bevel=0.06)
    a.box((0, -1.15, 3.2), (1.6, 0.14, 0.14), "shutter-black")             # light bar
    for x in (-0.55, 0, 0.55):
        a.box((x, -1.24, 3.2), (0.22, 0.06, 0.1), "lamp-glow")
    a.cyl((0.85, 1.4, 1.7), 0.08, 0.08, 1.4, 5, "steel-dark")               # exhaust
    # front blade
    a.box((0, -3.25, 0.7), (4.6, 0.22, 1.1), "steel", rot=(-12, 0, 0))
    for sx in (-1, 1):
        a.box((sx * 0.8, -2.6, 0.9), (0.18, 1.3, 0.18), "steel-dark", rot=(10, 0, 0))
    # rear tiller
    a.box((0, 3.1, 1.2), (0.3, 1.0, 0.2), "steel-dark")
    a.cyl((-2.1, 3.7, 0.45), 0.45, 0.45, 4.2, 8, "steel-dark", rot=(0, 90, 0))
    a.box((0, 4.3, 0.18), (4.2, 0.5, 0.06), "rubber-black", rot=(-12, 0, 0))
    a.box((0, 3.7, 0.92), (4.3, 0.9, 0.1), "amber-accent")
    return a.finish()
