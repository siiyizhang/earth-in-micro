import taxonomy from "./model-taxonomy.json";
import type { Prediction } from "./identify";

export const ranks = ["phylum", "class", "order", "family", "genus"];
export type ModelTaxon = typeof taxonomy[number];
export type ChainLink = ModelTaxon & { probability: number | null };
export type TaxonChain = { links: ChainLink[]; score: number };
const byId = new Map(taxonomy.map(n => [n.id, n]));
export function modelTaxon(p: Prediction): ModelTaxon | undefined {
  return taxonomy.find(n => n.rank === p.rank && n.name.toLowerCase() === p.name.toLowerCase())
    ?? taxonomy.find(n => [p.name.toLowerCase(), p.label.toLowerCase()].includes(n.name.toLowerCase()));
}
export function buildChains(predictions: Prediction[], probabilities: Prediction[], constraints: Record<string, ModelTaxon> = {}): TaxonChain[] {
  const anchors = new Map<string, ModelTaxon>();
  for (const p of predictions.filter(p => ["genus", "family"].includes(p.rank))) {
    const n = modelTaxon(p); if (n) anchors.set(n.id, n);
  }
  Object.values(constraints).forEach(n => anchors.set(n.id, n));
  const scores = new Map(probabilities.map(p => [`${p.rank}|${p.name.toLowerCase()}`, p.probability]));
  const chains = new Map<string, TaxonChain>();
  for (const anchor of anchors.values()) {
    const lineage: ModelTaxon[] = [], seen = new Set<string>();
    let node: ModelTaxon | undefined = anchor;
    while (node && !seen.has(node.id)) { seen.add(node.id); lineage.unshift(node); node = byId.get(node.parent ?? ""); }
    const byRank = new Map(lineage.filter(n => ranks.includes(n.rank)).map(n => [n.rank, n]));
    if (Object.entries(constraints).some(([rank,n]) => byRank.get(rank)?.id !== n.id)) continue;
    const links = ranks.flatMap(rank => { const n = byRank.get(rank); return n ? [{ ...n, probability: scores.get(`${rank}|${n.name.toLowerCase()}`) ?? null }] : []; });
    const scored = links.filter(l => l.probability !== null);
    const score = scored.length ? Math.exp(scored.reduce((s,l) => s + Math.log(Math.max(l.probability!, 1e-6)), 0) / scored.length) : 0;
    if (links.length) chains.set(links.map(l => l.id).join(">"), {links,score});
  }
  return [...chains.values()].sort((a,b) => b.score-a.score).slice(0,8);
}
