import { describe, expect, it } from "vitest";
import { checkLiftLine, checkSpacing, REFERENCE_TOPS, rulesFor, type LiftLine } from "./descent";
import { DUTCH_HILL } from "./mountains/dutchHill";
import { createTerrain, TERRAIN, type XZ } from "./terrain";
import { liftCost } from "./types";

const UNIT = createTerrain(DUTCH_HILL, { horizontal: 1, vertical: 1 });
const T63 = TERRAIN;
const worldLine = (t: typeof T63, l: LiftLine): LiftLine => ({ bottom: t.toWorld(l.bottom), top: t.toWorld(l.top) });

/** TERRAIN.height on a 20 x 20 lattice over the bounds (cell centres), including the wider B1 shoulders. */
const GOLDEN_HEIGHTS: number[] = [
  -43.0836, -33.2276, -24.651600000000006, -17.355600000000003,
  -11.3396, -6.603600000000001, -3.1476, -0.9716,
  -0.07559999999999997, -0.001100845647656952, -0.1392633439767456, 0.09404473455377782,
  -0.057530719412879905, 0.11871792366106722, 0.1338566775395778, 0.1225635577414849,
  0.14035441559055678, 0.1, 0.1, 0.1,
  -43.0836, -33.2276, -24.651600000000006, -17.355600000000003,
  -11.3396, -6.603600000000001, -3.1476, -0.9716,
  -0.07559999999999997, 0.00043769012057436746, -0.03934061099497955, 0.0883837358700057,
  0.18482637554801684, 0.02098999762759035, 0.0899148844649552, 0.11119713601575351,
  0.09482208733638806, 0.1, 0.1, 0.1,
  -43.082523908294775, -33.2276, -24.651600000000006, -17.355600000000003,
  -11.3396, -6.603600000000001, -3.1476, -0.9716,
  -0.07559999999999997, -0.024633500948684047, 0.037485409865985, 0.06953026584825624,
  0.004081266396597907, 0.053340516792181235, 0.037737421148287764, 0.11394620899033779,
  0.1, 0.1, 0.1, 0.1,
  -42.817236551338816, -33.0409539858611, -24.532947430818822, -17.294364543595602,
  -11.326373259156531, -6.603600000000001, -3.1476, -0.9716,
  -0.07559999999999997, 0.01650805227987151, -0.03913322636052863, 0.09411486128299042,
  0.06142143231300476, 0.19615809417642371, 0.047648278695698446, 0.1,
  0.1, 0.1, 0.1, 0.1,
  -42.31988438293272, -32.604263904901885, -24.153401480404916, -16.967786462085567,
  -11.048152853920936, -6.395422873715212, -3.0106508793002216, -0.894970735281402,
  -0.04954878346376926, -0.047148652149677395, -0.08609248999820349, 0.17579464538915535,
  0.04537170017249886, -0.03883392035770836, 0.09940870385587838, 0.1,
  0.1, 0.1, 0.1, 0.1,
  -41.547903981362225, -31.895404395168008, -23.5093426137892, -16.388729720112938,
  -10.532941329093816, -5.94172516043364, -2.6151797142161612, -0.5537144795898177,
  0.24200075991023504, 0.03329829586801514, -0.04088817084952455, 0.011056156760266334,
  -0.013595900582016845, 0.08319442704354692, 0.1, 0.1,
  0.1, 0.1, 0.1, 0.1,
  -40.55415863145224, -30.944801767220547, -22.607119029354163, -15.540451748449899,
  -9.743445871961256, -5.214593547376803, -1.9525227012061386, 0.043853258538475215,
  0.7752710821347278, 0.2700852373462856, 0.05440954672514495, 0.0074851802527258066,
  0.17607983726245133, 0.10000000000000012, 0.1, 0.1,
  0.1, 0.1, 0.1, 0.1,
  -39.64286455102041, -29.840925334495452, -21.51741346195674, -14.494865700214813,
  -8.738082486071288, -4.251183879085474, -1.0358955396455158, 0.9083043694098891,
  1.5846842912984715, 0.8446402800668226, -0.05362548120690851, 0.20104506011958484,
  0.10000000082717264, 0.10000000000003756, 0.1, 0.1,
  0.1, 0.1, 0.1, 0.1,
  -40.1952766224503, -30.0642941524833, -21.251245938215764, -13.912307816326532,
  -7.8928106734680785, -3.187874771091055, 0.06701488831635105, 1.973383723162587,
  2.6931232507871936, 1.9249847733302705, 0.18479048107736606, 0.11927594847140863,
  0.10000002885427439, 0.10000000000130999, 0.1, 0.1,
  0.1, 0.1, 0.1, 0.1,
  -41.24515368358409, -31.1588339163025, -22.343642557186985, -14.800119618724796,
  -8.527008046444823, -3.520365180994639, 0.20666414587970783, 2.4906105451541096,
  3.7026848673056416, 3.195116627726914, 0.6921519078087883, 0.10018172968793679,
  0.10000010051009468, 0.10000000000456316, 0.10000000000000002, 0.1,
  0.1, 0.1, 0.1, 0.1,
  -42.09926148775485, -32.06633190939512, -23.298937182968448, -15.798101947787696,
  -9.565154412189358, -4.601594057435743, -0.9087706921232317, 1.5216655162060835,
  2.779531695022729, 2.6280364153071663, 0.6812596141061426, 0.10006449483028484,
  0.10000003496293981, 0.10000000000158728, 0.1, 0.1,
  0.1, 0.1, 0.1, 0.1,
  -42.685018757991564, -32.717136177052716, -24.014438016003275, -16.576463379487173,
  -10.40305375070166, -5.494395268054217, -1.8510418952347787, 0.5264009505834291,
  1.6405459368307116, 1.2592203385514855, 0.287129217738825, 0.10000258191961926,
  0.10000000121473088, 0.10000000000005514, 0.1, 0.1,
  0.1, 0.1, 0.1, 0.1,
  -43.01687444790741, -33.102416134044105, -24.457260966876557, -17.080265853934034,
  -10.970358176092317, -6.126587536168426, -2.5481813993512543, -0.23460064618861387,
  0.8144150882177769, 0.3818345667048533, 0.019402512371637454, 0.05404635472436084,
  0.1000000000042124, 0.1000000000000002, 0.1, 0.1,
  0.1, 0.1, 0.1, 0.1,
  -43.0836, -33.2276, -24.651600000000006, -17.350195493516793,
  -11.287775564309648, -6.4961590592280665, -2.974178656655931, -0.7206798433568122,
  0.2654351912303892, 0.05924520701723379, -0.12998413505479053, 0.04145473160220068,
  0.10000000000000146, 0.1, 0.1, 0.1,
  0.1, 0.1, 0.1, 0.1,
  -43.0836, -33.2276, -24.651600000000006, -17.355600000000003,
  -11.3396, -6.603600000000001, -3.1476, -0.9716,
  -0.03792609450951781, -0.01217905670945301, -0.025877305756154382, 0.0968069838783284,
  0.16385111410433895, 0.1, 0.1, 0.1,
  0.1, 0.1, 0.1, 0.1,
  -43.0836, -33.2276, -24.651600000000006, -17.355600000000003,
  -11.3396, -6.603600000000001, -3.1476, -0.9716,
  -0.07559999999999997, -0.14402565762856143, 0.04140106458163524, 0.20605170309335674,
  0.11402285013981112, 0.10037964956191314, 0.1, 0.1,
  0.1, 0.1, 0.1, 0.1,
  -43.0836, -33.2276, -24.651600000000006, -17.355600000000003,
  -11.3396, -6.603600000000001, -3.1476, -0.9716,
  -0.07559999999999997, -0.05795940701389275, -0.12607063367985422, 0.10156757472507495,
  -0.016409855970859477, 0.03324065123988848, 0.1, 0.1,
  0.1, 0.1, 0.1, 0.1,
  -43.0836, -33.2276, -24.651600000000006, -17.355600000000003,
  -11.3396, -6.603600000000001, -3.1476, -0.9716,
  -0.07559999999999997, -0.18157184349968833, 0.007093699995194366, 0.021361533688222606,
  0.13149967827657602, 0.021637592247061965, 0.09073361830058235, 0.1,
  0.1, 0.1, 0.1, 0.1,
  -43.0836, -33.2276, -24.651600000000006, -17.355600000000003,
  -11.3396, -6.603600000000001, -3.1476, -0.9716,
  -0.07559999999999997, 0.049990430628136365, -0.07499046623198978, 0.16371820256090283,
  0.16247569829543945, 0.18726111330248718, 0.03443253709597616, 0.1,
  0.1, 0.1, 0.1, 0.1,
  -43.0836, -33.2276, -24.651600000000006, -17.355600000000003,
  -11.3396, -6.603600000000001, -3.1476, -0.9716,
  -0.07559999999999997, -0.05432029790209889, -0.15571727926187884, 0.043557488553383164,
  0.2618292586039114, 0.06605564764440852, 0.1831166123556995, 0.11094156391550397,
  0.1, 0.1, 0.1, 0.1,
];

