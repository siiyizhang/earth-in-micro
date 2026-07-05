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

export default function AppAbout() {
  const isMobile = useIsMobile();

  return (
    <>
    <Helmet>
      <title>About | Eureka! Microscope</title>
      <meta name="description" content="Learn about the team behind Eureka! — a portable microscope built to make the microscopic world accessible to everyone." />
      <link rel="canonical" href="https://eurekamicroscope.com/about" />
    </Helmet>
    <div style={{
      height: "100dvh",
      overflowY: "auto",
      background: "#06090f",
      fontFamily: FONTS.sans,
      color: "rgba(255,255,255,0.88)",
    }}>

      <NavBar alwaysVisible />

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
          letterSpacing: "0.02em", color: "rgba(255,255,255,0.92)",
          margin: "0 0 40px",
        }}>
          About Us
        </h1>

        {/* Founders narrative */}
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 40 : 64, alignItems: "flex-start" }}>

          {/* Story */}
          <div style={{ flex: "1 1 0", fontSize: isMobile ? 15 : 16, lineHeight: 1.85, color: "rgba(255,255,255,0.7)", letterSpacing: "0.01em" }}>
            Eureka Microscope was founded by Siyi Zhang, an environmental scientist-turned-entrepreneur fascinated by the invisible world, and Yu Liu, a quantum engineer with a passion for making cutting-edge technology accessible to more people. Siyi became captivated by the micro world during her thesis on marine plankton at ETH Zürich. Inspired by the <a href="https://www.planktoscope.org" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "underline", textDecorationColor: "rgba(255,255,255,0.3)" }}>PlanktoScope project</a> — an open-source plankton imaging device — she saw the potential to bring this kind of optics into a portable, consumer-grade product. Yu, her friend, who enjoys nature too, was immediately drawn in. Together, they set out to build something the world had never seen: a portable microscopic camera that reveals nature in a completely new dimension at an affordable price.
          </div>

          {/* Two founder photos */}
          <div style={{ display: "flex", flexDirection: "row", gap: isMobile ? 24 : 32, alignItems: "flex-start", flexShrink: 0 }}>
            {[
              { img: "/images/team/siyi.avif", name: "Siyi Zhang", role: "CEO", credentials: ["MSc. Environmental Science", "ETH Zurich, Switzerland"] },
              { img: "/images/team/yu.avif",   name: "Yu Liu",     role: "CTO", credentials: ["MSc. Quantum Engineering",    "ETH Zurich, Switzerland"] },
            ].map(({ img, name, role, credentials }) => (
              <div key={name} style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 120 }}>
                <img src={img} alt={name} style={{ width: isMobile ? 110 : 130, height: isMobile ? 110 : 130, borderRadius: "50%", objectFit: "cover", display: "block" }} />
                <div>
                  <div style={{ fontFamily: FONTS.sans, fontWeight: 600, fontSize: isMobile ? 15 : 16, color: "rgba(255,255,255,0.92)", marginBottom: 2 }}>{name}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 8 }}>{role}</div>
                  {credentials.map(c => (
                    <div key={c} style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>{c}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* ── Sabrina ── */}
        <div style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? 24 : 48,
          alignItems: "flex-start",
          marginTop: isMobile ? 48 : 72,
          paddingTop: isMobile ? 48 : 72,
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, flexShrink: 0, minWidth: 120 }}>
            <img
              src="/images/team/Sabrina.png"
              alt="Sabrina Williams"
              style={{
                width: isMobile ? 110 : 130,
                height: isMobile ? 110 : 130,
                borderRadius: "50%",
                objectFit: "cover",
                display: "block",
              }}
            />
            <div>
              <div style={{ fontFamily: FONTS.sans, fontWeight: 600, fontSize: isMobile ? 15 : 16, color: "rgba(255,255,255,0.92)", marginBottom: 2 }}>
                Sabrina Williams
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 8 }}>
                Product Design Engineer
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>BSc. Mechanical Engineering and Robotics</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>Massachusetts Institute of Technology</div>
            </div>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: isMobile ? 15 : 16, lineHeight: 1.75, color: "rgba(255,255,255,0.7)", letterSpacing: "0.01em" }}>
              In spring 2026, Sabrina did an exchange semester at ETH Zürich and is currently a product design engineer for Eureka Microscope. She loves designing things to help others and tinkering in makerspaces. In her free time, Sabrina enjoys exploring new places and cultures as well as creating artwork inspired by nature.
            </p>
          </div>
        </div>

      </div>
    </div>
    </>
  );
}
