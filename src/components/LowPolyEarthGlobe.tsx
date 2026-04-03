import { useEffect, useRef } from "react";
import * as THREE from "three";
import { geoContains } from "d3-geo";
import { feature } from "topojson-client";
import type { Spot } from "../data/spots";

// ── Props ─────────────────────────────────────────────────────────────────────

interface LowPolyEarthGlobeProps {
  spots: Spot[];
  onSpotClick: (spot: Spot, screenPos: { x: number; y: number }) => void;
  onSpotHover: (spot: Spot | null) => void;
  onGlobeHover: (latLng: { lat: number; lng: number } | null) => void;
  fontSerif?: string;
  fontSans?: string;
  issStyle?: "glow" | "line";
  exploding?: boolean;
}

// ── ISS spot (same definition as EarthGlobe) ─────────────────────────────────

export const ISS_SPOT: Spot = {
  id: "iss",
  lat: 0, lng: 0,
  location: "Low Earth Orbit, 408 km altitude",
  name: "ISS — Life in Orbit",
  nameLatin: "International Space Station",
  size: "0.1 – 1.5 mm",
  desc: "In 2011, scientists smuggled two of Earth's toughest microscopic animals aboard the International Space Station. Tardigrades (water bears) and rotifers — both capable of surviving the vacuum of space — were exposed to cosmic radiation and microgravity for months. They not only survived, but reproduced. The ISS has since become an unlikely habitat for extremophile research, with specimens revived from cryptobiosis after reentry.",
  imageUrl: "/images/tardigrade.jpg",
  imageUrl2: "",
  imageCredit: "NASA / ESA",
  color: "#ffffff",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function latLngToVec3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// ── Biome palette ─────────────────────────────────────────────────────────────

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

function landColor(lat: number, lng: number, faceIndex: number): THREE.Color {
  const r = seededRand(faceIndex);
  const absLat = Math.abs(lat);

  if (absLat > 67) return r > 0.5 ? ICE_CAP : ICE_PACK;
  if (absLat > 55) return r > 0.5 ? LAND_TUNDRA : LAND_FOREST;
  if (absLat > 40) return r > 0.5 ? LAND_FOREST : LAND_PLAINS;

  if (absLat < 25) {
    const isSaharaArabia      = lat > 15 && lat < 35 && lng > -18 && lng < 60;
    const isAustralianDesert  = lat < -20 && lat > -35 && lng > 115 && lng < 140;
    const isAtacama           = lat < -15 && lat > -35 && lng > -76 && lng < -66;
    const isNamibia           = lat > -30 && lat < -15 && lng > 10 && lng < 20;
    if (isSaharaArabia || isAustralianDesert || isAtacama || isNamibia) {
      return r > 0.4 ? LAND_DESERT : new THREE.Color("#C9976A");
    }
    const isAmazon = lat > -15 && lat < 5  && lng > -75 && lng < -45;
    const isCongo  = lat > -5  && lat < 5  && lng > 15  && lng < 30;
    const isSEAsia = lat > -5  && lat < 20 && lng > 95  && lng < 145;
    if (isAmazon || isCongo || isSEAsia) {
      return r > 0.5 ? LAND_TROPICAL : LAND_FOREST;
    }
    return r > 0.5 ? LAND_PLAINS : LAND_FOREST;
  }

  return r > 0.5 ? LAND_PLAINS : LAND_FOREST;
}

function oceanColor(lat: number, faceIndex: number): THREE.Color {
  const r = seededRand(faceIndex);
  const absLat = Math.abs(lat);
  if (absLat > 60) return r > 0.5 ? ICE_PACK : OCEAN_MID;
  if (absLat < 20) return r > 0.5 ? OCEAN_SHALLOW : OCEAN_MID;
  return r > 0.5 ? OCEAN_MID : OCEAN_DEEP;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LowPolyEarthGlobe({
  spots, onSpotClick, onSpotHover, onGlobeHover,
  fontSerif = "'Yaroop', serif",
  fontSans = "'Inter', sans-serif",
  issStyle,
  exploding = false,
}: LowPolyEarthGlobeProps) {
  const mountRef   = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const onSpotClickRef  = useRef(onSpotClick);
  const onSpotHoverRef  = useRef(onSpotHover);
  const onGlobeHoverRef = useRef(onGlobeHover);
  const explodingRef    = useRef(exploding);
  onSpotClickRef.current  = onSpotClick;
  onSpotHoverRef.current  = onSpotHover;
  onGlobeHoverRef.current = onGlobeHover;
  explodingRef.current    = exploding;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const w = mount.clientWidth;
    const h = mount.clientHeight;

    // ── Scene ──────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    // ── Camera ─────────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.set(0, 0, 7);

    // ── Renderer ───────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0xffffff, 1);
    mount.appendChild(renderer.domElement);

    // ── Lighting ───────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(-5, 8, 5);
    scene.add(dirLight);

    // ── Earth group (icosahedron + all markers rotate together) ────────────
    const earthGroup = new THREE.Group();
    earthGroup.position.y = -0.35;
    scene.add(earthGroup);

    // Background materials faded during explosion
    const globeBgMaterials: (THREE.Material & { opacity: number })[] = [];

    // Spot markers and hit meshes (filled once globe async loads)
    const spotMeshes: THREE.Mesh[] = [];
    const spotVisObjects: THREE.Object3D[] = [];

    // No base sphere — back-face culling of markers is handled by surfaceNormal logic.
    // A white sphere would bleed through the icosahedron's flat-face gaps.

    // ── Globe hit mesh for lat/lng raycasting ──────────────────────────────
    const globeHitMesh = new THREE.Mesh(
      new THREE.SphereGeometry(2.0, 32, 32),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    earthGroup.add(globeHitMesh);

    // ── Card texture helper ────────────────────────────────────────────────
    function makeCardTexture(name: string, imgEl: HTMLImageElement | null): THREE.CanvasTexture {
      const W = 320, IMG_H = 256, NAME_H = 96, H = IMG_H + NAME_H;
      const canvas = document.createElement("canvas");
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, W, H);

      const CIRC = 256;
      const circX = W / 2;
      if (imgEl) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(circX, IMG_H / 2, CIRC / 2 - 2, 0, Math.PI * 2);
        ctx.clip();
        const aspect = imgEl.naturalWidth / imgEl.naturalHeight;
        const d = CIRC - 4;
        const dw = aspect >= 1 ? d * aspect : d;
        const dh = aspect >= 1 ? d : d / aspect;
        ctx.drawImage(imgEl, circX - dw / 2, (IMG_H - dh) / 2, dw, dh);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(circX, IMG_H / 2, CIRC / 2 - 2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(26,42,60,0.08)";
        ctx.fill();
      }

      const fontSize = 36;
      const lineH = 40;
      ctx.font = `400 ${fontSize}px 'Yarorg', serif`;
      ctx.fillStyle = "rgba(0, 0, 0, 0.83)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const maxW = W;
      if (ctx.measureText(name).width <= maxW) {
        ctx.fillText(name, W / 2, IMG_H + NAME_H / 2);
      } else {
        const words = name.split(" ");
        let split = words.length - 1;
        for (let s = 1; s < words.length; s++) {
          const try1 = words.slice(0, s).join(" ");
          const try2 = words.slice(s).join(" ");
          if (ctx.measureText(try1).width <= maxW && ctx.measureText(try2).width <= maxW) {
            split = s; break;
          }
        }
        const line1 = words.slice(0, split).join(" ");
        const line2 = words.slice(split).join(" ");
        const midY = IMG_H + NAME_H / 2;
        ctx.fillText(line1, W / 2, midY - lineH / 2);
        ctx.fillText(line2, W / 2, midY + lineH / 2);
      }

      return new THREE.CanvasTexture(canvas);
    }

    // ── Geo labels (continents + oceans) ──────────────────────────────────
    const geoLabels = [
      { name: "North America", lat: 45.0,  lng: -100.0, ocean: false },
      { name: "South America", lat: -15.0, lng: -60.0,  ocean: false },
      { name: "Europe",        lat: 54.0,  lng: 15.0,   ocean: false },
      { name: "Africa",        lat: 0.0,   lng: 20.0,   ocean: false },
      { name: "Asia",          lat: 48.0,  lng: 100.0,  ocean: false },
      { name: "Oceania",       lat: -25.0, lng: 135.0,  ocean: false },
      { name: "Antarctica",    lat: -80.0, lng: 0.0,    ocean: false },
      { name: "Pacific Ocean",  lat: 5.0,   lng: -150.0, ocean: true },
      { name: "Atlantic Ocean", lat: 10.0,  lng: -30.0,  ocean: true },
      { name: "Indian Ocean",   lat: -20.0, lng: 80.0,   ocean: true },
      { name: "Arctic Ocean",   lat: 85.0,  lng: 0.0,    ocean: true },
      { name: "Southern Ocean", lat: -60.0, lng: 90.0,   ocean: true },
    ];

    geoLabels.forEach(({ name, lat, lng, ocean }) => {
      const LW = 512, LH = 80;
      const canvas = document.createElement("canvas");
      canvas.width = LW; canvas.height = LH;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, LW, LH);
      if (ocean) {
        ctx.font = `300 15px ${fontSans}`;
        ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
        ctx.letterSpacing = "6px";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(name.toUpperCase(), LW / 2, LH / 2);
      } else {
        ctx.font = `100 20px ${fontSans}`;
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(name.toUpperCase(), LW / 2, LH / 2);
      }

      const tex = new THREE.CanvasTexture(canvas);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide });
      globeBgMaterials.push(mat);
      const geo = new THREE.PlaneGeometry(6.4 * 0.38, 0.38);
      const mesh = new THREE.Mesh(geo, mat);

      const pos = latLngToVec3(lat, lng, 2.03);
      mesh.position.copy(pos);

      const normal = pos.clone().normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const right = up.clone().cross(normal).normalize();
      const localUp = normal.clone().cross(right).normalize();
      mesh.setRotationFromMatrix(new THREE.Matrix4().makeBasis(right, localUp, normal));
      mesh.renderOrder = 1;
      earthGroup.add(mesh);
    });

    // ── ISS orbit constants ────────────────────────────────────────────────
    const ISS_R      = 2.128;
    const ISS_INC    = 51.6 * Math.PI / 180;
    const ISS_PERIOD = 200;

    function issOrbitPt(theta: number, yawDeg: number): THREE.Vector3 {
      const x0 = ISS_R * Math.cos(theta);
      const z0 = ISS_R * Math.sin(theta);
      const y1 = z0 * Math.sin(ISS_INC);
      const z1 = z0 * Math.cos(ISS_INC);
      const yaw = yawDeg * Math.PI / 180;
      return new THREE.Vector3(
        x0 * Math.cos(yaw) + z1 * Math.sin(yaw),
        y1,
        -x0 * Math.sin(yaw) + z1 * Math.cos(yaw),
      );
    }

    let issAIcon: THREE.Sprite | null = null;
    let issACard: THREE.Sprite | null = null;
    let issALine: THREE.Line | null = null;
    let issAHit:  THREE.Mesh   | null = null;
    let issBIcon: THREE.Sprite | null = null;

    if (issStyle) {
      const SEGMENTS = 256;
      const orbitYaws = [0, 90];

      // ISS icon texture
      const S = 64;
      const iconCanvas = document.createElement("canvas");
      iconCanvas.width = S; iconCanvas.height = S;
      const ic = iconCanvas.getContext("2d")!;
      const cx = S / 2, cy = S / 2;
      ic.fillStyle = issStyle === "glow" ? "#ffffff" : "rgba(0, 0, 0, 0.9)";
      if (issStyle === "glow") { ic.shadowColor = "#66aaff"; ic.shadowBlur = 6; }
      ic.fillRect(4,      cy - 1,  S - 8, 2);
      ic.fillRect(cx - 4, cy - 6,  8,     12);
      ic.fillRect(6,      cy - 10, 14,    7);
      ic.fillRect(6,      cy + 3,  14,    7);
      ic.fillRect(S - 20, cy - 10, 14,    7);
      ic.fillRect(S - 20, cy + 3,  14,    7);
      const issIconTex = new THREE.CanvasTexture(iconCanvas);

      // Orbit rings
      orbitYaws.forEach(yaw => {
        const pts: THREE.Vector3[] = [];
        for (let j = 0; j <= SEGMENTS; j++) {
          pts.push(issOrbitPt((j / SEGMENTS) * Math.PI * 2, yaw));
        }
        const orbitMat = new THREE.LineDashedMaterial({
          color: issStyle === "glow" ? 0x88ccff : 0x333333,
          transparent: true,
          opacity: issStyle === "glow" ? 0.65 : 1.0,
          dashSize: 0.12,
          gapSize: 0.08,
        });
        globeBgMaterials.push(orbitMat);
        const orbitGeo = new THREE.BufferGeometry().setFromPoints(pts);
        orbitGeo.computeBoundingSphere();
        const orbitLine = new THREE.Line(orbitGeo, orbitMat);
        orbitLine.computeLineDistances();
        earthGroup.add(orbitLine);
      });

      // ISS A — orbit plane 0°, carries rotifer card
      const issAInitPos  = issOrbitPt(0, 0);
      const issAInitNorm = issAInitPos.clone().normalize();

      issAIcon = new THREE.Sprite(new THREE.SpriteMaterial({
        map: issIconTex, transparent: true, depthTest: false, depthWrite: false,
      }));
      issAIcon.scale.setScalar(0.16);
      issAIcon.renderOrder = 5;
      issAIcon.position.copy(issAInitPos);
      issAIcon.visible = false;
      earthGroup.add(issAIcon);

      const rotiferSpot = spots.find(s => s.location === "ISS");
      const rotiferName = rotiferSpot?.name ?? "Rotifer";
      const cardMat = new THREE.SpriteMaterial({
        map: makeCardTexture(rotiferName, null),
        transparent: true, depthTest: false, depthWrite: false,
      });
      issACard = new THREE.Sprite(cardMat);
      const cardH = 0.55;
      issACard.scale.set(cardH * (320 / 352), cardH, 1);
      issACard.renderOrder = 4;
      issACard.position.copy(issAInitNorm.multiplyScalar(ISS_R + 0.65));
      issACard.visible = false;
      earthGroup.add(issACard);

      const rImg = new Image();
      rImg.onload = () => {
        const newTex = makeCardTexture(rotiferName, rImg);
        if (cardMat.map) cardMat.map.dispose();
        cardMat.map = newTex;
        cardMat.needsUpdate = true;
      };
      rImg.src = "/images/rotifer.jpg";

      issALine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
        new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.32 })
      );
      issALine.renderOrder = 2;
      issALine.visible = false;
      earthGroup.add(issALine);

      issAHit = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 8, 8),
        new THREE.MeshBasicMaterial({ visible: false }),
      );
      issAHit.userData = { issSpot: true, rotiferSpot };
      earthGroup.add(issAHit);
      spotMeshes.push(issAHit);

      // ISS B — orbit plane 90°, icon only
      issBIcon = new THREE.Sprite(new THREE.SpriteMaterial({
        map: issIconTex, transparent: true, depthTest: false, depthWrite: false,
      }));
      issBIcon.scale.setScalar(0.16);
      issBIcon.renderOrder = 5;
      issBIcon.position.copy(issOrbitPt(Math.PI, 90));
      issBIcon.visible = false;
      earthGroup.add(issBIcon);

      issAIcon.userData.originPos = issAIcon.position.clone();
      issACard.userData.originPos = issACard.position.clone();
      issBIcon.userData.originPos = issBIcon.position.clone();
      spotVisObjects.push(issAIcon, issACard, issBIcon);
    }

    // ── Load land-110m and build icosahedron globe + spot markers ──────────
    fetch("/land-110m.json")
      .then(r => r.json())
      .then(topo => {
        const landGeoJSON = feature(topo as any, (topo as any).objects.land);

        // Build icosahedron with biome vertex colors
        const geo = new THREE.IcosahedronGeometry(2.0, 6).toNonIndexed();
        const posAttr   = geo.attributes.position;
        const faceCount = posAttr.count / 3;
        const colors    = new Float32Array(posAttr.count * 3);

        for (let i = 0; i < faceCount; i++) {
          const vi = i * 3;
          const ax = posAttr.getX(vi),   ay = posAttr.getY(vi),   az = posAttr.getZ(vi);
          const bx = posAttr.getX(vi+1), by = posAttr.getY(vi+1), bz = posAttr.getZ(vi+1);
          const cx = posAttr.getX(vi+2), cy = posAttr.getY(vi+2), cz = posAttr.getZ(vi+2);
          const centX = (ax+bx+cx)/3, centY = (ay+by+cy)/3, centZ = (az+bz+cz)/3;
          const len   = Math.sqrt(centX*centX + centY*centY + centZ*centZ);
          const lat  = Math.asin(centY / len) * (180 / Math.PI);
          // atan2(z, -x) = lng+180 (from latLngToVec3), subtract 180 then normalise
          const lngRaw  = Math.atan2(centZ, -centX) * (180 / Math.PI) - 180;
          const lngNorm = ((lngRaw % 360) + 540) % 360 - 180;

          const isLand = geoContains(landGeoJSON as any, [lngNorm, lat]);
          const color  = isLand ? landColor(lat, lngNorm, i) : oceanColor(lat, i);
          for (let v = 0; v < 3; v++) {
            colors[(vi+v)*3+0] = color.r;
            colors[(vi+v)*3+1] = color.g;
            colors[(vi+v)*3+2] = color.b;
          }
        }

        geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

        const mat = new THREE.MeshPhongMaterial({
          vertexColors: true,
          flatShading: true,
          shininess: 20,
        });

        const icosaMesh = new THREE.Mesh(geo, mat);
        earthGroup.add(icosaMesh);

        // Edge overlay
        const edgesGeo = new THREE.EdgesGeometry(geo, 10);
        const edgesMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 });
        icosaMesh.add(new THREE.LineSegments(edgesGeo, edgesMat));

        // ── Spot markers ─────────────────────────────────────────────────
        spots.forEach((spot, i) => {
          if (spot.location === "ISS") return; // handled by ISS orbit logic
          const anchorPos = latLngToVec3(spot.lat, spot.lng, 2.002);
          const normal    = anchorPos.clone().normalize();

          // Anchor dot
          const dotGeo = new THREE.BufferGeometry();
          dotGeo.setAttribute("position", new THREE.Float32BufferAttribute([
            normal.x * 2.002, normal.y * 2.002, normal.z * 2.002,
          ], 3));
          const dotPoints = new THREE.Points(dotGeo, new THREE.PointsMaterial({
            color: 0x000000, size: 0.055, transparent: true, opacity: 1.0, sizeAttenuation: true, depthTest: false,
          }));
          dotPoints.renderOrder = 3;
          earthGroup.add(dotPoints);

          // Line from surface to card
          const lineGeo = new THREE.BufferGeometry().setFromPoints([
            normal.clone().multiplyScalar(2.01),
            normal.clone().multiplyScalar(2.38),
          ]);
          const lineMesh = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({
            color: 0x111111, transparent: true, opacity: 0.65, depthTest: false,
          }));
          lineMesh.renderOrder = 3;
          earthGroup.add(lineMesh);

          // Floating card sprite
          const cardPos = normal.clone().multiplyScalar(2.55);
          const cardTex = makeCardTexture(spot.name, null);
          const cardMat = new THREE.SpriteMaterial({ map: cardTex, transparent: true, depthTest: false, depthWrite: false });
          const cardSprite = new THREE.Sprite(cardMat);
          cardSprite.position.copy(cardPos);
          const cardH = 0.55;
          cardSprite.scale.set(cardH * (320 / 352), cardH, 1);
          cardSprite.renderOrder = 4;
          earthGroup.add(cardSprite);

          // Load card image
          if (spot.imageUrl) {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
              const newTex = makeCardTexture(spot.name, img);
              if (cardMat.map) cardMat.map.dispose();
              cardMat.map = newTex;
              cardMat.needsUpdate = true;
            };
            img.src = spot.imageUrl;
          }

          // Hit sphere for raycasting
          const hitMesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.18, 8, 8),
            new THREE.MeshBasicMaterial({ visible: false })
          );
          hitMesh.position.copy(cardPos);
          hitMesh.userData = { spotIndex: i };
          earthGroup.add(hitMesh);
          spotMeshes.push(hitMesh);

          // Back-face culling data + original positions for explosion reset
          cardSprite.userData.surfaceNormal = normal.clone();
          cardSprite.userData.originPos     = cardSprite.position.clone();
          lineMesh.userData.surfaceNormal   = normal.clone();
          lineMesh.userData.originPos       = lineMesh.position.clone();
          dotPoints.userData.surfaceNormal  = normal.clone();
          dotPoints.userData.originPos      = dotPoints.position.clone();
          hitMesh.userData.surfaceNormal    = normal.clone();
          hitMesh.userData.originPos        = hitMesh.position.clone();
          spotVisObjects.push(cardSprite, lineMesh, dotPoints, hitMesh);
        });
      })
      .catch(() => {});

    // ── Animation state ────────────────────────────────────────────────────
    let isDragging     = false;
    let isHoveringGlobe = false;
    let prevMouse      = { x: 0, y: 0 };
    let mouseDownPos   = { x: 0, y: 0 };
    let hoveredIndex   = -1;
    let time           = 0;
    let rafId: number;

    const explodeVelocities      = new Map<THREE.Object3D, THREE.Vector3>();
    const bgOriginalOpacities: number[] = [];
    const spriteOriginalOpacities = new Map<THREE.Object3D, number>();
    let wasExploding     = false;
    let explodeStartTime = 0;
    const EXPLODE_DURATION = 1.2;

    // ── Animate ────────────────────────────────────────────────────────────
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      time += 0.016;

      if (!isDragging && !isHoveringGlobe) earthGroup.rotation.y += 0.0006;

      earthGroup.updateMatrixWorld(true);
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(earthGroup.matrixWorld);
      const camDir = camera.position.clone().normalize();

      // Update ISS A (icon only, yaw=0)
      if (issAIcon && !explodingRef.current) {
        const theta = (time / ISS_PERIOD) * Math.PI * 2;
        const pos   = issOrbitPt(theta, 0);
        issAIcon.position.copy(pos);
        const wn = pos.clone().normalize().applyMatrix3(normalMatrix).normalize();
        issAIcon.visible = wn.dot(camDir) > 0.0;
      }

      // Update ISS B (with card, yaw=90)
      if (issBIcon && issACard && issALine && issAHit && !explodingRef.current) {
        const theta   = (time / ISS_PERIOD) * Math.PI * 2 + Math.PI;
        const pos     = issOrbitPt(theta, 90);
        issBIcon.position.copy(pos);
        const norm    = pos.clone().normalize();
        const cardPos = norm.clone().multiplyScalar(ISS_R + 0.65);
        issACard.position.copy(cardPos);
        issAHit.position.copy(cardPos);
        const lp = issALine.geometry.attributes.position as THREE.BufferAttribute;
        lp.setXYZ(0, pos.x, pos.y, pos.z);
        lp.setXYZ(1, cardPos.x, cardPos.y, cardPos.z);
        lp.needsUpdate = true;
        const wn  = norm.clone().applyMatrix3(normalMatrix).normalize();
        const vis = wn.dot(camDir) > 0.0;
        issBIcon.visible  = vis;
        issACard.visible  = vis;
        issALine.visible  = vis;
        issAHit.visible   = vis;
      }

      if (explodingRef.current) {
        if (!wasExploding) {
          wasExploding     = true;
          explodeStartTime = time;
          bgOriginalOpacities.length = 0;
          globeBgMaterials.forEach(m => bgOriginalOpacities.push(m.opacity));
          spriteOriginalOpacities.clear();
          spotVisObjects.forEach(obj => {
            const n: THREE.Vector3 | undefined = obj.userData.surfaceNormal;
            if (n) {
              const worldNormal = n.clone().applyMatrix3(normalMatrix).normalize();
              if (worldNormal.dot(camDir) <= 0.15) { obj.visible = false; return; }
            }
            if (obj instanceof THREE.Sprite)
              spriteOriginalOpacities.set(obj, (obj.material as THREE.SpriteMaterial).opacity ?? 1);
            const rand = new THREE.Vector3(
              (Math.random() - 0.5) * 2,
              (Math.random() - 0.5) * 2,
              (Math.random() - 0.5) * 2,
            ).normalize();
            explodeVelocities.set(obj, rand.multiplyScalar(0.08 + Math.random() * 0.12));
          });
        }
        const t = Math.min((time - explodeStartTime) / EXPLODE_DURATION, 1);
        if (overlayRef.current) overlayRef.current.style.opacity = String(t);
        globeBgMaterials.forEach((m, i) => { m.opacity = (bgOriginalOpacities[i] ?? 1) * (1 - t); });
        explodeVelocities.forEach((vel, obj) => {
          obj.position.add(vel);
          if (obj instanceof THREE.Sprite) {
            const mat = obj.material as THREE.SpriteMaterial;
            mat.depthTest = false;
            mat.opacity   = (spriteOriginalOpacities.get(obj) ?? 1) * (1 - t);
          }
        });
      } else {
        if (wasExploding) {
          wasExploding = false;
          if (overlayRef.current) overlayRef.current.style.opacity = "0";
          globeBgMaterials.forEach((m, i) => { m.opacity = bgOriginalOpacities[i] ?? 1; });
          explodeVelocities.forEach((_, obj) => {
            if (obj.userData.originPos) obj.position.copy(obj.userData.originPos);
            if (obj instanceof THREE.Sprite) {
              const mat     = obj.material as THREE.SpriteMaterial;
              mat.depthTest = true;
              mat.opacity   = spriteOriginalOpacities.get(obj) ?? 1;
            }
          });
          explodeVelocities.clear();
          spriteOriginalOpacities.clear();
        }
        // Back-face culling for spot vis objects
        spotVisObjects.forEach(obj => {
          const n: THREE.Vector3 = obj.userData.surfaceNormal;
          if (!n) return;
          const worldNormal = n.clone().applyMatrix3(normalMatrix).normalize();
          obj.visible = worldNormal.dot(camDir) > 0.15;
        });
      }

      renderer.render(scene, camera);
    };
    rafId = requestAnimationFrame(animate);

    // ── Resize ─────────────────────────────────────────────────────────────
    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    // ── Raycasting helpers ─────────────────────────────────────────────────
    const getNDC = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      return new THREE.Vector2(
        ((e.clientX - rect.left)  / rect.width)  * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
    };

    type HitResult = { spotIndex: number } | { iss: true; rotiferSpot: Spot | null } | null;
    const getHit = (e: MouseEvent): HitResult => {
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(getNDC(e), camera);
      const hits = raycaster.intersectObjects(spotMeshes);
      if (hits.length === 0) return null;
      const ud = hits[0].object.userData;
      if (ud.issSpot) return { iss: true, rotiferSpot: (ud.rotiferSpot as Spot) ?? null };
      return { spotIndex: ud.spotIndex as number };
    };

    const getGlobeLatLng = (e: MouseEvent) => {
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(getNDC(e), camera);
      const hits = raycaster.intersectObject(globeHitMesh);
      if (hits.length === 0) return null;
      const local      = earthGroup.worldToLocal(hits[0].point.clone());
      const normalized = local.normalize();
      const lat  = 90 - Math.acos(normalized.y) * (180 / Math.PI);
      let   lng  = Math.atan2(normalized.z, -normalized.x) * (180 / Math.PI) - 180;
      if (lng < -180) lng += 360;
      return { lat, lng };
    };

    // ── Mouse handlers ─────────────────────────────────────────────────────
    const onMouseDown = (e: MouseEvent) => {
      isDragging   = true;
      prevMouse    = { x: e.clientX, y: e.clientY };
      mouseDownPos = { x: e.clientX, y: e.clientY };
      renderer.domElement.style.cursor = "grabbing";
    };

    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        earthGroup.rotation.y += (e.clientX - prevMouse.x) * 0.004;
        earthGroup.rotation.x  = Math.max(-Math.PI / 2.5,
          Math.min(Math.PI / 2.5, earthGroup.rotation.x + (e.clientY - prevMouse.y) * 0.004));
        prevMouse = { x: e.clientX, y: e.clientY };
      } else {
        const latLng = getGlobeLatLng(e);
        isHoveringGlobe = !!latLng;
        onGlobeHoverRef.current(latLng);
        const hit    = getHit(e);
        const hitKey = hit ? ("iss" in hit ? -999 : hit.spotIndex) : -1;
        if (hitKey !== hoveredIndex) {
          hoveredIndex = hitKey;
          if (hit && "iss" in hit) onSpotHoverRef.current(hit.rotiferSpot ?? ISS_SPOT);
          else if (hit)            onSpotHoverRef.current(spots[hit.spotIndex]);
          else                     onSpotHoverRef.current(null);
          renderer.domElement.style.cursor = hit ? "pointer" : latLng ? "grab" : "default";
        }
      }
    };

    const onMouseLeave = () => { isHoveringGlobe = false; onGlobeHoverRef.current(null); };

    const onMouseUp = (e: MouseEvent) => {
      isDragging = false;
      renderer.domElement.style.cursor = "grab";
      if (Math.abs(e.clientX - mouseDownPos.x) < 5 && Math.abs(e.clientY - mouseDownPos.y) < 5) {
        const hit = getHit(e);
        const pos = { x: e.clientX, y: e.clientY };
        if (hit && "iss" in hit) onSpotClickRef.current(hit.rotiferSpot ?? ISS_SPOT, pos);
        else if (hit)            onSpotClickRef.current(spots[hit.spotIndex], pos);
      }
    };

    renderer.domElement.style.cursor = "grab";
    renderer.domElement.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    renderer.domElement.addEventListener("mouseleave", onMouseLeave);

    // ── Cleanup ────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      renderer.domElement.removeEventListener("mouseleave", onMouseLeave);
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [spots]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={mountRef} className="w-full h-full" />
      <div ref={overlayRef} style={{
        position: "absolute", inset: 0,
        background: "#ffffff",
        opacity: 0,
        pointerEvents: "none",
      }} />
    </div>
  );
}
