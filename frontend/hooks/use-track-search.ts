"use client";

import * as React from "react";
import { useDebounce } from "@/lib/use-debounce";

export interface Suggestion {
  track_uri: string;
  track_name: string;
  artist_names?: string | null;
}

export interface TrackSummary {
  track_uri: string;
  track_name: string;
  artist_names?: string | null;
  album_name?: string | null;
  release_year?: number | null;
  genres?: string[];
  popularity?: number | null;
  duration_ms?: number | null;
  explicit?: string | null;
  danceability?: number | null;
  energy?: number | null;
  valence?: number | null;
  tempo?: number | null;
  acousticness?: number | null;
  liveness?: number | null;
  speechiness?: number | null;
  instrumentalness?: number | null;
  loudness?: number | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function useTrackSearch() {
  const [query, setQuery] = React.useState("");
  const debouncedQuery = useDebounce(query.trim(), 300);
  const [suggestions, setSuggestions] = React.useState<Suggestion[]>([]);
  const [results, setResults] = React.useState<TrackSummary[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    async function fetchSuggestions() {
      if (debouncedQuery.length < 2) {
        setSuggestions([]);
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/tracks/suggest?q=${encodeURIComponent(debouncedQuery)}`);
        if (!res.ok) return;
        const data = (await res.json()) as Suggestion[];
        if (!cancelled) {
          setSuggestions(data);
        }
      } catch (error) {
        console.warn("suggest error", error);
      }
    }
    fetchSuggestions();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const fetchDetail = React.useCallback(async (uri: string): Promise<TrackSummary | null> => {
    try {
      const res = await fetch(`${API_BASE}/tracks/song/${encodeURIComponent(uri)}`);
      if (!res.ok) return null;
      return (await res.json()) as TrackSummary;
    } catch (error) {
      console.error("detail error", error);
      return null;
    }
  }, []);

  const runSearch = React.useCallback(
    async (value?: string) => {
      const term = value ?? query;
      if (term.trim().length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/tracks/search?q=${encodeURIComponent(term)}&limit=20`);
        if (!res.ok) return;
        const data = (await res.json()) as TrackSummary[];
        setResults(data);
      } catch (error) {
        console.error("search error", error);
      } finally {
        setLoading(false);
      }
    },
    [query]
  );

  const handleSelectSuggestion = React.useCallback(
    async (uri: string) => {
      setQuery("");
      setSuggestions([]);
      setLoading(true);
      try {
        const detail = await fetchDetail(uri);
        if (detail) {
          setResults([detail]);
        }
      } finally {
        setLoading(false);
      }
    },
    [fetchDetail]
  );

  return {
    query,
    setQuery,
    suggestions,
    results,
    loading,
    runSearch,
    handleSelectSuggestion,
    fetchDetail
  };
}
