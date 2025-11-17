import { Compass, Sparkles, LineChart } from "lucide-react";

const roadmap = [
  {
    icon: LineChart,
    title: "Personal vs global",
    description: "OAuth with Spotify and overlay your taste percentile against the global dataset.",
    tag: "In progress"
  },
  {
    icon: Compass,
    title: "Discovery journeys",
    description: "Interactive graph showing artists, labels, and playlist branches to follow inspiration.",
    tag: "Design"
  },
  {
    icon: Sparkles,
    title: "Story mode",
    description: "Narratives like “Top 10% for 70s soul” rendered as shareable cards.",
    tag: "Next"
  }
];

export function FeatureRoadmap() {
  return (
    <section id="roadmap" className="panel space-y-4 p-5">
      <p className="text-xs uppercase tracking-[0.35rem] text-white/40">Roadmap</p>
      <div className="space-y-4">
        {roadmap.map((feature) => (
          <div key={feature.title} className="flex items-start gap-3 text-sm text-white/70">
            <feature.icon className="mt-1 h-4 w-4 text-sage" />
            <div>
              <p className="text-base font-semibold text-white">{feature.title}</p>
              <p>{feature.description}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.3rem] text-white/40">{feature.tag}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
