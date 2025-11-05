import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { productStatus } from "@/data/dashboard";

const labels = ["UI", "UX", "Flow", "Mix", "Master", "Drop"];

export function ProductMatrix() {
  const max = Math.max(...productStatus.flatMap((s) => s.values));

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm uppercase tracking-wide text-muted">Product</CardTitle>
          <p className="mt-1 text-foreground/90">Pods in review</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted">
          {productStatus.map((status) => (
            <span key={status.id} className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: status.color }} />
              {status.label}
            </span>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-6 gap-3">
          {labels.map((label, index) => (
            <div key={label} className="flex flex-col items-center gap-3">
              <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
              <div className="flex h-40 w-full items-end justify-center gap-[6px] rounded-2xl bg-white/4 p-2 shadow-inner">
                {productStatus.map((status) => {
                  const value = status.values[index] ?? status.values[status.values.length - 1];
                  return (
                    <div
                      key={`${status.id}-${label}`}
                      className="w-4 rounded-full border border-white/10 bg-white/5"
                      style={{
                        height: `${(value / max) * 100}%`,
                        background: `linear-gradient(180deg, ${status.color}, rgba(255,255,255,0.05))`
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
