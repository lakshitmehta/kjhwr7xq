import React from 'react';
import { Wind, Activity, Database, AlertCircle, FileText } from 'lucide-react';
import type { HealthStatus } from '../types/api';

interface NavbarProps {
  health: HealthStatus | null;
  healthLoading: boolean;
  onOpenAudit: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ health, healthLoading, onOpenAudit }) => {
  const isHealthy = health?.status === 'ok';

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-teal-500 to-emerald-400 p-0.5 shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Wind className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold text-white tracking-tight">
                UK Wind Forecast Evaluation
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-mono">
                Elexon BMRS
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Day-Ahead WINDFOR vs FUELHH Outturn • Half-Hourly Analysis
            </p>
          </div>
        </div>

        {/* Status Indicators & Actions */}
        <div className="flex items-center space-x-3">
          {/* Health status */}
          <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
            {healthLoading ? (
              <>
                <Activity className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                <span className="text-slate-300">Connecting Backend...</span>
              </>
            ) : isHealthy ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-slate-300 font-medium">FastAPI Live</span>
                <span className="text-slate-500">|</span>
                <Database className="w-3.5 h-3.5 text-cyan-400 ml-1" />
                <span className="text-slate-400 font-mono text-[11px]">Elexon Cache Active</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-rose-300">Backend Offline</span>
              </>
            )}
          </div>

          {/* Audit / Methodology Button */}
          <button
            onClick={onOpenAudit}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 hover:text-white transition-colors cursor-pointer"
            title="Inspect Data Pipeline & Cutoff Methodology"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-medium">Methodology & Audit</span>
          </button>
        </div>
      </div>
    </header>
  );
};

