import type { Recommendation } from "@/hooks/useBlendStudio";

export function RecommendationsPanel({
  recommendations,
  state,
  hasSeeds
}: {
  recommendations: Recommendation[];
  state: "idle" | "searching" | "blending";
  hasSeeds: boolean;
}) {
  return (
    <section className="panel space-y-4 p-5">
      <div className="flex items-center justify-between text-sm text-white/60">
        <span>Recommendations</span>
        <span>{state === "blending" ? "Scoring…" : hasSeeds ? `${recommendations.length} results` : "Add seeds"}</span>
      </div>
      {!hasSeeds && <p className="text-sm text-white/60">Select seeds to get suggestions.</p>}
      {hasSeeds && recommendations.length === 0 && state !== "blending" && (
        <p className="text-sm text-white/60">Waiting for blend. Try a different combination.</p>
      )}
      <div className="space-y-3">
        {recommendations.map((rec) => (
          <div key={rec.track_uri} className="rounded border border-white/15 px-3 py-3 text-sm text-white/80">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">{rec.track_name}</p>
                <p className="text-xs text-white/60">{rec.artist_names ?? "Unknown"}</p>
              </div>
              <span className="text-xs text-white/60">{Math.round(rec.similarity * 100)}%</span>
            </div>
            {rec.components && (
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-white/70">
                {Object.entries(rec.components).slice(0, 3).map(([key, value]) => (
                  <div key={key} className="rounded border border-white/10 px-2 py-1 text-center">
                    <p className="uppercase tracking-wide text-[10px] text-white/40">{key}</p>
                    <p className="text-white">{(value * 100).toFixed(0)}%</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
