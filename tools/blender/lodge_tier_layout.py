"""Shared lodge tier massing: camera-facing (-Y / ±X), not rear (+Y).

Default game view is elevated southwest; Blender front = -Y (glTF +Z).

Tier extras *replace* the base porch/deck (buildings.b_lodge skips approach when
extra is set). One coherent front — no stacked porches.

Floor language (shared) — rail tops must sit below window sills
--------------------------------------------------------------
  F1 window centers  z = 2.50   (h≈1.8 → sill ≈ 1.60)
  F2 window centers  z = 6.15   (h≈1.8 → sill ≈ 5.25)
  F3 window centers  z = 9.45   (h≈1.6 → sill ≈ 8.65)
  Balcony F2 slab    z = 3.95   (rail top ≈ 5.07 < sill)
  Balcony F3 slab    z = 7.40   (rail top ≈ 8.52 < sill)

Silhouette
----------
Tier 2  wide pavilion + one front balcony + guest wing + dining uplift
Tier 3  porte-cochère + stone plaza + setback crown + twin flank towers + lantern
        (calls Tier 2 with include_deck=False so plaza doesn't fight timber rails)
"""

LODGE_W = 12.0
LODGE_D = 9.0
LODGE_H = 6.4
LODGE_F = 0.7
FOOTPRINT_TOL = 0.05

Z1 = 2.50
Z2 = 6.15
Z3 = 9.45
BALC_Z2 = 3.95
BALC_Z3 = 7.40
WIN_H = 1.80
WIN_H3 = 1.55


def front_y(D=LODGE_D):
    return -D / 2


def timber_mats():
    return (
        "barn-red", "trim-white", "slate-roof", "timber-brown", "timber-dark",
        "stone-grey", "snow", "ski", "steel-dark", "lamp-glow",
    )


# ---------- helpers ----------


def _rail_y(a, x0, x1, y, z, timber, snow, gap=None):
    segs = [(x0, x1)]
    if gap:
        g0, g1 = gap
        segs = [(x0, g0), (g1, x1)]
    for xa, xb in segs:
        if xb - xa < 0.45:
            continue
        a.box((xa, y, z + 0.55), (0.14, 0.14, 1.05), timber)
        a.box((xb, y, z + 0.55), (0.14, 0.14, 1.05), timber)
        cx, L = (xa + xb) / 2, xb - xa
        a.box((cx, y, z + 1.02), (L, 0.11, 0.11), timber)
        a.box((cx, y, z + 0.52), (L - 0.12, 0.06, 0.06), timber)
        a.box((cx, y, z + 1.12), (L + 0.05, 0.14, 0.07), snow)
        n = max(2, int(L / 0.5))
        for i in range(1, n):
            t = i / n
            a.box((xa + t * L, y, z + 0.72), (0.06, 0.06, 0.5), timber)


def _rail_x(a, x, y0, y1, z, timber, snow):
    cy, L = (y0 + y1) / 2, abs(y1 - y0)
    if L < 0.35:
        return
    a.box((x, cy, z + 1.02), (0.11, L, 0.11), timber)
    a.box((x, cy, z + 0.52), (0.06, L - 0.12, 0.06), timber)
    a.box((x, cy, z + 1.12), (0.14, L + 0.05, 0.07), snow)
    n = max(1, int(L / 0.5))
    for i in range(1, n):
        t = i / n
        a.box((x, y0 + t * (y1 - y0), z + 0.72), (0.06, 0.06, 0.5), timber)


def _balcony(a, x0, x1, y_wall, y_out, z, timber, snow, gap=None):
    if y_out > y_wall:
        y_wall, y_out = y_out, y_wall
    cx, cy = (x0 + x1) / 2, (y_wall + y_out) / 2
    depth = y_wall - y_out
    a.box((cx, cy, z - 0.08), (x1 - x0, depth, 0.2), timber)
    for x in (x0 + 0.55, cx, x1 - 0.55):
        if x0 + 0.3 < x < x1 - 0.3:
            a.box((x, y_wall - 0.2, z - 0.4), (0.16, 0.32, 0.5), timber)
    _rail_y(a, x0, x1, y_out, z, timber, snow, gap=gap)
    _rail_x(a, x0, y_out, y_wall, z, timber, snow)
    _rail_x(a, x1, y_out, y_wall, z, timber, snow)


def _win_row(a, y, face, xs, z, w, h, trim):
    for x in xs:
        a.window((x, y, z), w, h, face, frame=trim)


