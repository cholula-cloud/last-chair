GAUGE = 1.6   # rope lines at x = +/-GAUGE, running along Y

def b_tower():
    a = Asset("lift-tower")
    a.box((0, 0, 0.25), (1.0, 1.0, 0.5), "stone-grey")
    a.cyl((0, 0, 0.5), 0.3, 0.22, 7.0, 8, "steel", caps=False)
    a.box((0.0, 0.26, 3.8), (0.3, 0.06, 6.0), "steel-dark")          # ladder
    # crossarm
    a.box((0, 0, 7.55), (2 * GAUGE + 0.9, 0.36, 0.4), "steel")
    a.box((0, 0, 7.25), (0.5, 0.5, 0.3), "steel-dark")
    for sx in (-1, 1):
        x = sx * GAUGE
        a.box((x, 0, 7.25), (0.12, 0.12, 0.35), "steel-dark")
        a.box((x, 0, 7.05), (0.14, 1.7, 0.2), "amber-accent")     # sheave beam
        for y in (-0.5, 0.5):
            a.cyl((x - 0.08, y, 6.92), 0.2, 0.2, 0.16, 6, "rubber-black", rot=(0, 90, 0))
        a.box((x, 0, 7.82), (0.5, 0.5, 0.12), "snow")
    a.box((0, 0, 7.82), (2 * GAUGE - 0.4, 0.42, 0.1), "snow")
    return a.finish()

def b_tbar():
    a = Asset("t-bar")
    # z=0 at bottom of bar; grip at top (~2.6 m)
    a.box((0, 0, 2.55), (0.18, 0.34, 0.18), "steel-dark")            # rope grip
    a.cyl((0, 0, 1.9), 0.09, 0.09, 0.6, 6, "amber-accent")           # spring box
    a.box((0, 0, 1.05), (0.05, 0.05, 1.0), "steel")                  # rod
    a.box((0, 0, 0.5), (0.06, 0.06, 0.4), "steel")
    a.box((0, 0, 0.32), (1.15, 0.08, 0.08), "steel")                 # T bar
    for sx in (-1, 1):
        a.box((sx * 0.38, 0, 0.3), (0.32, 0.14, 0.12), "navy")
    return a.finish()

def b_chair():
    a = Asset("chair-double")
    # z=0 at footrest bottom; rope grip at top (~2.7 m); seat faces -Y
    a.box((0, 0.05, 2.62), (0.16, 0.36, 0.18), "steel-dark")
    a.box((0, 0.05, 1.56), (0.09, 0.09, 2.0), "steel")                # hanger
    a.box((0, -0.2, 0.56), (0.09, 0.6, 0.09), "steel")                # seat support
    a.box((0, -0.3, 0.64), (1.3, 0.56, 0.12), "amber-accent")        # seat
    a.box((0, -0.03, 1.0), (1.3, 0.09, 0.62), "amber-accent", rot=(-10, 0, 0))
    a.box((0, 0.06, 1.3), (1.36, 0.07, 0.07), "steel")
    for sx in (-1, 1):
        a.box((sx * 0.68, -0.05, 0.84), (0.06, 0.06, 0.92), "steel")
        a.box((sx * 0.68, -0.33, 1.0), (0.06, 0.6, 0.06), "steel")
    # overhead restraint bar (raised) with footrest
    a.box((0, -0.33, 1.78), (0.07, 0.8, 0.07), "steel")
    a.box((0, -0.72, 1.0), (0.07, 0.07, 1.6), "steel")
    a.box((0, -0.72, 0.2), (1.0, 0.26, 0.07), "steel-dark")
    return a.finish()

def _bullwheel(a, rope_z, hood_m):
    for sx in (-1, 1):
        a.box((sx * 0.5, 0, rope_z / 2), (0.35, 0.6, rope_z), "steel")
    a.box((0, 0, 0.2), (1.8, 1.2, 0.4), "stone-grey")
    a.box((0, 0, rope_z - 0.1), (1.3, 0.9, 0.3), "steel-dark")
    a.cyl((0, 0, rope_z - 0.12), GAUGE + 0.08, GAUGE + 0.08, 0.24, 14, "steel-dark")   # bullwheel
    a.cyl((0, 0, rope_z + 0.2), GAUGE + 0.45, GAUGE + 0.3, 0.55, 10, hood_m)            # hood
    a.cyl((0, 0, rope_z + 0.75), GAUGE + 0.3, GAUGE - 0.1, 0.32, 10, "snow")
    a.box((0, GAUGE + 0.4, rope_z + 0.3), (0.6, 0.6, 0.8), "steel")                    # motor/tension box

