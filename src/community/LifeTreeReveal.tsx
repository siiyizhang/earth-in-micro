import { useEffect, useMemo, useRef, useState } from "react";
import { inLifeTree, isFamily, lifeTreeGraph } from "./lifeTree";
import type { LifeTreeNode } from "./lifeTree";
import { accountFamilies } from "./lifeTreeData";
import { radialEdge, radialLayout } from "./lifeTreeLayout";
import type { Layout, Point } from "./lifeTreeLayout";
import type { RevealRequest } from "./revealStore";

// Port of the iOS LifeTreeReveal: the whole tree as a dim radial disc, the
// explorer's earlier branches already lit, and this upload's branches growing
// from the centre out to their families, each name appearing as it arrives.

const DURATION = 2600;
const CORE = "#2de8c8";
type Bezier = [Point, Point, Point, Point];

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

function chainFor(id: string, byId: Map<string, LifeTreeNode>, layout: Layout): Point[] {
  const chain: Point[] = [];
  for (let n = byId.get(id); n; n = n.parentId ? byId.get(n.parentId) : undefined) {
    const p = layout.positions.get(n.id);
    if (p) chain.unshift(p);
  }
  if (chain.length && (chain[0].x !== layout.origin.x || chain[0].y !== layout.origin.y)) chain.unshift(layout.origin);
  return chain;
}

function bezierAt([a, b, c, d]: Bezier, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x,
    y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y,
  };
}

/** The first `portion` of a cubic, by arc length. */
function partialBezier(curve: Bezier, portion: number): Point[] {
  const samples = Array.from({ length: 41 }, (_, i) => bezierAt(curve, i / 40));
  const lengths = [0];
  for (let i = 1; i < samples.length; i++) lengths.push(lengths[i - 1] + Math.hypot(samples[i].x - samples[i - 1].x, samples[i].y - samples[i - 1].y));
  const target = lengths.at(-1)! * portion, points = [samples[0]];
  for (let i = 1; i < samples.length; i++) {
    if (lengths[i] <= target) { points.push(samples[i]); continue; }
    const f = (target - lengths[i - 1]) / Math.max(1e-6, lengths[i] - lengths[i - 1]);
    points.push({ x: samples[i - 1].x + (samples[i].x - samples[i - 1].x) * f, y: samples[i - 1].y + (samples[i].y - samples[i - 1].y) * f });
    break;
  }
  return points;
}

