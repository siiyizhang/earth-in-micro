import { useEffect, useMemo, useState } from "react";
import { checked, client } from "./client";
import { lifeTreeGraph } from "./lifeTree";
import type { LifeTreeNode } from "./lifeTree";
import WholeLifeTree, { TaxonDetail } from "./WholeLifeTree";

/** NCBI family ids from this account's own discoveries: each observation's
 * community or chosen identification, plus the server's family progress
 * (which also counts confident automatic identifications). */
async function accountFamilies(userId: string) {
  const taxonIds = new Set<string>();
  for (let start = 0; ; start += 1000) {
    const rows = checked(await client().from("observations")
      .select("community_taxon_id, initial_taxon_id")
      .eq("author_id", userId)
      .range(start, start + 999)) as { community_taxon_id: string | null; initial_taxon_id: string | null }[];
    for (const r of rows) { const id = r.community_taxon_id ?? r.initial_taxon_id; if (id) taxonIds.add(id); }
    if (rows.length < 1000) break;
  }
  const progress = await client().from("user_family_progress")
    .select("family_taxon_id, state").eq("user_id", userId).in("state", ["lit", "confirmed"]);
  // Older deployments may not expose the progress table; observations alone still light the tree.
  for (const r of (progress.data ?? []) as { family_taxon_id: string }[]) taxonIds.add(r.family_taxon_id);
  const ids = [...taxonIds], families: string[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const taxa = checked(await client().from("taxa").select("source_taxon_id").in("id", ids.slice(i, i + 200))) as { source_taxon_id: string | null }[];
    families.push(...taxa.map((t) => t.source_taxon_id).filter((id): id is string => !!id));
  }
  return families;
}

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
