import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { Spot } from "../data/spots";

interface EarthGlobeProps {
  spots: Spot[];
  onSpotClick: (spot: Spot, screenPos: { x: number; y: number }) => void;
  onSpotHover: (spot: Spot | null) => void;
  onGlobeHover: (latLng: { lat: number; lng: number } | null) => void;
  fontSerif?: string;
  fontSans?: string;
  issStyle?: "glow" | "line";
  exploding?: boolean;
}

function latLngToVec3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}


// ISS spot object injected when issStyle is set
export const ISS_SPOT: Spot = {
  id: "iss",
  lat: 0, lng: 0, // dynamic, not used for rendering
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

export default function EarthGlobe({
  spots, onSpotClick, onSpotHover, onGlobeHover,
  fontSerif = "'Yaroop', serif",
  fontSans = "'Inter', sans-serif",
  issStyle,
  exploding = false,
}: EarthGlobeProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const onSpotClickRef = useRef(onSpotClick);
  const onSpotHoverRef = useRef(onSpotHover);
  const onGlobeHoverRef = useRef(onGlobeHover);
  const explodingRef = useRef(exploding);
  onSpotClickRef.current = onSpotClick;
  onSpotHoverRef.current = onSpotHover;
  onGlobeHoverRef.current = onGlobeHover;
  explodingRef.current = exploding;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const w = mount.clientWidth;
    const h = mount.clientHeight;

    // Scene
    const scene = new THREE.Scene();

    // Stars
    const starPositions = new Float32Array(2000 * 3);
    for (let i = 0; i < starPositions.length; i++) {
      starPositions[i] = (Math.random() - 0.5) * 400;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.25, transparent: true, opacity: 0.6 });
    scene.add(new THREE.Points(starGeo, starMat));

    // Camera
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.set(0, 0, 7);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000008, 1);
    mount.appendChild(renderer.domElement);

    // Earth group
    const earthGroup = new THREE.Group();
    scene.add(earthGroup);

    // Background materials — faded out during explosion
    const globeBgMaterials: (THREE.Material & { opacity: number })[] = [];

    // Dark base sphere (occludes back-side lines and labels)
    const baseGeo = new THREE.SphereGeometry(1.99, 64, 64);
    const baseMat = new THREE.MeshBasicMaterial({ color: 0x000008 });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    earthGroup.add(baseMesh);
    // baseMesh hidden immediately on explode — NOT in globeBgMaterials


    // Invisible sphere for globe surface raycasting
    const globeHitMesh = new THREE.Mesh(
      new THREE.SphereGeometry(2.0, 32, 32),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    earthGroup.add(globeHitMesh);

    // Load land + ocean dots, then build spot markers that snap to nearest land dot
    Promise.all([
      fetch("/land-dots.json").then(r => r.json()) as Promise<[number, number][]>,
      fetch("/ocean-dots.json").then(r => r.json()) as Promise<[number, number][]>,
    ]).then(([landPts, oceanPts]) => {
      // Find nearest land dot for each spot (great-circle approximation via dot product)
      function nearestDotIndex(lat: number, lng: number, pts: [number, number][]): number {
        const v = latLngToVec3(lat, lng, 1);
        let best = -1, bestDot = -Infinity;
        pts.forEach(([pLng, pLat], i) => {
          const u = latLngToVec3(pLat, pLng, 1);
          const d = v.dot(u);
          if (d > bestDot) { bestDot = d; best = i; }
        });
        return best;
      }

      // Claim one land dot per spot
      const claimedLandIndices = new Set<number>();
      const spotAnchorPts: [number, number][] = spots.map(spot => {
        const idx = nearestDotIndex(spot.lat, spot.lng, landPts);
        claimedLandIndices.add(idx);
        return landPts[idx];
      });

      // Render unclaimed land dots
      const unclaimedPositions: number[] = [];
      landPts.forEach(([lng, lat], i) => {
        if (claimedLandIndices.has(i)) return;
        const v = latLngToVec3(lat, lng, 2.001);
        unclaimedPositions.push(v.x, v.y, v.z);
      });
      const landGeo = new THREE.BufferGeometry();
      landGeo.setAttribute("position", new THREE.Float32BufferAttribute(unclaimedPositions, 3));
      const landMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.022, transparent: true, opacity: 0.65, sizeAttenuation: true });
      earthGroup.add(new THREE.Points(landGeo, landMat));
      globeBgMaterials.push(landMat);

      // Render ocean dots
      const oceanPositions = new Float32Array(oceanPts.length * 3);
      oceanPts.forEach(([lng, lat], i) => {
        const v = latLngToVec3(lat, lng, 2.001);
        oceanPositions[i * 3] = v.x; oceanPositions[i * 3 + 1] = v.y; oceanPositions[i * 3 + 2] = v.z;
      });
      const oceanGeo = new THREE.BufferGeometry();
      oceanGeo.setAttribute("position", new THREE.BufferAttribute(oceanPositions, 3));
      const oceanMat = new THREE.PointsMaterial({ color: 0x8899cc, size: 0.016, transparent: true, opacity: 0.6, sizeAttenuation: true });
      earthGroup.add(new THREE.Points(oceanGeo, oceanMat));
      globeBgMaterials.push(oceanMat);

      // Build spot markers anchored to claimed dots
      spots.forEach((spot, i) => {
        if (!spotAnchorPts[i]) { console.error("Missing anchor for", spot.name); return; }
        const [anchorLng, anchorLat] = spotAnchorPts[i];
        const anchorPos = latLngToVec3(anchorLat, anchorLng, 2.002);
        const normal = anchorPos.clone().normalize();

        // Larger solid dot at anchor (replaces the claimed grid dot)
        const dotGeo = new THREE.BufferGeometry();
        dotGeo.setAttribute("position", new THREE.Float32BufferAttribute([
          normal.x * 2.002, normal.y * 2.002, normal.z * 2.002
        ], 3));
        const dotPoints = new THREE.Points(dotGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.055, transparent: true, opacity: 1.0, sizeAttenuation: true }));
        dotPoints.renderOrder = 2;
        earthGroup.add(dotPoints);
        const dotSprite = dotPoints; // alias for spotVisObjects ref below

        // Short line from anchor to card
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
          normal.clone().multiplyScalar(2.01),
          normal.clone().multiplyScalar(2.45),
        ]);
        const lineMesh = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.65 }));
        lineMesh.renderOrder = 2;
        earthGroup.add(lineMesh);

        // Floating card sprite
        const cardPos = normal.clone().multiplyScalar(2.45);
        const cardTex = makeCardTexture(spot.name, null);
        const cardMat = new THREE.SpriteMaterial({ map: cardTex, transparent: true, depthTest: true, depthWrite: false });
        const cardSprite = new THREE.Sprite(cardMat);
        cardSprite.position.copy(cardPos);
        const cardH = 0.55;
        cardSprite.scale.set(cardH * (320/352), cardH, 1);
        cardSprite.renderOrder = 4;
        earthGroup.add(cardSprite);

        // Load image
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

        // (no ISS tardigrade reference needed)

        // Back-face culling + store original positions for explosion reset
        cardSprite.userData.surfaceNormal = normal.clone();
        cardSprite.userData.originPos = cardSprite.position.clone();
        lineMesh.userData.surfaceNormal = normal.clone();
        lineMesh.userData.originPos = lineMesh.position.clone();
        dotSprite.userData.surfaceNormal = normal.clone();
        dotSprite.userData.originPos = dotSprite.position.clone();
        hitMesh.userData.surfaceNormal = normal.clone();
        hitMesh.userData.originPos = hitMesh.position.clone();
        spotVisObjects.push(cardSprite, lineMesh, dotSprite, hitMesh);
      });
    }).catch(() => {});

    // Continent/ocean labels
    const geoLabels = [
      // Continents
      { name: "North America", lat: 45.0,  lng: -100.0, ocean: false },
      { name: "South America", lat: -15.0, lng: -60.0,  ocean: false },
      { name: "Europe",        lat: 54.0,  lng: 15.0,   ocean: false },
      { name: "Africa",        lat: 0.0,   lng: 20.0,   ocean: false },
      { name: "Asia",          lat: 48.0,  lng: 100.0,  ocean: false },
      { name: "Oceania",       lat: -25.0, lng: 135.0,  ocean: false },
      { name: "Antarctica",    lat: -80.0, lng: 0.0,    ocean: false },
      // Oceans
      { name: "Pacific Ocean",  lat: 5.0,   lng: -150.0, ocean: true },
      { name: "Atlantic Ocean", lat: 10.0,  lng: -30.0,  ocean: true },
      { name: "Indian Ocean",   lat: -20.0, lng: 80.0,   ocean: true },
      { name: "Arctic Ocean",   lat: 85.0,  lng: 0.0,    ocean: true },
      { name: "Southern Ocean", lat: -60.0, lng: 90.0,   ocean: true },
    ];

    geoLabels.forEach(({ name, lat, lng, ocean }) => {
      const W = 512, H = 80;
      const canvas = document.createElement("canvas");
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, W, H);
      if (ocean) {
        ctx.font = `300 15px ${fontSans}`;
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.letterSpacing = "6px";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(name.toUpperCase(), W / 2, H / 2);
      } else {
        ctx.font = `100 25px ${fontSerif}`;
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(name.toUpperCase(), W / 2, H / 2);
      }

      const tex = new THREE.CanvasTexture(canvas);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide });
      globeBgMaterials.push(mat);
      // Plane sized to match canvas aspect (W/H = 6.4), height = 0.38 world units
      const geo = new THREE.PlaneGeometry(6.4 * 0.38, 0.38);
      const mesh = new THREE.Mesh(geo, mat);

      // Position on sphere surface
      const pos = latLngToVec3(lat, lng, 2.02);
      mesh.position.copy(pos);

      // Orient the plane tangent to the sphere: normal points outward, up = north
      const normal = pos.clone().normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const right = up.clone().cross(normal).normalize();
      const localUp = normal.clone().cross(right).normalize();
      const m = new THREE.Matrix4().makeBasis(right, localUp, normal);
      mesh.setRotationFromMatrix(m);

      mesh.renderOrder = 1;
      earthGroup.add(mesh);
    });

    // Spot markers: surface dot + outward line + floating label card
    const spotMeshes: THREE.Mesh[] = [];
    const spotVisObjects: THREE.Object3D[] = []; // all objects needing back-face culling

    // Helper: make label card texture (image + name below)
    function makeCardTexture(name: string, imgEl: HTMLImageElement | null): THREE.CanvasTexture {
      const W = 320, IMG_H = 256, NAME_H = 96, H = IMG_H + NAME_H;
      const canvas = document.createElement("canvas");
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, W, H);

      // Image area (circular crop) — circle fixed to 256px diameter, centered in W
      const CIRC = 256;
      const circX = W / 2;
      if (imgEl) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(circX, IMG_H/2, CIRC/2 - 2, 0, Math.PI * 2);
        ctx.clip();
        const aspect = imgEl.naturalWidth / imgEl.naturalHeight;
        const d = CIRC - 4;
        const dw = aspect >= 1 ? d * aspect : d;
        const dh = aspect >= 1 ? d : d / aspect;
        ctx.drawImage(imgEl, circX - dw/2, (IMG_H - dh)/2, dw, dh);
        ctx.restore();
      } else {
        // placeholder circle
        ctx.beginPath();
        ctx.arc(circX, IMG_H/2, CIRC/2 - 2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fill();
      }

      // Name label below — wrap to two lines if too wide, keep font size fixed
      const fontSize = 36;
      const lineH = 40;
      ctx.font = `400 ${fontSize}px 'Yarorg', serif`;
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const maxW = W;
      if (ctx.measureText(name).width <= maxW) {
        // Single line — vertically centered in NAME_H
        ctx.fillText(name, W/2, IMG_H + NAME_H/2);
      } else {
        // Split into two lines at the last space that fits
        const words = name.split(" ");
        let line1 = "", line2 = "";
        let split = words.length - 1;
        for (let s = 1; s < words.length; s++) {
          const try1 = words.slice(0, s).join(" ");
          const try2 = words.slice(s).join(" ");
          if (ctx.measureText(try1).width <= maxW && ctx.measureText(try2).width <= maxW) {
            split = s; break;
          }
        }
        line1 = words.slice(0, split).join(" ");
        line2 = words.slice(split).join(" ");
        const midY = IMG_H + NAME_H / 2;
        ctx.fillText(line1, W/2, midY - lineH/2);
        ctx.fillText(line2, W/2, midY + lineH/2);
      }

      return new THREE.CanvasTexture(canvas);
    }


    // ── ISS orbits ────────────────────────────────────────────────────────────
    // Orbit radius: 2.0 × (6371+408)/6371 = 2.128, inclination 51.6°
    const ISS_R = 2.128;
    const ISS_INC = 51.6 * Math.PI / 180;
    const ISS_PERIOD = 200; // seconds per orbit

    // Position on inclined orbit ring: yaw rotates the plane around Y axis
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

    // ISS A: has a rotifer card that travels with it
    // ISS B: icon only, no card
    let issAIcon: THREE.Sprite | null = null;
    let issACard: THREE.Sprite | null = null;
    let issALine: THREE.Line | null = null;
    let issAHit: THREE.Mesh | null = null;
    let issBIcon: THREE.Sprite | null = null;

    if (issStyle) {
      const SEGMENTS = 256;
      const orbitYaws = [0, 90]; // two orbit planes

      // ISS icon texture (shared)
      const S = 64;
      const iconCanvas = document.createElement("canvas");
      iconCanvas.width = S; iconCanvas.height = S;
      const ic = iconCanvas.getContext("2d")!;
      const cx = S / 2, cy = S / 2;
      ic.fillStyle = issStyle === "glow" ? "#88ccff" : "rgba(255,255,255,0.9)";
      if (issStyle === "glow") { ic.shadowColor = "#66aaff"; ic.shadowBlur = 6; }
      ic.fillRect(4, cy - 1, S - 8, 2);
      ic.fillRect(cx - 4, cy - 6, 8, 12);
      ic.fillRect(6, cy - 10, 14, 7);
      ic.fillRect(6, cy + 3, 14, 7);
      ic.fillRect(S - 20, cy - 10, 14, 7);
      ic.fillRect(S - 20, cy + 3, 14, 7);
      const issIconTex = new THREE.CanvasTexture(iconCanvas);

      // Draw two orbit rings
      orbitYaws.forEach(yaw => {
        const pts: THREE.Vector3[] = [];
        for (let j = 0; j <= SEGMENTS; j++) {
          pts.push(issOrbitPt((j / SEGMENTS) * Math.PI * 2, yaw));
        }
        const orbitMat = new THREE.LineDashedMaterial({
          color: issStyle === "glow" ? 0x88ccff : 0xffffff,
          transparent: true,
          opacity: issStyle === "glow" ? 0.65 : 0.62,
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
      const issAInitPos = issOrbitPt(0, 0);
      issAIcon = new THREE.Sprite(new THREE.SpriteMaterial({
        map: issIconTex, transparent: true, depthTest: false, depthWrite: false,
      }));
      issAIcon.scale.setScalar(0.16);
      issAIcon.renderOrder = 5;
      issAIcon.position.copy(issAInitPos);
      issAIcon.visible = false;
      earthGroup.add(issAIcon);

      // Rotifer card — use data from spots prop (location === "ISS")
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
      const issAInitNorm = issAInitPos.clone().normalize();
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

      // Line from ISS A to its card (endpoints updated per frame)
      issALine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
        new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.32 })
      );
      issALine.renderOrder = 2;
      issALine.visible = false;
      earthGroup.add(issALine);

      // Hit sphere on card
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

      // Add ISS objects to spotVisObjects so explosion logic covers them
      issAIcon.userData.originPos = issAIcon.position.clone();
      issACard.userData.originPos = issACard.position.clone();
      issBIcon.userData.originPos = issBIcon.position.clone();
      spotVisObjects.push(issAIcon, issACard, issBIcon);
    }

    // State
    let isDragging = false;
    let isHoveringGlobe = false;
    let prevMouse = { x: 0, y: 0 };
    let mouseDownPos = { x: 0, y: 0 };
    let hoveredIndex = -1;
    let time = 0;
    let rafId: number;

    // Explosion velocities — one per spotVisObject, assigned on first explode frame
    const explodeVelocities = new Map<THREE.Object3D, THREE.Vector3>();
    // Store original opacities so we can restore them after explosion
    const bgOriginalOpacities: number[] = [];
    // Store original material opacities for spotVisObjects sprites
    const spriteOriginalOpacities = new Map<THREE.Object3D, number>();
    let wasExploding = false;
    let explodeStartTime = 0;
    const EXPLODE_DURATION = 1.2; // seconds — all objects fully gone by this time

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      time += 0.016;

      if (!isDragging && !isHoveringGlobe) earthGroup.rotation.y += 0.0006;

      // Shared: update world matrix + camera direction once per frame
      earthGroup.updateMatrixWorld(true);
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(earthGroup.matrixWorld);
      const camDir = camera.position.clone().normalize();

      // Update ISS A (icon only, yaw=0) — skip during explosion
      if (issAIcon && !explodingRef.current) {
        const theta = (time / ISS_PERIOD) * Math.PI * 2;
        const pos = issOrbitPt(theta, 0);
        issAIcon.position.copy(pos);
        const norm = pos.clone().normalize();
        const wn = norm.clone().applyMatrix3(normalMatrix).normalize();
        issAIcon.visible = wn.dot(camDir) > 0.0;
      }

      // Update ISS B (with rotifer card, yaw=90, starts facing camera) — skip during explosion
      if (issBIcon && issACard && issALine && issAHit && !explodingRef.current) {
        const theta = (time / ISS_PERIOD) * Math.PI * 2 + Math.PI;
        const pos = issOrbitPt(theta, 90);
        issBIcon.position.copy(pos);
        const norm = pos.clone().normalize();
        const cardPos = norm.clone().multiplyScalar(ISS_R + 0.65);
        issACard.position.copy(cardPos);
        issAHit.position.copy(cardPos);
        const lp = issALine.geometry.attributes.position as THREE.BufferAttribute;
        lp.setXYZ(0, pos.x, pos.y, pos.z);
        lp.setXYZ(1, cardPos.x, cardPos.y, cardPos.z);
        lp.needsUpdate = true;
        const wn = norm.clone().applyMatrix3(normalMatrix).normalize();
        const vis = wn.dot(camDir) > 0.0;
        issBIcon.visible = vis;
        issACard.visible = vis;
        issALine.visible = vis;
        issAHit.visible = vis;
      }

      if (explodingRef.current) {
        // Assign random velocities on first explode frame
        if (!wasExploding) {
          wasExploding = true;
          explodeStartTime = time;
          // Hide base sphere immediately so back-face objects don't ghost through
          // Save original opacities
          bgOriginalOpacities.length = 0;
          globeBgMaterials.forEach(m => bgOriginalOpacities.push(m.opacity));
          spriteOriginalOpacities.clear();
          spotVisObjects.forEach(obj => {
            // Only explode front-facing objects — back-face ones stay hidden to avoid ghosting
            const n: THREE.Vector3 | undefined = obj.userData.surfaceNormal;
            if (n) {
              const worldNormal = n.clone().applyMatrix3(normalMatrix).normalize();
              if (worldNormal.dot(camDir) <= 0.15) {
                obj.visible = false;
                return;
              }
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
        // Progress 0→1 over EXPLODE_DURATION seconds
        const t = Math.min((time - explodeStartTime) / EXPLODE_DURATION, 1);
        // Fade in black overlay to hide globe (avoids back-face ghosting)
        if (overlayRef.current) overlayRef.current.style.opacity = String(t);
        // Fade out background materials too (dots, labels)
        globeBgMaterials.forEach((m, i) => { m.opacity = (bgOriginalOpacities[i] ?? 1) * (1 - t); });
        // Move and fade out each exploding object
        explodeVelocities.forEach((vel, obj) => {
          obj.position.add(vel);
          if (obj instanceof THREE.Sprite) {
            const mat = obj.material as THREE.SpriteMaterial;
            mat.depthTest = false;
            mat.opacity = (spriteOriginalOpacities.get(obj) ?? 1) * (1 - t);
          }
        });
      } else {
        // Reset on return
        if (wasExploding) {
          wasExploding = false;
          if (overlayRef.current) overlayRef.current.style.opacity = "0";
          // Restore background opacities
          globeBgMaterials.forEach((m, i) => { m.opacity = bgOriginalOpacities[i] ?? 1; });
          explodeVelocities.forEach((_, obj) => {
            if (obj.userData.originPos) obj.position.copy(obj.userData.originPos);
            if (obj instanceof THREE.Sprite) {
              const mat = obj.material as THREE.SpriteMaterial;
              mat.depthTest = true;
              mat.opacity = spriteOriginalOpacities.get(obj) ?? 1;
            }
          });
          explodeVelocities.clear();
          spriteOriginalOpacities.clear();
        }
        // Normal back-face culling
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

    // Resize
    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    // Raycasting helpers
    const getNDC = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      return new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
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
      // Transform hit point from world space to earthGroup local space
      const local = earthGroup.worldToLocal(hits[0].point.clone());
      const normalized = local.normalize();
      const lat = 90 - Math.acos(normalized.y) * (180 / Math.PI);
      let lng = Math.atan2(normalized.z, -normalized.x) * (180 / Math.PI) - 180;
      if (lng < -180) lng += 360;
      return { lat, lng };
    };

    // Mouse handlers
    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
      mouseDownPos = { x: e.clientX, y: e.clientY };
      renderer.domElement.style.cursor = "grabbing";
    };
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        earthGroup.rotation.y += (e.clientX - prevMouse.x) * 0.004;
        earthGroup.rotation.x = Math.max(-Math.PI/2.5,
          Math.min(Math.PI/2.5, earthGroup.rotation.x + (e.clientY - prevMouse.y) * 0.004));
        prevMouse = { x: e.clientX, y: e.clientY };
      } else {
        const latLng = getGlobeLatLng(e);
        isHoveringGlobe = !!latLng;
        onGlobeHoverRef.current(latLng);
        const hit = getHit(e);
        const hitKey = hit ? ('iss' in hit ? -999 : hit.spotIndex) : -1;
        if (hitKey !== hoveredIndex) {
          hoveredIndex = hitKey;
          if (hit && 'iss' in hit) onSpotHoverRef.current(hit.rotiferSpot ?? ISS_SPOT);
          else if (hit) onSpotHoverRef.current(spots[hit.spotIndex]);
          else onSpotHoverRef.current(null);
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
        if (hit && 'iss' in hit) onSpotClickRef.current(hit.rotiferSpot ?? ISS_SPOT, pos);
        else if (hit) onSpotClickRef.current(spots[hit.spotIndex], pos);
      }
    };
    // Touch handlers
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      isDragging = true;
      prevMouse = { x: t.clientX, y: t.clientY };
      mouseDownPos = { x: t.clientX, y: t.clientY };
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return;
      e.preventDefault();
      const t = e.touches[0];
      earthGroup.rotation.y += (t.clientX - prevMouse.x) * 0.004;
      earthGroup.rotation.x = Math.max(-Math.PI / 2.5,
        Math.min(Math.PI / 2.5, earthGroup.rotation.x + (t.clientY - prevMouse.y) * 0.004));
      prevMouse = { x: t.clientX, y: t.clientY };
    };
    const onTouchEnd = (e: TouchEvent) => {
      isDragging = false;
      const t = e.changedTouches[0];
      if (Math.abs(t.clientX - mouseDownPos.x) < 8 && Math.abs(t.clientY - mouseDownPos.y) < 8) {
        const synth = { clientX: t.clientX, clientY: t.clientY } as MouseEvent;
        const hit = getHit(synth);
        const pos = { x: t.clientX, y: t.clientY };
        if (hit && 'iss' in hit) onSpotClickRef.current(hit.rotiferSpot ?? ISS_SPOT, pos);
        else if (hit) onSpotClickRef.current(spots[hit.spotIndex], pos);
      }
    };

    renderer.domElement.style.cursor = "grab";
    renderer.domElement.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    renderer.domElement.addEventListener("mouseleave", onMouseLeave);
    renderer.domElement.addEventListener("touchstart", onTouchStart, { passive: true });
    renderer.domElement.addEventListener("touchmove", onTouchMove, { passive: false });
    renderer.domElement.addEventListener("touchend", onTouchEnd);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      renderer.domElement.removeEventListener("mouseleave", onMouseLeave);
      renderer.domElement.removeEventListener("touchstart", onTouchStart);
      renderer.domElement.removeEventListener("touchmove", onTouchMove);
      renderer.domElement.removeEventListener("touchend", onTouchEnd);
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [spots]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={mountRef} className="w-full h-full" />
      <div ref={overlayRef} style={{
        position: "absolute", inset: 0,
        background: "#000008",
        opacity: 0,
        pointerEvents: "none",
      }} />
    </div>
  );
}
