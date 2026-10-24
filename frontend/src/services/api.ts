import type {
  CutoffOption,
  DashboardDataResponse,
  HealthStatus,
  MetricsSummary,
} from '../types/api';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || '';

export async function checkBackendHealth(): Promise<HealthStatus> {
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) {
    throw new Error(`Health check failed with HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchCutoffOptions(): Promise<CutoffOption[]> {
  const res = await fetch(`${API_BASE}/api/cutoff-options`);
  if (!res.ok) {
    throw new Error(`Failed to fetch cutoff options (HTTP ${res.status})`);
  }
  return res.json();
}

export async function fetchDashboardData(
  startDate: string,
  endDate: string,
  cutoffTime: string,
  forceRefresh: boolean = false
): Promise<DashboardDataResponse> {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    cutoff_time: cutoffTime,
    force_refresh: String(forceRefresh),
  });

  const res = await fetch(`${API_BASE}/api/data?${params.toString()}`);
  if (!res.ok) {
    const errorText = await res.text();
    let detail = errorText;
    try {
      const parsed = JSON.parse(errorText);
      detail = parsed.detail || errorText;
    } catch {
      // Keep raw string
    }
    throw new Error(detail || `Failed to fetch dashboard data (HTTP ${res.status})`);
  }
  return res.json();
}

export async function fetchMetricsOnly(
  startDate: string,
  endDate: string,
  cutoffTime: string
): Promise<MetricsSummary> {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    cutoff_time: cutoffTime,
  });

  const res = await fetch(`${API_BASE}/api/metrics?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch metrics summary (HTTP ${res.status})`);
  }
  return res.json();
}

export async function refreshCache(startDate: string, endDate: string): Promise<{ status: string; message: string; metrics: MetricsSummary }> {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
  });

  const res = await fetch(`${API_BASE}/api/refresh-cache?${params.toString()}`, {
    method: 'POST',
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Cache refresh failed (HTTP ${res.status}): ${errorText}`);
  }
  return res.json();
}

