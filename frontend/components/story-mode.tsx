"use client";

import * as React from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface StoryInsight {
  title: string;
  body: string;
  metric: string;
}

export function StoryModePreview() {
  const [insights, setInsights] = React.useState<StoryInsight[]>([]);
  const [userId, setUserId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("spotifyAuth");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (parsed?.profile?.id) {
        setUserId(parsed.profile.id);
      }
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    if (!userId) {
      setInsights([]);
      return;
    }
    async function fetchInsights() {
      try {
        const url = new URL(`${API_BASE}/tracks/story`);
        url.searchParams.set("spotify_user_id", userId);
        const res = await fetch(url.toString(), { cache: "no-store" });
        if (!res.ok) throw new Error("Failed");
        const data = (await res.json()) as StoryInsight[];
        setInsights(data);
      } catch {
        setInsights([]);
      }
    }
    void fetchInsights();
  }, [userId]);

  return (
    <section className="panel space-y-6 p-6">
      <h3 className="text-2xl font-semibold text-white">Story mode analytics</h3>
      <p className="text-sm text-white/70">
        {userId ? "Stories tailored to your synced Spotify library." : "Connect Spotify to generate personal narratives."}
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {!userId && <p className="text-sm text-white/60">Connect Spotify to unlock Story Mode.</p>}
        {userId &&
          insights.map((card) => (
            <div key={card.title} className="rounded-2xl border border-white/15 bg-glow/20 p-5 text-sm text-white/80">
              <p className="text-xs uppercase tracking-[0.4rem] text-white/50">Insight</p>
              <p className="mt-2 text-lg font-semibold text-white">{card.title}</p>
              <p className="mt-2 text-white/70">{card.body}</p>
              <p className="mt-2 text-xs text-white/50">{card.metric}</p>
            </div>
          ))}
        {userId && insights.length === 0 && <p className="text-sm text-white/60">Syncing Spotify data…</p>}
      </div>
    </section>
  );
}
