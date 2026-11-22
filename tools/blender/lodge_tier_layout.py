"""Coherent lodge tier shells — one facade, window banks, clear hierarchy.

Inspired by real mountain lodges (ordered window grids, shared floor bands,
shallow entry canopy, stepped wings) — NOT bolted-on pavilion stacks.

Blender front = -Y (glTF +Z). Camera is elevated SW.

Tier 1  stays in buildings.b_lodge (do not change).
Tier 2  one wider/taller barn-red shell + one side wing + ribbon balcony.
Tier 3  grander: 3-story center, symmetric wings, cupola, stone plaza, canopy.
"""

LODGE_W = 12.0  # Tier-1 reference footprint (annex alignment / docs)
LODGE_D = 9.0
LODGE_H = 6.4
LODGE_F = 0.7
FOOTPRINT_TOL = 0.05

# Shared floor language across T2/T3
Z1 = 2.55
Z2 = 5.95
Z3 = 9.35
BAND = 4.25          # mid floor band (between F1 and F2)
# F2 sill ≈ Z2 - WIN_H/2 = 5.05; rail top = BALC + 1.12 → keep BALC ≤ 3.90
BALC = 3.85
WIN_H = 1.80
WIN_H3 = 1.55


def front_y(D=LODGE_D):
    return -D / 2


def timber_mats():
    return (
        "barn-red", "trim-white", "slate-roof", "timber-brown", "timber-dark",
        "stone-grey", "snow", "ski", "steel-dark", "lamp-glow",
    )


# ---------- small helpers ----------


def _corners(a, cx, cy, hw, hd, z0, z1, trim):
    zh, hz = (z0 + z1) / 2, z1 - z0
    for sx in (-1, 1):
        for sy in (-1, 1):
            a.box((cx + sx * hw, cy + sy * hd, zh), (0.3, 0.3, hz), trim)


def _band(a, cx, cy, w, d, z, trim):
    a.box((cx, cy, z), (w + 0.08, d + 0.08, 0.16), trim)


def _wins(a, y, face, xs, z, w, h, trim):
    for x in xs:
        a.window((x, y, z), w, h, face, frame=trim)


def _rail_y(a, x0, x1, y, z, timber, snow, gap=None):
    segs = [(x0, x1)] if not gap else [(x0, gap[0]), (gap[1], x1)]
    for xa, xb in segs:
        if xb - xa < 0.5:
            continue
        a.box((xa, y, z + 0.55), (0.14, 0.14, 1.05), timber)
        a.box((xb, y, z + 0.55), (0.14, 0.14, 1.05), timber)
        cx, L = (xa + xb) / 2, xb - xa
        a.box((cx, y, z + 1.02), (L, 0.11, 0.11), timber)
        a.box((cx, y, z + 0.52), (L - 0.1, 0.06, 0.06), timber)
        a.box((cx, y, z + 1.12), (L + 0.04, 0.14, 0.07), snow)
        n = max(2, int(L / 0.55))
        for i in range(1, n):
            t = i / n
            a.box((xa + t * L, y, z + 0.72), (0.06, 0.06, 0.5), timber)


def _rail_x(a, x, y0, y1, z, timber, snow):
    cy, L = (y0 + y1) / 2, abs(y1 - y0)
    if L < 0.4:
        return
    a.box((x, cy, z + 1.02), (0.11, L, 0.11), timber)
    a.box((x, cy, z + 0.52), (0.06, L - 0.1, 0.06), timber)
    a.box((x, cy, z + 1.12), (0.14, L + 0.04, 0.07), snow)


def _ribbon_balcony(a, x0, x1, y_face, depth, z, timber, snow):
    """One continuous balcony under a window bank — not random boxes."""
    y_out = y_face - depth
    cx = (x0 + x1) / 2
    a.box((cx, (y_face + y_out) / 2, z - 0.08), (x1 - x0, depth, 0.2), timber)
    for x in (x0 + 0.7, cx, x1 - 0.7):
        a.box((x, y_face - 0.15, z - 0.38), (0.16, 0.28, 0.45), timber)
    _rail_y(a, x0, x1, y_out, z, timber, snow)
    _rail_x(a, x0, y_out, y_face, z, timber, snow)
    _rail_x(a, x1, y_out, y_face, z, timber, snow)


