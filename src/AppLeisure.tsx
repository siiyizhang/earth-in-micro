import { useState, useEffect, useRef, useSyncExternalStore } from "react";

// ── Mobile hook ────────────────────────────────────────────────────────────────
function useIsMobile(bp = 640) {
  return useSyncExternalStore(
    (cb) => { window.addEventListener("resize", cb); return () => window.removeEventListener("resize", cb); },
    () => window.innerWidth < bp,
    () => false,
  );
}
import EarthGlobe from "./components/EarthGlobe";
import SpotPanel from "./components/SpotPanel";
import MailchimpForm from "./components/MailchimpForm";
import StripeButton from "./components/StripeButton";
import type { Spot } from "./data/spots";
import { fetchSpots } from "./lib/spotsApi";

// ── Constants ──────────────────────────────────────────────────────────────────

const FONTS = {
  serif: "'Yaroop', serif",
  sans:  "'Inter', sans-serif",
  mono:  "'JetBrains Mono', monospace",
};

const C = {
  navy:      "#1A3A5C",
  teal:      "#0ABFBC",
  text:      "#1A2B3C",
  textMid:   "rgba(26,42,60,0.5)",
  textLight: "rgba(26,42,60,0.5)",
  border:    "rgba(26,42,60,0.12)",
};

// ── Typography scale ───────────────────────────────────────────────────────────
// Edit here to change font sizes globally across the page.

const TEXT = {
  // Hero headline (Screen 0 bottom)
  hero: {
    fontFamily: FONTS.serif, fontWeight: 100,
    fontSize: "clamp(20px,2.6vw,42px)", lineHeight: 1.15, letterSpacing: "-0.01em",
    color: "rgba(255,255,255,0.92)",
  },
  // Section headings (h1-level: ScenarioScreen slogan, CTA price)
  h1: {
    fontFamily: FONTS.serif, fontWeight: 100,
    fontSize: "clamp(28px,3.6vw,52px)", lineHeight: 1.15, letterSpacing: "-0.01em",
    color: "rgba(255,255,255,0.88)",
  },
  // Sub-headings (h2: scenario name, sketch caption, subscribe headline)
  h2: {
    fontFamily: FONTS.serif, fontWeight: 100,
    fontSize: "clamp(20px,2vw,28px)", lineHeight: 1.2, letterSpacing: "-0.01em",
    color: "rgba(255,255,255,0.88)",
  },
  // Card / feature titles ("Lab-grade Image Quality", "Durable & Portable")
  h3: {
    fontFamily: FONTS.sans, fontWeight: 600,
    fontSize: "clamp(20px,2.2vw,28px)", lineHeight: 1.3,
    color: "rgba(255,255,255,0.88)",
  },
  // Body text
  body: {
    fontFamily: FONTS.sans, fontWeight: 300,
    fontSize: "clamp(15px,1.2vw,18px)", lineHeight: 1.7,
    color: "rgba(255,255,255,0.75)",
  },
  // Small body / tooltip
  bodySmall: {
    fontFamily: FONTS.sans, fontWeight: 300,
    fontSize: "clamp(13px,1vw,15px)", lineHeight: 1.7,
    color: "rgba(255,255,255,0.7)",
  },
  // Captions (credit lines, photo labels)
  caption: {
    fontFamily: FONTS.sans, fontWeight: 400,
    fontSize: "clamp(11px,0.9vw,13px)", letterSpacing: "0.06em",
    color: "rgba(255,255,255,0.7)",
  },
  // ALL-CAPS labels / eyebrows
  label: {
    fontFamily: FONTS.sans, fontWeight: 400,
    fontSize: "clamp(12px,1vw,15px)", letterSpacing: "0.18em",
    textTransform: "uppercase" as const,
    color: "rgba(255,255,255,0.7)",
  },
  // Navbar links
  nav: {
    fontFamily: FONTS.sans, fontWeight: 400,
    fontSize: "clamp(12px,1vw,14px)", letterSpacing: "0.04em",
    color: "rgba(255,255,255,0.75)",
  },
  // Specs bar value (large mono number)
  specValue: {
    fontFamily: FONTS.mono, fontWeight: 400,
    fontSize: "clamp(18px,2vw,28px)", letterSpacing: "-0.02em", lineHeight: 1.1,
    color: "#ffffff",
  },
  // Specs bar label
  specLabel: {
    fontFamily: FONTS.sans, fontWeight: 400,
    fontSize: "clamp(10px,0.75vw,12px)", letterSpacing: "0.12em",
    textTransform: "uppercase" as const, lineHeight: 1.4,
    color: "rgba(255,255,255,0.5)",
  },
};

// ── Scenario data ──────────────────────────────────────────────────────────────

const SCENARIOS = [
  {
    id: "kitchen",
    name: "Kitchen",
    bg: "/images/scenarios/kitchen.png",
    micro: { label: "Yeast cell", desc: "Your fridge is full of science waiting to be discovered." },
  },
  {
    id: "desk",
    name: "Desk",
    bg: "/images/scenarios/desk.png",
    micro: { label: "Dust mite", desc: "Turn the desk into a lab." },
  },
  {
    id: "pond",
    name: "Backyard",
    bg: "/images/scenarios/backyard.png",
    micro: { label: "Pond ciliate", desc: "A single drop of pond water holds more life than you'd expect." },
  },
  {
    id: "forest",
    name: "Forest",
    bg: "/images/scenarios/forest.png",
    micro: { label: "Rotifer", desc: "What's the life hidden in a mushroom?" },
  },
  {
    id: "coast",
    name: "Beach",
    bg: "/images/scenarios/beach.png",
    micro: { label: "Marine diatom", desc: "Scoop some seawater and dive into the microcosmos." },
  },
];

