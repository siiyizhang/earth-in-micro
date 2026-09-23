import { useEffect, useRef, useState } from "react";

export default function VideoFramePicker({
  file,
  src,
  onSelect,
}: {
  file?: File;
  /** A remote video (e.g. a signed URL); frames need CORS, hence crossOrigin. */
  src?: string;
  onSelect: (frame: File) => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0),
    [position, setPosition] = useState(0),
    [error, setError] = useState(""),
    [selected, setSelected] = useState(false);
  useEffect(() => {
    if (!file) { if (ref.current && src) ref.current.src = src; return; }
    const url = URL.createObjectURL(file);
    if (ref.current) ref.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file, src]);
  return (
    <div className="micro-identify">
      <p>Choose a video frame for identification and the discovery cover.</p>
      <video
        ref={ref}
        className="micro-media"
        controls
        playsInline
        crossOrigin={src && !file ? "anonymous" : undefined}
        preload="metadata"
        onTimeUpdate={() => { if (ref.current && !ref.current.seeking) setPosition(ref.current.currentTime); }}
        onLoadedMetadata={() =>
          setDuration(
            Number.isFinite(ref.current?.duration) ? ref.current!.duration : 0,
          )
        }
        onError={() =>
          setError(
            "This browser cannot decode this video. You can still upload it, or choose an MP4 video.",
          )
        }
      />
      <label>
        Frame position
        <input
          type="range"
          min={0}
          max={duration}
          step={0.05}
          value={position}
          disabled={!duration}
          onChange={(e) => {
            const time = Number(e.target.value);
            setPosition(time);
            if (ref.current) {
              ref.current.pause();
              ref.current.currentTime = time;
            }
          }}
        />
      </label>
      <button
        type="button"
        disabled={!duration}
        onClick={() => {
          const video = ref.current;
          if (!video || video.readyState < 2 || video.seeking) {
            setError("Wait for this frame to load, then try again.");
            return;
          }
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const context = canvas.getContext("2d");
          if (!context) return;
          context.drawImage(video, 0, 0);
          try {
          canvas.toBlob(
            (blob) => {
              if (blob) {
                onSelect(
                  new File([blob], "video-frame.jpg", { type: "image/jpeg" }),
                );
                setSelected(true);
                setError("");
              }
            },
            "image/jpeg",
            0.92,
          );
          } catch {
            setError("This browser could not capture a frame from this video.");
          }
        }}
      >
        {selected ? "✓ Frame selected · Replace frame" : "Use this frame"}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
