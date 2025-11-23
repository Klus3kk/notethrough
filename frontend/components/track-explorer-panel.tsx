"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ExplorerFilters, ExplorerResult } from "@/hooks/useTrackExplorer";
import { useTrackExplorer } from "@/hooks/useTrackExplorer";

export function TrackExplorerPanel() {
  const { query, setQuery, filters, updateFilters, resetFilters, results, loading, error, search } = useTrackExplorer();

  const filterChips = React.useMemo(() => buildFilterChips(filters), [filters]);

  return (
    <section className="panel space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-semibold text-foreground">Universal track explorer</h3>
          <p className="text-sm text-white/70">
            Search the catalog, apply audio-feature filters, and sort by the vibe you need.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={resetFilters} disabled={loading}>
            Reset filters
          </Button>
          <Button onClick={search} disabled={loading}>
            {loading ? "Searching…" : "Search"}
          </Button>
        </div>
      </div>
      <Input
        value={query}
        placeholder="Search tracks, artists, albums"
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void search();
          }
        }}
      />
      <AdvancedFilters filters={filters} updateFilters={updateFilters} />
      {filterChips.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs text-white/70">
          {filterChips.map((chip) => (
            <span key={chip} className="rounded-full border border-white/20 px-3 py-1">
              {chip}
            </span>
          ))}
        </div>
      )}
      {error && <p className="text-sm text-red-300">{error}</p>}
      <div className="space-y-2 text-sm text-white/70">
        <p>
          Showing {results.length} tracks · Sorted by {formatSortLabel(filters.sortBy)}
        </p>
        <div className="divide-y divide-white/10 border border-white/15">
          {results.length === 0 && !loading && <p className="p-4 text-white/60">Start searching to explore the dataset.</p>}
          {loading && <p className="p-4 text-white/60">Scanning millions of rows for the perfect matches…</p>}
          {results.map((track) => (
            <ExplorerResultRow key={track.track_uri} track={track} />
          ))}
        </div>
      </div>
    </section>
  );
}

function AdvancedFilters({
  filters,
  updateFilters
}: {
  filters: ExplorerFilters;
  updateFilters: <K extends keyof ExplorerFilters>(key: K, value: ExplorerFilters[K]) => void;
}) {
  const numberHandler =
    (key: keyof ExplorerFilters) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value;
      if (raw === "") {
        updateFilters(key, null as ExplorerFilters[typeof key]);
        return;
      }
      const parsed = Number(raw);
      updateFilters(key, (Number.isFinite(parsed) ? parsed : null) as ExplorerFilters[typeof key]);
    };

  return (
    <div className="rounded-2xl border border-white/15 bg-surface/40 p-4 text-white/80">
      <div className="grid gap-4 md:grid-cols-3">
        <FilterField label="Genre contains">
          <Input
            value={filters.genreTerm}
            placeholder="e.g. art rock"
            onChange={(event) => updateFilters("genreTerm", event.target.value)}
          />
        </FilterField>
        <FilterField label="Popularity range">
          <div className="flex gap-2">
            <Input
              type="number"
              min={0}
              max={100}
              placeholder="Min"
              value={filters.minPopularity ?? ""}
              onChange={numberHandler("minPopularity")}
            />
            <Input
              type="number"
              min={0}
              max={100}
              placeholder="Max"
              value={filters.maxPopularity ?? ""}
              onChange={numberHandler("maxPopularity")}
            />
          </div>
        </FilterField>
        <FilterField label="Release window">
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="From"
              value={filters.minYear ?? ""}
              onChange={numberHandler("minYear")}
            />
            <Input
              type="number"
              placeholder="To"
              value={filters.maxYear ?? ""}
              onChange={numberHandler("maxYear")}
            />
          </div>
        </FilterField>
        <FilterField label="Energy focus">
          <select
            value={filters.energyProfile}
            onChange={(event) => updateFilters("energyProfile", event.target.value as ExplorerFilters["energyProfile"])}
            className="w-full rounded border border-white/20 bg-surface/70 px-3 py-2 text-sm text-white/80"
          >
            <option value="any">Any</option>
            <option value="calm">Calm / low</option>
            <option value="steady">Steady</option>
            <option value="high">High impact</option>
          </select>
        </FilterField>
        <FilterField label="Dance floor">
          <select
            value={filters.danceProfile}
            onChange={(event) => updateFilters("danceProfile", event.target.value as ExplorerFilters["danceProfile"])}
            className="w-full rounded border border-white/20 bg-surface/70 px-3 py-2 text-sm text-white/80"
          >
            <option value="any">Any</option>
            <option value="chill">Chill</option>
            <option value="club">Club ready</option>
          </select>
        </FilterField>
        <FilterField label="Mood">
          <select
            value={filters.vibeProfile}
            onChange={(event) => updateFilters("vibeProfile", event.target.value as ExplorerFilters["vibeProfile"])}
            className="w-full rounded border border-white/20 bg-surface/70 px-3 py-2 text-sm text-white/80"
          >
            <option value="any">Any</option>
            <option value="moody">Moody / introspective</option>
            <option value="uplifting">Uplifting</option>
          </select>
        </FilterField>
        <FilterField label="Sort by">
          <select
            value={filters.sortBy}
            onChange={(event) => updateFilters("sortBy", event.target.value as ExplorerFilters["sortBy"])}
            className="w-full rounded border border-white/20 bg-surface/70 px-3 py-2 text-sm text-white/80"
          >
            <option value="relevance">Match score</option>
            <option value="popularity">Popularity</option>
            <option value="release_year">Release year</option>
            <option value="energy">Energy</option>
            <option value="danceability">Danceability</option>
          </select>
        </FilterField>
      </div>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-sm text-white/70">
      <span className="mb-1 block text-xs uppercase tracking-[0.25rem] text-white/40">{label}</span>
      {children}
    </label>
  );
}

