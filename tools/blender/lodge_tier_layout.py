"""Shared lodge tier massing: camera-facing (-Y / ±X), not rear (+Y).

Default game view is elevated southwest; Blender front = -Y (glTF +Z).
Tier 2/3 hero mass must land on the approach face and flanks.

Tier extras *replace* the base porch/deck (buildings.b_lodge skips approach when
extra is set). Keep one coherent front — no stacked porches.

Silhouette intent
-----------------
Tier 2  wider/taller pavilion + wrap balcony + guest wing + dining uplift
Tier 3  grand porte-cochère, twin flank towers, ridge lantern, stone plaza
        (reads clearly bigger than Tier 2 — not just ornaments on the same shell)
"""

# Base lodge shell (buildings.py b_lodge)
LODGE_W = 12.0
LODGE_D = 9.0
LODGE_H = 6.4
LODGE_F = 0.7

# Footprint tolerance for style variants (±5%)
FOOTPRINT_TOL = 0.05


def front_y(D=LODGE_D):
    return -D / 2


def timber_mats():
    return (
        "barn-red", "trim-white", "slate-roof", "timber-brown", "timber-dark",
        "stone-grey", "snow", "ski", "steel-dark", "lamp-glow",
    )


def H_eave_proxy(H=LODGE_H):
    """Dormer base sits near the main eave / lower roof plane."""
    return H + 1.2


# ---------- shared detail helpers ----------


def _rail_y(a, x0, x1, y, z, timber, snow, posts=True, gap=None):
    """Horizontal rail along X at fixed y. gap=(lo,hi) leaves a stair opening."""
    if posts:
        for x in (x0, x1):
            a.box((x, y, z + 0.55), (0.16, 0.16, 1.1), timber)
    segs = [(x0, x1)]
    if gap:
        g0, g1 = gap
        segs = [(x0, g0), (g1, x1)]
    for xa, xb in segs:
        if xb - xa < 0.4:
            continue
        cx = (xa + xb) / 2
        L = xb - xa
        a.box((cx, y, z + 1.05), (L, 0.12, 0.12), timber)
        a.box((cx, y, z + 0.55), (L - 0.1, 0.07, 0.07), timber)
        a.box((cx, y, z + 1.14), (L + 0.06, 0.16, 0.08), snow)
        # balusters
        n = max(2, int(L / 0.55))
        for i in range(1, n):
            t = i / n
            a.box((xa + t * L, y, z + 0.75), (0.07, 0.07, 0.55), timber)


def _rail_x(a, x, y0, y1, z, timber, snow, posts=True):
    """Horizontal rail along Y at fixed x."""
    if posts:
        for y in (y0, y1):
            a.box((x, y, z + 0.55), (0.16, 0.16, 1.1), timber)
    cy = (y0 + y1) / 2
    L = abs(y1 - y0)
    a.box((x, cy, z + 1.05), (0.12, L, 0.12), timber)
    a.box((x, cy, z + 0.55), (0.07, L - 0.1, 0.07), timber)
    a.box((x, cy, z + 1.14), (0.16, L + 0.06, 0.08), snow)
    n = max(2, int(L / 0.55))
    for i in range(1, n):
        t = i / n
        a.box((x, y0 + t * (y1 - y0), z + 0.75), (0.07, 0.07, 0.55), timber)


def _balcony(a, x0, x1, y0, y1, z, timber, snow, open_front=False):
    """Cantilevered balcony slab + snow-capped rails. open_front skips -Y rail gap center."""
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    a.box((cx, cy, z - 0.1), (x1 - x0, y1 - y0, 0.22), timber)
    # brackets under the slab
    for x in (x0 + 0.6, cx, x1 - 0.6):
        a.box((x, y0 + 0.15, z - 0.45), (0.18, 0.35, 0.55), timber)
    gap = (-1.4, 1.4) if open_front else None
    _rail_y(a, x0, x1, y1, z, timber, snow, gap=gap)
    _rail_x(a, x0, y0, y1, z, timber, snow)
    _rail_x(a, x1, y0, y1, z, timber, snow)


