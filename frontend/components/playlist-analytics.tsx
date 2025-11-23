"use client";

import * as React from "react";

import type { DatasetStats } from "@/hooks/useDatasetStats";
import type { TrackSummary } from "@/types/tracks";
import { cn } from "@/lib/utils";

// Props for the main PlaylistAnalytics component
interface PlaylistAnalyticsProps {
  playlistName: string;
  stats: DatasetStats;
  tracks: TrackSummary[];
}

// Genre percentage breakdown for progress bars
interface GenrePercentage {
  name: string;
  percent: number;
}

// Histogram bin for distribution charts
interface HistogramBin {
  label: string;
  count: number;
}

// Breakdown of individual rating components
interface RatingBreakdown {
  label: string;
  description: string;
  score: number;
}

// Utility function to calculate average of an array of numbers
interface PlaylistInsights {
  trackCount: number;
  uniqueArtists: number;
  albumCount: number;
  avgDurationMs: number | null;
  avgTempo: number | null;
  avgPopularity: number | null;
  avgEnergy: number | null;
  avgDanceability: number | null;
  avgValence: number | null;
  moodLabel: string;
  moodSummary: string;
  popularityStory: string;
  valenceStory: string;
  danceStory: string;
  topGenre: { name: string; count: number } | null;
  topSubGenre: { name: string; count: number } | null;
  repeatedArtist: { name: string; count: number } | null;
  repeatedDecade: string | null;
  mainGenres: GenrePercentage[];
  subGenres: GenrePercentage[];
  histograms: {
    popularity: HistogramBin[];
    valence: HistogramBin[];
    danceability: HistogramBin[];
  };
  rating: {
    overall: number;
    breakdown: RatingBreakdown[];
  };
}

