# Eureka AI page

The `/ai` route is a lazy-loaded page with scoped styles; the existing homepage is unchanged. Production uses the existing Vercel SPA rewrite. The page retains `noindex, nofollow` while the product is in development.

## Current experience

- Three automatically cycling, procedural particle illustrations: counting Scenedesmus, measuring Daphnia across sixteen wells, and classifying suspected fish parasites.
- A design-partner strip, with asset provenance in `design-partner-assets.md`.
- A portable microscope particle visual with laptop, iPad and phone screens, followed by a scroll-driven glacier scene. Device videos have local poster images and respect visibility and motion preferences.
- A light workflow studio: editable natural-language prompt, multiple example image-library selections, and GPT / Claude / Gemini / custom-model choices. It saves a JSON draft or opens an email draft containing the current selections. No AI API, real database, or instrument is connected; image libraries are illustrative.
- Global particle pause, reduced-motion support, and responsive layouts.

The software/hardware explanation, repeated example cards, validation section and FAQ were removed at the user's request. The homepage's content and styling are not changed.

## Assets and illustrations

The active specimen animations are procedural product concepts, not acquired samples or validated measurements. Earlier research-image components and their three referenced source assets are retained as fallback code. The portable visual uses the user's photograph; see `portable-particle-visual.md`. Existing microscopy videos, plankton images and glacier imagery are reused from the main website.

## Release validation

Before the initial publication on 2026-09-30, focused ESLint checks and the production TypeScript/Vite build passed. The prompt editor, image-library multiselection, model choice and responsive studio were checked in the local browser. Production deployment must use the committed tree so unrelated local files and pending deletions are excluded.
