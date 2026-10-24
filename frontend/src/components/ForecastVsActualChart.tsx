import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Brush,
} from 'recharts';
import { Maximize2 } from 'lucide-react';
import type { DailyAggregate, PeriodRecord } from '../types/api';

interface ForecastVsActualChartProps {
  timeSeries: PeriodRecord[];
  dailyAggregates: DailyAggregate[];
}

interface ChartPoint {
  key: string;
  label: string;
  date: string;
  actual: number | null;
  forecast: number | null;
  sp?: number;
  startTime?: string;
  error?: number | null;
  publishTime?: string | null;
  peakActual?: number;
  peakForecast?: number;
  mae?: number;
  bias?: number;
}

export const ForecastVsActualChart: React.FC<ForecastVsActualChartProps> = ({
  timeSeries,
  dailyAggregates,
}) => {
  const [viewMode, setViewMode] = useState<'granular' | 'daily'>('granular');
  const [showBrush, setShowBrush] = useState<boolean>(true);

  // Format granular data for recharts
  const granularData: ChartPoint[] = useMemo(() => {
    return timeSeries.map((r) => {
      const timePart = r.startTime.slice(11, 16);
      return {
        key: `${r.settlementDate} SP${r.settlementPeriod}`,
        label: `${r.settlementDate.slice(5)} ${timePart}`,
        date: r.settlementDate,
        sp: r.settlementPeriod,
        startTime: r.startTime,
        actual: r.actualGeneration,
        forecast: r.forecastGeneration,
        error: r.error,
        publishTime: r.forecastPublishTime,
      };
    });
  }, [timeSeries]);

  // Format daily data for recharts
  const dailyData: ChartPoint[] = useMemo(() => {
    return dailyAggregates.map((d) => ({
      key: d.date,
      label: d.date.slice(5),
      date: d.date,
      actual: d.meanActualMW,
      forecast: d.meanForecastMW,
      peakActual: d.peakActualMW,
      peakForecast: d.peakForecastMW,
      mae: d.mae,
      bias: d.meanBias,
    }));
  }, [dailyAggregates]);

  const activeData = viewMode === 'granular' ? granularData : dailyData;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload as ChartPoint;
      return (
        <div className="bg-slate-900/95 border border-slate-700 p-3.5 rounded-xl shadow-2xl backdrop-blur-md text-xs font-mono max-w-xs">
          <div className="flex items-center justify-between text-slate-300 font-bold border-b border-slate-800 pb-1.5 mb-2">
            <span>{dataPoint.date}</span>
            {viewMode === 'granular' && dataPoint.sp && dataPoint.startTime && (
              <span className="text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/40 text-[10px]">
                SP {dataPoint.sp} ({dataPoint.startTime.slice(11, 16)} UTC)
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-emerald-400 flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                <span className="text-slate-300">
                  {viewMode === 'granular' ? 'Actual Generation:' : 'Mean Actual:'}
                </span>
              </span>
              <span className="font-bold text-white">
                {dataPoint.actual !== null && dataPoint.actual !== undefined
                  ? `${dataPoint.actual.toLocaleString()} MW`
                  : 'N/A'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-cyan-400 flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block"></span>
                <span className="text-slate-300">
                  {viewMode === 'granular' ? 'Day-Ahead Forecast:' : 'Mean Forecast:'}
                </span>
              </span>
              <span className="font-bold text-white">
                {dataPoint.forecast !== null && dataPoint.forecast !== undefined
                  ? `${dataPoint.forecast.toLocaleString()} MW`
                  : 'N/A'}
              </span>
            </div>

            {viewMode === 'granular' && dataPoint.error !== null && dataPoint.error !== undefined && (
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                <span className="text-slate-400">Forecast Error (F-A):</span>
                <span
                  className={`font-bold ${
                    dataPoint.error >= 0 ? 'text-amber-400' : 'text-indigo-400'
                  }`}
                >
                  {dataPoint.error >= 0 ? `+${dataPoint.error}` : dataPoint.error} MW
                </span>
              </div>
            )}

            {viewMode === 'granular' && dataPoint.publishTime && (
              <div className="pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
                <span>Run PublishTime:</span>
                <span className="text-slate-300 font-mono truncate max-w-[140px]" title={dataPoint.publishTime}>
                  {dataPoint.publishTime.replace('T', ' ').replace('Z', '')}
                </span>
              </div>
            )}

            {viewMode === 'daily' && (
              <div className="pt-1.5 border-t border-slate-800/80 space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-400">
                  <span>Daily MAE:</span>
                  <span className="text-white font-bold">{dataPoint.mae} MW</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Daily Bias:</span>
                  <span className={(dataPoint.bias ?? 0) >= 0 ? 'text-amber-400' : 'text-indigo-400'}>
                    {(dataPoint.bias ?? 0) >= 0 ? `+${dataPoint.bias}` : dataPoint.bias} MW
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl shadow-slate-950/30">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-white tracking-tight">
              Wind Generation: Day-Ahead Forecast vs Outturn Actuals
            </h2>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-cyan-300 border border-slate-700">
              {viewMode === 'granular' ? '30-Min Resolution' : 'Daily Mean Resolution'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Authentic Elexon FUELHH (actuals) paired against WINDFOR day-ahead forecast run
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center space-x-2">
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center space-x-1 text-xs">
            <button
              onClick={() => setViewMode('granular')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                viewMode === 'granular'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Half-Hourly (SP)
            </button>
            <button
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                viewMode === 'daily'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Daily Aggregates
            </button>
          </div>

          {viewMode === 'granular' && (
            <button
              onClick={() => setShowBrush(!showBrush)}
              className={`p-2 rounded-xl border text-xs transition-colors cursor-pointer ${
                showBrush
                  ? 'bg-slate-800 text-cyan-400 border-cyan-500/30'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
              title="Toggle Timeline Zoom Slider"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Recharts Container */}
      <div className="h-80 sm:h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={activeData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />

            <XAxis
              dataKey="label"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickLine={{ stroke: '#334155' }}
              minTickGap={viewMode === 'granular' ? 40 : 15}
            />

            <YAxis
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickLine={{ stroke: '#334155' }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              unit=" MW"
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
              formatter={(value) => {
                return value === 'actual' ? (
                  <span className="text-emerald-400 font-medium">Actual Outturn (FUELHH)</span>
                ) : (
                  <span className="text-cyan-400 font-medium">Day-Ahead Forecast (WINDFOR)</span>
                );
              }}
            />

            {/* Actual Wind Generation (Area with Emerald gradient) */}
            <Area
              type="monotone"
              dataKey="actual"
              name="actual"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#actualGrad)"
              isAnimationActive={false}
            />

            {/* Day-Ahead Forecast Line (Cyan stroke) */}
            <Area
              type="monotone"
              dataKey="forecast"
              name="forecast"
              stroke="#06b6d4"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#forecastGrad)"
              isAnimationActive={false}
            />

            {viewMode === 'granular' && showBrush && (
              <Brush
                dataKey="label"
                height={26}
                stroke="#06b6d4"
                fill="#0f172a"
                tickFormatter={() => ''}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Footer Info */}
      <div className="mt-3 flex flex-wrap items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2.5">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></span>
            <span className="text-slate-300">Actual Outturn: Elexon FUELHH (WIND)</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 bg-cyan-400 rounded-sm"></span>
            <span className="text-slate-300">Forecast: Elexon WINDFOR (Day-Ahead)</span>
          </span>
        </div>
        <div className="text-slate-500 font-mono">
          {viewMode === 'granular' ? `${timeSeries.length} half-hour periods` : `${dailyAggregates.length} days`}
        </div>
      </div>
    </div>
  );
};

