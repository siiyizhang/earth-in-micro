import { useEffect, useRef, useState } from "react";

interface GeoReadoutProps {
  latLng: { lat: number; lng: number } | null;
  fontMono?: string;
}

// Point-in-polygon ray casting
function pointInPolygon(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function pointInFeature(lng: number, lat: number, geometry: any): boolean {
  if (geometry.type === "Polygon") {
    return pointInPolygon(lng, lat, geometry.coordinates[0]);
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some((poly: number[][][]) => pointInPolygon(lng, lat, poly[0]));
  }
  return false;
}

type OceanFeature = { name: string; geometry: any };
let oceansCache: OceanFeature[] | null = null;

async function loadOceans(): Promise<OceanFeature[]> {
  if (oceansCache) return oceansCache;
  const r = await fetch("/oceans.geojson");
  const d = await r.json();
  oceansCache = d.features.map((f: any) => ({
    name: f.properties.name as string,
    geometry: f.geometry,
  }));
  return oceansCache!;
}

function lookupOcean(lng: number, lat: number, oceans: OceanFeature[]): string {
  for (const o of oceans) {
    if (pointInFeature(lng, lat, o.geometry)) return o.name;
  }
  return "";
}

export default function GeoReadout({ latLng, fontMono = "'JetBrains Mono', monospace" }: GeoReadoutProps) {
  const [place, setPlace] = useState<string>("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastKeyRef = useRef<string>("");
  const oceansRef = useRef<OceanFeature[] | null>(null);

  // Load oceans GeoJSON once
  useEffect(() => {
    loadOceans().then(o => { oceansRef.current = o; });
  }, []);

  useEffect(() => {
    if (!latLng) { setPlace(""); return; }

    const key = `${latLng.lat.toFixed(2)},${latLng.lng.toFixed(2)}`;
    if (key === lastKeyRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      lastKeyRef.current = key;
      const { lat, lng } = latLng;

      // Try ocean lookup first (local, instant)
      if (oceansRef.current) {
        const ocean = lookupOcean(lng, lat, oceansRef.current);
        if (ocean) { setPlace(ocean); return; }
      }

      // Fall back to BigDataCloud for country name
      try {
        const r = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat.toFixed(2)}&longitude=${lng.toFixed(2)}&localityLanguage=en`
        );
        const d = await r.json();
        setPlace(d.countryName || "");
      } catch {
        setPlace("");
      }
    }, 160);
  }, [latLng?.lat.toFixed(2), latLng?.lng.toFixed(2)]);

  if (!latLng) return null;

  const latDir = latLng.lat >= 0 ? "N" : "S";
  const lngDir = latLng.lng >= 0 ? "E" : "W";
  const latAbs = Math.abs(latLng.lat).toFixed(2);
  const lngAbs = Math.abs(latLng.lng).toFixed(2);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 28,
        right: 28,
        zIndex: 10,
        pointerEvents: "none",
        textAlign: "right",
      }}
    >
      {place && (
        <div style={{
          fontFamily: fontMono,
          fontSize: 12,
          fontWeight: 300,
          color: "rgba(255,255,255,0.55)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 5,
        }}>
          {place}
        </div>
      )}
      <div style={{
        fontFamily: fontMono,
        fontSize: 15,
        fontWeight: 400,
        color: "rgba(255,255,255,0.82)",
        letterSpacing: "0.04em",
        lineHeight: 1.5,
      }}>
        <span style={{ color: "rgba(255,255,255,0.25)", marginRight: 4 }}>LAT</span>
        {latAbs}°{latDir}
        <span style={{ color: "rgba(255,255,255,0.15)", margin: "0 6px" }}>·</span>
        <span style={{ color: "rgba(255,255,255,0.25)", marginRight: 4 }}>LNG</span>
        {lngAbs}°{lngDir}
      </div>
    </div>
  );
}
