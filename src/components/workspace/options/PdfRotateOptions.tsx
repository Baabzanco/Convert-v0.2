import React from 'react';
import { RotateCw, FileText, CheckCircle2 } from 'lucide-react';

interface PdfRotateOptionsProps {
  rotationAngle: 90 | 180 | 270;
  onChangeRotationAngle: (deg: 90 | 180 | 270) => void;
  pageScope: 'all' | 'odd' | 'even' | 'custom';
  onChangePageScope: (scope: 'all' | 'odd' | 'even' | 'custom') => void;
  customPages: string;
  onChangeCustomPages: (val: string) => void;
  totalPages: number | null;
}

export function PdfRotateOptions({
  rotationAngle,
  onChangeRotationAngle,
  pageScope,
  onChangePageScope,
  customPages,
  onChangeCustomPages,
  totalPages,
}: PdfRotateOptionsProps) {
  const angles: Array<{ deg: 90 | 180 | 270; label: string; desc: string }> = [
    { deg: 90, label: '90° Clockwise', desc: 'Turn page right (landscape)' },
    { deg: 180, label: '180° Half-Turn', desc: 'Invert upside-down scans' },
    { deg: 270, label: '270° (90° CCW)', desc: 'Turn page left' },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-6 shadow-xs">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
          <RotateCw className="w-4 h-4 text-sky-500" />
          <span>PDF Page Rotation Controls</span>
        </h3>
        {totalPages !== null && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 font-mono">
            {totalPages} {totalPages === 1 ? 'page' : 'pages'} total
          </span>
        )}
      </div>

      {/* Rotation Angle Selector */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Rotation Direction & Angle
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {angles.map((a) => {
            const isSelected = rotationAngle === a.deg;
            return (
              <button
                key={a.deg}
                type="button"
                onClick={() => onChangeRotationAngle(a.deg)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-sky-500 bg-sky-50/60 dark:bg-sky-950/40 text-slate-900 dark:text-white ring-2 ring-sky-500/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm">{a.label}</span>
                  <div
                    style={{ transform: `rotate(${a.deg}deg)` }}
                    className="w-5 h-5 flex items-center justify-center text-sky-500 transition-transform"
                  >
                    <FileText className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{a.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Scope Selector */}
      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Apply Rotation To
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { id: 'all', label: 'All Pages' },
            { id: 'odd', label: 'Odd Pages (1, 3, 5...)' },
            { id: 'even', label: 'Even Pages (2, 4, 6...)' },
            { id: 'custom', label: 'Custom Pages' },
          ].map((scope) => {
            const isSelected = pageScope === scope.id;
            return (
              <button
                key={scope.id}
                type="button"
                onClick={() => onChangePageScope(scope.id as any)}
                className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-bold'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {scope.label}
              </button>
            );
          })}
        </div>

        {pageScope === 'custom' && (
          <div className="pt-2">
            <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
              Enter page numbers separated by commas (e.g. 1, 3, 4):
            </label>
            <input
              type="text"
              value={customPages}
              onChange={(e) => onChangeCustomPages(e.target.value)}
              placeholder="e.g. 1, 2, 5"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        )}
      </div>

      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
        <span>
          Rotation modifies the internal PDF viewport specification without recompressing page contents, guaranteeing 100% vector font sharpness.
        </span>
      </div>
    </div>
  );
}
