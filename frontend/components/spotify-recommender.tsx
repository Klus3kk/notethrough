"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TrackSummary } from "@/types/tracks";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type SeedMode = "spotify" | "manual";

interface Recommendation extends TrackSummary {
  similarity: number;
  components?: Record<string, number> | null;
}

interface SpotifySeedTrack {
  track_uri: string;
  track_name: string;
  artist_names: string;
  in_catalog: boolean;
}

interface StoredProfile {
  id: string;
  name: string;
  followers: number;
}

function normalizeRecommendation(raw: Record<string, unknown>): Recommendation {
  const record = raw as Recommendation;
  return {
    ...record,
    track_uri: record.track_uri ?? (raw["Track URI"] as string) ?? "",
    track_name: record.track_name ?? (raw["Track Name"] as string | undefined) ?? null,
    artist_names: record.artist_names ?? (raw["Artist Name(s)"] as string | undefined) ?? null,
    album_name: record.album_name ?? (raw["Album Name"] as string | undefined) ?? null,
    release_date: record.release_date ?? (raw["Release Date"] as string | undefined) ?? null,
    release_year: record.release_year ?? (raw["Release Year"] as number | undefined) ?? null,
    popularity: record.popularity ?? (raw["Popularity"] as number | undefined) ?? null,
    danceability: record.danceability ?? (raw["Danceability"] as number | undefined) ?? null,
    energy: record.energy ?? (raw["Energy"] as number | undefined) ?? null,
    valence: record.valence ?? (raw["Valence"] as number | undefined) ?? null,
    tempo: record.tempo ?? (raw["Tempo"] as number | undefined) ?? null
  };
}

const getTrackName = (rec: Recommendation) => rec.track_name ?? "Unknown";
const getArtistNames = (rec: Recommendation) => rec.artist_names ?? "Unknown";

