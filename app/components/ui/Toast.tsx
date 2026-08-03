'use client';

import React from 'react';
import { Check, AlertCircle } from 'lucide-react';

interface ToastProps {
  message: string;
  variant?: 'success' | 'error';
}

/**
 * App-wide confirmation banner — green pill, centred near the top of the page.
 *
 * Fixed to the viewport rather than the content column on purpose: with the
 * 224px sidebar, viewport-centring is what lands it where the design puts it.
 * `top-[120px]` clears the page header so it sits over the first row of cards.
 */
export function Toast({ message, variant = 'success' }: ToastProps) {
  const isError = variant === 'error';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-20 md:top-[120px] left-1/2 -translate-x-1/2 z-[200] rounded-xl px-5 py-3.5 flex items-center gap-3 shadow-lg animate-in fade-in slide-in-from-top-4 duration-300 ${
        isError ? 'bg-[#FDECEC] border border-[#F5C2C2]' : 'bg-[#E3F8EC] border border-[#BFEBD3]'
      }`}
    >
      <span
        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
          isError ? 'bg-[#D32F2F]' : 'bg-[#2E9E5B]'
        }`}
      >
        {isError ? (
          <AlertCircle size={12} className="text-white" strokeWidth={3} />
        ) : (
          <Check size={12} className="text-white" strokeWidth={3} />
        )}
      </span>
      <span className={`text-sm font-semibold ${isError ? 'text-[#8E1F1F]' : 'text-[#14532D]'}`}>
        {message}
      </span>
    </div>
  );
}
