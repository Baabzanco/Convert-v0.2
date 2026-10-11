import React, { useEffect, useState } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { ValidationResult } from '../../tools/validation.js';

export interface FileQueueEntry {
  file: File;
  validation: ValidationResult;
  thumbnailUrl?: string;
  pdfPages?: number;
}

interface FileQueueProps {
  queue: FileQueueEntry[];
  onRemoveItem: (index: number) => void;
  onMoveItem?: (fromIndex: number, toIndex: number) => void;
  onClearAll: () => void;
  onAddMore?: () => void;
  maxBatchCount: number;
  canReorder?: boolean;
}

export function FileQueue({
  queue,
  onRemoveItem,
  onMoveItem,
  onClearAll,
  onAddMore,
  maxBatchCount,
  canReorder = false,
}: FileQueueProps) {
  const totalBytes = queue.reduce((acc, item) => acc + item.file.size, 0);
  const formattedTotalSize =
    totalBytes > 1024 * 1024
      ? `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(totalBytes / 1024)} KB`;

  const validCount = queue.filter((i) => i.validation.isValid).length;
  const invalidCount = queue.length - validCount;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
      {/* Header Bar */}
      <div className="p-4 sm:px-6 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span className="font-bold text-sm text-slate-900 dark:text-white">
            File Queue ({queue.length} {queue.length === 1 ? 'file' : 'files'})
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
            {formattedTotalSize}
          </span>
          {invalidCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
              {invalidCount} invalid
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onAddMore && queue.length < maxBatchCount && (
            <button
              type="button"
              onClick={onAddMore}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add more</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClearAll}
            className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs text-rose-600 dark:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer font-medium"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear queue</span>
          </button>
        </div>
      </div>

      {/* Items List */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-80 overflow-y-auto">
        {queue.map((entry, idx) => {
          const { file, validation, thumbnailUrl, pdfPages } = entry;
          const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
          const formattedSize =
            file.size > 1024 * 1024
              ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
              : `${Math.round(file.size / 1024)} KB`;

          return (
            <div
              key={`${file.name}-${idx}`}
              className={`p-3 sm:px-6 flex items-center justify-between gap-3 transition-colors ${
                validation.isValid
                  ? 'hover:bg-slate-50/60 dark:hover:bg-slate-800/30'
                  : 'bg-rose-50/50 dark:bg-rose-950/20'
              }`}
            >
              {/* Left: Thumbnail & info */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Thumbnail / Icon */}
                <div className="w-11 h-11 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 flex items-center justify-center shrink-0 overflow-hidden relative">
                  {thumbnailUrl ? (
                    <img
                      src={thumbnailUrl}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : isPdf ? (
                    <FileText className="w-5 h-5 text-rose-500" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-sky-500" />
                  )}
                  {canReorder && (
                    <span className="absolute bottom-0 right-0 bg-slate-900/80 text-white text-[9px] px-1 font-mono rounded-tl">
                      #{idx + 1}
                    </span>
                  )}
                </div>

                {/* File Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {file.name}
                    </p>
                    {validation.isValid ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                    <span className="font-mono">{formattedSize}</span>
                    <span>•</span>
                    {validation.isValid ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        {validation.detectedFormat}
                      </span>
                    ) : (
                      <span className="text-rose-600 dark:text-rose-400 font-medium">
                        {validation.error || 'Invalid file format'}
                      </span>
                    )}

                    {validation.dimensions && (
                      <>
                        <span>•</span>
                        <span className="font-mono text-slate-600 dark:text-slate-300">
                          {validation.dimensions.width} × {validation.dimensions.height} px
                        </span>
                      </>
                    )}

                    {pdfPages !== undefined && (
                      <>
                        <span>•</span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[10px]">
                          {pdfPages} {pdfPages === 1 ? 'page' : 'pages'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Actions (Reorder / Remove) */}
              <div className="flex items-center gap-1 shrink-0">
                {canReorder && onMoveItem && (
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => onMoveItem(idx, idx - 1)}
                      title="Move Up"
                      className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === queue.length - 1}
                      onClick={() => onMoveItem(idx, idx + 1)}
                      title="Move Down"
                      className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => onRemoveItem(idx)}
                  title="Remove file"
                  className="p-1.5 rounded hover:bg-rose-100 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
