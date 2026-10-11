import React from 'react';
import { Maximize2, Link2, Link2Off, RotateCcw } from 'lucide-react';
import { SupportedOutputFormat } from '../../../tools/image-engine.js';

interface ResizerOptionsProps {
  width: number;
  height: number;
  onChangeWidth: (w: number) => void;
  onChangeHeight: (h: number) => void;
  maintainRatio: boolean;
  onToggleMaintainRatio: (val: boolean) => void;
  originalWidth: number;
  originalHeight: number;
  outputFormat: SupportedOutputFormat;
  onChangeOutputFormat: (fmt: SupportedOutputFormat) => void;
}

export function ResizerOptions({
  width,
  height,
  onChangeWidth,
  onChangeHeight,
  maintainRatio,
  onToggleMaintainRatio,
  originalWidth,
  originalHeight,
  outputFormat,
  onChangeOutputFormat,
}: ResizerOptionsProps) {
  const applyPreset = (scaleFactor: number) => {
    const newW = Math.max(1, Math.round(originalWidth * scaleFactor));
    const newH = Math.max(1, Math.round(originalHeight * scaleFactor));
    onChangeWidth(newW);
    onChangeHeight(newH);
  };

  const handleWidthChange = (val: number) => {
    const newW = Math.max(1, val);
    onChangeWidth(newW);
    if (maintainRatio && originalWidth > 0 && originalHeight > 0) {
      const ratio = originalHeight / originalWidth;
      onChangeHeight(Math.max(1, Math.round(newW * ratio)));
    }
  };

  const handleHeightChange = (val: number) => {
    const newH = Math.max(1, val);
    onChangeHeight(newH);
    if (maintainRatio && originalWidth > 0 && originalHeight > 0) {
      const ratio = originalWidth / originalHeight;
      onChangeWidth(Math.max(1, Math.round(newH * ratio)));
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-6 shadow-xs">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
          <Maximize2 className="w-4 h-4 text-sky-500" />
          <span>Dimension Resizing Settings</span>
        </h3>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
          Original: {originalWidth} × {originalHeight} px
        </span>
      </div>

      {/* Width and Height Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            Width (pixels)
          </label>
          <div className="relative">
            <input
              type="number"
              min="1"
              max="8000"
              value={width}
              onChange={(e) => handleWidthChange(parseInt(e.target.value, 10) || 1)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">px</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            Height (pixels)
          </label>
          <div className="relative">
            <input
              type="number"
              min="1"
              max="8000"
              value={height}
              onChange={(e) => handleHeightChange(parseInt(e.target.value, 10) || 1)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">px</span>
          </div>
        </div>
      </div>

      {/* Ratio lock & Quick Scale presets */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={maintainRatio}
            onChange={(e) => onToggleMaintainRatio(e.target.checked)}
            className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 accent-sky-500"
          />
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
            {maintainRatio ? (
              <Link2 className="w-3.5 h-3.5 text-sky-500" />
            ) : (
              <Link2Off className="w-3.5 h-3.5 text-slate-400" />
            )}
            Lock Aspect Ratio
          </span>
        </label>

        {/* Quick Scale Presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-400 mr-1">Scale:</span>
          {[0.25, 0.5, 0.75, 1, 1.5, 2].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => applyPreset(s)}
              className="px-2 py-1 rounded-lg text-xs font-mono font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              {s * 100}%
            </button>
          ))}
          <button
            type="button"
            onClick={() => applyPreset(1)}
            title="Reset to 100%"
            className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Output Format */}
      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Target Output Format
        </label>
        <div className="flex items-center gap-3">
          {(['image/png', 'image/jpeg', 'image/webp'] as SupportedOutputFormat[]).map((fmt) => {
            const label = fmt === 'image/png' ? 'PNG' : fmt === 'image/jpeg' ? 'JPG' : 'WebP';
            const isSelected = outputFormat === fmt;
            return (
              <button
                key={fmt}
                type="button"
                onClick={() => onChangeOutputFormat(fmt)}
                className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-bold'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
