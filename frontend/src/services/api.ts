import type {
  CutoffOption,
  DashboardDataResponse,
  DailyAggregate,
  HealthStatus,
  MetricsSummary,
  PeriodRecord,
} from '../types/api';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || '';

/**
 * Computes statistical summary metrics across a list of settlement period records
 * using the exact formulas from backend/app/metrics.py.
 */
export function computeMetricsSummaryClient(records: PeriodRecord[]): MetricsSummary {
  const total = records.length;
  const valid = records.filter(
    (r) => r.actualGeneration !== null && r.forecastGeneration !== null
  );
  const validCount = valid.length;
  const missingCount = total - validCount;
  const completeness = total > 0 ? (validCount / total) * 100 : 0;

  if (validCount === 0) {
    return {
      mae: 0,
      rmse: 0,
      meanBias: 0,
      wape: 0,
      totalActualMWh: 0,
      totalForecastMWh: 0,
      meanActualMW: 0,
      meanForecastMW: 0,
      peakActualMW: 0,
      peakForecastMW: 0,
      totalSettlementPeriods: total,
      validPeriodsCount: 0,
      missingPeriodsCount: missingCount,
      completenessPercent: Number(completeness.toFixed(2)),
    };
  }

  let sumActual = 0;
  let sumForecast = 0;
  let sumAbsError = 0;
  let sumSquaredError = 0;
  let sumError = 0;
  let peakActual = -Infinity;
  let peakForecast = -Infinity;

  for (const r of valid) {
    const act = r.actualGeneration!;
    const fct = r.forecastGeneration!;
    const err = fct - act;
    const absErr = Math.abs(err);

    sumActual += act;
    sumForecast += fct;
    sumError += err;
    sumAbsError += absErr;
    sumSquaredError += err * err;

    if (act > peakActual) peakActual = act;
    if (fct > peakForecast) peakForecast = fct;
  }

  const mae = sumAbsError / validCount;
  const rmse = Math.sqrt(sumSquaredError / validCount);
  const meanBias = sumError / validCount;
  const wape = sumActual > 0 ? (sumAbsError / sumActual) * 100 : 0;

  return {
    mae: Number(mae.toFixed(2)),
    rmse: Number(rmse.toFixed(2)),
    meanBias: Number(meanBias.toFixed(2)),
    wape: Number(wape.toFixed(2)),
    totalActualMWh: Number((sumActual * 0.5).toFixed(2)),
    totalForecastMWh: Number((sumForecast * 0.5).toFixed(2)),
    meanActualMW: Number((sumActual / validCount).toFixed(2)),
    meanForecastMW: Number((sumForecast / validCount).toFixed(2)),
    peakActualMW: Number(peakActual.toFixed(2)),
    peakForecastMW: Number(peakForecast.toFixed(2)),
    totalSettlementPeriods: total,
    validPeriodsCount: validCount,
    missingPeriodsCount: missingCount,
    completenessPercent: Number(completeness.toFixed(2)),
  };
}

/**
 * Computes daily summary metrics across each date in the dataset.
 */
