'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ConfirmDeleteModalProps {
  /** Title line — "Delete Lead", "Delete Project", … */
  title: string;
  /**
   * What is being removed and what that costs, e.g.
   * `Deleting this lead (John Smith) will remove all associated data permanently.`
   */
  message: React.ReactNode;
  /** Second line under the message. Overridable, but rarely worth changing. */
  note?: string;
  confirmLabel?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * The single deletion confirmation dialog for the whole app — solid red bin,
 * centred copy, paired Cancel / Delete buttons.
 *
 * Callers render it only when a delete is pending, so there is no `isOpen`
 * prop: mounting it opens it.
 */
export function ConfirmDeleteModal({
  title,
  message,
  note = 'This action cannot be undone.',
  confirmLabel = 'Delete',
  loading = false,
  onCancel,
  onConfirm,
}: ConfirmDeleteModalProps) {
  // Escape cancels — destructive dialogs should always have a way out that
  // doesn't involve aiming at a button next to "Delete".
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[100] backdrop-blur-[1px]" onClick={onCancel} />
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
        <div
          role="alertdialog"
          aria-modal="true"
          aria-label={title}
          className="pointer-events-auto relative bg-white rounded-2xl shadow-2xl w-full max-w-[560px] px-8 py-10 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-150"
        >
          <button
            onClick={onCancel}
            aria-label="Close"
            className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>

          <TrashGlyph />

          <h2 className="text-2xl font-semibold text-gray-900 mt-6 mb-3">{title}</h2>

          <div className="text-sm text-gray-500 leading-relaxed max-w-[420px] space-y-2 mb-8">
            <p>{message}</p>
            <p>{note}</p>
          </div>

          <div className="flex gap-3 w-full">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 py-3 rounded-lg bg-[#F5F6F8] text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 py-3 rounded-lg bg-[#0D1B2A] text-sm font-medium text-white hover:bg-[#162437] transition-colors disabled:opacity-60"
            >
              {loading ? 'Deleting…' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/** Solid red bin. Hand-rolled because the icon set only ships outline bins. */
function TrashGlyph() {
  return (
    <svg width="60" height="64" viewBox="0 0 60 64" fill="none" aria-hidden="true">
      <rect x="23" y="0" width="14" height="6" rx="3" fill="#EF4444" />
      <rect x="2" y="8" width="56" height="10" rx="5" fill="#EF4444" />
      <path
        d="M8 24a2 2 0 0 1 2-2h40a2 2 0 0 1 2 2v30a10 10 0 0 1-10 10H18A10 10 0 0 1 8 54V24Z"
        fill="#EF4444"
      />
      <rect x="20" y="32" width="4" height="22" rx="2" fill="#fff" fillOpacity="0.5" />
      <rect x="28" y="32" width="4" height="22" rx="2" fill="#fff" fillOpacity="0.5" />
      <rect x="36" y="32" width="4" height="22" rx="2" fill="#fff" fillOpacity="0.5" />
    </svg>
  );
}
