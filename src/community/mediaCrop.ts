// Re-cropping keeps the uploaded original untouched. A cropped copy is stored
// beside it as `<original>~crop~x_y_w_h~<id>.jpg` (fractions of the original),
// and only the copy is listed in observation_media — so the original stays
// private to its owner, and a later re-crop starts from the full photo with
// the previous crop box restored.

export type CropRect = { x: number; y: number; w: number; h: number };
export const fullRect: CropRect = { x: 0, y: 0, w: 1, h: 1 };

const pattern = /^(.*)~crop~([\d.]+)_([\d.]+)_([\d.]+)_([\d.]+)~[^/~]+\.jpg$/;

export function parseCrop(path: string): { original: string; rect: CropRect } | null {
  const m = path.match(pattern);
  if (!m) return null;
  const [x, y, w, h] = m.slice(2).map(Number);
  return { original: m[1], rect: { x, y, w, h } };
}

export function originalOf(path: string) {
  return parseCrop(path)?.original ?? path;
}

export function isFull(rect: CropRect) {
  return rect.x <= 0.0005 && rect.y <= 0.0005 && rect.w >= 0.999 && rect.h >= 0.999;
}

export function cropPath(original: string, rect: CropRect) {
  const f = (n: number) => n.toFixed(4);
  return `${original}~crop~${f(rect.x)}_${f(rect.y)}_${f(rect.w)}_${f(rect.h)}~${crypto.randomUUID().slice(0, 8)}.jpg`;
}

/** Cuts `rect` out of the image at full resolution (capped at 4096px), as JPEG. */
export async function renderCrop(source: Blob, rect: CropRect): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(source);
  try {
    const sx = Math.round(rect.x * bitmap.width), sy = Math.round(rect.y * bitmap.height);
    const sw = Math.max(1, Math.round(rect.w * bitmap.width)), sh = Math.max(1, Math.round(rect.h * bitmap.height));
    const scale = Math.min(1, 4096 / Math.max(sw, sh));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(sw * scale);
    canvas.height = Math.round(sh * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not crop this photo.");
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Cropping failed."))), "image/jpeg", 0.92));
    return { blob, width: canvas.width, height: canvas.height };
  } finally {
    bitmap.close();
  }
}
