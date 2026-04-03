import { useState, useEffect } from "react";
import EarthGlobe from "./components/EarthGlobeTexture";
import SpotPanel from "./components/SpotPanel";
import GeoReadout from "./components/GeoReadout";
import type { Spot } from "./data/spots";

export default function App() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [hoveredSpot, setHoveredSpot] = useState<Spot | null>(null);
  const [globeLatLng, setGlobeLatLng] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    fetch("/api/spots")
      .then((r) => r.json())
      .then((data) => { setSpots(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div
      className="relative w-screen h-screen overflow-hidden select-none"
      style={{ background: "#000008" }}
    >
      {!loading && (
        <EarthGlobe
          spots={spots}
          onSpotClick={setSelectedSpot}
          onSpotHover={setHoveredSpot}
          onGlobeHover={setGlobeLatLng}
        />
      )}

      {/* Top-left title */}
      <div className="absolute top-8 left-9 z-10 pointer-events-none">
        <h1
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 28,
            fontWeight: 400,
            fontStyle: "italic",
            color: "rgba(255,255,255,0.88)",
            letterSpacing: "0.01em",
            lineHeight: 1.15,
            margin: "0 0 5px",
          }}
        >
          Earth in Micro
        </h1>
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.2em",
            color: "rgba(255,255,255,0.45)",
            textTransform: "uppercase",
            fontWeight: 400,
          }}
        >
          A microscopic portrait of the world
        </div>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div
          className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
          style={{ color: "rgba(255,255,255,0.15)", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase" }}
        >
          Loading
        </div>
      )}

      {/* Hover tooltip — bottom center */}
      {hoveredSpot && !selectedSpot && (
        <div
          className="absolute bottom-10 left-1/2 z-10 pointer-events-none"
          style={{ transform: "translateX(-50%)" }}
        >
          <div
            style={{
              background: "rgba(2, 5, 14, 0.75)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 6,
              padding: "7px 20px 8px",
              textAlign: "center",
              whiteSpace: "nowrap",
            }}
          >
            <div style={{
              fontFamily: "'DM Serif Display', serif",
              fontStyle: "italic",
              fontSize: 15,
              color: "rgba(255,255,255,0.88)",
              letterSpacing: "0.01em",
            }}>
              {hoveredSpot.name}
            </div>
            <div style={{
              fontSize: 10,
              color: "rgba(255,255,255,0.28)",
              marginTop: 2,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}>
              {hoveredSpot.location}
            </div>
          </div>
        </div>
      )}

      {/* Bottom hint */}
      {!selectedSpot && !loading && (
        <div
          className="absolute bottom-5 left-1/2 z-10 pointer-events-none"
          style={{
            transform: "translateX(-50%)",
            fontSize: 10,
            color: "rgba(255,255,255,0.35)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          Drag to rotate · scroll to zoom · click to explore
        </div>
      )}

      <GeoReadout latLng={globeLatLng} />
      <SpotPanel spot={selectedSpot} onClose={() => setSelectedSpot(null)} />
    </div>
  );
}
