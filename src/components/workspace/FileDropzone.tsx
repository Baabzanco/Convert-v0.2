import React, { useRef, useState } from 'react';
import { UploadCloud, FileType, CheckCircle, AlertTriangle } from 'lucide-react';
import { ToolDefinition } from '../../tools/registry.js';

interface FileDropzoneProps {
  tool: ToolDefinition;
  onFilesSelected: (files: FileList | File[]) => void;
  disabled?: boolean;
}

export function FileDropzone({ tool, onFilesSelected, disabled = false }: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
      // Reset input value so re-selecting same file triggers change
      e.target.value = '';
    }
  };

  const isMulti = tool.fileLimits.maxBatchCount > 1;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Upload files for ${tool.name}`}
      onClick={() => !disabled && fileInputRef.current?.click()}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
          e.preventDefault();
          fileInputRef.current?.click();
        }
      }}
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`group relative rounded-2xl border-2 border-dashed p-8 sm:p-10 text-center transition-all cursor-pointer select-none ${
        disabled
          ? 'opacity-50 cursor-not-allowed border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/40'
          : isDragging
          ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 scale-[1.005] shadow-lg shadow-sky-500/10'
          : 'border-slate-300 dark:border-slate-700 hover:border-sky-500 dark:hover:border-sky-400 bg-white dark:bg-slate-900/60 hover:bg-slate-50/80 dark:hover:bg-slate-900 shadow-xs'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple={isMulti}
        accept={tool.acceptedExtensions.join(',')}
        onChange={handleInputChange}
        disabled={disabled}
        className="hidden"
      />

      <div className="flex flex-col items-center justify-center space-y-4">
        {/* Upload Icon Circle */}
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
            isDragging
              ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25 scale-110'
              : 'bg-slate-100 dark:bg-slate-800 text-sky-600 dark:text-sky-400 group-hover:scale-105 group-hover:bg-sky-50 dark:group-hover:bg-slate-800'
          }`}
        >
          <UploadCloud className="w-8 h-8" />
        </div>

        {/* Text Prompt */}
        <div className="space-y-1">
          <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            {isDragging ? (
              <span className="text-sky-600 dark:text-sky-400">Drop files here to process</span>
            ) : (
              <>
                Drop {isMulti ? 'files' : 'file'} here, or{' '}
                <span className="text-sky-600 dark:text-sky-400 underline decoration-sky-400/40 underline-offset-4 group-hover:decoration-sky-500">
                  browse from device
                </span>
              </>
            )}
          </p>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {isMulti
              ? `Select up to ${tool.fileLimits.maxBatchCount} files for batch local processing.`
              : 'Select a file to begin instant local processing.'}
          </p>
        </div>

        {/* Formats & Limits Pill Row */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 font-medium">
            <FileType className="w-3.5 h-3.5 text-sky-500" />
            <span>Supported: {tool.acceptedExtensions.join(', ')}</span>
          </span>

          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 font-medium">
            <span>Max {tool.fileLimits.maxFileSizeMb} MB per file</span>
          </span>

          {tool.fileLimits.maxDimensions && (
            <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 font-medium">
              <span>Up to {tool.fileLimits.maxDimensions}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