const GALLERY = [
  { src: "/images/hero gallery/UZH pond ciliate.mp4",                        label: "pond protist" },
  { src: "/images/hero gallery/asplanchna rotifer.mp4",                       label: "lake plankton" },
  { src: "/images/hero gallery/insect wing.png",                              label: "insect wing" },
  { src: "/images/hero gallery/onion cell.png",                               label: "onion cell" },
  { src: "/images/hero gallery/pollen.png",                                   label: "pollen" },
  { src: "/images/hero gallery/stentor-ezgif.com-video-to-gif-converter.mp4", label: "pond protist" },
  { src: "/images/hero gallery/sugar crystal 2.jpg",                          label: "sugar crystal" },
];

// Spec data for the SpecsBar above QualityScreen
const SPECS = [
  { value: "1.4 μm",  label: "Optical Resolution" },
  { value: "4K",      label: "Image Resolution" },
  { value: "1/2.8″",  label: "Sensor Size" },
  { value: ">90", label: "Color Rendering Index of LED Light" },
  { value: "150×",    label: "Magnification" },
  { value: ">10",     label: "Lens Elements" },
  { value: "<800 g",  label: "Weight" },
  { value: ">4 h",    label: "Battery Life" },
];

// ── TooltipIcon ────────────────────────────────────────────────────────────────

function TooltipIcon() {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{
          width: 16, height: 16, borderRadius: "50%",
          border: "1px solid rgba(255,255,255,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "default", flexShrink: 0,
          ...TEXT.label, fontSize: 10, color: "rgba(255,255,255,0.3)",
          userSelect: "none",
        }}
      >?</div>
      {show && (
        <div style={{
          position: "absolute", top: "50%", left: "calc(100% + 10px)",
          transform: "translateY(-50%)",
          width: "min(480px, 80vw)", background: "rgba(10,12,20,0.96)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12, padding: "14px 16px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          ...TEXT.bodySmall,
          zIndex: 50, pointerEvents: "none",
        }}>
          Most people associate microscope performance with magnification. But magnification alone can be misleading — without sufficient resolution, increasing magnification only results in a larger, blurrier image. This is known as <em>empty magnification</em>.<br /><br />
          What truly matters is resolution. We use the USAF 1951 test chart to measure it: Group 7, Element 6 has lines spaced 2.2 μm apart. If a microscope resolves these lines, it can distinguish details at least that small.
        </div>
      )}
    </div>
  );
}

// ── SpecsBar ───────────────────────────────────────────────────────────────────

