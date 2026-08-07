'use client';

import React from 'react';
import { Clock } from 'lucide-react';

interface TimeFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Shown while empty, in place of the browser's own `--:-- --` guide. */
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Time input with the app's clock affordance.
 *
 * globals.css hides the native picker indicator so date fields can show a lucide
 * icon instead — which left time fields with no visible way to open the picker
 * at all. The hidden indicator's hit area still spans the right edge, so the
 * clock below sits directly over it and clicking opens the browser's time
 * picker; typing continues to work.
 */
export function TimeField({ value, onChange, placeholder = 'Select', className = '', disabled }: TimeFieldProps) {
  const base =
    'w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-colors disabled:opacity-60';

  return (
    <div className="relative">
      <input
        type="time"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`peer ${base} ${value ? '' : 'date-empty'} ${className}`}
      />
      {!value && (
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 peer-focus:hidden">
          {placeholder}
        </span>
      )}
      <Clock size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
    </div>
  );
}
