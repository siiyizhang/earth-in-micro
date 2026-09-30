# Portable microscope visual

The packability illustration is a transparent cutout and animated Canvas composition. It uses `public/images/product/portable-microscope-cutout.png` (1100 × 1430, RGBA). The supplied original remains at `public/images/product/portable-microscope-particle-reference.png`.

The cutout was created with the built-in imagegen tool, in background-extraction edit mode. Source: the user's photograph. The skin remains photographic; the instrument is rendered as teal particles. No solid card background, border, rounded frame or photo gradient is applied. The cropped wrist fades into the website.

The photo, recolored surface and particle stencil share one pixel coordinate system and one contain transform. The instrument stencil uses the cutout's alpha below the hand, and neutral dark handle pixels above it. It includes the stepped upper enclosure, handle and side tabs. Moving dots are composited through this stencil every frame, with approximately 5–8 sample-pixel displacement. Pausing and reduced-motion settings stop movement. Offscreen and hidden document animation pauses.

## Exact imagegen prompt

Use case: background-extraction. Edit the supplied photograph into a clean transparent-background PNG cutout for a website. Remove ONLY the grey studio background, making those pixels fully transparent, including the gaps between the hand and the black microscope handle. Preserve the actual photographed hand, fingers, skin, wrist, every visible black handle part, brown 3D-printed microscope body, microscope optics and two black side tabs EXACTLY in their original relative positions, perspective and proportions. Keep the entire original composition and transparent margins, same portrait aspect ratio. Do not redesign, relight, recolor or add anything. In particular retain the brown enclosure's precise stepped top edge, curved corners, surface texture, all handle contours and finger occlusion. No frame, no shadow, no background color, no checkerboard baked into the image, no particle effects, no text. Actual alpha transparency.

## Validation

Production build and focused lint passed. Browser inspection at 1440, 390 and 320 px verified alignment and no horizontal overflow. Observed particle coordinates changed over time. Pausing produced stable canvas pixels. The canvas corner has zero alpha, and the containing figure has a zero-width border, transparent background and no overlay pseudo-element. No page errors were observed. Only the local /ai page was updated.
