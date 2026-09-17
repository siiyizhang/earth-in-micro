import { useState } from "react";
import { checked, client } from "./client";
import { Modal } from "./Shared";

export function AuthForm({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState(""),
    [code, setCode] = useState(""),
    [sent, setSent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Modal title="Welcome, explorer." onClose={onClose} busy={busy}>
      <p>Use the same email as your Eureka App account.</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            if (sent) {
              checked(
                await client().auth.verifyOtp({
                  email: email.trim(),
                  token: code.trim(),
                  type: "email",
                }),
              );
              onClose();
            } else {
              checked(
                await client().auth.signInWithOtp({
                  email: email.trim(),
                  options: { shouldCreateUser: true },
                }),
              );
              setSent(true);
            }
          } catch (err) {
            setError(err instanceof Error ? err.message : "Sign in failed.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            disabled={sent || busy}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        {sent && (
          <>
            <p>Check your inbox for the sign-in code.</p>
            <label>
              Email code
              <input
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="[0-9]{6,10}"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setSent(false);
                setCode("");
              }}
            >
              Change email / resend
            </button>
          </>
        )}
        {error && (
          <p role="alert" className="micro-error">
            {error}
          </p>
        )}
        <button className="micro-primary" disabled={busy}>
          {busy ? "Please wait…" : sent ? "Sign in" : "Send sign-in code"}
        </button>
      </form>
    </Modal>
  );
}
