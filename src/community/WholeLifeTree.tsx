import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { isFamily, isLit } from "./lifeTree";
import type { LifeTreeNode } from "./lifeTree";
import { Modal } from "./Shared";

// Port of the iOS WholeLifeTree (whole_life_tree.dart): the same two layouts,
// the same semantic-zoom reveal and the same compact place-card mode. Every
// constant below mirrors the Flutter painter so both apps draw one tree.

export type LifeTreeStyle = "lifemap" | "radial";
type Point = { x: number; y: number };
type Layout = {
  style: LifeTreeStyle;
  width: number;
  height: number;
  origin: Point;
  positions: Map<string, Point>;
  depths: Map<string, number>;
  maxDepth: number;
  signature: string;
  revealLevels: Map<string, number>;
  sectorRadii: Map<string, number>;
  sectorDirections: Map<string, number>;
};

const MIN_SCALE = 0.025;
const MAX_SCALE = 40;
const LIT = "#09bfa1";
const RESTRICTED_ZOOM_SPAN = 6;
const NODE_REVEAL_FLOOR = 0.55;

function childMap(nodes: LifeTreeNode[]) {
  const children = new Map<string | null, LifeTreeNode[]>();
  for (const n of nodes) children.set(n.parentId, [...(children.get(n.parentId) ?? []), n]);
  for (const list of children.values()) list.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return children;
}

function lifemapLayout(nodes: LifeTreeNode[]): Layout {
  const origin = { x: 3200, y: 3920 }, rootRadius = 3000;
  const children = childMap(nodes);
  const positions = new Map<string, Point>(), depths = new Map<string, number>();
  const radii = new Map<string, number>(), directions = new Map<string, number>(), raw = new Map<string, number>();
  let maxDepth = 1;
  const place = (child: LifeTreeNode, parent: Point, direction: number, distance: number, radius: number, depth: number) => {
    const position = { x: parent.x + Math.cos(direction) * distance, y: parent.y + Math.sin(direction) * distance };
    positions.set(child.id, position);
    depths.set(child.id, depth);
    radii.set(child.id, radius);
    directions.set(child.id, direction);
    raw.set(child.id, Math.log2(rootRadius / radius));
    maxDepth = Math.max(maxDepth, depth);
    placeChildren(child.id, position, direction, radius, depth + 1);
  };
  function placeChildren(parentId: string | null, parent: Point, parentDirection: number, parentRadius: number, depth: number) {
    const list = children.get(parentId) ?? [];
    if (!list.length) return;
    if (list.length === 1) {
      const child = list[0];
      const radius = parentRadius * ((children.get(child.id) ?? []).length ? 0.8 : 0.5);
      place(child, parent, parentDirection, parentRadius - radius, radius, depth);
      return;
    }
    const weights = list.map((n) => Math.sqrt(Math.max(1, n.familyCount)));
    const total = weights.reduce((a, b) => a + b, 0);
    let cursor = parentDirection - Math.PI / 2;
    list.forEach((child, i) => {
      const half = (Math.PI / 2) * weights[i] / total;
      const direction = cursor + half;
      cursor += half * 2;
      const tangent = Math.abs(Math.tan(half));
      const radius = Math.max(parentRadius * 0.006, parentRadius * tangent / (1 + tangent));
      place(child, parent, direction, parentRadius - radius, radius, depth);
    });
  }
  placeChildren(null, origin, -Math.PI / 2, rootRadius, 1);
  const nonRoot = nodes.filter((n) => n.parentId !== null).map((n) => raw.get(n.id) ?? 0);
  const min = nonRoot.length ? Math.min(...nonRoot) : 0, max = nonRoot.length ? Math.max(...nonRoot) : 1;
  const range = Math.max(0.0001, max - min);
  const revealLevels = new Map<string, number>();
  for (const n of nodes) {
    if (n.parentId === null) { revealLevels.set(n.id, 0); continue; }
    const normalized = Math.min(1, Math.max(0, ((raw.get(n.id) ?? min) - min) / range));
    revealLevels.set(n.id, 0.72 + Math.pow(normalized, 0.82) * 5.05);
  }
  return { style: "lifemap", width: 6400, height: 4200, origin, positions, depths, maxDepth, signature: `lifemap:${nodes.length}:${maxDepth}`, revealLevels, sectorRadii: radii, sectorDirections: directions };
}

