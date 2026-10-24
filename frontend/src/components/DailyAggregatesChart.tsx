import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import type { DailyAggregate } from '../types/api';

interface DailyAggregatesChartProps {
  dailyAggregates: DailyAggregate[];
  onSelectDate?: (date: string) => void;
}

export const DailyAggregatesChart: React.FC<DailyAggregatesChartProps> = ({
  dailyAggregates,
  onSelectDate,
}) => {
  const chartData = dailyAggregates.map((d) => ({
    date: d.date,
    label: d.date.slice(5), // "01-15"
    mae: d.mae,
    rmse: d.rmse,
    meanBias: d.meanBias,
    meanActual: d.meanActualMW,
    meanForecast: d.meanForecastMW,
    totalMWh: d.totalActualMWh,
    publishTimes: d.publishTimes,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-xl shadow-xl backdrop-blur-md text-xs font-mono max-w-xs">
          <div className="flex justify-between items-center text-slate-300 font-bold border-b border-slate-800 pb-1 mb-2">
            <span>Date: {data.date}</span>
            <span className="text-cyan-400 font-normal">Day-Ahead Metrics</span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-slate-300">
              <span className="text-cyan-400">Daily MAE:</span>
              <span className="font-bold text-white">{data.mae.toLocaleString()} MW</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-teal-400">Daily RMSE:</span>
              <span className="font-bold text-white">{data.rmse.toLocaleString()} MW</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-amber-400">Daily Mean Bias:</span>
              <span
                className={`font-bold ${
                  data.meanBias >= 0 ? 'text-amber-400' : 'text-indigo-400'
                }`}
              >
                {data.meanBias >= 0 ? `+${data.meanBias.toLocaleString()}` : data.meanBias.toLocaleString()} MW
              </span>
            </div>
            <div className="pt-1.5 border-t border-slate-800/80 flex justify-between text-[11px] text-slate-400">
              <span>Mean Actual:</span>
              <span className="text-white">{data.meanActual.toLocaleString()} MW</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Mean Forecast:</span>
              <span className="text-white">{data.meanForecast.toLocaleString()} MW</span>
            </div>
          </div>
          {onSelectDate && (
            <div className="mt-2 pt-1 border-t border-slate-800 text-[10px] text-cyan-400 text-center font-sans">
              Click bar to filter to this delivery day
            </div>
          )}
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
              Daily Accuracy Breakdown (MAE vs Mean Bias)
            </h2>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-teal-400 border border-slate-700">
              Day-by-Day Performance
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Compare daily Mean Absolute Error (bars) and direction of forecast bias (line) across delivery dates.
          </p>
        </div>
      </div>

      <div className="h-64 sm:h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            onClick={(state: any) => {
              if (state && state.activePayload && state.activePayload.length && onSelectDate) {
                const clickedDate = state.activePayload[0].payload.date;
                if (clickedDate) onSelectDate(clickedDate);
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickLine={{ stroke: '#334155' }}
            />
            <YAxis
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickLine={{ stroke: '#334155' }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              unit=" MW"
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#475569" strokeWidth={1} />

            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
              formatter={(val) => {
                if (val === 'mae') return <span className="text-cyan-400">Daily MAE (MW)</span>;
                if (val === 'meanBias') return <span className="text-amber-400">Daily Mean Bias (MW)</span>;
                return val;
              }}
            />

            <Bar
              dataKey="mae"
              name="mae"
              fill="#06b6d4"
              opacity={0.85}
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
              cursor="pointer"
            />

            <Line
              type="monotone"
              dataKey="meanBias"
              name="meanBias"
              stroke="#f59e0b"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#f59e0b' }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
        <div className="flex items-center space-x-3">
          <span>Bar height: Daily error magnitude</span>
          <span>Line position: Over/under forecast deviation</span>
        </div>
        <span className="text-slate-500 font-mono text-[10px]">{chartData.length} delivery days</span>
      </div>
    </div>
  );
};
