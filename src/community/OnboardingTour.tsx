import { useEffect, useLayoutEffect, useRef, useState } from "react";
import EurekaLogo from "../components/EurekaLogo";
import { familyByName } from "./lifeTree";
import LifeTreeReveal from "./LifeTreeReveal";
import TaxonThumb from "./TaxonThumb";

type Rect = { left: number; top: number; width: number; height: number };
type Step = {
  title: string;
  body: string;
  /** A [data-tour] element to spotlight; everything else is dimmed. */
  target?: string;
  /** A sample of something the visitor cannot see yet. */
  sample?: "identify" | "new-place";
  /** Plays the Life Tree reveal full screen instead of a card. */
  reveal?: boolean;
};

const STEPS: Step[] = [
  {
    title: "Welcome to Eureka Micro Explorer",
    body: "Upload and identify your microscopic discoveries, contribute to the community, and light up your Life Tree collection.",
  },
  {
    target: "create",
    title: "Start with a place",
    body: "Click Create, then click the map where you took your sample. Your discovery site is pinned there.",
  },
  {
    sample: "identify",
    title: "Add photos and identify them",
    body: "Add photos or videos of what you found. Identify suggests the lineage from phylum to genus: choose the rank you're sure of, or type the names yourself. Click a name to read about it on Wikipedia.",
  },
  {
    reveal: true,
    title: "Light up your Life Tree",
    body: "Each family you identify lights up a new branch of your Life Tree.",
  },
  {
    target: "places",
    sample: "new-place",
    title: "Your place joins the map",
    body: "Once you save, a new card for your place appears here with your photos, and a pin appears on the map for other explorers.",
  },
  {
    target: "gallery",
    title: "Your collection",
    body: "Gallery keeps your discoveries. Edit, crop and re-identify them there, and explore your whole Life Tree.",
  },
];

const PAD = 8;
const DEMO_FAMILIES = ["Brachionidae", "Naviculaceae", "Parameciidae"];

