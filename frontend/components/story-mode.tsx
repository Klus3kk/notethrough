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

  React.useEffect(() => {
    async function fetchInsights() {
      try {
        const res = await fetch(`${API_BASE}/tracks/story`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed");
        const data = (await res.json()) as StoryInsight[];
        setInsights(data);
      } catch {
        setInsights([]);
      }
    }
    void fetchInsights();
  }, []);

  return (
    <section className="panel space-y-6 p-6">
      <h3 className="text-2xl font-semibold text-white">Story mode analytics</h3>
      <p className="text-sm text-white/70">Narratives generated after Spotify connection. Each card is export-ready.</p>
      <div className="grid gap-4 md:grid-cols-3">
        {insights.map((card) => (
          <div key={card.title} className="rounded-2xl border border-white/15 bg-glow/20 p-5 text-sm text-white/80">
            <p className="text-xs uppercase tracking-[0.4rem] text-white/50">Insight</p>
            <p className="mt-2 text-lg font-semibold text-white">{card.title}</p>
            <p className="mt-2 text-white/70">{card.body}</p>
            <p className="mt-2 text-xs text-white/50">{card.metric}</p>
          </div>
        ))}
        {insights.length === 0 && <p className="text-sm text-white/60">Connect Spotify to unlock narratives.</p>}
      </div>
    </section>
  );
}
