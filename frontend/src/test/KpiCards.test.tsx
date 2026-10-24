import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { KpiCards } from '../components/KpiCards';
import type { MetricsSummary } from '../types/api';

const mockMetrics: MetricsSummary = {
  mae: 2157.51,
  rmse: 2594.64,
  meanBias: 1983.7,
  wape: 16.75,
  totalActualMWh: 2163995.5,
  totalForecastMWh: 2497257.0,
  meanActualMW: 12880.93,
  meanForecastMW: 14864.62,
  peakActualMW: 16757.0,
  peakForecastMW: 20044.0,
  totalSettlementPeriods: 336,
  validPeriodsCount: 336,
  missingPeriodsCount: 0,
  completenessPercent: 100.0,
};

describe('KpiCards Component', () => {
  it('renders MAE, RMSE, Bias, and WAPE formatted values', () => {
    render(<KpiCards metrics={mockMetrics} />);

    // MAE
    expect(screen.getByText('Mean Absolute Error (MAE)')).toBeInTheDocument();
    expect(screen.getByText(/2,157\.5/)).toBeInTheDocument();

    // RMSE
    expect(screen.getByText('Root Mean Squared Error (RMSE)')).toBeInTheDocument();
    expect(screen.getByText(/2,594\.6/)).toBeInTheDocument();

    // Bias (positive over-forecast)
    expect(screen.getByText('Mean Forecast Bias')).toBeInTheDocument();
    expect(screen.getByText(/\+1,983\.7/)).toBeInTheDocument();
    expect(screen.getByText('Over-forecasting (F > A)')).toBeInTheDocument();

    // WAPE
    expect(screen.getByText('Weighted Absolute Error (WAPE)')).toBeInTheDocument();
    expect(screen.getByText('16.75')).toBeInTheDocument();
  });

  it('renders negative bias correctly with Under-forecasting badge', () => {
    const underforecastMetrics: MetricsSummary = {
      ...mockMetrics,
      meanBias: -450.2,
    };

    render(<KpiCards metrics={underforecastMetrics} />);

    expect(screen.getByText('-450.2')).toBeInTheDocument();
    expect(screen.getByText('Under-forecasting (F < A)')).toBeInTheDocument();
  });
});

