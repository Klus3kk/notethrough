import { TopNav } from "@/components/dashboard/top-nav";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ProductMatrix } from "@/components/dashboard/product-matrix";
import { TimelineCard } from "@/components/dashboard/timeline";
import { metrics, sparklinePoints } from "@/data/dashboard";
import { fetchDashboardMetrics } from "@/lib/api";
import TrackExplorer from "@/components/track-explorer";

export default async function DashboardPage() {
  let liveMetrics: Awaited<ReturnType<typeof fetchDashboardMetrics>> | null = null;
  try {
    liveMetrics = await fetchDashboardMetrics();
  } catch (error) {
    console.warn("Dashboard metrics fallback", error);
  }

  const enrichedMetrics = metrics.map((metric, index) => {
    if (!liveMetrics) return metric;
    const valueMap = [liveMetrics.customer, liveMetrics.product, liveMetrics.playlist];
    return {
      ...metric,
      value: `${valueMap[index]?.toFixed(1) ?? metric.value}`
    };
  });

  return (
    <main className="min-h-screen bg-dashboard-grid bg-[length:40px_40px] pb-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-10">
        <TopNav />
        <section className="grid gap-6 md:grid-cols-3">
          {enrichedMetrics.map((metric, index) => (
            <MetricCard key={metric.id} {...metric} sparkline={index === 0 ? sparklinePoints : undefined} />
          ))}
        </section>
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <ProductMatrix />
          <TimelineCard />
        </section>
        <TrackExplorer />
      </div>
    </main>
  );
}
