"use client";

import { useBlendStudio } from "@/hooks/useBlendStudio";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { TrackSummary } from "@/types/tracks";
import { EffectPreview } from "@/components/effect-preview";
import { RecommendationsPanel } from "@/components/recommendations-panel";
import { cn } from "@/lib/utils";

export function BlendConsole() {
  const { query, setQuery, results, seeds, recommendations, state, error, runSearch, toggleSeed } = useBlendStudio();

  return (
    <section className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]" id="explore">
      <div className="space-y-6">
        <div className="panel space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">Search the catalogue</p>
              <p className="text-xs text-white/60">Type at least two characters, then tap seeds to blend.</p>
            </div>
            <Button variant="secondary" onClick={runSearch} disabled={state === "searching"}>
              {state === "searching" ? "Searching…" : "Search"}
            </Button>
          </div>
          <Input
            value={query}
            placeholder="Try 'Frou Frou' or 'art pop'"
            className="border border-white/10 bg-surface px-4 py-3 text-white"
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
      <div className="space-y-6">
        <EffectPreview seeds={seeds} />
        <RecommendationsPanel recommendations={recommendations} state={state} hasSeeds={seeds.length > 0} />
      </div>
    </section>
  );
}

function SeedTray({ seeds, onRemove }: { seeds: TrackSummary[]; onRemove: (track: TrackSummary) => void }) {
  return (
    <div className="panel space-y-3 p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Seeds</p>
        <span className="text-xs text-white/60">{seeds.length}/3</span>
      </div>
      {seeds.length === 0 ? (
        <p className="text-sm text-white/65">Pick a few tracks from the search results.</p>
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
    <section className="panel p-0">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-sm text-white/70">
        <span>Results</span>
        <span>{state === "searching" ? "Searching…" : `${results.length} matches`}</span>
      </div>
      <div className="divide-y divide-white/10">
        {results.length === 0 && <p className="p-4 text-sm text-white/60">Run a search to see tracks.</p>}
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
                <p className="font-semibold text-white">{track.track_name}</p>
                <p className="text-xs text-white/60">{track.artist_names ?? "Unknown artist"}</p>
              </div>
              <div className="text-right text-xs text-white/50">
                <p>{track.release_year ?? "—"}</p>
                <p>{track.album_name ?? ""}</p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
