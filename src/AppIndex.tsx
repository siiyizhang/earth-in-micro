import { useState } from "react";
import { useNavigate } from "react-router-dom";
import LowPolyGlobeBackground from "./components/LowPolyGlobeBackground";
import DotGlobeBackground from "./components/DotGlobeBackground";

const FONT_SERIF = "'Yaroop', serif";

export default function AppIndex() {
  const [hovered, setHovered] = useState<"education" | "leisure" | null>(null);
  const navigate = useNavigate();

  return (
    <div style={{
      width: "100vw", height: "100vh",
      display: "flex", overflow: "hidden", position: "relative",
    }}>

      {/* ── "For you..." — split colour: dark left / white right ─────────── */}
      {/* Left clip (dark) */}
      <div style={{
        position: "absolute", top: 0, left: 0, width: "50%",
        zIndex: 20, overflow: "hidden", pointerEvents: "none",
        paddingTop: 52,
      }}>
        <div style={{ width: "100vw", marginLeft: "-0%", textAlign: "center" }}>
          <span style={{
            fontFamily: FONT_SERIF, fontWeight: 100,
            fontSize: "clamp(14px, 1.5vw, 20px)", letterSpacing: "0.01em",
            color: hovered === "leisure" ? "rgba(20,30,50,0.2)" : "rgba(20,30,50,0.75)",
            transition: "color 0.5s ease", whiteSpace: "nowrap",
          }}>
            For you, a microscope is more for
          </span>
        </div>
      </div>
      {/* Right clip (white) */}
      <div style={{
        position: "absolute", top: 0, left: "50%", width: "50%",
        zIndex: 20, overflow: "hidden", pointerEvents: "none",
        paddingTop: 52,
      }}>
        <div style={{ width: "100vw", marginLeft: "-50vw", textAlign: "center" }}>
          <span style={{
            fontFamily: FONT_SERIF, fontWeight: 100,
            fontSize: "clamp(14px, 1.5vw, 20px)", letterSpacing: "0.01em",
            color: hovered === "education" ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.82)",
            transition: "color 0.5s ease", whiteSpace: "nowrap",
          }}>
            For you, a microscope is more for
          </span>
        </div>
      </div>

      {/* ── Left panel — Education (light) ───────────────────────────────── */}
      <div
        onMouseEnter={() => setHovered("education")}
        onMouseLeave={() => setHovered(null)}
        onClick={() => navigate("/education")}
        style={{ position: "relative", flex: 1, cursor: "pointer", overflow: "hidden", background: "#e8eff6" }}
      >
        <div style={{
          position: "absolute", inset: 0,
          filter: `blur(${hovered === "education" ? "0px" : "6px"})`,
          transform: hovered === "education" ? "scale(1)" : "scale(1.04)",
          transition: "filter 0.6s ease, transform 0.6s ease",
        }}>
          <LowPolyGlobeBackground />
        </div>

        <div style={{
          position: "absolute", inset: 0,
          background: "rgba(232,239,246,0.45)",
          opacity: hovered === "leisure" ? 1 : 0,
          transition: "opacity 0.5s ease", pointerEvents: "none",
        }} />

        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 10,
        }}>
          <span style={{
            fontFamily: FONT_SERIF, fontWeight: 100,
            fontSize: "clamp(32px, 5vw, 64px)", letterSpacing: "0.02em",
            color: hovered === "leisure" ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,1)",
            transition: "color 0.5s ease", userSelect: "none",
          }}>
            Education
          </span>
          <span style={{
            fontFamily: FONT_SERIF, fontWeight: 100, fontStyle: "italic",
            fontSize: "clamp(12px, 1.1vw, 16px)", letterSpacing: "0.01em",
            color: hovered === "leisure" ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,1)",
            transition: "color 0.5s ease", userSelect: "none",
          }}>
            Big things start with small discoveries.
          </span>
        </div>
      </div>

      {/* ── Divider ──────────────────────────────────────────────────────── */}
      <div style={{ width: 1, background: "rgba(255,255,255,0.25)", zIndex: 10, flexShrink: 0 }} />

      {/* ── Right panel — Leisure (dark) ─────────────────────────────────── */}
      <div
        onMouseEnter={() => setHovered("leisure")}
        onMouseLeave={() => setHovered(null)}
        onClick={() => navigate("/leisure")}
        style={{ position: "relative", flex: 1, cursor: "pointer", overflow: "hidden", background: "#05080f" }}
      >
        <div style={{
          position: "absolute", inset: 0,
          filter: `blur(${hovered === "leisure" ? "0px" : "1px"})`,
          transform: hovered === "leisure" ? "scale(1)" : "scale(1.02)",
          transition: "filter 0.6s ease, transform 0.6s ease",
        }}>
          <DotGlobeBackground />
        </div>

        <div style={{
          position: "absolute", inset: 0,
          background: "rgba(10,14,26,0.4)",
          opacity: hovered === "education" ? 1 : 0,
          transition: "opacity 0.5s ease", pointerEvents: "none",
        }} />

        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 10,
        }}>
          <span style={{
            fontFamily: FONT_SERIF, fontWeight: 100,
            fontSize: "clamp(32px, 5vw, 64px)", letterSpacing: "0.02em",
            color: hovered === "education" ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.88)",
            transition: "color 0.5s ease", userSelect: "none",
          }}>
            Nature Observation
          </span>
          <span style={{
            fontFamily: FONT_SERIF, fontWeight: 100, fontStyle: "italic",
            fontSize: "clamp(12px, 1.1vw, 16px)", letterSpacing: "0.01em",
            color: hovered === "education" ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.7)",
            transition: "color 0.5s ease", userSelect: "none",
          }}>
            Capture nature on a new dimension.
          </span>
        </div>
      </div>

    </div>
  );
}
