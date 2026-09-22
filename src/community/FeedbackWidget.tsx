import { useEffect, useRef, useState } from "react";

const TYPES = [
  ["Something is hard to use", "Hard to use"],
  ["Feature request", "Feature idea"],
  ["Other", "Other"],
] as const;
const SEEN_KEY = "micro-feedback-intro-seen";

function seen() {
  try { return localStorage.getItem(SEEN_KEY) === "1"; } catch { return true; }
}
function markSeen() {
  try { localStorage.setItem(SEEN_KEY, "1"); } catch { /* private mode */ }
}

/** Bottom-right invitation to leave feedback; messages land in Notion via /api/feedback. */
export default function FeedbackWidget({ accountEmail }: { accountEmail?: string }) {
  const [open, setOpen] = useState(false);
  const [intro, setIntro] = useState(false);
  const [type, setType] = useState<string>(TYPES[0][0]);
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [website, setWebsite] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  const field = useRef<HTMLTextAreaElement>(null);

  // A one-time nudge a few seconds in, so first-time visitors notice it.
  useEffect(() => {
    if (seen()) return;
    const timer = setTimeout(() => setIntro(true), 4000);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => { if (open) field.current?.focus(); }, [open]);

  function toggle() {
    setIntro(false);
    markSeen();
    setOpen((o) => !o);
    if (state === "sent") { setState("idle"); setMessage(""); }
  }
  async function send(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError("");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, message, contact, website, account: accountEmail ?? "", page: location.href }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Your message could not be sent. Please try again later.");
      setState("sent");
      setMessage("");
      setContact("");
    } catch (err) {
      setError((err as Error).message);
      setState("idle");
    }
  }

  return <div className="micro-feedback">
    {open && <section className="micro-feedback-panel" role="dialog" aria-label="Send feedback">
      <div className="micro-row micro-between">
        <strong>Help us improve Eureka</strong>
        <button type="button" className="micro-feedback-close" aria-label="Close feedback" onClick={toggle}>✕</button>
      </div>
      {state === "sent" ? <div className="micro-feedback-thanks" role="status">
        <p><strong>Thank you!</strong> We read every message.</p>
        <button type="button" onClick={() => setState("idle")}>Send another</button>
      </div> : <form onSubmit={send}>
        <p className="micro-muted">Is something hard to use, or is there a feature you wish we had? Leave us a message here.</p>
        <div className="micro-feedback-types" role="radiogroup" aria-label="Feedback type">
          {TYPES.map(([value, label]) => <button key={value} type="button" role="radio" aria-checked={type === value} aria-pressed={type === value} onClick={() => setType(value)}>{label}</button>)}
        </div>
        <textarea ref={field} required minLength={3} maxLength={2000} rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="What happened, or what would you like to see?" aria-label="Your message" />
        {accountEmail
          ? <p className="micro-muted">We may reply to {accountEmail}.</p>
          : <input type="text" maxLength={200} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Email, if you'd like a reply (optional)" aria-label="Contact (optional)" />}
        <input className="micro-feedback-trap" tabIndex={-1} autoComplete="off" aria-hidden="true" value={website} onChange={(e) => setWebsite(e.target.value)} name="website" />
        {error && <p className="micro-error" role="alert">{error}</p>}
        <button className="micro-primary" disabled={state === "sending" || message.trim().length < 3}>{state === "sending" ? "Sending…" : "Send"}</button>
      </form>}
    </section>}
    {intro && !open && <div className="micro-feedback-intro" role="status">
      <span>Something not working, or an idea? Tell us here.</span>
      <button type="button" aria-label="Dismiss" onClick={() => { setIntro(false); markSeen(); }}>✕</button>
    </div>}
    <button type="button" className="micro-feedback-button" aria-expanded={open} onClick={toggle}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z" /><path d="M8 9h8M8 12h5" /></svg>
      <span>Feedback</span>
    </button>
  </div>;
}
