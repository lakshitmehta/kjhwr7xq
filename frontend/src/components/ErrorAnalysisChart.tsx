import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Brush,
} from 'recharts';
import type { PeriodRecord } from '../types/api';

interface ErrorAnalysisChartProps {
  timeSeries: PeriodRecord[];
}

export const ErrorAnalysisChart: React.FC<ErrorAnalysisChartProps> = ({ timeSeries }) => {
  const chartData = useMemo(() => {
    return timeSeries.map((r) => {
      const err = r.error ?? 0;
      return {
        key: `${r.settlementDate} SP${r.settlementPeriod}`,
        label: `${r.settlementDate.slice(5)} SP${r.settlementPeriod}`,
        date: r.settlementDate,
        sp: r.settlementPeriod,
        startTime: r.startTime,
        error: err,
        positiveError: err > 0 ? err : 0,
        negativeError: err < 0 ? err : 0,
        actual: r.actualGeneration,
        forecast: r.forecastGeneration,
      };
    });
  }, [timeSeries]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isOver = data.error >= 0;
      return (
        <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-xl shadow-xl backdrop-blur-md text-xs font-mono max-w-xs">
          <div className="flex justify-between items-center text-slate-300 font-bold border-b border-slate-800 pb-1 mb-2">
            <span>{data.date} SP {data.sp}</span>
            <span className="text-[10px] text-slate-400">{data.startTime.slice(11, 16)} UTC</span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Forecast Error (F - A):</span>
              <span className={`font-bold ${isOver ? 'text-amber-400' : 'text-indigo-400'}`}>
                {isOver ? `+${data.error.toLocaleString()}` : data.error.toLocaleString()} MW
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Actual Outturn:</span>
              <span className="text-white">{data.actual?.toLocaleString()} MW</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Day-Ahead Forecast:</span>
              <span className="text-white">{data.forecast?.toLocaleString()} MW</span>
            </div>
            <div className="pt-1.5 border-t border-slate-800/80 text-[10px]">
              <span
                className={`px-1.5 py-0.5 rounded font-semibold ${
                  isOver
                    ? 'bg-amber-950/80 text-amber-300 border border-amber-800/50'
                    : 'bg-indigo-950/80 text-indigo-300 border border-indigo-800/50'
                }`}
              >
                {isOver ? 'System Over-Forecast' : 'System Under-Forecast'}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl shadow-slate-950/30">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-white tracking-tight">
              Forecast Error Residuals (Forecast − Actual)
            </h2>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
              Settlement Period Bias
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Positive error values indicates over-forecasting (long position risk); negative indicates under-forecasting (short position risk).
          </p>
        </div>
      </div>

      <div className="h-64 sm:h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickLine={{ stroke: '#334155' }}
              minTickGap={45}
            />
            <YAxis
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickLine={{ stroke: '#334155' }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              unit=" MW"
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#475569" strokeWidth={1.5} />

            {/* Over-forecasting bars (Amber) */}
            <Bar
              dataKey="positiveError"
              name="Over-forecast"
              fill="#f59e0b"
              opacity={0.8}
              isAnimationActive={false}
            />

            {/* Under-forecasting bars (Indigo) */}
            <Bar
              dataKey="negativeError"
              name="Under-forecast"
              fill="#6366f1"
              opacity={0.8}
              isAnimationActive={false}
            />

            <Brush
              dataKey="label"
              height={22}
              stroke="#6366f1"
              fill="#0f172a"
              tickFormatter={() => ''}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 bg-amber-500 rounded-sm"></span>
            <span className="text-slate-300">Over-Forecast (Forecast &gt; Actual)</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 bg-indigo-500 rounded-sm"></span>
            <span className="text-slate-300">Under-Forecast (Forecast &lt; Actual)</span>
          </span>
        </div>
        <span className="text-slate-500 text-[10px]">Zero line represents perfect forecast calibration</span>
      </div>
    </div>
  );
};

