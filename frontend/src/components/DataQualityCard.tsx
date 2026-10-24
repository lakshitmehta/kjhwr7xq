import React from 'react';
import {
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  Database,
} from 'lucide-react';
import type { AuditMetadata, MetricsSummary } from '../types/api';

interface DataQualityCardProps {
  metrics: MetricsSummary;
  audit: AuditMetadata;
}

export const DataQualityCard: React.FC<DataQualityCardProps> = ({ metrics, audit }) => {
  const isComplete = metrics.completenessPercent === 100;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg shadow-slate-950/20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800/40">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">
              Data Quality & Audit Integrity
            </h2>
            <p className="text-xs text-slate-400">
              Traceability verification against official Elexon BMRS feeds
            </p>
          </div>
        </div>

        {/* Completeness Pill */}
        <div className="flex items-center space-x-2 self-start md:self-auto">
          <div
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
              isComplete
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
                : 'bg-amber-950/80 text-amber-300 border-amber-800/60'
            }`}
          >
            {isComplete ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>{metrics.completenessPercent.toFixed(1)}% Completeness</span>
          </div>
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
            Zero Fabrication
          </span>
        </div>
      </div>

      {/* Grid of indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4">
        {/* Total Periods */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="text-[11px] text-slate-400 font-medium">Settlement Periods</div>
          <div className="text-lg font-bold text-white font-mono mt-1">
            {metrics.totalSettlementPeriods.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">30-min intervals (SP 1-48)</div>
        </div>

        {/* Valid Paired Periods */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="text-[11px] text-slate-400 font-medium">Paired Observations</div>
          <div className="text-lg font-bold text-emerald-400 font-mono mt-1">
            {metrics.validPeriodsCount.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-600 mt-0.5">Actual + Forecast paired</div>
        </div>

        {/* Missing Actuals */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="text-[11px] text-slate-400 font-medium">Missing Actuals</div>
          <div className="text-lg font-bold text-slate-300 font-mono mt-1">
            {audit.missingActualPeriods}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">FUELHH (fuelType=WIND)</div>
        </div>

        {/* Missing Forecasts */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="text-[11px] text-slate-400 font-medium">Missing Forecasts</div>
          <div className="text-lg font-bold text-slate-300 font-mono mt-1">
            {audit.missingForecastPeriods}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Prior to cutoff deadline</div>
        </div>

        {/* Forecast Runs Used */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="text-[11px] text-slate-400 font-medium">Forecast Runs Used</div>
          <div className="text-lg font-bold text-cyan-400 font-mono mt-1">
            {audit.distinctForecastRunsUsed}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Distinct D-1 publishTimes</div>
        </div>

        {/* Mapping Rule */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="text-[11px] text-slate-400 font-medium">Resolution Alignment</div>
          <div className="text-xs font-bold text-teal-400 font-mono mt-1 truncate" title="1h WINDFOR -> Dual 30-min SPs">
            1h → 2×30m
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate" title="No synthetic interpolation applied">
            Direct mapping
          </div>
        </div>
      </div>

      {/* Assumptions Footer */}
      <div className="mt-3.5 pt-3 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-400 gap-2">
        <div className="flex items-center space-x-1.5">
          <Database className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>Active Cutoff: <strong className="text-slate-300">{audit.cutoffTimeUsed}</strong></span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400">{audit.cutoffSource}</span>
        </div>
        <div className="text-slate-500 font-mono text-[10px]">
          Base: https://data.elexon.co.uk/bmrs/api/v1
        </div>
      </div>
    </div>
  );
};

