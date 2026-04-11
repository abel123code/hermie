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
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 400, color: 'var(--ink)', marginBottom: '8px' }}>
          Delete subject?
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink-secondary)', marginBottom: '24px', lineHeight: 1.5 }}>
          "{subject.name}" and all its captures will be permanently removed.
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
