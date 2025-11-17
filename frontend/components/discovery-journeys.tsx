"use client";

const quests = [
  {
    id: 1,
    title: "Analog warmth quest",
    steps: ["Start from your seed", "Jump to label mates", "Visit fan-made playlist", "Export as mix"],
    status: "Beta"
  },
  {
    id: 2,
    title: "Club culture detour",
    steps: ["Pick a high-energy seed", "Blend in adjacent scenes", "Surface micro-genre gems"],
    status: "Prototype"
  }
];

export function DiscoveryJourneys() {
  return (
    <section className="panel space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-semibold text-white">Discovery journeys</h3>
        <span className="rounded-full border border-white/30 px-3 py-1 text-xs text-white/70">Quests</span>
      </div>
      <div className="space-y-4 text-sm text-white/80">
        {quests.map((quest) => (
          <div key={quest.id} className="rounded border border-white/15 p-4">
            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold text-white">{quest.title}</p>
              <span className="text-xs uppercase tracking-[0.3rem] text-white/50">{quest.status}</span>
            </div>
            <ol className="mt-3 list-decimal space-y-1 pl-5">
              {quest.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}
