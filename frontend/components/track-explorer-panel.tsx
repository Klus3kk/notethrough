"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTrackExplorer } from "@/hooks/useTrackExplorer";

export function TrackExplorerPanel() {
  const { query, setQuery, results, loading, error, search } = useTrackExplorer();

  return (
    <section className="panel space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-semibold text-foreground">Universal track explorer</h3>
          <p className="text-sm text-white/70">Search across the full dataset and inspect track metadata.</p>
        </div>
        <Button onClick={search} disabled={loading}>
          {loading ? "Searching…" : "Search"}
        </Button>
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
      {error && <p className="text-sm text-red-300">{error}</p>}
      <div className="space-y-2 text-sm text-white/70">
        <p>{results.length} tracks</p>
        <div className="divide-y divide-white/10 border border-white/15">
          {results.length === 0 && <p className="p-4 text-white/60">Start searching to explore the dataset.</p>}
          {results.map((track) => (
            <div key={track.track_uri} className="grid grid-cols-[2fr_1fr_1fr] items-center px-4 py-3 text-white/80">
              <div>
                <p className="font-semibold text-white">{track.track_name}</p>
                <p className="text-xs text-white/60">{track.artist_names ?? "Unknown artist"}</p>
              </div>
              <p className="text-xs text-white/60">{track.album_name ?? "—"}</p>
              <p className="text-xs text-white/60 text-right">{track.release_year ?? "—"}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
