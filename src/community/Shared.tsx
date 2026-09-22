import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { checked, client } from "./client";
import type { Media } from "./client";

export function Modal({
  title,
  children,
  onClose,
  busy = false,
  className = "",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`micro-dialog ${className}`}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="micro-row micro-between">
        <h2>{title}</h2>
        <button aria-label="Close dialog" disabled={busy} onClick={onClose}>
          ✕
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function MediaView({ media }: { media: Media }) {
  const [url, setUrl] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    let disposed = false;
    async function load() {
      setUrl("");
      setError("");
      try {
        // An authenticated signed URL preserves the same RLS rules as the mobile app.
        const result = checked(
          await client()
            .storage.from("observation-media")
            .createSignedUrl(media.storage_path, 3600),
        );
        if (disposed) return;
        setUrl(result.signedUrl);
      } catch {
        if (!disposed) setError("Media could not be loaded.");
      }
    }
    void load();
    return () => {
      disposed = true;
    };
  }, [media.storage_path]);
  return error ? (
    <p role="alert">{error}</p>
  ) : !url ? (
    <div className="micro-media-placeholder">Loading media…</div>
  ) : media.kind === "video" ? (
    <video className="micro-media" src={url} controls playsInline preload="metadata" />
  ) : (
    <a href={url} target="_blank" rel="noreferrer">
      <img
        className="micro-media"
        src={url}
        alt="Microscopic observation"
        loading="lazy"
      />
    </a>
  );
}