// Main component to display playlist analytics
export function PlaylistAnalytics({ playlistName, stats, tracks }: PlaylistAnalyticsProps) {
  const insights = React.useMemo(() => buildPlaylistInsights(stats, tracks), [stats, tracks]);

  if (!insights) {
    return (
      <div className="rounded-2xl border border-white/15 bg-surface/40 p-6 text-white/70">
        <p className="text-sm text-white/60">Sync playlist tracks to unlock detailed analytics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/15 bg-surface/40 p-6 text-white/80">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <PlaylistSummaryCard playlistName={playlistName} insights={insights} />
          <QuickFacts insights={insights} />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <MainGenresCard genres={insights.mainGenres} subGenres={insights.subGenres} />
        <ArtistsSubgenresCard
          topArtists={stats.top_artists}
          topGenres={stats.top_genres}
          avgPopularity={insights.avgPopularity}
          trackCount={insights.trackCount}
        />
      </div>
      <MoodPanel insights={insights} />
      <RatingPanel insights={insights} />
    </div>
  );
}

// Card to display playlist summary and key insights
function PlaylistSummaryCard({ playlistName, insights }: { playlistName: string; insights: PlaylistInsights }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.3rem] text-white/50">Summary</p>
        <h4 className="mt-2 text-2xl font-semibold text-white">{playlistName}</h4>
        <p className="text-sm text-white/60">
          {insights.trackCount} tracks · {insights.albumCount} albums · {insights.uniqueArtists} artists
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <StarRating rating={insights.rating.overall} />
        <p className="text-2xl font-semibold text-white">{insights.rating.overall.toFixed(1)}</p>
        <span className="text-xs text-white/60">curation score</span>
      </div>
      <dl className="space-y-3 text-sm text-white/80">
        <div>
          <dt className="text-xs uppercase tracking-[0.25rem] text-white/40">Playlist mood</dt>
          <dd className="text-white">
            {insights.moodLabel}{" "}
            <span className="text-xs text-white/60">· {insights.moodSummary}</span>
          </dd>
        </div>
        {insights.topGenre && (
          <div>
            <dt className="text-xs uppercase tracking-[0.25rem] text-white/40">Top genre</dt>
            <dd className="text-white">
              {insights.topGenre.name}
              {insights.topSubGenre && insights.topSubGenre.name !== insights.topGenre.name && (
                <span className="text-xs text-white/60"> · {insights.topSubGenre.name}</span>
              )}
            </dd>
          </div>
        )}
        {insights.repeatedArtist && (
          <div>
            <dt className="text-xs uppercase tracking-[0.25rem] text-white/40">Most repeated artist</dt>
            <dd className="text-white">
              {insights.repeatedArtist.name} ({insights.repeatedArtist.count} tracks)
            </dd>
          </div>
        )}
        {insights.repeatedDecade && (
          <div>
            <dt className="text-xs uppercase tracking-[0.25rem] text-white/40">Most repeated decade</dt>
            <dd className="text-white">{insights.repeatedDecade}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

// Card to display quick fact chips and vibe check
function QuickFacts({ insights }: { insights: PlaylistInsights }) {
  const chips = [
    { label: "Avg length", value: insights.avgDurationMs ? formatDuration(insights.avgDurationMs) : "-" },
    { label: "Avg tempo", value: insights.avgTempo ? `${Math.round(insights.avgTempo)} bpm` : "-" },
    {
      label: "Energy vs dance",
      value: `${formatPercent(insights.avgEnergy)} / ${formatPercent(insights.avgDanceability)}`
    },
    { label: "Avg popularity", value: formatScoreLabel(insights.avgPopularity) }
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {chips.map((chip) => (
          <div key={chip.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.25rem] text-white/40">{chip.label}</p>
            <p className="mt-1 text-xl font-semibold text-white">{chip.value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-surface/60 to-accent-teal/20 px-4 py-4 text-sm text-white/80">
        <p className="text-xs uppercase tracking-[0.25rem] text-white/40">Vibe check</p>
        <p className="mt-2 text-white/90">
          {insights.moodSummary} Lean into the {insights.topGenre?.name ?? "main"} energy for cohesive storytelling.
        </p>
      </div>
    </div>
  );
}

// Card to display main genres with progress bars
function MainGenresCard({ genres, subGenres }: { genres: GenrePercentage[]; subGenres: GenrePercentage[] }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-surface/40 p-6 text-white/80">
      <p className="text-xs uppercase tracking-[0.3rem] text-white/50">Main genres</p>
      <div className="mt-4 space-y-3">
        {genres.length === 0 && <p className="text-sm text-white/60">No genre data synced yet.</p>}
        {genres.map((genre) => (
          <div key={genre.name} className="space-y-1 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-white">{genre.name}</span>
              <span className="text-white/60">{genre.percent.toFixed(1)}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/10">
              <div className="h-2 rounded-full bg-accent-teal" style={{ width: `${genre.percent}%` }} />
            </div>
          </div>
        ))}
      </div>
      {subGenres.length > 0 && (
        <div className="mt-5 text-xs text-white/60">
          {subGenres.slice(0, 6).map((genre) => (
            <span key={genre.name} className="mr-3 inline-flex items-center gap-1 rounded-full border border-white/20 px-2 py-1">
              <span className="text-white/80">{genre.name}</span>
              <span>{genre.percent.toFixed(1)}%</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Card to display top artists and subgenres
function ArtistsSubgenresCard({
  topArtists,
  topGenres,
  avgPopularity,
  trackCount
}: {
  topArtists: DatasetStats["top_artists"];
  topGenres: DatasetStats["top_genres"];
  avgPopularity: number | null;
  trackCount: number;
}) {
  const listedArtists = topArtists.slice(0, 8);
  const listedGenres = topGenres.slice(0, 8);
  return (
    <div className="rounded-2xl border border-white/15 bg-surface/40 p-6 text-white/80">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-xs uppercase tracking-[0.3rem] text-white/50">Artists · Subgenres</p>
        <p className="text-xs text-white/50">Avg artist popularity: {formatScoreLabel(avgPopularity)}</p>
      </div>
      <div className="mt-5 grid gap-6 md:grid-cols-2">
        <div>
          <p className="text-sm font-semibold text-white">Top artists</p>
          <ul className="mt-2 space-y-1 text-sm">
            {listedArtists.length === 0 && <li className="text-white/60">No artists to display.</li>}
            {listedArtists.map((artist) => (
              <li key={artist.name} className="flex items-center justify-between border-b border-white/10 py-1">
                <span className="text-white/90">{artist.name}</span>
                <span className="text-xs text-white/60">{artist.count}x</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Top subgenres</p>
          <ul className="mt-2 space-y-1 text-sm">
            {listedGenres.length === 0 && <li className="text-white/60">No genres to display.</li>}
            {listedGenres.map((genre) => (
              <li key={genre.name} className="flex items-center justify-between border-b border-white/10 py-1">
                <span className="text-white/90">{genre.name}</span>
                <span className="text-xs text-white/60">
                  {trackCount ? ((genre.count / trackCount) * 100).toFixed(1) : "0.0"}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// Panel to display mood metrics with histograms
function MoodPanel({ insights }: { insights: PlaylistInsights }) {
  const metrics: Array<{
    key: keyof PlaylistInsights["histograms"];
    label: string;
    value: number | null;
    color: string;
    story: string;
  }> = [
    {
      key: "popularity",
      label: "Popularity",
      value: insights.avgPopularity,
      color: "bg-accent-teal",
      story: insights.popularityStory
    },
    {
      key: "valence",
      label: "Happiness",
      value: insights.avgValence,
      color: "bg-pink-400",
      story: insights.valenceStory
    },
    {
      key: "danceability",
      label: "Danceability",
      value: insights.avgDanceability != null ? insights.avgDanceability * 100 : null,
      color: "bg-red-400",
      story: insights.danceStory
    }
  ];

  return (
    <div className="rounded-2xl border border-white/15 bg-surface/40 p-6 text-white/80">
      <p className="text-xs uppercase tracking-[0.3rem] text-white/50">Overall mood</p>
      <div className="mt-4 grid gap-6 lg:grid-cols-3">
        {metrics.map((metric) => (
          <div key={metric.key} className="flex flex-col gap-3">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">{metric.label}</p>
                <span className="text-sm text-white/80">{formatScoreLabel(metric.value)}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-white/10">
                <div
                  className={cn("h-2 rounded-full", metric.color)}
                  style={{ width: `${Math.min(100, Math.max(0, metric.value ?? 0))}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-white/60">{metric.story}</p>
            </div>
            <Histogram bins={insights.histograms[metric.key]} colorClass={metric.color} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Histogram component to display distribution of values
function Histogram({ bins, colorClass }: { bins: HistogramBin[]; colorClass: string }) {
  const maxCount = Math.max(...bins.map((bin) => bin.count), 1);
  return (
    <div className="flex gap-1">
      {bins.map((bin) => (
        <div key={bin.label} className="flex-1">
          <div className="flex h-24 flex-col justify-end rounded bg-white/5">
            <div
              className={cn("w-full rounded-t", colorClass)}
              style={{ height: `${maxCount ? Math.max((bin.count / maxCount) * 100, 4) : 0}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] text-white/50">{bin.label}</p>
        </div>
      ))}
    </div>
  );
}

// Panel to display overall rating and breakdown
function RatingPanel({ insights }: { insights: PlaylistInsights }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-surface/40 p-6 text-white/80">
      <p className="text-xs uppercase tracking-[0.3rem] text-white/50">Overall rating</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <StarRating rating={insights.rating.overall} size="lg" />
        <p className="text-3xl font-semibold text-white">{insights.rating.overall.toFixed(1)}</p>
      </div>
      <div className="mt-4 space-y-3 text-sm">
        {insights.rating.breakdown.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">{item.label} rating</span>
              <span className="text-white/70">{item.score.toFixed(1)}</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-white/10">
              <div className="h-2 rounded-full bg-accent-teal" style={{ width: `${(item.score / 5) * 100}%` }} />
            </div>
            <p className="text-xs text-white/60">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// StarRating component to display rating out of 5 with partial stars
function StarRating({ rating, size = "base" }: { rating: number; size?: "base" | "lg" }) {
  const normalized = clamp(rating, 0, 5);
  const stars = Array.from({ length: 5 }, (_, index) => Math.max(0, Math.min(1, normalized - index)));
  return (
    <div className="flex items-center gap-1">
      {stars.map((fraction, index) => (
        <Star key={`star-${index}`} fillFraction={fraction} size={size} />
      ))}
    </div>
        
  );
}

// Star component with partial fill based on fillFraction
function Star({ fillFraction, size }: { fillFraction: number; size: "base" | "lg" }) {
  const gradientId = React.useId();
  const dimension = size === "lg" ? 28 : 20;
  return (
    <svg
      className="text-accent-lime"
      width={dimension}
      height={dimension}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId}>
          <stop offset={`${fillFraction * 100}%`} stopColor="#a0f075" />
          <stop offset={`${fillFraction * 100}%`} stopColor="transparent" />
        </linearGradient>
      </defs>
      <path
        d="M12 2.5l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 16.9l-5.5 2.8 1-6.2-4.5-4.4 6.2-.9L12 2.5z"
        fill={`url(#${gradientId})`}
        stroke="#a0f075"
        strokeWidth="1"
      />
    </svg>
  );
}

// Format duration in milliseconds to MM:SS
function formatDuration(ms: number) {
  if (!ms) return "-";
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// Format a decimal value as a percentage
function formatPercent(value: number | null | undefined) {
  if (typeof value !== "number") return "—";
  return `${Math.round(value * 100)}%`;
}

// Format a score out of 100
function formatScoreLabel(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return `${Math.round(value)}/100`;
}

// Clamp a number between min and max
function clamp(value: number, min = 0, max = 5) {
  return Math.min(max, Math.max(min, value));
}

// Create histogram bins from an array of numeric values
function histogramFromValues(values: number[]): HistogramBin[] {
  const bins = Array.from({ length: 10 }, (_, index) => ({
    label: `${index * 10}-${index * 10 + 9}`,
    count: 0
  }));
  values.forEach((value) => {
    const safeValue = Math.max(0, Math.min(99, value));
    const index = Math.min(9, Math.floor(safeValue / 10));
    bins[index].count += 1;
  });
  return bins;
}

// Define major genre groups with associated keywords 
const MAJOR_GENRE_GROUPS: Array<{ label: string; keywords: string[] }> = [
  { label: "Rock", keywords: ["rock", "punk", "metal", "shoegaze", "psychedelic"] },
  { label: "Electronic", keywords: ["electronic", "edm", "house", "techno", "synth"] },
  { label: "Pop", keywords: ["pop", "dance pop", "k-pop"] },
  { label: "Hip hop", keywords: ["hip hop", "rap", "trap"] },
  { label: "R&B", keywords: ["r&b", "soul", "funk"] },
  { label: "Jazz", keywords: ["jazz", "swing", "bebop"] },
  { label: "Classical", keywords: ["classical", "orchestra", "symphony"] },
  { label: "Folk", keywords: ["folk", "acoustic", "singer-songwriter"] },
  { label: "World", keywords: ["latin", "afro", "reggae", "world"] }
];

// Map detailed genre names to main genre categories
function mapToMainGenre(name: string) {
  const normalized = name.toLowerCase();
  for (const group of MAJOR_GENRE_GROUPS) {
    if (group.keywords.some((keyword) => normalized.includes(keyword))) {
      return group.label;
    }
  }
  return name.split(" ").slice(-1).join(" ") || name;
}

// Compute main and subgenre breakdowns
function computeGenreBreakdown(items: DatasetStats["top_genres"]) {
  if (!items.length) return { mainGenres: [], subGenres: [] };
  const total = items.reduce((sum, item) => sum + item.count, 0) || 1;
  const aggregates = new Map<string, number>();
  for (const item of items) {
    const main = mapToMainGenre(item.name);
    aggregates.set(main, (aggregates.get(main) ?? 0) + item.count);
  }
  const mainGenres = Array.from(aggregates.entries())
    .map(([name, count]) => ({ name, percent: (count / total) * 100 }))
    .sort((a, b) => b.percent - a.percent);

  const subGenres = items
    .map((item) => ({
      name: item.name,
      percent: (item.count / total) * 100
    }))
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 12);

  return { mainGenres, subGenres };
}

// Find the most common decade from track release years
function findMostCommonDecade(tracks: TrackSummary[]): string | null {
  const counts: Record<string, number> = {};
  tracks.forEach((track) => {
    if (track.release_year) {
      const decade = `${Math.floor(track.release_year / 10) * 10}s`;
      counts[decade] = (counts[decade] ?? 0) + 1;
    }
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] ?? null;
}

// Generate mood description based on energy, danceability, and valence
function describeMood(energy: number | null, dance: number | null, valence: number | null) {
  const descriptors: string[] = [];
  if (energy != null) {
    descriptors.push(energy > 0.65 ? "Energetic" : energy < 0.4 ? "Laid-back" : "Steady");
  }
  if (dance != null) {
    descriptors.push(dance > 0.6 ? "Groovy" : dance < 0.35 ? "Introspective" : "Balanced");
  }
  if (valence != null) {
    descriptors.push(valence > 0.6 ? "Bright" : valence < 0.35 ? "Moody" : "Reflective");
  }
  const label =
    descriptors.length >= 2 ? `${descriptors[0]} & ${descriptors[1]}` : descriptors[0] ?? "Eclectic";
  const summary = `Energy ${formatPercent(energy)} · Dance ${formatPercent(dance)} · Positivity ${formatPercent(
    valence
  )}`;
  return { label, summary };
}

// Generate a story based on metric value
function describeMetricStory(label: string, value: number | null | undefined) {
  if (value == null) return `Not enough data for ${label.toLowerCase()} yet.`;
  if (value >= 70) return `This playlist leans into very ${label.toLowerCase()} selections.`;
  if (value >= 55) return `Plenty of ${label.toLowerCase()} moments with room for contrast.`;
  if (value >= 35) return `A balanced mix keeps ${label.toLowerCase()} levels in check.`;
  return `Mostly subtle ${label.toLowerCase()} picks — ideal for deep listening.`;
}

// Compute the overall rating and breakdown
function computeRating(trackCount: number, uniqueArtists: number, topGenres: DatasetStats["top_genres"], avgPop: number | null) {
  if (!trackCount) {
    return {
      overall: 0,
      breakdown: []
    };
  }
  const artistScore = clamp((uniqueArtists / trackCount) * 5, 1, 5);
  const uniqueGenreCount = topGenres.length;
  const varietyTarget = Math.max(4, Math.round(trackCount / 12));
  const diversityRatio = Math.min(uniqueGenreCount / varietyTarget, 1.2);
  const genreScore = clamp(1 + diversityRatio * 4, 1, 5);
  const popularity = avgPop ?? 55;
  const popularityScore = clamp(5 - Math.abs(popularity - 55) / 12, 1, 5);
  const lengthScore = clamp(Math.min(trackCount / 50, 1) * 5, 1, 5);

  const breakdown: RatingBreakdown[] = [
    {
      label: "Artists",
      description: "Aim for one hero track per artist to keep the playlist surprising.",
      score: artistScore
    },
    {
      label: "Genres",
      description: "Stack diverse genres to create surprising transitions and discoveries.",
      score: genreScore
    },
    {
      label: "Popularity",
      description: "Blend familiar picks with left-field cues for discovery.",
      score: popularityScore
    },
    {
      label: "Length",
      description: "50+ tracks help a playlist feel like a journey.",
      score: lengthScore
    }
  ];

  const overall = breakdown.reduce((sum, item) => sum + item.score, 0) / breakdown.length;
  return { overall: clamp(overall, 1, 5), breakdown };
}

// Main function to build playlist insights
function buildPlaylistInsights(stats: DatasetStats, tracks: TrackSummary[]): PlaylistInsights | null {
  const trackCount = stats.totals.total_rows || tracks.length;
  if (!trackCount) return null;
  const uniqueArtists = stats.totals.unique_artists ?? 0;
  const albums = new Set(tracks.map((track) => track.album_name ?? track.track_uri));
  const avgDurationMs = average(tracks.map((track) => track.duration_ms).filter(isNumber)) ?? null;
  const avgTempo = average(tracks.map((track) => track.tempo).filter(isNumber)) ?? null;
  const avgValenceRaw = average(tracks.map((track) => track.valence).filter(isNumber));
  const avgValence = avgValenceRaw != null ? avgValenceRaw * 100 : null;
  const avgEnergy = stats.totals.average_energy ?? average(tracks.map((track) => track.energy).filter(isNumber)) ?? null;
  const avgDanceability =
    stats.totals.average_danceability ?? average(tracks.map((track) => track.danceability).filter(isNumber)) ?? null;
  const avgPopularity =
    stats.totals.average_popularity ?? average(tracks.map((track) => track.popularity).filter(isNumber)) ?? null;
  const popularityValues = tracks.map((track) => track.popularity).filter(isNumber);
  const valenceValues = tracks.map((track) => (track.valence != null ? track.valence * 100 : null)).filter(isNumber);
  const danceValues = tracks
    .map((track) => (track.danceability != null ? track.danceability * 100 : null))
    .filter(isNumber);
  const histograms = {
    popularity: histogramFromValues(popularityValues),
    valence: histogramFromValues(valenceValues),
    danceability: histogramFromValues(danceValues)
  };
  const repeatedArtist = stats.top_artists[0] ?? null;
  const repeatedDecade = findMostCommonDecade(tracks);
  const topGenre = stats.top_genres[0] ?? null;
  const topSubGenre = stats.top_genres.find((genre) => genre.name !== topGenre?.name) ?? topGenre ?? null;
  const { mainGenres, subGenres } = computeGenreBreakdown(stats.top_genres);
  const rating = computeRating(trackCount, uniqueArtists, stats.top_genres, avgPopularity);
  const mood = describeMood(avgEnergy, avgDanceability, avgValence != null ? avgValence / 100 : null);

  return {
    trackCount,
    uniqueArtists,
    albumCount: albums.size || trackCount,
    avgDurationMs,
    avgTempo,
    avgPopularity,
    avgEnergy,
    avgDanceability,
    avgValence,
    moodLabel: mood.label,
    moodSummary: mood.summary,
    popularityStory: describeMetricStory("Popularity", avgPopularity),
    valenceStory: describeMetricStory("Happiness", avgValence),
    danceStory: describeMetricStory("Danceability", avgDanceability != null ? avgDanceability * 100 : null),
    topGenre,
    topSubGenre,
    repeatedArtist,
    repeatedDecade,
    mainGenres,
    subGenres,
    histograms,
    rating
  };
}

// Utility to compute the average of an array of numbers, ignoring null/undefined
function average(values: Array<number | null | undefined>) {
  const filtered = values.filter((value): value is number => typeof value === "number");
  if (!filtered.length) return null;
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

// Type guard to check if a value is a finite number
function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
