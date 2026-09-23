// Whether this browser has seen the onboarding tour. Storage can be missing
// (private mode, blocked site data); then the tour simply shows again.
const KEY = "micro-tour-done";

export function tourSeen() {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
}

export function markTourSeen() {
  try { localStorage.setItem(KEY, "1"); } catch { /* private mode */ }
}
