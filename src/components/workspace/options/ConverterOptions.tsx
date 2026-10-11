import React from 'react';
import { Sliders, Sparkles, Check, Info } from 'lucide-react';
import { SupportedOutputFormat } from '../../../tools/image-engine.js';

interface ConverterOptionsProps {
  outputFormat: SupportedOutputFormat;
  onChangeOutputFormat: (fmt: SupportedOutputFormat) => void;
  quality: number;
  onChangeQuality: (val: number) => void;
  fileCount: number;
}

export function ConverterOptions({
  outputFormat,
  onChangeOutputFormat,
  quality,
  onChangeQuality,
  fileCount,
}: ConverterOptionsProps) {
  const formats: Array<{
    id: SupportedOutputFormat;
    label: string;
    ext: string;
    badge: string;
    desc: string;
  }> = [
    {
      id: 'image/webp',
      label: 'WebP',
      ext: '.webp',
      badge: 'Modern & Compact',
      desc: 'Smallest file size with excellent visual fidelity. Modern web standard.',
    },
    {
      id: 'image/png',
      label: 'PNG',
      ext: '.png',
      badge: 'Lossless',
      desc: 'Preserves crisp edges and transparent backgrounds perfectly.',
    },
    {
      id: 'image/jpeg',
      label: 'JPG',
      ext: '.jpg',
      badge: 'Universal',
      desc: 'Compatible with every device, email client, and photo viewer.',
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-6 shadow-xs">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
          <Sliders className="w-4 h-4 text-sky-500" />
          <span>Format Conversion Settings</span>
        </h3>
        {fileCount > 1 && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 font-medium">
            Batch mode: {fileCount} images
          </span>
        )}
      </div>

      {/* Target Format Selector */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Target Output Format
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {formats.map((f) => {
            const isSelected = outputFormat === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onChangeOutputFormat(f.id)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                  isSelected
                    ? 'border-sky-500 bg-sky-50/60 dark:bg-sky-950/40 text-slate-900 dark:text-white ring-2 ring-sky-500/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm">{f.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      isSelected
                        ? 'bg-sky-500 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {f.ext}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
                  {f.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quality Control (for lossy formats) */}
      {outputFormat !== 'image/png' ? (
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Compression Quality
            </label>
            <span className="text-sm font-mono font-bold text-sky-600 dark:text-sky-400">
              {quality}%
            </span>
          </div>

          <input
            type="range"
            min="20"
            max="100"
            value={quality}
            onChange={(e) => onChangeQuality(parseInt(e.target.value, 10))}
            className="w-full accent-sky-500 h-2 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
          />

          <div className="flex justify-between text-[11px] text-slate-400 dark:text-slate-500">
            <span>20% (Maximum compression)</span>
            <span>85% (Recommended balanced)</span>
            <span>100% (Maximum fidelity)</span>
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
          <Info className="w-4 h-4 text-sky-500 shrink-0" />
          <span>
            PNG is a <strong>lossless format</strong>: visual quality is always 100% preserved with full alpha transparency.
          </span>
        </div>
      )}
    </div>
  );
}