def _dormer(a, x, y, z, wall, roof, trim, face='-Y'):
    """Small front dormer punching the main roof plane."""
    a.box((x, y, z + 0.7), (2.2, 2.0, 1.6), wall)
    a.gable_end((x, y, z + 1.5), 2.2, 2.4, 1.5, wall, rz=90)
    a.gable_roof((x, y, z + 1.5), 2.2, 2.4, 1.5, roof, rz=90,
                 thick=0.16, overhang=0.28, snow_thick=0.28, snow_over=0.08, snow_bevel=0.08)
    a.window((x, y - 1.05, z + 0.85), 1.3, 1.2, face, frame=trim)


# ---------- Tier 2 ----------


def tier2_front_bay(a, mats, W=LODGE_W, D=LODGE_D, F=LODGE_F):
    """Wide two-story pavilion, wrap balcony, guest wing, dining uplift — one clean front."""
    wall, trim, roof, timber, timber_d, stone, snow, ski, steel, glow = mats
    fy = front_y(D)

    # --- forward pavilion (replaces small porch) ---
    # projects ~5.8m toward -Y, nearly full lodge width
    by0, by1 = fy - 0.05, fy - 5.8
    bw, bh = 10.8, 9.8
    a.box((0, (by0 + by1) / 2, F / 2), (bw + 0.4, by0 - by1 + 0.3, F), stone)
    a.box((0, (by0 + by1) / 2, F + (bh - F) / 2), (bw, by0 - by1, bh - F), wall)
    for sx in (-1, 1):
        a.box((sx * bw / 2, by1, F + (bh - F) / 2), (0.32, 0.32, bh - F), trim)
        a.box((sx * bw / 2, by0, F + (bh - F) / 2), (0.32, 0.32, bh - F), trim)
    a.box((0, (by0 + by1) / 2, 4.6), (bw + 0.08, by0 - by1 + 0.08, 0.18), trim)
    rise = 5.2
    a.gable_end((0, (by0 + by1) / 2, bh), by0 - by1 + 0.5, bw, rise, wall, rz=90)
    a.gable_roof((0, (by0 + by1) / 2, bh), by0 - by1 + 0.5, bw, rise, roof, rz=90,
                 thick=0.26, overhang=0.55, snow_thick=0.42, snow_over=0.14, snow_bevel=0.12)
    # great-room glazing on -Y
    for x, z, w, h in (
        (-3.2, 2.6, 2.6, 2.4), (3.2, 2.6, 2.6, 2.4),
        (-3.2, 6.4, 2.2, 2.0), (3.2, 6.4, 2.2, 2.0),
        (0, bh + 1.8, 2.6, 2.4),
    ):
        a.window((x, by1, z), w, h, '-Y', frame=trim)
    # centered entry in pavilion
    a.box((0, by1 - 0.05, F + 1.35), (2.2, 0.16, 2.7), trim)
    a.box((0, by1 - 0.12, F + 1.25), (1.7, 0.12, 2.5), timber_d)
    a.box((0, by1 - 0.18, F + 1.55), (1.2, 0.06, 1.0), glow)
    for x in (-1.4, 1.4):
        a.box((x, by1 - 0.12, F + 2.5), (0.28, 0.28, 0.4), glow)

    # --- second-floor wrap balcony across pavilion ---
    _balcony(a, -4.9, 4.9, by1 - 0.15, by1 - 1.95, 5.2, timber, snow, open_front=False)

    # --- approach deck (single coherent platform) ---
    dy0, dy1 = by1 - 0.05, by1 - 4.4
    a.box((0, (dy0 + dy1) / 2, F - 0.08), (13.2, dy0 - dy1, 0.22), timber)
    a.box((0, (dy0 + dy1) / 2, F / 2 - 0.12), (12.6, dy0 - dy1 - 0.35, F - 0.28), timber_d)
    for i in range(4):
        a.box((0, dy1 - 0.4 - i * 0.38, F - 0.18 - i * 0.18), (3.4, 0.42, 0.18), timber)
    _rail_y(a, -6.4, 6.4, dy1, F, timber, snow, gap=(-1.7, 1.7))
    _rail_x(a, -6.4, dy0, dy1, F, timber, snow)
    _rail_x(a, 6.4, dy0, dy1, F, timber, snow)

    # --- twin dormers on main lodge roof (silhouette from SW) ---
    for x in (-3.4, 3.4):
        _dormer(a, x, -1.6, H_eave_proxy(H=LODGE_H), wall, roof, trim)

    # --- +X guest suite wing (wide, two-story, own balcony) ---
    gx = W / 2 + 3.6
    gy, gw, gd, gh = -0.4, 6.4, 7.2, 6.6
    a.box((gx, gy, F / 2), (gw + 0.25, gd + 0.25, F), stone)
    a.box((gx, gy, F + (gh - F) / 2), (gw, gd, gh - F), wall)
    for sy in (-1, 1):
        a.box((gx + gw / 2, gy + sy * gd / 2, F + (gh - F) / 2), (0.28, 0.28, gh - F), trim)
        a.box((gx - gw / 2, gy + sy * gd / 2, F + (gh - F) / 2), (0.28, 0.28, gh - F), trim)
    a.gable_end((gx, gy, gh), gd + 0.4, gw, 2.8, wall, rz=90)
    a.gable_roof((gx, gy, gh), gd + 0.4, gw, 2.8, roof, rz=90,
                 thick=0.22, overhang=0.45, snow_thick=0.36, snow_over=0.12, snow_bevel=0.1)
    a.window((gx + gw / 2, gy - 1.4, 2.4), 1.8, 1.7, '+X', frame=trim)
    a.window((gx + gw / 2, gy + 1.4, 2.4), 1.8, 1.7, '+X', frame=trim)
    a.window((gx + gw / 2, gy, 5.0), 2.0, 1.6, '+X', frame=trim)
    a.window((gx, gy - gd / 2, 2.6), 2.0, 1.8, '-Y', frame=trim)
    a.window((gx, gy - gd / 2, 5.2), 1.6, 1.5, '-Y', frame=trim)
    _balcony(a, gx - 2.2, gx + 2.2, gy - gd / 2 - 0.1, gy - gd / 2 - 1.7, 4.6, timber, snow)

    # --- -X dining uplift (second story over base wing) ---
    wcx, wcy = -W / 2 - 2.4, -0.6
    wl, wd, z0, z1 = 5.2, 6.6, 3.5, 7.2
    a.box((wcx, wcy, (z0 + z1) / 2), (wl, wd, z1 - z0), wall)
    for sy in (-1, 1):
        a.box((wcx - wl / 2, wcy + sy * wd / 2, (z0 + z1) / 2), (0.28, 0.28, z1 - z0), trim)
    a.gable_end((wcx, wcy, z1), wd + 0.35, wl, 2.6, wall, rz=90)
    a.gable_roof((wcx, wcy, z1), wd + 0.35, wl, 2.6, roof, rz=90,
                 thick=0.2, overhang=0.4, snow_thick=0.34, snow_over=0.1, snow_bevel=0.1)
    for x in (wcx - 1.3, wcx + 1.3):
        a.window((x, wcy - wd / 2, 5.2), 1.5, 1.5, '-Y', frame=trim)
    a.window((wcx - wl / 2, wcy, 5.4), 1.6, 1.5, '-X', frame=trim)
    _balcony(a, wcx - 1.8, wcx + 1.8, wcy - wd / 2 - 0.1, wcy - wd / 2 - 1.5, 4.8, timber, snow)


