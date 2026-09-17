import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { placePin } from "./PlacePin";
import PlaceSearch from "./PlaceSearch";
import "leaflet/dist/leaflet.css";
import { client, loadPlaceLog, rpc, viewportQueries } from "./client";
import { FindViewer } from "./FindViewer";
import type { Find, Place } from "./client";

export default function ExploreMap({
  signedIn,
  revision,
  onPlace,
  onPick,
  onUpload,
}: {
  signedIn: boolean;
  revision: number;
  onPlace: (place: Place) => void;
  onPick: (lat: number, lng: number) => void;
  onUpload: () => void;
}) {
  const [picking, setPicking] = useState(false);
  const pickingRef = useRef(false);
  function changePicking(value: boolean) { pickingRef.current = value; setPicking(value); }
  useEffect(() => {
    const cancel = (e: KeyboardEvent) => { if (e.key === "Escape") { pickingRef.current = false; setPicking(false); } };
    window.addEventListener("keydown", cancel);
    return () => window.removeEventListener("keydown", cancel);
  }, []);
  const container = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const view = useRef({ center: [47.37, 8.54] as [number, number], zoom: 5 });
  const callbacks = useRef({ onPlace, onPick });
  useEffect(() => {
    callbacks.current = { onPlace, onPick };
  }, [onPlace, onPick]);
  const [locating, setLocating] = useState(false);
  const searchPin = useRef<L.CircleMarker | null>(null);
  const locationPin = useRef<L.CircleMarker | null>(null);
  const [viewer, setViewer] = useState<{ finds: Find[]; index: number } | null>(null);
  const [error, setError] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!container.current) return;
    const map = L.map(container.current, {
      zoomControl: false,
      worldCopyJump: true,
    }).setView(view.current.center, view.current.zoom);
    mapRef.current = map;

    // Match MapboxStyles.OUTDOORS in the iOS ExploreMapPage.
    // Leaflet expands {r} to @2x on high-density screens without changing
    // the geographic zoom or label size. Keep the logical tile size at 256.
    const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    L.tileLayer(
      token
        ? `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/tiles/256/{z}/{x}/{y}{r}?access_token=${token}`
        : "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        tileSize: 256,
        detectRetina: !token,
        attribution: token
          ? "© Mapbox © OpenStreetMap"
          : "© OpenStreetMap contributors",
      },
    )
      .addTo(map)
      .on("tileerror", () =>
        setError(
          "Map tiles could not load. Check your connection and retry.",
        ),
      );
    const markers = L.layerGroup().addTo(map);
    let disposed = false,
      request = 0;
    let initialFit = view.current.zoom === 5;
    async function refresh() {
      const sequence = ++request;
      setLoading(true);
      try {
        const bounds = map.getBounds();
        const rows = (
          await Promise.all(
            viewportQueries(
              bounds.getSouth(),
              bounds.getWest(),
              bounds.getNorth(),
              bounds.getEast(),
            ).map((args) => rpc<Place[]>("places_in_view", args)),
          )
        ).flat();
        if (disposed || sequence !== request) return;
        const unique = [...new Map(rows.map((p) => [p.id, p])).values()];
        markers.clearLayers();
        setPlaces(unique);
        if (initialFit && unique.length) {
          initialFit = false;
          map.fitBounds(L.latLngBounds(unique.map(p => [p.latitude, p.longitude] as [number, number])), { paddingTopLeft: [55, 145], paddingBottomRight: [55, 220], maxZoom: 15 });
        }
        setError("");
        for (const place of unique) {
          L.marker([place.latitude, place.longitude], {
            icon: placePin(place.name),
            title: place.name,
          }).addTo(markers).on("click", (event) => {
            L.DomEvent.stopPropagation(event);
            if (pickingRef.current) {
              pickingRef.current = false; setPicking(false);
              callbacks.current.onPick(place.latitude, place.longitude);
            } else callbacks.current.onPlace(place);
          });
        }
      } catch (err) {
        if (!disposed && sequence === request)
          setError(
            err instanceof Error ? err.message : "Unable to load places.",
          );
      } finally {
        if (!disposed && sequence === request) setLoading(false);
      }
    }
    map.on("moveend", refresh);
    map.on("click", (event: L.LeafletMouseEvent) => {
      if (!pickingRef.current) return;
      pickingRef.current = false;
      setPicking(false);
      callbacks.current.onPick(event.latlng.lat, ((((event.latlng.lng + 180) % 360) + 360) % 360) - 180);
    });
    // Leaflet emits contextmenu for a touch hold as well as a desktop right-click.
    map.on("contextmenu", (event: L.LeafletMouseEvent) => {
      L.DomEvent.preventDefault(event.originalEvent);
      pickingRef.current = false; setPicking(false);
      callbacks.current.onPick(event.latlng.lat, event.latlng.wrap().lng);
    });
    void refresh();
    const resize = new ResizeObserver(() => map.invalidateSize());
    resize.observe(container.current);
    return () => {
      disposed = true;
      view.current = {
        center: [map.getCenter().lat, map.getCenter().lng],
        zoom: map.getZoom(),
      };
      resize.disconnect();
      map.remove();
      mapRef.current = null;
      searchPin.current = null; locationPin.current = null;
    };
  }, [signedIn, revision, retry]);
  function locate() {
    if (!navigator.geolocation) {
      setError("Location is unavailable. Select a spot on the map.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const map = mapRef.current;
        if (!map) return;
        const point: L.LatLngExpression = [position.coords.latitude, position.coords.longitude];
        locationPin.current?.remove();
        locationPin.current = L.circleMarker(point, { radius: 7, color: "white", weight: 3, fillColor: "#09bfa1", fillOpacity: 1 }).addTo(map);
        map.flyTo(point, 15.5, { duration: .9 });
      },
      () => { setLocating(false); setError("Location access was unavailable. Select a spot on the map instead."); },
      { timeout: 12000 },
    );
  }
  return (
    <div className={`micro-map-layout ${picking ? "is-picking" : ""}`}>
      <div
        ref={container}
        className="micro-map"
        aria-label={picking ? "Select a place on the map" : "Exploration map"}
      />
      {!picking && <div className="micro-explore-tools">
        <PlaceSearch
          proximity={() => { const p = mapRef.current?.getCenter(); return p ? `${p.lng},${p.lat}` : undefined; }}
          onClear={() => { searchPin.current?.remove(); searchPin.current = null; }}
          onSelect={(lat, lng) => {
            const map = mapRef.current;
            if (!map) return;
            searchPin.current?.remove();
            searchPin.current = L.circleMarker([lat, lng], { radius: 7, color: "white", weight: 2, fillColor: "#09bfa1", fillOpacity: 1 }).addTo(map);
            map.flyTo([lat, lng], 14, { duration: .9 });
          }} />
        <div className="micro-floating-actions">
          <div><button className="micro-round" onClick={onUpload} aria-label="Upload a discovery" title="Upload a discovery"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h4l2-2h4l2 2h4v14H4z"/><circle cx="12" cy="12" r="4"/></svg></button>
          <button onClick={() => changePicking(true)}>＋ Create place</button></div>
          <button className="micro-round" onClick={locate} disabled={locating} aria-busy={locating} aria-label={locating ? "Finding your location" : "My location"} title="My location">
            {locating ? <svg className="micro-location-spinner" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /></svg> : <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" /><path d="M12 1v3m0 16v3M1 12h3m16 0h3" /></svg>}
          </button>
        </div>
        {loading && <span className="micro-map-status" role="status">Loading places…</span>}
        {error && <div role="alert" className="micro-map-status">{error}<button onClick={() => setRetry((n) => n + 1)}>Retry</button></div>}
      </div>}
      {picking && <div className="micro-pick-banner" role="status">Tap a point on the map to pin your discovery site.<button onClick={() => changePicking(false)}>Cancel</button></div>}
      <section className="micro-place-deck" aria-label="Places in this view">
        <div className="micro-deck-heading">

          <div className="micro-deck-controls">
            <button aria-label="Previous places" onClick={() => cardsRef.current?.scrollBy({ left: -340, behavior: "smooth" })}>←</button>
            <button aria-label="Next places" onClick={() => cardsRef.current?.scrollBy({ left: 340, behavior: "smooth" })}>→</button>
          </div>
        </div>
        <div className="micro-place-cards" ref={cardsRef} tabIndex={0} aria-label="Scrollable place cards">
          {places.map((p) => (
            <article className="micro-place-card" key={p.id}>
            <button className="micro-card-open" aria-label={`Open ${p.name}`} onClick={() => {
              mapRef.current?.setView([p.latitude, p.longitude], 14);
              onPlace(p);
            }} />
              {p.cover_photo_path && <img src={client().storage.from("place-media").getPublicUrl(p.cover_photo_path).data.publicUrl} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} />}
              <span className="micro-place-card-copy">
                <PlacePreview key={`${p.id}-${revision}-${p.find_count}`} place={p} revision={revision} onOpen={(finds, index) => setViewer({ finds, index })} />
                <strong>{p.name}</strong>
                <span>{p.visit_count ?? 0} visits · {p.find_count ?? 0} finds</span>
              </span>
            </article>
          ))}

        </div>
      </section>
      {viewer && <FindViewer finds={viewer.finds} initialIndex={viewer.index} onClose={() => setViewer(null)} />}
    </div>
  );
}

