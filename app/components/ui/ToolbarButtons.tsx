'use client';

import React from 'react';
import { ListFilter, Download, Loader2 } from 'lucide-react';

/**
 * The toolbar controls every list screen shares.
 *
 * Filter and Import/Export used to be hand-rolled per screen — five different
 * icons, three border treatments, and count badges that only some pages had.
 * These are the single definition; the Projects toolbar was the reference.
 */

const BASE =
  'flex items-center gap-2 px-5 py-2.5 border rounded-lg text-xs transition-colors disabled:opacity-60';
const RESTING = 'border-gray-200 text-gray-600 hover:bg-gray-50';
const ACTIVE = 'border-gray-300 bg-gray-50 text-gray-800';

interface FilterButtonProps {
  onClick: () => void;
  /** Popover open, or filters currently applied — both keep the button lit. */
  active?: boolean;
  /** Number of applied filters; shown as a badge when above zero. */
  count?: number;
  className?: string;
}

export function FilterButton({ onClick, active = false, count = 0, className = '' }: FilterButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Filter"
      className={`${BASE} ${active || count > 0 ? ACTIVE : RESTING} ${className}`}
    >
      <ListFilter size={13} /> Filter
      {count > 0 && (
        <span className="ml-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#0D1B2A] text-white text-[10px] font-semibold flex items-center justify-center">
          {count}
        </span>
      )}
    </button>
  );
}

interface ImportExportButtonProps {
  onClick: () => void;
  /** Menu open — keeps the button lit while its dropdown shows. */
  active?: boolean;
  /** Swaps the icon for a spinner during an import. */
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export function ImportExportButton({
  onClick,
  active = false,
  loading = false,
  disabled = false,
  className = '',
}: ImportExportButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`${BASE} ${active ? ACTIVE : RESTING} ${className}`}
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
      Import/Export
    </button>
  );
}

/**
 * Selectable option chip inside a filter overlay — pill shaped, so it reads as
 * a toggle rather than a button.
 */
export function filterChipCls(active: boolean) {
  return `px-6 py-3 rounded-full text-sm font-medium border whitespace-nowrap transition-colors ${
    active
      ? 'bg-[#0D1B2A] text-white border-[#0D1B2A]'
      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
  }`;
}
