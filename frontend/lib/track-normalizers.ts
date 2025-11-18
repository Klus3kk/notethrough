import type { Recommendation, TrackSummary } from "@/types/tracks";

function pick<T>(value: T | null | undefined, fallback: T): T {
  return value === undefined || value === null || value === "" ? fallback : value;
}

export function normalizeTrackSummary(raw: Record<string, any>): TrackSummary {
  return {
    track_uri: pick(raw.track_uri ?? raw["Track URI"], ""),
    track_name: pick(raw.track_name ?? raw["Track Name"], "Unknown track"),
    artist_names: raw.artist_names ?? raw["Artist Name(s)"] ?? "Unknown artist",
    album_name: raw.album_name ?? raw["Album Name"] ?? null,
    release_year: raw.release_year ?? raw["Release Year"] ?? null,
    genres: raw.genres ?? raw["Genres"] ?? [],
    popularity: raw.popularity ?? raw["Popularity"] ?? null,
    duration_ms: raw.duration_ms ?? raw["Duration (ms)"] ?? null,
    explicit: raw.explicit ?? raw["Explicit"] ?? null,
    danceability: raw.danceability ?? raw["Danceability"] ?? null,
    energy: raw.energy ?? raw["Energy"] ?? null,
    valence: raw.valence ?? raw["Valence"] ?? null,
    tempo: raw.tempo ?? raw["Tempo"] ?? null
  };
}

export function normalizeRecommendation(raw: Record<string, any>): Recommendation {
  const summary = normalizeTrackSummary(raw);
  let similarity = 0;
  if (typeof raw.similarity === "number") {
    similarity = raw.similarity;
  } else if (typeof raw.similarity === "string") {
    const parsed = parseFloat(raw.similarity);
    similarity = Number.isNaN(parsed) ? 0 : parsed;
  }
  return {
    ...summary,
    similarity,
    components: (raw.components ?? null) as Record<string, number> | null
  };
}
