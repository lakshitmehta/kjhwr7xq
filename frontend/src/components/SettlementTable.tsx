import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { PeriodRecord } from '../types/api';

interface SettlementTableProps {
  records: PeriodRecord[];
}

export const SettlementTable: React.FC<SettlementTableProps> = ({ records }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [errorFilter, setErrorFilter] = useState<'all' | 'over' | 'under'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Search matches date, settlement period, or start time
      const matchesSearch =
        searchTerm === '' ||
        r.settlementDate.includes(searchTerm) ||
        `SP${r.settlementPeriod}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.startTime.includes(searchTerm);

      if (!matchesSearch) return false;

      if (errorFilter === 'over') return (r.error ?? 0) > 0;
      if (errorFilter === 'under') return (r.error ?? 0) < 0;
      return true;
    });
  }, [records, searchTerm, errorFilter]);

  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage]);

  // Export to CSV using authentic data
  const handleExportCSV = () => {
    const headers = [
      'Settlement Date',
      'Settlement Period',
      'Start Time (UTC)',
      'Actual Wind Generation (MW)',
      'Forecast Wind Generation (MW)',
      'Forecast Error (MW)',
      'Absolute Error (MW)',
      'WINDFOR Publish Time (UTC)',
      'Is Forecast Missing',
      'Is Actual Missing',
    ];

    const rows = filteredRecords.map((r) => [
      r.settlementDate,
      r.settlementPeriod,
      r.startTime,
      r.actualGeneration ?? '',
      r.forecastGeneration ?? '',
      r.error ?? '',
      r.absError ?? '',
      r.forecastPublishTime ?? '',
      r.isForecastMissing,
      r.isActualMissing,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `elexon_wind_forecast_eval_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl shadow-slate-950/30">
      {/* Table Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-white tracking-tight">
              Settlement Period Data Ledger
            </h2>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
              {filteredRecords.length} Periods Filtered
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit-ready half-hourly records with preserved WINDFOR publication timestamps
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter date or SP..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-36 sm:w-44 font-mono transition-colors"
            />
          </div>

          {/* Error filter dropdown */}
          <select
            value={errorFilter}
            onChange={(e: any) => {
              setErrorFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 transition-colors cursor-pointer"
          >
            <option value="all">All Errors</option>
            <option value="over">Over-forecast (F &gt; A)</option>
            <option value="under">Under-forecast (F &lt; A)</option>
          </select>

          {/* Export CSV button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-medium transition-colors cursor-pointer"
            title="Export filtered records to CSV"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider font-sans">
            <tr>
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-2 text-center">SP</th>
              <th className="py-2.5 px-3">Start (UTC)</th>
              <th className="py-2.5 px-3 text-right">Actual MW</th>
              <th className="py-2.5 px-3 text-right">Forecast MW</th>
              <th className="py-2.5 px-3 text-right">Error (F−A)</th>
              <th className="py-2.5 px-3 text-right">Abs Error</th>
              <th className="py-2.5 px-3">WINDFOR PublishTime</th>
              <th className="py-2.5 px-2 text-center">Quality</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
            {paginatedRecords.length > 0 ? (
              paginatedRecords.map((r) => {
                const isOver = (r.error ?? 0) > 0;
                const isUnder = (r.error ?? 0) < 0;
                return (
                  <tr key={`${r.settlementDate}-${r.settlementPeriod}`} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-3 text-white font-medium">{r.settlementDate}</td>
                    <td className="py-2 px-2 text-center text-cyan-400 font-bold">{r.settlementPeriod}</td>
                    <td className="py-2 px-3 text-slate-300">{r.startTime.slice(11, 16)}</td>
                    <td className="py-2 px-3 text-right font-medium text-emerald-400">
                      {r.actualGeneration !== null ? r.actualGeneration.toLocaleString() : '—'}
                    </td>
                    <td className="py-2 px-3 text-right font-medium text-cyan-400">
                      {r.forecastGeneration !== null ? r.forecastGeneration.toLocaleString() : '—'}
                    </td>
                    <td className="py-2 px-3 text-right font-bold">
                      {r.error !== null ? (
                        <span className={isOver ? 'text-amber-400' : isUnder ? 'text-indigo-400' : 'text-slate-400'}>
                          {r.error > 0 ? `+${r.error.toLocaleString()}` : r.error.toLocaleString()}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-300">
                      {r.absError !== null ? r.absError.toLocaleString() : '—'}
                    </td>
                    <td className="py-2 px-3 text-[11px] text-slate-400">
                      {r.forecastPublishTime ? (
                        <span title={r.forecastPublishTime}>
                          {r.forecastPublishTime.replace('T', ' ').replace('Z', '')}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2 px-2 text-center">
                      {!r.isActualMissing && !r.isForecastMissing ? (
                        <span title="Complete pair">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline-block" />
                        </span>
                      ) : (
                        <span title="Missing data">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-400 inline-block" />
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-500 font-sans">
                  No settlement records match the current filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="mt-3.5 flex items-center justify-between text-xs text-slate-400">
        <div>
          Showing{' '}
          <span className="text-white font-medium">
            {filteredRecords.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
          </span>{' '}
          to{' '}
          <span className="text-white font-medium">
            {Math.min(currentPage * pageSize, filteredRecords.length)}
          </span>{' '}
          of <span className="text-white font-medium">{filteredRecords.length}</span> records
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 disabled:opacity-30 hover:bg-slate-800 text-slate-300 cursor-pointer disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 font-mono">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 disabled:opacity-30 hover:bg-slate-800 text-slate-300 cursor-pointer disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

