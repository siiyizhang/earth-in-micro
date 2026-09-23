import type { Find } from "./client";
import taxonomy from "./place-taxonomy.json";

// Port of the iOS LocalTaxonomy: the same bundled NCBI family snapshot, the
// same "lit" rule and the same root colours, so a family sits in the same
// place and lights the same way on the web as on the phone.

export type LifeTreeNode = {
  id: string;
  parentId: string | null;
  name: string;
  rank: string;
  displayGroup?: string;
  accentColor?: string;
  familyCount: number;
  litFamilyCount: number;
  familyState?: "confirmed" | "lit";
};

type Record = { id: string; parent: string | null; rank: string; name: string };

const rootStyles: { [id: string]: [string, string] } = {
  "554915": ["Protists", "#F5B942"],
  "2698737": ["Protists", "#09BFA1"],
  "2697496": ["Microscopic animals", "#C68CFF"],
  "6157": ["Microscopic animals", "#C68CFF"],
  "6217": ["Microscopic animals", "#C68CFF"],
  "6340": ["Microscopic animals", "#C68CFF"],
  "10232": ["Microscopic animals", "#C68CFF"],
  "33313": ["Microscopic animals", "#C68CFF"],
  "6658": ["Arthropod plankton", "#FF8F70"],
  "6830": ["Arthropod plankton", "#FF8F70"],
  "7148": ["Arthropod plankton", "#FF8F70"],
};

const records = new Map<string, Record>((taxonomy as Record[]).map((n) => [n.id, n]));
const children = new Map<string | null, Record[]>();
for (const n of records.values()) {
  const key = n.parent && records.has(n.parent) ? n.parent : null;
  children.set(key, [...(children.get(key) ?? []), n]);
}
for (const list of children.values()) list.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

/** Whether the Life Tree snapshot (and so the drawn tree) has this NCBI id. */
export const inLifeTree = (id: string) => records.has(id);

export function familyByName(name: string): string | undefined {
  const target = name.trim().toLowerCase();
  if (!target) return undefined;
  for (const n of records.values()) if (n.rank === "family" && n.name.toLowerCase() === target) return n.id;
}

function pathTo(id: string) {
  const path: string[] = [];
  for (let n = records.get(id); n; n = n.parent ? records.get(n.parent) : undefined) path.unshift(n.id);
  return path;
}

function rootOf(n: Record) {
  let current = n;
  while (current.parent && records.has(current.parent)) current = records.get(current.parent)!;
  return current;
}

/** The whole taxonomy as one connected graph, lit by these NCBI family ids. */
export function lifeTreeGraph(litIds: Iterable<string>): LifeTreeNode[] {
  const lit = new Set([...litIds].filter((id) => records.has(id)));
  const litPath = new Set([...lit].flatMap(pathTo));
  const summaries = new Map<string, { families: number; lit: number }>();
  function summarize(id: string): { families: number; lit: number } {
    const cached = summaries.get(id);
    if (cached) return cached;
    let value;
    if (records.get(id)!.rank === "family") value = { families: 1, lit: lit.has(id) ? 1 : 0 };
    else {
      value = { families: 0, lit: 0 };
      for (const child of children.get(id) ?? []) {
        const s = summarize(child.id);
        value.families += s.families;
        value.lit += s.lit;
      }
    }
    summaries.set(id, value);
    return value;
  }
  const result: LifeTreeNode[] = [];
  function visit(n: Record) {
    const summary = summarize(n.id);
    const style = rootStyles[rootOf(n).id];
    const direct = n.rank === "family" && lit.has(n.id);
    result.push({
      id: n.id,
      parentId: n.parent && records.has(n.parent) ? n.parent : null,
      name: n.name === "Sar" ? "SAR supergroup" : n.name,
      rank: n.rank,
      displayGroup: style?.[0],
      accentColor: style?.[1],
      familyCount: summary.families,
      litFamilyCount: summary.lit,
      familyState: direct ? "confirmed" : litPath.has(n.id) ? "lit" : undefined,
    });
    for (const child of children.get(n.id) ?? []) visit(child);
  }
  for (const root of children.get(null) ?? []) visit(root);
  return result;
}

export const isFamily = (n: LifeTreeNode) => n.rank === "family";
export const isLit = (n: LifeTreeNode) => !!n.familyState || n.litFamilyCount > 0;

/** NCBI family ids lit by these finds — the iOS place log's rule. */
export function litFamilies(finds: Find[]) {
  const ids = new Set<string>();
  for (const f of finds) {
    const id = f.family_source_id ?? (f.family_name ? familyByName(f.family_name) : undefined);
    if (id) ids.add(id);
  }
  return ids;
}
