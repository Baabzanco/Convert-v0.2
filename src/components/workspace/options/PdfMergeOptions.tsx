import React from 'react';
import { GitMerge, ArrowUpDown, AlertCircle, CheckCircle2 } from 'lucide-react';

interface PdfMergeOptionsProps {
  documentCount: number;
  totalEstimatedPages: number;
  outputName: string;
  onChangeOutputName: (name: string) => void;
}

export function PdfMergeOptions({
  documentCount,
  totalEstimatedPages,
  outputName,
  onChangeOutputName,
}: PdfMergeOptionsProps) {
  const canMerge = documentCount >= 2;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-6 shadow-xs">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
          <GitMerge className="w-4 h-4 text-sky-500" />
          <span>PDF Merge Configuration</span>
        </h3>
        <span className="text-xs px-2.5 py-1 rounded-full bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 font-mono">
          {documentCount} {documentCount === 1 ? 'file' : 'files'}
          {totalEstimatedPages > 0 ? ` (~${totalEstimatedPages} pages)` : ''}
        </span>
      </div>

      {/* Target Output Filename */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Merged Output Filename
        </label>
        <input
          type="text"
          value={outputName}
          onChange={(e) => onChangeOutputName(e.target.value)}
          className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          placeholder="merged_document.pdf"
        />
      </div>

      {/* Merge Status / Readiness */}
      {canMerge ? (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <strong>Ready to merge:</strong> The {documentCount} documents will be concatenated into a single PDF in the order shown in the queue above. All vector text, fonts, and hyperlinks are preserved.
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <strong>Additional file required:</strong> Please add at least 2 PDF documents to the queue to combine them.
          </div>
        </div>
      )}

      {/* Reordering hint */}
      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
        <ArrowUpDown className="w-4 h-4 text-sky-500 shrink-0" />
        <span>
          Use the <strong>↑</strong> and <strong>↓</strong> arrow buttons in the file list to rearrange which document appears first, second, etc.
        </span>
      </div>
    </div>
  );
}
