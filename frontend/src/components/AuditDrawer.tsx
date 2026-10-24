import React from 'react';
import { X, ShieldCheck, Database, Check, Clock, BookOpen, Calculator, AlertCircle } from 'lucide-react';
import type { AuditMetadata } from '../types/api';

interface AuditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  audit: AuditMetadata | null;
}

export const AuditDrawer: React.FC<AuditDrawerProps> = ({ isOpen, onClose, audit }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 shadow-2xl h-full flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800/40">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Methodology & Audit Trail
              </h2>
              <p className="text-xs text-slate-400">
                UK Wind Generation Forecast Evaluation Standards & Market Distinctions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
          {/* Elexon Data Sources */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-2 flex items-center space-x-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <span>Official Elexon BMRS Datasets</span>
            </h3>
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between text-slate-200 font-semibold mb-1">
                  <span>Actual Wind Outturn (FUELHH)</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                    Half-Hourly (30-min)
                  </span>
                </div>
                <p className="text-slate-400">
                  Fuel generation by settlement period queried via Elexon BMRS API with filter{' '}
                  <code className="text-cyan-400">fuelType=WIND</code>. Represents native metered outturn in MW across Great Britain.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between text-slate-200 font-semibold mb-1">
                  <span>Day-Ahead Forecasts (WINDFOR)</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/40">
                    Hourly Forecast Runs
                  </span>
                </div>
                <p className="text-slate-400">
                  National Grid ESO wind generation forecasts published via Elexon BMRS. Includes exact publication timestamps (<code className="text-cyan-400">publishTime</code>) to rigorously enforce auction cutoffs.
                </p>
              </div>
            </div>
          </div>

          {/* Market Cutoff Distinction */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-2 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-teal-400" />
              <span>Day-Ahead Cutoffs: Market Rules vs Analytical Benchmarks</span>
            </h3>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <p className="text-slate-400">
                To prevent lookahead bias, the evaluation strictly enforces that the forecast for delivery day <code className="text-cyan-400">D</code> must have been published on or before the selected cutoff time on day <code className="text-cyan-400">D-1</code>. Market rules and analytical benchmarks are explicitly distinguished:
              </p>

              <div>
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                  Legally Binding Exchange Auction Gate Closures:
                </span>
                <ul className="space-y-1.5 list-disc list-inside text-slate-300">
                  <li><strong className="text-white">09:20 GMT:</strong> EPEX SPOT GB Day-Ahead 60-min Auction Gate Closure (EPEX Trading Rules).</li>
                  <li><strong className="text-white">09:50 GMT:</strong> Nord Pool N2EX Day-Ahead Order Book Closure (Nord Pool Market Spec).</li>
                  <li><strong className="text-white">15:30 GMT:</strong> EPEX SPOT GB Day-Ahead 30-min Auction Gate Closure (Afternoon auction).</li>
                </ul>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block mb-1">
                  Analytical & Operational Benchmarks:
                </span>
                <ul className="space-y-1.5 list-disc list-inside text-slate-300">
                  <li><strong className="text-white">11:00 GMT:</strong> European Single Day-Ahead Coupling (SDAC, 12:00 CET benchmark). Widely used as the standard academic and pan-European analytical benchmark for day-ahead evaluations and interconnector flows, though local GB physical exchange auctions close earlier (09:20 / 09:50 GMT).</li>
                  <li><strong className="text-white">12:00 GMT:</strong> UK Operational Midday Scheduling Reference window.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Mathematical Formulations */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-2 flex items-center space-x-2">
              <Calculator className="w-4 h-4 text-amber-400" />
              <span>Statistical Formulas</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-mono text-[11px]">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-cyan-400 font-bold mb-0.5">Mean Absolute Error (MAE)</div>
                <div className="text-slate-300">MAE = (1/N) · Σ |F_t - A_t|</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-teal-400 font-bold mb-0.5">Root Mean Squared Error (RMSE)</div>
                <div className="text-slate-300">RMSE = √[ (1/N) · Σ (F_t - A_t)² ]</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-amber-400 font-bold mb-0.5">Mean Forecast Bias</div>
                <div className="text-slate-300">Bias = (1/N) · Σ (F_t - A_t)</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-emerald-400 font-bold mb-0.5">Weighted Absolute Error (WAPE)</div>
                <div className="text-slate-300">WAPE = (Σ |F_t - A_t| / Σ A_t) · 100%</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 col-span-1 sm:col-span-2">
                <div className="text-slate-200 font-bold mb-0.5">Settlement Period Energy (MWh)</div>
                <div className="text-slate-300">Energy (MWh) = Σ [ Generation (MW) × 0.5 hours ]</div>
              </div>
            </div>
          </div>

          {/* Assumptions & Pipeline Design */}
          {audit && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-2 flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <span>Explicit Pipeline Assumptions (Engineering Design vs Market Rules)</span>
              </h3>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="p-2 rounded bg-amber-950/40 border border-amber-800/40 text-amber-300 text-[11px] mb-2">
                  <div className="font-semibold flex items-center space-x-1 mb-0.5">
                    <AlertCircle className="w-3.5 h-3.5 inline" />
                    <span>Important Distinction:</span>
                  </div>
                  The mapping of hourly forecasts to dual 30-minute settlement periods is a pipeline design choice (step-wise replication without synthetic interpolation), not an official Elexon market standard.
                </div>
                {audit.assumptions.map((assump, idx) => (
                  <div key={idx} className="flex items-start space-x-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                    <span className="text-slate-300">{assump}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-500">
          <span>Authoritative Data: Elexon BMRS</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors cursor-pointer"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
};
