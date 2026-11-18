import { describe, expect, it } from "vitest";
import { checkLiftLine, checkSpacing, REFERENCE_TOPS, rulesFor, type LiftLine } from "./descent";
import { DUTCH_HILL } from "./mountains/dutchHill";
import { createTerrain, TERRAIN, type XZ } from "./terrain";
import { liftCost } from "./types";

const UNIT = createTerrain(DUTCH_HILL, { horizontal: 1, vertical: 1 });
const T63 = TERRAIN;
const worldLine = (t: typeof T63, l: LiftLine): LiftLine => ({ bottom: t.toWorld(l.bottom), top: t.toWorld(l.top) });

/** TERRAIN.height on a 20 x 20 lattice over the bounds (cell centres), recorded from the code before the scale change. */
const GOLDEN_HEIGHTS: number[] = [
  -36.28360000000293, -26.427600000002933, -17.851600000002932, -10.555600000002928,
  -4.539600000002926, 0.19639999999707314, 3.652399999997074, 5.828399999997075,
  6.7243999999970745, 6.348899154349418, 2.4665682595201917, 0.7340447345531927,
  0.582469280586535, 0.7587179236604821, 0.7738566775389927, 0.7500750725660164,
  0.7399999999994149, 0.7399999999994149, 0.7399999999994149, 0.7399999999994149,
  -36.28360000156661, -26.42760000156662, -17.85160000156662, -10.555600001566617,
  -4.5396000015666145, 0.1963999984333844, 3.6523999984333853, 5.828399998433386,
  6.724399998433386, 6.35043768855396, 2.566490991643966, 0.7283837355566829,
  0.824826375234694, 0.6609899973142676, 0.7299148841516324, 0.7399999996866772,
  0.7399999996866772, 0.7399999996866772, 0.7399999996866772, 0.7399999996866772,
  -36.28360037454676, -26.427600374546763, -17.851600374546763, -10.55560037454676,
  -4.539600374546757, 0.19639962545324163, 3.6523996254532425, 5.828399625453243,
  6.724399625453243, 6.3253661245045585, 2.6433168078517046, 0.7095301909389048,
  0.6440811914872465, 0.6933404418828298, 0.7347527598721871, 0.7399999250906486,
  0.7399999250906486, 0.7399999250906486, 0.7399999250906486, 0.7399999250906486,
  -36.283639979281915, -26.42763997928192, -17.85163997928192, -10.555639979281915,
  -4.5396399792819135, 0.19636002071808534, 3.652360020718086, 5.828360020718087,
  6.724360020718087, 6.366468072997959, 2.5666764406109297, 0.7341068654266077,
  0.701413436456622, 0.8211253961049748, 0.7399920041436173, 0.7399920041436173,
  0.7399920041436173, 0.7399920041436173, 0.7399920041436173, 0.7399920041436173,
  -36.285505236387465, -26.42950523638747, -17.85350523638747, -10.557505236387465,
  -4.541505236387463, 0.1944947636125356, 3.6504947636125364, 5.826494763612537,
  6.722494763612539, 6.300946111462861, 2.5186937152937006, 0.8154135981116626,
  0.6849906528950062, 0.7396189527225073, 0.7396189527225073, 0.7396189527225073,
  0.7396189527225073, 0.7396189527225073, 0.7396189527225073, 0.7396189527225073,
  -36.324136633202166, -26.468136633202167, -17.892136633202167, -10.596136633202164,
  -4.580136633202163, 0.15586336679783575, 3.6118633667979103, 5.787863366808729,
  6.6838633669305265, 6.342761662798543, 2.5427010883862264, 0.6429488301186832,
  0.6811698682618573, 0.7318926733595674, 0.7318926733595674, 0.7318926733595674,
  0.7318926733595674, 0.7318926733595674, 0.7318926733595674, 0.7318926733595674,
  -36.66866266558193, -26.812662665581932, -18.23666266558193, -10.940662665581929,
  -4.924662665581928, -0.188662665581651, 3.2673373349207817, 5.4433374090268485,
  6.339338243339035, 6.033348834724524, 2.44895835059617, 0.5704726433577441,
  0.6629874668838925, 0.6629874668836144, 0.6629874668836144, 0.6629874668836144,
  0.6629874668836144, 0.6629874668836144, 0.6629874668836144, 0.6629874668836144,
  -37.91665225322191, -28.06065225322192, -19.48465225322192, -12.188652253221917,
  -6.172652253221907, -1.4366522530317276, 2.0193480906461807, 4.195398781328464,
  5.091969474879853, 4.612607499627586, 1.6562056717738243, 0.42190531817588595,
  0.4133895501890634, 0.413389549998884, 0.41338954999887534, 0.41338954999887534,
  0.41338954999887534, 0.41338954999887534, 0.41338954999887534, 0.41338954999887534,
  -39.375919755326464, -29.51991975532647, -20.94391975532647, -13.647919755326466,
  -7.631919755325875, -2.895919742335448, 0.5601037329837983, 2.7395662190015644,
  3.6745481058761187, 3.208101348248189, 0.8434821774861508, 0.12160327923667476,
  0.12157980391742772, 0.12157979092700022, 0.12157979092641043, 0.12157979092641043,
  0.12157979092641043, 0.12157979092641043, 0.12157979092641043, 0.12157979092641043,
  -39.56271482463817, -29.706714824638173, -21.130714824638172, -13.834714824638171,
  -7.818714824634146, -3.0827147360269804, 0.37344538815064476, 2.5730628618024207,
  3.7349589694537833, 3.2166628010281952, 0.7951609792606784, 0.10016021380508797,
  0.10000008861119024, 0.10000000000402295, 0.10000000000000002, 0.1,
  0.1, 0.1, 0.1, 0.1,
  -39.63583809780089, -29.779838097800894, -21.203838097800894, -13.907838097800893,
  -7.89183809779815, -3.1558380374450254, 0.30027102816486595, 2.492358183334022,
  3.573342720490266, 3.2262573744111913, 0.7967407038405779, 0.10011085642649013,
  0.10000006035730483, 0.10000000000274016, 0.10000000000000002, 0.1,
  0.1, 0.1, 0.1, 0.1,
  -39.485158349964394, -29.629158349964396, -21.053158349964395, -13.757158349964394,
  -7.741158349964206, -3.0051583458591775, 0.4508490724400174, 2.627946193326589,
  3.5570609475871353, 3.442991326110422, 0.8824494826183061, 0.10001670728833242,
  0.10000000411293575, 0.10000000000018638, 0.1, 0.1,
  0.1, 0.1, 0.1, 0.1,
  -38.63368346821192, -28.777683468211926, -20.201683468211925, -12.905683468211922,
  -6.889683468211921, -2.15368346818404, 1.3023165822015588, 3.4783240638716624,
  4.374759344536023, 3.83162888373831, 1.3363797227321734, 0.26998353072616205,
  0.26998332335683906, 0.2699833233288269, 0.26998332332882563, 0.26998332332882563,
  0.26998332332882563, 0.26998332332882563, 0.26998332332882563, 0.26998332332882563,
  -37.05902098536143, -27.203020985361434, -18.627020985361433, -11.331020985361429,
  -5.315020985361427, -0.5790209853614092, 2.876979014672765, 5.0529790197158935,
  5.948979095196165, 5.633824717582535, 2.050376046659941, 0.5406281422989174,
  0.5849158029277386, 0.5849158029277196, 0.5849158029277196, 0.5849158029277196,
  0.5849158029277196, 0.5849158029277196, 0.5849158029277196, 0.5849158029277196,
  -36.397829100904005, -26.541829100904007, -17.965829100904006, -10.669829100904003,
  -4.653829100904002, 0.08217089909599729, 3.538170899096, 5.714170899096342,
  6.610170899100189, 6.223591842390806, 2.5172770898032155, 0.7139611636975304,
  0.7193212744534325, 0.7171541798191997, 0.7171541798191997, 0.7171541798191997,
  0.7171541798191997, 0.7171541798191997, 0.7171541798191997, 0.7171541798191997,
  -36.291112783894675, -26.43511278389468, -17.85911278389468, -10.563112783894676,
  -4.547112783894674, 0.188887216105325, 3.644887216105326, 5.8208872161053264,
  6.716887216105326, 6.198461558476764, 2.643110423270014, 0.844549146314422,
  0.7524679120875771, 0.7384974432210653, 0.7384974432210653, 0.7384974432210653,
  0.7384974432210653, 0.7384974432210653, 0.7384974432210653, 0.7384974432210653,
  -36.283820602263575, -26.427820602263584, -17.851820602263583, -10.55582060226358,
  -4.539820602263577, 0.19617939773642146, 3.6521793977364223, 5.828179397736423,
  6.724179397736423, 6.29181999072253, 2.4796399259355026, 0.7415234542723596,
  0.6235460235764251, 0.7168993193308626, 0.7399558795472846, 0.7399558795472846,
  0.7399558795472846, 0.7399558795472846, 0.7399558795472846, 0.7399558795472846,
  -36.28360289203778, -26.427602892037786, -17.851602892037786, -10.555602892037783,
  -4.53960289203778, 0.19639710796221888, 3.6523971079622197, 5.82839710796222,
  6.72439710796222, 6.168425264462532, 2.6129237166401955, 0.6613609552806666,
  0.77149909986902, 0.661637013839506, 0.739999421592444, 0.739999421592444,
  0.739999421592444, 0.739999421592444, 0.739999421592444, 0.739999421592444,
  -36.28360001692711, -26.42760001692712, -17.85160001692712, -10.555600016927116,
  -4.539600016927113, 0.19639998307288575, 3.6523999830728866, 5.828399983072887,
  6.724399983072887, 6.3999904137010235, 2.5308411279786904, 0.8037181991754803,
  0.8024756949100169, 0.8272611099170647, 0.690400265884611, 0.7399999966145775,
  0.7399999966145775, 0.7399999966145775, 0.7399999966145775, 0.7399999966145775,
  -36.28360000004423, -26.427600000044237, -17.851600000044236, -10.555600000044235,
  -4.539600000044233, 0.19639999995576574, 3.6523999999557666, 5.828399999955767,
  6.724399999955767, 6.295679702053668, 2.450114324212393, 0.6835574885445366,
  0.9018292585950647, 0.706055647635562, 0.823116612346853, 0.7421774407455692,
  0.7399999999911534, 0.7399999999911534, 0.7399999999911534, 0.7399999999911534,
];

describe("world scale: golden heights", () => {
  it("a 1/1 terrain reproduces the pre-scale heights exactly", () => {
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
  it("checkLiftLine at 6/3 on world lines matches the 1/1 result on design lines", () => {
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
