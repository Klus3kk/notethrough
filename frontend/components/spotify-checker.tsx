"use client";

import * as React from "react";

const mockPlaylists = [
  {
    id: "pl1",
    name: "Deep Focus",
    tracks: 120,
    mood: "Focus",
    avgEnergy: 0.42,
    avgDance: 0.55,
    topArtists: ["Nils Frahm", "Max Richter", "Hania Rani"]
  },
  {
    id: "pl2",
    name: "Weekend Warmup",
    tracks: 76,
    mood: "Party",
    avgEnergy: 0.78,
    avgDance: 0.67,
    topArtists: ["Disclosure", "Kaytranada", "Channel Tres"]
  }
];

const mockHistory = [
  { day: "Mon", plays: 42 },
  { day: "Tue", plays: 36 },
  { day: "Wed", plays: 58 },
  { day: "Thu", plays: 40 },
  { day: "Fri", plays: 64 },
  { day: "Sat", plays: 72 },
  { day: "Sun", plays: 30 }
];

export function SpotifyChecker() {
  const [activePlaylist, setActivePlaylist] = React.useState(mockPlaylists[0]);
  return (
    <section className="panel grid gap-6 p-6 lg:grid-cols-[1fr_1.2fr]">
      <div className="space-y-6">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.35rem] text-white/50">Playlists</p>
          <div className="space-y-3">
            {mockPlaylists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => setActivePlaylist(pl)}
                className={`w-full border px-4 py-3 text-left text-sm transition ${
                  pl.id === activePlaylist.id ? "border-white text-white" : "border-white/20 text-white/70 hover:border-white"
                }`}
              >
                <p className="font-semibold">{pl.name}</p>
                <p className="text-xs text-white/60">{pl.tracks} tracks · {pl.mood}</p>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.35rem] text-white/50">Listening history</p>
          <div className="mt-3 grid grid-cols-7 gap-2 text-center text-xs text-white/70">
            {mockHistory.map((day) => (
              <div key={day.day} className="space-y-2">
                <div className="mx-auto h-24 w-6 rounded bg-white/10">
                  <div className="mx-auto w-full rounded bg-accent-teal" style={{ height: `${(day.plays / 80) * 100}%` }} />
                </div>
                <p>{day.day}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35rem] text-white/50">Playlist details</p>
          <h3 className="text-2xl font-semibold text-white">{activePlaylist.name}</h3>
          <p className="text-sm text-white/70">{activePlaylist.tracks} tracks · mood {activePlaylist.mood}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Avg energy" value={`${Math.round(activePlaylist.avgEnergy * 100)}%`} />
          <Stat label="Avg danceability" value={`${Math.round(activePlaylist.avgDance * 100)}%`} />
          <Stat label="Top artists" value={activePlaylist.topArtists[0]} />
        </div>
        <div className="space-y-2 text-sm text-white/70">
          <p className="text-xs uppercase tracking-[0.3rem] text-white/50">Top artists</p>
          <ul className="list-disc pl-4">
            {activePlaylist.topArtists.map((artist) => (
              <li key={artist}>{artist}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded border border-white/15 bg-surface/50 px-4 py-3 text-center">
      <p className="text-xs uppercase tracking-[0.3rem] text-white/50">{label}</p>
      <p className="text-xl font-semibold text-white">{value}</p>
    </div>
  );
}
