import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
// Public browser configuration only. Never use a service-role key here.
export const community = url && key ? createClient(url, key) : null;
export function client() {
  if (!community)
    throw new Error(
      "Community is not configured. Please contact the site owner.",
    );
  return community;
}
export function checked<T>({
  data,
  error,
}: {
  data: T;
  error: { message: string } | null;
}): NonNullable<T> {
  if (error) throw new Error(error.message);
  return data as NonNullable<T>;
}
export async function rpc<T>(
  name: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  return checked(await client().rpc(name, args)) as T;
}
export type Place = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  visit_count?: number;
  find_count?: number;
  cover_photo_path?: string;
  was_created?: boolean;
};
export type Media = {
  storage_path: string;
  thumbnail_path?: string;
  kind: string;
};
export type Observation = {
  id: string;
  author_id: string;
  title: string;
  note: string;
  captured_at: string;
  visibility: string;
  status: string;
  initial_taxon_id?: string;
  community_taxon_id?: string;
  observation_media: Media[];
};
export type Find = {
  observation_id: string;
  title: string;
  family_name?: string;
  family_source_id?: string;
  note?: string;
  storage_path?: string;
  thumbnail_path?: string;
  kind?: string;
};
export type Visit = {
  visit_id: string;
  visitor_name: string;
  visited_at: string;
  message: string;
  is_mine: boolean;
  finds: Find[];
};
// Older deployed place_log versions omit media. Resolve public media separately
// so map cards and place details work with both old and current RPC versions.
export async function loadPlaceLog(placeId: string): Promise<Visit[]> {
  const visits = await rpc<Visit[]>("place_log", { p_place_id: placeId });
  const session = (await client().auth.getSession()).data.session;
  if (session && visits.some(v => v.is_mine === undefined)) {
    const owned = checked(await client().from("visits").select("id").eq("place_id", placeId).eq("visitor_id", session.user.id));
    const ownIds = new Set(owned.map(v => v.id));
    visits.forEach(v => { v.is_mine = ownIds.has(v.visit_id); });
  }
  const ids = [...new Set(visits.flatMap((v) => v.finds.map((f) => f.observation_id)))];
  if (!ids.length) return visits;
  const observations = checked(await client().from("observations")
    .select("id, note, observation_media(storage_path, thumbnail_path, kind)")
    .in("id", ids).eq("status", "published").eq("visibility", "public"));
  const media = new Map(observations.map((o) => [o.id, { ...o.observation_media[0], note: o.note }]));
  return visits.map((v) => ({ ...v, finds: v.finds.map((f) => ({
    ...f, ...media.get(f.observation_id),
  })) }));
}

export type Taxon = { id: string; scientific_name: string; rank: string };
export type TreeNode = {
  taxon_id: string;
  scientific_name: string;
  rank: string;
  family_count: number;
  lit_family_count: number;
  confirmed_family_count: number;
  family_state?: string;
};

