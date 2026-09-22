import { useMemo, useState } from "react";
import type { Find } from "./client";
import { lifeTreeGraph, litFamilies } from "./lifeTree";
import type { LifeTreeNode } from "./lifeTree";
import { Modal } from "./Shared";
import WholeLifeTree from "./WholeLifeTree";

/** What this place has contributed to the tree of life, as on iOS: the
 * compact radial tree, only the lit families selectable, and a lit family
 * opens every find of it made here. */
export default function PlaceTree({ placeName, finds, onFamily }: { placeName: string; finds: Find[]; onFamily: (family: LifeTreeNode, finds: Find[]) => void }) {
  const [expanded, setExpanded] = useState(false);
  const lit = useMemo(() => litFamilies(finds), [finds]);
  const key = [...lit].sort().join("|");
  // Keep the graph stable across rebuilds so the tree does not refit itself.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const nodes = useMemo(() => lifeTreeGraph(lit), [key]);
  if (!lit.size) return null;
  const litHere = lit.size;
  const open = (node: LifeTreeNode) => {
    onFamily(node, finds.filter((f) => f.family_source_id === node.id || f.family_name?.toLowerCase() === node.name.toLowerCase()));
  };
  return <section className="micro-place-tree">
    <h3>LIT HERE · {litHere} {litHere === 1 ? "FAMILY" : "FAMILIES"}</h3>
    <div className="micro-place-tree-card">
      <WholeLifeTree nodes={nodes} initialStyle="radial" compact onOpen={open} onExpand={() => setExpanded(true)} />
    </div>
    {expanded && <Modal title={placeName} onClose={() => setExpanded(false)} className="micro-tree-expanded">
      <div className="micro-tree-fullscreen"><WholeLifeTree nodes={nodes} initialStyle="radial" compact onOpen={open} /></div>
    </Modal>}
  </section>;
}
