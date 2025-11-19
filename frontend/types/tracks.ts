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
}

export interface Recommendation extends TrackSummary {
  similarity: number;
  components?: Record<string, number> | null;
}