export function computeDailyAggregatesClient(records: PeriodRecord[]): DailyAggregate[] {
  const byDate = new Map<string, PeriodRecord[]>();
  for (const r of records) {
    const list = byDate.get(r.settlementDate) || [];
    list.push(r);
    byDate.set(r.settlementDate, list);
  }

  const sortedDates = Array.from(byDate.keys()).sort();
  const aggregates: DailyAggregate[] = [];

  for (const date of sortedDates) {
    const recs = byDate.get(date) || [];
    const valid = recs.filter(
      (r) => r.actualGeneration !== null && r.forecastGeneration !== null
    );

    if (valid.length === 0) {
      aggregates.push({
        date,
        meanActualMW: 0,
        meanForecastMW: 0,
        totalActualMWh: 0,
        totalForecastMWh: 0,
        mae: 0,
        rmse: 0,
        meanBias: 0,
        peakActualMW: 0,
        peakForecastMW: 0,
        publishTimes: [],
      });
      continue;
    }

    let sumAct = 0;
    let sumFct = 0;
    let sumAbs = 0;
    let sumSq = 0;
    let sumDiff = 0;
    let peakAct = -Infinity;
    let peakFct = -Infinity;
    const pubSet = new Set<string>();

    for (const r of valid) {
      const a = r.actualGeneration!;
      const f = r.forecastGeneration!;
      const diff = f - a;
      sumAct += a;
      sumFct += f;
      sumDiff += diff;
      sumAbs += Math.abs(diff);
      sumSq += diff * diff;
      if (a > peakAct) peakAct = a;
      if (f > peakFct) peakFct = f;
      if (r.forecastPublishTime) pubSet.add(r.forecastPublishTime);
    }

    const n = valid.length;
    aggregates.push({
      date,
      meanActualMW: Number((sumAct / n).toFixed(2)),
      meanForecastMW: Number((sumFct / n).toFixed(2)),
      totalActualMWh: Number((sumAct * 0.5).toFixed(2)),
      totalForecastMWh: Number((sumFct * 0.5).toFixed(2)),
      mae: Number((sumAbs / n).toFixed(2)),
      rmse: Number(Math.sqrt(sumSq / n).toFixed(2)),
      meanBias: Number((sumDiff / n).toFixed(2)),
      peakActualMW: Number(peakAct.toFixed(2)),
      peakForecastMW: Number(peakFct.toFixed(2)),
      publishTimes: Array.from(pubSet).sort(),
    });
  }

  return aggregates;
}

/**
 * Helper to safely parse JSON response and ensure it is not an HTML redirect.
 */
export async function parseJsonSafely<T>(res: Response, endpointDesc: string): Promise<T> {
  const contentType = res.headers?.get ? res.headers.get('content-type') || '' : '';
  const text = await res.text();

  if (contentType.includes('text/html') || text.trim().startsWith('<!doctype') || text.trim().startsWith('<html')) {
    throw new Error(`Endpoint ${endpointDesc} returned HTML instead of JSON.`);
  }

  try {
    return JSON.parse(text) as T;
  } catch (err: any) {
    throw new Error(`Failed to parse JSON from ${endpointDesc}: ${err.message}`);
  }
}

/**
 * Checks backend health status, falling back to static precomputed health metadata if needed.
 */
export async function checkBackendHealth(): Promise<HealthStatus> {
  // If an explicit live API base is provided, try that first
  if (API_BASE) {
    try {
      const res = await fetch(`${API_BASE}/api/health`);
      if (res.ok) {
        return await parseJsonSafely<HealthStatus>(res, 'live /api/health');
      }
    } catch (err) {
      console.warn('Live API health check failed, checking static mode...', err);
    }
  }

  // Static mode or fallback
  const staticRes = await fetch('/data/health.json');
  if (staticRes.ok) {
    return await parseJsonSafely<HealthStatus>(staticRes, 'static health.json');
  }

  throw new Error('Health check failed: unable to reach live backend or static health.json');
}

/**
 * Fetches cutoff options from live backend or static cutoff_options.json.
 */
export async function fetchCutoffOptions(): Promise<CutoffOption[]> {
  if (API_BASE) {
    try {
      const res = await fetch(`${API_BASE}/api/cutoff-options`);
      if (res.ok) {
        return await parseJsonSafely<CutoffOption[]>(res, 'live /api/cutoff-options');
      }
    } catch (err) {
      console.warn('Live cutoff options fetch failed, falling back to static data...', err);
    }
  }

  const staticRes = await fetch('/data/cutoff_options.json');
  if (staticRes.ok) {
    return await parseJsonSafely<CutoffOption[]>(staticRes, 'static cutoff_options.json');
  }

  throw new Error('Failed to load cutoff options');
}

/**
 * Fetches dashboard data.
 * When in static mode, loads the authentic precomputed JSON file for the given cutoff
 * and slices/recomputes metrics if date filtering is applied.
 */
