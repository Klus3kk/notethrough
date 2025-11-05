import { cn } from "@/lib/utils";
import type { TrackSummary } from "@/hooks/use-track-search";

type SelectableTrack = TrackSummary & { selected?: boolean };

interface ResultsTableProps {
  results: SelectableTrack[];
  loading: boolean;
  onSelect?: (uri: string) => void;
}

export function ResultsTable({ results, loading, onSelect }: ResultsTableProps) {
  if (loading) {
    return (
      <div className="card-surface mt-6 flex h-40 items-center justify-center text-sm text-muted">
        Fetching tracks...
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="card-surface mt-6 flex h-40 items-center justify-center text-sm text-muted">
        Start searching to explore the dataset.
      </div>
    );
  }

  return (
    <div className="card-surface mt-6 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-muted">
            <th className="px-6 py-4 text-left">Track</th>
            <th className="px-6 py-4 text-left">Artist</th>
            <th className="px-6 py-4 text-left">Album</th>
            <th className="px-6 py-4 text-right">Popularity</th>
          </tr>
        </thead>
        <tbody>
          {results.map((track, index) => (
            <tr
              key={track.track_uri}
              onClick={() => onSelect?.(track.track_uri)}
              className={cn(
                "cursor-pointer text-sm transition-colors",
                index % 2 === 0 ? "bg-white/2" : "bg-transparent",
                track.selected ? "bg-white/20" : "hover:bg-white/10"
              )}
            >
              <td className="px-6 py-4 font-medium text-foreground/90">{track.track_name}</td>
              <td className="px-6 py-4 text-muted">{track.artist_names ?? "Unknown"}</td>
              <td className="px-6 py-4 text-muted">
                {track.album_name ?? "—"}
                {track.release_year ? ` (${track.release_year})` : ""}
              </td>
              <td className="px-6 py-4 text-right text-foreground/80">
                {track.popularity != null ? Math.round(track.popularity) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
