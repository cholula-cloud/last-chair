"""Lodge Tier 2/3 — New England clapboard shells (clean, not bolted clutter).

Timber theme language (matches T1 / clapboard-house kit cues):
  - barn-red walls + white corner boards
  - horizontal clapboard lap rings
  - ordered window banks (grids, not scatter)
  - one readable silhouette per tier

  T2  one wide clapboard mass: ground glass bank, centered gable cluster, deck
  T3  stepped resort: wide glass base → setback upper → dormers + cupola + plaza

Tier 1 stays in buildings.b_lodge. Blender front = −Y.
"""

LODGE_W = 12.0
LODGE_D = 9.0
LODGE_H = 6.4
LODGE_F = 0.7
FOOTPRINT_TOL = 0.05


def front_y(D=LODGE_D):
    return -D / 2


def timber_mats():
    return (
        "barn-red", "trim-white", "slate-roof", "timber-brown", "timber-dark",
        "stone-grey", "snow", "ski", "steel-dark", "lamp-glow",
    )


# ---------- primitives ----------


def _corners(a, cx, cy, hw, hd, z0, z1, trim):
    zh, hz = (z0 + z1) / 2, z1 - z0
    for sx in (-1, 1):
        for sy in (-1, 1):
            a.box((cx + sx * hw, cy + sy * hd, zh), (0.28, 0.28, hz), trim)


def _side_clapboard(a, W, D, z0, z1, mat="timber-dark", step=0.5, skip=(), cy=0.0):
    """Clapboard laps on ±X only — front stays clean so rings never cut window glow."""
    z = z0 + 0.38
    while z < z1 - 0.12:
        if not any(lo < z < hi for lo, hi in skip):
            for sx in (-1, 1):
                a.box((sx * W / 2, cy, z), (0.06, D + 0.04, 0.05), mat)
        z += step


def _brackets(a, fy, xs, z, timber):
    for x in xs:
        a.box((x, fy - 0.32, z), (0.2, 0.5, 0.16), timber)
        a.box((x, fy - 0.12, z - 0.3), (0.16, 0.16, 0.5), timber)


def _glass_bank(a, y, face, x0, x1, z, h, trim, pane_w=1.7, gap=0.2):
    span = x1 - x0
    n = max(2, int((span + gap) / (pane_w + gap)))
    total = n * pane_w + (n - 1) * gap
    start = (x0 + x1) / 2 - total / 2 + pane_w / 2
    for i in range(n):
        x = start + i * (pane_w + gap)
        a.window((x, y, z), pane_w, h, face, frame=trim)


def _door(a, fy, F, trim, timber_d, glow, w=2.2, h=2.8):
    a.box((0, fy - 0.05, F + h / 2), (w + 0.35, 0.14, h + 0.2), trim)
    a.box((0, fy - 0.12, F + h / 2 - 0.05), (w, 0.12, h), timber_d)
    a.box((0, fy - 0.18, F + h * 0.55), (w * 0.55, 0.05, h * 0.4), glow)
    for x in (-(w / 2 + 0.35), w / 2 + 0.35):
        a.box((x, fy - 0.08, F + h * 0.85), (0.22, 0.22, 0.34), glow)


def _simple_deck(a, x0, x1, y_inner, y_outer, F, timber, timber_d, snow):
    """Clean approach deck — rails only, no busy baluster forest."""
    cx = (x0 + x1) / 2
    depth = y_inner - y_outer
    a.box((cx, (y_inner + y_outer) / 2, F - 0.06), (x1 - x0, depth, 0.2), timber)
    a.box((cx, (y_inner + y_outer) / 2, F / 2 - 0.1), (x1 - x0 - 0.4, depth - 0.25, F - 0.25), timber_d)
    for i in range(3):
        a.box((0, y_outer - 0.34 - i * 0.32, F - 0.12 - i * 0.15), (3.2, 0.36, 0.15), timber)
    # corner posts + top rails
    for x in (x0, x1):
        a.box((x, y_outer, F + 0.55), (0.16, 0.16, 1.05), timber)
        a.box((x, y_inner, F + 0.55), (0.16, 0.16, 1.05), timber)
        a.box((x, (y_inner + y_outer) / 2, F + 1.05), (0.14, depth, 0.1), timber)
        a.box((x, (y_inner + y_outer) / 2, F + 1.12), (0.16, depth + 0.04, 0.07), snow)
    for xa, xb in ((x0, -1.6), (1.6, x1)):
        if xb - xa < 0.6:
            continue
        cxr = (xa + xb) / 2
        L = xb - xa
        a.box((cxr, y_outer, F + 1.05), (L, 0.12, 0.1), timber)
        a.box((cxr, y_outer, F + 1.12), (L + 0.04, 0.14, 0.07), snow)
        a.box((xa, y_outer, F + 0.55), (0.14, 0.14, 1.05), timber)
        a.box((xb, y_outer, F + 0.55), (0.14, 0.14, 1.05), timber)


