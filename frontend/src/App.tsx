import { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { FilterBar } from './components/FilterBar';
import { KpiCards } from './components/KpiCards';
import { EnergySummaryCards } from './components/EnergySummaryCards';
import { DataQualityCard } from './components/DataQualityCard';
import { ForecastVsActualChart } from './components/ForecastVsActualChart';
import { ErrorAnalysisChart } from './components/ErrorAnalysisChart';
import { DailyAggregatesChart } from './components/DailyAggregatesChart';
import { SettlementTable } from './components/SettlementTable';
import { AuditDrawer } from './components/AuditDrawer';
import { LoadingSkeleton } from './components/LoadingSkeleton';
import { ErrorMessage } from './components/ErrorMessage';
import type {
  CutoffOption,
  DashboardDataResponse,
  HealthStatus,
} from './types/api';
import {
  checkBackendHealth,
  fetchCutoffOptions,
  fetchDashboardData,
  refreshCache,
} from './services/api';

export function App() {
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-01-31');
  const [cutoffTime, setCutoffTime] = useState('11:00');

  const [cutoffOptions, setCutoffOptions] = useState<CutoffOption[]>([]);
  const [data, setData] = useState<DashboardDataResponse | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingLive, setIsRefreshingLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);

  // Load initial health & cutoff options
  useEffect(() => {
    async function init() {
      try {
        setHealthLoading(true);
        const healthRes = await checkBackendHealth();
        setHealth(healthRes);
      } catch (err: any) {
        console.warn('Backend health check error:', err);
      } finally {
        setHealthLoading(false);
      }

      try {
        const cutoffs = await fetchCutoffOptions();
        setCutoffOptions(cutoffs);
      } catch (err: any) {
        console.warn('Cutoff options load error:', err);
      }
    }

    init();
  }, []);

  // Fetch dashboard data
  const loadDashboardData = useCallback(
    async (forceRefresh: boolean = false) => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetchDashboardData(startDate, endDate, cutoffTime, forceRefresh);
        setData(res);
      } catch (err: any) {
        console.error('Failed to load dashboard data:', err);
        setError(err.message || 'An error occurred while loading dashboard data.');
      } finally {
        setIsLoading(false);
      }
    },
    [startDate, endDate, cutoffTime]
  );

  // Initial data load
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Live Elexon refresh trigger
  const handleForceRefresh = async () => {
    if (!window.confirm('Pull live January 2026 data directly from Elexon BMRS API? This will verify data freshness.')) {
      return;
    }
    try {
      setIsRefreshingLive(true);
      await refreshCache(startDate, endDate);
      await loadDashboardData(true);
    } catch (err: any) {
      alert(`Live Elexon refresh failed: ${err.message}`);
    } finally {
      setIsRefreshingLive(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        health={health}
        healthLoading={healthLoading}
        onOpenAudit={() => setAuditOpen(true)}
      />

      {/* Main Page Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Filter Controls */}
        <FilterBar
          startDate={startDate}
          endDate={endDate}
          cutoffTime={cutoffTime}
          cutoffOptions={cutoffOptions}
          isLoading={isLoading}
          isRefreshingLive={isRefreshingLive}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onCutoffChange={setCutoffTime}
          onApplyFilters={() => loadDashboardData(false)}
          onForceRefresh={handleForceRefresh}
        />

        {/* Loading State */}
        {isLoading && <LoadingSkeleton />}

        {/* Error State */}
        {!isLoading && error && (
          <ErrorMessage
            message={error}
            onRetry={() => loadDashboardData(false)}
          />
        )}

        {/* Loaded Data Content */}
        {!isLoading && !error && data && (
          <div className="space-y-6">
            {/* Primary KPI Cards */}
            <KpiCards metrics={data.metrics} />

            {/* Energy Volume & Peak Comparison */}
            <EnergySummaryCards metrics={data.metrics} />

            {/* Data Quality & Traceability Indicators */}
            <DataQualityCard metrics={data.metrics} audit={data.audit} />

            {/* Main Interactive Forecast vs Actual Chart */}
            <ForecastVsActualChart
              timeSeries={data.timeSeries}
              dailyAggregates={data.dailyAggregates}
            />

            {/* Residual Error Analysis Chart */}
            <ErrorAnalysisChart timeSeries={data.timeSeries} />

            {/* Daily Aggregates (MAE & Bias) Chart */}
            <DailyAggregatesChart
              dailyAggregates={data.dailyAggregates}
              onSelectDate={(dt) => {
                setStartDate(dt);
                setEndDate(dt);
              }}
            />

            {/* Granular Settlement Table Ledger */}
            <SettlementTable records={data.timeSeries} />
          </div>
        )}
      </main>

      {/* Audit & Methodology Modal */}
      <AuditDrawer
        isOpen={auditOpen}
        onClose={() => setAuditOpen(false)}
        audit={data?.audit ?? null}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-xs text-slate-500 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            UK Renewable Wind Generation Evaluation • Official Elexon BMRS Data
          </div>
          <div className="flex items-center space-x-4">
            <span className="font-mono">Settlement Periods: 30-min</span>
            <span className="text-slate-700">•</span>
            <button
              onClick={() => setAuditOpen(true)}
              className="hover:text-cyan-400 transition-colors cursor-pointer"
            >
              Methodology & Audit
            </button>
            <span className="text-slate-700">•</span>
            <a
              href="https://data.elexon.co.uk/bmrs/api/v1"
              target="_blank"
              rel="noreferrer"
              className="hover:text-cyan-400 transition-colors"
            >
              Elexon Portal
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
