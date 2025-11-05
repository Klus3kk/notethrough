import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  delta: string;
  color: string;
  sparkline?: number[];
}

export function MetricCard({ title, value, subtitle, delta, color, sparkline }: MetricCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full opacity-50 blur-3xl"
        style={{ background: color }}
      />
      <CardHeader className="relative z-10">
        <CardTitle className="text-sm uppercase tracking-wide text-muted">{title}</CardTitle>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-semibold tracking-tight">{value}</span>
          <span className="text-xs text-muted">{subtitle}</span>
        </div>
      </CardHeader>
      <CardContent className="relative z-10 flex items-end justify-between">
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-foreground/80">{delta}</span>
        {sparkline ? <Sparkline points={sparkline} color={color} /> : null}
      </CardContent>
    </Card>
  );
}

function Sparkline({ points, color }: { points: number[]; color: string }) {
  const max = Math.max(...points);
  return (
    <div className="flex h-16 w-32 items-end gap-[3px]">
      {points.map((value, idx) => (
        <div
          key={`spark-${idx}`}
          className="w-[6px] rounded-full"
          style={{
            height: `${(value / max) * 100}%`,
            background: `linear-gradient(180deg, ${color} 0%, rgba(255,255,255,0.05) 100%)`
          }}
        />
      ))}
    </div>
  );
}