function PlacePreview({ place, revision, onOpen }: { place: Place; revision: number; onOpen: (finds: Find[], index: number) => void }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [photos, setPhotos] = useState<{ url: string; find: Find }[]>([]);
  const [error, setError] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible || !place.find_count) return;
    let alive = true;
    void (async () => {
      const visits = await loadPlaceLog(place.id);
      const finds = visits.flatMap((v) => v.finds)
        .filter((f) => !!f.storage_path).slice(0, 4);
      if (!finds.length) return;
      const { data, error } = await client().storage.from("observation-media")
        .createSignedUrls(finds.map((f) => f.thumbnail_path || f.storage_path!), 3600);
      if (error) throw error;
      if (alive) setPhotos((data ?? []).flatMap((photo, i) => photo.signedUrl ? [{ url: photo.signedUrl, find: finds[i] }] : []));
    })().catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [visible, place.id, place.find_count, revision]);
  return <span ref={ref} className="micro-place-thumbnails">
    {photos.map((photo, i) => <button key={photo.url} aria-label={`View ${photo.find.title}`} onClick={() => onOpen(photos.map(p => p.find), i)}>{(photo.find.kind !== "video" || photo.find.thumbnail_path) && <img src={photo.url} alt={photo.find.title} loading="lazy" />}{photo.find.kind === "video" && <span>▶</span>}</button>)}
    {error && <span>Photo previews unavailable</span>}
  </span>;
}
