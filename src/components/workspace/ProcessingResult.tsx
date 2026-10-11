import React from 'react';
import {
  Download,
  CheckCircle2,
  FileCheck,
  RotateCcw,
  Sparkles,
  ArrowDownRight,
  FileText,
  ExternalLink,
} from 'lucide-react';

export interface ProcessedItem {
  data: Blob | Uint8Array;
  fileName: string;
  mimeType: string;
  size: number;
  previewUrl?: string;
  originalSize?: number;
}

interface ProcessingResultProps {
  results: ProcessedItem[];
  onDownloadItem: (item: ProcessedItem) => void;
  onDownloadAll?: () => void;
  onReset: () => void;
}

export function ProcessingResult({
  results,
  onDownloadItem,
  onDownloadAll,
  onReset,
}: ProcessingResultProps) {
  if (results.length === 0) return null;

  const primary = results[0];
  const isMulti = results.length > 1;

  const formatSize = (bytes: number) => {
    return bytes > 1024 * 1024
      ? `${(bytes / (1024 * 1024)).toFixed(2)} MB`
      : `${Math.round(bytes / 1024)} KB`;
  };

  return (
    <div className="rounded-2xl border-2 border-emerald-500/80 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-6 shadow-xl shadow-emerald-500/5 transition-all">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Processing Complete!
              </h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold uppercase tracking-wider">
                Ready
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isMulti
                ? `${results.length} files successfully processed and ready for download.`
                : 'Your file has been generated and is ready for download directly from browser memory.'}
            </p>
          </div>
        </div>

        {/* Action Buttons Top */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Process another</span>
          </button>

          {isMulti && onDownloadAll ? (
            <button
              type="button"
              onClick={onDownloadAll}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download All ({results.length})</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onDownloadItem(primary)}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download File</span>
            </button>
          )}
        </div>
      </div>

      {/* Single File Details & Preview */}
      {!isMulti && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 flex-wrap gap-3">
            <div className="min-w-0">
              <span className="text-xs font-mono font-semibold text-slate-900 dark:text-white truncate block">
                {primary.fileName}
              </span>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  {formatSize(primary.size)}
                </span>
                {primary.originalSize && primary.originalSize > 0 && (
                  <>
                    <span>•</span>
                    <span className="line-through text-slate-400">
                      {formatSize(primary.originalSize)}
                    </span>
                    {primary.size < primary.originalSize && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] flex items-center gap-0.5">
                        <ArrowDownRight className="w-3 h-3" />-
                        {Math.round(
                          ((primary.originalSize - primary.size) / primary.originalSize) * 100
                        )}
                        %
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onDownloadItem(primary)}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          </div>

          {/* Visual Preview */}
          {primary.previewUrl ? (
            <div className="space-y-2 text-center pt-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Visual Output Preview
              </span>
              <div className="rounded-xl overflow-hidden bg-slate-950 p-3 max-h-80 flex items-center justify-center border border-slate-200 dark:border-slate-800">
                <img
                  src={primary.previewUrl}
                  alt={primary.fileName}
                  className="max-h-72 max-w-full object-contain rounded shadow"
                />
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center space-y-2">
              <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-700 mx-auto flex items-center justify-center text-rose-500">
                <FileText className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                PDF Document Ready
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Generated document encoded into local blob. Click download to save to your device.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Multi-File Results List */}
      {isMulti && (
        <div className="space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Processed Files ({results.length})
          </span>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-72 overflow-y-auto">
            {results.map((item, idx) => (
              <div
                key={idx}
                className="p-3 sm:px-4 flex items-center justify-between gap-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="min-w-0 flex items-center gap-2.5">
                  <FileCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {item.fileName}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {formatSize(item.size)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onDownloadItem(item)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-xs font-semibold text-emerald-600 dark:text-emerald-400 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>Download</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
