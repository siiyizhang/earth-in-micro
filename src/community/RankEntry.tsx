import { useId, useState } from "react";
import TaxonThumb from "./TaxonThumb";
import { choose, entryRanks, findByName, lineagePath, suggestions } from "./taxonomyEntry";
import type { Candidate, EntryRank, Lineage } from "./taxonomyEntry";

const placeholders: Record<EntryRank, string> = {
  phylum: "e.g. Rotifera",
  class: "e.g. Eurotatoria",
  order: "e.g. Ploima",
  family: "e.g. Brachionidae",
  genus: "e.g. Brachionus",
  species: "e.g. Brachionus calyciflorus",
};

/** Identification typed by hand, at any rank from phylum to species. Each
 * field suggests the names the Life Tree already has at that rank. */
export default function RankEntry({ value, onChange }: { value: Lineage; onChange: (value: Lineage) => void }) {
  return <fieldset className="micro-rank-entry">
    <legend>Identification</legend>
    <p className="micro-muted">Fill in any rank you know. Choosing a suggestion fills the ranks above it.</p>
    {entryRanks.map((rank) => <RankField key={rank} rank={rank} lineage={value} onChange={onChange} />)}
  </fieldset>;
}

function RankField({ rank, lineage, onChange }: { rank: EntryRank; lineage: Lineage; onChange: (value: Lineage) => void }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const entry = lineage[rank];
  const text = entry?.name ?? "";
  const options = rank === "species" ? [] : suggestions(rank, text, lineage);
  const pick = (candidate: Candidate) => { onChange(choose(lineage, candidate)); setOpen(false); };
  const type = (name: string) => {
    const next = { ...lineage };
    if (name) next[rank] = { name };
    else delete next[rank];
    onChange(next);
    setOpen(true);
    setActive(0);
  };
  const show = open && options.length > 0 && !(options.length === 1 && options[0].id === entry?.id);
  return <div className="micro-rank-field">
    <label htmlFor={id}>{rank.toUpperCase()}</label>
    <div className="micro-combobox">
      <input
        id={id}
        role="combobox"
        aria-expanded={show}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        autoComplete="off"
        maxLength={140}
        value={text}
        placeholder={placeholders[rank]}
        onFocus={() => setOpen(true)}
        onChange={(e) => type(e.target.value)}
        onBlur={() => {
          setOpen(false);
          // "Genus species" typed straight into species links its genus.
          if (rank === "species" && text && !lineage.genus) {
            const genus = findByName(text.split(/\s+/)[0], "genus");
            if (genus) { onChange({ ...choose(lineage, genus), species: { name: text } }); return; }
          }
          // A name typed in full that the tree knows is linked as if picked.
          const match = !entry?.id && text ? findByName(text, rank) : undefined;
          if (match && options.some((o) => o.id === match.id)) pick(match);
        }}
        onKeyDown={(e) => {
          if (!show) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(options.length - 1, i + 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
          else if (e.key === "Enter") { e.preventDefault(); pick(options[active] ?? options[0]); }
          else if (e.key === "Escape") setOpen(false);
        }}
      />
      {entry?.id && <span className="micro-rank-linked" title="Matched to the Life Tree">✓</span>}
      {show && <ul id={`${id}-list`} role="listbox" className="micro-suggestions">
        {options.map((option, index) => <li
          key={option.id}
          role="option"
          aria-selected={index === active}
          onMouseDown={(e) => { e.preventDefault(); pick(option); }}
          onMouseEnter={() => setActive(index)}
        >
          <TaxonThumb name={option.name} size="small" />
          <span>
            <strong>{option.name}</strong>
            <small>{lineagePath(choose({}, option)).slice(0, -1).map((l) => l.name).join(" › ")}</small>
          </span>
        </li>)}
      </ul>}
    </div>
  </div>;
}

/** Phylum › … › species, as far as it is known. */
export function LineageView({ lineage }: { lineage: Lineage }) {
  const path = lineagePath(lineage);
  if (!path.length) return null;
  return <dl className="micro-lineage-view">
    {path.map((l) => <div key={l.rank}><dt>{l.rank}</dt><dd><i>{l.name}</i></dd></div>)}
  </dl>;
}
