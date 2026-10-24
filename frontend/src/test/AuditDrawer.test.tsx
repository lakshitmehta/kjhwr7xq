import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AuditDrawer } from '../components/AuditDrawer';
import type { AuditMetadata } from '../types/api';

const mockAudit: AuditMetadata = {
  elexonBaseUrl: 'https://data.elexon.co.uk/bmrs/api/v1',
  datasetActual: 'FUELHH (fuelType=WIND)',
  datasetForecast: 'WINDFOR',
  cutoffTimeUsed: '11:00 GMT on D-1',
  cutoffSource: 'Analytical Benchmark: European Single Day-Ahead Coupling (12:00 CET)',
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

describe('AuditDrawer Component', () => {
  it('explicitly distinguishes binding exchange rules from analytical benchmarks and engineering assumptions', () => {
    render(<AuditDrawer isOpen={true} onClose={() => {}} audit={mockAudit} />);

    // Binding rules
    expect(screen.getByText('Legally Binding Exchange Auction Gate Closures:')).toBeInTheDocument();
    expect(screen.getByText(/09:20 GMT:/)).toBeInTheDocument();
    expect(screen.getByText(/09:50 GMT:/)).toBeInTheDocument();
    expect(screen.getByText(/15:30 GMT:/)).toBeInTheDocument();

    // Benchmarks
    expect(screen.getByText('Analytical & Operational Benchmarks:')).toBeInTheDocument();
    expect(screen.getByText(/11:00 GMT:/)).toBeInTheDocument();
    expect(screen.getByText(/12:00 GMT:/)).toBeInTheDocument();

    // Explicit distinction alert
    expect(screen.getByText('Important Distinction:')).toBeInTheDocument();
  });
});