def _chimney(a, x, y, z_top, stone, snow):
    a.box((x, y, 2.0), (1.6, 1.7, 3.4), stone)
    a.box((x, y, z_top / 2 + 0.4), (1.3, 1.3, z_top - 2.2), stone)
    a.box((x, y, z_top), (1.55, 1.55, 0.28), "stone-dark")
    a.box((x, y, z_top + 0.26), (1.35, 1.35, 0.24), snow, bevel=0.08)


# ---------- Tier 2: one New England clapboard mass ----------


def build_tier2_shell(a, mats):
    """One wide clapboard lodge. Ground glass bank + centered gable cluster. No wings."""
    wall, trim, roof, timber, timber_d, stone, snow, ski, steel, glow = mats
    W, D, H, rise, F = 20.0, 11.0, 7.6, 6.4, LODGE_F
    fy = -D / 2

    a.box((0, 0, F / 2), (W + 0.35, D + 0.35, F), stone)
    a.box((0, 0, F + (H - F) / 2), (W, D, H - F), wall)
    _corners(a, 0, 0, W / 2, D / 2, F, H, trim)
    _side_clapboard(a, W, D, F, H, skip=((1.8, 4.2),))
    a.box((0, 0, 4.55), (W + 0.1, D + 0.1, 0.2), trim)
    a.box((0, 0, 1.08), (W + 0.06, D + 0.06, 0.12), trim)

    a.gable_end((0, 0, H), D, W, rise, wall, rz=90)
    a.gable_roof((0, 0, H), D, W, rise, roof, rz=90, thick=0.28, overhang=0.75,
                 snow_thick=0.48, snow_over=0.14, snow_bevel=0.13)
    # two eave brackets only — enough for deep-eave NE read without facade clutter
    _brackets(a, fy, [-7.5, 7.5], H + 0.1, timber)

    # Ground: continuous glass banks flanking the door (leave wall above for band)
    _glass_bank(a, fy, '-Y', -8.4, -1.55, 2.5, 2.9, trim, pane_w=1.65, gap=0.18)
    _glass_bank(a, fy, '-Y', 1.55, 8.4, 2.5, 2.9, trim, pane_w=1.65, gap=0.18)
    _door(a, fy, F, trim, timber_d, glow, w=2.1, h=2.7)

    # Upper: centered gable cluster aligned over the door bay
    a.window((-2.55, fy, 6.15), 1.85, 1.9, '-Y', frame=trim)
    a.window((0, fy, 6.3), 2.15, 2.25, '-Y', frame=trim)
    a.window((2.55, fy, 6.15), 1.85, 1.9, '-Y', frame=trim)
    a.window((0, fy, H + rise * 0.38), 1.9, 1.8, '-Y', frame=trim)
    a.box((0, fy - 0.3, 5.0), (7.2, 0.38, 0.15), timber)

    for y in (-2.6, 2.6):
        a.window((W / 2, y, 2.5), 1.5, 2.0, '+X', frame=trim)
        a.window((-W / 2, y, 2.5), 1.5, 2.0, '-X', frame=trim)

    _simple_deck(a, -9.0, 9.0, fy - 0.05, fy - 4.2, F, timber, timber_d, snow)
    _chimney(a, W / 2 - 1.1, 1.8, H + rise + 0.5, stone, snow)

    # Distinct hearth dining wing on -X so Tier 2 reads immediately larger than Tier 1
    wx0, wx1, wd, wh = -W / 2 + 0.2, -W / 2 - 4.2, 6.8, 4.2
    wcx, wl = (wx0 + wx1) / 2, wx0 - wx1
    a.box((wcx, -0.4, F / 2), (wl + 0.2, wd + 0.2, F), stone)
    a.box((wcx, -0.4, F + (wh - F) / 2), (wl, wd, wh - F), wall)
    _corners(a, wcx, -0.4, wl / 2, wd / 2, F, wh, trim)
    a.gable_end((wcx - 0.2, -0.4, wh), wl + 0.4, wd, 2.8, wall)
    a.gable_roof((wcx - 0.2, -0.4, wh), wl + 0.4, wd, 2.8, roof, thick=0.22, overhang=0.45,
                 snow_thick=0.38, snow_over=0.12, snow_bevel=0.12)
    a.window((wcx, -0.4 - wd / 2, 2.3), 2.2, 1.7, '-Y', frame=trim)
    a.window((wx1, -0.4, 2.3), 1.8, 1.6, '-X', frame=trim)


