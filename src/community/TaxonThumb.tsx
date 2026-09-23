import { useWiki } from "./wiki";

/** A taxon's Wikipedia lead image, or its initial while there is none. */
export default function TaxonThumb({ name, src, size }: { name: string; src?: string; size: "large" | "small" }) {
  const wiki = useWiki(src === undefined ? name : undefined);
  const image = src ?? wiki?.thumbnail;
  return image
    ? <img className={`micro-taxon-thumb is-${size}`} src={image} alt="" loading="lazy" referrerPolicy="no-referrer" />
    : <span className={`micro-taxon-thumb is-${size} is-empty`} aria-hidden="true">{name.slice(0, 1)}</span>;
}
