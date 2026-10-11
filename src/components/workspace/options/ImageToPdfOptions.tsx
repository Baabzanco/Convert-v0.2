import React from 'react';
import { FileText, ArrowUpDown, Layout, Layers } from 'lucide-react';

interface ImageToPdfOptionsProps {
  imageCount: number;
  documentName: string;
  onChangeDocumentName: (name: string) => void;
  orientation: 'auto' | 'portrait' | 'landscape';
  onChangeOrientation: (o: 'auto' | 'portrait' | 'landscape') => void;
  margin: 'none' | 'compact' | 'normal';
  onChangeMargin: (m: 'none' | 'compact' | 'normal') => void;
}

export function ImageToPdfOptions({
  imageCount,
  documentName,
  onChangeDocumentName,
  orientation,
  onChangeOrientation,
  margin,
  onChangeMargin,
}: ImageToPdfOptionsProps) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-6 shadow-xs">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-sky-500" />
          <span>PDF Document Settings</span>
        </h3>
        <span className="text-xs px-2.5 py-1 rounded-full bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 font-mono">
          {imageCount} {imageCount === 1 ? 'page' : 'pages'} total
        </span>
      </div>

      {/* Document Filename */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Generated PDF Filename
        </label>
        <div className="relative">
          <input
            type="text"
            value={documentName}
            onChange={(e) => onChangeDocumentName(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            placeholder="document.pdf"
          />
        </div>
      </div>

      {/* Page Order Reminder */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2.5">
        <ArrowUpDown className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
        <span>
          <strong>Page Ordering:</strong> Images in the queue above will become PDF pages in sequential order from top (#1) to bottom. Use the ↑ and ↓ arrows on each file to arrange your desired order.
        </span>
      </div>

      {/* Page Orientation */}
      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Page Layout
        </label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'auto', label: 'Auto (Fit Image)', desc: 'Match each photo aspect ratio' },
            { id: 'portrait', label: 'Portrait', desc: 'Standard vertical document' },
            { id: 'landscape', label: 'Landscape', desc: 'Horizontal wide format' },
          ].map((item) => {
            const isSelected = orientation === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeOrientation(item.id as any)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/60 text-slate-900 dark:text-white ring-1 ring-sky-500'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="font-bold text-xs">{item.label}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{item.desc}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
