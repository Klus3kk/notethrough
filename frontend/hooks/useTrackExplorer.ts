import * as React from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface ExplorerTrack {
  track_uri: string;
  track_name: string;
  artist_names?: string | null;
  album_name?: string | null;
  release_year?: number | null;
  genres?: string[];
  popularity?: number | null;
}

export function useTrackExplorer() {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<ExplorerTrack[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const search = React.useCallback(async () => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/tracks/search?q=${encodeURIComponent(query.trim())}&limit=50`, {
        cache: "no-store"
      });
      if (!res.ok) throw new Error("Search failed");
      const data = (await res.json()) as ExplorerTrack[];
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, [query]);

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    search
  };
}
