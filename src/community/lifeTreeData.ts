import { checked, client } from "./client";

/** NCBI family ids from this account's own discoveries: each observation's
 * community or chosen identification, plus the server's family progress
 * (which also counts confident automatic identifications). */
export async function accountFamilies(userId: string) {
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
