import { useEffect, useRef, useState } from "react";
import type { Find } from "./client";
import { LineageView } from "./RankEntry";
import { MediaView, Modal } from "./Shared";
import { lineageFor } from "./taxonomyEntry";

export function FindViewer({ finds, initialIndex = 0, onClose, canEdit, onEdit }: { finds: Find[]; initialIndex?: number; onClose: () => void; canEdit?: (find: Find) => boolean; onEdit?: (find: Find) => void }) {
  const touch = useRef<{x:number; y:number} | null>(null);
  const [index, setIndex] = useState(initialIndex);
  useEffect(() => {
    const keys = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") setIndex(i => Math.min(finds.length - 1, i + 1));
      if (event.key === "ArrowLeft") setIndex(i => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", keys);
    return () => window.removeEventListener("keydown", keys);
  }, [finds.length]);
  const find = finds[index];
  return <Modal title={find.title || find.family_name || "Discovery"} onClose={onClose} className="micro-find-viewer">
    <div onTouchStart={e => { if (e.touches.length === 1) touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; else touch.current = null; }} onTouchEnd={e => {
      const start = touch.current; touch.current = null;
      if (!start || !e.changedTouches[0]) return;
      const dx = e.changedTouches[0].clientX - start.x, dy = e.changedTouches[0].clientY - start.y;
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 2) setIndex(i => Math.max(0, Math.min(finds.length - 1, i + (dx < 0 ? 1 : -1))));
    }}>
    {find.storage_path && <MediaView key={find.observation_id} media={{ storage_path: find.storage_path, kind: find.kind ?? "photo" }} />}
    </div>
    <LineageView lineage={lineageFor(find.family_source_id, find.title)} />
    {!find.family_source_id && find.family_name && <p><i>{find.family_name}</i></p>}
    {onEdit && canEdit?.(find) && <button type="button" onClick={() => onEdit(find)}>Edit discovery</button>}
    {find.note && <p>{find.note}</p>}
    <div className="micro-viewer-controls"><button disabled={index === 0} onClick={() => setIndex(index - 1)} aria-label="Previous discovery">←</button><span>{index + 1} / {finds.length}</span><button disabled={index === finds.length - 1} onClick={() => setIndex(index + 1)} aria-label="Next discovery">→</button></div>
  </Modal>;
}
