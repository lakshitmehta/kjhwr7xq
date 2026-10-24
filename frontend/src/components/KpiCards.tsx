import React from 'react';
import {
  Target,
  Activity,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import type { MetricsSummary } from '../types/api';

interface KpiCardsProps {
  metrics: MetricsSummary;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ metrics }) => {
  const isOverforecast = metrics.meanBias > 0;
  const biasPercentOfMean = metrics.meanActualMW > 0
    ? ((metrics.meanBias / metrics.meanActualMW) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. MAE Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg shadow-slate-950/30 flex flex-col justify-between hover:border-slate-700 transition-colors">
        <div>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Mean Absolute Error (MAE)
            </span>
            <div className="p-2 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800/40">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
              {metrics.mae.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
            <span className="text-xs font-semibold text-cyan-400 font-mono">MW</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span>Formula: 1/N · Σ|e|</span>
          <span className="text-slate-300 font-medium">Avg Magnitude</span>
        </div>
      </div>

      {/* 2. RMSE Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg shadow-slate-950/30 flex flex-col justify-between hover:border-slate-700 transition-colors">
        <div>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Root Mean Squared Error (RMSE)
            </span>
            <div className="p-2 rounded-lg bg-teal-950 text-teal-400 border border-teal-800/40">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
              {metrics.rmse.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
            <span className="text-xs font-semibold text-teal-400 font-mono">MW</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span>Formula: √[1/N · Σe²]</span>
          <span className="text-slate-300 font-medium">Ramp / Peak Sensitive</span>
        </div>
      </div>

      {/* 3. Mean Forecast Bias Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg shadow-slate-950/30 flex flex-col justify-between hover:border-slate-700 transition-colors">
        <div>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Mean Forecast Bias
            </span>
            <div
              className={`p-2 rounded-lg border ${
                isOverforecast
                  ? 'bg-amber-950 text-amber-400 border-amber-800/40'
                  : 'bg-indigo-950 text-indigo-400 border-indigo-800/40'
              }`}
            >
              {isOverforecast ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
              {metrics.meanBias > 0 ? `+${metrics.meanBias.toLocaleString()}` : metrics.meanBias.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-slate-400 font-mono">MW</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
          <span
            className={`px-2 py-0.5 rounded-full font-medium ${
              isOverforecast
                ? 'bg-amber-900/40 text-amber-300 border border-amber-700/50'
                : 'bg-indigo-900/40 text-indigo-300 border border-indigo-700/50'
            }`}
          >
            {isOverforecast ? 'Over-forecasting (F > A)' : 'Under-forecasting (F < A)'}
          </span>
          <span className="text-slate-400">{biasPercentOfMean}% of mean</span>
        </div>
      </div>

      {/* 4. WAPE Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg shadow-slate-950/30 flex flex-col justify-between hover:border-slate-700 transition-colors">
        <div>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Weighted Absolute Error (WAPE)
            </span>
            <div className="p-2 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800/40">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
              {metrics.wape.toFixed(2)}
            </span>
            <span className="text-xs font-semibold text-emerald-400 font-mono">%</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span>Formula: Σ|e| / ΣActual</span>
          <span className="text-emerald-400 font-medium">Standardized Scale</span>
        </div>
      </div>
    </div>
  );
};

