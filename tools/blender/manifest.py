"""Merge asset rows into web/public/models/manifest.json (manifest v2). Plain Python, no bpy.

  python3 tools/blender/manifest.py <manifest.json> <rows.json>...

Each rows file is a JSON list of v2 entries (or an object with an "assets" list). Entries are
upserted by name. A v1 manifest is converted on the way: version 2, front "+Z", recolorMaterials
becomes split when non-empty, rope and grip fields are kept, and every legacy entry gains tags.
"""
import json, os, sys

KEY_ORDER = ["name", "file", "tris", "sizeBytes", "heightMeters", "footprintMeters", "tags", "split",
             "style", "styleOf", "ropeYMeters", "ropeOffsetXMeters", "gripHeightMeters"]

LEGACY_TAGS = {
    "building": ["base-lodge", "clapboard-house", "cafe", "ski-shop", "warming-hut", "lodge-tier-2",
                 "lodge-tier-3", "lodge-annex-2", "lodge-annex-3", "a-frame-lodge", "ticket-booth",
                 "patrol-hut", "maintenance-garage"],
    "lift": ["lift-tower", "lift-terminal-bottom", "lift-terminal-top"],
    "carrier": ["t-bar", "chair-double"],
    "guest": ["skier", "skier-kid", "skier-coat", "boarder", "boarder-kid"],
    "vehicle": ["snowcat", "sedan", "wagon", "pickup"],
    "tree": ["pine-a", "pine-b", "pine-c", "birch"],
    "prop": ["snow-gun", "lamp-post"],
    "sign": ["sign-post", "area-sign"],
}
_TAG_OF = {n: t for t, names in LEGACY_TAGS.items() for n in names}


def convert_entry(e):
    """Return a v2 copy of an entry (idempotent on v2 entries)."""
    e = dict(e)
    rec = e.pop("recolorMaterials", None)
    if rec and not e.get("split"):
        e["split"] = list(rec)
    if not e.get("tags"):
        e["tags"] = [_TAG_OF.get(e.get("name"), "prop")]
    return _ordered(e)


def _ordered(e):
    out = {k: e[k] for k in KEY_ORDER if k in e}
    out.update({k: v for k, v in e.items() if k not in out})
    return out


def convert_manifest(m):
    m = dict(m)
    m["version"] = 2
    m["front"] = "+Z"
    m["assets"] = [convert_entry(a) for a in m.get("assets", [])]
    return m


def _load_rows(path):
    with open(path) as f:
        d = json.load(f)
    return d["assets"] if isinstance(d, dict) else d


def merge(rows_files, manifest_path, out_path=None):
    """Upsert rows from rows_files into manifest_path (written to out_path, default in place)."""
    with open(manifest_path) as f:
        m = convert_manifest(json.load(f))
    index = {a["name"]: i for i, a in enumerate(m["assets"])}
    for rf in rows_files:
        for row in _load_rows(rf):
            row = {k: v for k, v in row.items() if k != "bytes"}
            if "sizeBytes" not in row and "bytes" in row:
                row["sizeBytes"] = row["bytes"]
            if row["name"] in index:
                old = m["assets"][index[row["name"]]]
                m["assets"][index[row["name"]]] = convert_entry({**old, **row})
            else:
                index[row["name"]] = len(m["assets"])
                m["assets"].append(convert_entry(row))
    with open(out_path or manifest_path, "w") as f:
        json.dump(m, f, indent=2)
        f.write("\n")
    return m


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit("usage: python3 tools/blender/manifest.py <manifest.json> <rows.json>...")
    res = merge(sys.argv[2:], sys.argv[1])
    print(f"{sys.argv[1]}: version {res['version']}, {len(res['assets'])} assets")
