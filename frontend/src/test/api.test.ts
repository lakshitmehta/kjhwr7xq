import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  checkBackendHealth,
  fetchCutoffOptions,
  fetchDashboardData,
  computeMetricsSummaryClient,
  computeDailyAggregatesClient,
  parseJsonSafely,
  refreshCache,
} from '../services/api';
import type { PeriodRecord, DashboardDataResponse } from '../types/api';

describe('API Service - Static Mode & Metric Calculations', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('parseJsonSafely', () => {
    it('parses valid JSON response', async () => {
      const mockRes = {
        headers: { get: () => 'application/json' },
        text: async () => JSON.stringify({ status: 'ok', value: 42 }),
      } as unknown as Response;

      const result = await parseJsonSafely<{ status: string; value: number }>(
        mockRes,
        'test endpoint'
      );
      expect(result).toEqual({ status: 'ok', value: 42 });
    });

    it('rejects HTML responses (detecting Vercel SPA index.html rewrites)', async () => {
      const mockRes = {
        headers: { get: () => 'text/html; charset=utf-8' },
        text: async () => '<!doctype html><html><body>App</body></html>',
      } as unknown as Response;

      await expect(parseJsonSafely(mockRes, '/api/endpoint')).rejects.toThrow(
        'Endpoint /api/endpoint returned HTML instead of JSON.'
      );
    });

    it('rejects responses with HTML tags in body even if content-type is missing', async () => {
      const mockRes = {
        headers: { get: () => null },
        text: async () => '<html><body>Not found</body></html>',
      } as unknown as Response;

      await expect(parseJsonSafely(mockRes, '/data/missing')).rejects.toThrow(
        'Endpoint /data/missing returned HTML instead of JSON.'
      );
    });

    it('throws on malformed JSON', async () => {
      const mockRes = {
        headers: { get: () => 'application/json' },
        text: async () => '{ incomplete json: 123',
      } as unknown as Response;

      await expect(parseJsonSafely(mockRes, 'bad json')).rejects.toThrow(
        /Failed to parse JSON from bad json/
      );
    });
  });

  describe('computeMetricsSummaryClient', () => {
    it('computes metrics accurately on known values (formulas mirror backend/app/metrics.py)', () => {
      const sampleRecords: PeriodRecord[] = [
        {
          settlementDate: '2026-01-01',
          settlementPeriod: 1,
          startTime: '2026-01-01T00:00:00Z',
          actualGeneration: 10000,
          forecastGeneration: 12000, // Error: +2000 MW (over-forecast)
          forecastPublishTime: '2025-12-31T10:00:00Z',
          error: 2000,
          absError: 2000,
          squaredError: 4000000,
          isActualMissing: false,
          isForecastMissing: false,
        },
        {
          settlementDate: '2026-01-01',
          settlementPeriod: 2,
          startTime: '2026-01-01T00:30:00Z',
          actualGeneration: 12000,
          forecastGeneration: 10000, // Error: -2000 MW (under-forecast)
          forecastPublishTime: '2025-12-31T10:00:00Z',
          error: -2000,
          absError: 2000,
          squaredError: 4000000,
          isActualMissing: false,
          isForecastMissing: false,
        },
      ];

      const metrics = computeMetricsSummaryClient(sampleRecords);

      // MAE = (|2000| + |-2000|) / 2 = 2000
      expect(metrics.mae).toBe(2000);
      // RMSE = sqrt((2000^2 + (-2000)^2) / 2) = 2000
      expect(metrics.rmse).toBe(2000);
      // Mean Bias = (2000 + (-2000)) / 2 = 0
      expect(metrics.meanBias).toBe(0);
      // WAPE = (4000 / 22000) * 100 = 18.18%
      expect(metrics.wape).toBe(18.18);
      // Energy = MW * 0.5 h -> Actual: 22000 * 0.5 = 11000 MWh
      expect(metrics.totalActualMWh).toBe(11000);
      expect(metrics.totalForecastMWh).toBe(11000);
      expect(metrics.peakActualMW).toBe(12000);
      expect(metrics.peakForecastMW).toBe(12000);
      expect(metrics.validPeriodsCount).toBe(2);
      expect(metrics.missingPeriodsCount).toBe(0);
      expect(metrics.completenessPercent).toBe(100);
    });

    it('handles empty records cleanly', () => {
      const metrics = computeMetricsSummaryClient([]);
      expect(metrics.mae).toBe(0);
      expect(metrics.rmse).toBe(0);
      expect(metrics.meanBias).toBe(0);
      expect(metrics.wape).toBe(0);
      expect(metrics.totalActualMWh).toBe(0);
      expect(metrics.totalSettlementPeriods).toBe(0);
      expect(metrics.completenessPercent).toBe(0);
    });

    it('correctly filters out null or missing records', () => {
      const records: PeriodRecord[] = [
        {
          settlementDate: '2026-01-01',
          settlementPeriod: 1,
          startTime: '2026-01-01T00:00:00Z',
          actualGeneration: 8000,
          forecastGeneration: 9000,
          forecastPublishTime: '2025-12-31T10:00:00Z',
          error: 1000,
          absError: 1000,
          squaredError: 1000000,
          isActualMissing: false,
          isForecastMissing: false,
        },
        {
          settlementDate: '2026-01-01',
          settlementPeriod: 2,
          startTime: '2026-01-01T00:30:00Z',
          actualGeneration: null,
          forecastGeneration: 9500,
          forecastPublishTime: '2025-12-31T10:00:00Z',
          error: null,
          absError: null,
          squaredError: null,
          isActualMissing: true,
          isForecastMissing: false,
        },
      ];

      const metrics = computeMetricsSummaryClient(records);
      expect(metrics.totalSettlementPeriods).toBe(2);
      expect(metrics.validPeriodsCount).toBe(1);
      expect(metrics.missingPeriodsCount).toBe(1);
      expect(metrics.completenessPercent).toBe(50);
      expect(metrics.mae).toBe(1000);
    });
  });

  describe('computeDailyAggregatesClient', () => {
    it('groups records by date and computes daily statistics', () => {
      const records: PeriodRecord[] = [
        {
          settlementDate: '2026-01-01',
          settlementPeriod: 1,
          startTime: '2026-01-01T00:00:00Z',
          actualGeneration: 10000,
          forecastGeneration: 11000,
          forecastPublishTime: '2025-12-31T10:00:00Z',
          error: 1000,
          absError: 1000,
          squaredError: 1000000,
          isActualMissing: false,
          isForecastMissing: false,
        },
        {
          settlementDate: '2026-01-02',
          settlementPeriod: 1,
          startTime: '2026-01-02T00:00:00Z',
          actualGeneration: 14000,
          forecastGeneration: 13000,
          forecastPublishTime: '2026-01-01T10:00:00Z',
          error: -1000,
          absError: 1000,
          squaredError: 1000000,
          isActualMissing: false,
          isForecastMissing: false,
        },
      ];

      const daily = computeDailyAggregatesClient(records);
      expect(daily).toHaveLength(2);
      expect(daily[0].date).toBe('2026-01-01');
      expect(daily[0].mae).toBe(1000);
      expect(daily[0].totalActualMWh).toBe(5000); // 10000 * 0.5
      expect(daily[0].publishTimes).toEqual(['2025-12-31T10:00:00Z']);

      expect(daily[1].date).toBe('2026-01-02');
      expect(daily[1].mae).toBe(1000);
      expect(daily[1].totalActualMWh).toBe(7000);
    });
  });

  describe('checkBackendHealth', () => {
    it('fetches /data/health.json in static mode', async () => {
      const mockHealth = {
        status: 'ok',
        app: 'UK Wind Forecast Dashboard',
        version: '1.0.0',
        mode: 'static_precomputed',
        dataset: 'January 2026 Elexon BMRS Benchmark',
        fuelhh_cache_exists: true,
        windfor_cache_exists: true,
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        text: async () => JSON.stringify(mockHealth),
      } as unknown as Response);

      const health = await checkBackendHealth();
      expect(health.status).toBe('ok');
      expect(health.mode).toBe('static_precomputed');
      expect(globalThis.fetch).toHaveBeenCalledWith('/data/health.json');
    });

    it('throws error when health check endpoint fails', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      } as unknown as Response);

      await expect(checkBackendHealth()).rejects.toThrow(
        'Health check failed: unable to reach live backend or static health.json'
      );
    });
  });

  describe('fetchCutoffOptions', () => {
    it('loads all 5 cutoff options from /data/cutoff_options.json', async () => {
      const mockOptions = [
        {
          cutoff_time: '09:20',
          name: '09:20 UK Auction Cutoff',
          source: 'EPEX SPOT',
          description: 'Early auction benchmark',
        },
        {
          cutoff_time: '09:50',
          name: '09:50 Pre-Auction Cutoff',
          source: 'Nord Pool',
          description: 'Nord Pool cutoff benchmark',
        },
        {
          cutoff_time: '11:00',
          name: '11:00 SDAC Day-Ahead Benchmark',
          source: 'SDAC / EPEX',
          description: 'Pan-European day-ahead gate closure',
        },
        {
          cutoff_time: '12:00',
          name: '12:00 Elexon DA Gate Closure',
          source: 'Elexon BSC',
          description: 'BSC Section Q day-ahead gate closure',
        },
        {
          cutoff_time: '15:30',
          name: '15:30 Afternoon Update',
          source: 'Afternoon trading',
          description: 'Post-gate intraday update',
        },
      ];

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        text: async () => JSON.stringify(mockOptions),
      } as unknown as Response);

      const options = await fetchCutoffOptions();
      expect(options).toHaveLength(5);
      expect(options.map((o) => o.cutoff_time)).toEqual([
        '09:20',
        '09:50',
        '11:00',
        '12:00',
        '15:30',
      ]);
      expect(globalThis.fetch).toHaveBeenCalledWith('/data/cutoff_options.json');
    });
  });

  describe('fetchDashboardData - All 5 Cutoffs & Date Slicing', () => {
    const mockFullPayload: DashboardDataResponse = {
      metrics: {
        mae: 2126.12,
        rmse: 2717.39,
        meanBias: 919.88,
        wape: 18.33,
        totalActualMWh: 8616068.5,
        totalForecastMWh: 9985249.0,
        meanActualMW: 11580.74,
        meanForecastMW: 13421.03,
        peakActualMW: 21877.0,
        peakForecastMW: 21323.0,
        totalSettlementPeriods: 1488,
        validPeriodsCount: 1488,
        missingPeriodsCount: 0,
        completenessPercent: 100.0,
      },
      timeSeries: [
        {
          settlementDate: '2026-01-01',
          settlementPeriod: 1,
          startTime: '2026-01-01T00:00:00Z',
          actualGeneration: 10000,
          forecastGeneration: 12000,
          forecastPublishTime: '2025-12-31T10:00:00Z',
          error: 2000,
          absError: 2000,
          squaredError: 4000000,
          isActualMissing: false,
          isForecastMissing: false,
        },
        {
          settlementDate: '2026-01-15',
          settlementPeriod: 1,
          startTime: '2026-01-15T00:00:00Z',
          actualGeneration: 15000,
          forecastGeneration: 16000,
          forecastPublishTime: '2026-01-14T10:00:00Z',
          error: 1000,
          absError: 1000,
          squaredError: 1000000,
          isActualMissing: false,
          isForecastMissing: false,
        },
      ],
      dailyAggregates: [
        {
          date: '2026-01-01',
          meanActualMW: 10000,
          meanForecastMW: 12000,
          totalActualMWh: 5000,
          totalForecastMWh: 6000,
          mae: 2000,
          rmse: 2000,
          meanBias: 2000,
          peakActualMW: 10000,
          peakForecastMW: 12000,
          publishTimes: ['2025-12-31T10:00:00Z'],
        },
        {
          date: '2026-01-15',
          meanActualMW: 15000,
          meanForecastMW: 16000,
          totalActualMWh: 7500,
          totalForecastMWh: 8000,
          mae: 1000,
          rmse: 1000,
          meanBias: 1000,
          peakActualMW: 15000,
          peakForecastMW: 16000,
          publishTimes: ['2026-01-14T10:00:00Z'],
        },
      ],
      audit: {
        elexonBaseUrl: 'https://data.elexon.co.uk/bmrs/api/v1',
        datasetActual: 'FUELHH',
        datasetForecast: 'WINDFOR',
        cutoffTimeUsed: '11:00',
        cutoffSource: 'Single Day-Ahead Coupling (SDAC)',
        timeResolution: '30-minute settlement periods (half-hourly)',
        forecastMappingRule:
          'Hourly WINDFOR mapped to two consecutive half-hour settlement periods',
        totalPeriodsQueried: 1488,
        missingActualPeriods: 0,
        missingForecastPeriods: 0,
        distinctForecastRunsUsed: 31,
        assumptions: [
          'Forecast published strictly <= 11:00 GMT on D-1',
          'Hourly values apply to SP 2k-1 and 2k',
        ],
      },
    };

    it.each([
      ['09:20', '/data/eval_0920.json'],
      ['09:50', '/data/eval_0950.json'],
      ['11:00', '/data/eval_1100.json'],
      ['12:00', '/data/eval_1200.json'],
      ['15:30', '/data/eval_1530.json'],
    ])(
      'maps cutoff %s to correct static file %s',
      async (cutoff, expectedUrl) => {
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          headers: { get: () => 'application/json' },
          text: async () => JSON.stringify(mockFullPayload),
        } as unknown as Response);

        const data = await fetchDashboardData('2026-01-01', '2026-01-31', cutoff);
        expect(globalThis.fetch).toHaveBeenCalledWith(expectedUrl);
        expect(data.metrics.mae).toBe(2126.12);
      }
    );

    it('correctly filters date sub-ranges and recomputes metrics client-side', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        text: async () => JSON.stringify(mockFullPayload),
      } as unknown as Response);

      // Query only Jan 1 to Jan 7
      const sliced = await fetchDashboardData('2026-01-01', '2026-01-07', '11:00');

      // Only the Jan 1 record should remain
      expect(sliced.timeSeries).toHaveLength(1);
      expect(sliced.timeSeries[0].settlementDate).toBe('2026-01-01');
      expect(sliced.dailyAggregates).toHaveLength(1);
      expect(sliced.dailyAggregates[0].date).toBe('2026-01-01');

      // Recomputed metrics: 1 record, act: 10000, fct: 12000 -> MAE: 2000, Bias: +2000
      expect(sliced.metrics.mae).toBe(2000);
      expect(sliced.metrics.meanBias).toBe(2000);
      expect(sliced.metrics.totalActualMWh).toBe(5000);
      expect(sliced.metrics.totalForecastMWh).toBe(6000);
      expect(sliced.metrics.validPeriodsCount).toBe(1);
    });

    it('falls back to eval_1100.json if chosen cutoff is not found', async () => {
      globalThis.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          text: async () => JSON.stringify(mockFullPayload),
        } as unknown as Response);

      const data = await fetchDashboardData('2026-01-01', '2026-01-31', '08:00');
      expect(data.metrics.totalSettlementPeriods).toBe(1488);
      expect(globalThis.fetch).toHaveBeenNthCalledWith(1, '/data/eval_0800.json');
      expect(globalThis.fetch).toHaveBeenNthCalledWith(2, '/data/eval_1100.json');
    });

    it('throws error when both cutoff file and fallback fail', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      } as unknown as Response);

      await expect(
        fetchDashboardData('2026-01-01', '2026-01-31', '99:99')
      ).rejects.toThrow('Failed to load dataset for cutoff 99:99 (HTTP 404)');
    });
  });

  describe('refreshCache in Static Mode', () => {
    it('returns benchmark confirmation status', async () => {
      const mockPayload = {
        metrics: { totalSettlementPeriods: 1488 },
        timeSeries: [],
        dailyAggregates: [],
        audit: {},
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        text: async () => JSON.stringify(mockPayload),
      } as unknown as Response);

      const result = await refreshCache('2026-01-01', '2026-01-31');
      expect(result.status).toBe('success');
      expect(result.message).toContain('1488 settlement periods verified');
    });
  });
});
