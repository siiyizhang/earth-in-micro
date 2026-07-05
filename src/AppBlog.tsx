import { useNavigate } from "react-router-dom";
import { useSyncExternalStore } from "react";
import { Helmet } from "react-helmet-async";
import NavBar from "./components/NavBar";

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
    <>
    <Helmet>
      <title>Blog | Eureka! Microscope</title>
      <meta name="description" content="Explore articles about the microscopic world — from diatoms to radiolarians. Science writing for curious minds, by the Eureka! team." />
      <link rel="canonical" href="https://eurekamicroscope.com/blog" />
    </Helmet>
    <div style={{
      minHeight: "100dvh",
      height: "100dvh",
      overflowY: "auto",
      background: "#06090f",
      fontFamily: FONTS.sans,
      color: "rgba(255,255,255,0.88)",
    }}>

      <NavBar alwaysVisible />

      {/* ── Content ── */}
      <div style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: isMobile ? "100px 24px 60px" : "120px clamp(24px,6vw,80px) 80px",
      }}>

        <h1 style={{
          fontFamily: FONTS.serif, fontWeight: 100,
          fontSize: isMobile ? "clamp(32px,10vw,48px)" : "clamp(40px,5vw,64px)",
          letterSpacing: "0.02em", color: "rgba(255,255,255,0.92)",
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
                  color: "rgba(255,255,255,0.4)", marginBottom: 10,
                  fontFamily: FONTS.sans,
                }}>
                  {post.date} · {post.readTime}
                </div>
                <div style={{
                  fontFamily: FONTS.serif, fontWeight: 100,
                  fontSize: isMobile ? 20 : 24,
                  color: "rgba(255,255,255,0.88)", lineHeight: 1.3,
                  letterSpacing: "-0.01em",
                  transition: "color 0.15s",
                }}>
                  {post.title}
                </div>
              </button>
              {i < POSTS.length - 1 && (
                <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }} />
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
    </>
  );
}
