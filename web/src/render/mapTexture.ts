import {
  gunRadius,
  cellMark,
  MARKS,
  pitchBand,
  segmentPath,
  type MapLayer,
  type MarkId,
  type OverlayModel,
} from "@/game/mapLayers";
import { leaseBounds } from "@/game/lease";
import { COVER_MIN } from "@/game/snow";
import type { GameState } from "@/game/state";
import { TERRAIN, type XZ } from "@/game/terrain";
import { realGradeFactor, STANDARD_TRAIL_WIDTH_FT } from "@/game/trails";

const bounds = leaseBounds();
export const textureUV = (x: number, z: number) => [
  (x - bounds.xMin) / (bounds.xMax - bounds.xMin),
  (z - bounds.zMin) / (bounds.zMax - bounds.zMin),
];
const SIZE = 768;
function pixel(p: XZ) {
  const [u, v] = textureUV(p.x, p.z);
  return [u * SIZE, v * SIZE] as const;
}
function surface(size: number) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  return canvas;
}
function pattern(ctx: CanvasRenderingContext2D, id: MarkId, strong: boolean) {
  const tile = surface(18),
    brush = tile.getContext("2d")!;
  brush.fillStyle = MARKS[id].color;
  brush.fillRect(0, 0, 18, 18);
  brush.fillStyle = strong ? "#263344aa" : "#26334466";
  brush.font = "bold 12px sans-serif";
  brush.fillText(MARKS[id].glyph, 2, 13);
  return ctx.createPattern(tile, "repeat")!;
}
function line(ctx: CanvasRenderingContext2D, path: readonly XZ[]) {
  ctx.beginPath();
  path.forEach((p, i) => {
    const [x, y] = pixel(p);
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  });
}
const slopeCache = new Map<boolean, HTMLCanvasElement>();
function slopeCanvas(strong: boolean) {
  const cached = slopeCache.get(strong);
  if (cached) return cached;
  const canvas = surface(SIZE),
    ctx = canvas.getContext("2d")!;
  const step = 6,
    nx = SIZE / step;
  const heights = new Float32Array(nx * nx);
  const inks = Object.fromEntries(
    (["green", "blue", "black", "double"] as const).map((k) => [
      k,
      pattern(ctx, k, strong),
    ]),
  );
  const base = TERRAIN.height(TERRAIN.base.x, TERRAIN.base.z);
  for (let j = 0; j < nx; j++)
    for (let i = 0; i < nx; i++) {
      const x = bounds.xMin + ((i + 0.5) / nx) * (bounds.xMax - bounds.xMin);
      const z = bounds.zMin + ((j + 0.5) / nx) * (bounds.zMax - bounds.zMin);
      const band = pitchBand(TERRAIN.grade(x, z) * realGradeFactor());
      ctx.fillStyle = inks[band];
      ctx.fillRect(i * step, j * step, step, step);
      const level = ((TERRAIN.height(x, z) - base) * TERRAIN.feetPerUnit) / 50;
      heights[j * nx + i] = level;
      // Draw only the edges crossed by a 50-foot elevation boundary.
      ctx.fillStyle = "#25354caa";
      if (i && Math.floor(level) !== Math.floor(heights[j * nx + i - 1]))
        ctx.fillRect(i * step, j * step, 1, step);
      if (j && Math.floor(level) !== Math.floor(heights[(j - 1) * nx + i]))
        ctx.fillRect(i * step, j * step, step, 1);
    }
  slopeCache.set(strong, canvas);
  return canvas;
}
export function drawLayer(
  state: GameState,
  model: OverlayModel,
  layer: MapLayer,
  wear: boolean,
  strong: boolean,
) {
  const canvas = surface(SIZE),
    ctx = canvas.getContext("2d")!;
  if (TERRAIN.lease) {
    line(ctx, TERRAIN.lease);
    ctx.closePath();
    ctx.clip();
  }
  if (layer === "slope") {
    ctx.drawImage(slopeCanvas(strong), 0, 0);
    return canvas;
  }
  ctx.fillStyle = pattern(ctx, "neutral", false);
  ctx.fillRect(0, 0, SIZE, SIZE);
  const styles = new Map<MarkId, CanvasPattern>();
  const style = (id: MarkId) => {
    if (!styles.has(id)) styles.set(id, pattern(ctx, id, strong));
    return styles.get(id)!;
  };
  const sx = SIZE / (bounds.xMax - bounds.xMin),
    sz = SIZE / (bounds.zMax - bounds.zMin);
  if (layer === "guns") {
    const anchors = [TERRAIN.base],
      radius = gunRadius(state.talentsOwned);
    for (const gun of state.guns) {
      const parent = anchors.reduce((a, b) =>
        Math.hypot(a.x - gun.at.x, a.z - gun.at.z) <=
        Math.hypot(b.x - gun.at.x, b.z - gun.at.z)
          ? a
          : b,
      );
      const [x, y] = pixel(gun.at);
      ctx.fillStyle = "#83babc";
      ctx.strokeStyle = "#205465";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y, radius * sx, radius * sz, 0, 0, Math.PI * 2);
      ctx.globalAlpha = 0.6;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.stroke();
      line(ctx, [parent, gun.at]);
      ctx.strokeStyle = "#123c55";
      ctx.lineWidth = 3;
      ctx.stroke();
      anchors.push(gun.at);
    }
  }
  state.trails.forEach((trail, i) => {
    model.trails[i].forEach((cell, j) => {
      const path = segmentPath(trail, j);
      if (path.length < 2) return;
      const id = cellMark(layer, cell, wear);
      ctx.strokeStyle = style(id);
      const sample = Math.round(
        ((j + 0.5) / trail.snow.length) * (trail.path.length - 1),
      );
      const width =
        (trail.widths?.[sample] ?? STANDARD_TRAIL_WIDTH_FT) /
        TERRAIN.horizontalFeetPerUnit;
      const lineWidth = Math.max(3, (width * (sx + sz)) / 2);
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "butt";
      ctx.lineJoin = "round";
      line(ctx, path);
      ctx.stroke();
      if (
        layer === "depth" &&
        cell.snow.depth < COVER_MIN !==
          (j > 0 && model.trails[i][j - 1].snow.depth < COVER_MIN)
      ) {
        const [a, b] = path.map(pixel),
          length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        const dx = (((a[1] - b[1]) / length) * lineWidth) / 2,
          dy = (((b[0] - a[0]) / length) * lineWidth) / 2;
        ctx.beginPath();
        ctx.moveTo(a[0] - dx, a[1] - dy);
        ctx.lineTo(a[0] + dx, a[1] + dy);
        ctx.strokeStyle = "#202331";
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 2]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (layer === "conditions" && cell.hold && j === 0) {
        const [x, y] = pixel(path[0]);
        ctx.fillStyle = MARKS.hold.color;
        ctx.fillRect(x - 8, y - 8, 16, 16);
        ctx.fillStyle = "#151525";
        ctx.font = "bold 14px sans-serif";
        ctx.fillText(MARKS.hold.glyph, x - 6, y + 5);
      }
    });
  });
  return canvas;
}
