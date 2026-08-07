'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye, PenLine, Trash2, MoreHorizontal } from 'lucide-react';

export interface ActionsDropdownItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  /** Renders the row in red — reserved for destructive actions. */
  danger?: boolean;
  /** Draws a divider above this row. */
  separated?: boolean;
}

interface ActionsDropdownProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  /** Overrides the default View / Edit / Delete rows. */
  items?: ActionsDropdownItem[];
}

const MENU_WIDTH = 215;
const ROW_HEIGHT = 46;
const MENU_PADDING = 12;
const GAP = 8;
const VIEWPORT_MARGIN = 8;

export function ActionsDropdown({ onView, onEdit, onDelete, items }: ActionsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  /**
   * The menu renders in a portal on the body rather than beside the trigger.
   * List views wrap their tables in `overflow-hidden` / `overflow-x-auto`, which
   * clips an absolutely positioned child — the menu used to be cut off inside
   * the table instead of floating above it.
   */
  function openMenu() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const menuHeight = rows.length * ROW_HEIGHT + MENU_PADDING;
    const flipUp = rect.bottom + GAP + menuHeight > window.innerHeight;
    const left = Math.min(
      Math.max(VIEWPORT_MARGIN, rect.right - MENU_WIDTH),
      window.innerWidth - MENU_WIDTH - VIEWPORT_MARGIN
    );

    setCoords({ top: flipUp ? rect.top - GAP - menuHeight : rect.bottom + GAP, left });
    setIsOpen(true);
  }

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setIsOpen(false);
    }
    // Detached from the trigger, so the menu cannot follow a scrolling row —
    // close instead of letting it hang in the wrong place.
    function close() {
      setIsOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const itemCls =
    'w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-[15px] hover:bg-[#F2F4F7] transition-colors';

  // Default rows keep every existing call site working unchanged.
  const rows: ActionsDropdownItem[] = items ?? [
    ...(onView ? [{ label: 'View Detail', icon: <Eye size={19} className="shrink-0" strokeWidth={1.6} />, onClick: onView }] : []),
    { label: 'Edit', icon: <PenLine size={19} className="shrink-0" strokeWidth={1.6} />, onClick: () => onEdit?.() },
    { label: 'Delete', icon: <Trash2 size={19} className="shrink-0" strokeWidth={1.6} />, onClick: () => onDelete?.(), danger: true },
  ];

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => (isOpen ? setIsOpen(false) : openMenu())}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
      >
        <MoreHorizontal className="w-5 h-5" />
      </button>

      {isOpen && coords && createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{ position: 'fixed', top: coords.top, left: coords.left, width: MENU_WIDTH }}
          className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(16,24,40,0.14)] p-1.5 z-[300]"
        >
          {rows.map((row, i) => (
            <React.Fragment key={row.label}>
              {row.separated && i > 0 && <div className="border-t border-gray-100 my-1" />}
              <button
                className={`${itemCls} ${row.danger ? 'text-[#F04438]' : 'text-[#1D2939]'}`}
                onClick={() => { setIsOpen(false); row.onClick(); }}
              >
                {row.icon} {row.label}
              </button>
            </React.Fragment>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
