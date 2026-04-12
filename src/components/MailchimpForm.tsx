import { useState } from "react";

const FONTS = { sans: "'Inter', sans-serif" };
const HONEYPOT_NAME = "b_e7f115b3a98f6f65868f62df1_f4f1018dd3";

interface Props {
  dark?: boolean;
  actionUrl: string;
  tags: string;
}

export default function MailchimpForm({ dark = true, actionUrl, tags }: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const textColor = dark ? "rgba(255,255,255,0.82)" : "rgba(26,42,60,0.85)";
  const borderColor = dark ? "rgba(255,255,255,0.15)" : "rgba(26,42,60,0.2)";
  const inputBg = dark ? "rgba(255,255,255,0.05)" : "rgba(26,42,60,0.04)";

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");

    if (!actionUrl) {
      setTimeout(() => setStatus("success"), 600);
      return;
    }

    try {
      const jsonpUrl =
        actionUrl.replace("/post?", "/post-json?") +
        `&EMAIL=${encodeURIComponent(email)}` +
        `&tags=${tags}` +
        `&c=__mcCallback__`;

      await new Promise<void>((resolve, reject) => {
        const cbName = "__mcCallback__";
        const script = document.createElement("script");
        (window as unknown as Record<string, unknown>)[cbName] = (data: { result: string }) => {
          delete (window as unknown as Record<string, unknown>)[cbName];
          document.body.removeChild(script);
          data.result === "success" ? resolve() : reject(new Error(data.result));
        };
        script.src = jsonpUrl;
        script.onerror = () => { document.body.removeChild(script); reject(); };
        document.body.appendChild(script);
        setTimeout(() => reject(new Error("timeout")), 8000);
      });

      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div style={{ fontFamily: FONTS.sans, fontSize: 14, color: "#0ABFBC", fontWeight: 500 }}>
        You're on the list! We'll be in touch.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          style={{
            flex: 1, minWidth: 160,
            fontFamily: FONTS.sans, fontSize: 14, fontWeight: 300,
            color: textColor, background: inputBg,
            border: `1px solid ${borderColor}`,
            borderRadius: 40, padding: "11px 18px",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={status === "loading"}
          style={{
            fontFamily: FONTS.sans, fontSize: 13, fontWeight: 500,
            letterSpacing: "0.04em", color: textColor,
            background: "transparent",
            border: `1.5px solid ${borderColor}`,
            borderRadius: 40, padding: "11px 22px",
            cursor: "pointer", whiteSpace: "nowrap",
            transition: "border-color 0.2s, color 0.2s",
          }}
          onMouseEnter={e => {
            (e.currentTarget).style.borderColor = dark ? "rgba(255,255,255,0.6)" : "rgba(26,42,60,0.7)";
            (e.currentTarget).style.color = dark ? "#ffffff" : "rgba(26,42,60,1)";
          }}
          onMouseLeave={e => {
            (e.currentTarget).style.borderColor = borderColor;
            (e.currentTarget).style.color = textColor;
          }}
        >
          {status === "loading" ? "..." : "Subscribe →"}
        </button>
      </div>
      {/* Mailchimp honeypot — must be present and empty */}
      <div aria-hidden="true" style={{ position: "absolute", left: -5000 }}>
        <input type="text" name={HONEYPOT_NAME} tabIndex={-1} defaultValue="" readOnly />
      </div>
      <input type="hidden" name="tags" value={tags} />
      {status === "error" && (
        <div style={{ fontFamily: FONTS.sans, fontSize: 12, color: "#f87171" }}>
          Something went wrong — please try again.
        </div>
      )}
    </form>
  );
}
