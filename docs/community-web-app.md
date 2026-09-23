# Eureka Web App

The existing marketing website now exposes Micro Explorer at `/app` (and links to it from the website navigation). The React browser implementation uses the same Supabase project, Auth users, RPCs, taxonomy, Storage buckets and RLS as `eureka_web/mobile/eureka_app`. No separate account database is introduced. The guest-read permissions applied to the existing project are recorded in `docs/public-place-browsing.sql`.

## Configuration

Set these public build-time variables in `.env.local` locally and in the hosting provider before building:

```
VITE_SUPABASE_URL=https://YOUR_EXISTING_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_EXISTING_PUBLIC_KEY
VITE_MAPBOX_ACCESS_TOKEN=YOUR_PUBLIC_MAPBOX_TOKEN
```

Use the same project as the mobile App, not a new Supabase project. Never use a service-role key. Existing local mobile configuration was copied into the ignored local website configuration. Hosted builds require their own environment values. Mapbox is optional: without it the map uses OpenStreetMap tiles, and global place search is omitted. Restrict the Mapbox public token to the intended website origins when deploying.

Email OTP uses the existing mobile flow. Supabase's email template should contain the numeric `{{ .Token }}` code. The same email signs in to the same Auth user; each browser/device keeps its own session. Signing out here signs out only this browser. Published data synchronizes through Supabase, but native local files, unuploaded observations do not automatically sync.

## Features

- Explore: map, viewport queries (including the antimeridian), current location, Mapbox text search, community places and counts.
- Places: Create place then map selection, optional cover image, server-owned 100m deduplication, visit notes, public photos/videos, and an embedded place taxonomy tree.
- Upload: JPEG/PNG/WebP photos and MP4/MOV/WebM videos, taxonomy selection, note, visibility and location privacy. Draft → upload → media attachment → publication; failed uploads are cleaned up best-effort, with cleanup failures surfaced. The composer defaults to community sharing and exact location, matching iOS; users can turn sharing off or obscure the location.
- Life Tree: `WholeLifeTree.tsx` ports the iOS `whole_life_tree.dart` renderer (LifeMap and Radial layouts, semantic zoom, compact place-card mode) over the same bundled NCBI snapshot (`place-taxonomy.json`, ported `LocalTaxonomy.graph` in `lifeTree.ts`). A place card shows it when a find there has a family, lit by `family_source_id`; tapping a lit family lists its finds. Gallery → Life Tree lights the families from the signed-in account's observations (community or chosen identification) plus `user_family_progress` lit/confirmed rows.
- Identification entry (`RankEntry.tsx`, `taxonomyEntry.ts`): phylum → species fields, each autocompleting from names at that rank (phylum–family from the Life Tree snapshot, genus from the model taxonomy, species free text), limited to descendants of the ranks above; picking a name fills its ancestors. Saved as the deepest rank the shared `taxa` table records; the discovery name follows the deepest rank unless edited. Used in the composer and in editing: owners can re-identify the saved photo (or a video's cover frame), change ranks, name and notes from Gallery (Edit) or from their own finds on a place card. The place-card viewer shows the full lineage.
- Photo cropping (`ImageCropper.tsx`, `mediaCrop.ts`): owners can crop or re-crop a discovery photo in Edit; for a video they choose a cover frame from the stored video, crop it, and identify on it (the cover row is replaced by delete + insert because media rows have no update policy, and restored if the insert fails). The uploaded original is never replaced; the crop is uploaded beside it as `<original>__crop__x_y_w_h__<id>.jpg` (fractions of the original) and swapped in as the listed `observation_media` row, so the original stays owner-only and re-cropping starts from the full photo with the last box restored. Deleting the discovery also removes the original.
- Gallery: account uploads, saved discoveries, media previews, metadata edits, identification changes and deletion; likes and favorites use existing account tables. Large collections load in pages.
- Identification: the mobile ONNX model executes locally with ONNX Runtime Web, matching the mobile letterbox and normalization configuration. Browser interpolation can differ slightly from Dart's cubic interpolation. Suggestions include Phylum, Class, Order, Family and Genus, linked through the same model taxonomy as iOS. Users can correct candidates and confirm a rank; species names can be entered manually. Suggestions require confirmation; they are not authoritative identification. Photos and selected video frames can be identified locally; the selected video frame is saved as its cover.
- Settings: account and local sign-out, data-sharing explanation.
- Navigation: Explore, Gallery, Settings. The removed `/app/learn` and `/app/life-tree` routes redirect to Explore; the place-detail tree remains.

## Browser adaptation boundaries

No microscope connection, live view, Wi-Fi setup, camera control, device gallery or device-dependent course chat route is present. The browser imports existing files rather than controlling hardware. The current browser UI is English; native App language options are not yet mirrored. Course AI chat, native voice input, the game's animated Life Tree presentation and identification-feedback training exports are not ported in this implementation. The shared taxonomy tree and upload/account workflows are implemented; full visual and ancillary feature parity with Flutter is not claimed.

An obscured/private observation is never linked to an exact public place: this prevents `visit_id` from disclosing its coordinates indirectly. Public places explicitly disclose their exact position. Photo re-encoding removes EXIF location metadata; uploaded videos are not transcoded, so embedded video metadata is retained.

## Source references

Contracts were checked against `eureka_web/mobile/eureka_app/lib/src/core/community_api.dart` and the migrations through `20260913090000_feedback_review_and_retry.sql`. Deployments need the existing places/visits, place covers, public media read, likes, taxonomy and Life Tree migrations already used by the App. Guest place/visit reads were enabled separately; the applied SQL is included in `docs/public-place-browsing.sql`.

`public/community-model/` contains the existing mobile `student.onnx`, `model_config.json` and `display_names.json`. Update these three files together when changing models. They load only when identification is requested; the marketing landing page does not load ONNX or Leaflet.

## Validation

```
npm run build
npx eslint src/community src/main.tsx
npx tsx --test tests/taxon-chains.unit.ts tests/media-files.unit.ts
```

The unit checks cover valid identification lineages, rank corrections, confidence scoring and mobile video MIME normalization. Current UI flows were checked through the browser with an isolated local API, including real ONNX inference, guest browsing, photo navigation, and video frame/original uploads.

`tests/community/webapp.spec.ts` and `npm run test:community` retain the initial browser suite for reference. Its selectors and assertions predate the unified composer and removal of Learn/Life Tree; it has not been updated to the final UI and is not a passing release gate. It mocks Supabase and requires local public environment configuration. Do not treat it as current coverage.

Real email-code delivery and cross-device reads/writes must be accepted with an actual user login. Read-only checks verified the existing public Auth configuration and taxonomy endpoint; those do not prove authenticated RLS or Storage writes.


## Unified discovery composer (September 17)

Create place now arms map selection; ordinary map clicks do not open a form.
The selected point survives the guest email-login flow. The composer follows the
mobile app's four sections: location, media, visit note, privacy. It reuses places
within 100 metres, separates place covers from specimen images, and creates one
observation per photo/video with its own identification and note. Public exact
uploads share one visit. Private/obscured uploads do not create or link to an
exact public place. Eureka Gallery selects cloud photos and videos belonging to the account;
phone-only local photos are available through the device file picker.

Validated with an isolated local API and browser: guest selection followed by
login, cloud multi-selection, two independent photo uploads under one visit,
second-upload failure and retry without duplicating the first observation.
Production records were not used for write tests. Completed upload IDs are held
for retries while the composer stays open; closing or refreshing discards that
in-memory retry state, so check Gallery before restarting an interrupted batch.
