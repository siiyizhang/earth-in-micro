import { useEffect, useMemo, useState } from "react";
import { lifeTreeGraph } from "./lifeTree";
import { accountFamilies } from "./lifeTreeData";
import type { LifeTreeNode } from "./lifeTree";
import WholeLifeTree, { TaxonDetail } from "./WholeLifeTree";

/** The Gallery's Life Tree view — the iOS LifeTreePage: the whole bundled
 * taxonomy on one canvas, lit by the families this account has collected. */
export default function GalleryLifeTree({ userId, revision }: { userId: string; revision: number }) {
  const [lit, setLit] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [detail, setDetail] = useState<LifeTreeNode | null>(null);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    (userId === "guest" ? Promise.resolve([]) : accountFamilies(userId))
      .then((ids) => { if (alive) setLit(ids); })
      .catch((e) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [userId, revision, refresh]);
  const key = [...new Set(lit)].sort().join("|");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const nodes = useMemo(() => lifeTreeGraph(lit), [key]);
  if (loading) return <div className="micro-gallery-tree micro-tree-message" role="status">Loading your Life Tree…</div>;
  if (error) return <div className="micro-gallery-tree micro-tree-message" role="alert">
    <strong>Life Tree is not ready yet</strong><p>{error}</p><button onClick={() => setRefresh((n) => n + 1)}>Try again</button>
  </div>;
  return <>
    {userId === "guest" && <p className="micro-muted">Sign in to light the families you have collected.</p>}
    <div className="micro-gallery-tree">
      <WholeLifeTree nodes={nodes} onOpen={setDetail} onRefresh={() => setRefresh((n) => n + 1)} />
    </div>
    {detail && <TaxonDetail node={detail} onClose={() => setDetail(null)} />}
  </>;
}
