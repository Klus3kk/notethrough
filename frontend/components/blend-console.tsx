"use client";

import { useBlendStudio } from "@/hooks/useBlendStudio";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { TrackSummary } from "@/hooks/useBlendStudio";
import { EffectPreview } from "@/components/effect-preview";
import { RecommendationsPanel } from "@/components/recommendations-panel";
import { FeatureRoadmap } from "@/components/feature-roadmap";
import { cn } from "@/lib/utils";

export function BlendConsole() {
  const { query, setQuery, results, seeds, recommendations, state, error, runSearch, toggleSeed } = useBlendStudio();

  return (
    <section className="grid gap-14 lg:grid-cols-[1.25fr_0.85fr]" id="explore">
      <div className="space-y-10">
        <div className="panel space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.4rem] text-white/50">Search</p>
              <p className="text-base text-white/80">Use at least two characters and select tracks as seeds.</p>
            </div>
            <Button variant="secondary" onClick={runSearch} disabled={state === "searching"}>
              {state === "searching" ? "Searching…" : "Search"}
            </Button>
          </div>
          <Input
            value={query}
            placeholder="Search tracks, artists, albums"
            className="border-0 bg-surface px-4 py-3 text-white"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void runSearch();
              }
            }}
          />
          {error && <p className="text-sm text-red-300">{error}</p>}
        </div>
        <SeedTray seeds={seeds} onRemove={(track) => toggleSeed(track)} />
        <ResultsList results={results} seeds={seeds} toggleSeed={toggleSeed} state={state} />
      </div>
      <div className="space-y-10">
        <EffectPreview seeds={seeds} />
        <RecommendationsPanel recommendations={recommendations} state={state} hasSeeds={seeds.length > 0} />
        <FeatureRoadmap />
      </div>
    </section>
  );
}

function SeedTray({ seeds, onRemove }: { seeds: TrackSummary[]; onRemove: (track: TrackSummary) => void }) {
  return (
    <div className="panel space-y-3 p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm uppercase tracking-[0.3rem] text-white/60">Seeds</p>
        <span className="text-xs text-white/60">{seeds.length}/3</span>
      </div>
      {seeds.length === 0 ? (
        <p className="text-sm text-white/70">No seeds yet. Click a search result to add one.</p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {seeds.map((seed) => (
            <button
              key={seed.track_uri}
              className="rounded border border-white/20 px-3 py-2 text-left text-sm text-white/80 hover:border-white/60"
              onClick={() => onRemove(seed)}
            >
              <div className="font-semibold text-white">{seed.track_name}</div>
              <div className="text-xs text-white/60">{seed.artist_names ?? "Unknown"}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ResultsList({
  results,
  seeds,
  toggleSeed,
  state
}: {
  results: TrackSummary[];
  seeds: TrackSummary[];
  toggleSeed: (track: TrackSummary) => void;
  state: "idle" | "searching" | "blending";
}) {
  return (
    <div className="panel space-y-3 p-0">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-sm text-white/60">
        <span>Results</span>
        <span>{state === "searching" ? "Loading…" : `${results.length} tracks`}</span>
      </div>
      <div className="divide-y divide-white/10">
        {results.length === 0 && <p className="p-4 text-sm text-white/60">No matches yet.</p>}
        {results.map((track) => {
          const active = seeds.some((seed) => seed.track_uri === track.track_uri);
          return (
            <button
              key={track.track_uri}
              onClick={() => toggleSeed(track)}
              className={cn(
                "flex w-full items-center justify-between px-4 py-3 text-left text-sm text-white/80 transition hover:bg-white/5",
                active && "bg-white/10 text-white"
              )}
            >
              <div>
                <div className="font-semibold text-white">{track.track_name}</div>
                <div className="text-xs text-white/60">{track.artist_names ?? "Unknown"}</div>
              </div>
              <div className="text-xs text-white/50">{track.release_year ?? "—"}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
