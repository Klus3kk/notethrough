export interface DashboardMetricsResponse {
  customer: number;
  product: number;
  playlist: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function fetchDashboardMetrics(): Promise<DashboardMetricsResponse> {
  const res = await fetch(`${API_BASE}/tracks/stats`, { next: { revalidate: 60 } });
  if (!res.ok) {
    throw new Error("Failed to load metrics");
  }
  const data = await res.json();
  return {
    customer: data.totals.average_energy ?? 0,
    product: data.totals.average_danceability ?? 0,
    playlist: data.totals.average_popularity ?? 0
  };
}
