import { readFileSync, writeFileSync } from "fs";
import { geoContains } from "d3-geo";
import { feature } from "topojson-client";

const topo = JSON.parse(readFileSync("public/land-110m.json", "utf-8"));
const landGeoJSON = feature(topo, topo.objects.land);

function isLand(lng, lat) {
  return geoContains(landGeoJSON, [lng, lat]);
}

// Sunflower / phyllotaxis sphere — Stripe's exact method
// phi = acos(-1 + 2i/N), theta = sqrt(N*π) * phi
function sunflowerSphere(n) {
  const points = [];
  for (let i = 0; i < n; i++) {
    const phi = Math.acos(-1 + (2 * i) / n);          // polar angle, uniform cosine spacing
    const theta = Math.sqrt(n * Math.PI) * phi;         // azimuthal angle, golden spiral
    // Spherical to Cartesian
    const x = Math.sin(phi) * Math.cos(theta);
    const y = Math.sin(phi) * Math.sin(theta);
    const z = Math.cos(phi);
    const lat = Math.asin(z) * (180 / Math.PI);
    const lng = Math.atan2(y, x) * (180 / Math.PI);
    points.push([+lng.toFixed(3), +lat.toFixed(3)]);
  }
  return points;
}

// ~14000 land-density points total; classify each and split
// Land resolution: ~16000 points across whole sphere ≈ 1 point per ~(surface/16000)
// Ocean resolution: ~6000 points across whole sphere
const ALL_LAND_N = 50000;  // classify all, keep land ones (~14500 expected)
const ALL_OCEAN_N = 6500;  // classify all, keep ocean ones (~4600 expected)

const landDots = [];
const oceanDots = [];

for (const [lng, lat] of sunflowerSphere(ALL_LAND_N)) {
  if (isLand(lng, lat)) landDots.push([lng, lat]);
}

for (const [lng, lat] of sunflowerSphere(ALL_OCEAN_N)) {
  if (!isLand(lng, lat)) oceanDots.push([lng, lat]);
}

writeFileSync("public/land-dots.json", JSON.stringify(landDots));
writeFileSync("public/ocean-dots.json", JSON.stringify(oceanDots));
console.log(`Land: ${landDots.length}, Ocean: ${oceanDots.length}`);
