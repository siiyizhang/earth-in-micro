import { useEffect, useRef, useState } from "react";

type Result = { name: string; address: string; lat: number; lng: number };
export default function PlaceSearch({ onSelect, onClear, proximity }: {
  onSelect: (lat: number, lng: number) => void;
  onClear?: () => void;
  proximity?: () => string | undefined;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(false);
  const proximityRef = useRef(proximity);
  useEffect(() => { proximityRef.current = proximity; }, [proximity]);
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  useEffect(() => {
    if (!query.trim() || selected || !token) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setBusy(true); setError("");
      try {
        const params = new URLSearchParams({ q: query.trim(), access_token: token, language: navigator.language.split("-")[0], limit: "6" });
        const center = proximityRef.current?.();
        if (center) params.set("proximity", center);
        const response = await fetch(`https://api.mapbox.com/search/searchbox/v1/forward?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Search is unavailable. Please try again.");
        const data = await response.json();
        const rows: Result[] = data.features.filter((f: { geometry: {type: string} }) => f.geometry.type === "Point").map((f: { geometry: {coordinates: number[]}; properties: {name: string; name_preferred?: string; full_address?: string; place_formatted?: string} }) => ({ name: f.properties.name_preferred ?? f.properties.name, address: f.properties.full_address ?? f.properties.place_formatted ?? "", lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] }));
        if (!controller.signal.aborted) { setResults(rows); if (!rows.length) setError("No places found."); }
      } catch (e) { if (!controller.signal.aborted) setError((e as Error).message); }
      finally { if (!controller.signal.aborted) setBusy(false); }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, selected, token]);
  if (!token) return null;
  return <div className="micro-native-search">
    <div className="micro-search-input"><span aria-hidden="true">⌕</span><input aria-label="Search places" placeholder="Search places" value={query} onChange={e => { setQuery(e.target.value); setSelected(false); setResults([]); setBusy(false); setError(""); }} onKeyDown={e => { if (e.key === "Escape") { setResults([]); setSelected(true); } }} />
    {query && <button aria-label="Clear search" onClick={() => { setQuery(""); setResults([]); setError(""); setBusy(false); onClear?.(); }}>✕</button>}</div>
    {(busy || error || results.length > 0) && <div className="micro-search-results">
      {busy && <p role="status">Searching…</p>}{error && <p role="alert">{error}</p>}
      {results.map((r, i) => <button key={i} onClick={() => { setSelected(true); setQuery(r.name); setResults([]); setBusy(false); onSelect(r.lat, r.lng); }}><strong>{r.name}</strong><span>{r.address}</span></button>)}
    </div>}
  </div>;
}
