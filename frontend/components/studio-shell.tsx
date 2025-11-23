"use client";

import * as React from "react";

import { Hero } from "@/components/hero";
import { BlendConsole } from "@/components/blend-console";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SpotifyRecommender } from "@/components/spotify-recommender";
import { TrackExplorerPanel } from "@/components/track-explorer-panel";
import { SpotifyChecker } from "@/components/spotify-checker";
import { DiscoveryJourneys } from "@/components/discovery-journeys";

interface Section {
  id: string;
  title: string;
  description: string;
  tags: string[];
  render: (helpers: { goTo: (id: string) => void }) => React.ReactNode;
}

const sections: Section[] = [
  {
    id: "home",
    title: "Notethrough",
    description: "All your discovery experiences in one surface. Start anonymous, connect Spotify when you're ready, and explore recommender, analytics and quest-driven flows.",
    tags: [],
    render: () => ( <></>
    )
  },
  {
    id: "offline-recommender",
    title: "Universal recommender",
    description: "Describe favourite tracks or albums and get fresh suggestions—no Spotify login required.",
    tags: ["No auth"],
    render: () => <BlendConsole />
  },
  {
    id: "spotify-recommender",
    title: "Spotify recommender",
    description: "Connect Spotify to blend saved music with live embeddings and surface overlooked gems.",
    tags: ["OAuth", "Live data"],
    render: () => <SpotifyRecommender />
  },
  {
    id: "spotify-checker",
    title: "Spotify checker",
    description: "Audit listening history, behaviours, and playlists. Click a playlist to drill into stats.",
    tags: ["History", "Playlists"],
    render: () => <SpotifyChecker />
  },
  {
    id: "track-explorer",
    title: "Universal track explorer",
    description: "Search the catalogue, filter by mood, and inspect metadata without logging in.",
    tags: ["Search"],
    render: () => <TrackExplorerPanel />
  },
  {
    id: "journeys",
    title: "Discovery journeys",
    description: "Follow quests that hop through artists, labels, and playlists. Works for anonymous & Spotify users.",
    tags: ["Quests"],
    render: () => <DiscoveryJourneys />
  }
];

export function StudioShell() {
  const [activeId, setActiveId] = React.useState(sections[0].id);
  const [collapsed, setCollapsed] = React.useState(false);
  const active = sections.find((section) => section.id === activeId) ?? sections[0];

  return (
    <div className="relative flex min-h-screen bg-background text-foreground">
      <NavigationPanel
        sections={sections}
        activeId={activeId}
        onSelect={setActiveId}
        collapsed={collapsed}
        onToggle={() => setCollapsed((prev) => !prev)}
      />
      <main className="relative flex flex-1 flex-col gap-8 px-8 pb-20 pt-14 lg:px-16">
        <Hero title={active.title} description={active.description} tags={active.tags} actionLabel={active.id === "home" ? "Start exploring" : "Launch"} />
        <div key={active.id} className="fade-in">
          {active.render({
            goTo: setActiveId
          })}
        </div>
      </main>
    </div>
  );
}

function NavigationPanel({
  sections,
  activeId,
  onSelect,
  collapsed,
  onToggle
}: {
  sections: Section[];
  activeId: string;
  onSelect: (id: string) => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const buttonOffset = collapsed ? 16 : 320;
  return (
    <>
      <nav
        className={cn(
          "hidden flex-col border-r border-black/40 bg-black text-white transition-[width,padding] duration-300 lg:flex lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto",
          collapsed ? "w-0 px-0" : "w-80 px-6 py-14"
        )}
      >
        {!collapsed && (
          <>
            <div className="mb-10">
              <p className="text-sm uppercase tracking-[0.4rem] text-white/40">Notethrough</p>
            </div>
            <nav className="space-y-3 text-sm">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => onSelect(section.id)}
                  className={cn(
                    "w-full border px-4 py-3 text-left transition",
                    section.id === activeId ? "border-white text-white" : "border-white/20 text-white/60 hover:border-white"
                  )}
                >
                  <p className="font-semibold">{section.title}</p>
                  <p className="text-xs text-white/50">{section.description}</p>
                </button>
              ))}
            </nav>
          </>
        )}
      </nav>
      {collapsed ? (
        <button
          type="button"
          aria-label="Show menu"
          onClick={onToggle}
          className="fixed top-1/2 z-20 hidden -translate-y-1/2 border border-white/60 bg-black/80 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.3rem] text-white shadow-[0_10px_20px_rgba(0,0,0,0.7)] lg:inline-flex"
          style={{ left: buttonOffset }}
        >
          Menu →
        </button>
      ) : (
        <button
          type="button"
          aria-label="Hide menu"
          onClick={onToggle}
          className="fixed top-1/2 z-20 hidden -translate-y-1/2 border border-white/60 bg-black/80 px-2 py-2 text-white shadow-[0_10px_20px_rgba(0,0,0,0.7)] lg:inline-flex"
          style={{ left: buttonOffset }}
        >
          <span className="text-lg">←</span>
        </button>
      )}
    </>
  );
}
