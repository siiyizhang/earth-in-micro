import { useNavigate } from "react-router-dom";
import { useSyncExternalStore } from "react";

const FONTS = {
  serif: "'Yaroop', serif",
  sans: "'Inter', sans-serif",
};

const C = {
  navy: "#1A3A5C",
  teal: "#0ABFBC",
};

function useIsMobile(bp = 640) {
  return useSyncExternalStore(
    (cb) => { window.addEventListener("resize", cb); return () => window.removeEventListener("resize", cb); },
    () => window.innerWidth < bp,
    () => false,
  );
}

export default function AppAbout() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  return (
    <div style={{
      minHeight: "100dvh",
      background: "#ffffff",
      fontFamily: FONTS.sans,
      color: C.navy,
    }}>

      {/* ── Navbar ── */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        padding: isMobile ? "12px 20px" : "14px clamp(24px,4vw,48px)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(255,255,255,0.88)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(26,42,60,0.06)",
      }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            background: "none", border: "none", cursor: "pointer", padding: 4,
            display: "flex", alignItems: "center", gap: 6,
            color: "rgba(26,42,60,0.55)", fontFamily: FONTS.sans,
            fontSize: 14, letterSpacing: "0.01em",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </button>
        <img
          src="/Black text.png"
          alt="Earth in Micro"
          style={{ height: isMobile ? 22 : 26, display: "block" }}
        />
        <div style={{ width: 56 }} /> {/* spacer to centre logo */}
      </div>

      {/* ── Content ── */}
      <div style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: isMobile ? "100px 24px 60px" : "120px clamp(24px,6vw,80px) 80px",
      }}>

        {/* Heading */}
        <h1 style={{
          fontFamily: FONTS.serif, fontWeight: 100,
          fontSize: isMobile ? "clamp(32px,10vw,48px)" : "clamp(40px,5vw,64px)",
          letterSpacing: "0.02em", color: C.navy,
          margin: "0 0 40px",
        }}>
          About Us
        </h1>

        {/* Layout: text left, team right */}
        <div style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? 40 : 64,
          alignItems: "flex-start",
        }}>

          {/* Story text */}
          <div style={{
            flex: "1 1 0",
            fontSize: isMobile ? 15 : 16,
            lineHeight: 1.75,
            color: "rgba(26,42,60,0.75)",
            letterSpacing: "0.01em",
          }}>
            <p style={{ margin: "0 0 20px" }}>
              Siyi was fascinated by the micro world when she was doing her thesis about marine plankton, the tiny drifting organisms in water. After trying the existing portable microscopes on the market, she realized there was nothing in the world that could deliver this special experience to everyday explorers with curious minds.
            </p>
            <p style={{ margin: 0 }}>
              Inspired by a special microscope in biological oceanography, she invited her friend Yu, who is passionate about creating cool, new technology for more people, to join the venture. And with Yu's talent in hardware engineering, we're turning advanced microscope technology into something accessible to you.
            </p>
          </div>

          {/* Team cards */}
          <div style={{
            flex: "0 0 auto",
            display: "flex",
            flexDirection: "row",
            gap: isMobile ? 24 : 32,
            alignItems: "flex-start",
          }}>
            {[
              {
                img: "/images/team/siyi.avif",
                name: "Siyi Zhang",
                role: "CEO",
                credentials: ["MSc. Environmental Science", "ETH Zurich, Switzerland"],
              },
              {
                img: "/images/team/yu.avif",
                name: "Yu Liu",
                role: "CTO",
                credentials: ["MSc. Quantum Engineering", "ETH Zurich, Switzerland"],
              },
            ].map(({ img, name, role, credentials }) => (
              <div key={name} style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 120 }}>
                <img
                  src={img}
                  alt={name}
                  style={{
                    width: isMobile ? 110 : 130,
                    height: isMobile ? 110 : 130,
                    borderRadius: "50%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
                <div>
                  <div style={{
                    fontFamily: FONTS.sans, fontWeight: 600,
                    fontSize: isMobile ? 15 : 16,
                    color: C.navy, marginBottom: 2,
                  }}>{name}</div>
                  <div style={{
                    fontSize: 13, color: "rgba(26,42,60,0.5)",
                    marginBottom: 8,
                  }}>{role}</div>
                  {credentials.map(c => (
                    <div key={c} style={{
                      fontSize: 13, color: "rgba(26,42,60,0.6)",
                      lineHeight: 1.5,
                    }}>{c}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
