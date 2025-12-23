import React from 'react';
import { Subject } from '../types';

interface DeleteModalProps {
  subject: Subject;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteModal({ subject, onConfirm, onCancel }: DeleteModalProps) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-medium text-white mb-2">Delete Subject</h3>
        <p className="text-sm text-neutral-400 mb-4">
          Are you sure you want to delete "{subject.name}"?
          This will also delete all captures in this subject.
        </p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="modal-btn-cancel">
            Cancel
          </button>
          <button onClick={onConfirm} className="modal-btn-delete">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

