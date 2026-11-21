"""Shared lodge tier massing: camera-facing (-Y / ±X), not rear (+Y).

Default game view is elevated southwest; Blender front = -Y (glTF +Z).
Tier 2/3 hero mass must land on the approach face and flanks.

Constants match buildings.py base-lodge footprint so annexes stack cleanly.
"""

# Base lodge shell (buildings.py b_lodge)
LODGE_W = 12.0
LODGE_D = 9.0
LODGE_H = 6.4
LODGE_F = 0.7

# Footprint tolerance for style variants (±5%)
FOOTPRINT_TOL = 0.05

# Front face y (approach)
def front_y(D=LODGE_D):
    return -D / 2


# ---------- timber / material-agnostic massing helpers ----------
# Callers pass palette material names so themes can recolor.


def tier2_front_bay(a, mats, W=LODGE_W, D=LODGE_D, F=LODGE_F):
    """Two-story gabled bay projecting toward -Y (front), lit windows, wider deck."""
    wall, trim, roof, timber, timber_d, stone, snow, ski, steel, glow = mats
    fy = front_y(D)
    # forward bay mass (projects past existing porch)
    by0, by1 = fy - 0.15, fy - 4.2
    bw, bh = 7.2, 7.4
    a.box((0, (by0 + by1) / 2, F / 2), (bw + 0.3, by0 - by1 + 0.2, F), stone)
    a.box((0, (by0 + by1) / 2, F + (bh - F) / 2), (bw, by0 - by1, bh - F), wall)
    for sx in (-1, 1):
        a.box((sx * bw / 2, by1, F + (bh - F) / 2), (0.28, 0.28, bh - F), trim)
        a.box((sx * bw / 2, by0, F + (bh - F) / 2), (0.28, 0.28, bh - F), trim)
    rise = 3.4
    a.gable_end((0, (by0 + by1) / 2, bh), by0 - by1 + 0.4, bw, rise, wall, rz=90)
    a.gable_roof((0, (by0 + by1) / 2, bh), by0 - by1 + 0.4, bw, rise, roof, rz=90,
                 thick=0.22, overhang=0.45, snow_thick=0.38, snow_over=0.12, snow_bevel=0.12)
    # great-room windows on -Y
    for x, z, w, h in ((-2.0, 2.4, 2.2, 2.0), (2.0, 2.4, 2.2, 2.0),
                       (-2.0, 5.2, 1.8, 1.6), (2.0, 5.2, 1.8, 1.6),
                       (0, bh + 1.2, 1.6, 1.4)):
        a.window((x, by1, z), w, h, '-Y')
    # wider approach deck + steps
    dy0, dy1 = by1 - 0.1, by1 - 3.6
    a.box((0, (dy0 + dy1) / 2, F - 0.1), (11.0, dy0 - dy1, 0.2), timber)
    a.box((0, (dy0 + dy1) / 2, F / 2 - 0.15), (10.4, dy0 - dy1 - 0.3, F - 0.3), timber_d)
    for i in range(3):
        a.box((0, dy1 - 0.35 - i * 0.35, F - 0.2 - i * 0.2), (2.8, 0.4, 0.18), timber)
    for sx in (-1, 1):
        a.box((sx * 5.4, (dy0 + dy1) / 2, F + 0.55), (0.16, dy0 - dy1, 0.12), timber)
        a.box((sx * 5.4, (dy0 + dy1) / 2, F + 1.05), (0.16, dy0 - dy1, 0.12), timber)
        a.box((sx * 5.4, (dy0 + dy1) / 2, F + 1.15), (0.22, dy0 - dy1, 0.09), snow)
    # ski-rack sculpture on +X flank (visible from SW)
    rx = W / 2 + 0.8
    a.box((rx, fy - 1.2, F + 0.7), (0.12, 2.4, 0.12), steel)
    for i, (ox, m) in enumerate(((-0.35, ski), (0.0, "navy"), (0.35, "amber-accent"))):
        a.box((rx + ox, fy - 1.4, F + 1.1), (0.1, 0.08, 1.7), m, rot=(-12, 0, 0))
    a.box((rx, fy - 1.2, F + 1.85), (1.0, 0.3, 0.14), snow, bevel=0.05)
    # modest +X side porch wing (not a rear block)
    a.box((W / 2 + 1.8, 0.5, F + 1.6), (3.2, 4.0, 3.2), wall)
    a.gable_end((W / 2 + 1.8, 0.5, F + 3.2), 4.2, 3.4, 2.0, wall, rz=90)
    a.gable_roof((W / 2 + 1.8, 0.5, F + 3.2), 4.2, 3.4, 2.0, roof, rz=90,
                 thick=0.18, overhang=0.35, snow_thick=0.3, snow_over=0.1, snow_bevel=0.1)
    a.window((W / 2 + 3.4, 0.5, F + 2.0), 1.4, 1.5, '+X')
    a.box((W / 2 + 0.05, fy - 0.8, F + 2.3), (0.2, 0.26, 0.38), glow)


