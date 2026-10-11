import React from 'react';
import { RotateCw, RotateCcw, FlipHorizontal, FlipVertical, Rotate3D } from 'lucide-react';
import { SupportedOutputFormat } from '../../../tools/image-engine.js';

interface RotatorOptionsProps {
  rotationAngle: 0 | 90 | 180 | 270;
  onChangeRotationAngle: (deg: 0 | 90 | 180 | 270) => void;
  flipH: boolean;
  onToggleFlipH: (val: boolean) => void;
  flipV: boolean;
  onToggleFlipV: (val: boolean) => void;
  thumbnailUrl?: string;
  outputFormat: SupportedOutputFormat;
  onChangeOutputFormat: (fmt: SupportedOutputFormat) => void;
}

export function RotatorOptions({
  rotationAngle,
  onChangeRotationAngle,
  flipH,
  onToggleFlipH,
  flipV,
  onToggleFlipV,
  thumbnailUrl,
  outputFormat,
  onChangeOutputFormat,
}: RotatorOptionsProps) {
  const rotateRight = () => {
    const next = ((rotationAngle + 90) % 360) as 0 | 90 | 180 | 270;
    onChangeRotationAngle(next);
  };

  const rotateLeft = () => {
    const next = ((rotationAngle + 270) % 360) as 0 | 90 | 180 | 270;
    onChangeRotationAngle(next);
  };

  const resetAll = () => {
    onChangeRotationAngle(0);
    onToggleFlipH(false);
    onToggleFlipV(false);
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-6 shadow-xs">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
          <RotateCw className="w-4 h-4 text-sky-500" />
          <span>Rotation & Orientation Controls</span>
        </h3>
        <button
          type="button"
          onClick={resetAll}
          className="text-xs text-slate-500 hover:text-sky-600 dark:hover:text-sky-400 flex items-center gap-1 cursor-pointer transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset orientation</span>
        </button>
      </div>

      {/* Interactive Live Transformation Preview */}
      {thumbnailUrl && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Live Orientation Preview
            </label>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              {rotationAngle}° {flipH ? '• Flipped H' : ''} {flipV ? '• Flipped V' : ''}
            </span>
          </div>

          <div className="h-64 sm:h-72 w-full rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center p-4 border border-slate-200 dark:border-slate-800 select-none">
            <img
              src={thumbnailUrl}
              alt="Live rotation subject"
              style={{
                transform: `rotate(${rotationAngle}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              className="max-h-56 max-w-full object-contain"
            />
          </div>
        </div>
      )}

      {/* Action Buttons Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={rotateLeft}
          className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-sky-500 bg-slate-50/50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4 text-sky-500" />
          <span>Rotate 90° CCW</span>
        </button>

        <button
          type="button"
          onClick={rotateRight}
          className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-sky-500 bg-slate-50/50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <RotateCw className="w-4 h-4 text-sky-500" />
          <span>Rotate 90° CW</span>
        </button>

        <button
          type="button"
          onClick={() => onToggleFlipH(!flipH)}
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
            flipH
              ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-bold'
              : 'border-slate-200 dark:border-slate-700 hover:border-sky-500 bg-slate-50/50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
          }`}
        >
          <FlipHorizontal className="w-4 h-4 text-sky-500" />
          <span>Flip Horizontal</span>
        </button>

        <button
          type="button"
          onClick={() => onToggleFlipV(!flipV)}
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
            flipV
              ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-bold'
              : 'border-slate-200 dark:border-slate-700 hover:border-sky-500 bg-slate-50/50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
          }`}
        >
          <FlipVertical className="w-4 h-4 text-sky-500" />
          <span>Flip Vertical</span>
        </button>
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
