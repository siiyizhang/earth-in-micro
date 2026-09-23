import { useRef, useState } from "react";
import { fullRect } from "./mediaCrop";
import type { CropRect } from "./mediaCrop";

const ASPECTS: [string, number | null][] = [["Free", null], ["1:1", 1], ["4:3", 4 / 3], ["3:4", 3 / 4], ["16:9", 16 / 9]];
const MIN = 0.04;
type Handle = "move" | "nw" | "ne" | "sw" | "se";

/** Drag the box to move it, drag a corner to resize; arrow keys nudge it. */
export default function ImageCropper({ src, initial, onApply, onCancel, busy }: {
  src: string;
  initial: CropRect;
  onApply: (rect: CropRect) => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  const [rect, setRect] = useState<CropRect>(initial);
  const [aspect, setAspect] = useState<number | null>(null);
  const [natural, setNatural] = useState({ w: 1, h: 1 });
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<{ handle: Handle; start: CropRect; x: number; y: number } | null>(null);

  // Aspect ratios are in pixels; the rect is in fractions of the image.
  const toFraction = (ratio: number) => ratio * natural.h / natural.w;
  function fitAspect(r: CropRect, ratio: number | null, anchor: "center" | "nw" | "ne" | "sw" | "se" = "center"): CropRect {
    if (!ratio) return r;
    const k = toFraction(ratio);
    let w = r.w, h = w / k;
    if (h > r.h) { h = r.h; w = h * k; }
    if (w > 1) { w = 1; h = w / k; }
    if (h > 1) { h = 1; w = h * k; }
    const x = anchor.endsWith("w") ? r.x + r.w - w : anchor.endsWith("e") ? r.x : r.x + (r.w - w) / 2;
    const y = anchor.startsWith("n") ? r.y + r.h - h : anchor.startsWith("s") ? r.y : r.y + (r.h - h) / 2;
    return clamp({ x, y, w, h });
  }
  function clamp(r: CropRect): CropRect {
    const w = Math.min(1, Math.max(MIN, r.w)), h = Math.min(1, Math.max(MIN, r.h));
    return { w, h, x: Math.min(1 - w, Math.max(0, r.x)), y: Math.min(1 - h, Math.max(0, r.y)) };
  }
  function onPointerDown(handle: Handle, e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { handle, start: rect, x: e.clientX, y: e.clientY };
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current, box = frame.current?.getBoundingClientRect();
    if (!d || !box) return;
    const dx = (e.clientX - d.x) / box.width, dy = (e.clientY - d.y) / box.height, s = d.start;
    if (d.handle === "move") { setRect(clamp({ ...s, x: s.x + dx, y: s.y + dy })); return; }
    let { x, y, w, h } = s;
    const right = s.x + s.w, bottom = s.y + s.h;
    if (d.handle.endsWith("w")) { x = Math.min(right - MIN, Math.max(0, s.x + dx)); w = right - x; }
    else w = Math.min(1 - s.x, Math.max(MIN, s.w + dx));
    if (d.handle.startsWith("n")) { y = Math.min(bottom - MIN, Math.max(0, s.y + dy)); h = bottom - y; }
    else h = Math.min(1 - s.y, Math.max(MIN, s.h + dy));
    setRect(fitAspect({ x, y, w, h }, aspect, d.handle));
  }
  const end = () => { drag.current = null; };
  function onKeyDown(e: React.KeyboardEvent) {
    const step = e.shiftKey ? 0.05 : 0.01;
    const move = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!move) return;
    e.preventDefault();
    setRect((r) => clamp({ ...r, x: r.x + move[0], y: r.y + move[1] }));
  }
  const pct = (n: number) => `${n * 100}%`;
  const pixels = `${Math.round(rect.w * natural.w)} × ${Math.round(rect.h * natural.h)} px`;

  return <div className="micro-cropper">
    <div className="micro-crop-stage">
      <div className="micro-crop-frame" ref={frame} onPointerMove={onPointerMove} onPointerUp={end} onPointerCancel={end}>
        <img src={src} alt="Photo to crop" draggable={false} onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })} />
        <div
          className="micro-crop-box"
          style={{ left: pct(rect.x), top: pct(rect.y), width: pct(rect.w), height: pct(rect.h) }}
          role="slider"
          tabIndex={0}
          aria-label="Crop area, use arrow keys to move"
          aria-valuetext={pixels}
          onPointerDown={(e) => onPointerDown("move", e)}
          onKeyDown={onKeyDown}
        >
          <span className="micro-crop-grid" aria-hidden="true" />
          {(["nw", "ne", "sw", "se"] as const).map((h) => <span key={h} className={`micro-crop-handle is-${h}`} onPointerDown={(e) => onPointerDown(h, e)} aria-hidden="true" />)}
        </div>
      </div>
    </div>
    <div className="micro-row micro-between micro-crop-tools">
      <div className="micro-crop-aspects" role="group" aria-label="Aspect ratio">
        {ASPECTS.map(([label, ratio]) => <button key={label} type="button" aria-pressed={aspect === ratio} onClick={() => { setAspect(ratio); setRect((r) => fitAspect(r, ratio)); }}>{label}</button>)}
      </div>
      <small className="micro-muted">{pixels}</small>
    </div>
    <div className="micro-row">
      <button type="button" className="micro-primary" disabled={busy} onClick={() => onApply(rect)}>{busy ? "Cropping…" : "Apply crop"}</button>
      <button type="button" disabled={busy} onClick={() => { setAspect(null); setRect(fullRect); }}>Reset to full photo</button>
      <button type="button" disabled={busy} onClick={onCancel}>Cancel</button>
    </div>
  </div>;
}
