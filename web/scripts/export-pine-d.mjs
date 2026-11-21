/**
 * Build pine-d.glb without Blender: stocky two-tier conifer matching tools/blender/props.py
 * `_pine("pine-d", 6.2, 2, 3.1, "pine", slim=1.05, seg=5)`.
 *
 * Usage: node scripts/export-pine-d.mjs
 * Writes public/models/pine-d.glb and prints a manifest row JSON.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Blob as NodeBlob } from "node:buffer";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

// three's GLTFExporter expects browser Blob/FileReader in Node.
globalThis.Blob = NodeBlob;
globalThis.FileReader = class FileReader {
  constructor() {
    this.result = null;
    this.onload = null;
    this.onloadend = null;
    this.onerror = null;
    this.readyState = 0;
  }
  readAsArrayBuffer(blob) {
    this.readyState = 1;
    Promise.resolve(typeof blob?.arrayBuffer === "function" ? blob.arrayBuffer() : blob)
      .then((buf) => {
        this.readyState = 2;
        this.result = buf;
        const ev = { target: this };
        this.onload?.(ev);
        this.onloadend?.(ev);
      })
      .catch((err) => {
        this.onerror?.(err);
        this.onloadend?.({ target: this });
      });
  }
};

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outPath = path.join(root, "public", "models", "pine-d.glb");

const COLORS = {
  pine: new THREE.Color("#2d5a4a"),
  snow: new THREE.Color("#f4f7fb"),
  "timber-dark": new THREE.Color("#4a3220"),
};

function mat(name) {
  const m = new THREE.MeshStandardMaterial({ color: COLORS[name], name, roughness: 0.9 });
  return m;
}

function cyl(rt, rb, h, seg, colorName, rotZ = 0) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, false);
  if (rotZ) g.rotateY((rotZ * Math.PI) / 180);
  const mesh = new THREE.Mesh(g, mat(colorName));
  return mesh;
}

/** Mirror Blender `_pine` for pine-d (H=6.2, tiers=2, R=3.1, slim=1.05, seg=5). */
function buildPineD() {
  const H = 6.2;
  const tiers = 2;
  const R = 3.1;
  const slim = 1.05;
  const seg = 5;
  const group = new THREE.Group();
  group.name = "pine-d";

  const trunkH = H * 0.16;
  const trunk = cyl(0.22 * R / 2.2, 0.16 * R / 2.2, trunkH + 0.6, 5, "timber-dark");
  trunk.position.y = (trunkH + 0.6) / 2;
  group.add(trunk);

  let z = trunkH;
  const span = (H - trunkH) / (tiers * 0.72 + 0.28);
  for (let i = 0; i < tiers; i++) {
    const r = R * (1 - i / (tiers + 0.6)) * slim;
    const h = span * (1.05 - 0.06 * i);
    const rot = i * 30;
    const green = cyl(0, r, h, seg, "pine", rot);
    green.position.y = z + h / 2;
    group.add(green);

    const snowH = h * 0.58 + 0.02;
    const snow = cyl(0, r * 0.62, snowH, seg, "snow", rot + 30);
    snow.position.y = z + h * 0.42 + snowH / 2;
    group.add(snow);

    const skirtH = h * 0.14;
    const skirt = cyl(r * 0.86, r * 1.04, skirtH, seg, "snow", rot);
    skirt.position.y = z - 0.02 + skirtH / 2;
    group.add(skirt);

    z += span * 0.72;
  }
  return group;
}

const group = buildPineD();
group.updateMatrixWorld(true);

const box = new THREE.Box3().setFromObject(group);
const size = new THREE.Vector3();
box.getSize(size);
const heightMeters = +size.y.toFixed(2);
const footprintMeters = [+(size.x).toFixed(2), +(size.z).toFixed(2)];

async function main() {
  const exporter = new GLTFExporter();
  const glb = await new Promise((resolve, reject) => {
    exporter.parse(
      group,
      (result) => resolve(Buffer.from(result)),
      (err) => reject(err),
      { binary: true },
    );
  });

  fs.writeFileSync(outPath, glb);
  const tris = (() => {
    let n = 0;
    group.traverse((o) => {
      if (o.isMesh) {
        const g = o.geometry;
        n += g.index ? g.index.count / 3 : g.attributes.position.count / 3;
      }
    });
    return Math.round(n);
  })();

  const row = {
    name: "pine-d",
    file: "pine-d.glb",
    tris,
    sizeBytes: glb.length,
    heightMeters,
    footprintMeters,
    tags: ["tree"],
  };
  fs.writeFileSync(path.join(root, "public", "models", "rows-pine-d.json"), JSON.stringify([row], null, 2) + "\n");
  console.log(JSON.stringify(row, null, 2));
  console.log("wrote", outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});