def _deck(a, x0, x1, y_inner, y_outer, F, timber, timber_d, snow, stair_gap=(-1.6, 1.6)):
    """Approach deck. y_outer is the front edge (more negative / −Y)."""
    cx = (x0 + x1) / 2
    depth = y_inner - y_outer
    a.box((cx, (y_inner + y_outer) / 2, F - 0.06), (x1 - x0, depth, 0.2), timber)
    a.box((cx, (y_inner + y_outer) / 2, F / 2 - 0.1), (x1 - x0 - 0.5, depth - 0.3, F - 0.25), timber_d)
    for i in range(3):
        a.box((0, y_outer - 0.36 - i * 0.34, F - 0.14 - i * 0.16), (3.2, 0.38, 0.16), timber)
    _rail_y(a, x0, x1, y_outer, F, timber, snow, gap=stair_gap)
    _rail_x(a, x0, y_outer, y_inner, F, timber, snow)
    _rail_x(a, x1, y_outer, y_inner, F, timber, snow)


def _chimney(a, x, y, z_top, stone, stone_d, snow):
    a.box((x, y, 2.0), (1.7, 1.8, 3.5), stone)
    a.box((x, y, z_top / 2), (1.4, 1.4, z_top - 1.5), stone)
    a.box((x, y, z_top), (1.65, 1.65, 0.3), stone_d)
    a.box((x, y, z_top + 0.28), (1.45, 1.45, 0.26), snow, bevel=0.08)


# ---------- full coherent shells ----------


