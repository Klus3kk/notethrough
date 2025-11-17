"use client";

const cards = [
  {
    title: "Top 10% for 70s soul",
    body: "Your listening leans toward lush orchestration and major-key vocals."
  },
  {
    title: "Weekend BPM spike",
    body: "Average BPM jumps +18 on Fridays compared to weekdays."
  },
  {
    title: "Quiet morning fan",
    body: "You hit the lowest loudness percentile at 8am compared to other users."
  }
];

export function StoryModePreview() {
  return (
    <section className="panel space-y-6 p-6">
      <h3 className="text-2xl font-semibold text-white">Story mode analytics</h3>
      <p className="text-sm text-white/70">Narratives generated after Spotify connection. Each card is export-ready.</p>
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <div key={card.title} className="rounded-2xl border border-white/15 bg-glow/20 p-5 text-sm text-white/80">
            <p className="text-xs uppercase tracking-[0.4rem] text-white/50">Insight</p>
            <p className="mt-2 text-lg font-semibold text-white">{card.title}</p>
            <p className="mt-2 text-white/70">{card.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
