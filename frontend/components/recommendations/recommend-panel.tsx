"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TrackSummary } from "@/hooks/use-track-search";

interface Recommendation extends TrackSummary {
  similarity: number;
  components?: Record<string, number> | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface RecommendPanelProps {
  selectedTracks: TrackSummary[];
}

export function RecommendPanel({ selectedTracks }: RecommendPanelProps) {
  const [loading, setLoading] = React.useState(false);
  const [recommendations, setRecommendations] = React.useState<Recommendation[]>([]);

  const runRecommendations = React.useCallback(async () => {
    if (selectedTracks.length === 0) {
      setRecommendations([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/tracks/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uris: selectedTracks.map((track) => track.track_uri) })
      });
      if (!res.ok) throw new Error("Failed to fetch recommendations");
      const data = (await res.json()) as Recommendation[];
      setRecommendations(data.slice(0, 8));
    } catch (error) {
      console.error("recommend error", error);
    } finally {
      setLoading(false);
    }
  }, [selectedTracks]);

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm uppercase tracking-wide text-muted">Recommended</CardTitle>
          <p className="text-foreground/90">Hybrid similarity blend</p>
        </div>
        <Button onClick={runRecommendations} variant="primary" disabled={loading || selectedTracks.length === 0}>
          {loading ? "Computing..." : "Blend seeds"}
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {recommendations.map((rec) => (
          <RecommendationCard key={rec.track_uri} recommendation={rec} />
        ))}
        {!loading && recommendations.length === 0 && (
          <div className="col-span-full flex h-24 items-center justify-center text-sm text-muted">
            Select a track to blend similar songs.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  const components = recommendation.components ?? {};
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold text-foreground">{recommendation.track_name}</div>
          <div className="text-xs text-muted">{recommendation.artist_names ?? "Unknown artist"}</div>
        </div>
        <span className="text-xs text-muted">{Math.round(recommendation.similarity * 100)}%</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        {Object.entries(components).map(([key, value]) => (
          <div key={key} className="rounded-lg bg-white/8 px-3 py-2 text-center">
            <div className="text-[10px] uppercase tracking-wide text-muted">{key}</div>
            <div className="text-foreground/90">{(value * 100).toFixed(0)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}
