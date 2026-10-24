import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DataQualityCard } from '../components/DataQualityCard';
import type { AuditMetadata, MetricsSummary } from '../types/api';

const mockMetrics: MetricsSummary = {
  mae: 2000,
  rmse: 2500,
  meanBias: 500,
  wape: 15.0,
  totalActualMWh: 1000000,
  totalForecastMWh: 1100000,
  meanActualMW: 12000,
  meanForecastMW: 12500,
  peakActualMW: 16000,
  peakForecastMW: 18000,
  totalSettlementPeriods: 1488,
  validPeriodsCount: 1488,
  missingPeriodsCount: 0,
  completenessPercent: 100.0,
};

const mockAudit: AuditMetadata = {
  elexonBaseUrl: 'https://data.elexon.co.uk/bmrs/api/v1',
  datasetActual: 'FUELHH (fuelType=WIND)',
  datasetForecast: 'WINDFOR',
  cutoffTimeUsed: '11:00 GMT on D-1',
  cutoffSource: 'European SDAC Benchmark (12:00 CET)',
  timeResolution: '30-minute delivery periods (SP 1-48)',
  forecastMappingRule: 'Hourly WINDFOR mapped to dual 30-min settlement periods',
  totalPeriodsQueried: 1488,
  missingActualPeriods: 0,
  missingForecastPeriods: 0,
  distinctForecastRunsUsed: 31,
  assumptions: [
    'Zero fabrication guarantee',
    'Preserved authentic publishTime',
  ],
};

describe('DataQualityCard Component', () => {
  it('renders completeness badge, zero fabrication, and audit counts', () => {
    render(<DataQualityCard metrics={mockMetrics} audit={mockAudit} />);

    expect(screen.getByText('100.0% Completeness')).toBeInTheDocument();
    expect(screen.getByText('Zero Fabrication')).toBeInTheDocument();
    expect(screen.getAllByText('1,488')).toHaveLength(2); // Settlement Periods & Paired Observations
    expect(screen.getByText('31')).toBeInTheDocument(); // Forecast Runs Used
    expect(screen.getByText(/11:00 GMT on D-1/)).toBeInTheDocument();
  });
});
