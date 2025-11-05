"use client";

import * as React from "react";

import { SearchBar } from "@/components/search/search-bar";
import { SuggestPopover } from "@/components/search/suggest-popover";
import { ResultsTable } from "@/components/search/results-table";
import { RecommendPanel } from "@/components/recommendations/recommend-panel";
import { TrackDetailPanel } from "@/components/search/track-detail";
import { Badge } from "@/components/ui/badge";
import { useTrackSearch, TrackSummary } from "@/hooks/use-track-search";

export default function TrackExplorer() {
  const {
    query,
    setQuery,
    suggestions,
    results,
    loading,
    runSearch,
    handleSelectSuggestion,
    fetchDetail
  } = useTrackSearch();
  const [selected, setSelected] = React.useState<TrackSummary[]>([]);

  const removeTrack = React.useCallback((uri: string) => {
    setSelected((prev) => prev.filter((item) => item.track_uri !== uri));
  }, []);

  const toggleSelect = React.useCallback(
    async (uri: string) => {
      if (selected.some((item) => item.track_uri === uri)) {
        removeTrack(uri);
        return;
      }

      let track = results.find((item) => item.track_uri === uri);
      const detail = await fetchDetail(uri);
      if (detail) {
        track = detail;
      }

      if (track) {
        setSelected((prev) => [...prev.slice(-2), track as TrackSummary]);
      }
    },
    [selected, results, fetchDetail, removeTrack]
  );

  return (
    <section className="mt-10 space-y-4">
      <div className="relative">
        <SearchBar value={query} onChange={setQuery} onSubmit={() => runSearch()} />
        <SuggestPopover
          items={suggestions}
          visible={query.trim().length >= 2 && suggestions.length > 0}
          onSelect={async (uri) => {
            await handleSelectSuggestion(uri);
            await toggleSelect(uri);
          }}
        />
      </div>
      <div className="flex items-center gap-4 text-xs text-muted">
        <button
          type="button"
          onClick={() => runSearch()}
          className="rounded-full bg-white/5 px-4 py-2 text-foreground/80 transition hover:bg-white/10"
        >
          Search dataset
        </button>
        <span>Select up to 3 tracks to blend recommendations.</span>
      </div>
      <ResultsTable
        results={results.map((track) => ({
          ...track,
          selected: selected.some((item) => item.track_uri === track.track_uri)
        }))}
        loading={loading}
        onSelect={(uri) => {
          void toggleSelect(uri);
        }}
      />
      <TrackDetailPanel track={selected[0] ?? null} onClear={() => (selected[0] ? removeTrack(selected[0].track_uri) : undefined)} />
      {selected.length > 1 && (
        <div className="flex flex-wrap gap-2 text-xs text-muted">
          {selected.slice(1).map((track) => (
            <Badge
              key={track.track_uri}
              className="cursor-pointer bg-white/10 text-foreground/80 hover:bg-white/15"
              onClick={() => removeTrack(track.track_uri)}
            >
              {track.track_name}
            </Badge>
          ))}
        </div>
      )}
      <RecommendPanel selectedTracks={selected} />
    </section>
  );
}