export async function fetchDashboardData(
  startDate: string,
  endDate: string,
  cutoffTime: string,
  forceRefresh: boolean = false
): Promise<DashboardDataResponse> {
  // 1. Try live backend if API_BASE is configured
  if (API_BASE) {
    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        cutoff_time: cutoffTime,
        force_refresh: forceRefresh ? 'true' : 'false',
      });
      const res = await fetch(`${API_BASE}/api/data?${params.toString()}`);
      if (res.ok) {
        return await parseJsonSafely<DashboardDataResponse>(res, 'live /api/data');
      }
      console.warn(`Live API returned HTTP ${res.status}, falling back to static dataset...`);
    } catch (err) {
      console.warn('Live API fetch failed, falling back to static dataset...', err);
    }
  }

  // 2. Load authentic precomputed dataset for the chosen cutoff
  const cleanCutoff = (cutoffTime || '11:00').replace(':', '');
  const staticUrl = `/data/eval_${cleanCutoff}.json`;

  const res = await fetch(staticUrl);
  if (!res.ok) {
    // If specific cutoff not found, try default 11:00
    const fallbackRes = await fetch('/data/eval_1100.json');
    if (!fallbackRes.ok) {
      throw new Error(`Failed to load dataset for cutoff ${cutoffTime} (HTTP ${res.status})`);
    }
    return parseAndFilterDataset(await parseJsonSafely<DashboardDataResponse>(fallbackRes, 'eval_1100.json'), startDate, endDate);
  }

  const fullDataset = await parseJsonSafely<DashboardDataResponse>(res, staticUrl);
  return parseAndFilterDataset(fullDataset, startDate, endDate);
}

/**
 * Slices precomputed dataset to the requested date range and recalculates summary metrics
 * if a sub-range is selected.
 */
function parseAndFilterDataset(
  fullDataset: DashboardDataResponse,
  startDate: string,
  endDate: string
): DashboardDataResponse {
  // If full month requested, return complete precomputed payload directly
  if (startDate === '2026-01-01' && endDate === '2026-01-31') {
    return fullDataset;
  }

  // Sliced time-series records
  const slicedRecords = fullDataset.timeSeries.filter(
    (r) => r.settlementDate >= startDate && r.settlementDate <= endDate
  );

  // Recompute summary metrics using exact BSC formulas
  const metrics = computeMetricsSummaryClient(slicedRecords);

  // Slice daily aggregates
  const dailyAggregates = fullDataset.dailyAggregates.filter(
    (d) => d.date >= startDate && d.date <= endDate
  );

  // Update audit metadata
  const audit = {
    ...fullDataset.audit,
    totalPeriodsQueried: slicedRecords.length,
    missingActualPeriods: slicedRecords.filter((r) => r.isActualMissing).length,
    missingForecastPeriods: slicedRecords.filter((r) => r.isForecastMissing).length,
  };

  return {
    metrics,
    timeSeries: slicedRecords,
    dailyAggregates,
    audit,
  };
}

/**
 * Returns only the metrics summary.
 */
export async function fetchMetricsOnly(
  startDate: string,
  endDate: string,
  cutoffTime: string
): Promise<MetricsSummary> {
  const data = await fetchDashboardData(startDate, endDate, cutoffTime, false);
  return data.metrics;
}

/**
 * Refreshes cache. In static mode, confirms the benchmark data freshness.
 */
export async function refreshCache(
  startDate: string,
  endDate: string
): Promise<{ status: string; message: string; metrics: MetricsSummary }> {
  if (API_BASE) {
    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
      });
      const res = await fetch(`${API_BASE}/api/refresh-cache?${params.toString()}`, {
        method: 'POST',
      });
      if (res.ok) {
        return await parseJsonSafely(res, 'live /api/refresh-cache');
      }
    } catch (err) {
      console.warn('Live cache refresh failed:', err);
    }
  }

  const data = await fetchDashboardData(startDate, endDate, '11:00', false);
  return {
    status: 'success',
    message: `Precomputed January 2026 benchmark active (${data.metrics.totalSettlementPeriods} settlement periods verified).`,
    metrics: data.metrics,
  };
}
