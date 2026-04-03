// Generate per-vertex elevation offsets for IcosahedronGeometry detail=5
// Outputs one value per UNIQUE vertex (indexed geometry), so shared vertices move together
import { createCanvas, loadImage } from "canvas";
import { writeFileSync } from "fs";

const DETAIL = 5;

const t = (1 + Math.sqrt(5)) / 2;
const BASE_VERTS = [
  [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
  [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
  [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
].map(([x, y, z]) => {
  const l = Math.sqrt(x*x + y*y + z*z);
  return [x/l, y/l, z/l];
});

const BASE_FACES = [
  [0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],
  [1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],
  [3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],
  [4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1],
];

function midpoint(v1, v2) {
  const m = [(v1[0]+v2[0])/2, (v1[1]+v2[1])/2, (v1[2]+v2[2])/2];
  const l = Math.sqrt(m[0]*m[0] + m[1]*m[1] + m[2]*m[2]);
  return [m[0]/l, m[1]/l, m[2]/l];
}

function subdivide(verts, faces, depth) {
  if (depth === 0) return { verts, faces };
  const cache = new Map();
  const newFaces = [];
  const newVerts = [...verts];
  function getMid(i, j) {
    const key = i < j ? `${i}_${j}` : `${j}_${i}`;
    if (cache.has(key)) return cache.get(key);
    const idx = newVerts.length;
    newVerts.push(midpoint(newVerts[i], newVerts[j]));
    cache.set(key, idx);
    return idx;
  }
  for (const [a, b, c] of faces) {
    const ab = getMid(a, b), bc = getMid(b, c), ca = getMid(c, a);
    newFaces.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
  }
  return subdivide(newVerts, newFaces, depth - 1);
}

console.log(`Subdividing to detail ${DETAIL}...`);
const { verts, faces } = subdivide(BASE_VERTS, BASE_FACES, DETAIL);
console.log(`Unique vertices: ${verts.length}, Faces: ${faces.length}`);

console.log("Loading elevation image...");
const img = await loadImage("public/elevation.png");
const W = img.width, H = img.height;
const canvas = createCanvas(W, H);
const ctx = canvas.getContext("2d");
ctx.drawImage(img, 0, 0);
const pixels = ctx.getImageData(0, 0, W, H).data;
console.log(`Image: ${W}x${H}`);

function sampleElevation(lat, lng) {
  const px = Math.floor(((lng + 180) / 360) * W) % W;
  const py = Math.floor(((90 - lat) / 180) * H);
  const idx = (Math.max(0, Math.min(H-1, py)) * W + Math.max(0, Math.min(W-1, px))) * 4;
  return pixels[idx] / 255;
}

const LAND_THRESHOLD = 0.0;  // no threshold — all vertices get elevation value
const MAX_BOOST = 0.22;

// One elevation value per unique vertex
const elevations = new Float32Array(verts.length);
for (let i = 0; i < verts.length; i++) {
  const [x, y, z] = verts[i];
  const lat = Math.asin(y) * (180 / Math.PI);
  const lng = Math.atan2(z, -x) * (180 / Math.PI) - 180;
  const lngNorm = ((lng % 360) + 360) % 360 - 180;
  const raw = sampleElevation(lat, lngNorm);
  elevations[i] = raw * MAX_BOOST;
}

// Build adjacency list from faces
const neighbors = Array.from({ length: verts.length }, () => new Set());
for (const [a, b, c] of faces) {
  neighbors[a].add(b); neighbors[a].add(c);
  neighbors[b].add(a); neighbors[b].add(c);
  neighbors[c].add(a); neighbors[c].add(b);
}

// Smooth elevation: each vertex = weighted average of itself (2x) + neighbors (1x each)
// Run 2 passes to soften sharp transitions at land/ocean boundaries
const smoothed = new Float32Array(elevations);
for (let pass = 0; pass < 2; pass++) {
  const tmp = new Float32Array(smoothed);
  for (let i = 0; i < verts.length; i++) {
    const ns = [...neighbors[i]];
    const sum = smoothed[i] * 2 + ns.reduce((s, n) => s + smoothed[n], 0);
    tmp[i] = sum / (2 + ns.length);
  }
  smoothed.set(tmp);
}

// Output: array indexed by vertex index (matches Three.js IcosahedronGeometry indexed vertex order)
writeFileSync("public/elevation.json", JSON.stringify(Array.from(smoothed)));
console.log(`Written: ${smoothed.length} vertex elevations`);
console.log(`Non-zero: ${smoothed.filter(v => v > 0.001).length}, Max: ${Math.max(...smoothed).toFixed(4)}`);