const ringRadius = (depth: number, maxDepth: number) => 150 + Math.pow(depth / Math.max(1, maxDepth), 0.82) * (1900 - 230);

function radialLayout(nodes: LifeTreeNode[]): Layout {
  const extent = 4200, outer = 1900, center = { x: extent / 2, y: extent / 2 };
  const children = childMap(nodes);
  const depths = new Map<string, number>();
  let maxDepth = 1;
  const recordDepth = (n: LifeTreeNode, depth: number) => {
    depths.set(n.id, depth);
    maxDepth = Math.max(maxDepth, depth);
    for (const c of children.get(n.id) ?? []) recordDepth(c, depth + 1);
  };
  for (const root of children.get(null) ?? []) recordDepth(root, 1);
  const leaves = nodes.filter((n) => !(children.get(n.id) ?? []).length).length;
  let cursor = 0;
  const angles = new Map<string, number>();
  const assign = (n: LifeTreeNode): number => {
    const list = children.get(n.id) ?? [];
    let angle;
    if (!list.length) angle = -Math.PI / 2 + Math.PI * 2 * (cursor++ + 0.5) / Math.max(1, leaves);
    else { const a = list.map(assign); angle = (a[0] + a[a.length - 1]) / 2; }
    angles.set(n.id, angle);
    return angle;
  };
  for (const root of children.get(null) ?? []) assign(root);
  const positions = new Map<string, Point>();
  for (const n of nodes) {
    const radius = isFamily(n) ? outer : ringRadius(depths.get(n.id) ?? 1, maxDepth);
    const angle = angles.get(n.id) ?? 0;
    positions.set(n.id, { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius });
  }
  return { style: "radial", width: extent, height: extent, origin: center, positions, depths, maxDepth, signature: `radial:${nodes.length}:${maxDepth}`, revealLevels: new Map(), sectorRadii: new Map(), sectorDirections: new Map() };
}

const revealLevel = (layout: Layout, id: string) => (layout.style === "lifemap" ? layout.revealLevels.get(id) ?? 0 : 0);
const semantic = (scale: number, fit: number) => Math.max(0, Math.log2(scale / Math.max(fit, 0.0001)));
function visible(layout: Layout, id: string, scale: number, fit: number) {
  return layout.style !== "lifemap" || revealLevel(layout, id) <= semantic(scale, fit) + 0.08;
}

