import React from 'react';
import { Crop, RotateCcw } from 'lucide-react';
import { SupportedOutputFormat } from '../../../tools/image-engine.js';

export interface CropRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CropperOptionsProps {
  cropRect: CropRectangle;
  onChangeCropRect: (rect: CropRectangle) => void;
  naturalWidth: number;
  naturalHeight: number;
  thumbnailUrl?: string;
  outputFormat: SupportedOutputFormat;
  onChangeOutputFormat: (fmt: SupportedOutputFormat) => void;
}

export function CropperOptions({
  cropRect,
  onChangeCropRect,
  naturalWidth,
  naturalHeight,
  thumbnailUrl,
  outputFormat,
  onChangeOutputFormat,
}: CropperOptionsProps) {
  const presets: Array<{ label: string; ratio?: number }> = [
    { label: 'Free / Custom', ratio: undefined },
    { label: '1:1 Square', ratio: 1 },
    { label: '16:9 Landscape', ratio: 16 / 9 },
    { label: '4:3 Standard', ratio: 4 / 3 },
    { label: '3:2 Classic', ratio: 3 / 2 },
  ];

  const applyRatioPreset = (ratio?: number) => {
    if (!ratio) return;
    let newWidth = naturalWidth;
    let newHeight = Math.round(naturalWidth / ratio);
    if (newHeight > naturalHeight) {
      newHeight = naturalHeight;
      newWidth = Math.round(naturalHeight * ratio);
    }
    const x = Math.max(0, Math.round((naturalWidth - newWidth) / 2));
    const y = Math.max(0, Math.round((naturalHeight - newHeight) / 2));
    onChangeCropRect({ x, y, width: newWidth, height: newHeight });
  };

  const handleReset = () => {
    onChangeCropRect({
      x: 0,
      y: 0,
      width: naturalWidth || 800,
      height: naturalHeight || 600,
    });
  };

  // Preview overlay percentages
  const leftPct = naturalWidth > 0 ? (cropRect.x / naturalWidth) * 100 : 0;
  const topPct = naturalHeight > 0 ? (cropRect.y / naturalHeight) * 100 : 0;
  const widthPct = naturalWidth > 0 ? (cropRect.width / naturalWidth) * 100 : 100;
  const heightPct = naturalHeight > 0 ? (cropRect.height / naturalHeight) * 100 : 100;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-6 shadow-xs">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
          <Crop className="w-4 h-4 text-sky-500" />
          <span>Crop Boundary Settings</span>
        </h3>
        <button
          type="button"
          onClick={handleReset}
          className="text-xs text-slate-500 hover:text-sky-600 dark:hover:text-sky-400 flex items-center gap-1 cursor-pointer transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset to full</span>
        </button>
      </div>

      {/* Aspect Ratio Presets */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Aspect Ratio Presets
        </label>
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => applyRatioPreset(p.ratio)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-sky-500 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Visual Crop Preview with Overlay */}
      {thumbnailUrl && (
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Interactive Visual Crop Area
          </label>
          <div className="relative max-h-64 sm:max-h-72 w-full rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center p-2 border border-slate-200 dark:border-slate-800 select-none">
            <div className="relative inline-block max-w-full max-h-60">
              <img
                src={thumbnailUrl}
                alt="Crop subject"
                className="max-h-60 max-w-full object-contain block opacity-70"
              />
              {/* Highlight Crop Box */}
              <div
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  width: `${widthPct}%`,
                  height: `${heightPct}%`,
                }}
                className="absolute border-2 border-sky-400 bg-sky-400/20 shadow-md shadow-sky-500/30 transition-all pointer-events-none"
              >
                <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-slate-950/80 text-[10px] text-white font-mono">
                  {Math.round(cropRect.width)} × {Math.round(cropRect.height)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Precision Coordinates Inputs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            X Offset (px)
          </label>
          <input
            type="number"
            min="0"
            max={Math.max(0, naturalWidth - 1)}
            value={Math.round(cropRect.x)}
            onChange={(e) =>
              onChangeCropRect({
                ...cropRect,
                x: Math.max(0, parseInt(e.target.value, 10) || 0),
              })
            }
            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            Y Offset (px)
          </label>
          <input
            type="number"
            min="0"
            max={Math.max(0, naturalHeight - 1)}
            value={Math.round(cropRect.y)}
            onChange={(e) =>
              onChangeCropRect({
                ...cropRect,
                y: Math.max(0, parseInt(e.target.value, 10) || 0),
              })
            }
            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            Width (px)
          </label>
          <input
            type="number"
            min="1"
            max={naturalWidth}
            value={Math.round(cropRect.width)}
            onChange={(e) =>
              onChangeCropRect({
                ...cropRect,
                width: Math.max(1, parseInt(e.target.value, 10) || 1),
              })
            }
            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            Height (px)
          </label>
          <input
            type="number"
            min="1"
            max={naturalHeight}
            value={Math.round(cropRect.height)}
            onChange={(e) =>
              onChangeCropRect({
                ...cropRect,
                height: Math.max(1, parseInt(e.target.value, 10) || 1),
              })
            }
            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
          />
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