# ---------- Tier 3: stepped New England resort ----------


def build_tier3_shell(a, mats):
    """Wide clapboard glass base → setback upper → twin dormers + cupola. Clean steps."""
    wall, trim, roof, timber, timber_d, stone, snow, ski, steel, glow = mats
    Wb, Db, Hb = 24.0, 13.0, 5.4
    Wu, Du, Hu = 15.0, 10.5, 4.8
    rise_u = 6.0
    F = LODGE_F
    fy = -Db / 2

    # --- Base ---
    a.box((0, 0, F / 2), (Wb + 0.4, Db + 0.4, F), stone)
    a.box((0, 0, F + (Hb - F) / 2), (Wb, Db, Hb - F), wall)
    _corners(a, 0, 0, Wb / 2, Db / 2, F, Hb, trim)
    _side_clapboard(a, Wb, Db, F, Hb, skip=((1.9, 4.5),))
    a.box((0, 0, 1.12), (Wb + 0.06, Db + 0.06, 0.12), trim)
    # snow terrace between volumes (step read)
    a.box((0, 0, Hb + 0.02), (Wb + 0.7, Db + 0.7, 0.18), roof)
    a.box((0, 0, Hb + 0.14), (Wb + 1.0, Db + 1.0, 0.3), snow, bevel=0.1)

    # Leave more red wall — slightly shorter glass, clearer clapboard above
    _glass_bank(a, fy, '-Y', -10.2, -1.7, 2.75, 3.2, trim, pane_w=1.85, gap=0.2)
    _glass_bank(a, fy, '-Y', 1.7, 10.2, 2.75, 3.2, trim, pane_w=1.85, gap=0.2)
    for face, wx in (('+X', Wb / 2), ('-X', -Wb / 2)):
        for yi in (-3.6, 0.0, 3.6):
            a.window((wx, yi, 2.75), 1.7, 3.0, face, frame=trim)
    _door(a, fy, F, trim, timber_d, glow, w=2.3, h=2.9)

    # --- Upper setback ---
    uy = 0.35
    a.box((0, uy, Hb + Hu / 2), (Wu, Du, Hu), wall)
    _corners(a, 0, uy, Wu / 2, Du / 2, Hb, Hb + Hu, trim)
    _side_clapboard(a, Wu, Du, Hb, Hb + Hu, skip=((Hb + 1.3, Hb + 3.6),), cy=uy)
    a.box((0, uy, Hb + 0.08), (Wu + 0.08, Du + 0.08, 0.14), trim)
    a.gable_end((0, uy, Hb + Hu), Du, Wu, rise_u, wall, rz=90)
    a.gable_roof((0, uy, Hb + Hu), Du, Wu, rise_u, roof, rz=90, thick=0.26, overhang=0.65,
                 snow_thick=0.45, snow_over=0.12, snow_bevel=0.12)
    _brackets(a, uy - Du / 2, [-5.5, 5.5], Hb + Hu + 0.08, timber)

    ufy = uy - Du / 2
    _glass_bank(a, ufy, '-Y', -5.2, 5.2, Hb + 2.25, 2.4, trim, pane_w=1.65, gap=0.18)
    a.window((0, ufy, Hb + Hu + rise_u * 0.36), 2.0, 1.85, '-Y', frame=trim)

    # Twin dormers on the FRONT roof plane so they read in the SW camera
    for x in (-3.6, 3.6):
        dy = ufy + 1.1  # sit on front slope, projecting past the eave slightly
        a.box((x, dy, Hb + Hu + 1.05), (2.6, 2.4, 1.85), wall)
        a.gable_end((x, dy, Hb + Hu + 1.95), 2.4, 2.8, 1.5, wall, rz=90)
        a.gable_roof((x, dy, Hb + Hu + 1.95), 2.4, 2.8, 1.5, roof, rz=90,
                     thick=0.14, overhang=0.26, snow_thick=0.24, snow_over=0.07, snow_bevel=0.07)
        a.window((x, dy - 1.25, Hb + Hu + 1.35), 1.55, 1.4, '-Y', frame=trim)

    # Cupola (lantern crown — keep modest)
    cz = Hb + Hu + rise_u + 0.2
    a.box((0, uy, cz + 0.7), (2.7, 2.7, 1.5), trim)
    for face, (x, y) in {
        '-Y': (0, uy - 1.2), '+Y': (0, uy + 1.2), '-X': (-1.2, uy), '+X': (1.2, uy)
    }.items():
        a.window((x, y, cz + 0.75), 0.9, 0.8, face, sill=False, mullion=False, frame=trim)
    a.box((0, uy, cz + 1.55), (1.1, 1.1, 0.6), glow)
    a.cyl((0, uy, cz + 1.45), 1.9, 0.0, 1.35, 4, roof, rot=(0, 0, 45))
    a.cyl((0, uy, cz + 2.0), 0.75, 0.0, 0.75, 4, snow, rot=(0, 0, 45))
    a.box((0, uy, cz + 2.5), (0.1, 0.1, 1.0), steel)
    a.sphere((0, uy, cz + 3.05), 0.2, snow)

    _chimney(a, Wu / 2 + 0.6, uy + 1.2, Hb + Hu + rise_u + 1.0, stone, snow)
    _chimney(a, -Wu / 2 - 0.6, uy + 1.2, Hb + Hu + rise_u * 0.72, stone, snow)

    # Plaza with railings + long grand central canopy
    px0, px1 = -(Wb + 1.0) / 2, (Wb + 1.0) / 2
    py_in, py_out = fy - 0.15, fy - 6.8
    a.box((0, (py_in + py_out) / 2, F - 0.1), (Wb + 1.2, py_in - py_out, 0.26), stone)
    a.box((0, (py_in + py_out) / 2 + 0.1, F + 0.02), (Wb + 0.4, py_in - py_out - 0.5, 0.1), "stone-dark")
    for i in range(3):
        a.box((0, py_out - 0.35 - i * 0.38, F - 0.2 - i * 0.14), (5.0, 0.4, 0.15), stone)
    # plaza rails (gap at stair)
    rh = F + 1.05
    for x in (px0, px1):
        a.box((x, (py_in + py_out) / 2, F + 0.55), (0.16, 0.16, 1.05), timber)
        a.box((x, py_out, F + 0.55), (0.16, 0.16, 1.05), timber)
        a.box((x, py_in, F + 0.55), (0.16, 0.16, 1.05), timber)
        a.box((x, (py_in + py_out) / 2, rh), (0.14, py_in - py_out, 0.1), timber)
        a.box((x, (py_in + py_out) / 2, rh + 0.08), (0.16, py_in - py_out + 0.04, 0.07), snow)
    for xa, xb in ((px0, -2.4), (2.4, px1)):
        cxr = (xa + xb) / 2
        L = xb - xa
        a.box((cxr, py_out, rh), (L, 0.12, 0.1), timber)
        a.box((cxr, py_out, rh + 0.08), (L + 0.04, 0.14, 0.07), snow)
        a.box((xa, py_out, F + 0.55), (0.14, 0.14, 1.05), timber)
        a.box((xb, py_out, F + 0.55), (0.14, 0.14, 1.05), timber)
    # mid posts along front rail segments
    for x in (-8.5, -5.5, 5.5, 8.5):
        a.box((x, py_out, F + 0.55), (0.14, 0.14, 1.05), timber)

    # Grand central canopy — long projection toward the plaza edge, six posts
    cy = (fy - 0.4 + py_out + 0.6) / 2   # span from near facade to near plaza edge
    depth = (fy - 0.4) - (py_out + 0.6)
    for x in (-5.0, -2.5, 0.0, 2.5, 5.0):
        a.box((x, cy - depth * 0.28, F + 2.0), (0.36, 0.36, 3.9), trim)
        a.box((x, cy - depth * 0.28, F + 0.3), (0.58, 0.58, 0.42), stone)
    for x in (-5.0, 5.0):
        a.box((x, fy - 0.4, F + 2.0), (0.32, 0.32, 3.9), trim)
        a.box((x, fy - 0.4, F + 0.3), (0.5, 0.5, 0.38), stone)
    # deck + fascia + snow (wide + deep)
    a.box((0, cy, F + 4.1), (12.5, depth + 0.4, 0.24), timber)
    a.box((0, cy, F + 3.95), (11.6, 0.28, 0.4), timber_d)
    a.box((-5.8, cy, F + 3.95), (0.28, depth, 0.4), timber_d)
    a.box((5.8, cy, F + 3.95), (0.28, depth, 0.4), timber_d)
    a.box((0, cy, F + 4.32), (13.2, depth + 0.8, 0.36), snow, bevel=0.1)
    a.box((0, fy - 1.1, F + 3.55), (4.6, 0.12, 0.9), "cream-sign")
    a.box((0, fy - 1.15, F + 3.5), (3.8, 0.05, 0.45), "navy")


