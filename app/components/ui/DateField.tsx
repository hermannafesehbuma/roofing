'use client';

import React from 'react';
import { CalendarDays } from 'lucide-react';

interface DateFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Shown while empty, in place of the browser's own `yyyy-mm-dd` guide. */
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Date input with the app's calendar icon and a real placeholder.
 *
 * A native date input has no placeholder — it always renders `yyyy-mm-dd`. The
 * `date-empty` class blanks that guide text while the field is empty and
 * unfocused (see globals.css) so the word below can show through instead; focus
 * hands the native editor straight back.
 */
export function DateField({ value, onChange, placeholder = 'Select', className = '', disabled }: DateFieldProps) {
  const base =
    'w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-colors disabled:opacity-60';

  return (
    <div className="relative">
      <input
        type="date"
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
      <CalendarDays size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
    </div>
  );
}
