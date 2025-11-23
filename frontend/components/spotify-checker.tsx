"use client";

import * as React from "react";

import { PlaylistAnalytics } from "@/components/playlist-analytics";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DatasetStats } from "@/hooks/useDatasetStats";
import type { TrackSummary } from "@/types/tracks";
import { normalizeTrackSummary } from "@/lib/track-normalizers";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type CountStat = DatasetStats["top_artists"][number];
type YearlyCount = DatasetStats["yearly_release_counts"][number];
type TopTrack = DatasetStats["top_tracks"][number];

interface PlaylistSummary {
  id: string;
  name: string;
  description?: string | null;
  tracks?: number | null;
}

export function SpotifyChecker() {
  const [profile, setProfile] = React.useState<{ id: string; name: string } | null>(null);
  const [stats, setStats] = React.useState<DatasetStats | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [playlists, setPlaylists] = React.useState<PlaylistSummary[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = React.useState(false);
  const [playlistError, setPlaylistError] = React.useState<string | null>(null);
  const [activePlaylistId, setActivePlaylistId] = React.useState<string | null>(null);
  const [playlistTracks, setPlaylistTracks] = React.useState<Record<string, TrackSummary[]>>({});
  const [playlistTracksLoading, setPlaylistTracksLoading] = React.useState(false);
  const [playlistStats, setPlaylistStats] = React.useState<Record<string, DatasetStats>>({});
  const [playlistStatsLoading, setPlaylistStatsLoading] = React.useState(false);
  const [view, setView] = React.useState<"overview" | "playlists">("overview");

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("spotifyAuth");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (parsed?.profile?.id) {
        setProfile({
          id: parsed.profile.id,
          name: parsed.profile.display_name ?? parsed.profile.id
        });
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchStats = React.useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`${API_BASE}/auth/spotify/users/${profile.id}/stats`, { cache: "no-store" });
      const payload = await resp.json();
      if (!resp.ok) {
        throw new Error((payload as { detail?: string })?.detail ?? "Unable to load Spotify stats");
      }
      setStats(payload as DatasetStats);
    } catch (err) {
      setStats(null);
      setError(err instanceof Error ? err.message : "Unable to load Spotify stats");
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  const fetchPlaylists = React.useCallback(async () => {
    if (!profile?.id) return;
    setPlaylistsLoading(true);
    setPlaylistError(null);
    try {
      const resp = await fetch(`${API_BASE}/auth/spotify/users/${profile.id}/playlists`, { cache: "no-store" });
      const payload = await resp.json();
      if (!resp.ok) {
        throw new Error((payload as { detail?: string })?.detail ?? "Unable to load playlists");
      }
      const data = payload as PlaylistSummary[];
      setPlaylists(data);
      if (data.length > 0) {
        setActivePlaylistId((prev) => (prev && data.some((pl) => pl.id === prev) ? prev : data[0].id));
      } else {
        setActivePlaylistId(null);
      }
    } catch (err) {
      setPlaylists([]);
      setActivePlaylistId(null);
      setPlaylistError(err instanceof Error ? err.message : "Unable to load playlists");
    } finally {
      setPlaylistsLoading(false);
    }
  }, [profile?.id]);

  const ensurePlaylistData = React.useCallback(
    async (playlistId: string) => {
      if (!profile?.id) return;
      if (!playlistTracks[playlistId]) {
        setPlaylistTracksLoading(true);
        try {
          const resp = await fetch(
            `${API_BASE}/auth/spotify/users/${profile.id}/playlists/${playlistId}/tracks`,
            { cache: "no-store" }
          );
        const payload = await resp.json();
        if (!resp.ok) {
          throw new Error((payload as { detail?: string })?.detail ?? "Unable to load playlist tracks");
        }
        const normalized = (payload as Record<string, any>[]).map((entry) => normalizeTrackSummary(entry));
        setPlaylistTracks((prev) => ({ ...prev, [playlistId]: normalized }));
        } catch (err) {
          setPlaylistError(err instanceof Error ? err.message : "Unable to load playlist tracks");
        } finally {
          setPlaylistTracksLoading(false);
        }
      }

      if (!playlistStats[playlistId]) {
        setPlaylistStatsLoading(true);
        try {
          const resp = await fetch(
            `${API_BASE}/auth/spotify/users/${profile.id}/playlists/${playlistId}/stats`,
            { cache: "no-store" }
          );
          const payload = await resp.json();
          if (!resp.ok) {
            throw new Error((payload as { detail?: string })?.detail ?? "Unable to load playlist stats");
          }
          setPlaylistStats((prev) => ({ ...prev, [playlistId]: payload as DatasetStats }));
        } catch (err) {
          setPlaylistError(err instanceof Error ? err.message : "Unable to load playlist stats");
        } finally {
          setPlaylistStatsLoading(false);
        }
      }
    },
    [profile?.id, playlistTracks, playlistStats]
  );

  React.useEffect(() => {
    if (profile?.id) {
      void fetchStats();
      void fetchPlaylists();
    }
  }, [profile?.id, fetchStats, fetchPlaylists]);

  React.useEffect(() => {
    if (activePlaylistId) {
      void ensurePlaylistData(activePlaylistId);
    }
  }, [activePlaylistId, ensurePlaylistData]);

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

  const connected = Boolean(profile);
  const activePlaylistTracks = activePlaylistId ? playlistTracks[activePlaylistId] ?? [] : [];
  const activePlaylistStats = activePlaylistId ? playlistStats[activePlaylistId] ?? null : null;
  const activePlaylistName = activePlaylistId
    ? playlists.find((pl) => pl.id === activePlaylistId)?.name ?? "Playlist"
    : null;
  const playlistAnalyticsReady =
    Boolean(activePlaylistId && activePlaylistStats && activePlaylistTracks.length > 0);
  const totals = stats?.totals;
  const releaseRange = totals?.release_year_range;
  const releaseSpan =
    releaseRange && typeof releaseRange.min === "number" && typeof releaseRange.max === "number"
      ? `${releaseRange.min}–${releaseRange.max}`
      : "—";
  const timeline = stats ? stats.yearly_release_counts.slice(-12) : [];
  const topTracks = stats ? stats.top_tracks.slice(0, 5) : [];

  return (
    <section className="panel space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-semibold text-foreground">Spotify checker</h3>
          <p className="text-sm text-white/70">View stats from your synced Spotify library.</p>
        </div>
        {connected ? (
          <Button onClick={fetchStats} variant="secondary" disabled={loading}>
            {loading ? "Syncing…" : "Sync library"}
          </Button>
        ) : (
          <Button variant="primary" onClick={connect}>
            Connect Spotify
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-red-300">{error}</p>}
      {!connected && <p className="text-sm text-white/60">Connect Spotify to audit your personal listening stats.</p>}
      {loading && connected && <p className="text-sm text-white/60">Syncing your latest listening history…</p>}
      {connected && !loading && !stats && !error && <p className="text-sm text-white/60">No Spotify data synced yet.</p>}

      <div className="flex gap-3 text-xs uppercase tracking-[0.25rem] text-white/60">
        <button
          type="button"
          onClick={() => setView("overview")}
          className={cn(
            "rounded-full border px-3 py-1",
            view === "overview" ? "border-white text-white" : "border-white/20"
          )}
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => setView("playlists")}
          className={cn(
            "rounded-full border px-3 py-1",
            view === "playlists" ? "border-white text-white" : "border-white/20"
          )}
        >
          Playlists
        </button>
      </div>

      {stats && view === "overview" && (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Tracks synced" value={formatNumber(totals?.total_rows)} hint="From your Spotify library" />
            <StatCard label="Unique artists" value={formatNumber(totals?.unique_artists)} hint="Distinct creators you follow" />
            <StatCard label="Avg popularity" value={formatPopularity(totals?.average_popularity)} hint="Spotify 0–100" />
            <StatCard label="Release span" value={releaseSpan} hint="Oldest to newest in your library" />
          </div>
          <EnergyCard energy={totals?.average_energy} dance={totals?.average_danceability} />
          <div className="grid gap-6 lg:grid-cols-2">
            <RankedList title="Top artists" items={stats.top_artists.slice(0, 6)} />
            <RankedList title="Top genres" items={stats.top_genres.slice(0, 6)} />
          </div>
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <ReleaseTimeline data={timeline} spanLabel={releaseSpan} />
            <TopTracks tracks={topTracks} />
          </div>
        </>
      )}
      {connected && view === "playlists" && (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-2xl border border-white/15 bg-surface/40 p-4 text-white/80">
              <div className="flex items-center justify-between text-sm">
                <p className="font-semibold text-white">Playlists</p>
                <Button
                  variant="ghost"
                  className="text-xs text-white/70"
                  onClick={fetchPlaylists}
                  disabled={playlistsLoading}
                >
                  {playlistsLoading ? "Syncing…" : "Refresh"}
                </Button>
              </div>
              {playlistError && <p className="mt-2 text-xs text-red-300">{playlistError}</p>}
              <div className="mt-3 space-y-2">
                {playlists.map((playlist) => {
                  const active = playlist.id === activePlaylistId;
                  return (
                    <button
                      key={playlist.id}
                      onClick={() => setActivePlaylistId(playlist.id)}
                      className={cn(
                        "w-full border px-3 py-2 text-left text-sm transition",
                        active ? "border-white text-white" : "border-white/20 text-white/70 hover:border-white"
                      )}
                    >
                      <p className="font-semibold">{playlist.name}</p>
                      <p className="text-xs text-white/50">{playlist.tracks ?? 0} tracks</p>
                    </button>
                  );
                })}
                {!playlists.length && !playlistsLoading && (
                  <p className="text-sm text-white/60">No playlists synced yet.</p>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-white/15 bg-surface/40 p-4 text-white/80">
              <p className="text-xs uppercase tracking-[0.3rem] text-white/50">Playlist tracks</p>
              {activePlaylistId && <p className="text-sm text-white/60">{activePlaylistName ?? "Playlist"}</p>}
              {playlistTracksLoading && <p className="text-sm text-white/60">Loading tracks…</p>}
              {!activePlaylistId && !playlistTracksLoading && (
                <p className="text-sm text-white/60">Select a playlist to inspect tracks.</p>
              )}
              {activePlaylistId && !playlistTracksLoading && activePlaylistTracks.length === 0 && (
                <p className="text-sm text-white/60">Playlist tracks will appear after syncing.</p>
              )}
              <div className="mt-3 space-y-2 text-sm">
                {activePlaylistTracks.map((track) => (
                  <div key={track.track_uri} className="rounded border border-white/10 px-3 py-2">
                    <p className="font-semibold text-white">{track.track_name}</p>
                    <p className="text-xs text-white/60">{track.artist_names ?? "Unknown artist"}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div>
            {playlistAnalyticsReady && activePlaylistId && activePlaylistStats ? (
              <PlaylistAnalytics
                playlistName={activePlaylistName ?? "Playlist"}
                stats={activePlaylistStats}
                tracks={activePlaylistTracks}
              />
            ) : (
              <div className="rounded-2xl border border-white/15 bg-surface/40 p-6 text-white/70">
                {playlistStatsLoading || playlistTracksLoading ? (
                  <p className="text-sm text-white/60">Loading playlist analytics…</p>
                ) : (
                  <p className="text-sm text-white/60">Select a playlist and sync it to view analytics.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function formatNumber(value?: number | null) {
  if (typeof value !== "number") return "—";
  return value.toLocaleString();
}

function formatPopularity(value?: number | null) {
  if (typeof value !== "number") return "—";
  return `${Math.round(value)}`;
}

function formatPercent(value?: number | null) {
  if (typeof value !== "number") return "—";
  return `${Math.round(value * 100)}%`;
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-surface/40 px-4 py-3 text-white/80">
      <p className="text-xs uppercase tracking-[0.3rem] text-white/50">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      {hint && <p className="text-xs text-white/40">{hint}</p>}
    </div>
  );
}

function EnergyCard({ energy, dance }: { energy?: number | null; dance?: number | null }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-surface/70 to-accent-teal/20 px-4 py-4 text-white/80">
      <p className="text-xs uppercase tracking-[0.3rem] text-white/50">Energy vs danceability</p>
      <div className="mt-3 flex flex-wrap items-end gap-6">
        <div>
          <p className="text-3xl font-semibold text-white">{formatPercent(energy)}</p>
          <p className="text-xs text-white/60">Energy</p>
        </div>
        <div>
          <p className="text-3xl font-semibold text-white">{formatPercent(dance)}</p>
          <p className="text-xs text-white/60">Dance</p>
        </div>
        <p className="text-sm text-white/60">
          Ratios derived from averaged audio features across the catalog. Use it to align playlists and Spotify stats.
        </p>
      </div>
    </div>
  );
}

function RankedList({ title, items }: { title: string; items: CountStat[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-surface/40 px-4 py-4 text-white/80">
      <p className="text-xs uppercase tracking-[0.3rem] text-white/50">{title}</p>
      {items.length === 0 && <p className="mt-3 text-sm text-white/60">No data available.</p>}
      {items.length > 0 && (
        <ol className="mt-4 space-y-2 text-sm">
          {items.map((item, index) => (
            <li key={`${item.name}-${index}`} className="flex items-center justify-between">
              <span className="text-white/90">
                {index + 1}. {item.name || "Unknown"}
              </span>
              <span className="text-white/60">{item.count.toLocaleString()}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function ReleaseTimeline({ data, spanLabel }: { data: YearlyCount[]; spanLabel: string }) {
  const maxCount = Math.max(...data.map((entry) => entry.count));
  return (
    <div className="rounded-2xl border border-white/10 bg-surface/40 px-4 py-4 text-white/80">
      <p className="text-xs uppercase tracking-[0.3rem] text-white/50">Release timeline</p>
      <p className="text-sm text-white/60">Last {data.length} samples · span {spanLabel}</p>
      <div className="mt-5 flex items-end gap-2">
        {data.map((entry) => (
          <div key={entry.year} className="flex flex-col items-center gap-2 text-[11px] text-white/50">
            <div className="flex h-24 w-5 flex-col justify-end rounded bg-white/10">
              <div
                className="w-full rounded bg-accent-teal"
                style={{ height: `${maxCount ? Math.max((entry.count / maxCount) * 100, 5) : 0}%` }}
              />
            </div>
            <span>{entry.year}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function pickLabel(entry: TopTrack, legacyKey: string, fallback: string) {
  return (entry as any)[legacyKey] ?? (entry as any)[legacyKey.replace(" ", "_")] ?? fallback;
}

function TopTracks({ tracks }: { tracks: TopTrack[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-surface/40 px-4 py-4 text-white/80">
      <p className="text-xs uppercase tracking-[0.3rem] text-white/50">Top tracks in your library</p>
      <div className="mt-4 divide-y divide-white/10 text-sm">
        {tracks.length === 0 && <p className="py-3 text-white/60">Waiting for popularity rankings…</p>}
        {tracks.map((track) => (
          <div key={track.track_uri} className="flex items-center justify-between gap-4 py-3">
            <div>
              <p className="font-semibold text-white">{track.track_name ?? pickLabel(track, "Track Name", "Untitled track")}</p>
              <p className="text-xs text-white/60">{track.artist_names ?? pickLabel(track, "Artist Name(s)", "Unknown artist")}</p>
            </div>
            <span className="text-xs text-white/60">
              {track.popularity != null ? `${Math.round(track.popularity)}%` : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
