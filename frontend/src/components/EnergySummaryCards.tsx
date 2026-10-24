import React from 'react';
import { Zap, Gauge, BatteryCharging, ArrowRight } from 'lucide-react';
import type { MetricsSummary } from '../types/api';

interface EnergySummaryCardsProps {
  metrics: MetricsSummary;
}

export const EnergySummaryCards: React.FC<EnergySummaryCardsProps> = ({ metrics }) => {
  const actualTWh = (metrics.totalActualMWh / 1_000_000).toFixed(2);
  const forecastTWh = (metrics.totalForecastMWh / 1_000_000).toFixed(2);
  const diffMWh = metrics.totalForecastMWh - metrics.totalActualMWh;
  const diffGWh = (diffMWh / 1_000).toFixed(1);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Total Energy Delivered vs Forecasted */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg shadow-slate-950/20">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">
            Total Energy Volume (30-min Sum)
          </span>
          <div className="p-1.5 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-800/40">
            <BatteryCharging className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline justify-between mt-2">
          <div>
            <div className="text-xs text-slate-400">Actual Outturn</div>
            <div className="text-xl font-bold text-emerald-400 font-mono">
              {actualTWh} <span className="text-xs text-slate-400 font-normal">TWh</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              {metrics.totalActualMWh.toLocaleString()} MWh
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-600 self-center" />
          <div className="text-right">
            <div className="text-xs text-slate-400">Day-Ahead Forecast</div>
            <div className="text-xl font-bold text-cyan-400 font-mono">
              {forecastTWh} <span className="text-xs text-slate-400 font-normal">TWh</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              {metrics.totalForecastMWh.toLocaleString()} MWh
            </div>
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
          <span className="text-slate-400">Net Volume Variance:</span>
          <span className={`font-mono font-medium ${diffMWh >= 0 ? 'text-amber-400' : 'text-indigo-400'}`}>
            {diffMWh >= 0 ? `+${diffGWh}` : diffGWh} GWh ({diffMWh >= 0 ? 'Over-contracted' : 'Short'})
          </span>
        </div>
      </div>

      {/* Average Power Generation */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg shadow-slate-950/20">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">
            Average Power Output
          </span>
          <div className="p-1.5 rounded-lg bg-cyan-950/80 text-cyan-400 border border-cyan-800/40">
            <Zap className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline justify-between mt-2">
          <div>
            <div className="text-xs text-slate-400">Mean Actual</div>
            <div className="text-xl font-bold text-white font-mono">
              {metrics.meanActualMW.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{' '}
              <span className="text-xs text-slate-400 font-normal">MW</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">Mean Forecast</div>
            <div className="text-xl font-bold text-cyan-400 font-mono">
              {metrics.meanForecastMW.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{' '}
              <span className="text-xs text-slate-400 font-normal">MW</span>
            </div>
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span>Capacity utilization indicator</span>
          <span className="font-mono text-slate-300">
            Δ {(metrics.meanForecastMW - metrics.meanActualMW).toFixed(1)} MW
          </span>
        </div>
      </div>

      {/* Peak Generation Comparison */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg shadow-slate-950/20">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">
            Peak Half-Hourly Generation
          </span>
          <div className="p-1.5 rounded-lg bg-teal-950/80 text-teal-400 border border-teal-800/40">
            <Gauge className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline justify-between mt-2">
          <div>
            <div className="text-xs text-slate-400">Peak Outturn</div>
            <div className="text-xl font-bold text-white font-mono">
              {metrics.peakActualMW.toLocaleString()}{' '}
              <span className="text-xs text-slate-400 font-normal">MW</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">Peak Forecast</div>
            <div className="text-xl font-bold text-teal-400 font-mono">
              {metrics.peakForecastMW.toLocaleString()}{' '}
              <span className="text-xs text-slate-400 font-normal">MW</span>
            </div>
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span>Highest recorded period</span>
          <span className="font-mono text-slate-300">
            {metrics.peakActualMW > metrics.peakForecastMW ? 'Actual exceeded forecast peak' : 'Forecast peak exceeded actual'}
          </span>
        </div>
      </div>
    </div>
  );
};

