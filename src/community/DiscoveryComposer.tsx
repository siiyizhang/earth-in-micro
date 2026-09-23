import { normalizeMediaFile } from "./mediaFiles";
import { placePin } from "./PlacePin";
import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import L from "leaflet";
import { checked, client, preparePhoto, publishObservation, rpc, validateMedia, viewportQueries } from "./client";
import type { Observation, Place, Taxon } from "./client";
import { inLifeTree } from "./lifeTree";
import { showLifeTreeReveal } from "./revealStore";
import RankEntry from "./RankEntry";
import { MediaView, Modal } from "./Shared";
import { deepest, lineageFor, resolveTaxon } from "./taxonomyEntry";
import type { Lineage } from "./taxonomyEntry";
import Identification from "./Identification";
import VideoFramePicker from "./VideoFramePicker";

type Point = { lat: number; lng: number };
function draftName(draft: Draft) {
  return draft.name ?? draft.identifiedName ?? deepest(draft.lineage)?.name ?? draft.taxon?.scientific_name ?? "";
}
type Draft = { id: string; file: File; taxon: Taxon | null; lineage: Lineage; name?: string; identifiedName?: string; note: string; frame?: File; saved?: boolean };

export default function DiscoveryComposer({ session, point, place, onClose, onSaved }: {
  session: Session; point?: Point; place: Place | null; onClose: () => void; onSaved: () => void;
}) {
  const [location, setLocation] = useState<Point>(point ?? (place ? { lat: place.latitude, lng: place.longitude } : { lat: 47.37, lng: 8.54 }));
  const [hasLocation, setHasLocation] = useState(!!point || !!place);
  const [nearby, setNearby] = useState<Place | null>(place);
  const [resolving, setResolving] = useState(!place && !!point);
  const [name, setName] = useState("");
  const [cover, setCover] = useState<File | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [message, setMessage] = useState("");
  const [share, setShare] = useState(true);
  const [obscure, setObscure] = useState(false);
  const [gallery, setGallery] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [retry, setRetry] = useState(0);
  const saving = useRef(false);
  const completed = useRef(new Set<string>());
  const savedPlace = useRef<Place | null>(null);
  const sharedVisit = useRef<string | undefined>(undefined);
  const [started, setStarted] = useState(false);
  const photosInput = useRef<HTMLInputElement>(null), videoInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (place || !hasLocation) return;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const deltaLng = .0015 / Math.max(.01, Math.cos(location.lat * Math.PI / 180));
        const rows = (await Promise.all(viewportQueries(location.lat - .0015, location.lng - deltaLng, location.lat + .0015, location.lng + deltaLng)
          .map((args) => rpc<Place[]>("places_in_view", args)))).flat();
        const closest = rows.map((p) => ({ p, distance: L.latLng(location.lat, location.lng).distanceTo([p.latitude, p.longitude]) }))
          .filter((p) => p.distance <= 100).sort((a, b) => a.distance - b.distance)[0]?.p ?? null;
        if (active) { setNearby(closest); setLookupError(""); }
      } catch { if (active) setLookupError("Could not check nearby places. Retry before publishing."); }
      finally { if (active) setResolving(false); }
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [location, hasLocation, place, retry]);
  function move(next: Point) {
    if (started || place) return;
    setLocation(next); setHasLocation(true); setNearby(null); setResolving(true); setLookupError("");
  }
  function add(files: File[]) {
    if (!files.length) return;
    files = files.map(normalizeMediaFile);
    try {
      validateMedia([...drafts.map((d) => d.file), ...files]);
      setDrafts((items) => [...items, ...files.map((file) => ({ id: crypto.randomUUID(), file, taxon: null, lineage: {}, note: "" }))]);
      setError("");
    } catch (err) { setError((err as Error).message); }
  }
  function update(id: string, changes: Partial<Draft>) { setDrafts((items) => items.map((d) => d.id === id ? { ...d, ...changes } : d)); }

  async function save() {
    if (saving.current) return;
    if (!drafts.length) { setError("Add at least one photo or video."); return; }
    if (!hasLocation) { setError("Tap the map to pin the discovery site."); return; }
    if (resolving || lookupError) { setError("Finish checking nearby places first."); return; }
    if (!nearby && !name.trim()) { setError("Give this place a name."); return; }
    saving.current = true; setBusy(true); setError("");
    let uploadedCover: string | undefined;
    try {
      validateMedia(drafts.map((d) => d.file));
      // Never link private or approximate discoveries to a precise public place.
      if (share && !obscure && !savedPlace.current) {
        if (nearby) savedPlace.current = nearby;
        else {
          if (cover) {
            setProgress("Uploading place cover…");
            const photo = await preparePhoto(cover);
            if (photo.size > 10 * 1024 * 1024) throw new Error("Choose a smaller cover photo (under 10 MB).");
            uploadedCover = `${session.user.id}/${crypto.randomUUID()}_cover.jpg`;
            checked(await client().storage.from("place-media").upload(uploadedCover, photo, { contentType: "image/jpeg" }));
          }
          const rows = await rpc<Place[]>("find_or_create_place", { p_name: name.trim(), p_latitude: location.lat, p_longitude: location.lng,
            ...(uploadedCover ? { p_cover_photo_path: uploadedCover } : {}) });
          if (!rows[0]) throw new Error("Could not save the place.");
          savedPlace.current = rows[0];
          if (uploadedCover && !rows[0].was_created) await client().storage.from("place-media").remove([uploadedCover]);
          uploadedCover = undefined;
        }
        setStarted(true);
      }
      if (savedPlace.current && share && !obscure && !sharedVisit.current) {
        const visit = checked(await client().from("visits").insert({ place_id: savedPlace.current.id, visitor_id: session.user.id,
          visited_at: new Date().toISOString(), message: message.trim() }).select("id").single());
        sharedVisit.current = visit.id;
      }
      for (const [index, draft] of drafts.entries()) {
        if (completed.current.has(draft.id)) continue;
        setStarted(true);
        const taxon = (await resolveTaxon(draft.lineage)) ?? draft.taxon;
        await publishObservation({ userId: session.user.id, title: draftName(draft) || "Unidentified discovery",
          note: draft.note, capturedAt: new Date().toISOString(), visibility: share ? "public" : "private",
          geoprivacy: share ? (obscure ? "obscured" : "open") : "private", latitude: location.lat, longitude: location.lng,
          taxonId: taxon?.id ?? null, place: share && !obscure ? savedPlace.current : null,
          visitId: sharedVisit.current, files: [draft.file], thumbnail: draft.frame,
          onProgress: (text) => setProgress(`${index + 1}/${drafts.length} · ${text}`) });
        completed.current.add(draft.id); update(draft.id, { saved: true });
      }
      // The payoff, as on iOS: the tree lights up for every identified family.
      const lit = new Map<string, string>();
      for (const draft of drafts) {
        const family = draft.lineage.family;
        if (family?.id && inLifeTree(family.id)) lit.set(family.id, family.name);
      }
      onSaved();
      showLifeTreeReveal({ userId: session.user.id, familyIds: [...lit.keys()], familyNames: [...lit.values()],
        placeName: share && !obscure ? savedPlace.current?.name ?? nearby?.name ?? (name.trim() || undefined) : undefined });
    } catch (err) {
      if (uploadedCover) await client().storage.from("place-media").remove([uploadedCover]);
      setError(`${(err as Error).message}${completed.current.size ? ` ${completed.current.size} discoveries saved. Retry continues with the remaining files.` : ""}`);
    } finally { saving.current = false; setBusy(false); }
  }

  return <Modal title="Upload discovery" onClose={onClose} busy={busy}>
    <form onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <fieldset disabled={busy || started}>
        <h3 className="micro-step">1 · Pin the discovery site</h3>
        <p>{place ? place.name : "Tap the map to move the pin. Nearby places are reused."}</p>
        <SiteMap initial={location} pinned={hasLocation} locked={!!place || started || busy} onChange={move} />
        <p className="micro-muted">{location.lat.toFixed(5)}, {location.lng.toFixed(5)}</p>
        {resolving ? <p role="status">Checking nearby places…</p> : nearby ? <p className="micro-site-match">Adding to {nearby.name}</p> : <label>Place name<input maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name this pond, puddle or trail" /></label>}
        {lookupError && <p role="alert">{lookupError} <button type="button" onClick={() => { setResolving(true); setRetry((n) => n + 1); }}>Retry</button></p>}
        {!nearby && !resolving && <label className="micro-cover-picker">Place cover (optional)
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { const file = e.target.files?.[0]; if (file) { try { validateMedia([file]); setCover(file); } catch (err) { setError((err as Error).message); } } }} />
          {cover && <><LocalPreview file={cover} /><button type="button" onClick={() => setCover(null)}>Remove cover</button></>}
        </label>}
      </fieldset>
      <h3 className="micro-step">2 · Add photos or videos</h3>
      <fieldset disabled={busy || started}>
        <div className="micro-row micro-upload-sources">
          <button type="button" onClick={() => photosInput.current?.click()}>Photos & videos</button>
          <button type="button" onClick={() => setGallery(true)}>Eureka Gallery</button>
          <button type="button" onClick={() => videoInput.current?.click()}>Add a video</button>
        </div>
        <input ref={photosInput} aria-label="Photos and videos" hidden type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm,.mp4,.mov,.m4v,.webm" onChange={(e) => { add(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
        <input ref={videoInput} aria-label="Add a video" hidden type="file" multiple accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.m4v,.webm" onChange={(e) => { add(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
        <p className="micro-muted">Photos and videos can be selected together (up to 10 files, 200 MB each). Videos: MP4, MOV or WebM. Pick a frame to identify; the original video is uploaded.</p>
      </fieldset>
      {!drafts.length && <div className="micro-draft-empty">Add a photo or video of what you found.</div>}
      {drafts.map((draft) => <fieldset key={draft.id} disabled={busy || started} className="micro-draft-row">
        <div className="micro-row micro-between"><strong>{draftName(draft) || "Unidentified discovery"}{draft.saved ? " · Saved" : ""}</strong><button type="button" aria-label={`Remove ${draft.file.name}`} onClick={() => setDrafts((items) => items.filter((d) => d.id !== draft.id))}>Remove</button></div>
        {draft.file.type.startsWith("video/") ? <VideoFramePicker file={draft.file} onSelect={(frame) => update(draft.id, { frame })} /> : <LocalPreview file={draft.file} />}
        <Identification automatic key={`${draft.id}-${draft.frame?.lastModified ?? "photo"}`} file={draft.frame ?? draft.file} onSelect={(taxon, selectedName, lineageId) => update(draft.id, { taxon, identifiedName: selectedName, lineage: lineageFor(lineageId, selectedName) })} />
        <RankEntry value={draft.lineage} onChange={(lineage) => update(draft.id, { lineage, taxon: null, identifiedName: undefined })} />
        <label>Discovery name<input maxLength={140} value={draftName(draft)} onChange={(e) => update(draft.id, { name: e.target.value })} placeholder="Enter a species, family or your own name" /></label>
        <p className="micro-muted">Your name is saved as the discovery title; it follows the deepest rank above unless you change it. Ranks matched to the Life Tree (✓) light it.</p>
        <label>Discovery note (optional)<textarea maxLength={5000} value={draft.note} onChange={(e) => update(draft.id, { note: e.target.value })} /></label>
      </fieldset>)}
      <fieldset disabled={busy || started}>
        <h3 className="micro-step">3 · Leave a note for whoever comes next</h3>
        <label>Message for other explorers (optional)<textarea rows={3} maxLength={5000} value={message} onChange={(e) => setMessage(e.target.value)} /></label>
        <h3 className="micro-step">4 · Privacy</h3>
        <label className="micro-checkbox"><input type="checkbox" role="switch" checked={share} onChange={(e) => setShare(e.target.checked)} />Share with the community</label>
        <p className="micro-muted">{share ? "Others can find these discoveries on Explore." : "Only you can see these discoveries in your account."}</p>
        {share && <label className="micro-checkbox"><input type="checkbox" role="switch" checked={obscure} onChange={(e) => setObscure(e.target.checked)} />Obscure the public map pin</label>}
        <p className="micro-muted">{share && !obscure ? "The selected place, its exact location and your visit note will be public." : "These discoveries will not be linked to an exact public place. The public visit note and place cover will not be uploaded."}</p>
      </fieldset>
      {started && !busy && <p>Some upload steps have completed. Retry to finish without duplicating saved discoveries.</p>}
      {error && <p role="alert" className="micro-error">{error}</p>}
      <button className="micro-primary micro-publish" disabled={busy || resolving || !!lookupError || !drafts.length}>{busy ? progress || "Preparing…" : started ? "Retry remaining uploads" : share ? `Publish ${drafts.length || ""} ${drafts.length === 1 ? "discovery" : "discoveries"}` : "Save to my account"}</button>
    </form>
    {gallery && <CloudGallery userId={session.user.id} onClose={() => setGallery(false)} onAdd={(files) => { add(files); setGallery(false); }} />}
  </Modal>;
}