def build_coherent_lodge(a, mats, tier=2):
    if tier >= 3:
        build_tier3_shell(a, mats)
    else:
        build_tier2_shell(a, mats)


# ---------- theme/chalet annex hooks (delta-only pieces) ----------


def tier2_front_bay(a, mats, W=LODGE_W, D=LODGE_D, F=LODGE_F, include_deck=True):
    """Annex/theme delta: glass-bank apron + clapboard cues on existing face."""
    wall, trim, roof, timber, timber_d, stone, snow, ski, steel, glow = mats
    fy = front_y(D)
    _glass_bank(a, fy, '-Y', -5.2, -1.35, 2.55, 2.9, trim, pane_w=1.55, gap=0.16)
    _glass_bank(a, fy, '-Y', 1.35, 5.2, 2.55, 2.9, trim, pane_w=1.55, gap=0.16)
    a.window((-2.1, fy, 5.7), 1.7, 1.7, '-Y', frame=trim)
    a.window((0, fy, 5.85), 2.0, 2.0, '-Y', frame=trim)
    a.window((2.1, fy, 5.7), 1.7, 1.7, '-Y', frame=trim)
    a.box((0, fy - 0.28, 4.6), (6.6, 0.36, 0.14), timber)
    if include_deck:
        _simple_deck(a, -5.8, 5.8, fy - 0.05, fy - 3.8, F, timber, timber_d, snow)
    _brackets(a, fy, [-3.5, 0, 3.5], LODGE_H + 0.08, timber)