function accent(hex?: string) {
  return hex && /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : LIT;
}
function alpha(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

type View = { scale: number; x: number; y: number };

function paint(ctx: CanvasRenderingContext2D, width: number, height: number, dpr: number, layout: Layout, nodes: LifeTreeNode[], view: View, fit: number, selectedId: string | null, restrictToLit: boolean) {
  const s = Math.max(view.scale, MIN_SCALE);
  const sx = (p: Point) => p.x * view.scale + view.x, sy = (p: Point) => p.y * view.scale + view.y;
  const onScreen = (x: number, y: number, m = 40) => x > -m && y > -m && x < width + m && y < height + m;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#020907";
  ctx.fillRect(0, 0, width, height);

  // Background gradient across the layout canvas, as the Flutter painter.
  const left = view.x, top = view.y, w = layout.width * view.scale, h = layout.height * view.scale;
  const gradient = layout.style === "radial"
    ? ctx.createRadialGradient(left + w / 2, top + h / 2, 0, left + w / 2, top + h / 2, Math.min(w, h) / 2)
    : ctx.createLinearGradient(0, top + h, 0, top);
  gradient.addColorStop(0, "#17362f");
  gradient.addColorStop(layout.style === "radial" ? 0.48 : 0.35, "#071410");
  gradient.addColorStop(1, "#010604");
  ctx.fillStyle = gradient;
  ctx.fillRect(left, top, w, h);

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const children = new Map<string, LifeTreeNode[]>();
  for (const n of nodes) if (n.parentId) children.set(n.parentId, [...(children.get(n.parentId) ?? []), n]);
  const isVisible = (id: string) => visible(layout, id, view.scale, fit);
  const origin = { x: sx(layout.origin), y: sy(layout.origin) };

  if (layout.style === "radial") {
    ctx.strokeStyle = "rgba(255,255,255,.035)";
    ctx.lineWidth = 1;
    for (let d = 1; d <= layout.maxDepth; d++) {
      ctx.beginPath();
      ctx.arc(origin.x, origin.y, ringRadius(d, layout.maxDepth) * view.scale, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else {
    // A faint half-circle where a visible node still hides children.
    for (const n of nodes) {
      if (!isVisible(n.id)) continue;
      const kids = children.get(n.id) ?? [];
      if (!kids.length || kids.every((k) => isVisible(k.id))) continue;
      const p = layout.positions.get(n.id), r = layout.sectorRadii.get(n.id), dir = layout.sectorDirections.get(n.id);
      if (!p || r === undefined || dir === undefined || r <= 0) continue;
      const radius = r * 0.92 * view.scale, cx = sx(p), cy = sy(p);
      if (cx + radius < 0 || cy + radius < 0 || cx - radius > width || cy - radius > height) continue;
      const color = accent(n.accentColor);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, dir - Math.PI / 2, dir + Math.PI / 2);
      ctx.closePath();
      ctx.fillStyle = alpha(color, 0.018);
      ctx.fill();
      ctx.strokeStyle = alpha(color, 0.075);
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }

  ctx.lineCap = "round";
  for (const n of nodes) {
    if (!isVisible(n.id)) continue;
    const to = layout.positions.get(n.id);
    if (!to) continue;
    const parent = n.parentId ? byId.get(n.parentId) : undefined;
    const from = (parent && layout.positions.get(parent.id)) || layout.origin;
    const lit = isLit(n);
    const a = { x: sx(from), y: sy(from) }, b = { x: sx(to), y: sy(to) };
    let c1 = a, c2 = b;
    if (layout.style === "radial") {
      const fv = { x: from.x - layout.origin.x, y: from.y - layout.origin.y }, tv = { x: to.x - layout.origin.x, y: to.y - layout.origin.y };
      const fd = Math.hypot(fv.x, fv.y), td = Math.hypot(tv.x, tv.y), mid = (fd + td) / 2;
      const at = (v: Point, d: number) => (d === 0 ? layout.origin : { x: layout.origin.x + v.x / d * mid, y: layout.origin.y + v.y / d * mid });
      const f = at(fv, fd), t = at(tv, td);
      c1 = { x: sx(f), y: sy(f) };
      c2 = { x: sx(t), y: sy(t) };
    }
    const minX = Math.min(a.x, b.x, c1.x, c2.x), maxX = Math.max(a.x, b.x, c1.x, c2.x);
    const minY = Math.min(a.y, b.y, c1.y, c2.y), maxY = Math.max(a.y, b.y, c1.y, c2.y);
    if (maxX < -20 || maxY < -20 || minX > width + 20 || minY > height + 20) continue;
    const depth = layout.depths.get(n.id) ?? layout.maxDepth;
    const weight = n.parentId === null ? 3 : isFamily(n) ? 0.8 : Math.min(2, Math.max(1, 2.15 - depth * 0.12));
    const trace = () => {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      if (layout.style === "radial") ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, b.x, b.y);
      else ctx.lineTo(b.x, b.y);
    };
    if (lit) {
      trace();
      ctx.strokeStyle = alpha(LIT, 0.16);
      ctx.shadowColor = alpha(LIT, 0.16);
      ctx.shadowBlur = 16 * dpr;
      ctx.lineWidth = weight + 4;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    trace();
    ctx.strokeStyle = lit ? LIT : "rgba(255,255,255,.04)";
    ctx.lineWidth = lit ? weight * 1.25 : weight;
    ctx.stroke();
  }

  let deepest = 0;
  for (const n of nodes) if (isLit(n)) deepest = Math.max(deepest, layout.depths.get(n.id) ?? 0);
  const zoom = semantic(view.scale, fit);
  const revealZoom = (depth: number) => (deepest <= 0 ? NODE_REVEAL_FLOOR : Math.max(NODE_REVEAL_FLOOR, depth / deepest * RESTRICTED_ZOOM_SPAN));
  const showNode = (n: LifeTreeNode) => !restrictToLit || zoom >= revealZoom(layout.depths.get(n.id) ?? 0);

  for (const n of nodes) {
    if (!isVisible(n.id) || !showNode(n)) continue;
    const p = layout.positions.get(n.id);
    if (!p) continue;
    const x = sx(p), y = sy(p);
    if (!onScreen(x, y)) continue;
    const lit = isLit(n), selected = n.id === selectedId, isRoot = n.parentId === null;
    const color = lit ? LIT : accent(n.accentColor);
    let radius = (selected ? 8 : isRoot ? 5.5 : lit ? 3.5 : 1.35) / s;
    if ((restrictToLit && lit) || (isFamily(n) && layout.style === "lifemap")) {
      radius = Math.min(Math.max(radius, lit ? 3.2 : 1.8), (lit ? 26 : 15) / s);
    }
    const r = radius * view.scale;
    if (selected || lit) {
      ctx.beginPath();
      ctx.arc(x, y, r * 2.35, 0, Math.PI * 2);
      ctx.fillStyle = alpha(color, selected ? 0.22 : 0.11);
      ctx.shadowColor = alpha(color, selected ? 0.22 : 0.11);
      ctx.shadowBlur = 16 * dpr;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = lit || selected ? color : "#53605d";
    ctx.fill();
    if (selected) {
      ctx.beginPath();
      ctx.arc(x, y, r * 1.55, 0, Math.PI * 2);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  if (!restrictToLit) {
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = LIT;
    ctx.fill();
  }

  const showLabel = (n: LifeTreeNode, isRoot: boolean, lit: boolean) => {
    if (restrictToLit) {
      if (!lit) return false;
      const depth = layout.depths.get(n.id) ?? 0;
      if (deepest <= 0 || depth <= 0) return false;
      return zoom >= revealZoom(depth) + 0.3;
    }
    if (isRoot || n.id === selectedId) return true;
    if (layout.style === "lifemap") {
      if (isFamily(n)) return false;
      return lit || zoom >= revealLevel(layout, n.id) + 0.18;
    }
    const depth = layout.depths.get(n.id) ?? 99;
    if (view.scale >= 0.22 && depth <= 3) return true;
    if (view.scale >= 0.45 && (depth <= 5 || lit)) return true;
    if (view.scale >= 0.9 && !isFamily(n)) return true;
    return view.scale >= 1.7;
  };
  const priority = (n: LifeTreeNode) => (n.id === selectedId ? 3 : n.parentId === null ? 2 : isLit(n) ? 1 : 0);
  const labels = nodes.filter((n) => {
    const p = layout.positions.get(n.id);
    return p && isVisible(n.id) && onScreen(sx(p), sy(p), 260) && showLabel(n, n.parentId === null, isLit(n));
  }).sort((a, b) => priority(a) - priority(b));
  const occupied: { l: number; t: number; r: number; b: number }[] = [];
  ctx.textBaseline = "middle";
  for (const n of labels) {
    const p = layout.positions.get(n.id)!;
    const isRoot = n.parentId === null, lit = isLit(n);
    const size = isRoot ? 12.5 : isFamily(n) ? 9.5 : 10.5;
    ctx.font = `${isRoot ? 800 : 600} ${size}px system-ui, -apple-system, sans-serif`;
    const maxWidth = isFamily(n) ? 180 : 240;
    let text = n.name;
    if (ctx.measureText(text).width > maxWidth) {
      while (text.length > 1 && ctx.measureText(`${text}…`).width > maxWidth) text = text.slice(0, -1);
      text = `${text}…`;
    }
    const textWidth = ctx.measureText(text).width, textHeight = size * 1.2, pad = 4;
    const ox = sx(p) + 9, oy = sy(p) - textHeight / 2;
    const rect = { l: ox - pad - 3, t: oy - pad - 3, r: ox + textWidth + pad + 3, b: oy + textHeight + pad + 3 };
    const isPriority = isRoot || n.id === selectedId;
    if (!isPriority && occupied.some((o) => o.l < rect.r && rect.l < o.r && o.t < rect.b && rect.t < o.b)) continue;
    occupied.push(rect);
    ctx.beginPath();
    ctx.roundRect(ox - pad, oy - pad, textWidth + pad * 2, textHeight + pad * 2, 6);
    ctx.fillStyle = "rgba(2,8,6,.8)";
    ctx.fill();
    ctx.shadowColor = "#000";
    ctx.shadowBlur = 7 * dpr;
    ctx.fillStyle = isRoot || lit ? "#fff" : "rgba(255,255,255,.7)";
    ctx.fillText(text, ox, oy + textHeight / 2);
    ctx.shadowBlur = 0;
  }
}

const icons: { [name: string]: ReactNode } = {
  expand: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  search: <><circle cx="11" cy="11" r="6" /><path d="m20 20-4.5-4.5" /></>,
  in: <path d="M12 5v14M5 12h14" />,
  out: <path d="M5 12h14" />,
  fit: <><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" /><rect x="8" y="8" width="8" height="8" rx="1" /></>,
  radial: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.5" /></>,
  lifemap: <><path d="M5 19 A6.5 6.5 0 0 1 11.5 12.5M5 19A10.5 10.5 0 0 1 15.5 8.5M5 19A14.5 14.5 0 0 1 19.5 4.5" /><path d="M5 19V4.5M5 19h14.5" /></>,
  refresh: <path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5" />,
  focus: <><circle cx="12" cy="12" r="3" /><path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" /></>,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  hub: <><circle cx="12" cy="12" r="2.5" /><circle cx="5" cy="5" r="1.8" /><circle cx="19" cy="5" r="1.8" /><circle cx="12" cy="20" r="1.8" /><path d="m6.3 6.3 4 4M17.7 6.3l-4 4M12 14.5v3.7" /></>,
  sparkle: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />,
};
export function TreeIcon({ name }: { name: keyof typeof icons }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="micro-tree-icon">{icons[name]}</svg>;
}

function Control({ name, label, onClick }: { name: keyof typeof icons; label: string; onClick: () => void }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick}><TreeIcon name={name} /></button>;
}

export default function WholeLifeTree({
  nodes,
  onOpen,
  onRefresh,
  onExpand,
  initialStyle = "lifemap",
  compact = false,
}: {
  nodes: LifeTreeNode[];
  onOpen: (node: LifeTreeNode) => void;
  onRefresh?: () => void;
  onExpand?: () => void;
  initialStyle?: LifeTreeStyle;
  compact?: boolean;
}) {
  const [style, setStyle] = useState<LifeTreeStyle>(initialStyle);
  const layout = useMemo(() => (style === "lifemap" ? lifemapLayout(nodes) : radialLayout(nodes)), [nodes, style]);
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const view = useRef<View>({ scale: 1, x: 0, y: 0 });
  const fitScale = useRef(1);
  const size = useRef({ width: 0, height: 0 });
  const fitKey = useRef("");
  const frame = useRef(0);
  const [scale, setScale] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const selected = selectedId ? nodes.find((n) => n.id === selectedId) ?? null : null;
  const latest = useRef({ layout, nodes, selectedId, compact });
  useLayoutEffect(() => { latest.current = { layout, nodes, selectedId, compact }; });
  const [fitState, setFitState] = useState(1);

  const draw = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const el = canvas.current, ctx = el?.getContext("2d");
      const { width, height } = size.current;
      if (!el || !ctx || !width || !height) return;
      const dpr = window.devicePixelRatio || 1;
      if (el.width !== Math.round(width * dpr) || el.height !== Math.round(height * dpr)) {
        el.width = Math.round(width * dpr);
        el.height = Math.round(height * dpr);
      }
      const l = latest.current;
      paint(ctx, width, height, dpr, l.layout, l.nodes, view.current, fitScale.current, l.selectedId, l.compact);
    });
  }, []);

  const setView = useCallback((next: View) => {
    view.current = next;
    setScale((old) => (Math.abs(old - next.scale) < 0.015 ? old : next.scale));
    draw();
  }, [draw]);

  const fit = useCallback(() => {
    const { width, height } = size.current, l = latest.current.layout;
    if (!width || !height) return;
    const s = Math.min(1, Math.max(MIN_SCALE, Math.min((width - 20) / l.width, (height - 20) / l.height)));
    fitScale.current = s;
    setFitState(s);
    setScale(s);
    setView({ scale: s, x: (width - l.width * s) / 2, y: (height - l.height * s) / 2 });
  }, [setView]);

  const zoomAt = useCallback((factor: number, at?: Point) => {
    const { width, height } = size.current, v = view.current;
    const center = at ?? { x: width / 2, y: height / 2 };
    const target = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor));
    const scene = { x: (center.x - v.x) / v.scale, y: (center.y - v.y) / v.scale };
    setView({ scale: target, x: center.x - scene.x * target, y: center.y - scene.y * target });
  }, [setView]);

  const focus = useCallback((node: LifeTreeNode, minimum = 0.48) => {
    const p = layout.positions.get(node.id), { width, height } = size.current;
    if (!p || !width) return;
    const reveal = fitScale.current * Math.pow(2, revealLevel(layout, node.id));
    const target = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.max(Math.max(view.current.scale, minimum), reveal * 1.12)));
    setView({ scale: target, x: width / 2 - p.x * target, y: height / 2 - p.y * target });
    setSelectedId(node.id);
  }, [layout, setView]);

  // Refit whenever the viewport or the graph itself changes.
  useLayoutEffect(() => {
    const el = host.current;
    if (!el) return;
    fitKey.current = "";
    const measure = () => {
      const rect = el.getBoundingClientRect();
      size.current = { width: rect.width, height: rect.height };
      const key = `${rect.width.toFixed(1)}:${rect.height.toFixed(1)}:${latest.current.layout.signature}`;
      if (fitKey.current !== key) { fitKey.current = key; fit(); } else draw();
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [fit, draw, layout]);

  useEffect(() => { draw(); }, [draw, nodes, selectedId, compact]);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  // Pointer pan / pinch / tap, and wheel zoom.
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef({ moved: 0, multi: false });
  function local(e: { clientX: number; clientY: number }): Point {
    const rect = canvas.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function selectAt(point: Point) {
    const v = view.current, scene = { x: (point.x - v.x) / v.scale, y: (point.y - v.y) / v.scale };
    let distance = 22 / Math.max(v.scale, MIN_SCALE), nearest: LifeTreeNode | null = null;
    for (const n of nodes) {
      if (!visible(layout, n.id, v.scale, fitScale.current)) continue;
      if (compact && !(isFamily(n) && isLit(n))) continue;
      const p = layout.positions.get(n.id);
      if (!p) continue;
      const d = Math.hypot(p.x - scene.x, p.y - scene.y);
      if (d < distance) { distance = d; nearest = n; }
    }
    if (!nearest) return;
    if (compact) onOpen(nearest);
    else setSelectedId(nearest.id);
  }
  const onPointerDown = (e: React.PointerEvent) => {
    canvas.current?.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, local(e));
    if (pointers.current.size === 1) gesture.current = { moved: 0, multi: false };
    else gesture.current.multi = true;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const previous = pointers.current.get(e.pointerId);
    if (!previous) return;
    const point = local(e);
    if (pointers.current.size === 1) {
      gesture.current.moved += Math.hypot(point.x - previous.x, point.y - previous.y);
      pointers.current.set(e.pointerId, point);
      const v = view.current;
      setView({ ...v, x: v.x + point.x - previous.x, y: v.y + point.y - previous.y });
      return;
    }
    const [a, b] = [...pointers.current.values()];
    const beforeMid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, beforeDist = Math.hypot(a.x - b.x, a.y - b.y);
    pointers.current.set(e.pointerId, point);
    const [c, d] = [...pointers.current.values()];
    const mid = { x: (c.x + d.x) / 2, y: (c.y + d.y) / 2 }, dist = Math.hypot(c.x - d.x, c.y - d.y);
    const v = view.current;
    const target = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * (beforeDist ? dist / beforeDist : 1)));
    const scene = { x: (beforeMid.x - v.x) / v.scale, y: (beforeMid.y - v.y) / v.scale };
    setView({ scale: target, x: mid.x - scene.x * target, y: mid.y - scene.y * target });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const had = pointers.current.delete(e.pointerId);
    if (had && !pointers.current.size && !gesture.current.multi && gesture.current.moved < 6) selectAt(local(e));
  };
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      // Inside the scrolling place card, a plain wheel keeps scrolling the
      // page; a trackpad pinch (ctrl+wheel) or modifier still zooms the tree.
      if (compact && !e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), { x: e.clientX - rect.left, y: e.clientY - rect.top });
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [compact, zoomAt]);

  const families = nodes.filter(isFamily).length;
  const litFamilies = nodes.filter((n) => isFamily(n) && isLit(n)).length;
  const visibleCount = style === "lifemap" ? nodes.filter((n) => visible(layout, n.id, scale, fitState)).length : nodes.length;
  const selectedColor = selected ? (isLit(selected) ? LIT : accent(selected.accentColor)) : LIT;

  return <div className={`micro-life-tree ${compact ? "is-compact" : ""}`} ref={host}>
    <canvas
      ref={canvas}
      role="img"
      aria-label={`Life Tree, ${litFamilies} of ${families} families lit`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={(e) => pointers.current.delete(e.pointerId)}
    />
    {!compact && <div className="micro-tree-status" aria-live="polite">
      <TreeIcon name="hub" />
      <span>{style === "lifemap" ? "LifeMap" : "Radial"} · {style === "lifemap" ? `${visibleCount}/${nodes.length} visible` : `${nodes.length} taxa`} · {litFamilies}/{families} families · {scale.toFixed(2)}×</span>
    </div>}
    <div className="micro-tree-controls">
      {compact && onExpand && <Control name="expand" label="Open full screen" onClick={onExpand} />}
      {!compact && <Control name="search" label="Find taxon" onClick={() => setSearching(true)} />}
      <Control name="in" label="Zoom in" onClick={() => zoomAt(1.35)} />
      <Control name="out" label="Zoom out" onClick={() => zoomAt(0.74)} />
      {!compact && (style === "lifemap"
        ? <Control name="radial" label="Switch to Radial" onClick={() => setStyle("radial")} />
        : <Control name="lifemap" label="Switch to LifeMap" onClick={() => setStyle("lifemap")} />)}
      <Control name="fit" label="Show whole tree" onClick={fit} />
      {!compact && onRefresh && <Control name="refresh" label="Refresh discoveries" onClick={onRefresh} />}
    </div>
    {!compact && selected && <div className="micro-tree-selected" style={{ borderColor: alpha(selectedColor, 0.55) }}>
      <span className="micro-tree-badge" style={{ color: selectedColor, borderColor: selectedColor, background: alpha(selectedColor, 0.18) }}><TreeIcon name={isFamily(selected) ? "sparkle" : "hub"} /></span>
      <div><strong>{selected.name}</strong><small>{selected.rank.toUpperCase()} · {selected.litFamilyCount}/{selected.familyCount} families lit</small></div>
      <Control name="focus" label="Focus" onClick={() => focus(selected, 0.8)} />
      <Control name="info" label="Details" onClick={() => onOpen(selected)} />
      <Control name="close" label="Close" onClick={() => setSelectedId(null)} />
    </div>}
    {!compact && !selected && <div className="micro-tree-hint">Scroll or pinch to reveal families · click any node</div>}
    {searching && <TaxonSearch nodes={nodes} onClose={() => setSearching(false)} onPick={(n) => { setSearching(false); focus(n, 0.72); }} />}
  </div>;
}