function SpecsBar() {
  const isMobile = useIsMobile();
  const cols = isMobile ? 2 : Math.ceil(SPECS.length / 2);
  const rows: typeof SPECS[] = [];
  for (let i = 0; i < SPECS.length; i += cols) rows.push(SPECS.slice(i, i + cols));

  return (
    <div style={{
      background: "#07090f",
      padding: "clamp(20px,3vh,32px) clamp(16px,5vw,64px)",
    }}>
      {rows.map((row, rowIdx) => (
        <div
          key={rowIdx}
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: "clamp(8px,2vw,24px)",
            marginBottom: rowIdx < rows.length - 1 ? "clamp(16px,3vh,36px)" : 0,
          }}
        >
          {row.map((s) => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ ...TEXT.specValue, marginBottom: 8 }}>
                {s.value}
              </div>
              <div style={{ height: 1, width: "40%", margin: "0 auto 8px", background: "rgba(255,255,255,0.12)" }} />
              <div style={{ ...TEXT.specLabel }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── QualityScreen ───────────────────────────────────────────────────────────────

function QualityScreen() {
  const isMobile = useIsMobile();
  const comparisons = [
    { src: "/images/product/20.jpg",     price: "~$20",    name: "Toy 1",     highlight: false },
    { src: "/images/product/80.png",     price: "~$80",    name: "Toy 2",     highlight: false },
    { src: "/images/product/150.jpg",    price: "~$150",   name: "Toy 3",     highlight: false },
    { src: "/images/product/eureka.png", price: "$259",    name: "Eureka",    highlight: true  },
    { src: "/images/product/5000.png",   price: "~$5,000", name: "Lab grade", highlight: false },
  ];
  const PAD = isMobile ? "16px" : "clamp(40px,6vw,80px)";

  return (
    <div style={{ background: "#0a0c12" }}>

      {/* ── Specs strip ── */}
      <SpecsBar />

      {/* Testimonial videos — below SpecsBar, mobile only */}
      {isMobile && (
        <div style={{ display: "flex", gap: 10, padding: `clamp(32px,5vh,56px) ${PAD} 0` }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ borderRadius: 12, overflow: "hidden", aspectRatio: "9/16" }}>
              <video src="/video/Testimonial Francesco.mp4" autoPlay muted loop playsInline style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
            <div style={{ ...TEXT.caption, paddingLeft: 2 }}>Dr. Francesco Pomati · Freshwater Ecology Group Leader</div>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ borderRadius: 12, overflow: "hidden", aspectRatio: "9/16" }}>
              <video src="/video/Testimonial Marta.mp4" autoPlay muted loop playsInline style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
            <div style={{ ...TEXT.caption, paddingLeft: 2 }}>Marta Reyes · Freshwater Ecologist</div>
          </div>
        </div>
      )}

      {/* Row 1: quality content */}
      <div style={{ display: "flex", justifyContent: "center", padding: `clamp(40px,6vh,72px) ${PAD} clamp(10px,2vh,20px)` }}>
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 32, alignItems: isMobile ? "stretch" : "flex-end", width: "100%", maxWidth: 1100 }}>

          {/* Left: Francesco video — desktop only */}
          {!isMobile && (
            <div style={{ flex: "0 0 auto", width: "22%", display: "flex", flexDirection: "column", gap: 10, alignSelf: "stretch" }}>
              <div style={{ flex: 1, position: "relative", overflow: "hidden", background: "#1a1a2e", borderRadius: 12, aspectRatio: "9/16" }}>
                <video src="/video/Testimonial Francesco.mp4" autoPlay muted loop playsInline
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ ...TEXT.caption, paddingLeft: 2 }}>Dr. Francesco Pomati · Freshwater Ecology Group Leader</div>
            </div>
          )}

          {/* Right column */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ flex: "0 0 auto" }}>
              <div style={{ ...TEXT.h3, marginBottom: 10 }}>Lab-grade Image Quality</div>
              <div style={{ ...TEXT.body, color: "rgba(255,255,255,0.8)" /* brighter than default 0.5 */ }}>
                Most microscopes advertise magnification, but the image still looks blurry. With 1.4 μm resolution, Eureka shows real structure. Not just bigger, but clearer.
              </div>
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, minHeight: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ ...TEXT.label }}>
                  USAF 1951 resolution test chart
                </span>
                <TooltipIcon />
              </div>
              <div style={{ borderRadius: 8, overflow: "hidden", flexShrink: 0, maxHeight: 260 }}>
                <img src="/images/product/chart long.png" alt="USAF 1951 chart"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                {comparisons.map(c => (
                  <div key={c.src} style={{
                    flex: 1, display: "flex", flexDirection: "column",
                    borderRadius: 8, background: "#0a0c12",
                    outline: c.highlight ? "2px solid #0ABFBC" : "none",
                    outlineOffset: "0px",
                  }}>
                    <div style={{ height: 24, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{
                        ...TEXT.caption, fontWeight: 600,
                        padding: "2px 7px", borderRadius: 20,
                        background: c.highlight ? "#0ABFBC" : "rgba(255,255,255,0.1)",
                        color: "#fff", letterSpacing: "0.04em",
                      }}>{c.price}</div>
                    </div>
                    <div style={{ width: "100%", aspectRatio: "3/2", overflow: "hidden", flexShrink: 0 }}>
                      <img src={c.src} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    </div>
                    <div style={{
                      height: 24, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                      ...TEXT.caption,
                      color: c.highlight ? "#0ABFBC" : "rgba(255,255,255,0.5)",
                      fontWeight: c.highlight ? 600 : 400, letterSpacing: "0.04em",
                    }}>{c.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Durable & Portable */}
      <div style={{ minHeight: 280, display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "center", justifyContent: "center", padding: isMobile ? `clamp(32px,5vh,56px) ${PAD}` : `0 ${PAD}`, gap: isMobile ? 20 : 48 }}>
        {isMobile ? (
          <div style={{ borderRadius: 16, overflow: "hidden", height: 220 }}>
            <img src="/images/product/portable.png" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
        ) : (
          <div style={{ flex: "0 0 52%", display: "flex", flexDirection: "column", gap: 8, alignSelf: "center", height: 320 }}>
            <div style={{ flex: 1, display: "flex", gap: 10, minHeight: 0 }}>
              <div style={{ flex: "0 0 auto", width: 180, borderRadius: 12, overflow: "hidden" }}>
                <video src="/video/Testimonial Marta.mp4" autoPlay muted loop playsInline
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
              <div style={{ flex: 1, borderRadius: 16, overflow: "hidden" }}>
                <img src="/images/product/portable.png" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
            </div>
            <div style={{ ...TEXT.caption, paddingLeft: 2, flexShrink: 0 }}>Marta Reyes · Freshwater Ecologist</div>
          </div>
        )}
        <div style={{ flex: "0 0 auto", maxWidth: isMobile ? "100%" : 400 }}>
          <div style={{ ...TEXT.h3, marginBottom: 14 }}>Durable & Portable</div>
          <div style={{ ...TEXT.body }}>
            Drop-tested and water-resistant. Built to survive in the wild nature.
          </div>
        </div>
      </div>

      {/* Row 3: Multi-mode Illumination */}
      <div style={{ minHeight: 280, display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "stretch", justifyContent: "center", padding: `clamp(32px,6vh,72px) ${PAD}`, gap: isMobile ? 20 : 48 }}>
        <div style={{ flex: "0 0 auto", maxWidth: isMobile ? "100%" : 400, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ ...TEXT.h3, marginBottom: 14 }}>Multi-mode Illumination</div>
          <div style={{ ...TEXT.body }}>
            With just a tap on the app, switch between bright, dark, and oblique lighting to reveal hidden details. Add a polarization filter set, and even a simple crystal transforms into a dazzling rainbow kaleidoscope.
          </div>
        </div>
        <div style={{ flex: isMobile ? "none" : "0 0 52%", borderRadius: 16, overflow: "hidden", height: isMobile ? 220 : "auto" }}>
          <img src="/images/product/4.png" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        </div>
      </div>

    </div>
  );
}

// ── ScenarioScreen ─────────────────────────────────────────────────────────────

function ScenarioScreen() {
  const isMobile = useIsMobile();
  const [active, setActive] = useState<string | null>(null);

  if (isMobile) {
    const activeScenario = SCENARIOS.find(s => s.id === active) ?? SCENARIOS[0];
    return (
      <div style={{ width: "100vw", background: "#0a0c12" }}>
        <div style={{ padding: "clamp(28px,4vh,48px) 24px clamp(20px,2.5vh,32px)", textAlign: "center" }}>
          <div style={{ ...TEXT.h1 }}>
            One microscope.<br /><span style={{ color: C.teal }}>Endless environment.</span>
          </div>
        </div>

        {/* Main image */}
        <div style={{ position: "relative", height: 300, margin: "0 16px", borderRadius: 16, overflow: "hidden" }}>
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: `url(${activeScenario.bg})`,
            backgroundColor: "#1a2b3c",
            backgroundSize: "cover", backgroundPosition: "center",
          }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.15) 60%, transparent 100%)" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 24px 24px" }}>
            <h2 style={{ ...TEXT.h2, color: "#ffffff", margin: "0 0 8px" }}>{activeScenario.name}</h2>
            <p style={{ ...TEXT.bodySmall, color: "rgba(255,255,255,0.65)" /* scenario desc, slightly brighter */, margin: 0 }}>{activeScenario.micro.desc}</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, padding: "16px 16px 32px", overflowX: "auto" }}>
          {SCENARIOS.map(s => {
            const isActive = (active ?? SCENARIOS[0].id) === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                style={{
                  ...TEXT.label, flexShrink: 0,
                  padding: "8px 16px", borderRadius: 999,
                  border: isActive ? `1px solid ${C.teal}` : "1px solid rgba(255,255,255,0.12)",
                  background: isActive ? "rgba(10,191,188,0.12)" : "transparent",
                  color: isActive ? C.teal : "rgba(255,255,255,0.5)",
                  cursor: "pointer",
                }}
              >{s.name}</button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: "100vw", height: "100vh", minHeight: 480, background: "#0a0c12",
      display: "flex", flexDirection: "column", position: "relative", overflow: "hidden",
    }}>
      <div style={{ padding: "clamp(28px,4vh,48px) clamp(32px,5vw,72px) clamp(20px,2.5vh,32px)", textAlign: "center" }}>
        <div style={{ ...TEXT.h1, color: "rgba(255,255,255,0.88)" }}>
          One microscope.<br /><span style={{ color: C.teal }}>Endless environment.</span>
        </div>
      </div>

      <div style={{
        flex: 1, display: "flex", flexDirection: "row", overflow: "hidden",
        margin: "0 clamp(16px,3vw,40px) clamp(16px,3vw,40px)", borderRadius: 20, gap: 0,
      }}>
        {SCENARIOS.map((s) => {
          const isActive = active === s.id;
          return (
            <div
              key={s.id}
              onMouseEnter={() => setActive(s.id)}
              onMouseLeave={() => setActive(null)}
              style={{
                position: "relative",
                flex: isActive ? "4 0 0" : "1 0 0",
                transition: "flex 0.55s cubic-bezier(0.77,0,0.18,1)",
                overflow: "hidden",
                cursor: "pointer",
              }}
            >
              <div style={{
                position: "absolute", inset: 0,
                backgroundImage: s.bg ? `url(${s.bg})` : undefined,
                backgroundColor: "#1a2b3c",
                backgroundSize: "cover", backgroundPosition: "center",
              }} />
              <div style={{
                position: "absolute", inset: 0,
                background: isActive
                  ? "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.15) 60%, transparent 100%)"
                  : "rgba(0,0,0,0.52)",
                transition: "background 0.4s ease",
              }} />

              {!isActive && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{
                    writingMode: "vertical-rl", textOrientation: "mixed", transform: "rotate(180deg)",
                    ...TEXT.label, color: "rgba(255,255,255,0.65)" /* inactive panel name */, whiteSpace: "nowrap",
                  }}>
                    {s.name}
                  </div>
                </div>
              )}

              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                padding: "0 32px 32px",
                opacity: isActive ? 1 : 0,
                transform: isActive ? "translateY(0)" : "translateY(12px)",
                transition: "opacity 0.35s ease 0.15s, transform 0.35s ease 0.15s",
              }}>
                <h2 style={{ ...TEXT.h2, color: "#ffffff" /* active scenario: full white */, margin: "0 0 12px" }}>
                  {s.name}
                </h2>
                <p style={{ ...TEXT.bodySmall, color: "rgba(255,255,255,0.65)" /* scenario desc */, margin: 0, maxWidth: 320 }}>
                  {s.micro.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── AppGuideScreen ─────────────────────────────────────────────────────────────

function AppGuideScreen() {
  const isMobile = useIsMobile();
  const PAD = isMobile ? "20px" : "clamp(40px,6vw,80px)";
  const APP_IMAGES = [
    { src: "/images/app/app1.png" },
    { src: "/images/app/app2.png" },
    { src: "/images/app/app3.png" },
  ];

  return (
    <div style={{ width: "100vw", background: "#0a0c12", padding: `clamp(48px,7vh,80px) ${PAD}` }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "clamp(28px,4vh,48px)" }}>
          <div style={{ ...TEXT.h1 }}>
            App guides &amp; identification
          </div>
        </div>
        <div style={{ display: "flex", gap: isMobile ? 12 : 24, justifyContent: "center" }}>
          {APP_IMAGES.map((img, i) => (
            <div key={i} style={{
              flex: 1, maxWidth: isMobile ? "none" : 213,
              borderRadius: 16, overflow: "hidden",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}>
              <img src={img.src} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── GalleryScreen ──────────────────────────────────────────────────────────────

function GalleryScreen() {
  const isMobile = useIsMobile();
  return (
    <div style={{ width: "100vw", background: "#0a0c12", padding: "0", display: "flex", flexDirection: "column" }}>
      <div style={{ textAlign: "center", padding: "0 24px 12px" }}>
        <div style={{ ...TEXT.label }}>
          Captured with the prototype
        </div>
      </div>

      {/* Scrolling strip */}
      <div style={{ position: "relative" }}>
        {isMobile && <div style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", zIndex: 3, pointerEvents: "none", fontSize: 18, color: "rgba(255,255,255,0.5)" }}>‹</div>}
        {isMobile && <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", zIndex: 3, pointerEvents: "none", fontSize: 18, color: "rgba(255,255,255,0.5)" }}>›</div>}
      <div style={{ position: "relative", overflow: isMobile ? "auto" : "hidden",
        ...(isMobile ? { WebkitOverflowScrolling: "touch" as "touch" } : {}),
      }}>
        {!isMobile && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 80, background: "linear-gradient(to right, #0a0c12, transparent)", zIndex: 2, pointerEvents: "none" }} />}
        {!isMobile && <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 80, background: "linear-gradient(to left, #0a0c12, transparent)", zIndex: 2, pointerEvents: "none" }} />}

        <div style={{ display: "flex", gap: 16, padding: "0 24px",
          ...(isMobile ? { width: "max-content" } : { animation: "leisureGallery 42s linear infinite", width: "max-content" }),
        }}>
          {(isMobile ? [0] : [0, 1]).map((setIdx) =>
            GALLERY.map((item, i) => (
              <div key={`${setIdx}-${i}`} style={{
                width: "clamp(160px, 40vw, 340px)",
                height: "clamp(120px, 30vw, 255px)",
                borderRadius: 16, overflow: "hidden", flexShrink: 0, position: "relative",
                border: "1px solid rgba(255,255,255,0.07)",
              }}>
                {item.src.endsWith(".mp4") ? (
                  <video src={item.src} autoPlay muted loop playsInline
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                ) : (
                  <img src={item.src} alt={item.label}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                )}
                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0,
                  padding: "20px 14px 10px",
                  background: "linear-gradient(to top, rgba(0,0,0,0.55), transparent)",
                }}>
                  <span style={{ ...TEXT.label, color: "rgba(255,255,255,0.7)" /* gallery caption, slightly brighter */ }}>{item.label}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

// ── CTAScreen ──────────────────────────────────────────────────────────────────

const VOTE_OPTIONS = [
  { id: "z-stacking",             label: "Automatic focus stacking" },
  { id: "object-tracking",        label: "Object tracking" },
  { id: "species-identification",  label: "Species identification" },
  { id: "inaturalist",            label: "iNaturalist integration" },
  { id: "others",                 label: "Others" },
];

function CTAScreen() {
  const isMobile = useIsMobile();
  const [voted, setVoted] = useState<string | null>(null);
  const [othersText, setOthersText] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = voted !== null && (voted !== "others" || othersText.trim().length > 0);

  const handleSubmit = () => {
    if (!canSubmit) return;
    setSubmitted(true);
  };

  return (
    <div style={{ padding: isMobile ? "0 12px" : "0 24px", background: "#0a0c12" }}>

      {/* ── Vote card ── */}
      <div style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 24,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: isMobile ? "clamp(32px,6vh,56px) 20px" : "clamp(48px,8vh,80px) clamp(24px,8vw,120px)",
      }}>
        <div style={{ width: "100%", maxWidth: 640, textAlign: "center" }}>
          <div style={{ ...TEXT.label, marginBottom: 16 }}>
            Shape the product
          </div>
          <div style={{ ...TEXT.h2, marginBottom: 8 }}>
            What feature would be the greatest extra?
          </div>
          {submitted ? (
            <div style={{ ...TEXT.bodySmall, color: C.teal, padding: "32px 0" }}>
              Thanks for voting! Your input helps shape Eureka.
            </div>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {VOTE_OPTIONS.map(opt => {
                  const isSelected = voted === opt.id;
                  return (
                    <div key={opt.id}>
                      <button
                        onClick={() => setVoted(isSelected ? null : opt.id)}
                        style={{
                          ...TEXT.bodySmall, fontWeight: isSelected ? 500 : 300,
                          letterSpacing: "0.04em", width: "100%",
                          color: isSelected ? "#ffffff" : "rgba(255,255,255,0.7)",
                          background: isSelected ? "rgba(10,191,188,0.12)" : "rgba(255,255,255,0.04)",
                          border: isSelected ? `1px solid ${C.teal}` : "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 12, padding: "14px 24px",
                          cursor: "pointer", textAlign: "left",
                          transition: "background 0.2s, border-color 0.2s, color 0.2s",
                          display: "flex", alignItems: "center", gap: 12,
                        }}
                      >
                        <span style={{
                          width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                          border: isSelected ? `2px solid ${C.teal}` : "2px solid rgba(255,255,255,0.2)",
                          background: isSelected ? C.teal : "transparent",
                          transition: "background 0.2s, border-color 0.2s",
                        }} />
                        {opt.label}
                      </button>
                      {opt.id === "others" && isSelected && (
                        <textarea
                          value={othersText}
                          onChange={e => setOthersText(e.target.value)}
                          placeholder="Tell us what you have in mind..."
                          rows={3}
                          style={{
                            ...TEXT.bodySmall,
                            width: "100%", marginTop: 8, boxSizing: "border-box",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 12, padding: "12px 16px",
                            color: "rgba(255,255,255,0.82)", resize: "none",
                            outline: "none",
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                style={{
                  ...TEXT.bodySmall, fontWeight: 600,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  marginTop: 20, width: "100%",
                  color: canSubmit ? "#ffffff" : "rgba(255,255,255,0.25)",
                  background: canSubmit ? C.teal : "rgba(255,255,255,0.06)",
                  border: "none", borderRadius: 12, padding: "14px 24px",
                  cursor: canSubmit ? "pointer" : "not-allowed",
                  transition: "background 0.2s, color 0.2s",
                }}
              >
                Vote
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Price + CTA (outside card) ── */}
      <div id="cta" style={{
        display: "flex", flexDirection: "column",
        alignItems: "center",
        padding: isMobile ? "clamp(40px,7vh,64px) 20px" : "clamp(48px,8vh,80px) clamp(24px,8vw,120px)",
        gap: "clamp(32px,6vh,64px)",
      }}>
        {/* Price */}
        <div style={{ textAlign: "center" }}>
          <div style={{ ...TEXT.label, marginBottom: 16 }}>
            Limited offer
          </div>
          <div style={{ ...TEXT.h1, color: "rgba(255,255,255,0.85)" /* slightly dimmer than default 0.88 */ }}>
            Early Bird Price
          </div>
          <div style={{
            fontFamily: FONTS.serif, fontWeight: 100,
            fontSize: "clamp(48px,7vw,96px)", color: "rgba(255,255,255,0.9)",
            letterSpacing: "-0.02em", lineHeight: 1.05,
          }}>
            $259
          </div>
        </div>

        {/* Subscribe + Pre-order */}
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 40 : "clamp(24px,5vw,80px)", width: "100%", maxWidth: 860, alignItems: "flex-start" }}>

          {/* Left: Mailchimp subscribe */}
          <div style={{ flex: 1, width: isMobile ? "100%" : undefined }}>
            <div style={{ ...TEXT.h2, color: "rgba(255,255,255,0.82)" /* waitlist heading */, marginBottom: 12 }}>
              Join the waitlist
            </div>
            <div style={{ ...TEXT.body, marginBottom: 24 }}>
              Be the first to know when we launch. Get exclusive early access to our Kickstarter campaign and special offers.
            </div>
            <MailchimpForm
              dark={true}
              actionUrl={(import.meta.env.VITE_MAILCHIMP_LEISURE_URL as string) || ""}
              tags="12752743"
            />
          </div>

          {!isMobile && <div style={{ width: 1, background: "rgba(255,255,255,0.07)", alignSelf: "stretch", flexShrink: 0 }} />}

          {/* Right: Stripe deposit */}
          <div style={{ flex: 1, width: isMobile ? "100%" : undefined }}>
            <div style={{ ...TEXT.h2, color: C.teal, marginBottom: 12 }}>
              Lock in your price
            </div>
            <div style={{ ...TEXT.body, marginBottom: 24 }}>
              Put down 3 CHF (~$3.8) now to secure the early bird price at launch. Your deposit also helps us build and deliver the product for you sooner and in a better way.
            </div>
            <StripeButton href={(import.meta.env.VITE_STRIPE_LEISURE_URL as string) || ""} />
          </div>
        </div>
      </div>

      {/* Sponsors */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: "clamp(32px,6vw,72px)", flexWrap: "wrap",
        padding: "clamp(24px,4vh,40px) clamp(24px,5vw,64px)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ ...TEXT.label, color: "rgba(255,255,255,0.8)" /* sponsors row: brighter */, marginBottom: 0 }}>Supported by</div>
        <img src="/sponsor/SPH_logo_white.png" alt="SPH" style={{ height: 80, opacity: 0.8 }} />
        <img src="/sponsor/logo_VENTUREKICK_cmyk-1.avif" alt="Venture Kick" style={{ height: 36, opacity: 0.8, filter: "brightness(0) invert(1)" }} />
        <img src="/sponsor/IN_Logo.svg" alt="Innosuisse" style={{ height: 36, opacity: 0.8, filter: "brightness(0) invert(1)" }} />
      </div>

      {/* Footer */}
      <div style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "clamp(32px,5vh,52px) clamp(24px,6vw,80px)",
        display: "flex", justifyContent: "center",
      }}>
        <div style={{
          display: "flex", flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? 32 : "clamp(32px,5vw,64px)",
          alignItems: isMobile ? "center" : "flex-start",
        }}>
          {/* Brand */}
          <div style={{ width: isMobile ? "100%" : 200, textAlign: isMobile ? "center" : "left" }}>
            <img src="/White text.png" alt="Earth in Micro" style={{ height: 32, display: "block", marginBottom: 10, margin: isMobile ? "0 auto 10px" : "0 0 10px" }} />
            <div style={{ ...TEXT.bodySmall, color: "rgba(255,255,255,0.4)" /* footer tagline */, lineHeight: 1.6 }}>
              Making microscopy more accessible — anyone, anywhere, anytime.
            </div>
          </div>

          {/* Links columns */}
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 24 : "clamp(24px,4vw,56px)", alignItems: isMobile ? "center" : "flex-start" }}>
            {/* Contact — full row on mobile */}
            <div style={{ textAlign: isMobile ? "center" : "left" }}>
              <div style={{ ...TEXT.label, color: "rgba(255,255,255,0.8)" /* footer section heading */, marginBottom: 16 }}>Contact</div>
              <div style={{ ...TEXT.bodySmall, color: "rgba(255,255,255,0.4)" /* footer body */, lineHeight: 2 }}>
                Clausiusstrasse 16<br />
                8006 Zurich<br />
                <a href="mailto:eureka@eurekamicroscope.com"
                  style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none" }}
                  onMouseEnter={e => { (e.currentTarget).style.color = "rgba(255,255,255,0.8)"; }}
                  onMouseLeave={e => { (e.currentTarget).style.color = "rgba(255,255,255,0.4)"; }}
                >eureka@eurekamicroscope.com</a>
              </div>
            </div>

            {/* Quick Menu + Socials — same row on mobile */}
            <div style={{ display: "flex", gap: isMobile ? 32 : "clamp(24px,4vw,56px)" }}>
              {/* Quick Menu */}
              <div>
                <div style={{ ...TEXT.label, color: "rgba(255,255,255,0.8)" /* footer section heading */, marginBottom: 16 }}>Quick Menu</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {["About Us", "Blog"].map(label => (
                    <a key={label} href={`#${label.toLowerCase().replace(" ", "-")}`}
                      style={{ ...TEXT.bodySmall, color: "rgba(255,255,255,0.4)" /* footer links */, textDecoration: "none" }}
                      onMouseEnter={e => { (e.currentTarget).style.color = "rgba(255,255,255,0.8)"; }}
                      onMouseLeave={e => { (e.currentTarget).style.color = "rgba(255,255,255,0.4)"; }}
                    >{label}</a>
                  ))}
                </div>
              </div>

              {/* Socials */}
              <div>
                <div style={{ ...TEXT.label, color: "rgba(255,255,255,0.8)" /* footer section heading */, marginBottom: 16 }}>Socials</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { label: "Instagram", href: "https://www.instagram.com/eureka.microscope_/" },
                    { label: "LinkedIn",  href: "https://www.linkedin.com/company/eureka-microscope" },
                    { label: "TikTok",    href: "https://www.tiktok.com/@eureka.microscope" },
                  ].map(({ label, href }) => (
                    <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                      style={{ ...TEXT.bodySmall, color: "rgba(255,255,255,0.4)" /* footer links */, textDecoration: "none" }}
                      onMouseEnter={e => { (e.currentTarget).style.color = "rgba(255,255,255,0.8)"; }}
                      onMouseLeave={e => { (e.currentTarget).style.color = "rgba(255,255,255,0.4)"; }}
                    >{label}</a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────────

interface AppProps {
  issStyle?: "glow" | "line";
}

export default function AppLeisure({ issStyle }: AppProps = {}) {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [selectedPos, setSelectedPos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredSpot, setHoveredSpot] = useState<Spot | null>(null);

  const [navVisible, setNavVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const scrollToScreen = (screenIndex: number) => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: window.innerHeight * screenIndex, behavior: "smooth" });
  };

  useEffect(() => {
    fetchSpots().then(({ spots: s }) => {
      setSpots(s);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      setNavVisible(el.scrollTop > window.innerHeight * 0.02);
      setSelectedSpot(null);
      setSelectedPos(null);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100vw",
        height: "100vh",
        overflowY: "scroll",
        background: "#0a0c12",
        position: "relative",
      }}
    >

      <style>{`
        @keyframes leisureGallery {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>

      {/* ── Floating navbar ── */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        padding: isMobile ? "10px 16px" : "8px clamp(24px,4vw,48px)",
        display: "flex", alignItems: "center",
        background: navVisible ? "rgba(10,12,18,0.68)" : "transparent",
        backdropFilter: navVisible ? "blur(16px)" : "none",
        borderBottom: navVisible ? "1px solid rgba(255,255,255,0.05)" : "none",
        transition: "background 0.3s ease, backdrop-filter 0.3s ease, border-bottom 0.3s ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 12 }}>
          <img
            src="/White text.png"
            alt="Earth in Micro"
            style={{ height: isMobile ? 26 : 32, display: "block", opacity: navVisible ? 1 : 0, transition: "opacity 0.3s ease" }}
          />

          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : "clamp(8px,2vw,20px)" }}>
            {!isMobile && [
              { label: "About Us", href: "#about" },
              { label: "Blog",     href: "#blog"  },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                style={{
                  ...TEXT.nav,
                  color: "rgba(255,255,255,0.75)",
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
              onClick={() => document.getElementById("cta")?.scrollIntoView({ behavior: "smooth" })}
              style={{
                ...TEXT.nav, fontWeight: 600,
                color: "#ffffff", background: C.teal,
                border: "none", borderRadius: 999,
                padding: isMobile ? "7px 14px" : "8px 18px",
                cursor: "pointer", whiteSpace: "nowrap",
                boxShadow: "0 2px 12px rgba(10,191,188,0.3)",
                opacity: navVisible ? 1 : 0,
                pointerEvents: navVisible ? "auto" : "none",
                transition: "opacity 0.3s, background 0.2s",
              }}
              onMouseEnter={e => { (e.currentTarget).style.background = "#0dd4d1"; }}
              onMouseLeave={e => { (e.currentTarget).style.background = C.teal; }}
            >
              {isMobile ? "Join Waitlist" : "Join the Waitlist"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Drag hint — mobile only, above globe ── */}
      {!selectedSpot && !loading && isMobile && (
        <div style={{ width: "100vw", textAlign: "center", padding: "14px 0", background: "#000008", pointerEvents: "none" }}>
          <span style={{ ...TEXT.label }}>Drag to rotate · click to explore</span>
        </div>
      )}

      {/* ── Screen 0: Hero ── */}
      <div style={{ width: "100vw", height: isMobile ? "100vw" : "100vh", position: "relative", overflow: "hidden", background: "#000008" }} className="select-none">

        {!loading && (
          <div style={isMobile ? {
            width: "130vw", height: "130vw",
            position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          } : {
            position: "absolute", top: "-5%", left: "-20%", right: "-20%", bottom: "-5%",
          }}>
            <EarthGlobe
              spots={spots}
              onSpotClick={(spot, pos) => {
                setSelectedSpot(spot);
                setSelectedPos(pos);
              }}
              onSpotHover={setHoveredSpot}
              onGlobeHover={() => {}}
              fontSerif={FONTS.serif}
              fontSans={FONTS.sans}
              issStyle={issStyle}
              exploding={false}
            />
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ ...TEXT.label, color: "rgba(255,255,255,0.15)" /* loading: very dim */, letterSpacing: "0.2em" }}>
            Loading
          </div>
        )}

        {!selectedSpot && !loading && !isMobile && (
          <div style={{
            position: "absolute",
            top: "7%",
            left: "50%",
            transform: "translateX(-50%)",
            textAlign: "center",
            zIndex: 10, whiteSpace: "nowrap", pointerEvents: "none",
          }}>
            <span style={{ ...TEXT.label }}>
              Drag to rotate · click to explore
            </span>
          </div>
        )}

        {/* Bottom text + CTA — desktop only (absolute overlay) */}
        {!isMobile && (
          <div style={{
            position: "absolute",
            bottom: 0, left: 0, right: 0,
            height: "18%",
            padding: "0 clamp(16px,4vw,48px)",
            display: "flex", flexDirection: "row",
            alignItems: "center", justifyContent: "center",
            gap: "clamp(24px,4vw,60px)",
            pointerEvents: "none", zIndex: 5,
            background: "linear-gradient(to bottom, transparent, rgba(0,0,8,0.72) 60%)",
          }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "clamp(6px,1vh,10px)" }}>
              <h1 style={{
                ...TEXT.hero, fontStyle: "italic", textTransform: "uppercase",
                color: "rgba(255,255,255,0.92)", margin: 0, textAlign: "right",
              }}>
                Capture nature on a new dimension.
              </h1>
              <div style={{
                fontFamily: "'YaroSt', serif", fontSize: "clamp(11px,0.9vw,16px)",
                letterSpacing: "0.18em", textTransform: "uppercase",
                color: "rgba(255,255,255,1)", textAlign: "right",
              }}>
                The first prosumer portable microscopic camera
              </div>
            </div>
            <button
              onClick={() => scrollToScreen(1)}
              style={{
                pointerEvents: "all", marginTop: "clamp(6px,1vh,12px)",
                ...TEXT.bodySmall, fontWeight: 500, letterSpacing: "0.1em",
                color: "#ffffff", background: C.teal,
                border: "none", borderRadius: 999, padding: "12px 28px",
                cursor: "pointer", transition: "background 0.2s, color 0.2s", whiteSpace: "nowrap",
              }}
              onMouseEnter={e => { (e.currentTarget).style.background = "#0dd4d1"; }}
              onMouseLeave={e => { (e.currentTarget).style.background = C.teal; }}
            >
              Explore Eureka Microscope →
            </button>
          </div>
        )}

        {hoveredSpot && !selectedSpot && (
          <div className="absolute left-1/2 z-10 pointer-events-none" style={{ bottom: "34%", transform: "translateX(-50%)" }}>
            <div style={{
              background: "rgba(2,5,14,0.78)", backdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6,
              padding: "7px 20px 8px", textAlign: "center", whiteSpace: "nowrap",
            }}>
              <div style={{ fontFamily: FONTS.serif, fontStyle: "italic", fontSize: "clamp(14px,1.2vw,17px)", color: "rgba(255,255,255,0.88)" }}>
                {hoveredSpot.name}
              </div>
              <div style={{ ...TEXT.caption, marginTop: 2, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                {hoveredSpot.location}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── Mobile slogan + CTA (below globe) ── */}
      {isMobile && (
        <div style={{
          width: "100vw", background: "#000008",
          padding: "20px 24px 32px",
          display: "flex", flexDirection: "column",
          alignItems: "flex-start", gap: 14,
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <h1 style={{
              ...TEXT.hero, fontStyle: "italic", textTransform: "uppercase",
              color: "rgba(255,255,255,0.92)", margin: 0,
            }}>
              Capture nature on a new dimension.
            </h1>
            <div style={{
              fontFamily: "'YaroSt', serif", fontSize: "clamp(11px,3vw,14px)",
              letterSpacing: "0.18em", textTransform: "uppercase",
              color: "rgba(255,255,255,1)",
            }}>
              The first prosumer portable microscopic camera
            </div>
          </div>
          <button
            onClick={() => scrollToScreen(1)}
            style={{
              ...TEXT.bodySmall, fontWeight: 500, letterSpacing: "0.1em",
              color: "#ffffff", background: C.teal,
              border: "none", borderRadius: 999, padding: "12px 28px",
              cursor: "pointer", transition: "background 0.2s, color 0.2s", whiteSpace: "nowrap",
            }}
          >
            Explore Eureka Microscope →
          </button>
        </div>
      )}

      {/* ── Screen 0.5: Sketches + Gallery ── */}
      <div style={{ width: "100vw", background: "#000008", paddingTop: "clamp(28px,4vh,50px)", paddingBottom: "clamp(28px,4vh,50px)", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>

        {/* Sketches row — on mobile show only current + ver3 */}
        <div style={{
          display: "flex", justifyContent: "center", alignItems: "flex-end",
          gap: isMobile ? 12 : "clamp(10px,2vw,32px)",
          padding: `0 ${isMobile ? "16px" : "clamp(24px,5vw,80px)"} clamp(12px,5vh,45px)`,
        }}>
          {[
            { src: "/images/product/sketch ver4.png", label: "Current" },
            { src: "/images/product/sketch ver3.png", label: "Ver 3" },
            { src: "/images/product/sketch ver2.png", label: "Ver 2" },
            { src: "/images/product/sketch ver1.png", label: "Ver 1" },
          ].map(({ src, label }) => (
            <div key={src} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, maxWidth: 220 }}>
              <img
                src={src} alt={label}
                style={{ width: "100%", height: "auto", objectFit: "contain", filter: "invert(1)", opacity: 0.8, display: "block" }}
              />
              <div style={{ ...TEXT.label, color: "rgba(255,255,255,0.75)" /* sketch labels: slightly brighter */ }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Sketch caption */}
        <div style={{ textAlign: "center", padding: "0 clamp(24px,5vw,80px) clamp(30px,5vh,54px)" }}>
          <div style={{ ...TEXT.h2, color: "#ffffff" /* sketch caption: full white */, fontSize: "clamp(25px,3vw,40px)" }}>
            Multiple iterations for one thing:<br /><span style={{ color: C.teal }}>functionality without complexity.</span>
          </div>
        </div>

        {/* Gallery strip */}
        <div style={{ overflow: "hidden" }}>
          <GalleryScreen />
        </div>
      </div>

      {/* ── Quality / Powerful screen ── */}
      <QualityScreen />

      {/* ── Screen 1: Scenarios ── */}
      <ScenarioScreen />

      {/* ── App guides & identification ── */}
      <AppGuideScreen />

      {/* ── Screen 4: CTA ── */}
      <CTAScreen />

      <SpotPanel
        spot={selectedSpot}
        screenPos={selectedPos}
        onClose={() => { setSelectedSpot(null); setSelectedPos(null); }}
        fontSerif={FONTS.serif}
        fontSans={FONTS.sans}
        theme="dark"
      />

    </div>
  );
}
