import React from 'react';

export const LoadingSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
            <div className="h-3 w-28 bg-slate-800 rounded mb-4"></div>
            <div className="h-8 w-20 bg-slate-800 rounded mb-2"></div>
            <div className="h-3 w-36 bg-slate-800/60 rounded"></div>
          </div>
        ))}
      </div>

      {/* Energy Summary Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
            <div className="h-3 w-32 bg-slate-800 rounded mb-3"></div>
            <div className="h-6 w-24 bg-slate-800 rounded"></div>
          </div>
        ))}
      </div>

      {/* Main Chart Skeleton */}
      <div className="h-96 bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
        <div className="flex justify-between items-center mb-6">
          <div className="space-y-2">
            <div className="h-4 w-64 bg-slate-800 rounded"></div>
            <div className="h-3 w-40 bg-slate-800/60 rounded"></div>
          </div>
          <div className="h-8 w-36 bg-slate-800 rounded-lg"></div>
        </div>
        <div className="h-64 bg-slate-950/60 rounded-xl flex items-center justify-center">
          <div className="text-slate-500 text-xs font-mono">Loading authentic Elexon data...</div>
        </div>
      </div>
    </div>
  );
};

