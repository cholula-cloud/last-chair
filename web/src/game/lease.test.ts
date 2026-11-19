import { describe, expect, it } from "vitest";
import { createBuiltHill } from "./__fixtures__/built-hill";
import { checkLiftLine, placementReason, REFERENCE_TOPS } from "./descent";
import { gunPlacementReason } from "./guns";
import {
  depthInsideLease,
  distanceOutsideLease,
  footprintOnLease,
  leaseBounds,
  OFF_LEASE_MESSAGE,
  onLease,
  pointInPolygon,
  polygonBounds,
  segmentOnLease,
} from "./lease";
import { DUTCH_HILL_SHOULDERS } from "./mountains/dutchHill";
import { DUTCH_HILL_SITE } from "./mountains/dutchHill.site";
import { ASSET_CATALOG, previewAssetPlacement } from "./base";
import { migrate } from "./migrations";
import { SAVE_VERSION, toPersisted } from "./state";
import { previewPaintedTrail } from "./paintedTrail";
import { checkAssetPlacement, checkGunPlacement, checkPlacement, pickFounder } from "./rules";
import { TERRAIN } from "./terrain";

const square = [{ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 10, z: 10 }, { x: 0, z: 10 }];
// An L shape: the corner at (10, 10) is outside.
const ell = [{ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 10, z: 5 }, { x: 5, z: 5 }, { x: 5, z: 10 }, { x: 0, z: 10 }];
const lease = TERRAIN.lease!;
const FAR_OUT = { x: 100, z: 0 };

describe("point in polygon", () => {
  it("accepts inside points, edges and corners, and rejects outside points", () => {
    expect(pointInPolygon({ x: 5, z: 5 }, square)).toBe(true);
    expect(pointInPolygon({ x: 10, z: 4 }, square)).toBe(true);
    expect(pointInPolygon({ x: 0, z: 0 }, square)).toBe(true);
    expect(pointInPolygon({ x: 10.01, z: 5 }, square)).toBe(false);
    expect(pointInPolygon({ x: -1, z: -1 }, square)).toBe(false);
  });

  it("handles a concave polygon", () => {
    expect(pointInPolygon({ x: 2, z: 8 }, ell)).toBe(true);
    expect(pointInPolygon({ x: 8, z: 8 }, ell)).toBe(false);
    expect(pointInPolygon({ x: 8, z: 2 }, ell)).toBe(true);
  });

  it("rejects non-finite points and degenerate polygons", () => {
    expect(pointInPolygon({ x: NaN, z: 1 }, square)).toBe(false);
    expect(pointInPolygon({ x: 1, z: Infinity }, square)).toBe(false);
    expect(pointInPolygon({ x: 0, z: 0 }, square.slice(0, 2))).toBe(false);
  });

  it("measures bounds and distances", () => {
    expect(polygonBounds(ell)).toEqual({ xMin: 0, xMax: 10, zMin: 0, zMax: 10 });
  });
});

