import * as React from "react";

import type { TrackSummary } from "@/types/tracks";
import { normalizeTrackSummary } from "@/lib/track-normalizers";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type EnergyProfile = "any" | "calm" | "steady" | "high";
type DanceProfile = "any" | "chill" | "club";
type VibeProfile = "any" | "moody" | "uplifting";
type SortBy = "relevance" | "popularity" | "release_year" | "energy" | "danceability";

export interface ExplorerFilters {
  genreTerm: string;
  minPopularity: number | null;
  maxPopularity: number | null;
  minYear: number | null;
  maxYear: number | null;
  energyProfile: EnergyProfile;
  danceProfile: DanceProfile;
  vibeProfile: VibeProfile;
  sortBy: SortBy;
}

export interface ExplorerResult extends TrackSummary {
  matchScore: number;
}

const energyRanges: Record<Exclude<EnergyProfile, "any">, { min: number; max: number }> = {
  calm: { min: 0, max: 0.45 },
  steady: { min: 0.45, max: 0.7 },
  high: { min: 0.7, max: 1 }
};

const danceRanges: Record<Exclude<DanceProfile, "any">, { min: number; max: number }> = {
  chill: { min: 0, max: 0.5 },
  club: { min: 0.6, max: 1 }
};

const vibeRanges: Record<Exclude<VibeProfile, "any">, { min: number; max: number }> = {
  moody: { min: 0, max: 0.45 },
  uplifting: { min: 0.55, max: 1 }
};

const createDefaultFilters = (): ExplorerFilters => ({
  genreTerm: "",
  minPopularity: null,
  maxPopularity: null,
  minYear: null,
  maxYear: null,
  energyProfile: "any",
  danceProfile: "any",
  vibeProfile: "any",
  sortBy: "relevance"
});

export function useTrackExplorer() {
  const [query, setQuery] = React.useState("");
  const [filters, setFilters] = React.useState<ExplorerFilters>(() => createDefaultFilters());
  const [results, setResults] = React.useState<ExplorerResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const updateFilters = React.useCallback(<K extends keyof ExplorerFilters>(key: K, value: ExplorerFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = React.useCallback(() => {
    setFilters(createDefaultFilters());
  }, []);

  const search = React.useCallback(async () => {
    if (query.trim().length < 2) {
      setResults([]);
      setError("Enter at least two characters to start searching.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/tracks/search?q=${encodeURIComponent(query.trim())}&limit=100`, {
        cache: "no-store"
      });
      if (!res.ok) throw new Error("Search failed");
      const data = (await res.json()) as Record<string, any>[];
      const normalized = data.map((item) => normalizeTrackSummary(item));
      const scored = normalized.map((track) => ({
        ...track,
        matchScore: computeMatchScore(track, filters)
      }));
      const filtered = scored.filter((track) => trackMatchesFilters(track, filters));
      const sorted = sortExplorerResults(filtered, filters.sortBy);
      setResults(sorted.slice(0, 80));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, [query, filters]);

  return {
    query,
    setQuery,
    filters,
    updateFilters,
    resetFilters,
    results,
    loading,
    error,
    search
  };
}

function trackMatchesFilters(track: TrackSummary, filters: ExplorerFilters) {
  const popMin = filters.minPopularity ?? 0;
  const popMax = filters.maxPopularity ?? 100;
  const popularity = track.popularity ?? 0;
  if (popularity < popMin || popularity > popMax) return false;

  if (filters.genreTerm) {
    const genreMatch = (track.genres ?? []).some((genre) => genre.toLowerCase().includes(filters.genreTerm.toLowerCase()));
    if (!genreMatch) return false;
  }

  if (filters.minYear && (track.release_year ?? Number.NEGATIVE_INFINITY) < filters.minYear) {
    return false;
  }
  if (filters.maxYear && (track.release_year ?? Number.POSITIVE_INFINITY) > filters.maxYear) {
    return false;
  }

  if (filters.energyProfile !== "any") {
    const energy = track.energy;
    const range = energyRanges[filters.energyProfile];
    if (energy == null || energy < range.min || energy > range.max) {
      return false;
    }
  }

  if (filters.danceProfile !== "any") {
    const dance = track.danceability;
    const range = danceRanges[filters.danceProfile];
    if (dance == null || dance < range.min || dance > range.max) {
      return false;
    }
  }

  if (filters.vibeProfile !== "any") {
    const valence = track.valence;
    const range = vibeRanges[filters.vibeProfile];
    if (valence == null || valence < range.min || valence > range.max) {
      return false;
    }
  }

  return true;
}

function computeMatchScore(track: TrackSummary, filters: ExplorerFilters) {
  let score = 25;
  const popularity = track.popularity ?? 0;
  const popMin = filters.minPopularity ?? 0;
  const popMax = filters.maxPopularity ?? 100;
  if (popularity >= popMin && popularity <= popMax) {
    score += 15;
  }
  score += Math.min(30, popularity / 3);

  if (filters.genreTerm) {
    const match = (track.genres ?? []).some((genre) => genre.toLowerCase().includes(filters.genreTerm.toLowerCase()));
    score += match ? 20 : -5;
  }

  if (filters.minYear || filters.maxYear) {
    const within =
      track.release_year != null &&
      (filters.minYear ? track.release_year >= filters.minYear : true) &&
      (filters.maxYear ? track.release_year <= filters.maxYear : true);
    score += within ? 10 : -5;
  }

  if (filters.energyProfile !== "any" && track.energy != null) {
    const range = energyRanges[filters.energyProfile];
    if (track.energy >= range.min && track.energy <= range.max) {
      score += 10;
    }
  }

  if (filters.danceProfile !== "any" && track.danceability != null) {
    const range = danceRanges[filters.danceProfile];
    if (track.danceability >= range.min && track.danceability <= range.max) {
      score += 8;
    }
  }

  if (filters.vibeProfile !== "any" && track.valence != null) {
    const range = vibeRanges[filters.vibeProfile];
    if (track.valence >= range.min && track.valence <= range.max) {
      score += 8;
    }
  }

  return Math.max(10, Math.min(100, Math.round(score)));
}

function sortExplorerResults(results: ExplorerResult[], sortBy: SortBy) {
  const sorted = [...results];
  if (sortBy === "relevance") {
    sorted.sort((a, b) => b.matchScore - a.matchScore);
    return sorted;
  }

  const metricKey: Partial<Record<SortBy, keyof TrackSummary>> = {
    popularity: "popularity",
    release_year: "release_year",
    energy: "energy",
    danceability: "danceability"
  };

  const key = metricKey[sortBy];
  if (key) {
    sorted.sort((a, b) => {
      const aVal = (a[key] as number | null | undefined) ?? 0;
      const bVal = (b[key] as number | null | undefined) ?? 0;
      return (bVal as number) - (aVal as number);
    });
  }

  return sorted;
}
