import * as React from "react";

import type { TrackSummary, Recommendation } from "@/types/tracks";
import { normalizeTrackSummary, normalizeRecommendation } from "@/lib/track-normalizers";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function useBlendStudio() {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<TrackSummary[]>([]);
  const [seeds, setSeeds] = React.useState<TrackSummary[]>([]);
  const [recommendations, setRecommendations] = React.useState<Recommendation[]>([]);
  const [state, setState] = React.useState<"idle" | "searching" | "blending">("idle");
  const [error, setError] = React.useState<string | null>(null);

  const runSearch = React.useCallback(async () => {
    if (query.trim().length < 2) return;
    setState("searching");
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/tracks/search?q=${encodeURIComponent(query.trim())}&limit=30`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("Failed to fetch tracks");
      const data = (await res.json()) as TrackSummary[];
      setResults(data.map(normalizeTrackSummary));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setState("idle");
    }
  }, [query]);

  const blendSeeds = React.useCallback(async (nextSeeds: TrackSummary[]) => {
    if (nextSeeds.length === 0) {
      setRecommendations([]);
      return;
    }
    setState("blending");
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/tracks/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uris: nextSeeds.map((seed) => seed.track_uri) })
      });
      if (!res.ok) throw new Error("Recommendation request failed");
      const data = (await res.json()) as Recommendation[];
      setRecommendations(data.slice(0, 10).map(normalizeRecommendation));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Blend failed");
    } finally {
      setState("idle");
    }
  }, []);

  const toggleSeed = React.useCallback(
    (track: TrackSummary) => {
      setSeeds((prev) => {
        const exists = prev.some((item) => item.track_uri === track.track_uri);
        const next = exists ? prev.filter((item) => item.track_uri !== track.track_uri) : [...prev.slice(-2), track];
        void blendSeeds(next);
        return next;
      });
    },
    [blendSeeds]
  );

  return {
    query,
    setQuery,
    results,
    seeds,
    recommendations,
    state,
    error,
    runSearch,
    toggleSeed
  };
}
