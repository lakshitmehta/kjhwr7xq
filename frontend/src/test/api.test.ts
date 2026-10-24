import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  checkBackendHealth,
  fetchCutoffOptions,
  fetchDashboardData,
} from '../services/api';

describe('API Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('checkBackendHealth returns status object on success', async () => {
    const mockHealth = {
      status: 'ok',
      app: 'UK Wind Forecast Dashboard',
      version: '1.0.0',
      fuelhh_cache_exists: true,
      windfor_cache_exists: true,
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockHealth,
    } as any);

    const result = await checkBackendHealth();
    expect(result.status).toBe('ok');
    expect(result.fuelhh_cache_exists).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/health');
  });

  it('fetchCutoffOptions returns array of options', async () => {
    const mockCutoffs = [
      {
        cutoff_time: '11:00',
        name: 'Standard Benchmark',
        source: 'SDAC',
        description: 'Benchmark gate closure',
      },
    ];

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockCutoffs,
    } as any);

    const result = await fetchCutoffOptions();
    expect(result).toHaveLength(1);
    expect(result[0].cutoff_time).toBe('11:00');
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/cutoff-options');
  });

  it('fetchDashboardData constructs query parameters properly', async () => {
    const mockResponse = {
      metrics: { mae: 100 },
      timeSeries: [],
      dailyAggregates: [],
      audit: {},
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as any);

    await fetchDashboardData('2026-01-01', '2026-01-07', '11:00', false);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/data?start_date=2026-01-01&end_date=2026-01-07&cutoff_time=11%3A00&force_refresh=false'
    );
  });

  it('throws descriptive error on HTTP failure', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => JSON.stringify({ detail: 'Calculation exception' }),
    } as any);

    await expect(
      fetchDashboardData('2026-01-01', '2026-01-07', '11:00')
    ).rejects.toThrow('Calculation exception');
  });
});
