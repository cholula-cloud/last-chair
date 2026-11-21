"""Theme packs: aframe60s, adirondack, sugarhouse.

Each pack exports lodge-tier-1/2/3, lodge-annex-2/3, cafe, ski-shop, rental-shop,
warming-hut, waffle-haus, ski-school-desk with style/styleOf for manifest v2.

Metres, Blender +Z up, front = -Y.
  sys.path.insert(0, "<repo>/tools/blender"); import themes_pack as m; m.build_all(out)
"""
import os
import lib
from lib import *
import lodge_tier_layout as layout

THEMES = {
    "aframe60s": {
        "wall": "timber-brown",
        "trim": "steel",
        "roof": "slate-roof",
        "accent": "amber-accent",
        "stone": "stone-grey",
        "stone_d": "stone-dark",
        "bat": "timber-dark",
        "label": "1960s A-frame",
        "prism": True,
    },
    "adirondack": {
        "wall": "timber-dark",
        "trim": "timber-brown",
        "roof": "slate-roof",
        "accent": "cream-sign",
        "stone": "stone-dark",
        "stone_d": "stone-grey",
        "bat": "timber-brown",
        "label": "Adirondack camp",
        "prism": False,
        "wide_eave": True,
    },
    "sugarhouse": {
        "wall": "clapboard-white",
        "trim": "syrup-amber",
        "roof": "barn-red",
        "accent": "syrup-amber",
        "stone": "stone-grey",
        "stone_d": "stone-dark",
        "bat": "timber-brown",
        "label": "Vermont sugarhouse",
        "prism": False,
        "cupola": True,
        "bands": True,
    },
}

PALETTE.setdefault("syrup-amber", ("#c4782a", 0.7))
PALETTE.setdefault("waffle-cream", ("#f0e0c0", 0.8))
PALETTE.setdefault("log-bark", ("#4a3428", 0.95))


def _mats(t):
    return (t["wall"], t["trim"], t["roof"], t["bat"], t["stone_d"], t["stone"],
            "snow", "ski", "steel-dark", "lamp-glow")


def _gabled_shell(a, W, D, H, F, t, rise=None):
    rise = rise or (H * 0.9 if not t.get("prism") else H * 1.4)
    ov = 1.2 if t.get("wide_eave") else 0.55
    a.box((0, 0, F / 2), (W + 0.3, D + 0.3, F), t["stone"])
    if t.get("prism"):
        a.prism((0, 0, F), D, W, rise + (H - F), t["wall"], rz=90)
        a.gable_roof((0, 0, F), D, W, rise + (H - F), t["roof"], rz=90, thick=0.28,
                     overhang=ov, snow_thick=0.5, snow_over=0.15, snow_bevel=0.14)
    else:
        a.box((0, 0, F + (H - F) / 2), (W, D, H - F), t["wall"])
        if t.get("bands"):
            for i in range(4):
                a.box((0, 0, F + 0.5 + i * 0.7), (W + 0.08, D + 0.08, 0.08), t["trim"])
        for sx in (-1, 1):
            for sy in (-1, 1):
                a.box((sx * W / 2, sy * D / 2, F + (H - F) / 2), (0.28, 0.28, H - F), t["trim"])
        a.gable_end((0, 0, H), D, W, rise, t["wall"], rz=90)
        a.gable_roof((0, 0, H), D, W, rise, t["roof"], rz=90, thick=0.26, overhang=ov,
                     snow_thick=0.42, snow_over=0.12, snow_bevel=0.12)
    return rise


def _front_glaze(a, fy, H, F, rise, t):
    a.window((-2.4, fy, 2.2), 2.4, 2.0, '-Y', frame=t["trim"])
    a.window((2.4, fy, 2.2), 2.4, 2.0, '-Y', frame=t["trim"])
    a.window((0, fy, H + rise * 0.35), 1.8, 1.8, '-Y', frame=t["trim"])
    a.box((0, fy - 0.08, F + 1.25), (1.8, 0.16, 2.5), t["trim"])
    a.box((0, fy - 0.15, F + 1.15), (1.4, 0.12, 2.3), t["accent"])
    a.box((0, fy - 0.22, F + 1.5), (0.9, 0.06, 0.9), "window-glow")
    for x in (-1.2, 1.2):
        a.box((x, fy - 0.2, F + 2.3), (0.24, 0.24, 0.36), "lamp-glow")


