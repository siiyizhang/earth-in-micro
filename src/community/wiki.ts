import { useEffect, useState } from "react";

// Same source as the iOS TaxonThumbnails: Wikipedia's page summary gives the
// article's lead image (for a family or genus, usually a representative
// photo) and its canonical URL, with no key and CORS enabled.

export type WikiSummary = { url: string; thumbnail?: string };

const cache = new Map<string, Promise<WikiSummary>>();
const articleUrl = (name: string) => `https://en.wikipedia.org/wiki/${encodeURIComponent(name.replace(/ /g, "_"))}`;
const searchUrl = (name: string) => `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(name)}`;

export function wikiSummary(name: string): Promise<WikiSummary> {
  const key = name.trim();
  let result = cache.get(key);
  if (!result) {
    result = fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(key.replace(/ /g, "_"))}`)
      .then(async (response) => {
        if (!response.ok) return { url: searchUrl(key) };
        const data = await response.json();
        // A disambiguation page is not about the taxon: search instead.
        if (data.type === "disambiguation") return { url: searchUrl(key) };
        return { url: data.content_urls?.desktop?.page ?? articleUrl(key), thumbnail: data.thumbnail?.source };
      })
      // No network or no article: the name still links to a search.
      .catch(() => ({ url: searchUrl(key) }));
    cache.set(key, result);
  }
  return result;
}

export function useWiki(name: string | undefined) {
  const [state, setState] = useState<{ name: string; summary: WikiSummary } | null>(null);
  useEffect(() => {
    let alive = true;
    if (name?.trim()) void wikiSummary(name).then((summary) => { if (alive) setState({ name, summary }); });
    return () => { alive = false; };
  }, [name]);
  // Keyed by name, so a previous name's picture never shows for a new one.
  return state && state.name === name ? state.summary : null;
}