def tier3_front_grand(a, mats, W=LODGE_W, D=LODGE_D, H=LODGE_H, F=LODGE_F):
    """Annex/theme delta: railed plaza, long grand canopy, cupola."""
    wall, trim, roof, timber, timber_d, stone, snow, ski, steel, glow = mats
    fy = front_y(D)
    px0, px1 = -(W + 5.0) / 2, (W + 5.0) / 2
    py_in, py_out = fy - 0.1, fy - 5.6
    a.box((0, (py_in + py_out) / 2, F - 0.1), (W + 5.5, py_in - py_out, 0.24), stone)
    a.box((0, (py_in + py_out) / 2 + 0.1, F + 0.02), (W + 4.5, py_in - py_out - 0.4, 0.1), "stone-dark")
    for i in range(3):
        a.box((0, py_out - 0.32 - i * 0.36, F - 0.2 - i * 0.13), (4.6, 0.38, 0.15), stone)
    rh = F + 1.0
    for x in (px0, px1):
        a.box((x, (py_in + py_out) / 2, rh), (0.14, py_in - py_out, 0.1), timber)
        a.box((x, (py_in + py_out) / 2, rh + 0.08), (0.16, py_in - py_out + 0.04, 0.07), snow)
        a.box((x, py_out, F + 0.5), (0.14, 0.14, 1.0), timber)
    for xa, xb in ((px0, -2.2), (2.2, px1)):
        cxr = (xa + xb) / 2
        a.box((cxr, py_out, rh), (xb - xa, 0.12, 0.1), timber)
        a.box((cxr, py_out, rh + 0.08), (xb - xa + 0.04, 0.14, 0.07), snow)
    cy = fy - 2.8
    for x in (-3.6, -1.3, 1.3, 3.6):
        a.box((x, cy, F + 1.7), (0.3, 0.3, 3.3), trim)
    a.box((0, cy, F + 3.55), (9.0, 4.4, 0.18), timber)
    a.box((0, cy, F + 3.72), (9.5, 4.8, 0.28), snow, bevel=0.08)
    cz = H + 7.0
    a.box((0, 0, cz + 0.65), (2.4, 2.4, 1.4), trim)
    for face, (x, y) in {
        '-Y': (0, -1.05), '+Y': (0, 1.05), '-X': (-1.05, 0), '+X': (1.05, 0)
    }.items():
        a.window((x, y, cz + 0.7), 0.85, 0.75, face, sill=False, mullion=False, frame=trim)
    a.box((0, 0, cz + 1.45), (1.0, 1.0, 0.55), glow)
    a.cyl((0, 0, cz + 1.35), 1.7, 0.0, 1.2, 4, roof, rot=(0, 0, 45))
    a.cyl((0, 0, cz + 1.85), 0.65, 0.0, 0.65, 4, snow, rot=(0, 0, 45))
    a.box((0, 0, cz + 2.25), (0.1, 0.1, 0.9), steel)
    a.sphere((0, 0, cz + 2.75), 0.18, snow)
