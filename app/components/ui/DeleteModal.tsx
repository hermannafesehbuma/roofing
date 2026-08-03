'use client';

import React from 'react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  projectName: string;
}

/** Project-flavoured wrapper over the app-wide {@link ConfirmDeleteModal}. */
export function DeleteModal({ isOpen, onClose, onConfirm, projectName }: DeleteModalProps) {
  if (!isOpen) return null;

  return (
    <ConfirmDeleteModal
      title="Delete Project"
      message={`Deleting this project (${projectName}) will remove all associated data permanently.`}
      onCancel={onClose}
      onConfirm={onConfirm}
    />
  );
}
