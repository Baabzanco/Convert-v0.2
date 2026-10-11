import React from 'react';
import { ArrowLeft, Cpu, ShieldCheck, Tag } from 'lucide-react';
import { ToolDefinition } from '../../tools/registry.js';

interface ToolHeaderProps {
  tool: ToolDefinition;
  onBackToTools: () => void;
  onSelectCategory?: (cat: 'image' | 'pdf') => void;
}

export function ToolHeader({ tool, onBackToTools, onSelectCategory }: ToolHeaderProps) {
  const categoryLabel = tool.category === 'image' ? 'Image Tools' : 'PDF Tools';

  return (
    <div className="space-y-4 pb-6 border-b border-slate-200 dark:border-slate-800 transition-colors">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <button
          type="button"
          onClick={onBackToTools}
          className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors flex items-center gap-1 cursor-pointer font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Home</span>
        </button>
        <span className="text-slate-300 dark:text-slate-700">/</span>
        <button
          type="button"
          onClick={() => {
            if (onSelectCategory) onSelectCategory(tool.category);
            onBackToTools();
          }}
          className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer capitalize"
        >
          {categoryLabel}
        </button>
        <span className="text-slate-300 dark:text-slate-700">/</span>
        <span className="text-slate-900 dark:text-slate-100 font-semibold truncate max-w-[240px] sm:max-w-none">
          {tool.name}
        </span>
      </nav>

      {/* Main Header & Engine Badges */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {tool.name}
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
              <Tag className="w-3 h-3" />
              {tool.category.toUpperCase()}
            </span>
          </div>
          <p className="mt-1.5 text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
            {tool.fullDescription}
          </p>
        </div>

        {/* Engine and Trust Badges */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 shadow-xs">
            <Cpu className="w-3.5 h-3.5 text-sky-500" />
            <span>{tool.processingEngine}</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/70 text-xs font-medium text-emerald-700 dark:text-emerald-300 shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>100% In-Browser</span>
          </div>
        </div>
      </div>
    </div>
  );
}
