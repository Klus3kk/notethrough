"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TrackSummary } from "@/hooks/useBlendStudio";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface Recommendation extends TrackSummary {
  similarity: number;
  components?: Record<string, number> | null;
}

export function SpotifyRecommender() {
  const [connected, setConnected] = React.useState(false);
  const [profile, setProfile] = React.useState<{ name: string; followers: number } | null>(null);
  const [seedInput, setSeedInput] = React.useState("Phoebe Bridgers\nRadiohead\nFour Tet");
  const [loading, setLoading] = React.useState(false);
  const [recommendations, setRecommendations] = React.useState<Recommendation[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const connect = () => {
    setConnected(true);
    setProfile({ name: "Demo User", followers: 1280 });
  };

  const generateBlend = async () => {
    if (!connected) {
      setError("Connect Spotify first");
      return;
    }
    const lines = seedInput
      .split(/\n|,/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      setError("Provide at least one artist or track name");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const seeds: TrackSummary[] = [];
      for (const term of lines.slice(0, 3)) {
        const res = await fetch(`${API_BASE}/tracks/search?q=${encodeURIComponent(term)}&limit=1`, {
          cache: "no-store"
        });
        if (!res.ok) continue;
        const data = (await res.json()) as TrackSummary[];
        if (data[0]) seeds.push(data[0]);
      }
      if (seeds.length === 0) throw new Error("No matches for provided seeds");
      const res = await fetch(`${API_BASE}/tracks/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uris: seeds.map((seed) => seed.track_uri) })
      });
      if (!res.ok) throw new Error("Failed to fetch recommendations");
      const data = (await res.json()) as Recommendation[];
      setRecommendations(data.slice(0, 10));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Blend failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-2xl font-semibold text-foreground">Spotify recommender</h3>
          <p className="text-sm text-white/70">Import top tracks from your library and let Notethrough generate fresh blends.</p>
        </div>
        <Button variant={connected ? "secondary" : "primary"} onClick={connect}>
          {connected ? "Connected" : "Connect Spotify"}
        </Button>
      </div>
      {profile && (
        <div className="rounded-md border border-white/10 bg-glow/40 px-4 py-3 text-sm text-white/80">
          Logged in as <span className="font-semibold text-white">{profile.name}</span> · {profile.followers.toLocaleString()} followers
        </div>
      )}
      <div className="space-y-3">
        <label className="text-xs uppercase tracking-[0.3rem] text-white/50">Favourite artists or tracks</label>
        <textarea
          className="w-full rounded-lg border border-white/15 bg-surface/80 px-4 py-3 text-sm text-white/80"
          rows={4}
          value={seedInput}
          onChange={(event) => setSeedInput(event.target.value)}
        />
        <div className="flex items-center gap-3">
          <Button onClick={generateBlend} disabled={loading}>
            {loading ? "Generating…" : "Generate blend"}
          </Button>
          {error && <p className="text-sm text-red-300">{error}</p>}
        </div>
      </div>
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3rem] text-white/50">Suggestions</p>
        {recommendations.length === 0 && <p className="text-sm text-white/60">Blend some seeds to see suggestions.</p>}
        <div className="grid gap-3 md:grid-cols-2">
          {recommendations.map((rec) => (
            <div key={rec.track_uri} className="rounded border border-white/15 px-4 py-3 text-sm text-white/80">
              <p className="text-white">{rec.track_name}</p>
              <p className="text-xs text-white/60">{rec.artist_names ?? "Unknown"}</p>
              <p className="text-xs text-white/50">{Math.round(rec.similarity * 100)}% match</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
