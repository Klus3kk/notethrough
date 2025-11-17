"use client";

import * as React from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface JourneyStep {
  title: string;
  description: string;
}

interface Journey {
  seed: string;
  summary: string;
  steps: JourneyStep[];
}

export function DiscoveryJourneys() {
  const [journeys, setJourneys] = React.useState<Journey[]>([]);

  React.useEffect(() => {
    async function fetchJourneys() {
      try {
        const res = await fetch(`${API_BASE}/tracks/journeys`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed");
        const data = (await res.json()) as Journey[];
        setJourneys(data);
      } catch {
        setJourneys([]);
      }
    }
    void fetchJourneys();
  }, []);

  return (
    <section className="panel space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-semibold text-white">Discovery journeys</h3>
        <span className="rounded-full border border-white/30 px-3 py-1 text-xs text-white/70">Quests</span>
      </div>
      <div className="space-y-4 text-sm text-white/80">
        {journeys.map((journey) => (
          <div key={journey.seed} className="rounded border border-white/15 p-4">
            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold text-white">{journey.seed}</p>
              <span className="text-xs uppercase tracking-[0.3rem] text-white/50">Quest</span>
            </div>
            <p className="mt-1 text-xs text-white/60">{journey.summary}</p>
            <ol className="mt-3 list-decimal space-y-1 pl-5">
              {journey.steps.map((step) => (
                <li key={`${journey.seed}-${step.title}`}>
                  <span className="font-semibold">{step.title}:</span> {step.description}
                </li>
              ))}
            </ol>
          </div>
        ))}
        {journeys.length === 0 && <p className="text-sm text-white/60">Journeys load once Spotify insights are available.</p>}
      </div>
    </section>
  );
}
