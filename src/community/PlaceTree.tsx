import { useMemo, useState } from "react";
import taxonomy from "./place-taxonomy.json";
import type { Find } from "./client";
import { Modal } from "./Shared";

type Node = typeof taxonomy[number] & { x: number; y: number; depth: number; lit: boolean };
export default function PlaceTree({ finds, onFamily }: { finds: Find[]; onFamily: (name: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const families = useMemo(() => new Set(finds.map(f => f.family_name).filter(Boolean)), [finds]);
  const nodes = useMemo(() => {
    const byId = new Map(taxonomy.map(n => [n.id, { ...n, x: 0, y: 0, depth: 0, lit: families.has(n.name) }]));
    const children = new Map<string | null, Node[]>();
    for (const node of byId.values()) { const key = byId.has(node.parent ?? "") ? node.parent : null; children.set(key, [...(children.get(key) ?? []), node]); }
    for (const list of children.values()) list.sort((a,b) => a.name.localeCompare(b.name));
    let leaf = 0;
    const angles = new Map<string, number>();
    function visit(node: Node, depth: number): number {
      node.depth = depth;
      const kids = children.get(node.id) ?? [];
      const angle = kids.length ? kids.map(k => visit(k, depth + 1)).reduce((a,b) => a+b, 0) / kids.length : leaf++;
      node.lit ||= kids.some(k => k.lit);
      angles.set(node.id, angle);
      return angle;
    }
    for (const root of children.get(null) ?? []) visit(root, 0);
    const depth = Math.max(...[...byId.values()].map(n => n.depth), 1);
    for (const n of byId.values()) {
      const angle = (angles.get(n.id) ?? 0) / Math.max(1, leaf) * Math.PI * 2;
      const r = n.depth / depth * 260;
      n.x = 300 + Math.cos(angle) * r; n.y = 300 + Math.sin(angle) * r;
    }
    return [...byId.values()];
  }, [families]);
  return <section className="micro-place-tree"><div className="micro-row micro-between"><h3>LIT HERE · {families.size} FAMILIES</h3><button onClick={() => setExpanded(true)} aria-label="Expand Life Tree">⤢</button></div>
    <TreeGraph nodes={nodes} onFamily={onFamily} />
    <div className="micro-family-links">{[...families].map(name => <button key={name} onClick={() => onFamily(name!)}>{name}</button>)}</div>
    {expanded && <Modal title="Life Tree · lit here" onClose={() => setExpanded(false)} className="micro-tree-expanded"><TreeGraph nodes={nodes} onFamily={onFamily} /><div className="micro-family-links">{[...families].map(name => <button key={name} onClick={() => { setExpanded(false); onFamily(name!); }}>{name}</button>)}</div></Modal>}
  </section>;
}
function TreeGraph({ nodes, onFamily }: {nodes: Node[]; onFamily: (name: string) => void}) {
  const [zoom, setZoom] = useState(1);
  const byId = new Map(nodes.map(n => [n.id, n]));
  return <div className="micro-tree-graph"><div className="micro-tree-scroll"><svg width={`${100 * zoom}%`} height={`${100 * zoom}%`} viewBox="0 0 600 600" role="img" aria-label="Life Tree using the iOS taxonomy; green branches mark families discovered here">
    {nodes.map(n => { const p = byId.get(n.parent ?? ""); return p && <path key={n.id} d={`M${p.x},${p.y}L${n.x},${n.y}`} stroke={n.lit ? "#09bfa1" : "#3a4b43"} strokeWidth={n.lit ? 2 : .7} />; })}
    {nodes.filter(n => n.lit && n.rank === "family").map(n => <g key={n.id} onClick={() => onFamily(n.name)} style={{cursor:"pointer"}}><circle cx={n.x} cy={n.y} r="7" fill="#72f4c7"/><title>{n.name}</title></g>)}
  </svg></div><div className="micro-tree-zoom"><button aria-label="Zoom out tree" disabled={zoom <= 1} onClick={() => setZoom(z => Math.max(1,z-1))}>−</button><button aria-label="Zoom in tree" disabled={zoom >= 5} onClick={() => setZoom(z => Math.min(5,z+1))}>＋</button></div></div>;
}
