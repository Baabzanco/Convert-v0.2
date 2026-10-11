import React from 'react';
import { Sliders, Zap, Check, ArrowDownRight } from 'lucide-react';
import { SupportedOutputFormat } from '../../../tools/image-engine.js';

interface CompressorOptionsProps {
  quality: number;
  onChangeQuality: (val: number) => void;
  maxDimension: number | undefined;
  onChangeMaxDimension: (dim: number | undefined) => void;
  outputFormat: SupportedOutputFormat;
  onChangeOutputFormat: (fmt: SupportedOutputFormat) => void;
  originalSizeTotal?: number;
}

export function CompressorOptions({
  quality,
  onChangeQuality,
  maxDimension,
  onChangeMaxDimension,
  outputFormat,
  onChangeOutputFormat,
  originalSizeTotal,
}: CompressorOptionsProps) {
  const dimensionPresets: Array<{ label: string; value: number | undefined }> = [
    { label: 'Original Dimensions', value: undefined },
    { label: '1920px (Full HD)', value: 1920 },
    { label: '1280px (HD)', value: 1280 },
    { label: '800px (Web)', value: 800 },
  ];

  // Estimation helper
  const estimatedSavings = Math.max(15, Math.min(85, Math.round((100 - quality) * 0.9)));

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-6 shadow-xs">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <span>Compression Controls</span>
        </h3>
        <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-1">
          <ArrowDownRight className="w-3.5 h-3.5" />
          Est. ~{estimatedSavings}% size reduction
        </span>
      </div>

      {/* Quality Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Target Compression Quality
            </label>
            <p className="text-xs text-slate-400">
              {quality >= 80
                ? 'High visual fidelity with modest size reduction.'
                : quality >= 60
                ? 'Balanced compression, visually lossless on standard screens.'
                : 'Aggressive compression for maximum bandwidth savings.'}
            </p>
          </div>
          <span className="text-lg font-mono font-bold text-sky-600 dark:text-sky-400">
            {quality}%
          </span>
        </div>

        <input
          type="range"
          min="10"
          max="95"
          value={quality}
          onChange={(e) => onChangeQuality(parseInt(e.target.value, 10))}
          className="w-full accent-sky-500 h-2 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
        />

        <div className="flex justify-between text-[11px] text-slate-400 dark:text-slate-500">
          <span>10% (Ultra Compact)</span>
          <span>75% (Recommended)</span>
          <span>95% (Near Lossless)</span>
        </div>
      </div>

      {/* Max Dimension Bounds */}
      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Max Dimension Constraint (Optional)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {dimensionPresets.map((preset) => {
            const isSelected = maxDimension === preset.value;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => onChangeMaxDimension(preset.value)}
                className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-bold'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Output Format */}
      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Output Format
        </label>
        <div className="flex items-center gap-3">
          {(['image/jpeg', 'image/webp'] as SupportedOutputFormat[]).map((fmt) => {
            const label = fmt === 'image/jpeg' ? 'JPG (Universal)' : 'WebP (Maximum Compression)';
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
