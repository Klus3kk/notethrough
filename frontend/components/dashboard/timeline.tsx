import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { timeline } from "@/data/dashboard";

export function TimelineCard() {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm uppercase tracking-wide text-muted">Projects Timeline</CardTitle>
          <p className="text-foreground/90">Live release schedule</p>
        </div>
        <div className="text-xs text-muted">Total: {timeline.length}</div>
      </CardHeader>
      <CardContent className="space-y-6">
        {timeline.map((item) => (
          <div key={item.id} className="space-y-2">
            <div className="flex items-center justify-between text-sm text-white/80">
              <span className="font-medium">{item.title}</span>
              <span className="text-xs text-muted">{item.start} — {item.end}</span>
            </div>
            <div className="relative h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${item.progress}%`,
                  background: `linear-gradient(90deg, ${item.color}, rgba(255,255,255,0.2))`
                }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted">
              <span>{item.owner}</span>
              <span>{item.progress}%</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