def _corner_trim(a, cx, cy, half_w, half_d, z0, z1, trim):
    zh = (z0 + z1) / 2
    hz = z1 - z0
    for sx in (-1, 1):
        for sy in (-1, 1):
            a.box((cx + sx * half_w, cy + sy * half_d, zh), (0.28, 0.28, hz), trim)


# ---------- Tier 2 ----------


def tier2_front_bay(a, mats, W=LODGE_W, D=LODGE_D, F=LODGE_F, include_deck=True):
    """Wide pavilion, one front balcony, guest wing, dining uplift — clean grids.

    include_deck=False when Tier 3 will place a stone plaza instead.
    """
    wall, trim, roof, timber, timber_d, stone, snow, ski, steel, glow = mats
    fy = front_y(D)

    # --- forward pavilion ---
    by0, by1 = fy - 0.05, fy - 5.6
    bw, bh = 10.4, 9.4
    cy = (by0 + by1) / 2
    depth = by0 - by1
    a.box((0, cy, F / 2), (bw + 0.35, depth + 0.25, F), stone)
    a.box((0, cy, F + (bh - F) / 2), (bw, depth, bh - F), wall)
    _corner_trim(a, 0, cy, bw / 2, depth / 2, F, bh, trim)
    a.box((0, cy, 4.2), (bw + 0.06, depth + 0.06, 0.16), trim)
    rise = 4.4
    a.gable_end((0, cy, bh), depth + 0.4, bw, rise, wall, rz=90)
    a.gable_roof((0, cy, bh), depth + 0.4, bw, rise, roof, rz=90,
                 thick=0.24, overhang=0.5, snow_thick=0.4, snow_over=0.12, snow_bevel=0.12)

    # Aligned window grid — F1 / F2 / gable
    _win_row(a, by1, '-Y', (-3.0, 3.0), Z1, 2.3, WIN_H, trim)
    _win_row(a, by1, '-Y', (-3.0, 3.0), Z2, 2.2, WIN_H, trim)
    a.window((0, by1, bh + 1.4), 2.0, 1.8, '-Y', frame=trim)

    # Door + lanterns
    a.box((0, by1 - 0.04, F + 1.3), (2.0, 0.14, 2.55), trim)
    a.box((0, by1 - 0.1, F + 1.2), (1.55, 0.1, 2.35), timber_d)
    a.box((0, by1 - 0.15, F + 1.5), (1.05, 0.05, 0.95), glow)
    for x in (-1.3, 1.3):
        a.box((x, by1 - 0.1, F + 2.4), (0.24, 0.24, 0.36), glow)

    # Front balcony under F2 (rails clear sills)
    _balcony(a, -4.5, 4.5, by1, by1 - 1.5, BALC_Z2, timber, snow)

    if include_deck:
        dy0, dy1 = by1 - 0.05, by1 - 4.0
        a.box((0, (dy0 + dy1) / 2, F - 0.06), (12.4, dy0 - dy1, 0.2), timber)
        a.box((0, (dy0 + dy1) / 2, F / 2 - 0.1), (11.8, dy0 - dy1 - 0.3, F - 0.25), timber_d)
        for i in range(3):
            a.box((0, dy1 - 0.38 - i * 0.36, F - 0.15 - i * 0.18), (3.0, 0.4, 0.16), timber)
        _rail_y(a, -6.0, 6.0, dy1, F, timber, snow, gap=(-1.55, 1.55))
        _rail_x(a, -6.0, dy0, dy1, F, timber, snow)
        _rail_x(a, 6.0, dy0, dy1, F, timber, snow)

    # --- +X guest wing ---
    gx = W / 2 + 3.4
    gy, gw, gd, gh = -0.2, 6.0, 6.8, 7.6
    a.box((gx, gy, F / 2), (gw + 0.22, gd + 0.22, F), stone)
    a.box((gx, gy, F + (gh - F) / 2), (gw, gd, gh - F), wall)
    _corner_trim(a, gx, gy, gw / 2, gd / 2, F, gh, trim)
    a.box((gx, gy, 4.2), (gw + 0.06, gd + 0.06, 0.14), trim)
    a.gable_end((gx, gy, gh), gd + 0.35, gw, 2.5, wall, rz=90)
    a.gable_roof((gx, gy, gh), gd + 0.35, gw, 2.5, roof, rz=90,
                 thick=0.2, overhang=0.4, snow_thick=0.34, snow_over=0.1, snow_bevel=0.1)
    _win_row(a, gy - gd / 2, '-Y', (gx,), Z1, 1.8, WIN_H, trim)
    _win_row(a, gy - gd / 2, '-Y', (gx,), Z2, 1.7, WIN_H, trim)
    _win_row(a, gy, '+X', (gx + gw / 2,), Z1, 1.7, WIN_H, trim)
    _win_row(a, gy, '+X', (gx + gw / 2,), Z2, 1.7, WIN_H, trim)
    _balcony(a, gx - 1.8, gx + 1.8, gy - gd / 2, gy - gd / 2 - 1.35, BALC_Z2, timber, snow)

    # --- -X dining uplift (windows only — no balcony) ---
    wcx, wcy = -W / 2 - 2.3, -0.5
    wl, wd, z0, z1 = 5.0, 6.2, 3.55, 7.2
    a.box((wcx, wcy, (z0 + z1) / 2), (wl, wd, z1 - z0), wall)
    _corner_trim(a, wcx, wcy, wl / 2, wd / 2, z0, z1, trim)
    a.gable_end((wcx, wcy, z1), wd + 0.3, wl, 2.3, wall, rz=90)
    a.gable_roof((wcx, wcy, z1), wd + 0.3, wl, 2.3, roof, rz=90,
                 thick=0.18, overhang=0.35, snow_thick=0.3, snow_over=0.1, snow_bevel=0.1)
    _win_row(a, wcy - wd / 2, '-Y', (wcx - 1.15, wcx + 1.15), Z2, 1.35, 1.5, trim)
    a.window((wcx - wl / 2, wcy, Z2), 1.4, 1.5, '-X', frame=trim)