def build_coherent_lodge(a, mats, tier=2):
    """Build a complete lodge shell for tier 2 or 3. One composition, window banks."""
    wall, trim, roof, timber, timber_d, stone, snow, ski, steel, glow = mats

    if tier >= 3:
        W, D, H, rise = 20.0, 12.0, 8.6, 7.4
        cols = (-7.2, -3.6, 0.0, 3.6, 7.2)  # 5-bay bank; door replaces center on F1
        wing_w, wing_d, wing_h = 7.2, 8.2, 8.6
    else:
        W, D, H, rise = 16.5, 11.0, 8.0, 6.8
        cols = (-5.6, -2.1, 2.1, 5.6)  # 4-bay bank
        wing_w, wing_d, wing_h = 6.4, 7.4, 8.0

    F = LODGE_F
    fy = -D / 2

    # --- main mass ---
    a.box((0, 0, F / 2), (W + 0.35, D + 0.35, F), stone)
    a.box((0, 0, F + (H - F) / 2), (W, D, H - F), wall)
    _corners(a, 0, 0, W / 2, D / 2, F, H, trim)
    _band(a, 0, 0, W, D, BAND, trim)
    if tier >= 3:
        _band(a, 0, 0, W, D, 7.55, trim)
    a.gable_end((0, 0, H), D, W, rise, wall, rz=90)
    a.gable_roof((0, 0, H), D, W, rise, roof, rz=90, thick=0.28, overhang=0.65,
                 snow_thick=0.45, snow_over=0.14, snow_bevel=0.12)

    # --- front window bank (aligned columns) ---
    win_w = 2.0 if tier < 3 else 2.1
    # F1: all cols except door at center for T3 / mid gap for T2
    f1_cols = [x for x in cols if abs(x) > 1.2]
    _wins(a, fy, '-Y', f1_cols, Z1, win_w, WIN_H, trim)
    _wins(a, fy, '-Y', cols, Z2, win_w - 0.1, WIN_H, trim)
    if tier >= 3:
        # F3 only in central three bays under the gable
        _wins(a, fy, '-Y', (-3.6, 0.0, 3.6), Z3, 1.9, WIN_H3, trim)
        a.window((0, fy, H + rise * 0.42), 2.4, 2.2, '-Y', frame=trim)
    else:
        a.window((0, fy, H + rise * 0.38), 2.2, 2.0, '-Y', frame=trim)

    # Door
    a.box((0, fy - 0.05, F + 1.35), (2.1, 0.14, 2.6), trim)
    a.box((0, fy - 0.11, F + 1.25), (1.65, 0.1, 2.4), timber_d)
    a.box((0, fy - 0.16, F + 1.55), (1.1, 0.05, 1.0), glow)
    for x in (-1.35, 1.35):
        a.box((x, fy - 0.1, F + 2.45), (0.24, 0.24, 0.36), glow)

    # One ribbon balcony under the F2 bank
    _ribbon_balcony(a, cols[0] - 1.0, cols[-1] + 1.0, fy, 1.45, BALC, timber, snow)

    # Approach
    if tier >= 3:
        # stone plaza + shallow entry canopy (not a second house)
        a.box((0, fy - 3.4, F - 0.1), (W + 2.5, 6.5, 0.26), stone)
        a.box((0, fy - 3.1, F + 0.02), (W + 1.6, 5.5, 0.1), "stone-dark")
        for i in range(4):
            a.box((0, fy - 6.5 - i * 0.38, F - 0.22 - i * 0.14), (4.8, 0.4, 0.16), stone)
        # canopy: two posts, shallow gable — sits in front of door only
        for x in (-2.4, 2.4):
            a.box((x, fy - 1.8, F + 1.7), (0.32, 0.32, 3.5), trim)
        a.box((0, fy - 1.5, F + 3.7), (5.6, 2.6, 0.2), trim)
        a.gable_end((0, fy - 1.5, F + 3.85), 2.6, 5.6, 1.8, wall, rz=90)
        a.gable_roof((0, fy - 1.5, F + 3.85), 2.6, 5.6, 1.8, roof, rz=90,
                     thick=0.16, overhang=0.3, snow_thick=0.28, snow_over=0.08, snow_bevel=0.08)
        a.box((0, fy - 1.7, F + 3.15), (2.8, 0.1, 0.7), "cream-sign")
        a.box((0, fy - 1.75, F + 3.1), (2.2, 0.04, 0.35), "navy")
    else:
        _deck(a, -W / 2 + 0.4, W / 2 - 0.4, fy - 0.1, fy - 4.2, F, timber, timber_d, snow)

    # Rear windows
    _wins(a, D / 2, '+Y', (-W / 4, W / 4), Z1, 1.6, WIN_H, trim)

    # --- side wings: same floor bands, same window rhythm ---
    # T2: one +X wing; T3: symmetric ±X wings
    for sx in ((-1, 1) if tier >= 3 else (1,)):
        wx = sx * (W / 2 + wing_w / 2 - 0.15)
        wy = -0.4
        a.box((wx, wy, F / 2), (wing_w + 0.25, wing_d + 0.25, F), stone)
        a.box((wx, wy, F + (wing_h - F) / 2), (wing_w, wing_d, wing_h - F), wall)
        _corners(a, wx, wy, wing_w / 2, wing_d / 2, F, wing_h, trim)
        _band(a, wx, wy, wing_w, wing_d, BAND, trim)
        if tier >= 3:
            _band(a, wx, wy, wing_w, wing_d, 7.55, trim)
        a.gable_end((wx, wy, wing_h), wing_d + 0.3, wing_w, 2.8 if tier < 3 else 3.2, wall, rz=90)
        a.gable_roof((wx, wy, wing_h), wing_d + 0.3, wing_w, 2.8 if tier < 3 else 3.2, roof, rz=90,
                     thick=0.2, overhang=0.42, snow_thick=0.34, snow_over=0.1, snow_bevel=0.1)
        # Front face of wing: 2 columns, F1+F2 (+F3 on T3)
        wcols = (wx - 1.5, wx + 1.5)
        _wins(a, wy - wing_d / 2, '-Y', wcols, Z1, 1.55, WIN_H, trim)
        _wins(a, wy - wing_d / 2, '-Y', wcols, Z2, 1.5, WIN_H, trim)
        if tier >= 3:
            _wins(a, wy - wing_d / 2, '-Y', wcols, Z3, 1.4, WIN_H3, trim)
        face = '+X' if sx > 0 else '-X'
        _wins(a, wy, face, (wx + sx * wing_w / 2,), Z1, 1.6, WIN_H, trim)
        _wins(a, wy, face, (wx + sx * wing_w / 2,), Z2, 1.6, WIN_H, trim)
        if tier >= 3:
            _wins(a, wy, face, (wx + sx * wing_w / 2,), Z3, 1.45, WIN_H3, trim)
        # One short balcony on wing front under F2
        _ribbon_balcony(a, wx - 2.0, wx + 2.0, wy - wing_d / 2, 1.3, BALC, timber, snow)

    # T2 also gets a lower -X dining wing (one story, same materials — not a tower)
    if tier == 2:
        wx = -W / 2 - 2.8
        wy, wl, wd, wh = -0.3, 5.4, 6.5, 4.0
        a.box((wx, wy, F / 2), (wl + 0.2, wd + 0.2, F), stone)
        a.box((wx, wy, F + (wh - F) / 2), (wl, wd, wh - F), wall)
        _corners(a, wx, wy, wl / 2, wd / 2, F, wh, trim)
        a.gable_end((wx, wy, wh), wd + 0.25, wl, 2.4, wall, rz=90)
        a.gable_roof((wx, wy, wh), wd + 0.25, wl, 2.4, roof, rz=90,
                     thick=0.18, overhang=0.35, snow_thick=0.3, snow_over=0.1, snow_bevel=0.1)
        _wins(a, wy - wd / 2, '-Y', (wx - 1.2, wx + 1.2), Z1, 1.5, WIN_H, trim)
        a.window((wx - wl / 2, wy, Z1), 1.6, WIN_H, '-X', frame=trim)

    # Chimney on +X junction
    _chimney(a, W / 2 + 0.5, 1.5, H + rise + 0.8, stone, "stone-dark", snow)

    # Cupola only on Tier 3 — centered on main ridge
    if tier >= 3:
        cz = H + rise + 0.2
        a.box((0, 0, cz + 0.7), (2.6, 2.6, 1.5), trim)
        for face, (x, y) in {
            '-Y': (0, -1.15), '+Y': (0, 1.15), '-X': (-1.15, 0), '+X': (1.15, 0)
        }.items():
            a.window((x, y, cz + 0.75), 0.9, 0.8, face, sill=False, mullion=False, frame=trim)
        a.box((0, 0, cz + 1.55), (1.1, 1.1, 0.65), glow)
        a.cyl((0, 0, cz + 1.45), 1.85, 0.0, 1.3, 4, roof, rot=(0, 0, 45))
        a.cyl((0, 0, cz + 1.95), 0.7, 0.0, 0.7, 4, snow, rot=(0, 0, 45))
        a.box((0, 0, cz + 2.4), (0.1, 0.1, 1.0), steel)
        a.sphere((0, 0, cz + 2.95), 0.2, snow)

    return W, D, H


