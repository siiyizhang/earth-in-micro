import { useEffect, useMemo, useRef, useState } from "react";
import { checked, client } from "./client";
import type { Taxon } from "./client";
import type { Prediction } from "./identify";

// Run a batch one image at a time to keep mobile WASM memory bounded.
const results = new WeakMap<File, Promise<Awaited<ReturnType<typeof import("./identify")["identify"]>>>>();
let queue: Promise<unknown> = Promise.resolve();
function identifyPhoto(file: File) {
  let result = results.get(file);
  if (!result) {
    result = queue.then(async () => (await import("./identify")).identify(file));
    results.set(file, result);
    queue = result.catch(() => { results.delete(file); });
  }
  return result;
}

import { buildChains, modelTaxon, ranks } from "./taxonChains";
import { useWiki } from "./wiki";
import type { ModelTaxon } from "./taxonChains";

export default function Identification({ file, onSelect, automatic = false }: {
  file: File | undefined;
  automatic?: boolean;
  /** `lineageId` is the NCBI id of the confirmed rank, for filling the rank fields. */
  onSelect: (taxon: Taxon | null, name: string, lineageId?: string) => void;
}) {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [probabilities, setProbabilities] = useState<Prediction[]>([]);
  const [warning, setWarning] = useState("");
  const [constraints, setConstraints] = useState<Record<string, ModelTaxon>>({});
  const [chainIndex, setChainIndex] = useState(0);
  const [committedRank, setCommittedRank] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [attempt, setAttempt] = useState(0);
  const generation = useRef(0);
  const chains = useMemo(() => buildChains(predictions, probabilities, constraints), [predictions, probabilities, constraints]);
  const chain = chains[chainIndex] ?? chains[0];
  const committed = chain?.links.find(l => l.rank === committedRank) ?? chain?.links.at(-1);
  useEffect(() => {
    const id = ++generation.current;
    if (!file || !file.type.startsWith("image/") || (!automatic && !attempt)) return;
    let active = true;
    void Promise.resolve().then(async () => {
      if (!active) return;
      setBusy(true); setError(""); setPredictions([]); setProbabilities([]); setWarning(""); setConstraints({}); setChainIndex(0); setCommittedRank(""); setConfirmation("");
      try {
        const result = await identifyPhoto(file);
        if (!active || generation.current !== id) return;
        setPredictions(result.predictions); setProbabilities(result.probabilities);
        setWarning(result.likelyOrganism ? "Choose a lineage and the rank you want to identify. Confirm it below, or enter your own name." : "This image may not contain an organism. Suggestions are uncertain; you can enter a name yourself.");
      } catch (err) {
        if (active) setError(`${(err as Error).message} You can still enter a name and upload.`);
      } finally { if (active) setBusy(false); }
    });
    return () => { active = false; };
  }, [file, automatic, attempt]);
  async function confirm() {
    if (!committed || !chain) return;
    const id = generation.current;
    setBusy(true); setError("");
    try {
      // Resolve by NCBI identity, just as iOS does; never assign a namesake.
      const candidates = chain.links.filter(l => l.id === committed.id || (l.rank === "family" && ranks.indexOf(committed.rank) > ranks.indexOf("family")));
      const rows = checked(await client().from("taxa").select("id, scientific_name, rank, source_taxon_id").eq("source", "ncbi-taxonomy").eq("active", true).in("source_taxon_id", candidates.map(l => l.id)));
      const exact = rows.find(t => t.source_taxon_id === committed.id);
      const fallback = rows.find(t => t.rank === "family");
      if (id !== generation.current) return;
      onSelect(exact ?? fallback ?? null, committed.name, committed.id);
      setConfirmation(exact ? `${committed.name} · ${committed.rank} confirmed` : fallback ? `${committed.name} confirmed. The shared taxonomy currently records its family, ${fallback.scientific_name}; the selected name is kept as the discovery name.` : `${committed.name} confirmed as a name. This taxon is not yet in the shared taxonomy.`);
    } catch (err) { if (id === generation.current) setError((err as Error).message); }
    finally { if (id === generation.current) setBusy(false); }
  }
  return <div className="micro-identify">
    <div className="micro-row micro-between"><strong>Identify</strong><button type="button" disabled={busy || !file?.type.startsWith("image/")} onClick={() => { if (file) results.delete(file); setAttempt(n => n+1); }}>{busy ? "Identifying…" : automatic ? "↻ Identify again" : "✧ Identify photo"}</button></div>
    {warning && <p>{warning}</p>}
    {!!predictions.length && <div className="micro-lineage">
      {ranks.map(rank => {
        const link = chain?.links.find(l => l.rank === rank);
        const alternatives = predictions.filter(p => p.rank === rank).flatMap(p => { const taxon = modelTaxon(p); return taxon && taxon.rank === rank ? [{ taxon, probability: p.probability }] : []; });
        const options = [...new Map(alternatives.map(a => [a.taxon.id, a])).values()];
        if (link && !options.some(o => o.taxon.id === link.id)) options.unshift({taxon: link, probability: link.probability ?? 0});
        const others = options.filter(o => o.taxon.id !== link?.id);
        const pick = (taxon: ModelTaxon) => {
          setConstraints(old => ({...Object.fromEntries(Object.entries(old).filter(([r]) => ranks.indexOf(r) < ranks.indexOf(rank))), [rank]: taxon}));
          setChainIndex(0); setCommittedRank(rank); setConfirmation("");
        };
        return <div className="micro-lineage-rank" key={rank}>
          <button type="button" className="micro-rank-choice" disabled={!link || busy} aria-pressed={committed?.rank === rank} onClick={() => { setCommittedRank(rank); setConfirmation(""); }}><span>{rank.toUpperCase()}</span><span>{committed?.rank === rank ? "●" : "○"}</span></button>
          <div className="micro-rank-candidates">
            {link ? <TaxonCard name={link.name} probability={link.probability} /> : <span className="micro-muted">No suggestion at this rank</span>}
            {!!others.length && <div className="micro-rank-alternatives" role="group" aria-label={`Other ${rank} candidates`}>
              {others.map(o => <TaxonChip key={o.taxon.id} name={o.taxon.name} probability={o.probability} disabled={busy} onPick={() => pick(o.taxon)} />)}
            </div>}
          </div>
        </div>;
      })}
      {chains.length > 1 && <details className="micro-other-lineages"><summary>Other suggested lineages</summary>{chains.map((c,i) => <button key={c.links.map(l => l.id).join(">")} type="button" aria-pressed={chainIndex === i} disabled={busy} onClick={() => { setChainIndex(i); setCommittedRank(""); setConfirmation(""); }}>{c.links.map(l => l.name).join(" › ")}</button>)}</details>}
      {!!Object.keys(constraints).length && <button type="button" disabled={busy} onClick={() => { setConstraints({}); setChainIndex(0); setCommittedRank(""); setConfirmation(""); }}>Reset corrections</button>}
      {committed && <button className="micro-primary" type="button" disabled={busy} onClick={() => void confirm()}>Use {committed.name} · {committed.rank}</button>}
      <small>Scores are confidence at each rank. Species can be entered manually below.</small>
    </div>}
    {confirmation && <p role="status" className="micro-success">{confirmation}</p>}
    {error && <p className="micro-error" role="alert">{error}</p>}
  </div>;
}