describe("world scale: golden heights", () => {
  it("a 1/1 terrain reproduces the reference design heights exactly", () => {
    const t = createTerrain(DUTCH_HILL, { horizontal: 1, vertical: 1 });
    const b = t.bounds;
    let k = 0;
    for (let i = 0; i < 20; i++) {
      for (let j = 0; j < 20; j++) {
        const x = b.xMin + ((i + 0.5) / 20) * (b.xMax - b.xMin);
        const z = b.zMin + ((j + 0.5) / 20) * (b.zMax - b.zMin);
        expect(t.height(x, z)).toBe(GOLDEN_HEIGHTS[k++]);
      }
    }
    expect(k).toBe(400);
  });

  it("the default TERRAIN is Dutch Hill at 6/3", () => {
    expect(TERRAIN.scale).toEqual({ horizontal: 6, vertical: 3 });
  });
});

describe("world scale: terrain transform", () => {
  it("scales bounds and base by H and heights by V", () => {
    expect(T63.bounds).toEqual({ xMin: -144, xMax: 144, zMin: -120, zMax: 120 });
    expect(T63.base.x).toBeCloseTo(0.45 * 6, 12);
    expect(T63.base.z).toBeCloseTo(2.55 * 6, 12);
    expect(T63.height(-1.1 * 6, -2 * 6)).toBeCloseTo(3 * UNIT.height(-1.1, -2), 12);
  });

  it("toWorld and toDesign are inverses", () => {
    const p = { x: -1.3, z: 0.7 };
    const q = T63.toDesign(T63.toWorld(p));
    expect(q.x).toBeCloseTo(p.x, 12);
    expect(q.z).toBeCloseTo(p.z, 12);
    expect(T63.toWorld(p).x).toBeCloseTo(-7.8, 12);
    expect(T63.toWorld(p).z).toBeCloseTo(4.2, 12);
  });
});