# ---------- Tier 3 ----------


def tier3_front_grand(a, mats, W=LODGE_W, D=LODGE_D, H=LODGE_H, F=LODGE_F):
    """Clean grand jump: plaza, porte-cochère, setback crown, twin towers, lantern."""
    wall, trim, roof, timber, timber_d, stone, snow, ski, steel, glow = mats
    fy = front_y(D)
    pav_front = fy - 5.6

    # --- stone plaza ---
    a.box((0, pav_front - 3.0, F - 0.12), (14.8, 6.2, 0.26), stone)
    a.box((0, pav_front - 2.7, F + 0.02), (14.0, 5.2, 0.1), "stone-dark")
    for i in range(4):
        a.box((0, pav_front - 6.1 - i * 0.4, F - 0.25 - i * 0.15), (4.4, 0.4, 0.16), stone)

    # --- porte-cochère (shallow, clearly forward of pavilion) ---
    pc_y = pav_front - 2.15
    for x in (-3.0, 3.0):
        a.box((x, pc_y, F + 2.0), (0.36, 0.36, 4.2), trim)
        a.box((x, pc_y, F + 0.26), (0.55, 0.55, 0.38), stone)
    a.box((0, pc_y, F + 4.35), (7.0, 2.9, 0.22), trim)
    a.gable_end((0, pc_y, F + 4.5), 2.9, 7.0, 2.2, wall, rz=90)
    a.gable_roof((0, pc_y, F + 4.5), 2.9, 7.0, 2.2, roof, rz=90,
                 thick=0.18, overhang=0.35, snow_thick=0.3, snow_over=0.1, snow_bevel=0.1)
    a.box((0, pc_y - 0.12, F + 3.55), (3.0, 0.1, 0.75), "cream-sign")
    a.box((0, pc_y - 0.16, F + 3.5), (2.3, 0.04, 0.4), "navy")
    for x in (-2.0, 2.0):
        a.box((x, pc_y - 0.08, F + 3.05), (0.26, 0.26, 0.36), glow)

    # --- setback crown ---
    crow_z0, crow_z1 = 9.2, 11.4
    crow_d = 3.4
    crow_y = pav_front + crow_d / 2 + 0.2
    a.box((0, crow_y, (crow_z0 + crow_z1) / 2), (6.0, crow_d, crow_z1 - crow_z0), wall)
    _corner_trim(a, 0, crow_y, 3.0, crow_d / 2, crow_z0, crow_z1, trim)
    a.gable_end((0, crow_y, crow_z1), crow_d + 0.2, 6.2, 2.5, wall, rz=90)
    a.gable_roof((0, crow_y, crow_z1), crow_d + 0.2, 6.2, 2.5, roof, rz=90,
                 thick=0.2, overhang=0.38, snow_thick=0.32, snow_over=0.1, snow_bevel=0.1)
    _win_row(a, pav_front + 0.25, '-Y', (-1.7, 1.7), Z3, 1.55, WIN_H3, trim)
    a.window((0, pav_front + 0.25, crow_z1 + 0.95), 1.6, 1.4, '-Y', frame=trim)
    _balcony(a, -2.6, 2.6, pav_front + 0.2, pav_front - 1.15, BALC_Z3, timber, snow)

    # --- ridge lantern ---
    cz = H + 7.4
    a.box((0, 0.2, cz + 0.65), (2.4, 2.4, 1.4), trim)
    for face, (x, y) in {
        '-Y': (0, -0.85), '+Y': (0, 1.25), '-X': (-1.05, 0.2), '+X': (1.05, 0.2)
    }.items():
        a.window((x, y, cz + 0.7), 0.85, 0.75, face, sill=False, mullion=False, frame=trim)
    a.box((0, 0.2, cz + 1.45), (1.0, 1.0, 0.6), glow)
    a.cyl((0, 0.2, cz + 1.35), 1.7, 0.0, 1.2, 4, roof, rot=(0, 0, 45))
    a.cyl((0, 0.2, cz + 1.85), 0.65, 0.0, 0.65, 4, snow, rot=(0, 0, 45))
    a.box((0, 0.2, cz + 2.3), (0.1, 0.1, 1.0), steel)
    a.sphere((0, 0.2, cz + 2.85), 0.2, snow)

    # --- -X dining tower ---
    wcx, wcy = -W / 2 - 5.0, -0.8
    wl, wd, z0, z1 = 6.2, 6.8, F, 10.2
    a.box((wcx, wcy, F / 2), (wl + 0.22, wd + 0.22, F), stone)
    a.box((wcx, wcy, (z0 + z1) / 2), (wl, wd, z1 - z0), wall)
    _corner_trim(a, wcx, wcy, wl / 2, wd / 2, z0, z1, trim)
    a.box((wcx, wcy, 4.2), (wl + 0.05, wd + 0.05, 0.14), trim)
    a.box((wcx, wcy, 7.5), (wl + 0.05, wd + 0.05, 0.14), trim)
    a.gable_end((wcx, wcy, z1), wd + 0.3, wl, 3.0, wall, rz=90)
    a.gable_roof((wcx, wcy, z1), wd + 0.3, wl, 3.0, roof, rz=90,
                 thick=0.2, overhang=0.45, snow_thick=0.36, snow_over=0.1, snow_bevel=0.1)
    # Inset from corners so trim doesn't crowd panes
    for z, h in ((Z1, WIN_H), (Z2, WIN_H), (Z3, WIN_H3)):
        if z + h / 2 + 0.3 < z1:
            _win_row(a, wcy - wd / 2, '-Y', (wcx - 1.35, wcx + 1.35), z, 1.35, h, trim)
            a.window((wcx - wl / 2, wcy, z), 1.4, h, '-X', frame=trim)
    _balcony(a, wcx - 2.0, wcx + 2.0, wcy - wd / 2, wcy - wd / 2 - 1.35, BALC_Z2, timber, snow)

    # --- +X tower ---
    tx, ty = W / 2 + 5.2, -0.5
    tl, td, tz0, tz1 = 5.6, 6.4, F, 9.6
    a.box((tx, ty, F / 2), (tl + 0.22, td + 0.22, F), stone)
    a.box((tx, ty, (tz0 + tz1) / 2), (tl, td, tz1 - tz0), wall)
    _corner_trim(a, tx, ty, tl / 2, td / 2, tz0, tz1, trim)
    a.box((tx, ty, 4.2), (tl + 0.05, td + 0.05, 0.14), trim)
    a.gable_end((tx, ty, tz1), td + 0.28, tl, 2.7, wall, rz=90)
    a.gable_roof((tx, ty, tz1), td + 0.28, tl, 2.7, roof, rz=90,
                 thick=0.18, overhang=0.4, snow_thick=0.32, snow_over=0.1, snow_bevel=0.1)
    for z, h in ((Z1, WIN_H), (Z2, WIN_H), (Z3, WIN_H3)):
        if z + h / 2 + 0.3 < tz1:
            a.window((tx + tl / 2, ty, z), 1.55, h, '+X', frame=trim)
            a.window((tx, ty - td / 2, z), 1.45, h, '-Y', frame=trim)
    _balcony(a, tx - 1.75, tx + 1.75, ty - td / 2, ty - td / 2 - 1.3, BALC_Z2, timber, snow)
