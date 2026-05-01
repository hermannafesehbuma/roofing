'use client';

import React from 'react';
import { Trash2 } from 'lucide-react';

interface TaskDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  taskName: string;
}

export function TaskDeleteModal({ isOpen, onClose, onConfirm, taskName }: TaskDeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
        
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-red-100 rounded-full scale-150 animate-pulse"></div>
          <div className="relative bg-red-100 p-4 rounded-full">
            <Trash2 className="w-10 h-10 text-red-600" />
          </div>
          <div className="absolute -top-1 -right-2 w-2 h-2 bg-red-400 rounded-full"></div>
          <div className="absolute -bottom-2 -left-1 w-3 h-3 bg-red-200 rounded-full"></div>
          <div className="absolute top-2 -left-4 w-1.5 h-1.5 bg-red-300 rounded-full"></div>
        </div>

        <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Task</h3>
        <p className="text-gray-500 text-sm mb-8">
          You&apos;re about to permanently delete this task ({taskName}). This action cannot be reversed.
        </p>

        <div className="flex w-full gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-[#0A1629] text-white font-medium rounded-xl hover:bg-[#152844] transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