describe("world scale: rulesFor", () => {
  it("returns the design constants at 1/1", () => {
    expect(rulesFor(UNIT)).toEqual({
      minLiftVertical: 0.85,
      maxLiftLength: 3.4,
      maxLoadGrade: 1.25,
      baseAreaRadius: 0.6,
      minTopSpacing: 0.8,
      minLineClearance: 0.4,
    });
  });

  it("scales by H, V and V / H at 6/3", () => {
    const r = rulesFor(T63);
    expect(r.maxLiftLength).toBeCloseTo(20.4, 12);
    expect(r.baseAreaRadius).toBeCloseTo(3.6, 12);
    expect(r.minTopSpacing).toBeCloseTo(4.8, 12);
    expect(r.minLineClearance).toBeCloseTo(2.4, 12);
    expect(r.minLiftVertical).toBeCloseTo(2.55, 12);
    expect(r.maxLoadGrade).toBeCloseTo(0.625, 12);
  });
});

describe("world scale: placement invariance", () => {
  it("checkLiftLine at 6/3 on world lines matches the 1/1 result on design lines", { timeout: 20_000 }, () => {
    const uBase = UNIT.base;
    const bottoms: XZ[] = [
      { x: uBase.x, z: uBase.z },
      { x: uBase.x + 0.3, z: uBase.z },
      { x: uBase.x - 0.3, z: uBase.z + 0.2 },
      { x: uBase.x, z: uBase.z - 0.4 },
      { x: uBase.x + 0.05, z: uBase.z + 0.5 },
    ];
    const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
    let total = 0;
    let skipped = 0;
    const seen = new Set<string>();
    for (const bottom of bottoms) {
      for (let i = -40; i <= 50; i++) {
        for (let j = -20; j <= 60; j++) {
          const top = { x: i / 10, z: j / 10 };
          const line = { bottom, top };
          total++;
          const len = Math.hypot(top.x - bottom.x, top.z - bottom.z);
          const vert = UNIT.height(top.x, top.z) - UNIT.height(bottom.x, bottom.z);
          const edge =
            near(len, 3.4) ||
            near(vert, 0.85) ||
            near(Math.hypot(bottom.x - uBase.x, bottom.z - uBase.z), 0.6) ||
            near(UNIT.grade(bottom.x, bottom.z), 1.25) ||
            near(UNIT.grade(top.x, top.z), 1.25);
          if (edge) {
            skipped++;
            continue;
          }
          const a = checkLiftLine(line, UNIT);
          const b = checkLiftLine(worldLine(T63, line), T63);
          expect(b.ok).toBe(a.ok);
          if (!a.ok && !b.ok) expect(b.reason).toBe(a.reason);
          seen.add(a.ok ? "ok" : a.reason);
        }
      }
    }
    expect(skipped / total).toBeLessThan(0.005);
    // The lattice exercises every terrain reason that can occur from the base area.
    for (const r of ["ok", "too_steep", "too_low", "too_long"]) expect(seen.has(r)).toBe(true);
  });
});