def b_terminal_bottom():
    a = Asset("lift-terminal-bottom")
    rz = 4.3
    _bullwheel(a, rz, "amber-accent")
    # loading platform (front, -Y)
    a.box((0, -2.2, 0.15), (5.0, 3.2, 0.3), "timber-brown")
    a.box((0, -3.8, 0.35), (5.0, 0.1, 0.1), "amber-accent")         # load line
    for sx in (-1, 1):                                                   # maze rails
        a.box((sx * 2.4, -4.6, 0.6), (0.08, 2.0, 0.08), "timber-brown")
        for y in (-3.7, -5.5):
            a.box((sx * 2.4, y, 0.4), (0.12, 0.12, 0.8), "timber-brown")
    # operator hut on +X
    hx, hy = 3.7, -1.2
    a.box((hx, hy, 0.15), (2.8, 2.6, 0.3), "stone-dark")
    a.box((hx, hy, 0.3 + 1.2), (2.6, 2.4, 2.4), "barn-red")
    a.gable_end((hx, hy, 2.7), 2.4, 2.6, 1.8, "barn-red", rz=90)
    a.gable_roof((hx, hy, 2.7), 2.4, 2.6, 1.8, "slate-roof", rz=90, thick=0.15, overhang=0.3,
                 snow_thick=0.3, snow_over=0.1, snow_bevel=0.1)
    a.window((hx - 1.3, hy, 1.7), 1.2, 0.9, '-X', mullion=False, sill=False)
    a.window((hx, hy - 1.2, 1.7), 1.1, 0.9, '-Y', mullion=False, sill=False)
    a.box((hx + 0.6, hy - 1.25, 1.3), (0.8, 0.1, 2.0), "timber-dark")
    return a.finish()

def b_terminal_top():
    a = Asset("lift-terminal-top")
    rz = 4.3
    _bullwheel(a, rz, "barn-red")
    # unload ramp (+Y side here = arrival; ramp slopes down toward -Y)
    a.poly([(-2.6, 2.6, 0), (2.6, 2.6, 0), (2.6, 2.6, 1.2), (-2.6, 2.6, 1.2),
            (-2.6, -3.6, 0), (2.6, -3.6, 0)],
           [(0, 1, 2, 3), (4, 0, 3), (1, 5, 2), (3, 2, 5, 4), (0, 4, 5, 1)], "snow")
    a.box((0, 2.75, 0.6), (5.2, 0.3, 1.2), "timber-brown")
    # small patrol shack on -X
    hx, hy = -3.8, 0.5
    a.box((hx, hy, 0.15), (2.4, 2.2, 0.3), "stone-dark")
    a.box((hx, hy, 0.3 + 1.1), (2.2, 2.0, 2.2), "timber-brown")
    a.gable_end((hx, hy, 2.5), 2.2, 2.0, 1.7, "timber-brown")
    a.gable_roof((hx, hy, 2.5), 2.2, 2.0, 1.7, "slate-roof", thick=0.15, overhang=0.3,
                 snow_thick=0.3, snow_over=0.1, snow_bevel=0.1)
    a.window((hx, hy - 1.0, 1.6), 1.0, 0.8, '-Y', mullion=False, sill=False)
    a.window((hx + 1.1, hy, 1.6), 0.9, 0.8, '+X', mullion=False, sill=False)
    a.box((hx - 0.6, hy - 1.05, 1.3), (0.7, 0.1, 2.0), "timber-dark")
    return a.finish()

def b_skier():
    a = Asset("skier")
    # skis along Y, tips toward -Y (front)
    for sx in (-1, 1):
        x = sx * 0.14
        a.box((x, 0.05, 0.03), (0.1, 1.6, 0.04), "ski")
        a.box((x, -0.82, 0.07), (0.1, 0.18, 0.04), "ski", rot=(-25, 0, 0))
        a.box((x, 0.0, 0.16), (0.15, 0.3, 0.22), "rubber-black")                 # boot
        a.box((x, -0.08, 0.43), (0.17, 0.18, 0.42), "pants", rot=(18, 0, 0))     # shin
        a.box((x, -0.06, 0.8), (0.19, 0.2, 0.42), "pants", rot=(-22, 0, 0))       # thigh
    a.box((0, 0.02, 0.98), (0.44, 0.28, 0.2), "pants")
    a.cyl((0, 0.0, 0.98), 0.25, 0.22, 0.58, 8, "jacket", rot=(10, 0, 0))       # torso
    a.box((0, -0.07, 1.57), (0.3, 0.24, 0.1), "jacket")                          # collar
    for sx in (-1, 1):
        a.box((sx * 0.31, -0.12, 1.3), (0.15, 0.15, 0.45), "jacket", rot=(-35, 0, sx * -8))
        a.box((sx * 0.31, -0.3, 1.1), (0.13, 0.13, 0.13), "navy")                # mitt
        a.cyl((sx * 0.31, -0.3, 1.1), 0.018, 0.018, 1.15, 4, "steel-dark", rot=(-152, -sx * 6, 0))
        a.cyl((sx * 0.37, 0.2, 0.12), 0.07, 0.07, 0.02, 6, "steel-dark")         # basket
    a.box((0, -0.04, 1.5), (0.62, 0.3, 0.16), "jacket")                         # shoulder yoke
    a.sphere((0, -0.08, 1.74), 0.17, "skin", seg=8, rings=6)
    a.sphere((0, -0.06, 1.8), 0.195, "helmet", seg=8, rings=6, scale=(1, 1.05, 0.82))
    a.box((0, -0.24, 1.76), (0.3, 0.07, 0.1), "goggles")
    return a.finish()
