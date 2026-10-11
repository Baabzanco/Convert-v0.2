import React from 'react';
import { Scissors, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

interface PdfSplitOptionsProps {
  totalPages: number | null;
  startPage: number;
  onChangeStartPage: (val: number) => void;
  endPage: number;
  onChangeEndPage: (val: number) => void;
  outputName: string;
  onChangeOutputName: (name: string) => void;
}

export function PdfSplitOptions({
  totalPages,
  startPage,
  onChangeStartPage,
  endPage,
  onChangeEndPage,
  outputName,
  onChangeOutputName,
}: PdfSplitOptionsProps) {
  const max = totalPages || 1;

  const handleStartChange = (val: number) => {
    const clamped = Math.max(1, Math.min(max, val));
    onChangeStartPage(clamped);
    if (endPage < clamped) {
      onChangeEndPage(clamped);
    }
  };

  const handleEndChange = (val: number) => {
    const clamped = Math.max(startPage, Math.min(max, val));
    onChangeEndPage(clamped);
  };

  const applyRangePreset = (start: number, end: number) => {
    onChangeStartPage(Math.max(1, Math.min(max, start)));
    onChangeEndPage(Math.max(start, Math.min(max, end)));
  };

  const extractedCount = Math.max(1, endPage - startPage + 1);

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-6 shadow-xs">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
          <Scissors className="w-4 h-4 text-sky-500" />
          <span>Page Extraction & Split Range</span>
        </h3>
        {totalPages !== null && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 font-mono">
            Document has {totalPages} {totalPages === 1 ? 'page' : 'pages'}
          </span>
        )}
      </div>

      {/* Page Range Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            Start Page (1 to {max})
          </label>
          <div className="relative">
            <input
              type="number"
              min="1"
              max={max}
              value={startPage}
              onChange={(e) => handleStartChange(parseInt(e.target.value, 10) || 1)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            End Page ({startPage} to {max})
          </label>
          <div className="relative">
            <input
              type="number"
              min={startPage}
              max={max}
              value={endPage}
              onChange={(e) => handleEndChange(parseInt(e.target.value, 10) || startPage)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>
      </div>

      {/* Quick Presets */}
      {totalPages && totalPages > 1 && (
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span className="text-[11px] text-slate-400">Quick ranges:</span>
          <button
            type="button"
            onClick={() => applyRangePreset(1, 1)}
            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            Page 1 only
          </button>
          <button
            type="button"
            onClick={() => applyRangePreset(1, Math.ceil(totalPages / 2))}
            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            First Half (1 - {Math.ceil(totalPages / 2)})
          </button>
          <button
            type="button"
            onClick={() => applyRangePreset(Math.ceil(totalPages / 2) + 1, totalPages)}
            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            Second Half ({Math.ceil(totalPages / 2) + 1} - {totalPages})
          </button>
          <button
            type="button"
            onClick={() => applyRangePreset(1, totalPages)}
            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            All Pages (1 - {totalPages})
          </button>
        </div>
      )}

      {/* Summary Banner */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
        <FileText className="w-4 h-4 text-sky-500 shrink-0" />
        <span>
          Extracting <strong>{extractedCount}</strong> {extractedCount === 1 ? 'page' : 'pages'} (Pages {startPage} through {endPage}).
        </span>
      </div>
    </div>
  );
}