export default function LifeTreeReveal({ request, onClose, onOpenTree }: {
  request: RevealRequest;
  onClose: () => void;
  onOpenTree: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [known, setKnown] = useState<string[] | null>(null);
  const [shareable, setShareable] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Earlier discoveries stay lit; if the account cannot be read the new
  // branches still grow against an otherwise dim tree.
  useEffect(() => {
    let alive = true;
    accountFamilies(request.userId).then((ids) => { if (alive) setKnown(ids); }).catch(() => { if (alive) setKnown([]); });
    return () => { alive = false; };
  }, [request.userId]);
  useEffect(() => { dialog.current?.showModal(); }, []);

  const scene = useMemo(() => {
    if (!known) return null;
    const revealing = request.familyIds.map((id, i) => ({ id, name: request.familyNames[i] ?? "" })).filter((f) => inLifeTree(f.id));
    const nodes = lifeTreeGraph([...known, ...revealing.map((f) => f.id)]);
    const layout = radialLayout(nodes);
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const revealingIds = new Set(revealing.map((f) => f.id));
    const existing = nodes.filter((n) => isFamily(n) && n.familyState && !revealingIds.has(n.id)).map((n) => chainFor(n.id, byId, layout));
    const chains = revealing.map((f) => ({ name: f.name, points: chainFor(f.id, byId, layout) })).filter((c) => c.points.length > 1);
    return { nodes, layout, existing, chains };
  }, [known, request]);

  useEffect(() => {
    if (scene && !scene.chains.length) onClose();
  }, [scene, onClose]);

  // Draws a frame at animation time t (0…1). The backdrop and the earlier
  // branches never change, so they are painted once into an offscreen canvas.
  useEffect(() => {
    const el = canvas.current;
    if (!el || !scene) return;
    const ctx = el.getContext("2d")!;
    let backdrop: HTMLCanvasElement | null = null, frame = 0, start = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const size = () => {
      const dpr = window.devicePixelRatio || 1, rect = el.getBoundingClientRect();
      el.width = Math.round(rect.width * dpr);
      el.height = Math.round(rect.height * dpr);
      backdrop = null;
      return { w: rect.width, h: rect.height, dpr };
    };
    let dims = size();
    const fit = () => {
      const s = Math.min(dims.w, dims.h) * 0.96 / scene.layout.width;
      return { s, x: dims.w / 2 - scene.layout.origin.x * s, y: dims.h / 2 - scene.layout.origin.y * s };
    };
    const strokeChain = (g: CanvasRenderingContext2D, pts: Point[][], width: number, glowWidth: number, glowColor: string, blur: number, s: number) => {
      for (const [pass, w, color] of [["glow", glowWidth, glowColor], ["core", width, CORE]] as const) {
        g.lineWidth = w;
        g.strokeStyle = color;
        g.shadowColor = pass === "glow" ? glowColor : "transparent";
        g.shadowBlur = pass === "glow" ? blur * 2 * s * dims.dpr : 0;
        for (const line of pts) {
          g.beginPath();
          g.moveTo(line[0].x, line[0].y);
          for (const p of line.slice(1)) g.lineTo(p.x, p.y);
          g.stroke();
        }
      }
      g.shadowBlur = 0;
    };
    const edgesOf = (chain: Point[]) => chain.slice(0, -1).map((p, i) => radialEdge(scene.layout.origin, p, chain[i + 1]));
    const paintBackdrop = () => {
      const off = document.createElement("canvas");
      off.width = el.width; off.height = el.height;
      const g = off.getContext("2d")!, f = fit();
      g.setTransform(dims.dpr * f.s, 0, 0, dims.dpr * f.s, dims.dpr * f.x, dims.dpr * f.y);
      g.fillStyle = "#06110e";
      g.fillRect(-f.x / f.s, -f.y / f.s, dims.w / f.s, dims.h / f.s);
      g.lineWidth = 3;
      g.strokeStyle = "rgba(9,191,161,.08)";
      for (const n of scene.nodes) {
        const from = n.parentId ? scene.layout.positions.get(n.parentId) : undefined, to = scene.layout.positions.get(n.id);
        if (!from || !to) continue;
        const [a, b, c, d] = radialEdge(scene.layout.origin, from, to);
        g.beginPath(); g.moveTo(a.x, a.y); g.bezierCurveTo(b.x, b.y, c.x, c.y, d.x, d.y); g.stroke();
      }
      g.lineCap = "round";
      strokeChain(g, scene.existing.flatMap((chain) => edgesOf(chain).map((e) => partialBezier(e, 1))), 8, 22, "rgba(9,191,161,.17)", 16, f.s);
      g.fillStyle = CORE;
      for (const chain of scene.existing) { const tip = chain.at(-1)!; g.beginPath(); g.arc(tip.x, tip.y, 9, 0, Math.PI * 2); g.fill(); }
      return off;
    };
    const draw = (t: number) => {
      backdrop ??= paintBackdrop();
      const f = fit(), progress = easeInOut(clamp01(t / 0.75));
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(backdrop, 0, 0);
      ctx.setTransform(dims.dpr * f.s, 0, 0, dims.dpr * f.s, dims.dpr * f.x, dims.dpr * f.y);
      ctx.lineCap = "round";
      for (const chain of scene.chains) {
        const edges = edgesOf(chain.points), lines: Point[][] = [];
        for (let i = 0; i < edges.length; i++) {
          const portion = clamp01((progress - i / edges.length) * edges.length);
          if (portion <= 0) break;
          lines.push(partialBezier(edges[i], portion));
        }
        strokeChain(ctx, lines, 9, 26, "rgba(9,191,161,.2)", 18, f.s);
        if (progress >= 1) {
          const tip = chain.points.at(-1)!;
          ctx.fillStyle = "rgba(9,191,161,.33)";
          ctx.shadowColor = "rgba(9,191,161,.33)";
          ctx.shadowBlur = 44 * f.s * dims.dpr;
          ctx.beginPath(); ctx.arc(tip.x, tip.y, 30, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = CORE;
          ctx.beginPath(); ctx.arc(tip.x, tip.y, 11, 0, Math.PI * 2); ctx.fill();
        }
      }
      // Names in screen space, growing away from the centre, fading in.
      const opacity = clamp01((t - 0.75) / 0.15);
      if (progress < 1 || opacity <= 0) return;
      ctx.setTransform(dims.dpr, 0, 0, dims.dpr, 0, 0);
      ctx.font = "700 13px 'DM Sans', system-ui, sans-serif";
      ctx.textBaseline = "middle";
      for (const chain of scene.chains) {
        if (!chain.name) continue;
        const tip = chain.points.at(-1)!, screen = { x: f.x + tip.x * f.s, y: f.y + tip.y * f.s };
        const out = { x: tip.x - scene.layout.origin.x, y: tip.y - scene.layout.origin.y }, len = Math.hypot(out.x, out.y) || 1;
        const dir = { x: out.x / len, y: out.y / len }, width = Math.min(ctx.measureText(chain.name).width, dims.w * 0.45);
        const anchor = { x: screen.x + dir.x * 14, y: screen.y + dir.y * 14 };
        const x = Math.min(Math.max(4, dir.x >= 0 ? anchor.x : anchor.x - width), Math.max(4, dims.w - width - 4));
        const y = Math.min(Math.max(12, anchor.y), dims.h - 12);
        ctx.shadowColor = "rgba(6,17,14,.8)";
        ctx.shadowBlur = 6 * dims.dpr;
        ctx.fillStyle = `rgba(255,255,255,${opacity})`;
        ctx.fillText(chain.name, x, y, dims.w * 0.45);
        ctx.shadowBlur = 0;
      }
    };
    const tick = (now: number) => {
      start ||= now;
      const t = reduced ? 1 : Math.min(1, (now - start) / DURATION);
      draw(t);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const onResize = () => { dims = size(); draw(1); };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", onResize); };
  }, [scene]);

  useEffect(() => {
    const probe = new File([new Blob()], "tree.png", { type: "image/png" });
    setShareable(!!navigator.canShare?.({ files: [probe] }));
  }, []);

  async function png() {
    return new Promise<Blob>((resolve, reject) => canvas.current!.toBlob((b) => (b ? resolve(b) : reject(new Error("Export failed"))), "image/png"));
  }
  async function save() {
    setExporting(true);
    try {
      const url = URL.createObjectURL(await png());
      const a = document.createElement("a");
      a.href = url;
      a.download = `eureka_life_tree_${Date.now()}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } finally { setExporting(false); }
  }
  async function share() {
    setExporting(true);
    try {
      const file = new File([await png()], `eureka_life_tree_${Date.now()}.png`, { type: "image/png" });
      await navigator.share({ files: [file], title: "New light on the tree of life" });
    } catch { /* cancelled */ } finally { setExporting(false); }
  }
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return <dialog ref={dialog} className="micro-reveal" aria-label="New light on the tree of life" onCancel={(e) => { e.preventDefault(); onClose(); }} onClick={onClose}>
    <canvas ref={canvas} aria-hidden="true" />
    <header className="micro-reveal-top">
      {request.placeName && <p className="micro-reveal-place"><span aria-hidden="true">📍</span>{request.placeName}</p>}
      <p className="micro-reveal-title">NEW LIGHT ON THE TREE OF LIFE</p>
      {scene && <p className="micro-visually-hidden">{scene.chains.map((c) => c.name).filter(Boolean).join(", ")}</p>}
    </header>
    <footer className="micro-reveal-bottom">
      <div className="micro-reveal-actions">
        <button type="button" disabled={exporting || !scene} onClick={(e) => { stop(e); void save(); }}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg><span>Save</span>
        </button>
        {shareable && <button type="button" disabled={exporting || !scene} onClick={(e) => { stop(e); void share(); }}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V4M8 8l4-4 4 4M6 12v7h12v-7" /></svg><span>Share</span>
        </button>}
      </div>
      <p>Explore these branches in detail on the Life Tree page in Gallery.</p>
      <button type="button" className="micro-reveal-open" onClick={(e) => { stop(e); onOpenTree(); }}>🌳 Open Life Tree</button>
      <p className="micro-reveal-hint">Click anywhere to continue</p>
    </footer>
  </dialog>;
}
