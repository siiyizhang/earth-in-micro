import { useState, useEffect, useRef } from "react";
import EarthGlobe from "./components/EarthGlobe";
import SpotPanel from "./components/SpotPanel";
import GeoReadout from "./components/GeoReadout";
import type { Spot } from "./data/spots";

const FONTS = {
  serif: "'Yaroop', serif",
  sans: "'Inter', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

interface AppProps {
  issStyle?: "glow" | "line";
}

export default function App({ issStyle }: AppProps = {}) {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [selectedPos, setSelectedPos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredSpot, setHoveredSpot] = useState<Spot | null>(null);
  const [globeLatLng, setGlobeLatLng] = useState<{ lat: number; lng: number } | null>(null);
  // stage: 0 = globe, 1 = explode + text, 2 = product page
  const [stage, setStage] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/spots")
      .then((r) => r.json())
      .then((data) => { setSpots(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Keyboard + wheel navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "PageDown") setStage(s => Math.min(s + 1, 2));
      if (e.key === "ArrowUp" || e.key === "PageUp") setStage(s => Math.max(s - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    let locked = false;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (locked) return;
      if (Math.abs(e.deltaY) < 10) return; // ignore tiny movements
      locked = true;
      setTimeout(() => { locked = false; }, 1200);
      if (e.deltaY > 0) setStage(s => Math.min(s + 1, 2));
      else setStage(s => Math.max(s - 1, 0));
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  const goToProduct = () => setStage(2);
  const goToGlobe = () => setStage(0);

  return (
    <div ref={containerRef} style={{ width: "100vw", height: "100vh", overflow: "hidden", background: "#000008" }}>
      {/* Two-screen stack, shifted by page */}
      <div
        style={{
          width: "100%",
          height: "200vh",
          transform: stage === 2 ? "translateY(-100vh)" : "translateY(0)",
          transition: "transform 0.8s cubic-bezier(0.77, 0, 0.18, 1)",
        }}
      >
        {/* ── Screen 1: Globe ── */}
        <div
          className="relative select-none"
          style={{ width: "100vw", height: "100vh", overflow: "hidden", background: "#000008" }}
        >
          {!loading && (
            <div className="w-full h-full">
              <EarthGlobe
                spots={spots}
                onSpotClick={(spot, pos) => { setSelectedSpot(spot); setSelectedPos(pos); }}
                onSpotHover={setHoveredSpot}
                onGlobeHover={setGlobeLatLng}
                fontSerif={FONTS.serif}
                fontSans={FONTS.sans}
                issStyle={issStyle}
                exploding={stage >= 1}
              />
            </div>
          )}

          {/* Top-left title */}
          <div className="absolute top-8 left-9 z-10 pointer-events-none">
            <h1 style={{
              fontFamily: FONTS.serif,
              fontSize: 28,
              fontWeight: 100,
              color: "rgba(255,255,255,0.88)",
              letterSpacing: "0.01em",
              lineHeight: 1.15,
              margin: "0 0 5px",
            }}>
              Earth in Micro
            </h1>
            <div style={{
              fontFamily: FONTS.sans,
              fontSize: 11,
              letterSpacing: "0.2em",
              color: "rgba(255,255,255,0.45)",
              textTransform: "uppercase",
              fontWeight: 400,
            }}>
              A microscopic portrait of the world
            </div>
          </div>

          {loading && (
            <div
              className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
              style={{ fontFamily: FONTS.sans, color: "rgba(255,255,255,0.15)", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase" }}
            >
              Loading
            </div>
          )}

          {hoveredSpot && !selectedSpot && (
            <div className="absolute bottom-10 left-1/2 z-10 pointer-events-none" style={{ transform: "translateX(-50%)" }}>
              <div style={{
                background: "rgba(2, 5, 14, 0.75)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 6,
                padding: "7px 20px 8px",
                textAlign: "center",
                whiteSpace: "nowrap",
              }}>
                <div style={{ fontFamily: FONTS.serif, fontStyle: "italic", fontSize: 15, color: "rgba(255,255,255,0.88)", letterSpacing: "0.01em" }}>
                  {hoveredSpot.name}
                </div>
                <div style={{ fontFamily: FONTS.sans, fontSize: 10, color: "rgba(255,255,255,0.28)", marginTop: 2, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                  {hoveredSpot.location}
                </div>
              </div>
            </div>
          )}

          {!selectedSpot && !loading && (
            <div
              className="absolute bottom-5 left-1/2 z-10 pointer-events-none"
              style={{ transform: "translateX(-50%)", fontFamily: FONTS.sans, fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.18em", textTransform: "uppercase", whiteSpace: "nowrap" }}
            >
              Drag to rotate · click to explore
            </div>
          )}

          {/* Down arrow — bottom center */}
          {!selectedSpot && !loading && (
            <button
              onClick={goToProduct}
              style={{
                position: "absolute",
                bottom: 36,
                right: 36,
                zIndex: 10,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 8,
                opacity: 0.35,
                transition: "opacity 0.2s",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.8")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "0.35")}
            >
              <span style={{ fontFamily: FONTS.sans, fontSize: 9, letterSpacing: "0.2em", color: "white", textTransform: "uppercase" }}>Discover</span>
              {/* Animated chevron */}
              <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
                <path d="M1 1L8 8L15 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}

          <GeoReadout latLng={globeLatLng} fontMono={FONTS.mono} />
          <SpotPanel spot={selectedSpot} screenPos={selectedPos} onClose={() => { setSelectedSpot(null); setSelectedPos(null); }} fontSerif={FONTS.serif} fontSans={FONTS.sans} />

          {/* Explosion overlay text + product image */}
          <div style={{
            position: "absolute", inset: 0, zIndex: 30,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            pointerEvents: "none",
            opacity: stage === 1 ? 1 : 0,
            transition: "opacity 0.8s ease",
            paddingTop: "8vh",
          }}>
            <p style={{
              fontFamily: "'YaroSt', serif",
              fontWeight: 700,
              fontSize: "clamp(40px, 2.8vw, 38px)",
              color: "rgba(255,255,255,0.92)",
              textAlign: "center",
              lineHeight: 1.5,
              letterSpacing: "0.01em",
              maxWidth: 900,
              padding: "0 40px",
              margin: "0 0 32px",
            }}>
              Wanna explore and capture<br />the earth in micro yourself?<br />
              <span style={{ color: "rgba(255,255,255,1)" }}>Meet Eureka Microscope</span>
            </p>
            <img
              src="/prototype.png"
              alt="Eureka Microscope"
              style={{
                width: "clamp(160px, 18vw, 260px)",
                opacity: 0.82,
                objectFit: "contain",
              }}
            />
          </div>
        </div>

        {/* ── Screen 2: Product ── */}
        <div
          style={{
            width: "100vw",
            height: "100vh",
            position: "relative",
            overflow: "hidden",
            background: "#000008",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Product image — right side, contained, fades into background */}
          <div style={{
            position: "absolute",
            right: 0,
            top: 0,
            width: "52%",
            height: "100%",
            pointerEvents: "none",
          }}>
            <img
              src="/prototype.png"
              alt="Earth in Micro prototype"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                objectPosition: "center right",
                opacity: 0.88,
              }}
            />
            {/* Fade edges into background */}
            <div style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to right, #000008 0%, transparent 30%, transparent 70%, #000008 100%)",
            }} />
            <div style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to bottom, #000008 0%, transparent 15%, transparent 80%, #000008 100%)",
            }} />
          </div>

          {/* Text content — left side */}
          <div style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            width: "100%",
            maxWidth: 960,
            padding: "0 80px",
          }}>
            <div style={{
              fontFamily: FONTS.sans,
              fontSize: 10,
              letterSpacing: "0.28em",
              color: "rgba(255,255,255,0.35)",
              textTransform: "uppercase",
              marginBottom: 16,
            }}>
              The Instrument
            </div>
            <h2 style={{
              fontFamily: FONTS.serif,
              fontWeight: 100,
              fontSize: "clamp(36px, 4.5vw, 60px)",
              color: "rgba(255,255,255,0.92)",
              letterSpacing: "-0.01em",
              lineHeight: 1.1,
              margin: "0 0 24px",
              maxWidth: 420,
            }}>
              Prosumer-level <br />Portable Microscope
            </h2>
            <p style={{
              fontFamily: FONTS.sans,
              fontSize: 14,
              lineHeight: 1.9,
              color: "rgba(255,255,255,0.42)",
              maxWidth: 380,
              margin: "0 0 40px",
              fontWeight: 300,
            }}>
              Compact, portable, and powerful — designed to reveal the invisible world everywhere you go.
            </p>
            <button style={{
              fontFamily: FONTS.sans,
              fontSize: 11,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.88)",
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 4,
              padding: "12px 32px",
              cursor: "pointer",
              transition: "background 0.2s, border-color 0.2s",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.13)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.3)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.15)"; }}
            >
              Learn more
            </button>
          </div>

          {/* Up arrow — back to globe */}
          <button
            onClick={goToGlobe}
            style={{
              position: "absolute",
              top: 32,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 10,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 8,
              opacity: 0.3,
              transition: "opacity 0.2s",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.7")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "0.3")}
          >
            <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
              <path d="M1 9L8 2L15 9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
