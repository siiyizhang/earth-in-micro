import { useState, useEffect, useRef, useSyncExternalStore } from "react";

// ── Mobile hook ────────────────────────────────────────────────────────────────
function useIsMobile(bp = 640) {
  return useSyncExternalStore(
    (cb) => { window.addEventListener("resize", cb); return () => window.removeEventListener("resize", cb); },
    () => window.innerWidth < bp,
    () => false,
  );
}
import LowPolyEarthGlobe from "./components/LowPolyEarthGlobe";
import SpotPanel from "./components/SpotPanel";
import GeoReadout from "./components/GeoReadout";
import MailchimpForm from "./components/MailchimpForm";
import StripeButton from "./components/StripeButton";
import type { Spot } from "./data/spots";
import { fetchSpots } from "./lib/spotsApi";

// ── Constants ─────────────────────────────────────────────────────────────────

const FONTS = {
  serif: "'Yaroop', serif",
  sans: "'Inter', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

const C = {
  navy:       "#1A3A5C",
  teal:       "#0ABFBC",
  tealLight:  "#E6F9F9",
  green:      "#2ECC71",
  text:       "#1A2B3C",
  textMid:    "rgba(26,42,60,0.55)",
  textLight:  "rgba(26,42,60,0.35)",
  border:     "rgba(26,42,60,0.12)",
};

// ── Typography scale ───────────────────────────────────────────────────────────
const FONTS_SERIF = "'Yaroop', serif";
const FONTS_SANS  = "'Inter', sans-serif";
const FONTS_MONO  = "'JetBrains Mono', monospace";

const TEXT = {
  hero: {
    fontFamily: FONTS_SERIF, fontWeight: 100,
    fontSize: "clamp(20px,2.6vw,42px)", lineHeight: 1.15, letterSpacing: "-0.01em",
    color: "rgba(26,42,60,0.92)",
  },
  h1: {
    fontFamily: FONTS_SERIF, fontWeight: 100,
    fontSize: "clamp(28px,3.6vw,52px)", lineHeight: 1.15, letterSpacing: "-0.01em",
    color: "rgba(26,42,60,0.88)",
  },
  h2: {
    fontFamily: FONTS_SERIF, fontWeight: 100,
    fontSize: "clamp(20px,2vw,28px)", lineHeight: 1.2, letterSpacing: "-0.01em",
    color: "rgba(26,42,60,0.88)",
  },
  h3: {
    fontFamily: FONTS_SANS, fontWeight: 600,
    fontSize: "clamp(20px,2.2vw,28px)", lineHeight: 1.3,
    color: "rgba(26,42,60,0.88)",
  },
  body: {
    fontFamily: FONTS_SANS, fontWeight: 300,
    fontSize: "clamp(15px,1.2vw,18px)", lineHeight: 1.7,
    color: "rgba(26,42,60,0.5)",
  },
  bodySmall: {
    fontFamily: FONTS_SANS, fontWeight: 300,
    fontSize: "clamp(13px,1vw,15px)", lineHeight: 1.7,
    color: "rgba(26,42,60,0.5)",
  },
  caption: {
    fontFamily: FONTS_SANS, fontWeight: 400,
    fontSize: "clamp(11px,0.9vw,13px)", letterSpacing: "0.06em",
    color: "rgba(26,42,60,0.5)",
  },
  label: {
    fontFamily: FONTS_SANS, fontWeight: 400,
    fontSize: "clamp(10px,0.8vw,12px)", letterSpacing: "0.18em",
    textTransform: "uppercase" as const,
    color: "rgba(26,42,60,0.5)",
  },
  nav: {
    fontFamily: FONTS_SANS, fontWeight: 400,
    fontSize: "clamp(12px,1vw,14px)", letterSpacing: "0.04em",
    color: "rgba(26,42,60,0.7)",
  },
  specValue: {
    fontFamily: FONTS_MONO, fontWeight: 400,
    fontSize: "clamp(18px,2vw,28px)", letterSpacing: "-0.02em", lineHeight: 1.1,
    color: "rgba(26,42,60,1)",
  },
  specLabel: {
    fontFamily: FONTS_SANS, fontWeight: 400,
    fontSize: "clamp(10px,0.75vw,12px)", letterSpacing: "0.12em",
    textTransform: "uppercase" as const, lineHeight: 1.4,
    color: "rgba(26,42,60,0.5)",
  },
};

// ── Scenario data ─────────────────────────────────────────────────────────────

const SCENARIOS = [
  {
    id: "kitchen",
    name: "Kitchen",
    bg: "/images/scenarios/kitchen.png",
    micro: { label: "Yeast cell", desc: "Your fridge is full of science waiting to be discovered." },
  },
  {
    id: "bedroom",
    name: "Bedroom",
    bg: "/images/scenarios/bedroom.png",
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

// ── PowerfulScreen ─────────────────────────────────────────────────────────────

function TooltipIcon({ fonts, colors }: { fonts: typeof FONTS; colors: typeof C }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{
          width: 14, height: 14, borderRadius: "50%",
          border: `1px solid ${colors.textLight}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "default", flexShrink: 0,
          fontFamily: fonts.sans, fontSize: 9, color: colors.textLight,
          userSelect: "none",
        }}
      >?</div>
      {show && (
        <div style={{
          position: "absolute", top: "50%", left: "calc(100% + 10px)",
          transform: "translateY(-50%)",
          width: 480, background: "#ffffff",
          border: "1px solid rgba(26,42,60,0.1)",
          borderRadius: 12, padding: "14px 16px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          fontFamily: fonts.sans, fontSize: 12, color: colors.textMid,
          lineHeight: 1.7, zIndex: 50,
          pointerEvents: "none",
        }}>
          Most people associate microscope performance with magnification. But magnification alone can be misleading, especially in digital microscopes. Without sufficient resolution, increasing magnification only results in a larger, blurrier image. This phenomenon is known as <em>empty magnification</em>: the image appears bigger, but no new detail is revealed.
          <br /><br />
          What truly matters is resolution, the ability to distinguish fine details that are close together. To evaluate this, we use the USAF 1951 resolution test chart, a standard tool featuring groups of fine lines at varying distances.
          <br /><br />
          In the lower right corner of the chart image is Group 7, Element 6, where the space between lines is 2.2 µm. If a microscope can clearly resolve these lines, it can distinguish details at least as small as 2.2 µm. (For reference, the diameter of human red blood cells is 7–8 µm.)
        </div>
      )}
    </div>
  );
}

function PowerfulScreen({ fonts, colors }: { fonts: typeof FONTS; colors: typeof C }) {
  const isMobile = useIsMobile();
  const comparisons = [
    { src: "/images/product/20.jpg",     price: "~$20",    name: "Toy 1",        highlight: false },
    { src: "/images/product/80.png",     price: "~$80",    name: "Toy 2",      highlight: false },
    { src: "/images/product/150.jpg",    price: "~$150",   name: "Toy 3",  highlight: false },
    { src: "/images/product/eureka.png", price: "$259",    name: "Eureka",     highlight: true  },
    { src: "/images/product/5000.png",   price: "~$5,000", name: "Lab grade",  highlight: false },
  ];

  const PAD = isMobile ? "16px" : "clamp(64px,9vw,120px)";

  return (
    <div style={{ margin: isMobile ? "0 8px" : "0 24px", background: "#f5f3ee", borderRadius: 24, overflow: "hidden" }}>

      {/* ── Header: slogan ── */}
      <div style={{ padding: `clamp(28px,4vh,52px) ${PAD}`, textAlign: "center" }}>
        <h2 style={{ ...TEXT.h1, fontSize: "clamp(28px,4vw,56px)", color: C.text, margin: 0, lineHeight: 1.1 }}>
          Not just another toy microscope.
        </h2>
      </div>

      {/* ── Row 1: videos left + right column ── */}
      <div style={{ display: "flex", justifyContent: "center", padding: `clamp(20px,3vh,40px) ${PAD}` }}>
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 32, alignItems: isMobile ? "stretch" : "flex-end", width: "100%" }}>

        {/* Left: testimonial videos — mobile: both; desktop: Francesco only */}
        {isMobile ? (
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ borderRadius: 12, overflow: "hidden", aspectRatio: "9/16" }}>
                <video src="/video/Testimonial Francesco.mp4" autoPlay muted loop playsInline
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
              <div style={{ ...TEXT.caption, color: "rgba(26,42,60,0.35)", paddingLeft: 2 }}>Dr. Francesco Pomati · Freshwater Ecology Group Leader</div>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ borderRadius: 12, overflow: "hidden", aspectRatio: "9/16" }}>
                <video src="/video/Testimonial Marta.mp4" autoPlay muted loop playsInline
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
              <div style={{ ...TEXT.caption, color: "rgba(26,42,60,0.35)", paddingLeft: 2 }}>Marta Reyes · Freshwater Ecologist</div>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: "0 0 auto", width: "22%", alignSelf: "stretch" }}>
            <div style={{ flex: 1, position: "relative", overflow: "hidden", borderRadius: 12, aspectRatio: "9/16" }}>
              <video src="/video/Testimonial Francesco.mp4" autoPlay muted loop playsInline
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div style={{ ...TEXT.caption, color: "rgba(26,42,60,0.35)", paddingLeft: 2 }}>
              Dr. Francesco Pomati · Freshwater Ecology Group Leader
            </div>
          </div>
        )}

        {/* Right column: text top + comparison bottom */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Right-top: resolution text */}
          <div style={{ flex: "0 0 auto" }}>
            <div style={{ ...TEXT.h3, marginBottom: 8 }}>Lab-grade Image Quality</div>
            <div style={{ ...TEXT.body }}>
              Most microscopes advertise magnification, but the image still looks blurry. With 1.6 μm resolution, Eureka shows real structure. Not just bigger, but clearer.
            </div>
          </div>

          {/* Right-bottom: resolution comparison — chart reference + 5-way grid */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, minHeight: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ ...TEXT.label, color: "rgba(26,42,60,0.35)" }}>
                USAF 1951 resolution test chart
              </span>
              <TooltipIcon fonts={fonts} colors={colors} />
            </div>

            {/* Row 1: reference chart, full width */}
            <div style={{ borderRadius: 8, overflow: "hidden", flexShrink: 0, maxHeight: 260 }}>
              <img
                src="/images/product/chart long.png"
                alt="USAF 1951 chart"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </div>

            {/* Row 2: 5 microscope images */}
            <div style={{ display: "flex", gap: 4, flexShrink: 0, alignItems: "stretch" }}>
              {comparisons.map(c => (
                <div key={c.src} style={{
                  flex: 1, display: "flex", flexDirection: "column",
                  borderRadius: 8, overflow: "hidden",
                  outline: c.highlight ? `2px solid ${colors.teal}` : `1px solid rgba(26,42,60,0.08)`,
                  outlineOffset: "-1px",
                  background: "#ffffff",
                  position: "relative", zIndex: c.highlight ? 1 : 0,
                }}>
                  <div style={{ height: 24, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <div style={{
                      fontFamily: fonts.sans, fontSize: 9, fontWeight: 600,
                      padding: "2px 7px", borderRadius: 20,
                      background: c.highlight ? colors.teal : "rgba(26,42,60,0.08)",
                      color: c.highlight ? "#fff" : colors.textMid,
                      letterSpacing: "0.04em",
                    }}>{c.price}</div>
                  </div>
                  <div style={{ width: "100%", aspectRatio: "3/2", overflow: "hidden", flexShrink: 0 }}>
                    <img src={c.src} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </div>
                  <div style={{
                    height: 24, display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: fonts.sans, fontSize: 9, flexShrink: 0,
                    color: c.highlight ? colors.teal : colors.textMid,
                    fontWeight: c.highlight ? 600 : 400, letterSpacing: "0.04em",
                  }}>{c.name}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
      </div>

      {/* ── Row 3: Durable & Portable ── */}
      <div style={{ minHeight: 280, display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "center", justifyContent: "center", padding: isMobile ? `32px ${PAD}` : `0 ${PAD}`, gap: isMobile ? 20 : 48 }}>

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
            <div style={{ ...TEXT.caption, color: "rgba(26,42,60,0.35)", paddingLeft: 2, flexShrink: 0 }}>Marta Reyes · Freshwater Ecologist</div>
          </div>
        )}

        <div style={{ flex: "0 0 auto", maxWidth: isMobile ? "100%" : 400, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ ...TEXT.h3, marginBottom: 14 }}>Durable & Portable</div>
          <div style={{ ...TEXT.body }}>
            Drop-tested and water-resistant. Built to survive curious hands and backpack adventures — from kitchen counter to forest floor.
          </div>
        </div>
      </div>

      {/* ── Row 4: Multi-mode illumination ── */}
      <div style={{ minHeight: 280, display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "center", justifyContent: "center", padding: `clamp(32px,6vh,72px) ${PAD}`, gap: isMobile ? 20 : 48 }}>
        <div style={{ flex: "0 0 auto", maxWidth: isMobile ? "100%" : 400, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ ...TEXT.h3, marginBottom: 14 }}>Multi-mode Illumination</div>
          <div style={{ ...TEXT.body }}>
            With just a tap on the app, you can switch between bright, dark, and oblique lighting to reveal hidden details. Add a polarization filter set, and even a simple crystal transforms into a dazzling rainbow kaleidoscope. Every change reveals something new to be curious about.
          </div>
        </div>
        <div style={{ flex: isMobile ? "none" : "0 0 52%", borderRadius: 16, overflow: "hidden", height: isMobile ? 220 : "auto", aspectRatio: isMobile ? undefined : "3355/1970", maxHeight: isMobile ? undefined : "80%" }}>
          <img src="/images/product/4.png" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        </div>
      </div>

    </div>
  );
}

// ── SimpleScreen ───────────────────────────────────────────────────────────────

function SimpleScreen({ fonts, colors }: { fonts: typeof FONTS; colors: typeof C }) {
  const isMobile = useIsMobile();
  const PAD = isMobile ? "16px" : "clamp(40px, 8vw, 120px)";
  const cardBg = "#F7F9FB";
  const cardRadius = 20;

  const ageGroups = [
    { age: "7–10", tag: "First wonder",        desc: "Observe insects, rocks, flowers, food, and everyday objects." },
    { age: "11–14", tag: "Independent explorer", desc: "Prepare their own slides. Run structured experiments. Textbook content becomes reality." },
    { age: "15–17", tag: "Young scientist",      desc: "Design their own research projects. Use advanced imaging modes. Contribute real data to citizen science programs." },
  ];

  return (
    <div style={{ width: "100vw", background: "#ffffff", padding: `clamp(48px,7vh,96px) ${PAD}`, boxSizing: "border-box" }}>

      {/* Slogan */}
      <h2 style={{ ...TEXT.h1, fontSize: "clamp(32px,4vw,58px)", color: C.text, lineHeight: 1.15, margin: "0 0 clamp(40px,6vh,72px)", textAlign: "center" }}>
        Easy to start.<br />
        <span style={{ color: colors.teal }}>Hard to outgrow.</span>
      </h2>

      {/* Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Card 1: Kids do it independently + girl.png */}
        <div style={{ background: cardBg, borderRadius: cardRadius, display: "flex", flexDirection: isMobile ? "column" : "row", minHeight: isMobile ? 0 : 320, padding: 12, gap: 12 }}>
          <div style={{ flex: 1, padding: isMobile ? "20px 16px" : "24px 28px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 14 }}>
            <div style={{ ...TEXT.h2, color: C.text }}>Pick it up and explore</div>
            <div style={{ ...TEXT.body }}>
              Children aged 7+ can set it up on their own. No previous experience needed.
            </div>
            <div style={{ ...TEXT.body }}>
              Eureka connects to any phone, tablet, or computer via WiFi. Cast it to a TV for family viewing.
            </div>
          </div>
          <div style={{ flex: "0 0 auto", width: isMobile ? "100%" : undefined, aspectRatio: isMobile ? "16/9" : "2014/1605", maxWidth: isMobile ? "100%" : "45%", borderRadius: cardRadius - 4, overflow: "hidden" }}>
            <img src="/images/product/girl.png" alt="kid using microscope"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
        </div>

        {/* Card 2: Built-in guides in the app + two images */}
        <div style={{ background: cardBg, borderRadius: cardRadius, display: "flex", flexDirection: isMobile ? "column" : "row", minHeight: isMobile ? 0 : 280, padding: 12, gap: 12 }}>
          {/* Two images side by side */}
          <div style={{ flex: "0 0 45%", display: "flex", gap: 8, height: isMobile ? 200 : "auto" }}>
            <div style={{ flex: 1, borderRadius: cardRadius - 4, overflow: "hidden" }}>
              <img src="/images/product/app1.jpg" alt="app guide" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
            <div style={{ flex: 1, borderRadius: cardRadius - 4, overflow: "hidden" }}>
              <img src="/images/product/app2.jpg" alt="app interface" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
          </div>
          <div style={{ flex: 1, padding: isMobile ? "16px 12px" : "24px 28px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 14 }}>
            <div style={{ ...TEXT.h2, color: C.text }}>Built-in guides in the app</div>
            <div style={{ ...TEXT.body }}>
              Simple tutorial cards offer gentle guidance of what to look for and what to try next, with new ideas added over time.
            </div>
            <div style={{ ...TEXT.body }}>
              Behind it, an AI system adapts to what’s being observed and who’s exploring.
            </div>
          </div>
        </div>

        {/* Card 3: Different ages, different depth + two images */}
        <div style={{ background: cardBg, borderRadius: cardRadius, display: "flex", flexDirection: isMobile ? "column" : "row", minHeight: isMobile ? 0 : 480, padding: 12, gap: 12 }}>
          <div style={{ flex: 1, padding: isMobile ? "20px 16px" : "24px 28px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 20 }}>
            <div style={{ ...TEXT.h2, color: C.text }}>Different ages, different depth.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {ageGroups.map(g => (
                <div key={g.age} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <div style={{ flex: "0 0 48px", textAlign: "right" }}>
                    <div style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.teal, letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{g.age}</div>
                  </div>
                  <div>
                    <div style={{ ...TEXT.body, fontWeight: 600, color: C.text, marginBottom: 3 }}>{g.tag}</div>
                    <div style={{ ...TEXT.body }}>{g.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Two images + caption */}
          <div style={{ flex: isMobile ? "0 0 auto" : "0 0 45%", display: "flex", flexDirection: "column", gap: 8, height: isMobile ? 200 : "auto" }}>
            <div style={{ flex: 1, display: "flex", gap: 8, minHeight: 0, height: isMobile ? 192 : undefined }}>
              <div style={{ flex: 1, borderRadius: cardRadius - 4, overflow: "hidden" }}>
                <img src="/images/product/thesis.png" alt="student thesis" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
              <div style={{ flex: 1, borderRadius: cardRadius - 4, overflow: "hidden" }}>
                <img src="/images/product/sophie.png" alt="Sophie" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
            </div>
            {!isMobile && (
              <div style={{ ...TEXT.caption, color: "rgba(26,42,60,0.35)", paddingLeft: 2 }}>
                A Swiss high-school student finished her graduation thesis with our prototype
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// ── ScenarioScreen component ───────────────────────────────────────────────────

function ScenarioScreen({
  fonts,
  colors,
}: {
  fonts: typeof FONTS;
  colors: typeof C;
}) {
  const isMobile = useIsMobile();
  const [active, setActive] = useState<string | null>(null);

  if (isMobile) {
    const activeScenario = SCENARIOS.find(s => s.id === active) ?? SCENARIOS[0];
    return (
      <div style={{ width: "100vw", background: "#ffffff" }}>
        <div style={{ padding: "clamp(28px,4vh,48px) 24px clamp(20px,2.5vh,32px)", textAlign: "center" }}>
          <div style={{ ...TEXT.h1, fontSize: "clamp(28px,4vw,58px)", color: C.text }}>
            One portable microscope.<br /><span style={{ color: colors.teal }}>Endless discoveries.</span>
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
            <h2 style={{ ...TEXT.h2, fontSize: "clamp(22px,2.2vw,34px)", color: "#ffffff", margin: "0 0 8px" }}>{activeScenario.name}</h2>
            <p style={{ ...TEXT.bodySmall, color: "rgba(255,255,255,0.65)", margin: 0 }}>{activeScenario.micro.desc}</p>
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
                  fontFamily: fonts.sans, fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase",
                  flexShrink: 0, padding: "8px 16px", borderRadius: 999,
                  border: isActive ? `1px solid ${colors.teal}` : "1px solid rgba(26,42,60,0.15)",
                  background: isActive ? "rgba(10,191,188,0.08)" : "transparent",
                  color: isActive ? colors.teal : colors.textMid,
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
    <div style={{ width: "100vw", height: "100vh", background: "#ffffff", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>

      {/* ── Slogan above panels ── */}
      <div style={{ padding: "clamp(28px,4vh,48px) clamp(32px,5vw,72px) clamp(20px,2.5vh,32px)", textAlign: "center" }}>
        <div style={{ ...TEXT.h1, fontSize: "clamp(32px,4vw,58px)", color: C.text }}>
          One portable microscope.<br /><span style={{ color: colors.teal }}>Endless discoveries.</span>
        </div>
      </div>

      {/* ── Accordion panels ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "row", overflow: "hidden", margin: "0 clamp(16px,3vw,40px) clamp(16px,3vw,40px)", borderRadius: 20, gap: 0 }}>
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
                backgroundSize: "cover",
                backgroundPosition: "center",
              }} />
              <div style={{
                position: "absolute", inset: 0,
                background: isActive
                  ? "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.15) 60%, transparent 100%)"
                  : "rgba(0,0,0,0.45)",
                transition: "background 0.4s ease",
              }} />

              {!isActive && (
                <div style={{
                  position: "absolute", inset: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <div style={{
                    writingMode: "vertical-rl",
                    textOrientation: "mixed",
                    transform: "rotate(180deg)",
                    fontFamily: fonts.sans,
                    fontSize: 11,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.75)",
                    whiteSpace: "nowrap",
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
                <h2 style={{ ...TEXT.h2, fontSize: "clamp(22px,2.2vw,34px)", color: "#ffffff", margin: "0 0 12px" }}>
                  {s.name}
                </h2>
                <p style={{ ...TEXT.bodySmall, color: "rgba(255,255,255,0.65)", margin: 0, maxWidth: 320 }}>
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

interface AppProps {
  issStyle?: "glow" | "line";
}

export default function AppLowPoly({ issStyle }: AppProps = {}) {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [spotsError, setSpotsError] = useState<string | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [selectedPos, setSelectedPos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredSpot, setHoveredSpot] = useState<Spot | null>(null);
  const [globeLatLng, setGlobeLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [navVisible, setNavVisible] = useState(false);
  const [lightbox, setLightbox] = useState<{ thumb: string; full: string; label: string; isVideo: boolean } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const NAV_HEIGHT = 57; // navbar height in px — offset so content isn't hidden behind it
  const scrollToScreen = (screenIndex: number) => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: window.innerHeight * screenIndex - NAV_HEIGHT, behavior: "smooth" });
  };

  useEffect(() => {
    fetchSpots().then(({ spots: s, source, error }) => {
      setSpots(s);
      setSpotsError(source === "fallback" ? error : null);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      setNavVisible(el.scrollTop > window.innerHeight * 0.2);
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
        background: "#ffffff",
        position: "relative",
      }}
    >

      {/* ── Global floating navbar ── */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        padding: isMobile ? "10px 16px" : "14px clamp(24px,4vw,48px)",
        display: "flex", alignItems: "center",
        background: navVisible ? "rgba(255,255,255,0.82)" : "transparent",
        backdropFilter: navVisible ? "blur(12px)" : "none",
        borderBottom: navVisible ? "1px solid rgba(26,42,60,0.06)" : "none",
        transition: "background 0.3s ease, backdrop-filter 0.3s ease, border-bottom 0.3s ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 12 }}>
          <img
            src={navVisible ? "/Black text.png" : "/White text.png"}
            alt="Earth in Micro"
            style={{ height: isMobile ? 24 : 29, display: "block", opacity: navVisible ? 1 : 0, transition: "opacity 0.3s ease" }}
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
                  color: navVisible ? TEXT.nav.color : "rgba(255,255,255,0.75)",
                  textDecoration: "none",
                  transition: "color 0.2s, opacity 0.3s",
                  whiteSpace: "nowrap",
                  opacity: navVisible ? 1 : 0,
                  pointerEvents: navVisible ? "auto" : "none",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = navVisible ? "rgba(26,42,60,1)" : "#ffffff"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = navVisible ? "rgba(26,42,60,0.7)" : "rgba(255,255,255,0.75)"; }}
              >
                {label}
              </a>
            ))}

            <button
              type="button"
              onClick={() => document.getElementById("cta-edu")?.scrollIntoView({ behavior: "smooth" })}
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
        {spotsError && (
          <div
            style={{
              position: "fixed",
              top: 18,
              right: 18,
              zIndex: 50,
              maxWidth: 520,
              padding: "10px 12px",
              background: "rgba(20,30,50,0.07)",
              border: "1px solid rgba(20,30,50,0.12)",
              borderRadius: 10,
              color: "rgba(20,30,50,0.7)",
              fontFamily: FONTS.sans,
              fontSize: 11,
              lineHeight: 1.5,
              backdropFilter: "blur(10px)",
            }}
          >
            <div>
              Spots API not available — showing built-in demo spots. Check that `server.ts` is running and `.env` has `NOTION_TOKEN` + `NOTION_DATABASE_ID`.
            </div>
            <div style={{ marginTop: 6, opacity: 0.85, fontSize: 10, wordBreak: "break-word" }}>
              {spotsError}
            </div>
          </div>
        )}

        {/* ── Screen 0: Hero ── */}
        <div style={{ width: "100vw", height: "100vh", minHeight: 560, overflow: "hidden", background: "#ffffff", display: "flex", flexDirection: "column", position: "relative" }}>

          {/* ── Video section (fills top, ~62% height) ── */}
          <div style={{ position: "relative", flex: "0 0 62%", overflow: "hidden" }}>

            {/* Video */}
            <video
              src="/video/education 2 compressed.mp4"
              autoPlay
              muted
              loop
              playsInline
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
            />

            {/* Text overlay */}
            <div style={{
              position: "absolute", inset: 0,
              background: isMobile
                ? "linear-gradient(to bottom, rgba(8,14,24,0.85) 0%, rgba(8,14,24,0.6) 20%, rgba(8,14,24,0.1) 100%)"
                : "linear-gradient(to right, rgba(8,14,24,0.88) 0%, rgba(8,14,24,0.72) 2%, rgba(8,14,24,0.0) 60%)",
              display: "flex",
              alignItems: isMobile ? "flex-start" : "center",
            }}>
              <div style={{ padding: isMobile ? "24px 20px 0" : `0 0 0 clamp(32px, 6vw, 80px)`, maxWidth: isMobile ? "100%" : "42vw" }}>
                <h1 style={{
                  fontFamily: FONTS.serif,
                  fontWeight: 100,
                  fontSize: isMobile ? "clamp(26px, 7vw, 38px)" : "clamp(28px, 3.6vw, 52px)",
                  color: "rgba(255,255,255,0.95)",
                  lineHeight: 1.18,
                  letterSpacing: "-0.01em",
                  margin: "0 0 12px",
                }}>
                  <span style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}>BIG THINGS START WITH</span><br />
                  <span style={{ fontStyle: "italic" }}>small discoveries.</span>
                </h1>
                <p style={{ ...TEXT.body, color: "rgba(255,255,255,0.85)", margin: "0 0 16px" }}>
                  Eureka Microscope turns everyday life into a nature &amp; science adventure.
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["Age 7+", "No prior experience needed"].map(tag => (
                    <div key={tag} style={{
                      fontFamily: FONTS.sans,
                      fontSize: "clamp(9px, 0.85vw, 11px)",
                      letterSpacing: "0.1em",
                      color: "rgba(255,255,255,0.6)",
                      border: "1px solid rgba(255,255,255,0.25)",
                      borderRadius: 20,
                      padding: "4px 12px",
                      whiteSpace: "nowrap",
                    }}>{tag}</div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* ── Scrolling gallery strip ── */}
          {(() => {
            const GALLERY_ITEMS = [
              { thumb: "/images/hero gallery/thumbs/UZH pond ciliate.mp4",                        full: "/images/hero gallery/UZH pond ciliate.mp4",                        label: "pond ciliate",  isVideo: true  },
              { thumb: "/images/hero gallery/thumbs/asplanchna rotifer.mp4",                       full: "/images/hero gallery/asplanchna rotifer.mp4",                       label: "rotifer",       isVideo: true  },
              { thumb: "/images/hero gallery/thumbs/insect wing.jpg",                              full: "/images/hero gallery/insect wing.png",                              label: "insect wing",   isVideo: false },
              { thumb: "/images/hero gallery/thumbs/onion cell.jpg",                               full: "/images/hero gallery/onion cell.png",                               label: "onion cell",    isVideo: false },
              { thumb: "/images/hero gallery/thumbs/pollen.jpg",                                   full: "/images/hero gallery/pollen.png",                                   label: "pollen",        isVideo: false },
              { thumb: "/images/hero gallery/thumbs/stentor-ezgif.com-video-to-gif-converter.mp4", full: "/images/hero gallery/stentor-ezgif.com-video-to-gif-converter.mp4", label: "stentor",       isVideo: true  },
              { thumb: "/images/hero gallery/thumbs/sugar crystal 2.jpg",                          full: "/images/hero gallery/sugar crystal 2.jpg",                          label: "sugar crystal", isVideo: false },
            ];
            return (
              <>
                <div style={{ flex: "0 0 auto", padding: "0 0 8px", position: "relative" }}>
                  <div style={{ textAlign: "center", padding: "12px 0 10px", ...TEXT.label, color: "rgba(26,42,60,0.35)" }}>
                    Captured with current prototype
                  </div>
                  {isMobile && <div style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", zIndex: 3, pointerEvents: "none", fontSize: 18, color: "rgba(26,42,60,0.4)" }}>‹</div>}
                  {isMobile && <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", zIndex: 3, pointerEvents: "none", fontSize: 18, color: "rgba(26,42,60,0.4)" }}>›</div>}
                  <div style={{ overflow: isMobile ? "auto" : "hidden", position: "relative",
                    ...(isMobile ? { WebkitOverflowScrolling: "touch" as "touch" } : {}),
                  }}>
                    {!isMobile && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 60, background: "linear-gradient(to right, #ffffff, transparent)", zIndex: 2, pointerEvents: "none" }} />}
                    {!isMobile && <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 60, background: "linear-gradient(to left, #ffffff, transparent)", zIndex: 2, pointerEvents: "none" }} />}
                    <div style={{ display: "flex", gap: 14, width: "max-content",
                      ...(isMobile ? {} : { animation: "galleryScroll 36s linear infinite" }),
                    }}>
                      {(isMobile ? [0] : [0, 1]).map((setIdx) =>
                        GALLERY_ITEMS.map((item, i) => (
                          <div
                            key={`${setIdx}-${i}`}
                            onClick={() => setLightbox(item)}
                            style={{
                              width: "clamp(100px, 25vw, 160px)",
                              height: "clamp(75px, 19vw, 120px)",
                              borderRadius: 14, overflow: "hidden",
                              flexShrink: 0, position: "relative",
                              border: "1px solid rgba(26,42,60,0.1)",
                              boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                              cursor: "pointer",
                            }}
                          >
                            {item.isVideo ? (
                              <video src={item.thumb} autoPlay muted loop playsInline
                                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                            ) : (
                              <img src={item.thumb} alt={item.label} loading="lazy"
                                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                            )}
                            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "14px 10px 7px", background: "linear-gradient(to top, rgba(0,0,0,0.45), transparent)", lineHeight: 1 }}>
                              <span style={{ ...TEXT.label, color: "rgba(255,255,255,0.8)" }}>{item.label}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <style>{`
                      @keyframes galleryScroll {
                        from { transform: translateX(0); }
                        to   { transform: translateX(-50%); }
                      }
                    `}</style>
                  </div>
                </div>

                {/* Lightbox */}
                {lightbox && (
                  <div
                    onClick={() => setLightbox(null)}
                    style={{
                      position: "fixed", inset: 0, zIndex: 1000,
                      background: "rgba(0,0,0,0.88)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      padding: 24,
                    }}
                  >
                    <div onClick={e => e.stopPropagation()} style={{ position: "relative", maxWidth: "90vw", maxHeight: "85vh" }}>
                      {lightbox.isVideo ? (
                        <video
                          src={lightbox.full}
                          autoPlay muted loop playsInline
                          style={{ maxWidth: "90vw", maxHeight: "85vh", borderRadius: 12, display: "block" }}
                        />
                      ) : (
                        <img
                          src={lightbox.full}
                          alt={lightbox.label}
                          style={{ maxWidth: "90vw", maxHeight: "85vh", borderRadius: 12, display: "block" }}
                        />
                      )}
                      <div style={{ ...TEXT.label, color: "rgba(255,255,255,0.7)", textAlign: "center", marginTop: 12 }}>{lightbox.label}</div>
                      <button
                        onClick={() => setLightbox(null)}
                        style={{
                          position: "absolute", top: -14, right: -14,
                          width: 32, height: 32, borderRadius: "50%",
                          background: "rgba(255,255,255,0.15)", border: "none",
                          color: "#ffffff", fontSize: 18, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          lineHeight: 1,
                        }}
                      >×</button>
                    </div>
                  </div>
                )}
              </>
            );
          })()}

          {/* ── CTA button ── */}
          <div style={{ flex: 1, minHeight: 80, display: "flex", alignItems: "center", justifyContent: "center", paddingBottom: "clamp(20px, 3vh, 40px)", paddingTop: 4 }}>
            <button
              onClick={() => scrollToScreen(1)}
              style={{
                fontFamily: FONTS.sans,
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: "0.06em",
                color: "#ffffff",
                background: C.teal,
                border: "none",
                borderRadius: 40,
                padding: "14px 40px",
                cursor: "pointer",
                transition: "background 0.2s, transform 0.15s",
                boxShadow: `0 4px 24px rgba(10,191,188,0.35)`,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#0dd4d1"; (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.03)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = C.teal; (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
            >
              Explore Eureka Microscope →
            </button>
          </div>
        </div>

        {/* ── Screen 1: Powerful ── */}
        <PowerfulScreen fonts={FONTS} colors={C} />

        {/* ── Screen 2: Simple ── */}
        <SimpleScreen fonts={FONTS} colors={C} />

        {/* ── Screen 3: Scenarios ── */}
        <ScenarioScreen fonts={FONTS} colors={C} />

        {/* ── Screen 4: Globe ── */}
        <div
          className="relative select-none"
          style={{ width: "100vw", height: isMobile ? "calc(100vw + 130px)" : "100vh", minHeight: isMobile ? 0 : "100vh", overflow: "hidden", background: "#ffffff" }}
        >
          {!loading && (
            <div style={isMobile ? {
              width: "130vw", height: "130vw",
              position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            } : { width: "100%", height: "100%" }}>
              <LowPolyEarthGlobe
                spots={spots}
                onSpotClick={(spot, pos) => {
                  setSelectedSpot(spot);
                  setSelectedPos(pos);
                }}
                onSpotHover={setHoveredSpot}
                onGlobeHover={setGlobeLatLng}
                fontSerif={FONTS.serif}
                fontSans={FONTS.sans}
                issStyle={issStyle}
                exploding={false}
              />
            </div>
          )}

          {loading && (
            <div
              className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
              style={{ ...TEXT.label, color: "rgba(26,42,60,0.15)" }}
            >
              Loading
            </div>
          )}

          {hoveredSpot && !selectedSpot && (
            <div className="absolute bottom-10 left-1/2 z-10 pointer-events-none" style={{ transform: "translateX(-50%)" }}>
              <div style={{
                background: "rgba(255,255,255,0.92)",
                backdropFilter: "blur(16px)",
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: "7px 20px 8px",
                textAlign: "center",
                whiteSpace: "nowrap",
              }}>
                <div style={{ ...TEXT.bodySmall, fontFamily: FONTS.serif, color: C.text }}>
                  {hoveredSpot.name}
                </div>
                <div style={{ ...TEXT.label, color: "rgba(26,42,60,0.35)", marginTop: 2 }}>
                  {hoveredSpot.location}
                </div>
              </div>
            </div>
          )}

          {!loading && (
            <div className="absolute left-1/2 z-10 pointer-events-none" style={{ top: 56, transform: "translateX(-50%)", textAlign: "center" }}>
              <div style={{ ...TEXT.h2, fontSize: "clamp(22px,2.2vw,34px)", color: C.text, whiteSpace: "nowrap", marginBottom: 10 }}>
                Expand curiosity to the globe.
              </div>
              <div style={{ ...TEXT.label, color: "rgba(26,42,60,0.35)", whiteSpace: "nowrap" }}>
                Drag to rotate · click to explore
              </div>
            </div>
          )}

          <GeoReadout latLng={globeLatLng} fontMono={FONTS.mono} />

        </div>

        {/* ── Screen 5: CTA ── */}
        <div style={{ padding: isMobile ? "0 12px" : "0 24px" }}>

          {/* Price + CTA */}
          <div id="cta-edu" style={{
            minHeight: isMobile ? 0 : "calc(100vh - 48px)",
            background: "#f5f5f3",
            borderRadius: 24,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: isMobile ? "clamp(40px,7vh,64px) 20px" : "clamp(48px,8vh,80px) clamp(24px,8vw,120px)",
            gap: "clamp(32px,6vh,64px)",
          }}>
            {/* Price */}
            <div style={{ textAlign: "center" }}>
              <div style={{ ...TEXT.label, marginBottom: 16 }}>
                Limited offer
              </div>
              <div style={{ ...TEXT.h1, color: "rgba(26,42,60,0.85)" }}>
                Early Bird Price
              </div>
              <div style={{ fontFamily: FONTS.serif, fontWeight: 100, fontSize: "clamp(48px,7vw,96px)", color: "rgba(26,42,60,0.9)", letterSpacing: "-0.02em", lineHeight: 1.05 }}>
                $259
              </div>
            </div>

            {/* Two columns */}
            <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 40 : "clamp(24px,5vw,80px)", width: "100%", maxWidth: 860, alignItems: "flex-start" }}>

              {/* Left: Mailchimp subscribe */}
              <div style={{ flex: 1, width: isMobile ? "100%" : undefined }}>
                <div style={{ ...TEXT.label, marginBottom: 12 }}>
                  Join the waitlist
                </div>
                <div style={{ ...TEXT.h2, marginBottom: 12 }}>
                  Be the first to know
                </div>
                <div style={{ ...TEXT.body, marginBottom: 20 }}>
                  Get exclusive early access to our Kickstarter campaign and special offers.
                </div>
                <MailchimpForm
                  dark={false}
                  actionUrl={(import.meta.env.VITE_MAILCHIMP_EDU_URL as string) || ""}
                  tags="12752742"
                />
              </div>

              {/* Divider */}
              {!isMobile && <div style={{ width: 1, background: "rgba(20,30,50,0.1)", alignSelf: "stretch", flexShrink: 0 }} />}

              {/* Right: Stripe deposit */}
              <div style={{ flex: 1, width: isMobile ? "100%" : undefined }}>
                <div style={{ ...TEXT.label, color: C.teal, marginBottom: 12 }}>
                  Pre-order deposit
                </div>
                <div style={{ ...TEXT.h2, marginBottom: 12 }}>
                  Lock in your price
                </div>
                <div style={{ ...TEXT.body, marginBottom: 24 }}>
                  Put down 3 CHF (~$3.8) now to secure the early bird price at launch. Your deposit also helps us show investors that people really want this.
                </div>
                <StripeButton href={(import.meta.env.VITE_STRIPE_EDU_URL as string) || ""} />
              </div>
            </div>
          </div>

          {/* Sponsors */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: "clamp(32px,6vw,72px)", flexWrap: "wrap",
            padding: "clamp(24px,4vh,40px) clamp(24px,5vw,64px)",
            borderTop: "1px solid rgba(26,42,60,0.08)",
          }}>
            <div style={{ fontFamily: FONTS.sans, fontWeight: 400, fontSize: "clamp(10px,0.8vw,12px)", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(26,42,60,0.8)" }}>Supported by</div>
            <img src="/sponsor/SPH_logo.avif" alt="SPH" style={{ height: 80, opacity: 0.9 }} />
            <img src="/sponsor/logo_VENTUREKICK_cmyk-1.avif" alt="Venture Kick" style={{ height: 36, opacity: 0.9 }} />
            <img src="/sponsor/IN_Logo.svg" alt="Innosuisse" style={{ height: 36, opacity: 0.9 }} />
          </div>

          {/* Footer */}
          <div style={{
            borderTop: "1px solid rgba(26,42,60,0.08)",
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
                <img src="/Black text.png" alt="Earth in Micro" style={{ height: 32, display: "block", marginBottom: 10, margin: isMobile ? "0 auto 10px" : "0 0 10px" }} />
                <div style={{ fontFamily: FONTS.sans, fontWeight: 300, fontSize: "clamp(13px,1vw,15px)", color: "rgba(26,42,60,0.4)", lineHeight: 1.6 }}>
                  Making microscopy more accessible — anyone, anywhere, anytime.
                </div>
              </div>

              {/* Links columns */}
              <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 24 : "clamp(24px,4vw,56px)", alignItems: isMobile ? "center" : "flex-start" }}>
                {/* Contact — full row on mobile */}
                <div style={{ textAlign: isMobile ? "center" : "left" }}>
                  <div style={{ fontFamily: FONTS.sans, fontWeight: 400, fontSize: "clamp(10px,0.8vw,12px)", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(26,42,60,0.8)", marginBottom: 16 }}>Contact</div>
                  <div style={{ fontFamily: FONTS.sans, fontWeight: 300, fontSize: "clamp(13px,1vw,15px)", color: "rgba(26,42,60,0.4)", lineHeight: 2 }}>
                    Clausiusstrasse 16<br />
                    8006 Zurich<br />
                    <a href="mailto:eureka@eurekamicroscope.com"
                      style={{ color: "rgba(26,42,60,0.4)", textDecoration: "none" }}
                      onMouseEnter={e => { (e.currentTarget).style.color = "rgba(26,42,60,0.9)"; }}
                      onMouseLeave={e => { (e.currentTarget).style.color = "rgba(26,42,60,0.4)"; }}
                    >eureka@eurekamicroscope.com</a>
                  </div>
                </div>

                {/* Quick Menu + Socials — same row on mobile */}
                <div style={{ display: "flex", gap: isMobile ? 32 : "clamp(24px,4vw,56px)" }}>
                  {/* Quick Menu */}
                  <div>
                    <div style={{ fontFamily: FONTS.sans, fontWeight: 400, fontSize: "clamp(10px,0.8vw,12px)", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(26,42,60,0.8)", marginBottom: 16 }}>Quick Menu</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {["About Us", "Blog"].map(label => (
                        <a key={label} href={`#${label.toLowerCase().replace(" ", "-")}`}
                          style={{ fontFamily: FONTS.sans, fontWeight: 300, fontSize: "clamp(13px,1vw,15px)", color: "rgba(26,42,60,0.4)", textDecoration: "none" }}
                          onMouseEnter={e => { (e.currentTarget).style.color = "rgba(26,42,60,0.9)"; }}
                          onMouseLeave={e => { (e.currentTarget).style.color = "rgba(26,42,60,0.4)"; }}
                        >{label}</a>
                      ))}
                    </div>
                  </div>

                  {/* Socials */}
                  <div>
                    <div style={{ fontFamily: FONTS.sans, fontWeight: 400, fontSize: "clamp(10px,0.8vw,12px)", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(26,42,60,0.8)", marginBottom: 16 }}>Socials</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {[
                        { label: "Instagram", href: "https://www.instagram.com/eureka.microscope_/" },
                        { label: "LinkedIn",  href: "https://www.linkedin.com/company/eureka-microscope" },
                        { label: "TikTok",    href: "https://www.tiktok.com/@eureka.microscope" },
                      ].map(({ label, href }) => (
                        <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                          style={{ fontFamily: FONTS.sans, fontWeight: 300, fontSize: "clamp(13px,1vw,15px)", color: "rgba(26,42,60,0.4)", textDecoration: "none" }}
                          onMouseEnter={e => { (e.currentTarget).style.color = "rgba(26,42,60,0.9)"; }}
                          onMouseLeave={e => { (e.currentTarget).style.color = "rgba(26,42,60,0.4)"; }}
                        >{label}</a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

      <SpotPanel
        spot={selectedSpot}
        screenPos={selectedPos}
        onClose={() => { setSelectedSpot(null); setSelectedPos(null); }}
        fontSerif={FONTS.serif}
        fontSans={FONTS.sans}
        theme="light"
      />
    </div>
  );
}
