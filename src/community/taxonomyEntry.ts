import modelTaxonomy from "./model-taxonomy.json";
import treeTaxonomy from "./place-taxonomy.json";
import { client } from "./client";
import type { Taxon } from "./client";

// Names for manual identification. Phylum → family come from the Life Tree's
// own NCBI snapshot (the ranks the shared taxonomy and the tree know);
// genera come from the identification model, whose ids are the same NCBI ids.
// Species are free text.

export const entryRanks = ["phylum", "class", "order", "family", "genus", "species"] as const;
export type EntryRank = typeof entryRanks[number];
export type LineageEntry = { name: string; id?: string };
export type Lineage = Partial<Record<EntryRank, LineageEntry>>;
export type Candidate = { id: string; name: string; rank: EntryRank };

type Row = { id: string; parent: string | null; rank: string; name: string };
const nodes = new Map<string, Row>();
for (const n of modelTaxonomy as Row[]) nodes.set(n.id, n);
// The tree snapshot wins wherever both know a taxon: it is what the Life Tree draws.
for (const n of treeTaxonomy as Row[]) nodes.set(n.id, n);
const treeIds = new Set((treeTaxonomy as Row[]).map((n) => n.id));

const isEntryRank = (rank: string): rank is EntryRank => (entryRanks as readonly string[]).includes(rank);
const candidates: Candidate[] = [
  ...(treeTaxonomy as Row[]).filter((n) => ["phylum", "class", "order", "family"].includes(n.rank)),
  ...(modelTaxonomy as Row[]).filter((n) => n.rank === "genus"),
].map((n) => ({ id: n.id, name: n.name, rank: n.rank as EntryRank }));

const ancestry = new Map<string, string[]>();
function ancestorsOf(id: string) {
  let list = ancestry.get(id);
  if (!list) {
    list = [];
    const seen = new Set<string>();
    for (let n = nodes.get(id); n && !seen.has(n.id); n = n.parent ? nodes.get(n.parent) : undefined) {
      seen.add(n.id);
      list.push(n.id);
    }
    ancestry.set(id, list);
  }
  return list;
}

/** phylum…genus for a known NCBI id, walking its parents. */
export function lineageOf(id: string): Lineage {
  const lineage: Lineage = {};
  for (const ancestor of ancestorsOf(id)) {
    const n = nodes.get(ancestor)!;
    if (isEntryRank(n.rank) && !lineage[n.rank]) lineage[n.rank] = { name: n.name, id: n.id };
  }
  return lineage;
}

export function findByName(name: string, rank?: EntryRank) {
  const target = name.trim().toLowerCase();
  if (!target) return undefined;
  return candidates.find((c) => c.name.toLowerCase() === target && (!rank || c.rank === rank));
}

/** Autocomplete for one rank, limited to descendants of the deepest linked rank above it. */
export function suggestions(rank: EntryRank, query: string, lineage: Lineage, limit = 8): Candidate[] {
  const term = query.trim().toLowerCase();
  const above = entryRanks.slice(0, entryRanks.indexOf(rank)).map((r) => lineage[r]?.id).filter(Boolean).at(-1);
  const pool = candidates.filter((c) => c.rank === rank && (!above || ancestorsOf(c.id).includes(above)));
  if (!term) return pool.slice(0, limit);
  const starts = pool.filter((c) => c.name.toLowerCase().startsWith(term));
  const contains = pool.filter((c) => !c.name.toLowerCase().startsWith(term) && c.name.toLowerCase().includes(term));
  return [...starts, ...contains].slice(0, limit);
}

/** Picking a known taxon fills the ranks above it and drops the ones below that no longer fit. */
export function choose(lineage: Lineage, candidate: Candidate): Lineage {
  const index = entryRanks.indexOf(candidate.rank);
  const next: Lineage = { ...lineageOf(candidate.id) };
  for (const rank of entryRanks.slice(index + 1)) {
    const entry = lineage[rank];
    if (entry?.id && ancestorsOf(entry.id).includes(candidate.id)) next[rank] = entry;
    else if (rank === "species" && entry && candidate.rank === "genus" && entry.name.toLowerCase().startsWith(`${candidate.name.toLowerCase()} `)) next[rank] = entry;
  }
  return next;
}

export function deepest(lineage: Lineage) {
  for (const rank of [...entryRanks].reverse()) if (lineage[rank]?.name.trim()) return { rank, ...lineage[rank]! };
}

export function lineagePath(lineage: Lineage) {
  return entryRanks.flatMap((rank) => (lineage[rank]?.name.trim() ? [{ rank, name: lineage[rank]!.name.trim() }] : []));
}

/** A lineage from a stored NCBI id plus the discovery's own name, which may be
 * a genus or "Genus species" deeper than the shared taxonomy records. */
export function lineageFor(sourceId: string | null | undefined, title?: string | null): Lineage {
  const lineage: Lineage = sourceId ? lineageOf(sourceId) : {};
  const name = title?.trim() ?? "";
  if (!name) return lineage;
  const exact = findByName(name);
  if (exact) {
    const chosen = choose(lineage, exact);
    // Only adopt it when it agrees with the stored identification.
    return !sourceId || ancestorsOf(exact.id).includes(sourceId) || exact.id === sourceId ? chosen : lineage;
  }
  const [first, second, ...rest] = name.split(/\s+/);
  const genus = second && !rest.length && /^[a-z-]+$/.test(second) ? findByName(first, "genus") : undefined;
  if (genus && (!sourceId || ancestorsOf(genus.id).includes(sourceId))) return { ...choose(lineage, genus), species: { name } };
  return lineage;
}

/** The deepest rank of the lineage that the shared taxonomy records. */
export async function resolveTaxon(lineage: Lineage): Promise<Taxon | null> {
  const ids = entryRanks.flatMap((rank) => (lineage[rank]?.id && treeIds.has(lineage[rank]!.id!) ? [lineage[rank]!.id!] : []));
  if (!ids.length) return null;
  const { data, error } = await client().from("taxa").select("id, scientific_name, rank, source_taxon_id")
    .eq("source", "ncbi-taxonomy").eq("active", true).in("source_taxon_id", ids);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as (Taxon & { source_taxon_id: string })[];
  for (const id of [...ids].reverse()) {
    const row = rows.find((r) => r.source_taxon_id === id);
    if (row) return { id: row.id, scientific_name: row.scientific_name, rank: row.rank };
  }
  return null;
}

/** NCBI id of a stored taxa row. */
export async function sourceIdOf(taxonId: string | null | undefined) {
  if (!taxonId) return null;
  const { data } = await client().from("taxa").select("source_taxon_id").eq("id", taxonId).maybeSingle();
  return (data as { source_taxon_id: string | null } | null)?.source_taxon_id ?? null;
}
