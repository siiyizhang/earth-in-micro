import { useState, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import LowPolyGlobeBackground from "./components/LowPolyGlobeBackground";
import DotGlobeBackground from "./components/DotGlobeBackground";

const FONT_SERIF = "'Yaroop', serif";

function useIsMobile(bp = 640) {
  return useSyncExternalStore(
    (cb) => { window.addEventListener("resize", cb); return () => window.removeEventListener("resize", cb); },
    () => window.innerWidth < bp,
    () => false,
  );
}

export default function AppIndex() {
  const [hovered, setHovered] = useState<"education" | "leisure" | null>(null);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  return (
    <div style={{
      width: "100vw", height: "100vh",
      display: "flex", overflow: "hidden", position: "relative",
      flexDirection: isMobile ? "column" : "row",
    }}>

      {/* ── "For you..." — desktop only split-colour label ─────────────── */}
      {!isMobile && <>
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
      </>}

      {/* ── Left / Top panel — Education ─────────────────────────────────── */}
      <div
        onMouseEnter={() => !isMobile && setHovered("education")}
        onMouseLeave={() => !isMobile && setHovered(null)}
        onClick={() => navigate("/education")}
        style={{
          position: "relative",
          flex: 1,
          cursor: "pointer",
          overflow: "hidden",
          background: "#e8eff6",
        }}
      >
        {/* Globe — desktop fills panel, mobile scaled down and centered */}
        <div style={{
          position: "absolute",
          ...(isMobile
            ? { top: "50%", left: "50%", width: "110%", aspectRatio: "1", transform: "translate(-50%, -50%)" }
            : { inset: 0 }
          ),
          filter: (!isMobile && hovered !== "education") ? "blur(6px)" : "none",
          transform: isMobile
            ? "translate(-50%, -50%)"
            : (hovered === "education" ? "scale(1)" : "scale(1.04)"),
          transition: "filter 0.6s ease, transform 0.6s ease",
        }}>
          <LowPolyGlobeBackground />
        </div>

        {/* Dim overlay when other panel hovered (desktop only) */}
        {!isMobile && (
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(232,239,246,0.45)",
            opacity: hovered === "leisure" ? 1 : 0,
            transition: "opacity 0.5s ease", pointerEvents: "none",
          }} />
        )}

        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 10,
        }}>
          <span style={{
            fontFamily: FONT_SERIF, fontWeight: 100,
            fontSize: isMobile ? "clamp(28px, 8vw, 40px)" : "clamp(32px, 5vw, 64px)",
            letterSpacing: "0.02em",
            color: (!isMobile && hovered === "leisure") ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,1)",
            transition: "color 0.5s ease", userSelect: "none",
            textAlign: "center",
          }}>
            Education
          </span>
          <span style={{
            fontFamily: FONT_SERIF, fontWeight: 100, fontStyle: "italic",
            fontSize: isMobile ? "clamp(11px, 3vw, 14px)" : "clamp(12px, 1.1vw, 16px)",
            letterSpacing: "0.01em",
            color: (!isMobile && hovered === "leisure") ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,1)",
            transition: "color 0.5s ease", userSelect: "none",
            textAlign: "center",
          }}>
            Big things start with small discoveries.
          </span>
        </div>
      </div>

      {/* ── Divider ──────────────────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        ...(isMobile
          ? { height: 1, width: "100%", background: "rgba(255,255,255,0.25)", zIndex: 10 }
          : { width: 1, background: "rgba(255,255,255,0.25)", zIndex: 10 }
        ),
      }} />

      {/* ── Right / Bottom panel — Nature Observation ────────────────────── */}
      <div
        onMouseEnter={() => !isMobile && setHovered("leisure")}
        onMouseLeave={() => !isMobile && setHovered(null)}
        onClick={() => navigate("/leisure")}
        style={{
          position: "relative",
          flex: 1,
          cursor: "pointer",
          overflow: "hidden",
          background: "#05080f",
        }}
      >
        {/* Globe */}
        <div style={{
          position: "absolute",
          ...(isMobile
            ? { top: "50%", left: "50%", width: "110%", aspectRatio: "1", transform: "translate(-50%, -50%)" }
            : { inset: 0 }
          ),
          filter: (!isMobile && hovered !== "leisure") ? "blur(1px)" : "none",
          transform: isMobile
            ? "translate(-50%, -50%)"
            : (hovered === "leisure" ? "scale(1)" : "scale(1.02)"),
          transition: "filter 0.6s ease, transform 0.6s ease",
        }}>
          <DotGlobeBackground />
        </div>

        {/* Dim overlay when other panel hovered (desktop only) */}
        {!isMobile && (
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(10,14,26,0.4)",
            opacity: hovered === "education" ? 1 : 0,
            transition: "opacity 0.5s ease", pointerEvents: "none",
          }} />
        )}

        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 10,
        }}>
          <span style={{
            fontFamily: FONT_SERIF, fontWeight: 100,
            fontSize: isMobile ? "clamp(28px, 8vw, 40px)" : "clamp(32px, 5vw, 64px)",
            letterSpacing: "0.02em",
            color: (!isMobile && hovered === "education") ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.88)",
            transition: "color 0.5s ease", userSelect: "none",
            textAlign: "center",
          }}>
            Nature Observation
          </span>
          <span style={{
            fontFamily: FONT_SERIF, fontWeight: 100, fontStyle: "italic",
            fontSize: isMobile ? "clamp(11px, 3vw, 14px)" : "clamp(12px, 1.1vw, 16px)",
            letterSpacing: "0.01em",
            color: (!isMobile && hovered === "education") ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.7)",
            transition: "color 0.5s ease", userSelect: "none",
            textAlign: "center",
          }}>
            Capture nature on a new dimension.
          </span>
        </div>
      </div>

    </div>
  );
}