describe("world scale: cost and spacing", () => {
  const MID = REFERENCE_TOPS[1];
  const midDesign = { x: 0.8, z: 0.6 };
  const lineU = (top: XZ): LiftLine => ({ bottom: UNIT.base, top });
  const lineW = (top: XZ): LiftLine => ({ bottom: TERRAIN.base, top });

  it("prices the chair at Mid at $2,500 at 1/1 and on the world line at 6/3", () => {
    expect(liftCost("chair", lineU(midDesign), UNIT)).toBe(2500);
    expect(liftCost("chair", lineW(MID), T63)).toBe(2500);
  });

  it("gives equal spacing results for every reference pair", () => {
    for (const a of REFERENCE_TOPS.slice(0, 2)) {
      for (const b of REFERENCE_TOPS.slice(0, 2)) {
        const da = UNIT.toDesign(a);
        const db = UNIT.toDesign(b);
        const la = lineU(da);
        const lb = lineU(db);
        const d = checkSpacing(la, [{ line: lb, type: "chair" }], UNIT);
        const w = checkSpacing(lineW(a), [{ line: lineW(b), type: "chair" }], T63);
        expect(w).toEqual(d);
      }
    }
  });
});

describe("world scale: pitch and grade", () => {
  const a = UNIT.toDesign(REFERENCE_TOPS[0]);
  const b = UNIT.base;
  const path = Array.from({ length: 41 }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / 40, z: a.z + ((b.z - a.z) * i) / 40 }));

  it("sustainedPitch scales by V / H", () => {
    const d = UNIT.sustainedPitch(path);
    const w = T63.sustainedPitch(path.map((p) => T63.toWorld(p)));
    expect(Math.abs((w * 6) / 3 - d) / Math.abs(d)).toBeLessThan(1e-9);
  });

  it("gradeAlong has equal sample counts and values scaled by V / H", () => {
    const d = UNIT.gradeAlong(a, b);
    const w = T63.gradeAlong(T63.toWorld(a), T63.toWorld(b));
    expect(w).toHaveLength(d.length);
    d.forEach((v, i) => expect(Math.abs(w[i] * 2 - v)).toBeLessThan(1e-9 * Math.max(1, Math.abs(v))));
  });
});

describe("world scale: feet per unit", () => {
  const units = (t: typeof T63) =>
    t.height(t.toWorld(DUTCH_HILL.summit).x, t.toWorld(DUTCH_HILL.summit).z) -
    t.height(t.base.x, t.base.z);

  it("feetPerUnit maps the base-to-summit height to verticalFeet at both scales", () => {
    expect(TERRAIN.feetPerUnit * units(TERRAIN)).toBeCloseTo(570, 6);
    expect(T63.feetPerUnit * units(T63)).toBeCloseTo(570, 6);
    expect(T63.feetPerUnit).toBeCloseTo(UNIT.feetPerUnit / 3, 9);
  });

  it("horizontalFeetPerUnit is 420 at 1/1 and 70 at 6/3", () => {
    expect(TERRAIN.horizontalFeetPerUnit).toBe(70);
    expect(T63.horizontalFeetPerUnit).toBe(70);
    expect(createTerrain(DUTCH_HILL, { horizontal: 1, vertical: 1 }).horizontalFeetPerUnit).toBe(420);
  });
});

describe("world scale: reference tops", () => {
  const design = [
    { label: "Ridge", x: -1.2, z: 0.2 },
    { label: "Mid", x: 0.8, z: 0.6 },
    { label: "Creek", x: -0.2, z: 1.0 },
  ] as const;

  it("stores REFERENCE_TOPS as exact world literals", () => {
    for (let i = 0; i < design.length; i++) {
      const w = TERRAIN.toWorld(design[i]);
      expect(REFERENCE_TOPS[i].x).toBeCloseTo(w.x, 9);
      expect(REFERENCE_TOPS[i].z).toBeCloseTo(w.z, 9);
    }
  });
});
