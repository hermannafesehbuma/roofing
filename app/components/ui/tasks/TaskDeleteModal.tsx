'use client';

import React from 'react';
import { ConfirmDeleteModal } from '@/app/components/ui/ConfirmDeleteModal';

interface TaskDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  taskName: string;
}

/** Task-flavoured wrapper over the app-wide {@link ConfirmDeleteModal}. */
export function TaskDeleteModal({ isOpen, onClose, onConfirm, taskName }: TaskDeleteModalProps) {
  if (!isOpen) return null;

  return (
    <ConfirmDeleteModal
      title="Delete Task"
      message={`Deleting this task (${taskName}) will remove all associated data permanently.`}
      onCancel={onClose}
      onConfirm={onConfirm}
    />
  );
}
