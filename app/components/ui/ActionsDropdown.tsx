'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye, PenLine, Trash2, MoreHorizontal } from 'lucide-react';

interface ActionsDropdownProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const MENU_WIDTH = 215;
/** Roughly the tallest the menu gets (three rows) — used to decide flip-up. */
const MENU_MAX_HEIGHT = 170;
const GAP = 8;
const VIEWPORT_MARGIN = 8;

export function ActionsDropdown({ onView, onEdit, onDelete }: ActionsDropdownProps) {
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

    const flipUp = rect.bottom + GAP + MENU_MAX_HEIGHT > window.innerHeight;
    const left = Math.min(
      Math.max(VIEWPORT_MARGIN, rect.right - MENU_WIDTH),
      window.innerWidth - MENU_WIDTH - VIEWPORT_MARGIN
    );

    setCoords({ top: flipUp ? rect.top - GAP - MENU_MAX_HEIGHT : rect.bottom + GAP, left });
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
    'w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-[15px] text-[#1D2939] hover:bg-[#F2F4F7] transition-colors';

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
          {onView && (
            <button className={itemCls} onClick={() => { setIsOpen(false); onView(); }}>
              <Eye size={19} className="text-[#1D2939] shrink-0" strokeWidth={1.6} /> View Detail
            </button>
          )}
          <button className={itemCls} onClick={() => { setIsOpen(false); onEdit?.(); }}>
            <PenLine size={19} className="text-[#1D2939] shrink-0" strokeWidth={1.6} /> Edit
          </button>
          <button className={itemCls} onClick={() => { setIsOpen(false); onDelete?.(); }}>
            <Trash2 size={19} className="text-[#F04438] shrink-0" strokeWidth={1.6} /> Delete
          </button>
        </div>,
        document.body
      )}
    </>
  );
}