function useTargetRect(target: string | undefined) {
  const [rect, setRect] = useState<Rect | null>(null);
  useLayoutEffect(() => {
    if (!target) return;
    let frame = 0, last = "";
    // Follows the element through layout changes (map loading, resizes).
    const track = () => {
      const el = document.querySelector(`[data-tour="${target}"]`);
      const r = el?.getBoundingClientRect();
      const next = r && r.width && r.height ? { left: r.left - PAD, top: r.top - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 } : null;
      const key = JSON.stringify(next);
      if (key !== last) { last = key; setRect(next); }
      frame = requestAnimationFrame(track);
    };
    track();
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return target ? rect : null;
}

export default function OnboardingTour({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [cardSize, setCardSize] = useState({ width: 360, height: 220 });
  const step = STEPS[index];
  const hole = useTargetRect(step.target);
  const last = index === STEPS.length - 1;

  useEffect(() => { dialog.current?.showModal(); }, []);
  useLayoutEffect(() => {
    const el = card.current;
    if (!el) return;
    const measure = () => setCardSize({ width: el.offsetWidth, height: el.offsetHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [index]);
  useEffect(() => { card.current?.querySelector<HTMLButtonElement>(".micro-tour-next")?.focus(); }, [index]);

  const next = () => (last ? onClose() : setIndex((i) => i + 1));
  const back = () => setIndex((i) => Math.max(0, i - 1));

  // The card sits beside the spotlight: below it when there is room, above
  // otherwise; centred when nothing is spotlighted. Always kept on screen.
  const vw = window.innerWidth, vh = window.innerHeight, margin = 16;
  let position: React.CSSProperties = {};
  if (hole) {
    const below = hole.top + hole.height + 14, above = hole.top - 14 - cardSize.height;
    const top = below + cardSize.height <= vh - margin ? below : Math.max(margin, above);
    const left = Math.min(Math.max(margin, hole.left + hole.width / 2 - cardSize.width / 2), vw - cardSize.width - margin);
    position = { top, left };
  }

  const sampleCard = step.sample === "new-place" ? newPlaceSlot() : null;

  return <dialog ref={dialog} className="micro-tour" aria-label="Welcome tour" onCancel={(e) => { e.preventDefault(); onClose(); }}
    onKeyDown={(e) => { if (e.key === "ArrowRight") next(); if (e.key === "ArrowLeft") back(); }}>
    {!step.reveal && (hole
      ? <div className="micro-tour-hole" style={{ left: hole.left, top: hole.top, width: hole.width, height: hole.height }} aria-hidden="true" />
      : <div className="micro-tour-dim" aria-hidden="true" />)}
    {sampleCard && <NewPlaceSample slot={sampleCard} />}
    {!step.reveal && <div ref={card} className={`micro-tour-card ${hole ? "" : "is-centered"} ${index === 0 ? "is-welcome" : ""}`} style={position} role="group" aria-roledescription="step" aria-label={`Step ${index + 1} of ${STEPS.length}`}>
      {index === 0 && <div className="micro-tour-badge" aria-hidden="true"><EurekaLogo style={{ height: 30 }} /></div>}
      <h2>{step.title}</h2>
      <p>{step.body}</p>
      {step.sample === "identify" && <IdentifySample />}
      <div className="micro-tour-footer">
        <div className="micro-tour-dots" aria-hidden="true">{STEPS.map((_, i) => <span key={i} className={i === index ? "is-active" : ""} />)}</div>
        <div className="micro-tour-buttons">
          {index > 0 ? <button type="button" onClick={back}>Back</button> : <button type="button" onClick={onClose}>Skip</button>}
          <button type="button" className="micro-tour-next" onClick={next}>{index === 0 ? "Show me around" : last ? "Start exploring" : "Next"}</button>
        </div>
      </div>
      {index > 0 && !last && <button type="button" className="micro-tour-skip" onClick={onClose} aria-label="Skip the tour">✕</button>}
    </div>}
    {step.reveal && <LifeTreeReveal
      request={{ userId: "", familyIds: DEMO_FAMILIES.map((name) => familyByName(name) ?? ""), familyNames: DEMO_FAMILIES, placeName: "Your first pond" }}
      demo={{ caption: step.body, next: "Next" }}
      onClose={next}
    />}
  </dialog>;
}

/** Where the new card slides in: over the first place card, or the deck. */
function newPlaceSlot(): Rect | null {
  const el = document.querySelector('[data-tour="places"] .micro-place-card') ?? document.querySelector('[data-tour="places"]');
  const r = el?.getBoundingClientRect();
  if (!r || !r.width) return null;
  return { left: r.left, top: r.top, width: Math.min(r.width, 340), height: Math.min(r.height, 172) };
}

function NewPlaceSample({ slot }: { slot: Rect }) {
  return <div className="micro-tour-new-place" style={{ left: slot.left, top: slot.top, width: slot.width, height: slot.height }} aria-hidden="true">
    <span className="micro-tour-new-badge">NEW</span>
    <span className="micro-tour-new-thumbs">
      <TaxonThumb name="Brachionidae" size="large" />
      <TaxonThumb name="Navicula" size="large" />
      <TaxonThumb name="Paramecium" size="large" />
    </span>
    <strong>Your first pond</strong>
    <span>1 visit · 3 finds</span>
  </div>;
}

function IdentifySample() {
  const rows: [string, string, string][] = [
    ["Phylum", "Rotifera", "99%"],
    ["Class", "Eurotatoria", "96%"],
    ["Order", "Ploima", "97%"],
    ["Family", "Brachionidae", "99%"],
    ["Genus", "Keratella", "94%"],
  ];
  return <div className="micro-tour-sample" aria-label="Example identification">
    {rows.map(([rank, name, score]) => <div key={rank} className="micro-tour-sample-row">
      <span className="micro-tour-sample-rank">{rank.toUpperCase()}</span>
      <TaxonThumb name={name} size="small" />
      <i>{name}</i>
      <span className="micro-tour-sample-score">{score}</span>
    </div>)}
  </div>;
}
