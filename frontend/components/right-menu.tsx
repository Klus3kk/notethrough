"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const features = [
  {
    title: "Personal vs global",
    description: "OAuth with Spotify to overlay your taste percentile and trigger personal stats.",
    status: "In progress"
  },
  {
    title: "Discovery journeys",
    description: "Interactive map of artists, labels, and playlists so you can wander influence chains.",
    status: "Design"
  },
  {
    title: "Story mode",
    description: "Narratives rendered as shareable cards, e.g. “Top 10% for 70s soul”.",
    status: "Next"
  }
];

export function RightMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 right-0 z-10 w-72 bg-coal/95 px-6 py-8 text-white shadow-[-30px_0_70px_rgba(0,0,0,0.6)] transition-transform lg:static lg:w-80",
        open ? "translate-x-0" : "translate-x-full lg:translate-x-0 lg:hidden"
      )}
    >
      <div className="flex items-center justify-between text-sm uppercase tracking-[0.3rem] text-white/50">
        <span>Studio Menu</span>
        <button className="text-white/70 lg:hidden" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="mt-6 space-y-6 text-sm">
        <section>
          <p className="text-xs uppercase tracking-[0.3rem] text-white/40">Placeholders</p>
          <ul className="mt-3 space-y-3 text-white/80">
            <li>• Recent blends (coming soon)</li>
            <li>• Saved playlists</li>
            <li>• Notifications</li>
          </ul>
        </section>
        <section id="roadmap">
          <p className="text-xs uppercase tracking-[0.3rem] text-white/40">Features shipping</p>
          <div className="mt-4 space-y-4">
            {features.map((feature) => (
              <div key={feature.title} className="space-y-1">
                <p className="text-sm font-semibold text-white">{feature.title}</p>
                <p className="text-white/60">{feature.description}</p>
                <p className="text-xs uppercase tracking-[0.3rem] text-white/40">{feature.status}</p>
              </div>
            ))}
          </div>
        </section>
        <section>
          <p className="text-xs uppercase tracking-[0.3rem] text-white/40">Support</p>
          <Button variant="secondary" className="mt-3 w-full">
            Contact team
          </Button>
        </section>
      </div>
    </aside>
  );
}
