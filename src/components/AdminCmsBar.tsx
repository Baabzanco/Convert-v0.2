import React from 'react';
import {
  Save,
  Send,
  RotateCcw,
  History,
  Search,
  Eye,
  LogOut,
  AlertCircle,
  CheckCircle,
  ShieldAlert,
} from 'lucide-react';

interface AdminCmsBarProps {
  adminUser: { id: string; username: string; role: string };
  pageTitle: string;
  version: number;
  hasUnpublishedChanges: boolean;
  isSaving: boolean;
  saveError: string | null;
  conflictData: any | null;
  previewMode: 'draft' | 'published';
  onTogglePreviewMode: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  onRevertDraft: () => void;
  onOpenSeo: () => void;
  onOpenRevisions: () => void;
  onLogout: () => void;
}

export function AdminCmsBar({
  adminUser,
  pageTitle,
  version,
  hasUnpublishedChanges,
  isSaving,
  saveError,
  conflictData,
  previewMode,
  onTogglePreviewMode,
  onSaveDraft,
  onPublish,
  onRevertDraft,
  onOpenSeo,
  onOpenRevisions,
  onLogout,
}: AdminCmsBarProps) {
  return (
    <aside aria-label="CMS Administration Bar" className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-700/80 text-white shadow-xl px-4 py-2 text-xs">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Identity & Version */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-sky-950 border border-sky-700/70 text-sky-300 font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            CMS Admin: <strong className="text-white">{adminUser.username}</strong>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-slate-300">
            <span className="text-slate-400">Page:</span>
            <span className="font-semibold text-white">{pageTitle}</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-mono">
              v{version}
            </span>
          </div>

          {hasUnpublishedChanges ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/80 border border-amber-700/80 text-amber-300 text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              Draft Pending
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-[11px]">
              <CheckCircle className="w-3 h-3 text-emerald-400" />
              Published
            </span>
          )}
        </div>

        {/* Center/Right: Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode Toggle */}
          <button
            type="button"
            onClick={onTogglePreviewMode}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer border ${
              previewMode === 'draft'
                ? 'bg-sky-600/80 border-sky-500 text-white'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
            title="Toggle between viewing draft edits or published live view"
          >
            <Eye className="w-3.5 h-3.5" />
            Mode: {previewMode === 'draft' ? 'Draft' : 'Public'}
          </button>

          {/* Save Draft */}
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5 text-sky-400" />
            Save Draft
          </button>

          {/* Publish */}
          <button
            type="button"
            onClick={onPublish}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition cursor-pointer shadow disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            Publish Live
          </button>

          {/* Revert Draft */}
          {hasUnpublishedChanges && (
            <button
              type="button"
              onClick={onRevertDraft}
              disabled={isSaving}
              className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-rose-950/50 hover:text-rose-300 text-slate-400 border border-slate-700 text-xs transition cursor-pointer"
              title="Discard draft changes and revert to published state"
            >
              <RotateCcw className="w-3 h-3" />
              Discard Draft
            </button>
          )}

          <div className="h-4 w-px bg-slate-700 mx-1"></div>

          {/* SEO Modal */}
          <button
            type="button"
            onClick={onOpenSeo}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-amber-400" />
            SEO
          </button>

          {/* Revisions History */}
          <button
            type="button"
            onClick={onOpenRevisions}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-purple-400" />
            Revisions
          </button>

          <div className="h-4 w-px bg-slate-700 mx-1"></div>

          {/* Logout */}
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 text-xs transition cursor-pointer"
            title="Log out from CMS"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Concurrency Conflict or Error Notification Banner */}
      {conflictData && (
        <div className="mt-2 p-2 bg-rose-950 border border-rose-700 rounded text-rose-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              <strong>Concurrency Conflict:</strong> Another session updated this page (server is now at v{conflictData.currentVersion}). Please reload before saving.
            </span>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-2 py-0.5 bg-rose-700 hover:bg-rose-600 text-white rounded text-[11px] font-semibold"
          >
            Reload Page
          </button>
        </div>
      )}

      {saveError && !conflictData && (
        <div className="mt-2 p-2 bg-amber-950/80 border border-amber-800 rounded text-amber-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}
    </aside>
  );
}