function LocalPreview({ file }: { file: File }) {
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => { const url = URL.createObjectURL(file); if (ref.current) ref.current.src = url; return () => URL.revokeObjectURL(url); }, [file]);
  return <img ref={ref} alt={file.name} className="micro-draft-photo" />;
}
function SiteMap({ initial, pinned, locked, onChange }: { initial: Point; pinned: boolean; locked: boolean; onChange: (point: Point) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const initialRef = useRef({ initial, pinned });
  const callbacks = useRef({ locked, onChange });
  useEffect(() => { callbacks.current = { locked, onChange }; }, [locked, onChange]);
  useEffect(() => {
    if (!ref.current) return;
    const { initial, pinned } = initialRef.current;
    const map = L.map(ref.current, { scrollWheelZoom: false }).setView([initial.lat, initial.lng], pinned ? 16 : 5);
    const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    L.tileLayer(token ? `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/tiles/256/{z}/{x}/{y}{r}?access_token=${token}` : "https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, detectRetina: !token, attribution: "© Mapbox © OpenStreetMap" }).addTo(map);
    const pin = L.marker([initial.lat, initial.lng], { icon: placePin() });
    if (pinned) pin.addTo(map);
    map.on("click", (e: L.LeafletMouseEvent) => { if (callbacks.current.locked) return; const lng = ((((e.latlng.lng + 180) % 360) + 360) % 360) - 180; pin.setLatLng([e.latlng.lat, lng]).addTo(map); callbacks.current.onChange({ lat: e.latlng.lat, lng }); });
    const resize = new ResizeObserver(() => map.invalidateSize()); resize.observe(ref.current);
    return () => { resize.disconnect(); map.remove(); };
  }, []);
  return <div ref={ref} className="micro-site-map" aria-label="Discovery site map. Tap to move the pin." />;
}
function CloudGallery({ userId, onClose, onAdd }: { userId: string; onClose: () => void; onAdd: (files: File[]) => void }) {
  const [items, setItems] = useState<Observation[]>([]), [selected, setSelected] = useState<string[]>([]), [error, setError] = useState(""), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    void (async () => {
      const rows: Observation[] = [];
      for (let offset = 0; ; offset += 100) {
        const page = checked(await client().from("observations").select("*, observation_media(*)").eq("author_id", userId).order("created_at", { ascending: false }).range(offset, offset + 99)) as Observation[];
        rows.push(...page); if (page.length < 100) break;
      }
      if (alive) setItems(rows);
    })().catch((e) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [userId]);
  const photos = items.flatMap((o) => o.observation_media.map((m) => ({ ...m, title: o.title })));
  return <Modal title="Eureka Gallery" onClose={onClose} busy={busy}>
    <p>Select photos or videos already uploaded to your account. Originals stay in your gallery.</p>
    {loading && <p>Loading your gallery…</p>}
    {!loading && !photos.length && <p>No uploaded media yet. Use Photos & videos to select files from this device.</p>}
    <div className="micro-gallery-picker">{photos.map((photo) => <label key={photo.storage_path}><input type="checkbox" disabled={busy} checked={selected.includes(photo.storage_path)} onChange={(e) => setSelected((s) => e.target.checked ? [...s, photo.storage_path] : s.filter((p) => p !== photo.storage_path))} />{photo.title}<MediaView media={photo} /></label>)}</div>
    {error && <p role="alert">{error}</p>}
    <button type="button" className="micro-primary" disabled={busy || !selected.length || selected.length > 10} onClick={async () => {
      setBusy(true); setError("");
      try {
        const files = await Promise.all(selected.map(async (path) => { const blob = checked(await client().storage.from("observation-media").download(path)); return new File([blob], path.split("/").pop() ?? "discovery.jpg", { type: blob.type }); }));
        onAdd(files);
      } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
    }}>{busy ? "Preparing media…" : `Add ${selected.length} files`}</button>
  </Modal>;
}
