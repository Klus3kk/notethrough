"use client";

import * as React from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface JourneyStep {
  title: string;
  description: string;
  artist?: string | null;
  track?: string | null;
  album?: string | null;
}

interface Journey {
  seed: string;
  summary: string;
  steps: JourneyStep[];
}

export function DiscoveryJourneys() {
  const [journeys, setJourneys] = React.useState<Journey[]>([]);
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
      setJourneys([]);
      return;
    }
    async function fetchJourneys() {
      try {
        const url = new URL(`${API_BASE}/tracks/journeys`);
        url.searchParams.set("spotify_user_id", userId);
        const res = await fetch(url.toString(), { cache: "no-store" });
        if (!res.ok) throw new Error("Failed");
        const data = (await res.json()) as Journey[];
        setJourneys(data);
      } catch {
        setJourneys([]);
      }
    }
    void fetchJourneys();
  }, [userId]);

  return (
    <section className="panel space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-semibold text-white">Discovery journeys</h3>
          <p className="text-sm text-white/60">Follow guided quests with specific tracks, allies, and curveballs.</p>
        </div>
        <span className="rounded-full border border-white/30 px-3 py-1 text-xs uppercase tracking-[0.3rem] text-white/60">
          Quest log
        </span>
      </div>
      {!userId && <p className="text-sm text-white/60">Connect Spotify to unlock personalised quests.</p>}
      {userId && journeys.length > 0 && (
        <div className="grid gap-4">
          {journeys.map((journey) => (
            <JourneyCard key={journey.seed} journey={journey} />
          ))}
        </div>
      )}
      {userId && journeys.length === 0 && (
        <p className="text-sm text-white/60">Syncing your Spotify signals to craft quests…</p>
      )}
    </section>
  );
}

function JourneyCard({ journey }: { journey: Journey }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-surface/45 p-5 text-white/80">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3rem] text-white/50">Quest seed</p>
          <h4 className="text-xl font-semibold text-white">{journey.seed}</h4>
        </div>
        <p className="max-w-sm text-sm text-white/60">{journey.summary}</p>
      </div>
      <div className="mt-4 grid gap-3">
        {journey.steps.map((step, index) => (
          <div key={`${journey.seed}-${step.title}-${index}`} className="rounded-xl border border-white/10 bg-surface/60 p-4">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.2rem] text-white/40">
              <span>
                {index + 1}. {step.title}
              </span>
              {step.artist && <span className="text-white/60">{step.artist}</span>}
            </div>
            {(step.track || step.album) && (
              <p className="mt-1 text-sm font-semibold text-white">
                {step.track ?? "Any track"}
                {step.album && <span className="text-xs text-white/50"> · {step.album}</span>}
              </p>
            )}
            <p className="mt-1 text-xs text-white/60">{step.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