export function SpotifyRecommender() {
  const [connected, setConnected] = React.useState(false);
  const [profile, setProfile] = React.useState<StoredProfile | null>(null);
  const [seedMode, setSeedMode] = React.useState<SeedMode>("manual");
  const [manualSeedInput, setManualSeedInput] = React.useState("Phoebe Bridgers\nRadiohead\nFour Tet");
  const [autoSeeds, setAutoSeeds] = React.useState<SpotifySeedTrack[]>([]);
  const [autoSeedsLoading, setAutoSeedsLoading] = React.useState(false);
  const [autoSeedsError, setAutoSeedsError] = React.useState<string | null>(null);
  const [selectedSeedUris, setSelectedSeedUris] = React.useState<string[]>([]);
  const [seedLimit, setSeedLimit] = React.useState(3);
  const [manualSelection, setManualSelection] = React.useState<TrackSummary[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [recommendations, setRecommendations] = React.useState<Recommendation[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [feedbackState, setFeedbackState] = React.useState<Record<string, "up" | "down">>({});

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("spotifyAuth");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (parsed?.profile) {
        setProfile({
          id: parsed.profile.id ?? "",
          name: parsed.profile.display_name ?? parsed.profile.id ?? "Spotify user",
          followers: parsed.profile.followers?.total ?? 0
        });
        setConnected(true);
        setSeedMode("spotify");
      }
    } catch {
      // ignore malformed values
    }
  }, []);

  const loadAutoSeeds = React.useCallback(async () => {
    if (!connected || !profile?.id) return;
    setAutoSeedsLoading(true);
    setAutoSeedsError(null);
    try {
      const resp = await fetch(`${API_BASE}/auth/spotify/users/${profile.id}/top-tracks?limit=20`, {
        cache: "no-store"
      });
      const payload = await resp.json();
      if (!resp.ok) {
        throw new Error((payload as { detail?: string })?.detail ?? "Unable to sync Spotify seeds");
      }
      setAutoSeeds(payload as SpotifySeedTrack[]);
    } catch (err) {
      setAutoSeeds([]);
      setAutoSeedsError(err instanceof Error ? err.message : "Unable to sync Spotify seeds");
    } finally {
      setAutoSeedsLoading(false);
    }
  }, [connected, profile?.id]);

  React.useEffect(() => {
    if (seedMode === "spotify" && connected && profile?.id) {
      void loadAutoSeeds();
    }
  }, [seedMode, connected, profile?.id, loadAutoSeeds]);

  React.useEffect(() => {
    if (seedMode !== "spotify") {
      return;
    }
    setSelectedSeedUris((prev) => {
      const valid = prev.filter((uri) => autoSeeds.some((seed) => seed.track_uri === uri && seed.in_catalog));
      if (valid.length) {
        return valid.slice(0, 5);
      }
      const ready = autoSeeds.filter((seed) => seed.in_catalog);
      if (!ready.length) {
        return [];
      }
      return ready.slice(0, seedLimit).map((seed) => seed.track_uri);
    });
  }, [autoSeeds, seedMode, seedLimit]);

  const seedLookup = React.useMemo(() => {
    const map = new Map<string, SpotifySeedTrack>();
    for (const seed of autoSeeds) {
      map.set(seed.track_uri, seed);
    }
    return map;
  }, [autoSeeds]);

  const seedContext = React.useMemo(
    () => (seedMode === "manual" ? manualSelection.map((seed) => seed.track_uri) : selectedSeedUris),
    [seedMode, manualSelection, selectedSeedUris]
  );

  const blendStory = React.useMemo(() => {
    const names =
      seedMode === "manual"
        ? manualSelection.map((seed) => seed.track_name ?? "Unknown")
        : selectedSeedUris.map((uri) => seedLookup.get(uri)?.track_name ?? "Unknown");
    const clean = names.filter(Boolean);
    if (!clean.length) {
      return "Select seeds to preview how the blend will behave.";
    }
    if (clean.length === 1) {
      return `Orbiting ${clean[0]} and nearby textures for a focused story.`;
    }
    if (clean.length === 2) {
      return `Bridging ${clean[0]} with ${clean[1]} for a balanced duet of influences.`;
    }
    return `Fusing ${clean.slice(0, 3).join(", ")} to keep the blend in that leftfield art-pop lane.`;
  }, [seedMode, manualSelection, selectedSeedUris, seedLookup]);

  const connect = async () => {
    setError(null);
    try {
      const resp = await fetch(`${API_BASE}/auth/spotify/login`);
      if (!resp.ok) throw new Error("Unable to start Spotify login");
      const data = await resp.json();
      window.location.href = data.auth_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start Spotify login");
    }
  };

  const toggleSeedSelection = (uri: string) => {
    setSelectedSeedUris((prev) => {
      const exists = prev.includes(uri);
      if (exists) {
        return prev.filter((item) => item !== uri);
      }
      const next = [...prev, uri];
      if (next.length > 5) {
        next.shift();
      }
      return next;
    });
  };

  const sendFeedback = React.useCallback(
    async (rec: Recommendation, verdict: "up" | "down") => {
      setFeedbackState((prev) => ({ ...prev, [rec.track_uri]: verdict }));
      try {
        await fetch(`${API_BASE}/tracks/feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            track_uri: rec.track_uri,
            verdict,
            spotify_user_id: profile?.id ?? null,
            seed_context: seedContext
          })
        });
      } catch {
        // no-op
      }
    },
    [profile?.id, seedContext]
  );

  const readySeeds = React.useMemo(() => autoSeeds.filter((seed) => seed.in_catalog), [autoSeeds]);
  const catalogReadySeeds = readySeeds.length;

  const disconnect = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("spotifyAuth");
    }
    setConnected(false);
    setProfile(null);
    setSeedMode("manual");
    setAutoSeeds([]);
  };

  const resolveManualSeeds = React.useCallback(async () => {
    const terms = manualSeedInput
      .split(/\n|,/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (terms.length === 0) {
      throw new Error("Provide at least one artist or track name");
    }
    const seeds: TrackSummary[] = [];
    for (const term of terms.slice(0, 3)) {
      const res = await fetch(`${API_BASE}/tracks/search?q=${encodeURIComponent(term)}&limit=1`, {
        cache: "no-store"
      });
      if (!res.ok) continue;
      const data = (await res.json()) as TrackSummary[];
      if (data[0]) seeds.push(data[0]);
    }
    if (seeds.length === 0) {
      throw new Error("No matches for provided seeds");
    }
    setManualSelection(seeds);
    return seeds;
  }, [manualSeedInput]);

  const generateBlend = async () => {
    if (!connected || !profile?.id) {
      setError("Connect Spotify first");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let body: Record<string, unknown> = { seed_limit: seedLimit };
      if (seedMode === "manual") {
        const seeds = await resolveManualSeeds();
        const uris = seeds.map((seed) => seed.track_uri).slice(0, seedLimit);
        body = { ...body, uris };
      } else {
        const pinned = selectedSeedUris.slice(0, seedLimit);
        if (pinned.length > 0) {
          body = { ...body, uris: pinned };
        } else {
          body = { ...body, spotify_user_id: profile.id };
        }
      }
      const resp = await fetch(`${API_BASE}/tracks/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const payload = await resp.json();
      if (!resp.ok || !Array.isArray(payload)) {
        throw new Error((payload as { detail?: string })?.detail ?? "Failed to fetch recommendations");
      }
      const normalized = payload.map((item) => normalizeRecommendation(item as Record<string, unknown>));
      setRecommendations(normalized.slice(0, 10));
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
          <p className="text-sm text-white/70">
            Connect Spotify to blend saved music with live embeddings. We can auto-seed from your top tracks or let you override manually.
          </p>
        </div>
        {connected ? (
          <Button variant="secondary" onClick={disconnect}>
            Disconnect
          </Button>
        ) : (
          <Button variant="primary" onClick={connect}>
            Connect Spotify
          </Button>
        )}
      </div>
      {profile && (
        <div className="rounded-md border border-white/10 bg-glow/40 px-4 py-3 text-sm text-white/80">
          Logged in as <span className="font-semibold text-white">{profile.name}</span> · {profile.followers.toLocaleString()} followers
        </div>
      )}
      <div className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3rem] text-white/50">Seed source</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={!connected}
              onClick={() => connected && setSeedMode("spotify")}
              className={cn(
                "rounded-full border px-4 py-2 text-sm transition",
                seedMode === "spotify" ? "border-white bg-white/10 text-white" : "border-white/20 text-white/60 hover:border-white",
                !connected && "cursor-not-allowed opacity-40"
              )}
            >
              Spotify profile
            </button>
            <button
              type="button"
              onClick={() => setSeedMode("manual")}
              className={cn(
                "rounded-full border px-4 py-2 text-sm transition",
                seedMode === "manual" ? "border-white bg-white/10 text-white" : "border-white/20 text-white/60 hover:border-white"
              )}
            >
              Manual seeds
            </button>
          </div>
        </div>
        <div className="space-y-2 rounded-2xl border border-white/10 bg-surface/60 p-4">
          <div className="flex flex-wrap items-center justify-between text-xs uppercase tracking-[0.3rem] text-white/50">
            <span>Blend depth</span>
            <span>{seedLimit} seed{seedLimit === 1 ? "" : "s"}</span>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            value={seedLimit}
            onChange={(event) => setSeedLimit(Number(event.target.value))}
            className="w-full accent-accent-teal"
          />
          <p className="text-xs text-white/60">Lower values keep blends focused; higher values explore wider territory.</p>
        </div>
        {seedMode === "spotify" ? (
          <div className="space-y-3 rounded-2xl border border-white/15 bg-surface/70 p-4 text-sm text-white/80">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3rem] text-white/50">Top & saved tracks</p>
                <p className="text-white/70">
                  {catalogReadySeeds > 0
                    ? `${catalogReadySeeds}/${autoSeeds.length || "?"} synced tracks already exist in the offline catalog.`
                    : "Syncing your Spotify favourites (top tracks + liked songs) with the dataset."}
                </p>
              </div>
              <Button variant="secondary" onClick={loadAutoSeeds} disabled={autoSeedsLoading}>
                {autoSeedsLoading ? "Syncing…" : "Refresh"}
              </Button>
            </div>
            {autoSeedsError && <p className="text-sm text-red-300">{autoSeedsError}</p>}
            <div className="space-y-2">
              {autoSeedsLoading && <p className="text-white/60">Fetching your Spotify favourites…</p>}
              {!autoSeedsLoading && autoSeeds.length === 0 && (
                <p className="text-white/60">Connect Spotify and refresh to see seeds.</p>
              )}
              {autoSeeds.map((seed) => {
                const active = selectedSeedUris.includes(seed.track_uri);
                return (
                  <div
                    key={seed.track_uri}
                    className={cn(
                      "flex items-center justify-between rounded border px-4 py-2",
                      active ? "border-white/60 bg-white/5" : "border-white/10"
                    )}
                  >
                    <div>
                      <p className="font-semibold text-white">{seed.track_name}</p>
                      <p className="text-xs text-white/60">{seed.artist_names}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 text-xs">
                      <span className={cn(seed.in_catalog ? "text-accent-teal" : "text-white/40")}>
                        {seed.in_catalog ? "In dataset" : "Sync pending"}
                      </span>
                      {seed.in_catalog && (
                        <button
                          type="button"
                          onClick={() => toggleSeedSelection(seed.track_uri)}
                          className={cn(
                            "rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.2rem]",
                            active ? "border-white text-white" : "border-white/30 text-white/70 hover:border-white"
                          )}
                        >
                          {active ? "Pinned" : "Use"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="text-xs uppercase tracking-[0.3rem] text-white/50">Favourite artists or tracks</label>
            <textarea
              className="w-full rounded-lg border border-white/15 bg-surface/80 px-4 py-3 text-sm text-white/80"
              rows={4}
              value={manualSeedInput}
              onChange={(event) => setManualSeedInput(event.target.value)}
            />
            <p className="text-xs text-white/60">
              Paste a few favourites. We&apos;ll look them up in the dataset and use whichever matches we find.
            </p>
          </div>
        )}
        <div className="rounded-2xl border border-white/10 bg-surface/70 p-4">
          <p className="text-xs uppercase tracking-[0.3rem] text-white/50">Blend story</p>
          <p className="mt-2 text-sm text-white/80">{blendStory}</p>
          <p className="mt-1 text-xs text-white/50">Pinned seeds drive this narrative—adjust them before generating.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={generateBlend} disabled={loading || (seedMode === "spotify" && !connected)}>
            {loading ? "Generating…" : "Generate blend"}
          </Button>
          {error && <p className="text-sm text-red-300">{error}</p>}
        </div>
      </div>
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3rem] text-white/50">Suggestions</p>
        {recommendations.length === 0 && <p className="text-sm text-white/60">Run a blend to see recommendations.</p>}
        <div className="grid gap-3 md:grid-cols-2">
          {recommendations.map((rec) => (
            <div key={rec.track_uri} className="rounded border border-white/15 px-4 py-3 text-sm text-white/80">
              <p className="text-white">{getTrackName(rec)}</p>
              <p className="text-xs text-white/60">{getArtistNames(rec)}</p>
              <p className="text-xs text-white/50">{Math.round(rec.similarity * 100)}% match</p>
              {rec.components && (
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/60">
                  {Object.entries(rec.components).slice(0, 3).map(([key, value]) => (
                    <span key={`${rec.track_uri}-${key}`} className="rounded-full bg-white/10 px-2 py-1">
                      {key}: {(value * 100).toFixed(0)}%
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/60">
                <button
                  type="button"
                  onClick={() => sendFeedback(rec, "up")}
                  className={cn(
                    "rounded-full border px-3 py-1 uppercase tracking-[0.2rem]",
                    feedbackState[rec.track_uri] === "up" ? "border-accent-teal text-accent-teal" : "border-white/30 hover:border-white"
                  )}
                >
                  Love it
                </button>
                <button
                  type="button"
                  onClick={() => sendFeedback(rec, "down")}
                  className={cn(
                    "rounded-full border px-3 py-1 uppercase tracking-[0.2rem]",
                    feedbackState[rec.track_uri] === "down" ? "border-red-300 text-red-300" : "border-white/30 hover:border-white"
                  )}
                >
                  Skip
                </button>
                {feedbackState[rec.track_uri] && <span className="text-[10px] uppercase text-white/40">Feedback logged</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