# ---------- legacy annex-style hooks (themes / chalet still call these) ----------


def tier2_front_bay(a, mats, W=LODGE_W, D=LODGE_D, F=LODGE_F, include_deck=True):
    """Themes/chalet path: grow a coherent front bank + wing onto an existing shell."""
    wall, trim, roof, timber, timber_d, stone, snow, ski, steel, glow = mats
    fy = front_y(D)
    # Widen with a flush front apron (same plane as existing face — not a deep pavilion)
    # Instead: raise a second-story ribbon + side wing with shared bands
    cols = (-4.2, -1.5, 1.5, 4.2)
    # Front balcony ribbon on the existing face
    _ribbon_balcony(a, -5.0, 5.0, fy, 1.4, BALC, timber, snow)
    # Extra F2 windows filling the bank (may overlap base windows — OK for themed shells)
    _wins(a, fy, '-Y', cols, Z2, 1.9, WIN_H, trim)
    if include_deck:
        _deck(a, -6.0, 6.0, fy - 0.05, fy - 4.0, F, timber, timber_d, snow)
    # +X guest wing, shared floor band
    gx, gy, gw, gd, gh = W / 2 + 3.2, -0.3, 6.0, 7.0, 7.2
    a.box((gx, gy, F / 2), (gw + 0.2, gd + 0.2, F), stone)
    a.box((gx, gy, F + (gh - F) / 2), (gw, gd, gh - F), wall)
    _corners(a, gx, gy, gw / 2, gd / 2, F, gh, trim)
    _band(a, gx, gy, gw, gd, BAND, trim)
    a.gable_end((gx, gy, gh), gd + 0.3, gw, 2.6, wall, rz=90)
    a.gable_roof((gx, gy, gh), gd + 0.3, gw, 2.6, roof, rz=90,
                 thick=0.2, overhang=0.4, snow_thick=0.32, snow_over=0.1, snow_bevel=0.1)
    _wins(a, gy - gd / 2, '-Y', (gx - 1.4, gx + 1.4), Z1, 1.5, WIN_H, trim)
    _wins(a, gy - gd / 2, '-Y', (gx - 1.4, gx + 1.4), Z2, 1.45, WIN_H, trim)
    _wins(a, gy, '+X', (gx + gw / 2,), Z1, 1.55, WIN_H, trim)
    _wins(a, gy, '+X', (gx + gw / 2,), Z2, 1.55, WIN_H, trim)
    _ribbon_balcony(a, gx - 1.9, gx + 1.9, gy - gd / 2, 1.25, BALC, timber, snow)


