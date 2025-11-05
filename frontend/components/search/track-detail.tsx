import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TrackSummary } from "@/hooks/use-track-search";

const featureFields: Array<{ key: keyof TrackSummary; label: string }> = [
  { key: "danceability", label: "Danceability" },
  { key: "energy", label: "Energy" },
  { key: "valence", label: "Valence" },
  { key: "acousticness", label: "Acoustic" },
  { key: "instrumentalness", label: "Instrumental" },
  { key: "tempo", label: "Tempo" }
];

interface TrackDetailPanelProps {
  track: TrackSummary | null;
  onClear?: () => void;
}

export function TrackDetailPanel({ track, onClear }: TrackDetailPanelProps) {
  if (!track) {
    return null;
  }

  const genres = track.genres ?? [];

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-sm uppercase tracking-wide text-muted">Selection detail</CardTitle>
          <h3 className="mt-1 text-xl font-semibold text-foreground">{track.track_name}</h3>
          <p className="text-sm text-muted">{track.artist_names ?? "Unknown artist"}</p>
          <p className="text-xs text-muted">{track.album_name ?? "—"}{track.release_year ? ` · ${track.release_year}` : ""}</p>
        </div>
        <div className="flex flex-col items-end gap-2 text-xs text-muted">
          <span>{track.popularity != null ? `${Math.round(track.popularity)} popularity` : "Popularity unknown"}</span>
          {onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="rounded-full bg-white/10 px-3 py-1 text-xs text-foreground/80 transition hover:bg-white/20"
            >
              Clear selection
            </button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {genres.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs">
            {genres.map((genre) => (
              <Badge key={genre} className="bg-white/10 text-foreground/80">
                {genre}
              </Badge>
            ))}
          </div>
        )}
        <div className="grid gap-3 md:grid-cols-3">
          {featureFields.map(({ key, label }) => {
            const raw = track[key];
            if (raw == null) {
              return (
                <div key={key} className="rounded-2xl bg-white/4 p-4 text-xs text-muted">
                  {label}
                  <div className="mt-2 text-sm text-foreground/70">—</div>
                </div>
              );
            }
            const value = typeof raw === "number" ? raw : Number(raw);
            const percent = Math.max(0, Math.min(value > 1 ? value : value * 100, 100));
            return (
              <div key={key} className="rounded-2xl bg-white/4 p-4">
                <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
                <div className="mt-2 flex items-center justify-between text-sm text-foreground/90">
                  <span>{percent.toFixed(0)}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-white/10">
                  <div className="h-2 rounded-full bg-white/80" style={{ width: `${percent}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
