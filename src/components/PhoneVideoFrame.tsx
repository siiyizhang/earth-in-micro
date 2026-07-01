import { useEffect, useState } from "react";

// Any video file dropped into src/assets/hero-phone-videos/ is picked up
// automatically — no code change needed. Files are read in filename order;
// when there's more than one, they cycle every CYCLE_MS.
const videoModules = import.meta.glob("../assets/hero-phone-videos/*.{mp4,webm,mov}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const VIDEOS = Object.keys(videoModules)
  .sort()
  .map((key) => videoModules[key]);

const CYCLE_MS = 8000;

export default function PhoneVideoFrame({
  width = 360,
  className,
  videos: videosProp,
}: {
  width?: number;
  className?: string;
  videos?: string[];
}) {
  const sources = videosProp ?? VIDEOS;
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (sources.length < 2) return;
    const id = setInterval(() => setActive((i) => (i + 1) % sources.length), CYCLE_MS);
    return () => clearInterval(id);
  }, [sources.length]);

  // Landscape iPhone proportions (19.5:9 screen, rotated)
  const height = width * (9 / 19.5) + width * 0.16;

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width,
        height,
        flexShrink: 0,
      }}
    >
      {/* Frame body */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: width * 0.13,
          background: "linear-gradient(155deg, #2a2c30, #0c0d10 60%, #1a1b1e)",
          boxShadow: "0 30px 70px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.08)",
          padding: width * 0.022,
        }}
      >
        {/* Screen */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            borderRadius: width * 0.11,
            overflow: "hidden",
            background: "#000",
          }}
        >
          {sources.length === 0 ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 11,
                letterSpacing: "0.08em",
                color: "rgba(255,255,255,0.3)",
                textAlign: "center",
                padding: "0 16px",
              }}
            >
              Drop a video into src/assets/hero-phone-videos
            </div>
          ) : (
            sources.map((src, i) => (
              <video
                key={src}
                src={src}
                autoPlay
                muted
                loop
                playsInline
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  opacity: i === active ? 1 : 0,
                  transition: "opacity 0.8s ease",
                }}
              />
            ))
          )}
        </div>

        {/* Camera notch (left edge in landscape) */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: width * 0.022,
            transform: "translateY(-50%)",
            width: width * 0.018,
            height: width * 0.16,
            borderRadius: width * 0.014,
            background: "#0c0d10",
          }}
        />
      </div>

      {/* Side buttons */}
      <div
        style={{
          position: "absolute",
          top: width * 0.1,
          right: -2,
          width: 3,
          height: width * 0.07,
          borderRadius: 2,
          background: "#1c1d20",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: width * 0.1,
          right: -2,
          width: 3,
          height: width * 0.12,
          borderRadius: 2,
          background: "#1c1d20",
        }}
      />
    </div>
  );
}