def tier3_front_grand(a, mats, W=LODGE_W, D=LODGE_D, H=LODGE_H, F=LODGE_F):
    """Themes/chalet Tier-3 delta: plaza, canopy, twin wings, cupola — same language."""
    wall, trim, roof, timber, timber_d, stone, snow, ski, steel, glow = mats
    fy = front_y(D)

    a.box((0, fy - 3.2, F - 0.1), (W + 4.0, 6.2, 0.26), stone)
    a.box((0, fy - 2.9, F + 0.02), (W + 3.0, 5.2, 0.1), "stone-dark")
    for i in range(4):
        a.box((0, fy - 6.2 - i * 0.38, F - 0.22 - i * 0.14), (4.6, 0.4, 0.16), stone)
    for x in (-2.4, 2.4):
        a.box((x, fy - 1.7, F + 1.7), (0.32, 0.32, 3.4), trim)
    a.box((0, fy - 1.4, F + 3.6), (5.4, 2.4, 0.2), trim)
    a.gable_end((0, fy - 1.4, F + 3.75), 2.4, 5.4, 1.7, wall, rz=90)
    a.gable_roof((0, fy - 1.4, F + 3.75), 2.4, 5.4, 1.7, roof, rz=90,
                 thick=0.16, overhang=0.28, snow_thick=0.26, snow_over=0.08, snow_bevel=0.08)

    # Symmetric wings
    for sx in (-1, 1):
        wx = sx * (W / 2 + 3.4)
        wy, gw, gd, gh = -0.5, 6.4, 7.2, 9.6
        a.box((wx, wy, F / 2), (gw + 0.22, gd + 0.22, F), stone)
        a.box((wx, wy, F + (gh - F) / 2), (gw, gd, gh - F), wall)
        _corners(a, wx, wy, gw / 2, gd / 2, F, gh, trim)
        _band(a, wx, wy, gw, gd, BAND, trim)
        _band(a, wx, wy, gw, gd, 7.5, trim)
        a.gable_end((wx, wy, gh), gd + 0.3, gw, 3.0, wall, rz=90)
        a.gable_roof((wx, wy, gh), gd + 0.3, gw, 3.0, roof, rz=90,
                     thick=0.2, overhang=0.42, snow_thick=0.34, snow_over=0.1, snow_bevel=0.1)
        wcols = (wx - 1.45, wx + 1.45)
        for z, h in ((Z1, WIN_H), (Z2, WIN_H), (Z3, WIN_H3)):
            _wins(a, wy - gd / 2, '-Y', wcols, z, 1.4, h, trim)
        face = '+X' if sx > 0 else '-X'
        for z, h in ((Z1, WIN_H), (Z2, WIN_H), (Z3, WIN_H3)):
            a.window((wx + sx * gw / 2, wy, z), 1.5, h, face, frame=trim)
        _ribbon_balcony(a, wx - 2.0, wx + 2.0, wy - gd / 2, 1.25, BALC, timber, snow)

    # Cupola
    cz = H + 7.0
    a.box((0, 0, cz + 0.65), (2.5, 2.5, 1.4), trim)
    for face, (x, y) in {
        '-Y': (0, -1.1), '+Y': (0, 1.1), '-X': (-1.1, 0), '+X': (1.1, 0)
    }.items():
        a.window((x, y, cz + 0.7), 0.85, 0.75, face, sill=False, mullion=False, frame=trim)
    a.box((0, 0, cz + 1.45), (1.0, 1.0, 0.6), glow)
    a.cyl((0, 0, cz + 1.35), 1.75, 0.0, 1.2, 4, roof, rot=(0, 0, 45))
    a.cyl((0, 0, cz + 1.85), 0.65, 0.0, 0.65, 4, snow, rot=(0, 0, 45))
    a.box((0, 0, cz + 2.3), (0.1, 0.1, 0.95), steel)
    a.sphere((0, 0, cz + 2.8), 0.18, snow)
