"use client";

import * as React from "react";
import type { TrackSummary } from "@/hooks/useBlendStudio";

const templates = [
  "Seeds lean %GENRE% with %PCT%%% energy. Expect punchy drums over smoky textures.",
  "We are bridging %YEARSPAN% influences so the blend feels classic yet fresh.",
  "%ENERGY%%% energy vs %DANCE%%% danceability – built for focused movement.",
  "Story card: owning the %GENRE% underground while remaining playlist-friendly."
];

export function EffectPreview({ seeds }: { seeds: TrackSummary[] }) {
  const [copy, setCopy] = React.useState({ title: "Blend preview is warming up", body: "Add seeds to generate the story." });

  React.useEffect(() => {
    if (seeds.length === 0) {
      setCopy({ title: "Blend preview is warming up", body: "Add seeds to generate the story." });
      return;
    }
    const genre = seeds[0].genres?.[0] ?? "genre blend";
    const energy = Math.round((seeds.reduce((sum, item) => sum + (item.energy ?? 0.62), 0) / seeds.length) * 100);
    const dance = Math.round((seeds.reduce((sum, item) => sum + (item.danceability ?? 0.55), 0) / seeds.length) * 100);
    const years = seeds.map((seed) => seed.release_year).filter(Boolean) as number[];
    const span = years.length ? `${Math.min(...years)}–${Math.max(...years)}` : "multi-era";
    const template = templates[Math.floor(Math.random() * templates.length)];
    setCopy({
      title: `${genre} effect`,
      body: template
        .replace("%GENRE%", genre)
        .replace("%PCT%", String(Math.min(99, energy)))
        .replace("%YEARSPAN%", span)
        .replace("%ENERGY%", String(energy))
        .replace("%DANCE%", String(dance))
    });
  }, [seeds]);

  return (
    <section className="panel space-y-3 p-5">
      <p className="text-xs uppercase tracking-[0.35rem] text-white/50">Blend effect</p>
      <h3 className="text-2xl font-semibold text-white">{copy.title}</h3>
      <p className="text-sm text-white/80">{copy.body}</p>
      <p className="text-xs text-white/50">Story Mode will render this narrative as a shareable card.</p>
    </section>
  );
}
