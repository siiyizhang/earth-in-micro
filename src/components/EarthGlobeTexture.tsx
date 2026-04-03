import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { Spot } from "../data/spots";

interface EarthGlobeProps {
  spots: Spot[];
  onSpotClick: (spot: Spot) => void;
  onSpotHover: (spot: Spot | null) => void;
  onGlobeHover: (latLng: { lat: number; lng: number } | null) => void;
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

// Create a placeholder dot sprite (small white dot with soft glow)
function makePlaceholderSprite(): THREE.Sprite {
  const S = 128;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d")!;

  // Soft outer glow
  const glow = ctx.createRadialGradient(S/2, S/2, 2, S/2, S/2, S*0.38);
  glow.addColorStop(0, "rgba(255,255,255,0.5)");
  glow.addColorStop(0.4, "rgba(255,255,255,0.12)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, S, S);

  // Small solid dot
  ctx.beginPath();
  ctx.arc(S/2, S/2, S*0.07, 0, Math.PI*2);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.setScalar(0.26);
  return sprite;
}

// Replace sprite texture with a circular-cropped version of the loaded image
function applyImageToSprite(sprite: THREE.Sprite, imgEl: HTMLImageElement) {
  const S = 256;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d")!;

  // Soft outer glow
  const glow = ctx.createRadialGradient(S/2, S/2, S*0.28, S/2, S/2, S/2);
  glow.addColorStop(0, "rgba(255,255,255,0.18)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, S, S);

  // Clip circle and draw image (cover-fill), shrink radius by 1px to kill anti-alias fringe
  ctx.save();
  ctx.beginPath();
  ctx.arc(S/2, S/2, S*0.38 - 1, 0, Math.PI*2);
  ctx.clip();
  const r = S * 0.38 * 2;
  const aspect = imgEl.naturalWidth / imgEl.naturalHeight;
  const dw = aspect >= 1 ? r * aspect : r;
  const dh = aspect >= 1 ? r : r / aspect;
  ctx.drawImage(imgEl, (S - dw)/2, (S - dh)/2, dw, dh);
  ctx.restore();


  const mat = sprite.material as THREE.SpriteMaterial;
  if (mat.map) mat.map.dispose();
  mat.map = new THREE.CanvasTexture(canvas);
  mat.needsUpdate = true;
}

export default function EarthGlobe({ spots, onSpotClick, onSpotHover, onGlobeHover }: EarthGlobeProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const onSpotClickRef = useRef(onSpotClick);
  const onSpotHoverRef = useRef(onSpotHover);
  const onGlobeHoverRef = useRef(onGlobeHover);
  onSpotClickRef.current = onSpotClick;
  onSpotHoverRef.current = onSpotHover;
  onGlobeHoverRef.current = onGlobeHover;

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
    camera.position.set(0, 0, 6);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000008, 1);
    mount.appendChild(renderer.domElement);

    // Earth group
    const earthGroup = new THREE.Group();
    scene.add(earthGroup);

    // Textured earth sphere
    const baseGeo = new THREE.SphereGeometry(1.99, 64, 64);
    const baseMat = new THREE.MeshPhongMaterial({ color: 0x888888, shininess: 8 });
    earthGroup.add(new THREE.Mesh(baseGeo, baseMat));

    const texLoader = new THREE.TextureLoader();
    texLoader.load("/textures/earth_topo.jpg", (tex) => {
      baseMat.map = tex;
      baseMat.color.set(0xffffff);
      baseMat.needsUpdate = true;
    });

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambientLight);
    const sunLight = new THREE.DirectionalLight(0xffeedd, 1.3);
    sunLight.position.set(5, 3, 5);
    scene.add(sunLight);


    // Invisible sphere for globe surface raycasting
    const globeHitMesh = new THREE.Mesh(
      new THREE.SphereGeometry(2.0, 32, 32),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    earthGroup.add(globeHitMesh);

    // Continent labels
    const continents = [
      { name: "North America", lat: 45.0,  lng: -100.0 },
      { name: "South America", lat: -15.0, lng: -60.0  },
      { name: "Europe",        lat: 54.0,  lng: 15.0   },
      { name: "Africa",        lat: 0.0,   lng: 20.0   },
      { name: "Asia",          lat: 48.0,  lng: 100.0  },
      { name: "Oceania",       lat: -25.0, lng: 135.0  },
      { name: "Antarctica",    lat: -80.0, lng: 0.0    },
    ];

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
        ctx.font = "300 13px 'DM Sans', sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.22)";
        ctx.letterSpacing = "6px";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(name.toUpperCase(), W / 2, H / 2);
      } else {
        ctx.font = "italic 26px 'DM Serif Display', serif";
        ctx.fillStyle = "rgba(255,255,255,0.45)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(name, W / 2, H / 2);
      }

      const tex = new THREE.CanvasTexture(canvas);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide });
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

    // Spot markers
    const spotMeshes: THREE.Mesh[] = [];
    const spotSprites: THREE.Sprite[] = [];

    spots.forEach((spot, i) => {
      const pos = latLngToVec3(spot.lat, spot.lng, 2.0);
      const normal = pos.clone().normalize();

      // Invisible hit sphere for raycasting
      const hitGeo = new THREE.SphereGeometry(0.12, 8, 8);
      const hitMat = new THREE.MeshBasicMaterial({ visible: false });
      const hitMesh = new THREE.Mesh(hitGeo, hitMat);
      hitMesh.position.copy(normal.clone().multiplyScalar(2.22));
      hitMesh.userData = { spotIndex: i };
      hitMesh.renderOrder = 3;
      earthGroup.add(hitMesh);
      spotMeshes.push(hitMesh);

      // Placeholder sprite shown immediately
      const sprite = makePlaceholderSprite();
      sprite.position.copy(normal.clone().multiplyScalar(2.22));
      sprite.renderOrder = 2;
      earthGroup.add(sprite);
      spotSprites.push(sprite);

      // Load image and replace sprite texture (only if imageUrl is set)
      if (spot.imageUrl) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => { applyImageToSprite(sprite, img); };
        img.src = spot.imageUrl;
      }
    });

    // Hover ring sprite
    const ringS = 128;
    const ringCanvas = document.createElement("canvas");
    ringCanvas.width = ringS;
    ringCanvas.height = ringS;
    const ringCtx = ringCanvas.getContext("2d")!;
    ringCtx.beginPath();
    ringCtx.arc(ringS/2, ringS/2, ringS*0.44, 0, Math.PI*2);
    ringCtx.strokeStyle = "rgba(255,255,255,0.6)";
    ringCtx.lineWidth = 1.5;
    ringCtx.stroke();
    const ringMat = new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(ringCanvas),
      transparent: true, depthTest: true, depthWrite: false, opacity: 0,
    });
    const ringSprite = new THREE.Sprite(ringMat);
    ringSprite.scale.setScalar(0.58);
    ringSprite.renderOrder = 3;
    earthGroup.add(ringSprite);

    // State
    let isDragging = false;
    let isHoveringGlobe = false;
    let prevMouse = { x: 0, y: 0 };
    let mouseDownPos = { x: 0, y: 0 };
    let hoveredIndex = -1;
    let time = 0;
    let rafId: number;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      time += 0.016;

      if (!isDragging && !isHoveringGlobe) earthGroup.rotation.y += 0.0006;

      spotSprites.forEach((sprite, i) => {
        const hasImage = (sprite.material as THREE.SpriteMaterial).map !== null;
        const base = hasImage
          ? (hoveredIndex === i ? 0.37 : 0.30)
          : (hoveredIndex === i ? 0.29 : 0.26);
        sprite.scale.setScalar(base);
      });

      if (hoveredIndex >= 0 && hoveredIndex < spotSprites.length) {
        ringSprite.position.copy(spotSprites[hoveredIndex].position);
        ringMat.opacity = 0.85;
      } else {
        ringMat.opacity = 0;
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
    const getHit = (e: MouseEvent) => {
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(getNDC(e), camera);
      const hits = raycaster.intersectObjects(spotMeshes);
      return hits.length > 0 ? (hits[0].object.userData.spotIndex as number) : -1;
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
        const idx = getHit(e);
        if (idx !== hoveredIndex) {
          hoveredIndex = idx;
          onSpotHoverRef.current(idx >= 0 ? spots[idx] : null);
          renderer.domElement.style.cursor = idx >= 0 ? "pointer" : latLng ? "grab" : "default";
        }
      }
    };
    const onMouseLeave = () => { isHoveringGlobe = false; onGlobeHoverRef.current(null); };
    const onMouseUp = (e: MouseEvent) => {
      isDragging = false;
      renderer.domElement.style.cursor = "grab";
      if (Math.abs(e.clientX - mouseDownPos.x) < 5 && Math.abs(e.clientY - mouseDownPos.y) < 5) {
        const idx = getHit(e);
        if (idx >= 0) onSpotClickRef.current(spots[idx]);
      }
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.setLength(Math.max(3.5, Math.min(10, camera.position.length() + e.deltaY * 0.01)));
    };

    renderer.domElement.style.cursor = "grab";
    renderer.domElement.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
    renderer.domElement.addEventListener("mouseleave", onMouseLeave);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.domElement.removeEventListener("mouseleave", onMouseLeave);
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [spots]);

  return <div ref={mountRef} className="w-full h-full" />;
}