export function viewportQueries(
  south: number,
  west: number,
  north: number,
  east: number,
) {
  const lat = {
    p_min_lat: Math.max(-85, south),
    p_max_lat: Math.min(85, north),
  };
  if (east - west >= 360) return [{ ...lat, p_min_lng: -180, p_max_lng: 180 }];
  const wrap = (n: number) => ((((n + 180) % 360) + 360) % 360) - 180;
  const left = wrap(west),
    right = wrap(east);
  return left <= right
    ? [{ ...lat, p_min_lng: left, p_max_lng: right }]
    : [
        { ...lat, p_min_lng: left, p_max_lng: 180 },
        { ...lat, p_min_lng: -180, p_max_lng: right },
      ];
}
export const maxFileSize = 200 * 1024 * 1024;
export function validateMedia(files: File[]) {
  if (!files.length) throw new Error("Choose at least one photo or video.");
  if (files.length > 10)
    throw new Error("Choose at most 10 files per observation.");
  for (const file of files) {
    if (
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
        "video/mp4",
        "video/quicktime",
        "video/webm",
      ].includes(file.type)
    )
      throw new Error(`${file.name}: use JPEG, PNG, WebP, MP4, MOV or WebM.`);
    if (!file.size || file.size > maxFileSize)
      throw new Error(`${file.name}: choose a file between 1 byte and 200 MB.`);
  }
}
// Re-encode photos so GPS/EXIF metadata cannot bypass the location preference.
export async function preparePhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 4096 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not prepare this photo.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("Photo conversion failed.")),
        "image/jpeg",
        0.92,
      ),
    );
  } finally {
    bitmap.close();
  }
}
export async function publishObservation(input: {
  userId: string;
  title: string;
  note: string;
  capturedAt: string;
  visibility: string;
  geoprivacy: string;
  latitude: number | null;
  longitude: number | null;
  taxonId: string | null;
  place: Place | null;
  thumbnail?: File;
  visitId?: string;
  files: File[];
  onProgress: (text: string) => void;
}) {
  validateMedia(input.files);
  const db = client();
  let visitId: string | undefined = input.visitId, observationId: string | undefined;
  let ownsVisit = false;
  const uploaded: string[] = [];
  try {
    // Private/obscured finds must not be linked to an exact public place log.
    if (
      !visitId && input.place &&
      input.visibility === "public" &&
      input.geoprivacy === "open"
    ) {
      const visit = checked(
        await db
          .from("visits")
          .insert({
            place_id: input.place.id,
            visitor_id: input.userId,
            visited_at: input.capturedAt,
            message: "",
          })
          .select("id")
          .single(),
      );
      visitId = visit.id;
      ownsVisit = true;
    }
    observationId = await rpc<string>("create_observation", {
      p_title: input.title.trim(),
      p_note: input.note,
      p_captured_at: input.capturedAt,
      p_visibility: input.visibility,
      p_geoprivacy: input.geoprivacy,
      p_latitude: input.latitude,
      p_longitude: input.longitude,
      p_initial_taxon_id: input.taxonId,
      p_visit_id: visitId ?? null,
    });
    for (const [index, file] of input.files.entries()) {
      input.onProgress(`Uploading ${index + 1} of ${input.files.length}…`);
      const video = file.type.startsWith("video/");
      const body = video ? file : await preparePhoto(file);
      const ext = video
        ? {
            "video/mp4": "mp4",
            "video/quicktime": "mov",
            "video/webm": "webm",
          }[file.type]
        : "jpg";
      const path = `${input.userId}/${observationId}/${crypto.randomUUID()}.${ext}`;
      checked(
        await db.storage
          .from("observation-media")
          .upload(path, body, { contentType: body.type, upsert: false }),
      );
      uploaded.push(path);
      let thumbnailPath: string | null = video ? null : path;
      if (video && index === 0 && input.thumbnail) {
        thumbnailPath = `${input.userId}/${observationId}/${crypto.randomUUID()}_thumb.jpg`;
        checked(
          await db.storage
            .from("observation-media")
            .upload(thumbnailPath, await preparePhoto(input.thumbnail), {
              contentType: "image/jpeg",
            }),
        );
        uploaded.push(thumbnailPath);
      }
      checked(
        await db
          .from("observation_media")
          .insert({
            observation_id: observationId,
            owner_id: input.userId,
            storage_path: path,
            thumbnail_path: thumbnailPath,
            kind: video ? "video" : "photo",
            captured_at: input.capturedAt,
          }),
      );
    }
    input.onProgress("Publishing…");
    checked(
      await db
        .from("observations")
        .update({ status: "published" })
        .eq("id", observationId)
        .select("id")
        .single(),
    );
    return observationId;
  } catch (error) {
    // Best-effort cleanup; never publish an incomplete observation.
    const cleanup = await Promise.allSettled([
      ...(uploaded.length
        ? [db.storage.from("observation-media").remove(uploaded).then(checked)]
        : []),
      ...(observationId
        ? [
            db
              .from("observations")
              .delete()
              .eq("id", observationId)
              .then(checked),
          ]
        : []),
      ...(ownsVisit && visitId
        ? [db.from("visits").delete().eq("id", visitId).then(checked)]
        : []),
    ]);
    if (cleanup.some((result) => result.status === "rejected"))
      throw new Error(
        `${error instanceof Error ? error.message : "Upload failed."} Cleanup was incomplete; check your drafts in Gallery before retrying.`,
      );
    throw error;
  }
}

export async function currentUser() {
  const { data, error } = await client().auth.getUser();
  if (error?.name === "AuthSessionMissingError") return null;
  if (error) throw new Error(error.message);
  return data.user;
}
