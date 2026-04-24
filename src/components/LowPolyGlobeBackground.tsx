/**
 * Lightweight background-only version of LowPolyEarthGlobe.
 * Same geometry/colors/lighting as the full component — no spots, no interaction.
 */
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { geoContains } from "d3-geo";
import { feature } from "topojson-client";
import landTopoData from "../data/land-110m.json";

const OCEAN_DEEP    = new THREE.Color("#4A90B8");
const OCEAN_MID     = new THREE.Color("#5BA3C9");
const OCEAN_SHALLOW = new THREE.Color("#7EC8E3");
const LAND_TROPICAL = new THREE.Color("#5A9E6A");
const LAND_FOREST   = new THREE.Color("#6BAF7A");
const LAND_PLAINS   = new THREE.Color("#8CC47A");
const LAND_DESERT   = new THREE.Color("#D4A96A");
const LAND_TUNDRA   = new THREE.Color("#9DB89A");
const ICE_CAP       = new THREE.Color("#E8F4F8");
const ICE_PACK      = new THREE.Color("#D0E8F0");

function seededRand(seed: number): number {
  const x = Math.sin(seed + 1) * 43758.5453123;
  return x - Math.floor(x);
}

function landColor(lat: number, lng: number, fi: number): THREE.Color {
  const r = seededRand(fi);
  const absLat = Math.abs(lat);
  if (absLat > 67) return r > 0.5 ? ICE_CAP : ICE_PACK;
  if (absLat > 55) return r > 0.5 ? LAND_TUNDRA : LAND_FOREST;
  if (absLat > 40) return r > 0.5 ? LAND_FOREST : LAND_PLAINS;
  if (absLat < 25) {
    const isSaharaArabia     = lat > 15 && lat < 35 && lng > -18 && lng < 60;
    const isAustralianDesert = lat < -20 && lat > -35 && lng > 115 && lng < 140;
    const isAtacama          = lat < -15 && lat > -35 && lng > -76 && lng < -66;
    const isNamibia          = lat > -30 && lat < -15 && lng > 10 && lng < 20;
    if (isSaharaArabia || isAustralianDesert || isAtacama || isNamibia)
      return r > 0.4 ? LAND_DESERT : new THREE.Color("#C9976A");
    const isAmazon = lat > -15 && lat < 5  && lng > -75 && lng < -45;
    const isCongo  = lat > -5  && lat < 5  && lng > 15  && lng < 30;
    const isSEAsia = lat > -5  && lat < 20 && lng > 95  && lng < 145;
    if (isAmazon || isCongo || isSEAsia)
      return r > 0.5 ? LAND_TROPICAL : LAND_FOREST;
    return r > 0.5 ? LAND_PLAINS : LAND_FOREST;
  }
  return r > 0.5 ? LAND_PLAINS : LAND_FOREST;
}

function oceanColor(lat: number, fi: number): THREE.Color {
  const r = seededRand(fi);
  const absLat = Math.abs(lat);
  if (absLat > 60) return r > 0.5 ? ICE_PACK : OCEAN_MID;
  if (absLat < 20) return r > 0.5 ? OCEAN_SHALLOW : OCEAN_MID;
  return r > 0.5 ? OCEAN_MID : OCEAN_DEEP;
}

export default function LowPolyGlobeBackground({ style }: { style?: React.CSSProperties }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const w = mount.clientWidth || window.innerWidth / 2;
    const h = mount.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.set(0, 0, 7);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0xffffff, 1);
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(-5, 8, 5);
    scene.add(dirLight);

    const earthGroup = new THREE.Group();
    scene.add(earthGroup);

    let rafId: number;

    const topo = landTopoData;
    const landGeoJSON = feature(topo as any, (topo as any).objects.land);
    const geo = new THREE.IcosahedronGeometry(2.0, 6).toNonIndexed();
    const posAttr = geo.attributes.position;
    const faceCount = posAttr.count / 3;
    const colors = new Float32Array(posAttr.count * 3);

    for (let i = 0; i < faceCount; i++) {
      const vi = i * 3;
      const ax = posAttr.getX(vi),   ay = posAttr.getY(vi),   az = posAttr.getZ(vi);
      const bx = posAttr.getX(vi+1), by = posAttr.getY(vi+1), bz = posAttr.getZ(vi+1);
      const cx = posAttr.getX(vi+2), cy = posAttr.getY(vi+2), cz = posAttr.getZ(vi+2);
      const centX = (ax+bx+cx)/3, centY = (ay+by+cy)/3, centZ = (az+bz+cz)/3;
      const len = Math.sqrt(centX*centX + centY*centY + centZ*centZ);
      const lat = Math.asin(centY / len) * (180 / Math.PI);
      const lngRaw = Math.atan2(centZ, -centX) * (180 / Math.PI) - 180;
      const lngNorm = ((lngRaw % 360) + 540) % 360 - 180;
      const isLand = geoContains(landGeoJSON as any, [lngNorm, lat]);
      const color = isLand ? landColor(lat, lngNorm, i) : oceanColor(lat, i);
      for (let v = 0; v < 3; v++) {
        colors[(vi+v)*3+0] = color.r;
        colors[(vi+v)*3+1] = color.g;
        colors[(vi+v)*3+2] = color.b;
      }
    }

    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.MeshPhongMaterial({ vertexColors: true, flatShading: true, shininess: 20 });
    const mesh = new THREE.Mesh(geo, mat);
    earthGroup.add(mesh);

    const edgesMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 });
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 10), edgesMat));

    const ROT_PER_MS = 0.003 / 16.667;
    let lastTime = performance.now();
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const now = performance.now();
      earthGroup.rotation.y += ROT_PER_MS * (now - lastTime);
      lastTime = now;
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const nw = mount.clientWidth, nh = mount.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(rafId);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} style={{ width: "100%", height: "100%", ...style }} />;
}
