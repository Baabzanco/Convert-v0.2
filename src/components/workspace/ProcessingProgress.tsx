import React from 'react';
import { RefreshCw, Cpu, ShieldCheck } from 'lucide-react';

interface ProcessingProgressProps {
  progress: number;
  statusText?: string;
}

export function ProcessingProgress({ progress, statusText }: ProcessingProgressProps) {
  const currentStep =
    statusText ||
    (progress < 30
      ? 'Reading file into local browser buffer...'
      : progress < 70
      ? 'Executing client-side processing engine...'
      : progress < 95
      ? 'Generating output bytes and creating memory URL...'
      : 'Finalizing document...');

  return (
    <div className="rounded-2xl border border-sky-200 dark:border-sky-800/80 bg-sky-50/50 dark:bg-sky-950/20 p-6 space-y-4 shadow-sm animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <RefreshCw className="w-5 h-5 text-sky-500 animate-spin" />
          <span className="font-bold text-sm text-slate-900 dark:text-white">
            Processing In Browser...
          </span>
        </div>
        <span className="font-mono text-sm font-bold text-sky-600 dark:text-sky-400">
          {Math.round(progress)}%
        </span>
      </div>

      {/* Progress Track */}
      <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
        <div
          style={{ width: `${Math.max(5, Math.min(100, progress))}%` }}
          className="h-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all duration-300 rounded-full"
        />
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
        <span className="truncate">{currentStep}</span>
        <div className="flex items-center gap-1 shrink-0 font-medium text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Local RAM Only</span>
        </div>
      </div>
    </div>
  );
}
