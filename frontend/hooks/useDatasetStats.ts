import * as React from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface ReleaseYearRange {
  min?: number | null;
  max?: number | null;
}

interface StatsTotals {
  total_rows: number;
  unique_tracks: number;
  unique_artists: number;
  average_popularity?: number | null;
  average_danceability?: number | null;
  average_energy?: number | null;
  release_year_range: ReleaseYearRange | null;
}

interface CountStat {
  name: string;
  count: number;
}

interface YearlyCount {
  year: number;
  count: number;
}

interface RawTopTrack {
  ["Track URI"]: string;
  ["Track Name"]?: string | null;
  ["Artist Name(s)"]?: string | null;
  Popularity?: number | null;
}

interface RawStatsResponse {
  totals: StatsTotals;
  top_artists: CountStat[];
  top_genres: CountStat[];
  yearly_release_counts: YearlyCount[];
  top_tracks: RawTopTrack[];
}

interface TopTrack {
  track_uri: string;
  track_name: string | null;
  artist_names: string | null;
  popularity: number | null;
}

export interface DatasetStats {
  totals: StatsTotals;
  top_artists: CountStat[];
  top_genres: CountStat[];
  yearly_release_counts: YearlyCount[];
  top_tracks: TopTrack[];
}

function normalizeTopTracks(rows: RawTopTrack[]): TopTrack[] {
  return rows
    .map((row) => {
      const uri = row["Track URI"];
      if (!uri) {
        return null;
      }
      return {
        track_uri: uri,
        track_name: row["Track Name"] ?? null,
        artist_names: row["Artist Name(s)"] ?? null,
        popularity: row.Popularity ?? null
      };
    })
    .filter((row): row is TopTrack => row !== null);
}

export function useDatasetStats() {
  const [stats, setStats] = React.useState<DatasetStats | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/tracks/stats`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load stats");
      }
      const payload = (await response.json()) as RawStatsResponse;
      setStats({
        totals: payload.totals,
        top_artists: payload.top_artists ?? [],
        top_genres: payload.top_genres ?? [],
        yearly_release_counts: payload.yearly_release_counts ?? [],
        top_tracks: normalizeTopTracks(payload.top_tracks ?? [])
      });
    } catch (err) {
      setStats(null);
      setError(err instanceof Error ? err.message : "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    stats,
    loading,
    error,
    refresh
  };
}
