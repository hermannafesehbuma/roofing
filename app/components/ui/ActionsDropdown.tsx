'use client';

import React, { useEffect, useRef } from 'react';
import { Eye, PenLine, Trash2, MoreHorizontal } from 'lucide-react';

interface ActionsDropdownProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ActionsDropdown({ onView, onEdit, onDelete }: ActionsDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
      >
        <MoreHorizontal className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-[215px] bg-white rounded-2xl shadow-[0_8px_30px_rgba(16,24,40,0.14)] p-1.5 z-50">
          {onView && (
            <button
              className="w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-[15px] text-[#1D2939] hover:bg-[#F2F4F7] transition-colors"
              onClick={() => { setIsOpen(false); onView(); }}
            >
              <Eye size={19} className="text-[#1D2939] shrink-0" strokeWidth={1.6} /> View Detail
            </button>
          )}
          <button
            className="w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-[15px] text-[#1D2939] hover:bg-[#F2F4F7] transition-colors"
            onClick={() => { setIsOpen(false); onEdit?.(); }}
          >
            <PenLine size={19} className="text-[#1D2939] shrink-0" strokeWidth={1.6} /> Edit
          </button>
          <button
            className="w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-[15px] text-[#1D2939] hover:bg-[#F2F4F7] transition-colors"
            onClick={() => { setIsOpen(false); onDelete?.(); }}
          >
            <Trash2 size={19} className="text-[#F04438] shrink-0" strokeWidth={1.6} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
