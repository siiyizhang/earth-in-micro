import { useState, useEffect, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";

function useIsMobile(bp = 640) {
  return useSyncExternalStore(
    (cb) => { window.addEventListener("resize", cb); return () => window.removeEventListener("resize", cb); },
    () => window.innerWidth < bp,
    () => false,
  );
}

const TEAL = "#0ABFBC";
const NAV_STYLE = {
  fontFamily: "'Inter', sans-serif", fontWeight: 400,
  fontSize: "clamp(12px,1vw,14px)", letterSpacing: "0.04em",
  color: "rgba(255,255,255,0.75)",
};

const NAV_LINKS = [
  { label: "About Us", href: "/about" },
  { label: "Blog",     href: "/blog" },
];

// alwaysVisible: skip scroll-triggered fade (for pages that scroll inside a div)
export default function NavBar({ alwaysVisible = false, scrollRef }: {
  alwaysVisible?: boolean;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const [navVisible, setNavVisible] = useState(alwaysVisible);
  const [menuOpen, setMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  useEffect(() => {
    if (alwaysVisible) { setNavVisible(true); return; }
    const el = scrollRef?.current ?? null;
    if (!el) return;
    const onScroll = () => setNavVisible(el.scrollTop > window.innerHeight * 0.02);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [alwaysVisible, scrollRef]);

  const handleWaitlist = () => {
    const cta = document.getElementById("cta");
    if (cta) {
      cta.scrollIntoView({ behavior: "smooth" });
    } else {
      window.location.href = "/#cta";
    }
  };

  return (
    <>
      {/* ── Navbar bar ── */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        padding: isMobile ? "10px 16px" : "8px clamp(24px,4vw,48px)",
        display: "flex", alignItems: "center",
        background: navVisible ? "rgba(10,12,18,0.68)" : "transparent",
        backdropFilter: navVisible ? "blur(16px)" : "none",
        borderBottom: navVisible ? "1px solid rgba(255,255,255,0.05)" : "none",
        transition: "background 0.3s ease, backdrop-filter 0.3s ease, border-bottom 0.3s ease",
      }}>
        {isMobile ? (
          <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
            {/* Hamburger */}
            <button
              type="button"
              onClick={() => setMenuOpen(o => !o)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", flexDirection: "column", gap: 5, opacity: navVisible ? 1 : 0, pointerEvents: navVisible ? "auto" : "none", transition: "opacity 0.3s" }}
              aria-label="Menu"
            >
              {menuOpen ? (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <line x1="3" y1="3" x2="17" y2="17" stroke="rgba(255,255,255,0.75)" strokeWidth="1.8" strokeLinecap="round"/>
                  <line x1="17" y1="3" x2="3" y2="17" stroke="rgba(255,255,255,0.75)" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              ) : (
                [0,1,2].map(i => (
                  <span key={i} style={{ display: "block", width: 20, height: 1.5, borderRadius: 2, background: "rgba(255,255,255,0.75)" }} />
                ))
              )}
            </button>
            {/* Logo centered */}
            <img
              src="/White text.webp"
              alt="Earth in Micro"
              onClick={() => navigate("/")}
              style={{ height: 26, display: "block", opacity: navVisible ? 1 : 0, transition: "opacity 0.3s ease", position: "absolute", left: "50%", transform: "translateX(-50%)", cursor: "pointer" }}
            />
            {/* Join Waitlist right */}
            <div style={{ marginLeft: "auto" }}>
              <button
                type="button"
                onClick={handleWaitlist}
                style={{
                  ...NAV_STYLE, fontWeight: 600,
                  color: "#ffffff", background: TEAL,
                  border: "none", borderRadius: 999,
                  padding: "7px 14px",
                  cursor: "pointer", whiteSpace: "nowrap",
                  boxShadow: "0 2px 12px rgba(10,191,188,0.3)",
                  opacity: navVisible ? 1 : 0,
                  pointerEvents: navVisible ? "auto" : "none",
                  transition: "opacity 0.3s, background 0.2s",
                }}
              >
                Join Waitlist
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 12 }}>
            <img
              src="/White text.webp"
              alt="Earth in Micro"
              onClick={() => navigate("/")}
              style={{ height: 32, display: "block", opacity: navVisible ? 1 : 0, transition: "opacity 0.3s ease", cursor: "pointer" }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: "clamp(8px,2vw,20px)" }}>
              {NAV_LINKS.map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  style={{
                    ...NAV_STYLE,
                    textDecoration: "none",
                    transition: "color 0.2s, opacity 0.3s",
                    whiteSpace: "nowrap",
                    opacity: navVisible ? 1 : 0,
                    pointerEvents: navVisible ? "auto" : "none",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = "#ffffff"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.75)"; }}
                >
                  {label}
                </a>
              ))}
              <button
                type="button"
                onClick={handleWaitlist}
                style={{
                  ...NAV_STYLE, fontWeight: 600,
                  color: "#ffffff", background: TEAL,
                  border: "none", borderRadius: 999,
                  padding: "8px 18px",
                  cursor: "pointer", whiteSpace: "nowrap",
                  boxShadow: "0 2px 12px rgba(10,191,188,0.3)",
                  opacity: navVisible ? 1 : 0,
                  pointerEvents: navVisible ? "auto" : "none",
                  transition: "opacity 0.3s, background 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#0dd4d1"; }}
                onMouseLeave={e => { e.currentTarget.style.background = TEAL; }}
              >
                Join the Waitlist
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Mobile hamburger dropdown ── */}
      {isMobile && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 99,
          background: "rgba(10,12,18,0.95)", backdropFilter: "blur(16px)",
          padding: "72px 32px 28px",
          display: "flex", flexDirection: "column", gap: 0,
          transform: menuOpen ? "translateY(0)" : "translateY(-100%)",
          transition: "transform 0.3s ease",
          boxShadow: menuOpen ? "0 8px 32px rgba(0,0,0,0.4)" : "none",
        }}>
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              onClick={() => setMenuOpen(false)}
              style={{
                fontFamily: "'Yaroop', serif", fontWeight: 300,
                fontSize: 22, letterSpacing: "0.02em",
                color: "rgba(255,255,255,0.85)", textDecoration: "none",
                padding: "14px 0",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {label}
            </a>
          ))}
        </div>
      )}
    </>
  );
}
