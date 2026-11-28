def _pine(name, H, tiers, R, green, slim=1.0, seg=7):
    """Lush New England toy-box conifer: overlapping chunky tiers + soft snow-capped crown."""
    a = Asset(name)
    trunk_h = H * 0.16
    a.cyl((0, 0, 0), 0.28 * R / 2.2, 0.18 * R / 2.2, trunk_h + 0.6, 6, "timber-dark", caps=False)
    z = trunk_h
    span = (H - trunk_h) / (tiers * 0.64 + 0.36)
    for i in range(tiers):
        r = R * (1 - i / (tiers + 0.65)) * slim
        h = span * (1.16 - 0.04 * i)
        rot = (0, 0, i * 26)
        a.cyl((0, 0, z), r, 0.0, h, seg, green, rot=rot)
        z += span * 0.64
    # Single clean snow cap draping the crown tip (no harsh geometric mid-tier stripes).
    crown_r = R * (1 - (tiers - 1) / (tiers + 0.65)) * slim * 0.88
    crown_h = span * 0.68
    crown_z = H - crown_h + 0.04
    a.cyl((0, 0, crown_z), crown_r, 0.0, crown_h, seg, "snow", rot=(0, 0, (tiers - 1) * 26))
    return a.finish()

def b_pines():
    # Chunky, overlapping toy-box crowns for dense timber framing ski corridors.
    return [_pine("pine-a", 7.4, 3, 3.05, "pine"),
            _pine("pine-b", 10.6, 4, 2.85, "pine-dark", slim=0.92, seg=7),
            _pine("pine-c", 8.6, 3, 3.65, "pine", seg=7),
            _pine("pine-d", 6.2, 3, 3.45, "pine-dark", slim=1.06, seg=7)]

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


def b_pickup_truck():
    a = Asset("pickup-truck")
    a.box((0, 0.1, 0.65), (1.9, 4.4, 0.72), "barn-red", bevel=0.06)
    a.box((0, -0.5, 1.32), (1.76, 1.55, 0.7), "barn-red", bevel=0.04)
    a.box((0, -1.28, 1.32), (1.56, 0.06, 0.52), "glass-dark")
    a.box((0, -0.5, 1.71), (1.7, 1.45, 0.1), "snow")
    a.box((0, 1.15, 0.85), (1.62, 1.6, 0.36), "timber-dark")
    for sx in (-0.35, 0.35):
        a.box((sx, -0.1, 1.82), (0.14, 1.9, 0.06), "ski")
    for sx in (-0.85, 0.85):
        for sy in (-1.25, 1.25):
            a.cyl((sx, sy, 0.32), 0.32, 0.32, 0.24, 8, "rubber-black", rot=(0, 90, 0))
    return a.finish()


def b_station_wagon():
    a = Asset("station-wagon")
    a.box((0, 0, 0.62), (1.85, 4.4, 0.68), "shop-blue", bevel=0.06)
    for sx in (-0.94, 0.94):
        a.box((sx, 0.15, 0.65), (0.04, 3.1, 0.36), "timber-brown")
    a.box((0, 0.25, 1.28), (1.68, 2.75, 0.66), "shop-blue", bevel=0.04)
    a.box((0, -1.14, 1.28), (1.52, 0.06, 0.5), "glass-dark")
    a.box((0, 0.25, 1.65), (1.62, 2.65, 0.1), "snow")
    for sx in (-0.3, 0.3):
        a.box((sx, 0.2, 1.76), (0.14, 2.1, 0.06), "amber-accent")
    for sx in (-0.82, 0.82):
        for sy in (-1.25, 1.25):
            a.cyl((sx, sy, 0.3), 0.3, 0.3, 0.22, 8, "rubber-black", rot=(0, 90, 0))
    return a.finish()


def b_school_bus():
    a = Asset("school-bus")
    a.box((0, 0.2, 1.2), (2.3, 7.6, 1.6), "umbrella-yellow", bevel=0.08)
    a.box((0, -3.7, 0.85), (2.1, 1.35, 0.9), "umbrella-yellow", bevel=0.06)
    a.box((0, -3.02, 1.48), (1.96, 0.06, 0.65), "glass-dark")
    for sy in (-2.0, -0.8, 0.4, 1.6, 2.8):
        for sx in (-1.16, 1.16):
            a.box((sx, sy, 1.48), (0.05, 0.8, 0.55), "glass-dark")
    a.box((0, 0.2, 2.04), (2.15, 7.4, 0.12), "snow")
    for sx in (-1.05, 1.05):
        for sy in (-2.5, 2.4):
            a.cyl((sx, sy, 0.42), 0.42, 0.42, 0.32, 8, "rubber-black", rot=(0, 90, 0))
    return a.finish()


def b_welcome_arch():
    a = Asset("welcome-arch")
    for sx in (-2.4, 2.4):
        a.cyl((sx, 0, 0), 0.24, 0.2, 4.4, 6, "timber-dark")
        a.box((sx, 0, 0.25), (0.7, 0.7, 0.5), "stone-grey")
    a.box((0, 0, 4.35), (5.6, 0.45, 0.55), "timber-brown")
    a.box((0, 0, 4.72), (5.8, 0.6, 0.22), "snow")
    a.box((0, -0.25, 3.7), (3.8, 0.12, 0.95), "cream-sign")
    return a.finish()


def b_floodlight_tower():
    a = Asset("floodlight-tower")
    a.cyl((0, 0, 0), 0.2, 0.14, 9.2, 6, "timber-dark")
    a.box((0, 0, 9.1), (2.4, 0.28, 0.28), "steel")
    for sx in (-0.8, 0.8):
        a.box((sx, -0.22, 9.1), (0.65, 0.35, 0.45), "shutter-black")
        a.box((sx, -0.41, 9.1), (0.55, 0.08, 0.36), "lamp-glow")
    return a.finish()


def b_apple_tree():
    a = Asset("apple-tree")
    a.cyl((0, 0, 0), 0.28, 0.18, 2.0, 6, "timber-dark")
    a.sphere((0, 0, 2.8), 1.35, "timber-brown", seg=7, rings=5, scale=(1.15, 1.15, 0.85))
    a.sphere((0, 0, 3.2), 1.15, "snow", seg=7, rings=4, scale=(1.05, 1.05, 0.55))
    return a.finish()
