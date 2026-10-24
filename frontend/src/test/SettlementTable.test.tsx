import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SettlementTable } from '../components/SettlementTable';
import type { PeriodRecord } from '../types/api';

const mockRecords: PeriodRecord[] = [
  {
    settlementDate: '2026-01-01',
    settlementPeriod: 1,
    startTime: '2026-01-01T00:00:00Z',
    actualGeneration: 13756.0,
    forecastGeneration: 19466.0,
    forecastPublishTime: '2025-12-31T09:30:00Z',
    error: 5710.0,
    absError: 5710.0,
    squaredError: 32604100.0,
    isForecastMissing: false,
    isActualMissing: false,
  },
  {
    settlementDate: '2026-01-01',
    settlementPeriod: 2,
    startTime: '2026-01-01T00:30:00Z',
    actualGeneration: 14100.0,
    forecastGeneration: 13500.0,
    forecastPublishTime: '2025-12-31T09:30:00Z',
    error: -600.0,
    absError: 600.0,
    squaredError: 360000.0,
    isForecastMissing: false,
    isActualMissing: false,
  },
];

describe('SettlementTable Component', () => {
  it('renders records, displays formatted numbers, and filters by search term', () => {
    render(<SettlementTable records={mockRecords} />);

    expect(screen.getByText('13,756')).toBeInTheDocument();
    expect(screen.getByText('19,466')).toBeInTheDocument();
    expect(screen.getByText('+5,710')).toBeInTheDocument();
    expect(screen.getByText('-600')).toBeInTheDocument();

    // Test search filter
    const searchInput = screen.getByPlaceholderText('Filter date or SP...');
    fireEvent.change(searchInput, { target: { value: 'SP2' } });

    expect(screen.queryByText('+5,710')).not.toBeInTheDocument();
    expect(screen.getByText('-600')).toBeInTheDocument();
  });
});

