'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ChevronDown } from 'lucide-react';

export interface SearchableOption {
  id: string;
  label: string;
  /** Optional second line under the label. */
  sublabel?: string;
  /** Photo URL; falls back to initials on a tinted disc. */
  avatarUrl?: string | null;
}

interface SearchableSelectProps {
  options: SearchableOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  /** Hides the avatar column for non-people lists. */
  showAvatars?: boolean;
  disabled?: boolean;
}

const AVATAR_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#6366F1', '#EC4899'];

function avatarColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function initials(label: string) {
  return label
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Picker with a search field and a radio list — the pattern the invoice form
 * uses for Client and Project. A native `<select>` cannot show avatars or be
 * filtered, which is what the design calls for.
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select',
  searchPlaceholder = 'Search',
  showAvatars = true,
  disabled = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const selected = options.find((o) => o.id === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || (o.sublabel ?? '').toLowerCase().includes(q)
    );
  }, [options, query]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => { setOpen((v) => !v); setQuery(''); }}
        className="w-full flex items-center justify-between gap-2 border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white text-left transition-colors hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 disabled:opacity-60"
      >
        <span className={`truncate ${selected ? 'text-gray-800' : 'text-gray-400'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={14} className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 bg-white rounded-2xl shadow-[0_8px_30px_rgba(16,24,40,0.14)] border border-gray-100 p-3">
          <div className="relative mb-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-gray-300"
            />
          </div>

          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="py-6 text-center text-xs text-gray-400">No matches.</p>
            )}
            {filtered.map((option, i) => {
              const active = option.id === value;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => { onChange(option.id); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-1 py-3 text-left transition-colors hover:bg-gray-50 ${
                    i < filtered.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  {showAvatars && (
                    <span
                      className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-[11px] font-semibold overflow-hidden bg-cover bg-center"
                      style={
                        option.avatarUrl
                          ? { backgroundImage: `url(${option.avatarUrl})` }
                          : { backgroundColor: avatarColor(option.id) }
                      }
                    >
                      {!option.avatarUrl && initials(option.label)}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-gray-900 truncate">{option.label}</span>
                    {option.sublabel && (
                      <span className="block text-xs text-gray-400 truncate">{option.sublabel}</span>
                    )}
                  </span>
                  <span
                    className={`w-4 h-4 rounded-full border shrink-0 flex items-center justify-center ${
                      active ? 'border-[#0D1B2A]' : 'border-gray-300'
                    }`}
                  >
                    {active && <span className="w-2 h-2 rounded-full bg-[#0D1B2A] block" />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
