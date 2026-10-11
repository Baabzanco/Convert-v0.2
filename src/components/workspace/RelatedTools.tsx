import React from 'react';
import {
  ArrowRight,
  RefreshCw,
  Sliders,
  Maximize2,
  Crop,
  RotateCw,
  Image as ImageIcon,
  GitMerge,
  Scissors,
  FileText,
} from 'lucide-react';
import { TOOL_REGISTRY, ToolDefinition } from '../../tools/registry.js';

interface RelatedToolsProps {
  currentToolId: string;
  onSelectTool: (toolId: string) => void;
}

export function RelatedTools({ currentToolId, onSelectTool }: RelatedToolsProps) {
  const currentTool = TOOL_REGISTRY.find((t) => t.id === currentToolId);
  if (!currentTool) return null;

  // Filter out current tool, prioritize same category
  const sameCategory = TOOL_REGISTRY.filter(
    (t) => t.id !== currentToolId && t.category === currentTool.category
  );
  const otherCategory = TOOL_REGISTRY.filter(
    (t) => t.id !== currentToolId && t.category !== currentTool.category
  );
  const candidates = [...sameCategory, ...otherCategory].slice(0, 3);

  const getToolIcon = (id: string) => {
    switch (id) {
      case 'image-converter':
        return <RefreshCw className="w-5 h-5 text-sky-500" />;
      case 'image-compressor':
        return <Sliders className="w-5 h-5 text-emerald-500" />;
      case 'image-resizer':
        return <Maximize2 className="w-5 h-5 text-indigo-500" />;
      case 'image-cropper':
        return <Crop className="w-5 h-5 text-amber-500" />;
      case 'image-rotator':
        return <RotateCw className="w-5 h-5 text-blue-500" />;
      case 'image-to-pdf':
        return <ImageIcon className="w-5 h-5 text-purple-500" />;
      case 'pdf-merge':
        return <GitMerge className="w-5 h-5 text-rose-500" />;
      case 'pdf-split':
        return <Scissors className="w-5 h-5 text-orange-500" />;
      case 'pdf-rotate':
        return <RotateCw className="w-5 h-5 text-teal-500" />;
      default:
        return <FileText className="w-5 h-5 text-sky-500" />;
    }
  };

  return (
    <div className="pt-8 border-t border-slate-200 dark:border-slate-800 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            Related Local Tools
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Combine workflows with other browser-only utilities.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {candidates.map((t) => (
          <div
            key={t.id}
            onClick={() => onSelectTool(t.id)}
            className="group p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-sky-500 dark:hover:border-sky-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-3"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                {getToolIcon(t.id)}
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                {t.name}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                {t.shortDescription}
              </p>
            </div>

            <div className="flex items-center text-xs font-semibold text-sky-600 dark:text-sky-400 pt-1 group-hover:translate-x-1 transition-transform">
              <span>Open tool</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
