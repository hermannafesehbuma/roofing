'use client'

import { Check, X } from 'lucide-react'

/**
 * The app's single success dialog: gradient green tile, centred copy, one
 * full-width action. Used everywhere a create/update flow confirms.
 */
export function SuccessModal({
  title,
  subtitle,
  actionLabel = 'Okay',
  onAction,
  onClose,
}: {
  title: string
  subtitle: string
  actionLabel?: string
  /** Defaults to closing — pass to navigate somewhere instead. */
  onAction?: () => void
  onClose: () => void
}) {
  return (
    <>
      {/* Sits above every other overlay — a success dialog is always topmost. */}
      <div className="fixed inset-0 bg-black/40 z-[110] backdrop-blur-[1px]" onClick={onClose} />
      <div className="fixed inset-0 z-[111] flex items-center justify-center p-4 pointer-events-none">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md px-10 py-9 flex flex-col items-center text-center pointer-events-auto">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>

          <div className="w-[84px] h-[84px] rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/20">
            <Check size={44} className="text-white" strokeWidth={2.5} />
          </div>

          <h2 className="text-xl font-semibold text-gray-900 mb-2.5">{title}</h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-7 max-w-[300px]">{subtitle}</p>

          <button
            onClick={onAction ?? onClose}
            className="w-full py-3.5 bg-[#0D1B2A] text-white rounded-xl text-sm font-medium hover:bg-[#162437] transition-colors"
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </>
  )
}
