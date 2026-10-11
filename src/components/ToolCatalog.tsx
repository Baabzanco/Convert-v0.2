import React, { useState, useMemo } from 'react';
import {
  RefreshCw,
  Sliders,
  Maximize2,
  Crop,
  RotateCw,
  Image as ImageIcon,
  GitMerge,
  Scissors,
  ArrowRight,
  Search,
  X,
  Lock,
  Layers,
  FileText,
} from 'lucide-react';
import { TOOL_REGISTRY, ToolDefinition } from '../tools/registry.js';

interface ToolCatalogProps {
  onSelectTool: (toolId: string) => void;
  selectedCategory: 'all' | 'image' | 'pdf';
  onSelectCategory: (cat: 'all' | 'image' | 'pdf') => void;
}

const TOOL_ICONS: Record<string, React.ElementType> = {
  'image-converter': RefreshCw,
  'image-compressor': Sliders,
  'image-resizer': Maximize2,
  'image-cropper': Crop,
  'image-rotator': RotateCw,
  'image-to-pdf': ImageIcon,
  'merge-pdf': GitMerge,
  'split-pdf': Scissors,
  'rotate-pdf': RotateCw,
};

export function ToolCatalog({
  onSelectTool,
  selectedCategory,
  onSelectCategory,
}: ToolCatalogProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTools = useMemo(() => {
    return TOOL_REGISTRY.filter((tool) => {
      // Category filter
      if (selectedCategory !== 'all' && tool.category !== selectedCategory) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = tool.name.toLowerCase().includes(q);
        const matchDesc = tool.shortDescription.toLowerCase().includes(q);
        const matchFormat = tool.outputFormat.toLowerCase().includes(q);
        return matchName || matchDesc || matchFormat;
      }
      return true;
    });
  }, [selectedCategory, searchQuery]);

  const imageCount = TOOL_REGISTRY.filter((t) => t.category === 'image').length;
  const pdfCount = TOOL_REGISTRY.filter((t) => t.category === 'pdf').length;

  return (
    <section id="tools" className="py-16 md:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
          <Lock className="w-3.5 h-3.5" />
          <span>100% Client-Side Engine</span>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <span>Zero Server Uploads</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Browser-Only Image &amp; PDF Processing Suite
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
          Files are decoded, manipulated, and converted directly in your web browser memory.
        </p>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-5">
        {/* Category Filter Tabs */}
        <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => onSelectCategory('all')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Tools ({TOOL_REGISTRY.length})
          </button>
          <button
            type="button"
            onClick={() => onSelectCategory('image')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
              selectedCategory === 'image'
                ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Image Tools ({imageCount})
          </button>
          <button
            type="button"
            onClick={() => onSelectCategory('pdf')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
              selectedCategory === 'pdf'
                ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            PDF Tools ({pdfCount})
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tools or formats..."
            className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Matching Tools Count */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <span>
          Showing <strong>{filteredTools.length}</strong> of {TOOL_REGISTRY.length} tools
        </span>
        {searchQuery && (
          <span>
            Filtering by <em>"{searchQuery}"</em>
          </span>
        )}
      </div>

      {/* Grid of Tool Cards */}
      {filteredTools.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-3">
          <Layers className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">No tools matched your search</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Try adjusting your search query or switching categories.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              onSelectCategory('all');
            }}
            className="px-4 py-2 rounded-lg bg-sky-600 text-white text-xs font-medium cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTools.map((tool) => {
            const Icon = TOOL_ICONS[tool.id] || RefreshCw;
            const isImage = tool.category === 'image';

            return (
              <div
                key={tool.id}
                onClick={() => onSelectTool(tool.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onSelectTool(tool.id);
                }}
                className="group relative p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 hover:border-sky-500 dark:hover:border-sky-500 transition-all duration-200 shadow-xs hover:shadow-lg hover:shadow-sky-500/5 flex flex-col justify-between cursor-pointer"
              >
                <div className="space-y-4">
                  {/* Top Row: Icon + Meta */}
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
                        isImage
                          ? 'bg-sky-50 dark:bg-sky-950/80 border border-sky-200 dark:border-sky-800/80 text-sky-600 dark:text-sky-400 group-hover:bg-sky-600 group-hover:text-white'
                          : 'bg-purple-50 dark:bg-purple-950/80 border border-purple-200 dark:border-purple-800/80 text-purple-600 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="flex items-center gap-2 text-right">
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          isImage
                            ? 'bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/60'
                            : 'bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60'
                        }`}
                      >
                        {isImage ? 'Image Tool' : 'PDF Tool'}
                      </span>
                    </div>
                  </div>

                  {/* Tool Title & Summary */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors flex items-center justify-between">
                      <span>{tool.name}</span>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400 group-hover:translate-x-1 transition-transform" />
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                      {tool.shortDescription}
                    </p>
                  </div>
                </div>

                {/* Bottom Row: Capabilities & CTA */}
                <div className="pt-5 mt-5 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>Engine: {tool.processingEngine.split(' ')[0]}</span>
                    <span>Max {tool.fileLimits.maxFileSizeMb}MB</span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                      Output: {tool.outputFormat}
                    </span>
                    <span className="text-xs font-semibold text-sky-600 dark:text-sky-400 group-hover:underline">
                      Launch Tool →
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
