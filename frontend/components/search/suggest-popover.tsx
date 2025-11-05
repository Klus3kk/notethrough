"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SuggestItem {
  track_uri: string;
  track_name: string;
  artist_names?: string | null;
}

interface SuggestPopoverProps {
  items: SuggestItem[];
  onSelect: (uri: string) => void;
  visible: boolean;
}

export function SuggestPopover({ items, onSelect, visible }: SuggestPopoverProps) {
  if (!visible || items.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 w-full rounded-2xl border border-white/10 bg-card/90 backdrop-blur-xl shadow-card">
      <ul className="max-h-64 overflow-y-auto py-3">
        {items.map((item) => (
          <li
            key={item.track_uri}
            onClick={() => onSelect(item.track_uri)}
            className={cn(
              "cursor-pointer px-5 py-3 transition-colors",
              "hover:bg-white/10 active:bg-white/15"
            )}
          >
            <div className="text-sm font-medium text-foreground/90">{item.track_name}</div>
            <div className="text-xs text-muted">{item.artist_names ?? "Unknown artist"}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