describe("the Dutch Hill lease", () => {
  it("is a simple polygon of 6 to 10 points", () => {
    expect(lease.length).toBeGreaterThanOrEqual(6);
    expect(lease.length).toBeLessThanOrEqual(10);
    const cross = (a: typeof lease[0], b: typeof lease[0], c: typeof lease[0]) =>
      (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
    const n = lease.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 2; j < n; j++) {
        if (i === 0 && j === n - 1) continue;
        const [a, b, c, d] = [lease[i], lease[(i + 1) % n], lease[j], lease[(j + 1) % n]];
        const crosses = cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0;
        expect(crosses).toBe(false);
      }
    }
  });

  it("holds the lodge, base, village and every lift anchor with margin", () => {
    const { buildings, arrival, road } = DUTCH_HILL_SITE;
    const points = [
      TERRAIN.base,
      TERRAIN.toWorld(TERRAIN.def.summit),
      buildings.lodge, buildings.cafe, buildings.shop, buildings.warmingHut, buildings.snowcat,
      ...buildings.houses.map((h) => h.at),
      arrival.center,
      { x: road.xFrom, z: road.z }, { x: road.xTo, z: road.z },
      ...REFERENCE_TOPS,
      ...DUTCH_HILL_SHOULDERS.map((point) => TERRAIN.toWorld(point)),
    ];
    for (const p of points) {
      expect(onLease(p)).toBe(true);
      expect(depthInsideLease(p)).toBeGreaterThanOrEqual(3);
    }
    for (const anchor of [...REFERENCE_TOPS, ...DUTCH_HILL_SHOULDERS.map((point) => TERRAIN.toWorld(point))]) {
      expect(depthInsideLease(anchor)).toBeGreaterThanOrEqual(8);
    }
  });

  it("is a part of the map, not the whole of it", () => {
    const b = leaseBounds();
    expect(b.xMax - b.xMin).toBeLessThan(TERRAIN.bounds.xMax - TERRAIN.bounds.xMin);
    expect(b.zMax - b.zMin).toBeLessThan(TERRAIN.bounds.zMax - TERRAIN.bounds.zMin);
    expect(onLease({ x: TERRAIN.bounds.xMax - 1, z: 0 })).toBe(false);
    expect(onLease({ x: 0, z: TERRAIN.bounds.zMin + 1 })).toBe(false);
  });

  it("reports distance beyond the edge and depth inside it", () => {
    expect(distanceOutsideLease(TERRAIN.base)).toBe(0);
    expect(depthInsideLease(FAR_OUT)).toBe(0);
    expect(distanceOutsideLease(FAR_OUT)).toBeGreaterThan(50);
  });

  it("treats a terrain without a lease as buildable everywhere", () => {
    const open = { ...TERRAIN, lease: undefined };
    expect(onLease(FAR_OUT, open)).toBe(true);
    expect(onLease({ x: NaN, z: 0 }, open)).toBe(false);
    expect(leaseBounds(open)).toEqual(TERRAIN.bounds);
  });

  it("checks a segment by sampling along it", () => {
    expect(segmentOnLease(TERRAIN.base, REFERENCE_TOPS[0])).toBe(true);
    expect(segmentOnLease(TERRAIN.base, FAR_OUT)).toBe(false);
  });
});