def _deck_front(a, fy, F, t):
    dy0, dy1 = fy - 0.1, fy - 3.2
    a.box((0, (dy0 + dy1) / 2, F - 0.1), (10.0, dy0 - dy1, 0.2), t["bat"])
    for i in range(2):
        a.box((0, dy1 - 0.35 - i * 0.35, F - 0.25 - i * 0.22), (2.4, 0.4, 0.2), t["bat"])


def _cupola(a, H, rise, t):
    if not t.get("cupola"):
        return
    cz = H + rise + 0.4
    a.box((0, 0, cz + 0.5), (1.6, 1.6, 1.1), t["trim"])
    a.window((0, -0.7, cz + 0.55), 0.7, 0.6, '-Y', sill=False, mullion=False, frame=t["trim"])
    a.cyl((0, 0, cz + 1.1), 1.2, 0.0, 0.9, 4, t["roof"], rot=(0, 0, 45))
    a.cyl((0, 0, cz + 1.5), 0.5, 0.0, 0.5, 4, "snow", rot=(0, 0, 45))


def make_lodge(style, tier):
    t = THEMES[style]
    name = f"lodge-tier-{tier}-{style}"
    a = Asset(name)
    W, D, H, F = layout.LODGE_W, layout.LODGE_D, 5.2 if style != "aframe60s" else 4.0, layout.LODGE_F
    rise = _gabled_shell(a, W, D, H, F, t)
    fy = -D / 2
    _front_glaze(a, fy, H, F, rise if not t.get("prism") else rise * 0.5, t)
    # Tier 2+ layout owns the approach deck — skip base deck clutter.
    if tier < 2:
        _deck_front(a, fy, F, t)
    cx = W / 2 + 0.7
    a.box((cx, 1.0, 2.0), (1.6, 1.8, 3.5), t["stone"])
    a.box((cx, 1.0, 8.0), (1.3, 1.4, 8.0), t["stone"])
    a.box((cx, 1.0, 12.2), (1.5, 1.5, 0.3), t["stone_d"])
    a.box((cx, 1.0, 12.5), (1.3, 1.3, 0.28), "snow", bevel=0.1)
    if tier >= 2:
        layout.tier2_front_bay(a, _mats(t), W, D, F, include_deck=(tier < 3))
    if tier >= 3:
        layout.tier3_front_grand(a, _mats(t), W, D, H, F)
        # Layout ridge lantern covers Tier 3; theme cupola only on T1/T2 sugarhouse.
    else:
        _cupola(a, H, rise if not t.get("prism") else 6.0, t)
    return a.finish()


def make_annex(style, tier):
    t = THEMES[style]
    name = f"lodge-annex-{tier}-{style}"
    a = Asset(name)
    W, D, H, F = layout.LODGE_W, layout.LODGE_D, layout.LODGE_H, layout.LODGE_F
    if tier == 2:
        layout.tier2_front_bay(a, _mats(t), W, D, F)
    else:
        layout.tier3_front_grand(a, _mats(t), W, D, H, F)
    return a.finish()