function TaxonSearch({ nodes, onPick, onClose }: { nodes: LifeTreeNode[]; onPick: (n: LifeTreeNode) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const term = query.trim().toLowerCase();
  const matches = term.length < 2 ? [] : nodes.filter((n) => n.name.toLowerCase().includes(term)).slice(0, 40);
  return <Modal title="Find taxon" onClose={onClose} className="micro-tree-search">
    <input autoFocus placeholder="Search phylum, order or family" value={query} onChange={(e) => setQuery(e.target.value)} />
    {term.length < 2 ? <p className="micro-muted">Type at least two letters</p>
      : <ul>{matches.map((n) => <li key={n.id}><button type="button" onClick={() => onPick(n)}><span><strong>{n.name}</strong><small>{n.rank}</small></span><TreeIcon name="focus" /></button></li>)}</ul>}
  </Modal>;
}

/** The iOS _TaxonDetail sheet: what a node means for this collection. */
export function TaxonDetail({ node, onClose }: { node: LifeTreeNode; onClose: () => void }) {
  const color = accent(node.accentColor);
  const label = isFamily(node)
    ? node.familyState === "confirmed" ? "Confirmed discovery" : node.familyState === "lit" ? "Family lit" : "Not collected yet"
    : `${node.litFamilyCount} of ${node.familyCount} families lit`;
  return <Modal title={node.name} onClose={onClose} className="micro-taxon-detail">
    <p className="micro-taxon-state" style={{ color }}><TreeIcon name={isFamily(node) ? "sparkle" : "hub"} />{label}</p>
    <p className="micro-muted">{isFamily(node)
      ? node.familyState
        ? "This family is part of your field collection. Your discoveries remain yours even when their map locations stay private."
        : "Allocate an identified microscope photo to this family to light this leaf."
      : "This branch and every descendant remain visible on the same map. Zoom in to reveal its orders and families."}</p>
  </Modal>;
}