# ---------- Tier 3 ----------


def tier3_front_grand(a, mats, W=LODGE_W, D=LODGE_D, H=LODGE_H, F=LODGE_F):
    """Grand jump past Tier 2: porte-cochère, flank towers, ridge lantern, stone plaza."""
    wall, trim, roof, timber, timber_d, stone, snow, ski, steel, glow = mats
    fy = front_y(D)
    # Pavilion face from tier2 sits near fy - 5.8
    pav_front = fy - 5.8

    # --- stone approach plaza (extends past timber deck, no second timber deck) ---
    a.box((0, pav_front - 3.6, F - 0.18), (16.5, 7.4, 0.32), stone)
    a.box((0, pav_front - 3.2, F + 0.02), (15.6, 6.4, 0.12), "stone-dark")
    # wide ceremonial stairs
    for i in range(5):
        a.box((0, pav_front - 7.0 - i * 0.42, F - 0.35 - i * 0.16), (5.2, 0.45, 0.18), stone)

    # --- porte-cochère forward of pavilion (tall, open) ---
    pc_y = pav_front - 2.6
    for x in (-3.6, 3.6):
        a.box((x, pc_y, F + 2.4), (0.42, 0.42, 5.2), trim)
        a.box((x, pc_y, F + 0.35), (0.7, 0.7, 0.5), stone)
    a.box((0, pc_y + 0.4, F + 5.3), (8.2, 4.6, 0.28), trim)
    a.gable_end((0, pc_y + 0.4, F + 5.45), 4.6, 8.2, 3.0, wall, rz=90)
    a.gable_roof((0, pc_y + 0.4, F + 5.45), 4.6, 8.2, 3.0, roof, rz=90,
                 thick=0.24, overhang=0.5, snow_thick=0.4, snow_over=0.12, snow_bevel=0.1)
    # lodge name board under porte-cochère
    a.box((0, pc_y - 0.3, F + 4.2), (3.6, 0.14, 1.0), "cream-sign")
    a.box((0, pc_y - 0.36, F + 4.15), (2.8, 0.06, 0.55), "navy")
    for x in (-2.4, 2.4):
        a.box((x, pc_y - 0.2, F + 3.4), (0.32, 0.32, 0.45), glow)

    # --- third-floor pavilion crown (taller center mass on the T2 bay) ---
    crow_z0, crow_z1 = 9.8, 13.8
    crow_y = (fy - 0.05 + pav_front) / 2
    crow_d = abs(fy - 0.05 - pav_front)
    a.box((0, crow_y, (crow_z0 + crow_z1) / 2), (8.0, crow_d - 0.35, crow_z1 - crow_z0), wall)
    for sx in (-1, 1):
        a.box((sx * 4.0, pav_front, (crow_z0 + crow_z1) / 2), (0.3, 0.3, crow_z1 - crow_z0), trim)
    a.gable_end((0, crow_y, crow_z1), crow_d, 8.2, 4.0, wall, rz=90)
    a.gable_roof((0, crow_y, crow_z1), crow_d, 8.2, 4.0, roof, rz=90,
                 thick=0.26, overhang=0.55, snow_thick=0.42, snow_over=0.14, snow_bevel=0.12)
    for x in (-2.2, 2.2):
        a.window((x, pav_front, 11.4), 2.0, 1.7, '-Y', frame=trim)
    a.window((0, pav_front, crow_z1 + 1.5), 2.2, 1.7, '-Y', frame=trim)
    # high balcony on crown
    _balcony(a, -3.4, 3.4, pav_front - 0.1, pav_front - 1.7, 10.4, timber, snow)

    # --- gallery balcony across main lodge front (above original eave band) ---
    _balcony(a, -5.6, 5.6, fy - 0.05, fy - 1.9, 6.2, timber, snow)

    # --- ridge lantern / cupola on main ridge (silhouette height) ---
    cz = H + 8.8
    a.box((0, -0.6, cz + 0.85), (3.2, 3.2, 2.0), trim)
    for face, (x, y) in {
        '-Y': (0, -2.05), '+Y': (0, 0.85), '-X': (-1.45, -0.6), '+X': (1.45, -0.6)
    }.items():
        a.window((x, y, cz + 0.95), 1.15, 1.0, face, sill=False, mullion=False, frame=trim)
    a.box((0, -0.6, cz + 2.0), (1.4, 1.4, 0.9), glow)
    a.cyl((0, -0.6, cz + 1.85), 2.2, 0.0, 1.7, 4, roof, rot=(0, 0, 45))
    a.cyl((0, -0.6, cz + 2.55), 0.95, 0.0, 0.95, 4, snow, rot=(0, 0, 45))
    a.box((0, -0.6, cz + 3.15), (0.14, 0.14, 1.5), steel)
    a.sphere((0, -0.6, cz + 3.95), 0.3, snow)

    # --- -X dining tower (extends past T2 uplift — much taller + wider) ---
    wcx, wcy = -W / 2 - 5.6, -1.2
    wl, wd, z0, z1 = 7.0, 7.8, 3.4, 11.6
    a.box((wcx, wcy, F / 2), (wl + 0.3, wd + 0.3, F), stone)
    a.box((wcx, wcy, (z0 + z1) / 2), (wl, wd, z1 - z0), wall)
    for sy in (-1, 1):
        a.box((wcx - wl / 2, wcy + sy * wd / 2, (z0 + z1) / 2), (0.3, 0.3, z1 - z0), trim)
        a.box((wcx + wl / 2, wcy + sy * wd / 2, (z0 + z1) / 2), (0.3, 0.3, z1 - z0), trim)
    a.box((wcx, wcy, 7.0), (wl + 0.08, wd + 0.08, 0.16), trim)
    a.gable_end((wcx, wcy, z1), wd + 0.45, wl, 3.8, wall, rz=90)
    a.gable_roof((wcx, wcy, z1), wd + 0.45, wl, 3.8, roof, rz=90,
                 thick=0.24, overhang=0.55, snow_thick=0.42, snow_over=0.14, snow_bevel=0.12)
    for z in (5.2, 8.6):
        for x in (wcx - 1.8, wcx, wcx + 1.8):
            a.window((x, wcy - wd / 2, z), 1.5, 1.55, '-Y', frame=trim)
        a.window((wcx - wl / 2, wcy, z), 1.6, 1.55, '-X', frame=trim)
    _balcony(a, wcx - 2.6, wcx + 2.6, wcy - wd / 2 - 0.1, wcy - wd / 2 - 1.9, 7.4, timber, snow)

    # --- +X tower (matches dining tower for a wide resort silhouette) ---
    tx, ty = W / 2 + 5.8, -0.8
    tl, td, tz0, tz1 = 6.4, 7.2, 3.4, 11.0
    a.box((tx, ty, F / 2), (tl + 0.3, td + 0.3, F), stone)
    a.box((tx, ty, (tz0 + tz1) / 2), (tl, td, tz1 - tz0), wall)
    for sy in (-1, 1):
        a.box((tx + tl / 2, ty + sy * td / 2, (tz0 + tz1) / 2), (0.3, 0.3, tz1 - tz0), trim)
    a.gable_end((tx, ty, tz1), td + 0.4, tl, 3.4, wall, rz=90)
    a.gable_roof((tx, ty, tz1), td + 0.4, tl, 3.4, roof, rz=90,
                 thick=0.22, overhang=0.5, snow_thick=0.4, snow_over=0.12, snow_bevel=0.1)
    for z in (5.2, 8.4):
        a.window((tx + tl / 2, ty, z), 1.9, 1.65, '+X', frame=trim)
        a.window((tx, ty - td / 2, z), 1.7, 1.55, '-Y', frame=trim)
    _balcony(a, tx - 2.2, tx + 2.2, ty - td / 2 - 0.1, ty - td / 2 - 1.8, 7.0, timber, snow)

    # --- terrace fire pits (two, intentional — not prop clutter) ---
    for fx in (-5.2, 5.2):
        a.box((fx, pav_front - 5.0, F + 0.05), (1.4, 1.4, 0.28), "stone-dark")
        a.box((fx, pav_front - 5.0, F + 0.35), (0.85, 0.85, 0.22), glow)
        a.box((fx, pav_front - 5.0, F + 0.58), (0.4, 0.4, 0.14), glow)
