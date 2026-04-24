/**
 * Lightweight background-only version of EarthGlobe (dot/point style).
 * Same dot data / materials as the full component — no spots, no interaction.
 */
import { useEffect, useRef } from "react";
import * as THREE from "three";
import landDotsData from "../data/land-dots.json";
import oceanDotsData from "../data/ocean-dots.json";

function latLngToVec3(lat: number, lng: number, r: number) {
  const phi   = (90 - lat)  * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta)
  );
}

export default function DotGlobeBackground({ style }: { style?: React.CSSProperties }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const w = mount.clientWidth || window.innerWidth / 2;
    const h = mount.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();

    // Stars
    const starPos = new Float32Array(2000 * 3);
    for (let i = 0; i < starPos.length; i++) starPos[i] = (Math.random() - 0.5) * 400;
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.25, transparent: true, opacity: 0.6 })));

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.set(0, 0, 7);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x05080f, 1);
    mount.appendChild(renderer.domElement);

    const earthGroup = new THREE.Group();
    scene.add(earthGroup);

    // Dark base sphere (occludes back-side dots)
    earthGroup.add(new THREE.Mesh(
      new THREE.SphereGeometry(1.99, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x05080f })
    ));

    let rafId: number;

    const landPts = landDotsData as [number, number][];
    const oceanPts = oceanDotsData as [number, number][];

    // Land dots
    const landPos = new Float32Array(landPts.length * 3);
    landPts.forEach(([lng, lat], i) => {
      const v = latLngToVec3(lat, lng, 2.0);
      landPos[i*3]=v.x; landPos[i*3+1]=v.y; landPos[i*3+2]=v.z;
    });
    const landGeo = new THREE.BufferGeometry();
    landGeo.setAttribute("position", new THREE.BufferAttribute(landPos, 3));
    earthGroup.add(new THREE.Points(landGeo, new THREE.PointsMaterial({
      color: 0xffffff, size: 0.022, transparent: false, opacity: 1.0, sizeAttenuation: true,
    })));

    // Ocean dots
    const oceanPos = new Float32Array(oceanPts.length * 3);
    oceanPts.forEach(([lng, lat], i) => {
      const v = latLngToVec3(lat, lng, 2.0);
      oceanPos[i*3]=v.x; oceanPos[i*3+1]=v.y; oceanPos[i*3+2]=v.z;
    });
    const oceanGeo = new THREE.BufferGeometry();
    oceanGeo.setAttribute("position", new THREE.BufferAttribute(oceanPos, 3));
    earthGroup.add(new THREE.Points(oceanGeo, new THREE.PointsMaterial({
      color: 0x8899cc, size: 0.016, transparent: false, opacity: 1.0, sizeAttenuation: true,
    })));

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
