import type { Spot } from "../data/spots";
import { spots as fallbackSpots } from "../data/spots";

type SpotsSource = "notion" | "fallback";

export async function fetchSpots(): Promise<{ spots: Spot[]; source: SpotsSource; error: string | null }> {
  try {
    const res = await fetch("/api/spots", { cache: "no-store" });
    const text = await res.text();

    if (!res.ok) throw new Error(`GET /api/spots failed (${res.status}): ${text}`);

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`GET /api/spots returned non-JSON: ${text.slice(0, 200)}`);
    }

    if (!Array.isArray(data)) {
      throw new Error(`GET /api/spots returned non-array JSON: ${text.slice(0, 200)}`);
    }

    return { spots: data as Spot[], source: "notion", error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[spots] Falling back to built-in spots:", msg);
    return { spots: fallbackSpots, source: "fallback", error: msg };
  }
}

