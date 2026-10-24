import React from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
  onRetry: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onRetry }) => {
  return (
    <div className="bg-rose-950/40 border border-rose-800/80 rounded-2xl p-6 text-center max-w-xl mx-auto my-12 shadow-xl shadow-rose-950/20">
      <div className="w-12 h-12 rounded-xl bg-rose-900/60 text-rose-400 border border-rose-700/60 flex items-center justify-center mx-auto mb-3">
        <AlertOctagon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-bold text-white mb-1">
        Evaluation Query Error
      </h3>
      <p className="text-xs text-rose-300 font-mono mb-4 px-2">
        {message}
      </p>
      <button
        onClick={onRetry}
        className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-rose-800 hover:bg-rose-700 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        <span>Retry Query</span>
      </button>
    </div>
  );
};

