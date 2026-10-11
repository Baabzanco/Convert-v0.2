import React from 'react';
import {
  Shield,
  Layers,
  Cpu,
  Lock,
  ArrowRight,
  HardDrive,
  CheckCircle2,
  Database,
  FileCheck2,
} from 'lucide-react';
import { EditableHeading, EditableParagraph } from './InlineEditor.js';

interface PrivacyArchitectureProps {
  sections: Array<{ id?: string; title: string; content: string }>;
  onUpdateSection: (index: number, field: string, val: string) => void;
  isEditingEnabled: boolean;
  toolDescription: { name: string; description: string };
  onUpdateToolDesc: (field: string, val: string) => void;
}

export function PrivacyArchitecture({
  sections,
  onUpdateSection,
  isEditingEnabled,
  toolDescription,
  onUpdateToolDesc,
}: PrivacyArchitectureProps) {
  return (
    <section id="architecture" className="py-16 md:py-24 bg-slate-100/60 dark:bg-slate-900/40 border-y border-slate-200/80 dark:border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 text-xs font-medium">
            <Shield className="w-3.5 h-3.5" />
            <span>Verifiable Architecture</span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span>Zero Upload Guarantee</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            How In-Browser Processing Works
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
            Most online tools upload your files to unknown cloud servers. BrowserSuite takes the opposite approach: the application logic runs entirely within your device.
          </p>
        </div>

        {/* 3-Step Visual Privacy Pipeline */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Step 1 */}
          <div className="relative p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold text-sm flex items-center justify-center">
                01
              </span>
              <HardDrive className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Local Ingestion</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                When you drag or select a file, the browser’s native File API loads the bytes straight into local browser RAM. No HTTP packets are sent.
              </p>
            </div>
            <div className="pt-2 flex items-center gap-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Zero network transmission</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-sm flex items-center justify-center">
                02
              </span>
              <Cpu className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">In-Memory Engine</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                HTML5 Canvas 2D and pdf-lib WebAssembly execute image filters, compression, resizing, and PDF merges directly on your local hardware.
              </p>
            </div>
            <div className="pt-2 flex items-center gap-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Hardware-accelerated speed</span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-sm flex items-center justify-center">
                03
              </span>
              <Lock className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Direct Disk Download</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                Converted files are emitted as an in-memory <code>Blob</code> and immediately downloaded to your machine. Memory is released instantly.
              </p>
            </div>
            <div className="pt-2 flex items-center gap-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>No temporary server traces</span>
            </div>
          </div>
        </div>

        {/* Feature Highlight Callout (CMS Editable) */}
        <div id="features" className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <EditableHeading
              level={2}
              value={toolDescription.name}
              onSave={(val) => onUpdateToolDesc('name', val)}
              isEditingEnabled={isEditingEnabled}
              className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white"
              fieldId="tool-name"
            />
          </div>
          <EditableParagraph
            value={toolDescription.description}
            onSave={(val) => onUpdateToolDesc('description', val)}
            isEditingEnabled={isEditingEnabled}
            className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed"
            fieldId="tool-desc"
          />
        </div>

        {/* Core Architectural Foundations Grid (CMS Editable) */}
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Core Architectural Foundations
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Standalone PostgreSQL administrative storage with defense-in-depth security controls
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sections.map((sec, idx) => (
              <div
                key={sec.id || idx}
                className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                  <EditableHeading
                    level={3}
                    value={sec.title}
                    onSave={(val) => onUpdateSection(idx, 'title', val)}
                    isEditingEnabled={isEditingEnabled}
                    className="text-base font-semibold text-slate-900 dark:text-white"
                    fieldId={`section-title-${idx}`}
                  />
                </div>
                <EditableParagraph
                  value={sec.content}
                  onSave={(val) => onUpdateSection(idx, 'content', val)}
                  isEditingEnabled={isEditingEnabled}
                  className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm leading-relaxed"
                  fieldId={`section-content-${idx}`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
