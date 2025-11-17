"use client";

import * as React from "react";

import { Hero } from "@/components/hero";
import { BlendConsole } from "@/components/blend-console";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SpotifyRecommender } from "@/components/spotify-recommender";
import { TrackExplorerPanel } from "@/components/track-explorer-panel";
import { SpotifyChecker } from "@/components/spotify-checker";
import { StoryModePreview } from "@/components/story-mode";
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
    title: "Notethrough Studio",
    description: "All your discovery experiences in one surface. Start anonymous, connect Spotify when you're ready, and explore recommender, analytics, and quest-driven flows.",
    tags: ["Recommender", "Analytics", "Journeys"],
    render: ({ goTo }) => <HomeLanding onStart={() => goTo("offline-recommender")} />
  },
  {
    id: "offline-recommender",
    title: "Universal recommender",
    description: "Describe favourite tracks or albums and get fresh suggestions—no Spotify login required.",
    tags: ["Hybrid engine", "No auth"],
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
    tags: ["Search", "Metadata"],
    render: () => <TrackExplorerPanel />
  },
  {
    id: "story-mode",
    title: "Story mode analytics",
    description: "Generate narrative cards from Spotify stats showing how your taste ranks globally.",
    tags: ["Stories", "Shareables"],
    render: () => <StoryModePreview />
  },
  {
    id: "journeys",
    title: "Discovery journeys",
    description: "Follow quests that hop through artists, labels, and playlists. Works for anonymous & Spotify users.",
    tags: ["Quests", "Graph"],
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

function HomeLanding({ onStart }: { onStart: () => void }) {
  const highlights = [
    {
      title: "Blend offline",
      body: "Type a mood, paste favourite tracks, and let the hybrid engine surface surprise pairings."
    },
    {
      title: "Read your story",
      body: "Once Spotify is connected, Story Mode compares your taste to the global catalogue."
    },
    {
      title: "Follow quests",
      body: "Discovery Journeys hop across artists, labels, and playlists like creative briefs."
    }
  ];

  return (
    <div className="space-y-10">
      <section className="panel grid gap-8 rounded-2xl bg-gradient-to-tr from-accent-teal/30 via-surface to-glow p-8 lg:grid-cols-2">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.5rem] text-white/60">Start here</p>
          <h3 className="text-4xl font-semibold text-foreground">Blend smarter, tell the story behind every recommendation.</h3>
          <p className="text-base text-white/80">
            Notethrough stitches together deterministic audio features, human signals, and exploratory noise so you can prototype
            playlists and insights in minutes.
          </p>
          <div className="flex flex-wrap gap-3 text-sm text-white/80">
            <span>Hybrid recommender</span>
            <span>Spotify analytics</span>
            <span>Quest navigation</span>
          </div>
          <div className="pt-2">
            <Button onClick={onStart} variant="primary">
              Launch recommender
            </Button>
          </div>
        </div>
        <div className="grid gap-4 text-sm text-white/80">
          <div>
            <p className="text-xs uppercase tracking-[0.35rem] text-white/60">What you get</p>
            <ul className="mt-3 space-y-2">
              <li>• Anonymous track explorer with live metadata.</li>
              <li>• Spotify checker for listening history + playlists.</li>
              <li>• Story cards + discovery journeys shipping soon.</li>
            </ul>
          </div>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        {highlights.map((item) => (
          <div key={item.title} className="panel p-5 text-sm text-white/80">
            <p className="text-base font-semibold text-foreground">{item.title}</p>
            <p>{item.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

function Placeholder({ description }: { description: string }) {
  return <section className="panel p-6 text-sm text-white/70">{description}</section>;
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
          "hidden min-h-screen flex-col border-r border-black/40 bg-black text-white transition-[width,padding] duration-300 lg:flex",
          collapsed ? "w-0 px-0" : "w-80 px-6 py-14"
        )}
      >
        {!collapsed && (
          <>
            <div className="mb-10">
              <p className="text-sm uppercase tracking-[0.4rem] text-white/40">Notethrough</p>
              <h1 className="text-2xl font-semibold">Studio</h1>
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
      <button
        type="button"
        aria-label="Toggle menu"
        onClick={onToggle}
        className="fixed top-1/2 z-20 hidden -translate-y-1/2 rounded-full px-3 py-2 text-xs font-semibold text-black shadow-2xl lg:inline-flex"
        style={{ left: buttonOffset }}
      >
        {collapsed ? "Menu" : "Hide"}
      </button>
    </>
  );
}
