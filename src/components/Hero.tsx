import React from 'react';
import { Shield, Zap, Lock, Cpu, ArrowDown, Sparkles, CheckCircle2 } from 'lucide-react';
import { EditableHeading, EditableParagraph } from './InlineEditor.js';

interface HeroProps {
  hero: {
    headline: string;
    subheadline: string;
    ctaText?: string;
    ctaLink?: string;
  };
  onUpdateHero: (field: string, val: string) => void;
  isEditingEnabled: boolean;
  onExploreTools: () => void;
}

export function Hero({
  hero,
  onUpdateHero,
  isEditingEnabled,
  onExploreTools,
}: HeroProps) {
  const scrollToArchitecture = () => {
    const el = document.getElementById('architecture');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 border-b border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-b from-slate-100/50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900/40 dark:to-slate-950">
      {/* Background radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-96 bg-sky-500/10 dark:bg-sky-500/5 blur-3xl pointer-events-none rounded-full" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        {/* Anti-Slop Privacy Kicker */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 text-xs font-medium shadow-xs">
          <Lock className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          <span>100% In-Browser Engine</span>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <span>Zero Server Uploads</span>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <span>Zero Logging</span>
        </div>

        {/* Primary Headline */}
        <EditableHeading
          level={1}
          value={hero.headline}
          onSave={(val) => onUpdateHero('headline', val)}
          isEditingEnabled={isEditingEnabled}
          className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]"
          fieldId="hero-headline"
        />

        {/* Supporting Subheadline */}
        <EditableParagraph
          value={hero.subheadline}
          onSave={(val) => onUpdateHero('subheadline', val)}
          isEditingEnabled={isEditingEnabled}
          className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed"
          fieldId="hero-subheadline"
        />

        {/* Action Buttons */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={onExploreTools}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-sm transition shadow-lg shadow-sky-600/20 hover:shadow-sky-600/30 cursor-pointer active:scale-95"
          >
            <span>{hero.ctaText || 'Browse All 9 Tools'}</span>
            <ArrowDown className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={scrollToArchitecture}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium text-sm border border-slate-200 dark:border-slate-800 transition shadow-xs cursor-pointer"
          >
            <Shield className="w-4 h-4 text-sky-500" />
            <span>How Privacy Works</span>
          </button>
        </div>

        {/* Trust & Guarantee Strip */}
        <div className="pt-10 grid grid-cols-2 lg:grid-cols-4 gap-4 text-left">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
            <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 mb-1">
              <Cpu className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Client-Side</span>
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Local CPU & RAM</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">
              Canvas API & WebAssembly run directly on your hardware.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
              <Lock className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">No Uploads</span>
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Zero Server Storage</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">
              Files are never sent across the network or stored in cloud tables.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-1">
              <Zap className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Zero Latency</span>
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Instant Conversions</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">
              No upload waiting time or download bottlenecks. Instant results.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
            <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">100% Free</span>
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">No Accounts Needed</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">
              No paywalls, subscriptions, credits, or watermarks ever.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
