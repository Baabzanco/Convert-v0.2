import React, { useState } from 'react';
import { ShieldCheck, Lock, ChevronDown, ChevronUp, HardDrive } from 'lucide-react';

export function PrivacyNotice() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 p-4 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                100% Client-Side Private Processing
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                No Cloud Uploads
              </span>
            </div>
            <p className="mt-0.5 text-xs text-emerald-800/90 dark:text-emerald-300/80 leading-relaxed">
              Your files never leave your computer. Processing runs entirely in your local browser memory using direct byte-level manipulation.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-200 transition-colors flex items-center gap-1 shrink-0 cursor-pointer pt-1"
          aria-expanded={expanded}
        >
          <span>{expanded ? 'Less info' : 'How it works'}</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-emerald-200/60 dark:border-emerald-800/40 text-xs text-emerald-800/80 dark:text-emerald-300/70 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-start gap-2">
            <HardDrive className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
            <span>
              <strong>Local Memory Only:</strong> Files are read into an in-memory <code>ArrayBuffer</code>.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
            <span>
              <strong>Zero Server Endpoints:</strong> This application has no upload or media storage database.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <Lock className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
            <span>
              <strong>Immediate Disposal:</strong> Closing this tab or resetting the tool cleans all RAM buffers immediately.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
