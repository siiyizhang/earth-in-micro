import { useEffect, useState } from "react";
import type { Spot } from "../data/spots";

interface SpotPanelProps {
  spot: Spot | null;
  screenPos: { x: number; y: number } | null;
  onClose: () => void;
  fontSerif?: string;
  fontSans?: string;
  theme?: "dark" | "light";
}

function PanelImage({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false);
  if (!src || error) return null;
  return (
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-cover"
      onError={() => setError(true)}
    />
  );
}

const CARD_W = 320;
const CARD_MAX_H = 560;

export default function SpotPanel({
  spot, screenPos, onClose,
  fontSerif = "'Yaroop', serif",
  fontSans = "'Inter', sans-serif",
  theme = "dark",
}: SpotPanelProps) {
  const dark = theme === "dark";
  const C = {
    bg:         dark ? "rgba(3,6,16,0.96)"              : "rgba(255,255,255,0.97)",
    border:     dark ? "rgba(255,255,255,0.08)"         : "rgba(0,0,0,0.08)",
    shadow:     dark ? "0 24px 80px rgba(0,0,0,0.7)"   : "0 24px 80px rgba(0,0,0,0.12)",
    closeBg:    dark ? "rgba(255,255,255,0.50)"         : "rgba(255,255,255,0.50)",
    closeBd:    dark ? "rgba(255,255,255,0.3)"          : "rgba(0,0,0,0.15)",
    closeColor: dark ? "rgba(255,255,255,0.85)"         : "rgba(20,30,50,0.6)",
    imgBg:      dark ? "#060c1e"                        : "#f0f0f0",
    divider1:   dark ? "linear-gradient(to right, rgba(255,255,255,0.1) 0%, transparent 70%)" : "linear-gradient(to right, rgba(0,0,0,0.06) 0%, transparent 70%)",
    location:   dark ? "rgba(255,255,255,0.3)"          : "rgba(20,30,50,0.35)",
    name:       dark ? "rgba(255,255,255,0.93)"         : "rgba(20,30,50,0.9)",
    nameLatin:  dark ? "rgba(255,255,255,0.28)"         : "rgba(20,30,50,0.35)",
    sizeBd:     dark ? "rgba(255,255,255,0.1)"          : "rgba(0,0,0,0.1)",
    sizeColor:  dark ? "rgba(255,255,255,0.3)"          : "rgba(20,30,50,0.4)",
    divider2:   dark ? "rgba(255,255,255,0.06)"         : "rgba(0,0,0,0.06)",
    desc:       dark ? "rgba(255,255,255,0.55)"         : "rgba(20,30,50,0.55)",
    credit:     dark ? "rgba(255,255,255,0.14)"         : "rgba(20,30,50,0.25)",
    creditBd:   dark ? "rgba(255,255,255,0.05)"         : "rgba(0,0,0,0.06)",
  };
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (spot) requestAnimationFrame(() => setVisible(true));
    else setVisible(false);
  }, [spot]);

  if (!spot || !screenPos) return null;

  // Fixed position on same side as thumbnail, vertically centered in viewport
  const vw = window.innerWidth;
  const thumbnailOnRight = screenPos.x > vw / 2;
  const sideMargin = 24;
  const left = thumbnailOnRight
    ? vw - CARD_W - sideMargin
    : sideMargin;

  const hasImg1 = !!spot.imageUrl;
  const hasImg2 = !!spot.imageUrl2;
  const imgCount = (hasImg1 ? 1 : 0) + (hasImg2 ? 1 : 0);

  return (
    <>

      {/* Floating card */}
      <div
        onWheel={e => e.stopPropagation()}
        style={{
          position: "fixed",
          left,
          top: "calc(50% + 28px)",
          width: CARD_W,
          maxHeight: "calc(100vh - 120px)",
          zIndex: 20,
          display: "flex",
          flexDirection: "column",
          background: C.bg,
          backdropFilter: "blur(24px)",
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: C.shadow,
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(-50%)" : "translateY(-50%) scale(0.95)",
          transition: "opacity 0.3s ease, transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 12, right: 12, zIndex: 10,
            width: 32, height: 32, borderRadius: "50%",
            background: C.closeBg,
            border: `1px solid ${C.closeBd}`,
            color: C.closeColor,
            fontSize: 24, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            lineHeight: 1,
          }}
        >
          ×
        </button>

        {/* Images */}
        {imgCount > 0 && (
          <div style={{
            width: "100%", height: imgCount === 2 ? 160 : 200,
            flexShrink: 0, display: "flex", gap: 1, background: C.imgBg,
          }}>
            {hasImg1 && <div style={{ flex: 1, overflow: "hidden" }}><PanelImage src={spot.imageUrl} alt={spot.name} /></div>}
            {hasImg2 && <div style={{ flex: 1, overflow: "hidden" }}><PanelImage src={spot.imageUrl2} alt={spot.name} /></div>}
          </div>
        )}

        <div style={{ height: 1, background: C.divider1, flexShrink: 0 }} />

        {/* Content */}
        <div style={{ padding: "20px 24px 24px", overflowY: "auto" }}>
          <div style={{ fontFamily: fontSans, fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: C.location, marginBottom: 10 }}>
            {spot.location}
          </div>

          <h2 style={{ fontFamily: fontSerif, fontWeight: 100, fontSize: 26, lineHeight: 1.1, color: C.name, margin: "0 0 5px", letterSpacing: "-0.01em" }}>
            {spot.name}
          </h2>

          {spot.nameLatin && (
            <div style={{ fontFamily: fontSerif, fontWeight: 100, fontSize: 12, color: C.nameLatin, marginBottom: 14 }}>
              {spot.nameLatin}
            </div>
          )}

          {spot.size && (
            <div style={{ display: "inline-block", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: C.sizeColor, border: `1px solid ${C.sizeBd}`, borderRadius: 3, padding: "3px 7px", marginBottom: 18 }}>
              {spot.size}
            </div>
          )}

          <div style={{ height: 1, background: C.divider2, marginBottom: 16 }} />

          <p style={{ fontFamily: fontSans, fontSize: 13, lineHeight: 1.85, color: C.desc, margin: 0, fontWeight: 300 }}>
            {spot.desc}
          </p>

          {spot.imageCredit && (
            <div style={{ fontSize: 9, color: C.credit, letterSpacing: "0.08em", marginTop: 24, paddingTop: 14, borderTop: `1px solid ${C.creditBd}` }}>
              Image — {spot.imageCredit}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