describe("placement rules refuse land outside the lease", () => {
  const state = { ...pickFounder(createBuiltHill(7), "elena"), cash: 50_000, lodgeTier: 2 as const };

  it("refuses a lift terminal outside the lease before any other rule", () => {
    expect(checkLiftLine({ bottom: TERRAIN.base, top: FAR_OUT })).toEqual({ ok: false, reason: "off_lease" });
    expect(checkPlacement(state, "chair", { bottom: TERRAIN.base, top: FAR_OUT })).toEqual({ ok: false, reason: "off_lease" });
    // Inside the map but past the lease edge: still off the lease, not off the map.
    const inMap = { x: TERRAIN.bounds.xMax - 5, z: 0 };
    expect(checkLiftLine({ bottom: TERRAIN.base, top: inMap }).ok).toBe(false);
    expect(checkLiftLine({ bottom: TERRAIN.base, top: inMap })).toMatchObject({ reason: "off_lease" });
    expect(placementReason("off_lease")).toBe(OFF_LEASE_MESSAGE);
    expect(OFF_LEASE_MESSAGE).toBe("Outside the Dutch Hill lease. Build inside the dashed line.");
  });

  it("still accepts the reference lifts", () => {
    expect(checkLiftLine({ bottom: TERRAIN.base, top: REFERENCE_TOPS[1] }, TERRAIN, "chair").ok).toBe(true);
  });

  it("refuses a lift whose terminals are inside but whose line leaves a concave lease", () => {
    const concave = { ...TERRAIN, lease: ell };
    const a = { x: 4, z: 9 };
    const b = { x: 9, z: 4 };
    expect(onLease(a, concave) && onLease(b, concave)).toBe(true);
    expect(segmentOnLease(a, b, concave)).toBe(false);
  });

  it("refuses base assets outside the lease", () => {
    expect(previewAssetPlacement("cafe", FAR_OUT, 2, [])).toEqual({ ok: false, reason: OFF_LEASE_MESSAGE });
    expect(checkAssetPlacement(state, "cafe", FAR_OUT)).toEqual({ ok: false, reason: OFF_LEASE_MESSAGE });
  });

  it("refuses snow guns outside the lease", () => {
    expect(gunPlacementReason(FAR_OUT, [])).toBe("off_lease");
    expect(checkGunPlacement(state, FAR_OUT)).toEqual({ ok: false, reason: OFF_LEASE_MESSAGE });
    expect(checkGunPlacement(state, { x: NaN, z: 0 })).toEqual({ ok: false, reason: "That spot is off the map." });
  });

  it("refuses a painted trail that leaves the lease, naming the lease", () => {
    const top = state.lifts[0].anchor;
    const out = { x: lease.reduce((m, p) => Math.min(m, p.x), 0) - 12, z: top.z + 4 };
    const preview = previewPaintedTrail(state, [{ points: [top, { x: (top.x + out.x) / 2, z: top.z + 2 }, out], widthFt: 60 }]);
    expect(preview.reason).toBe(OFF_LEASE_MESSAGE);
    expect(preview.problemSegments.length).toBeGreaterThan(0);
  });
});

describe("saves and footprints", () => {
  const small = [{ x: -3, z: -3 }, { x: 3, z: -3 }, { x: 3, z: 3 }, { x: -3, z: 3 }];

  it("keeps a saved lift that stands outside the lease, while a new one is refused", () => {
    const built = createBuiltHill(7);
    const saved = JSON.parse(JSON.stringify(toPersisted(built)));
    const original = TERRAIN.lease;
    (TERRAIN as { lease?: unknown }).lease = small;
    try {
      expect(checkLiftLine({ bottom: TERRAIN.base, top: REFERENCE_TOPS[0] }, TERRAIN, "surface")).toEqual({ ok: false, reason: "off_lease" });
      const loaded = migrate(saved, SAVE_VERSION);
      expect(loaded.reset).toBe(false);
      expect(loaded.state?.lifts).toHaveLength(built.lifts.length);
    } finally {
      (TERRAIN as { lease?: unknown }).lease = original;
    }
  });

  it("refuses an asset whose footprint crosses the lease edge even when its centre is inside", () => {
    const poly = TERRAIN.lease!;
    const edge = { x: (poly[5].x + poly[6].x) / 2, z: poly[5].z };
    const { width, depth } = ASSET_CATALOG.cafe.footprint;
    expect(footprintOnLease({ x: edge.x, z: edge.z - 0.05 }, width, depth)).toBe(false);
    expect(onLease({ x: edge.x, z: edge.z - 0.05 })).toBe(true);
    expect(previewAssetPlacement("cafe", { x: edge.x, z: edge.z - 0.05 }, 2, [])).toEqual({ ok: false, reason: OFF_LEASE_MESSAGE });
    expect(footprintOnLease({ x: edge.x, z: edge.z - 5 }, width, depth)).toBe(true);
  });

  it("does not flag the segments of an existing trail that runs past the lease", () => {
    const state = createBuiltHill(7);
    const trail = state.trails[0];
    const original = TERRAIN.lease;
    (TERRAIN as { lease?: unknown }).lease = small;
    try {
      const preview = previewPaintedTrail(state, [{ points: trail.path, widthFt: 60 }]);
      expect(preview.reason).not.toBe(OFF_LEASE_MESSAGE);
    } finally {
      (TERRAIN as { lease?: unknown }).lease = original;
    }
  });
});
