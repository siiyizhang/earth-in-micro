import { useEffect, useState } from "react";
import { checked, client, currentUser, loadPlaceLog, rpc } from "./client";
import type { Find, Observation, Place, TreeNode, Visit } from "./client";
import { FindViewer } from "./FindViewer";
import GalleryLifeTree from "./GalleryLifeTree";
import PlaceTree from "./PlaceTree";
import Identification from "./Identification";
import ImageCropper from "./ImageCropper";
import { cropPath, fullRect, isFull, originalOf, parseCrop, renderCrop } from "./mediaCrop";
import type { CropRect } from "./mediaCrop";
import RankEntry, { LineageView } from "./RankEntry";
import { MediaView, Modal } from "./Shared";
import { deepest, lineageFor, resolveTaxon, sourceIdOf } from "./taxonomyEntry";
import type { Lineage } from "./taxonomyEntry";

export function PlaceLog({
  place,
  onClose,
  onUpload,
  onChanged,
}: {
  place: Place;
  signedIn: boolean;
  onSignIn: () => void;
  onClose: () => void;
  onUpload: () => void;
  onChanged: () => void;
}) {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState<{ finds: Find[]; index: number } | null>(null);
  const [family, setFamily] = useState<{ name: string; finds: Find[] } | null>(null);
  const [editing, setEditing] = useState<{ observation: Observation; userId: string } | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let alive = true;
    loadPlaceLog(place.id).then(rows => { if (alive) setVisits(rows); })
      .catch(e => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [place.id, reload]);
  const all = visits.flatMap(v => v.finds).filter(f => f.storage_path);
  const mineIds = new Set(visits.filter(v => v.is_mine).flatMap(v => v.finds.map(f => f.observation_id)));
  async function edit(find: Find) {
    try {
      const [row, user] = await Promise.all([
        client().from("observations").select("*, observation_media(*)").eq("id", find.observation_id).single(),
        currentUser(),
      ]);
      setEditing({ observation: checked(row) as Observation, userId: user?.id ?? "" });
    } catch (e) { setError((e as Error).message); }
  }
  const note = visits.find(v => v.message?.trim());
  return <Modal title={place.name} onClose={onClose} className="micro-place-detail">
    <button className="micro-add-here" onClick={onUpload}>＋ Add discovery to this place</button>
    {note && <blockquote className="micro-featured-note"><p>{note.message}</p><small>— {note.is_mine ? "You" : note.visitor_name}</small></blockquote>}
    {place.cover_photo_path && <img className="micro-cover" alt={place.name} src={client().storage.from("place-media").getPublicUrl(place.cover_photo_path).data.publicUrl} />}
    <p className="micro-place-count">{place.visit_count ?? visits.length} visits · {place.find_count ?? all.length} finds</p>
    {loading && <p role="status">Loading discoveries…</p>}
    {error && <p className="micro-error" role="alert">{error}</p>}
    <PlaceTree placeName={place.name} finds={all} onFamily={(node, finds) => setFamily({ name: node.name, finds })} />
    {[true, false].map(mine => {
      const finds = visits.filter(v => !!v.is_mine === mine).flatMap(v => v.finds).filter(f => f.storage_path);
      if (!finds.length) return null;
      return <details className="micro-find-group" key={String(mine)} open><summary>{mine ? "You" : "Other community members"}<span>{finds.length} finds</span></summary>
        <div className="micro-find-grid">{finds.map((find, index) => <FindTile key={find.observation_id} find={find} onClick={() => setViewer({ finds, index })} />)}</div>
      </details>;
    })}
    {!loading && !all.length && <p>No discoveries yet.</p>}
    {family && <Modal title={family.name} onClose={() => setFamily(null)} className="micro-family-finds">
      <p className="micro-muted">{family.finds.length} {family.finds.length === 1 ? "find" : "finds"} here</p>
      <div className="micro-find-grid">{family.finds.map((find, index) => <FindTile key={find.observation_id} find={find} onClick={() => setViewer({ finds: family.finds, index })} />)}</div>
    </Modal>}
    {viewer && <FindViewer finds={viewer.finds} initialIndex={viewer.index} onClose={() => setViewer(null)} canEdit={f => mineIds.has(f.observation_id)} onEdit={f => void edit(f)} />}
    {editing && <DiscoveryDetail observation={editing.observation} userId={editing.userId} onClose={() => { setEditing(null); setViewer(null); setFamily(null); setReload(n => n + 1); onChanged(); }} />}
  </Modal>;
}
function FindTile({ find, onClick }: { find: Find; onClick: () => void }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let alive = true;
    const path = find.thumbnail_path || (find.kind !== "video" ? find.storage_path : undefined);
    if (path) void client().storage.from("observation-media").createSignedUrl(path, 3600).then(({data}) => { if (alive) setUrl(data?.signedUrl ?? ""); });
    return () => { alive = false; };
  }, [find.storage_path, find.thumbnail_path, find.kind]);
  return <button onClick={onClick} className="micro-find-tile">{url ? <img src={url} alt={find.title} loading="lazy" /> : <span>View discovery</span>}{find.kind === "video" && <b>▶</b>}<span>{find.title || find.family_name}</span></button>;
}
export function Interactions({ observationId }: { observationId: string }) {
  const [liked, setLiked] = useState(false),
    [count, setCount] = useState(0),
    [favorite, setFavorite] = useState(false),
    [busy, setBusy] = useState(false),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    (async () => {
      const user = await currentUser();
      if (!user) return;
      const [likes, saved] = await Promise.all([
        rpc<{ liked_by_me: boolean; like_count: number }[]>(
          "observation_like_summary",
          { p_observation_id: observationId },
        ),
        client()
          .from("favorites")
          .select("observation_id")
          .eq("observation_id", observationId)
          .eq("user_id", user.id)
          .then(checked),
      ]);
      if (alive) {
        setLiked(likes[0]?.liked_by_me ?? false);
        setCount(likes[0]?.like_count ?? 0);
        setFavorite(!!saved.length);
        setReady(true);
      }
    })().catch((err) => {
      if (alive) setError(err.message);
    });
    return () => {
      alive = false;
    };
  }, [observationId]);
  async function toggle(
    table: "favorites" | "observation_likes",
    active: boolean,
  ) {
    setBusy(true);
    setError("");
    try {
      const user = await currentUser();
      if (!user) throw new Error("Please sign in again.");
      checked(
        await (active
          ? client()
              .from(table)
              .delete()
              .eq("observation_id", observationId)
              .eq("user_id", user.id)
          : client()
              .from(table)
              .upsert({ observation_id: observationId, user_id: user.id })),
      );
      if (table === "favorites") setFavorite(!active);
      else {
        setLiked(!active);
        setCount((n) => n + (active ? -1 : 1));
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <div className="micro-row">
        <button
          aria-pressed={liked}
          disabled={busy || !ready}
          onClick={() => void toggle("observation_likes", liked)}
        >
          {liked ? "♥" : "♡"} {count}
        </button>
        <button
          aria-pressed={favorite}
          disabled={busy || !ready}
          onClick={() => void toggle("favorites", favorite)}
        >
          {favorite ? "★ Saved" : "☆ Save"}
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
export function Gallery({
  userId,
  revision,
  onUpload,
}: {
  userId: string;
  revision: number;
  onUpload: () => void;
}) {
  const [items, setItems] = useState<Observation[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [filter, setFilter] = useState(userId === "guest" ? "public" : "mine"),
    [localRevision, setLocalRevision] = useState(0),
    [view, setView] = useState<"timeline" | "tree">("timeline"),
    [selected, setSelected] = useState<Observation | null>(null);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setItems([]);
    setError("");
    (async () => {
      let query = client()
        .from("observations")
        .select("*, observation_media(*)")
        .order("captured_at", { ascending: false });
      if (filter === "mine") query = query.eq("author_id", userId);
      else if (filter === "public") {
        query = query.eq("status", "published").eq("visibility", "public");
      } else {
        const favorites = checked(
          await client()
            .from("favorites")
            .select("observation_id")
            .eq("user_id", userId),
        );
        query = query.in(
          "id",
          favorites.map((f) => f.observation_id),
        );
      }
      // Fetch in pages; a large collection must not silently stop at the API's row cap.
      const rows: Observation[] = [];
      for (let start = 0; ; start += 100) {
        const page = checked(
          await query.range(start, start + 99),
        ) as Observation[];
        rows.push(...page);
        if (page.length < 100) break;
      }
      if (alive) setItems(rows);
    })()
      .catch((err) => {
        if (alive) setError(err.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [userId, revision, localRevision, filter]);
  return (
    <section className="micro-content">
      <div className="micro-row micro-between">
        <div>
          <span className="micro-eyebrow">DISCOVERIES FROM THE COMMUNITY</span>
          <h1>Gallery</h1>
        </div>
        <div className="micro-row">
          <div className="micro-segmented" role="group" aria-label="Gallery view">
            <button aria-pressed={view === "timeline"} onClick={() => setView("timeline")}>Timeline</button>
            <button aria-pressed={view === "tree"} onClick={() => setView("tree")}>Life Tree</button>
          </div>
          <button className="micro-primary" onClick={onUpload}>
            ＋ Add discovery
          </button>
        </div>
      </div>
      {view === "tree" ? <GalleryLifeTree userId={userId} revision={revision + localRevision} /> : <>
      <div className="micro-row">
        <button aria-pressed={filter === "public"} onClick={() => setFilter("public")}>Community</button>
        {userId !== "guest" && <>
        <button
          aria-pressed={filter === "mine"}
          onClick={() => setFilter("mine")}
        >
          My discoveries
        </button>
        <button
          aria-pressed={filter === "saved"}
          onClick={() => setFilter("saved")}
        >
          Saved
        </button>
        </>}
      </div>
      <p>
        {filter === "public" ? "Public discoveries shared by Eureka explorers." : "Discoveries uploaded to your Eureka account. Photos stored only on your phone stay on that device."}
      </p>
      {loading && <p role="status">Loading your collection…</p>}
      {error && (
        <p role="alert" className="micro-error">
          {error}
          <button onClick={() => setLocalRevision((n) => n + 1)}>Retry</button>
        </p>
      )}
      {!loading && !error && !items.length && (
        <div className="micro-empty">
          <h2>Your next discovery belongs here.</h2>
          <p>
            Add photos or videos from your computer, or upload them from the
            Eureka App.
          </p>
        </div>
      )}
      <div className="micro-grid">
        {items.map((item) => (
          <article className="micro-card" key={item.id}>
            {item.observation_media[0] && (
              <MediaView media={item.observation_media[0]} />
            )}
            <button
              className="micro-card-title"
              onClick={() => setSelected(item)}
            >
              {item.title}
            </button>
            <small>
              {new Date(item.captured_at).toLocaleDateString()} ·{" "}
              {item.visibility}
              {item.status !== "published" ? ` · ${item.status}` : ""}
            </small>
            {item.author_id === userId && <button className="micro-card-edit" onClick={() => setSelected(item)}>Edit</button>}
          </article>
        ))}
      </div>
      </>}
      {selected && (
        <DiscoveryDetail
          observation={selected}
          userId={userId}
          onClose={() => {
            setSelected(null);
            setLocalRevision((n) => n + 1);
          }}
        />
      )}
    </section>
  );
}
export function DiscoveryDetail({
  observation,
  userId,
  onClose,
}: {
  observation: Observation;
  userId: string;
  onClose: () => void;
}) {
  const [lineage, setLineage] = useState<Lineage | null>(null),
    [title, setTitle] = useState(observation.title),
    [titleEdited, setTitleEdited] = useState(false),
    [note, setNote] = useState(observation.note),
    [photo, setPhoto] = useState<File>(),
    [photoReload, setPhotoReload] = useState(0),
    [cropping, setCropping] = useState<{ url: string; rect: CropRect } | null>(null),
    [crop, setCrop] = useState<{ rect: CropRect; blob: Blob; url: string; width: number; height: number } | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [deleting, setDeleting] = useState(false);
  const mine = observation.author_id === userId;
  useEffect(() => {
    let alive = true;
    sourceIdOf(observation.community_taxon_id ?? observation.initial_taxon_id)
      .then((id) => { if (alive) setLineage(lineageFor(id, observation.title)); })
      .catch(() => { if (alive) setLineage(lineageFor(null, observation.title)); });
    return () => { alive = false; };
  }, [observation]);
  // Re-identification runs on the saved photo, or a video's saved cover frame.
  useEffect(() => {
    if (!mine) return;
    const media = observation.observation_media[0];
    const path = media && (media.kind === "video" ? media.thumbnail_path : media.storage_path);
    if (!path) return;
    let alive = true;
    void client().storage.from("observation-media").download(path).then(({ data }) => {
      if (alive && data) setPhoto(new File([data], path.split("/").pop() || "photo.jpg", { type: data.type || "image/jpeg" }));
    });
    return () => { alive = false; };
  }, [mine, observation, photoReload]);
  const firstMedia = observation.observation_media[0];
  const canCrop = mine && firstMedia?.kind === "photo";
  useEffect(() => () => { if (crop) URL.revokeObjectURL(crop.url); }, [crop]);
  useEffect(() => () => { if (cropping) URL.revokeObjectURL(cropping.url); }, [cropping]);
  // Cropping always starts from the uploaded original, with the last crop box restored.
  async function startCrop() {
    setError("");
    try {
      const current = firstMedia.storage_path;
      const bucket = client().storage.from("observation-media");
      let { data } = await bucket.download(originalOf(current));
      let rect = parseCrop(current)?.rect ?? fullRect;
      if (!data) { data = (await bucket.download(current)).data; rect = fullRect; }
      if (!data) throw new Error("The photo could not be loaded for cropping.");
      setCropping({ url: URL.createObjectURL(data), rect: crop?.rect ?? rect });
    } catch (err) { setError((err as Error).message); }
  }
  async function applyCrop(rect: CropRect) {
    if (!cropping) return;
    setBusy(true);
    try {
      const source = await (await fetch(cropping.url)).blob();
      const result = await renderCrop(source, rect);
      setCrop({ rect, ...result, url: URL.createObjectURL(result.blob) });
      setPhoto(new File([result.blob], "cropped.jpg", { type: "image/jpeg" }));
      setCropping(null);
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  /** Swaps the listed photo for the cropped copy; the original is never deleted. */
  async function saveCrop() {
    if (!crop) return;
    const db = client(), old = firstMedia.storage_path, original = originalOf(old);
    const path = isFull(crop.rect) ? original : cropPath(original, crop.rect);
    if (path === old) return;
    if (path !== original) checked(await db.storage.from("observation-media").upload(path, crop.blob, { contentType: "image/jpeg", upsert: false }));
    checked(await db.from("observation_media").insert({
      observation_id: observation.id, owner_id: userId, storage_path: path, thumbnail_path: path, kind: "photo",
      width: crop.width, height: crop.height, captured_at: (firstMedia as { captured_at?: string }).captured_at ?? null,
    }));
    checked(await db.from("observation_media").delete().eq("storage_path", old).eq("observation_id", observation.id).select("storage_path"));
    if (old !== original) await db.storage.from("observation-media").remove([old]);
  }
  function changeLineage(next: Lineage) {
    setLineage(next);
    const name = deepest(next)?.name.trim();
    if (!titleEdited && name) setTitle(name);
  }
  return (
    <Modal title={observation.title} onClose={onClose} busy={busy}>
      {observation.observation_media.map((m, index) => (
        index === 0 && crop
          ? <img key="cropped" className="micro-media" src={crop.url} alt="Cropped preview" />
          : <MediaView key={m.storage_path} media={m} />
      ))}
      {canCrop && <div className="micro-row">
        <button type="button" disabled={busy} onClick={() => void startCrop()}>✂ {crop || parseCrop(firstMedia.storage_path) ? "Re-crop photo" : "Crop photo"}</button>
        {crop && <><span className="micro-muted">Cropped · saved when you press Save changes</span>
          <button type="button" disabled={busy} onClick={() => { setCrop(null); setPhoto(undefined); setPhotoReload((n) => n + 1); }}>Undo crop</button></>}
      </div>}
      {cropping && <Modal title="Crop photo" onClose={() => setCropping(null)} busy={busy} className="micro-crop-dialog">
        <ImageCropper src={cropping.url} initial={cropping.rect} busy={busy} onCancel={() => setCropping(null)} onApply={(rect) => void applyCrop(rect)} />
      </Modal>}
      {!mine && lineage && <LineageView lineage={lineage} />}
      <p>{observation.note}</p>
      <Interactions observationId={observation.id} />
      {mine && (
        <form
          className="micro-discovery-edit"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await saveCrop();
              const taxon = lineage ? await resolveTaxon(lineage) : undefined;
              checked(
                await client()
                  .from("observations")
                  .update({
                    title: title.trim(),
                    note,
                    // Untouched until the stored identification has loaded.
                    ...(lineage ? { initial_taxon_id: taxon?.id ?? null } : {}),
                  })
                  .eq("id", observation.id)
                  .select("id")
                  .single(),
              );
              onClose();
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Identification
            file={photo}
            onSelect={(_taxon, name, lineageId) => {
              changeLineage(lineageId ? lineageFor(lineageId, name) : { ...lineage, genus: undefined, species: undefined, ...lineageFor(null, name) });
            }}
          />
          {lineage ? <RankEntry value={lineage} onChange={changeLineage} /> : <p role="status">Loading identification…</p>}
          <label>
            Discovery name
            <input
              required
              maxLength={140}
              value={title}
              onChange={(e) => { setTitle(e.target.value); setTitleEdited(true); }}
            />
          </label>
          <label>
            Notes
            <textarea
              value={note}
              maxLength={5000}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <div className="micro-row">
            <button disabled={busy}>Save changes</button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setDeleting(true)}
            >
              Delete discovery
            </button>
          </div>
          {deleting && (
            <div className="micro-error">
              <p>Delete this discovery and its uploaded media permanently?</p>
              <div className="micro-row">
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setError("");
                    try {
                      checked(
                        await client()
                          .from("observations")
                          .delete()
                          .eq("id", observation.id)
                          .select("id")
                          .single(),
                      );
                      const paths = [
                        ...new Set(
                          observation.observation_media.flatMap((m) =>
                            [m.storage_path, m.thumbnail_path, originalOf(m.storage_path)].filter(
                              (p): p is string => !!p,
                            ),
                          ),
                        ),
                      ];
                      if (paths.length) {
                        const { error: cleanupError } = await client()
                          .storage.from("observation-media")
                          .remove(paths);
                        if (cleanupError) {
                          setError(
                            "Discovery deleted, but some media could not be removed. Contact support for storage cleanup.",
                          );
                          setDeleting(false);
                          return;
                        }
                      }
                      onClose();
                    } catch (err) {
                      setError((err as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Confirm deletion
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setDeleting(false)}
                >
                  Keep it
                </button>
              </div>
            </div>
          )}
        </form>
      )}
      {error && (
        <p role="alert" className="micro-error">
          {error}
        </p>
      )}
    </Modal>
  );
}
export function LifeTree() {
  const [path, setPath] = useState<{ id: string; name: string }[]>([]),
    [nodes, setNodes] = useState<TreeNode[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const parent = path.at(-1)?.id ?? null;
  function navigate(next: typeof path) {
    if ((next.at(-1)?.id ?? null) === parent) return;
    setLoading(true);
    setError("");
    setPath(next);
  }
  useEffect(() => {
    let alive = true;
    rpc<TreeNode[]>("life_tree_children", { p_parent_taxon_id: parent })
      .then((rows) => {
        if (alive) setNodes(rows);
      })
      .catch((err) => {
        if (alive) setError(err.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [parent]);
  return (
    <section className="micro-content">
      <span className="micro-eyebrow">FOLLOW THE BRANCHES OF LIFE</span>
      <h1>Life Tree</h1>
      <p>
        Your shared Eureka collection lights up the families you have
        identified.
      </p>
      <nav className="micro-row" aria-label="Taxonomy path">
        <button onClick={() => navigate([])}>All life</button>
        {path.map((p, i) => (
          <button key={p.id} onClick={() => navigate(path.slice(0, i + 1))}>
            {p.name}
          </button>
        ))}
      </nav>
      {loading ? (
        <p>Loading branches…</p>
      ) : error ? (
        <p role="alert" className="micro-error">
          {error}
        </p>
      ) : (
        <div className="micro-grid">
          {nodes.map((n) => (
            <button
              className={`micro-card micro-tree-node ${n.lit_family_count || n.family_state === "lit" || n.family_state === "confirmed" ? "is-lit" : ""}`}
              key={n.taxon_id}
              onClick={() =>
                navigate([...path, { id: n.taxon_id, name: n.scientific_name }])
              }
            >
              <span>{n.rank}</span>
              <h2>{n.scientific_name}</h2>
              <p>
                {n.lit_family_count} / {n.family_count} families discovered
              </p>
              {n.family_state && <small>{n.family_state}</small>}
            </button>
          ))}
        </div>
      )}
      {!loading && !error && !nodes.length && (
        <p>You have reached the end of this branch.</p>
      )}
    </section>
  );
}
