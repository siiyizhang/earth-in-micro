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

export const POSTS = [
  {
    slug: "life-finds-its-way",
    title: "Life Finds Its Way: the Engineering Miracle of Centric Diatom",
    date: "Mar 19, 2025",
    readTime: "7 min read",
  },
  {
    slug: "diatom-motility-and-laplacian-determinism",
    title: "Diatom Motility and Laplacian Determinism",
    date: "Mar 2, 2025",
    readTime: "3 min read",
  },
  {
    slug: "why-i-like-microscopy",
    title: "Why I like microscopy and why I found Eureka!",
    date: "Feb 28, 2025",
    readTime: "4 min read",
  },
];

export default function AppBlog() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  return (
    <div style={{
      minHeight: "100dvh",
      height: "100dvh",
      overflowY: "auto",
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
          alt="Eureka! Microscope"
          style={{ height: isMobile ? 22 : 26, display: "block" }}
        />
        <div style={{ width: 56 }} />
      </div>

      {/* ── Content ── */}
      <div style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: isMobile ? "100px 24px 60px" : "120px clamp(24px,6vw,80px) 80px",
      }}>

        <h1 style={{
          fontFamily: FONTS.serif, fontWeight: 100,
          fontSize: isMobile ? "clamp(32px,10vw,48px)" : "clamp(40px,5vw,64px)",
          letterSpacing: "0.02em", color: C.navy,
          margin: "0 0 48px",
        }}>
          Blog
        </h1>

        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {POSTS.map((post, i) => (
            <div key={post.slug}>
              <button
                type="button"
                onClick={() => navigate(`/blog/${post.slug}`)}
                style={{
                  width: "100%", background: "none", border: "none",
                  cursor: "pointer", padding: "28px 0", textAlign: "left",
                }}
              >
                <div style={{
                  fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase",
                  color: "rgba(26,42,60,0.4)", marginBottom: 10,
                  fontFamily: FONTS.sans,
                }}>
                  {post.date} · {post.readTime}
                </div>
                <div style={{
                  fontFamily: FONTS.serif, fontWeight: 100,
                  fontSize: isMobile ? 20 : 24,
                  color: C.navy, lineHeight: 1.3,
                  letterSpacing: "-0.01em",
                  transition: "color 0.15s",
                }}>
                  {post.title}
                </div>
              </button>
              {i < POSTS.length - 1 && (
                <div style={{ borderBottom: "1px solid rgba(26,42,60,0.08)" }} />
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
