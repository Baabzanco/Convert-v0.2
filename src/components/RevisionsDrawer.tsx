import React, { useState } from 'react';
import { X, History, RotateCcw, Check, AlertCircle } from 'lucide-react';

interface Revision {
  id: string;
  revisionNumber: number;
  title: string;
  changeSummary?: string | null;
  createdAt: string;
  author?: { id: string; username: string } | null;
  structuredContent: any;
}

interface RevisionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  pageId: string;
  currentVersion: number;
  revisions: Revision[];
  onRestoreRevision: (revisionId: string, revisionNumber: number) => Promise<boolean>;
}

export function RevisionsDrawer({
  isOpen,
  onClose,
  currentVersion,
  revisions,
  onRestoreRevision,
}: RevisionsDrawerProps) {
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRestore = async (revision: Revision) => {
    setError(null);
    setRestoringId(revision.id);
    try {
      const success = await onRestoreRevision(revision.id, revision.revisionNumber);
      if (success) {
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to restore revision');
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-700 h-full overflow-y-auto text-slate-100 p-6 flex flex-col justify-between shadow-2xl">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-purple-400" />
              <div>
                <h3 className="text-base font-semibold text-white">Content Revision History</h3>
                <p className="text-xs text-slate-400">Current page state: v{currentVersion}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {error && (
            <div className="p-2.5 rounded bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* List of Revisions */}
          <div className="space-y-3 mt-4">
            {revisions.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No previous revisions recorded yet.</p>
            ) : (
              revisions.map((rev) => (
                <div
                  key={rev.id}
                  className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white font-mono flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-purple-950 border border-purple-800 text-purple-300 text-[10px]">
                        Rev #{rev.revisionNumber}
                      </span>
                      {rev.title}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(rev.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-slate-300 text-[11px]">
                    {rev.changeSummary || 'Content revision update'}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-[11px] text-slate-500">
                    <span>Author: {rev.author?.username || 'System'}</span>
                    <button
                      type="button"
                      onClick={() => handleRestore(rev)}
                      disabled={restoringId !== null}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-purple-900/60 text-purple-300 border border-purple-800/60 text-[11px] transition cursor-pointer disabled:opacity-50"
                    >
                      <RotateCcw className="w-3 h-3" />
                      {restoringId === rev.id ? 'Restoring...' : 'Restore This Version'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