const percent = (p: number | null | undefined) => (p == null ? null : `${Math.round(p * 100)}%`);

function Thumb({ src, name, size }: { src?: string; name: string; size: "large" | "small" }) {
  return src
    ? <img className={`micro-taxon-thumb is-${size}`} src={src} alt="" loading="lazy" referrerPolicy="no-referrer" />
    : <span className={`micro-taxon-thumb is-${size} is-empty`} aria-hidden="true">{name.slice(0, 1)}</span>;
}

/** The candidate chosen at a rank: its picture, and its name linking to Wikipedia. */
function TaxonCard({ name, probability }: { name: string; probability: number | null }) {
  const wiki = useWiki(name);
  return <div className="micro-taxon-card">
    <Thumb src={wiki?.thumbnail} name={name} size="large" />
    <a href={wiki?.url ?? `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(name)}`} target="_blank" rel="noopener noreferrer" title={`Open ${name} on Wikipedia`}>
      <i>{name}</i> <span aria-hidden="true">↗</span><span className="micro-visually-hidden"> (Wikipedia, opens in a new tab)</span>
    </a>
    <span className="micro-rank-confidence">{percent(probability) ?? "—"}</span>
  </div>;
}

/** Another candidate at the same rank: click to switch to it, ↗ to read about it. */
function TaxonChip({ name, probability, disabled, onPick }: { name: string; probability: number; disabled: boolean; onPick: () => void }) {
  const wiki = useWiki(name);
  return <span className="micro-taxon-chip">
    <button type="button" disabled={disabled} onClick={onPick} title={`Use ${name}`}>
      <Thumb src={wiki?.thumbnail} name={name} size="small" />
      <i>{name}</i>
      {percent(probability) && <small>{percent(probability)}</small>}
    </button>
    <a href={wiki?.url ?? `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(name)}`} target="_blank" rel="noopener noreferrer" aria-label={`${name} on Wikipedia (opens in a new tab)`}>↗</a>
  </span>;
}
