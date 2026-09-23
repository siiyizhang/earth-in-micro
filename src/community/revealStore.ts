import { useSyncExternalStore } from "react";

// Anywhere that lights a family (the upload composer, an edited
// identification) asks for the reveal here; one host in WebApp shows it.

export type RevealRequest = {
  userId: string;
  familyIds: string[];
  familyNames: string[];
  placeName?: string;
};

let current: RevealRequest | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export function showLifeTreeReveal(request: RevealRequest) {
  if (!request.familyIds.length) return;
  current = request;
  emit();
}

export function closeLifeTreeReveal() {
  current = null;
  emit();
}

export function useLifeTreeReveal() {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    () => current,
  );
}