def make_venue(style, kind):
    t = THEMES[style]
    specs = {
        "cafe": (7.0, 6.0, 3.4, 0.35, 3.8),
        "ski-shop": (6.4, 5.2, 3.4, 0.35, 3.6),
        "rental-shop": (6.6, 5.6, 3.3, 0.35, 3.4),
        "warming-hut": (4.0, 3.2, 2.4, 0.2, 2.6),
        "waffle-haus": (7.2, 6.2, 3.5, 0.4, 4.4),
        "ski-school-desk": (5.0, 3.8, 2.7, 0.3, 2.4),
    }
    W, D, H, F, rise = specs[kind]
    a = Asset(f"{kind}-{style}")
    a.box((0, 0, F / 2), (W + 0.2, D + 0.2, F), t["stone"])
    a.box((0, 0, F + (H - F) / 2), (W, D, H - F), t["wall"])
    if t.get("bands") and kind != "warming-hut":
        for i in range(3):
            a.box((0, 0, F + 0.4 + i * 0.65), (W + 0.06, D + 0.06, 0.07), t["trim"])
    for sx in (-1, 1):
        for sy in (-1, 1):
            a.box((sx * W / 2, sy * D / 2, F + (H - F) / 2), (0.22, 0.22, H - F), t["trim"])
    a.gable_end((0, 0, H), D, W, rise, t["wall"], rz=90)
    a.gable_roof((0, 0, H), D, W, rise, t["roof"], rz=90, thick=0.2,
                 overhang=0.9 if t.get("wide_eave") else 0.45,
                 snow_thick=0.36, snow_over=0.12, snow_bevel=0.12)
    fy = -D / 2
    a.window((-1.2, fy, 1.8), 2.4, 1.6, '-Y', frame=t["trim"])
    a.box((1.9, fy - 0.05, F + 1.1), (1.25, 0.14, 2.2), t["trim"])
    a.box((1.9, fy - 0.12, F + 1.0), (0.95, 0.1, 2.0), t["accent"])
    a.box((1.9, fy - 0.18, F + 1.4), (0.5, 0.05, 0.7), "window-glow")
    sign_m = t["accent"]
    a.box((0, fy - 0.14, H + 0.9), (3.2, 0.12, 0.95), sign_m)
    a.box((0, fy - 0.2, H + 0.9), (2.9, 0.06, 0.7), "cream-sign")
    if kind == "cafe":
        a.box((0.2, fy - 2.2, 0.08), (5.8, 3.8, 0.14), t["bat"])
        for tx in (-1.4, 0.2, 1.8):
            a.cyl((tx, fy - 2.5, 0.12), 0.05, 0.05, 0.8, 5, "shutter-black")
            a.cyl((tx, fy - 2.5, 0.92), 0.38, 0.38, 0.06, 8, "shutter-black")
    if kind == "rental-shop":
        a.box((0, fy - 0.5, F + 0.5), (4.4, 0.6, 0.9), t["bat"])
        a.box((-W / 2 - 1.0, fy - 0.7, 0.35), (1.6, 2.2, 0.65), t["bat"])
    if kind == "waffle-haus":
        a.box((0, fy - 2.0, 0.1), (5.6, 3.2, 0.14), t["bat"])
        a.box((0, fy - 1.3, 0.7), (3.8, 0.6, 0.8), t["accent"])
    if kind == "ski-shop":
        for x, m in ((-3.0, "amber-accent"), (-2.7, "navy"), (3.0, "jacket")):
            a.box((x, fy - 0.35, 1.0), (0.1, 0.06, 1.8), m, rot=(-10, 0, 0))
    a.box((W / 2 + 0.3, -0.8, 0.2), (1.1, 1.3, 0.4), "snow", bevel=0.12)
    return a.finish()


STYLE_OFS = [
    ("lodge-tier-1", lambda s: make_lodge(s, 1)),
    ("lodge-tier-2", lambda s: make_lodge(s, 2)),
    ("lodge-tier-3", lambda s: make_lodge(s, 3)),
    ("lodge-annex-2", lambda s: make_annex(s, 2)),
    ("lodge-annex-3", lambda s: make_annex(s, 3)),
    ("cafe", lambda s: make_venue(s, "cafe")),
    ("ski-shop", lambda s: make_venue(s, "ski-shop")),
    ("rental-shop", lambda s: make_venue(s, "rental-shop")),
    ("warming-hut", lambda s: make_venue(s, "warming-hut")),
    ("waffle-haus", lambda s: make_venue(s, "waffle-haus")),
    ("ski-school-desk", lambda s: make_venue(s, "ski-school-desk")),
]


def build_all(out=None, export_glb=True, styles=None):
    if out:
        lib.GLB = out
        os.makedirs(out, exist_ok=True)
    styles = styles or list(THEMES.keys())
    rows = []
    for style in styles:
        for style_of, builder in STYLE_OFS:
            ob = builder(style)
            i = info(ob)
            row = {
                "name": ob.name, "file": ob.name + ".glb", "tris": i["tris"],
                "heightMeters": i["h"], "footprintMeters": [i["fx"], i["fy"]],
                "tags": ["building"], "style": style, "styleOf": style_of,
            }
            if export_glb:
                row["sizeBytes"] = lib.export(ob.name)
            rows.append(row)
    return rows