function ExplorerResultRow({ track }: { track: ExplorerResult }) {
  const genres = track.genres?.slice(0, 3) ?? [];
  return (
    <div className="grid gap-4 px-4 py-4 text-white/80 md:grid-cols-[1.6fr_1.4fr]">
      <div>
        <p className="text-lg font-semibold text-white">{track.track_name}</p>
        <p className="text-xs text-white/60">{track.artist_names ?? "Unknown artist"}</p>
        <p className="text-xs text-white/50">{track.album_name ?? "—"}</p>
        <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
          {genres.length === 0 && <span className="text-white/40">No genre tags</span>}
          {genres.map((genre) => (
            <span key={`${track.track_uri}-${genre}`} className="rounded-full border border-white/20 px-2 py-0.5 text-white/70">
              {genre}
            </span>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-white/60">
        <MetricPill label="Match" value={`${track.matchScore}%`} intent={getMatchIntent(track.matchScore)} />
        <MetricPill label="Popularity" value={track.popularity != null ? `${track.popularity}` : "—"} />
        <MetricPill label="Energy" value={formatFeaturePercent(track.energy)} />
        <MetricPill label="Dance" value={formatFeaturePercent(track.danceability)} />
        <MetricPill label="Vibe" value={formatFeaturePercent(track.valence)} />
        <MetricPill label="Year" value={track.release_year ?? "—"} />
      </div>
    </div>
  );
}

function MetricPill({ label, value, intent = "neutral" }: { label: string; value: string | number; intent?: "neutral" | "positive" | "warning" }) {
  const palette: Record<string, string> = {
    neutral: "border-white/20 text-white/70",
    positive: "border-accent-lime/40 text-accent-lime",
    warning: "border-accent-coral/40 text-accent-coral"
  };
  return (
    <span className={`flex items-center gap-1 rounded-full border px-3 py-1 ${palette[intent] ?? palette.neutral}`}>
      <span className="text-[10px] uppercase tracking-[0.2rem] text-white/40">{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}

function buildFilterChips(filters: ExplorerFilters) {
  const chips: string[] = [];
  if (filters.genreTerm.trim()) chips.push(`Genre ~ ${filters.genreTerm.trim()}`);
  const popMin = filters.minPopularity ?? 0;
  const popMax = filters.maxPopularity ?? 100;
  if (popMin !== 0 || popMax !== 100) chips.push(`Popularity ${popMin}-${popMax}`);
  if (filters.minYear || filters.maxYear) {
    const from = filters.minYear ?? "any";
    const to = filters.maxYear ?? "now";
    chips.push(`Years ${from}-${to}`);
  }
  if (filters.energyProfile !== "any") chips.push(`Energy: ${filters.energyProfile}`);
  if (filters.danceProfile !== "any") chips.push(`Dance: ${filters.danceProfile}`);
  if (filters.vibeProfile !== "any") chips.push(`Mood: ${filters.vibeProfile}`);
  return chips;
}

function formatFeaturePercent(value?: number | null) {
  if (typeof value !== "number") return "—";
  return `${Math.round(value * 100)}%`;
}

function getMatchIntent(score: number) {
  if (score >= 80) return "positive";
  if (score >= 60) return "neutral";
  return "warning";
}

function formatSortLabel(sortBy: ExplorerFilters["sortBy"]) {
  switch (sortBy) {
    case "popularity":
      return "popularity";
    case "release_year":
      return "release year";
    case "energy":
      return "energy";
    case "danceability":
      return "danceability";
    default:
      return "match score";
  }
}
