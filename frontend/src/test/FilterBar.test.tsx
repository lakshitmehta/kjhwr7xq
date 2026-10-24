import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FilterBar } from '../components/FilterBar';
import type { CutoffOption } from '../types/api';

const mockCutoffOptions: CutoffOption[] = [
  {
    cutoff_time: '09:20',
    name: 'EPEX SPOT GB (60m)',
    source: 'EPEX Rules',
    description: 'Day-ahead 60-min gate closure',
  },
  {
    cutoff_time: '11:00',
    name: 'SDAC Benchmark',
    source: 'European Single Day-Ahead Coupling',
    description: '12:00 CET reference',
  },
];

describe('FilterBar Component', () => {
  it('renders date inputs, cutoff dropdown, and preset pills', () => {
    const handleStartChange = vi.fn();
    const handleEndChange = vi.fn();
    const handleCutoffChange = vi.fn();
    const handleApply = vi.fn();
    const handleRefresh = vi.fn();

    render(
      <FilterBar
        startDate="2026-01-01"
        endDate="2026-01-31"
        cutoffTime="11:00"
        cutoffOptions={mockCutoffOptions}
        isLoading={false}
        isRefreshingLive={false}
        onStartDateChange={handleStartChange}
        onEndDateChange={handleEndChange}
        onCutoffChange={handleCutoffChange}
        onApplyFilters={handleApply}
        onForceRefresh={handleRefresh}
      />
    );

    // Check preset buttons
    const presetBtn = screen.getByText('High Volatility Window (Jan 21-25)');
    expect(presetBtn).toBeInTheDocument();
    fireEvent.click(presetBtn);

    expect(handleStartChange).toHaveBeenCalledWith('2026-01-21');
    expect(handleEndChange).toHaveBeenCalledWith('2026-01-25');

    // Check apply button
    const applyBtn = screen.getByText('Update Evaluation');
    fireEvent.click(applyBtn);
    expect(handleApply).toHaveBeenCalled();
  });
});