def tier3_front_grand(a, mats, W=LODGE_W, D=LODGE_D, H=LODGE_H, F=LODGE_F):
    """Portico, gallery, banners, cupola, fire pits — all on -Y approach."""
    wall, trim, roof, timber, timber_d, stone, snow, ski, steel, glow = mats
    fy = front_y(D)
    # stone terrace across approach
    a.box((0, fy - 5.2, F - 0.05), (12.4, 5.8, 0.28), stone)
    a.box((0, fy - 4.6, F + 0.12), (11.6, 4.6, 0.14), trim)
    # grand porte-cochère
    for x in (-2.8, 2.8):
        a.box((x, fy - 2.4, F + 1.7), (0.34, 0.34, 3.8), trim)
    a.box((0, fy - 2.1, F + 3.9), (6.4, 3.8, 0.26), trim)
    a.gable_end((0, fy - 2.1, F + 4.0), 3.8, 6.4, 2.2, wall, rz=90)
    a.gable_roof((0, fy - 2.1, F + 4.0), 3.8, 6.4, 2.2, roof, rz=90,
                 thick=0.2, overhang=0.4, snow_thick=0.32, snow_over=0.1, snow_bevel=0.1)
    a.box((0, fy - 2.5, F + 3.0), (2.8, 0.12, 0.9), "cream-sign")
    a.box((0, fy - 2.58, F + 2.9), (2.2, 0.06, 0.5), "navy")
    for x in (-2.0, 2.0):
        a.box((x, fy - 1.6, F + 2.3), (0.28, 0.28, 0.42), glow)
    # banner poles on approach
    for x in (-6.2, 6.2):
        a.box((x, fy - 5.6, F + 0.2), (0.2, 0.2, 5.0), timber)
        a.box((x + 0.55 * (1 if x > 0 else -1), fy - 5.3, F + 4.0), (1.2, 0.08, 1.8), "navy")
        a.box((x + 0.55 * (1 if x > 0 else -1), fy - 5.3, F + 4.02), (1.1, 0.04, 1.7), trim)
    # second-floor gallery across front
    gz = 5.2
    a.box((0, fy - 0.55, gz - 0.12), (10.4, 1.8, 0.24), timber)
    for bx in (-4.6, -1.5, 1.5, 4.6):
        a.box((bx, fy - 0.55, gz - 0.45), (0.2, 0.2, 0.9), trim)
    for bx in (-3.8, 0.0, 3.8):
        a.box((bx, fy - 0.7, gz + 0.7), (2.0, 0.1, 0.1), timber)
        a.box((bx, fy - 0.7, gz + 0.78), (2.05, 0.14, 0.08), snow)
        a.box((bx, fy - 0.7, gz + 0.9), (0.14, 0.14, 0.14), glow)
    # fire pits on front terrace
    for fx in (-4.0, 4.0):
        a.box((fx, fy - 4.4, F + 0.08), (1.2, 1.2, 0.22), "stone-dark")
        a.box((fx, fy - 4.4, F + 0.32), (0.72, 0.72, 0.18), glow)
        a.box((fx, fy - 4.4, F + 0.52), (0.36, 0.36, 0.12), glow)
    # ridge cupola centered over front roofline
    cz = H + 6.6
    a.box((0, -1.2, cz + 0.65), (2.2, 2.2, 1.5), trim)
    for face, (x, y) in {'-Y': (0, -2.15), '+Y': (0, -0.25), '-X': (-1.0, -1.2), '+X': (1.0, -1.2)}.items():
        a.window((x, y, cz + 0.75), 0.9, 0.8, face, sill=False, mullion=False, frame=trim)
    a.box((0, -1.2, cz + 1.6), (0.95, 0.95, 0.7), glow)
    a.cyl((0, -1.2, cz + 1.4), 1.6, 0.0, 1.3, 4, roof, rot=(0, 0, 45))
    a.cyl((0, -1.2, cz + 2.0), 0.65, 0.0, 0.7, 4, snow, rot=(0, 0, 45))
    a.box((0, -1.2, cz + 2.4), (0.12, 0.12, 1.1), steel)
    a.sphere((0, -1.2, cz + 3.0), 0.22, snow)
    # flank dining tower on -X (visible from SW), not rear
    wcx, wcy = -W / 2 - 2.8, -1.8
    wl, wd, z0, z1 = 5.0, 6.0, 3.4, 7.4
    a.box((wcx, wcy, (z0 + z1) / 2), (wl, wd, z1 - z0), wall)
    for sy in (-1, 1):
        a.box((wcx - wl / 2, wcy + sy * wd / 2, (z0 + z1) / 2), (0.3, 0.3, z1 - z0), trim)
    a.gable_end((wcx, wcy, z1), wd + 0.4, wl, 2.8, wall, rz=90)
    a.gable_roof((wcx, wcy, z1), wd + 0.4, wl, 2.8, roof, rz=90,
                 thick=0.22, overhang=0.5, snow_thick=0.4, snow_over=0.12, snow_bevel=0.12)
    for x in (wcx - 1.2, wcx, wcx + 1.2):
        a.window((x, wcy - wd / 2, 5.4), 1.1, 1.5, '-Y')
    a.window((wcx - wl / 2, wcy, 5.6), 1.2, 1.5, '-X')


def timber_mats():
    return (
        "barn-red", "trim-white", "slate-roof", "timber-brown", "timber-dark",
        "stone-grey", "snow", "ski", "steel-dark", "lamp-glow",
    )
