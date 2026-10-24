import React from 'react';
import { Calendar, Clock, RefreshCw, Filter, Sparkles } from 'lucide-react';
import type { CutoffOption } from '../types/api';

interface FilterBarProps {
  startDate: string;
  endDate: string;
  cutoffTime: string;
  cutoffOptions: CutoffOption[];
  isLoading: boolean;
  onStartDateChange: (val: string) => void;
  onEndDateChange: (val: string) => void;
  onCutoffChange: (val: string) => void;
  onApplyFilters: () => void;
  onForceRefresh: () => void;
  isRefreshingLive: boolean;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  startDate,
  endDate,
  cutoffTime,
  cutoffOptions,
  isLoading,
  onStartDateChange,
  onEndDateChange,
  onCutoffChange,
  onApplyFilters,
  onForceRefresh,
  isRefreshingLive,
}) => {
  const selectedCutoff = cutoffOptions.find((c) => c.cutoff_time === cutoffTime);

  const presets = [
    { label: 'Full Month (Jan 1-31)', start: '2026-01-01', end: '2026-01-31' },
    { label: 'Week 1 (Jan 1-7)', start: '2026-01-01', end: '2026-01-07' },
    { label: 'Week 2 (Jan 8-14)', start: '2026-01-08', end: '2026-01-14' },
    { label: 'Week 3 (Jan 15-21)', start: '2026-01-15', end: '2026-01-21' },
    { label: 'High Volatility Window (Jan 21-25)', start: '2026-01-21', end: '2026-01-25' },
    { label: 'Week 4 (Jan 22-31)', start: '2026-01-22', end: '2026-01-31' },
  ];

  const applyPreset = (start: string, end: string) => {
    onStartDateChange(start);
    onEndDateChange(end);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl shadow-slate-950/40">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 flex-1">
          {/* Date Range Start */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span>Start Delivery Date</span>
            </label>
            <input
              type="date"
              value={startDate}
              min="2026-01-01"
              max="2026-01-31"
              onChange={(e) => onStartDateChange(e.target.value)}
              className="bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono transition-colors"
            />
          </div>

          {/* Date Range End */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span>End Delivery Date</span>
            </label>
            <input
              type="date"
              value={endDate}
              min="2026-01-01"
              max="2026-01-31"
              onChange={(e) => onEndDateChange(e.target.value)}
              className="bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono transition-colors"
            />
          </div>

          {/* Cutoff Selector */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-teal-400" />
              <span>Day-Ahead Decision Cutoff</span>
            </label>
            <select
              value={cutoffTime}
              onChange={(e) => onCutoffChange(e.target.value)}
              className="bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors cursor-pointer"
            >
              {cutoffOptions.map((opt) => (
                <option key={opt.cutoff_time} value={opt.cutoff_time}>
                  {opt.cutoff_time} GMT • {opt.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 pt-2 lg:pt-4 self-end lg:self-center">
          <button
            onClick={onApplyFilters}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-cyan-600/20 disabled:opacity-50 transition-all cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{isLoading ? 'Recalculating...' : 'Update Evaluation'}</span>
          </button>

          <button
            onClick={onForceRefresh}
            disabled={isRefreshingLive}
            title="Bypass local cache and query Elexon BMRS API directly"
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium disabled:opacity-50 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingLive ? 'animate-spin text-cyan-400' : ''}`} />
            <span className="hidden sm:inline">Sync Live</span>
          </button>
        </div>
      </div>

      {/* Preset Pills */}
      <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-slate-400 font-medium mr-1 flex items-center space-x-1 text-[11px]">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span>Quick Windows:</span>
        </span>
        {presets.map((preset) => {
          const isActive = startDate === preset.start && endDate === preset.end;
          return (
            <button
              key={preset.label}
              onClick={() => applyPreset(preset.start, preset.end)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-800/70 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 border border-slate-700/50'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Cutoff Description Info banner */}
      {selectedCutoff && (
        <div className="mt-3 px-3 py-2 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px] text-slate-400 flex items-start space-x-2">
          <Clock className="w-3.5 h-3.5 text-teal-400 mt-0.5 shrink-0" />
          <div>
            <span className="text-slate-300 font-semibold">{selectedCutoff.name}: </span>
            <span>{selectedCutoff.description}</span>
            <span className="text-slate-500 ml-1">({selectedCutoff.source})</span>
          </div>
        </div>
      )}
    </div>
  );
};

