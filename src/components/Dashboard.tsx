import React, { useState } from 'react';
import { Subject, Capture } from '../types';
import { DeleteModal } from './DeleteModal';
import hermieLogo from '../../assets/hermie-logo.png';

interface DashboardProps {
  subjects: Subject[];
  selectedSubjectId: string;
  onSelectSubject: (id: string) => void;
  onCreateSubject: (name: string) => Promise<{ ok: boolean; error?: string }>;
  onDeleteSubject: (id: string) => Promise<{ ok: boolean; error?: string }>;
  onToggleStudyMode: () => void;
  onStartReview: (subjectId: string) => void;
  onOpenManage: () => void;
  dueCounts: Record<string, number>;
  captures: Capture[];
  toast: string | null;
  onShowToast: (message: string) => void;
}

export function Dashboard({
  subjects,
  selectedSubjectId,
  onSelectSubject,
  onCreateSubject,
  onDeleteSubject,
  onToggleStudyMode,
  onStartReview,
  onOpenManage,
  dueCounts,
  captures,
  toast,
  onShowToast,
}: DashboardProps) {
  const [newSubjectName, setNewSubjectName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<Subject | null>(null);

  const handleCreate = async () => {
    const name = newSubjectName.trim();
    if (!name) return;

    setCreateError(null);
    const result = await onCreateSubject(name);

    if (result.ok) {
      setNewSubjectName('');
    } else {
      setCreateError(result.error || 'Failed to create');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreate();
  };

  const handleDeleteClick = (e: React.MouseEvent, subject: Subject) => {
    e.stopPropagation();
    if (subject.id === 'inbox') return;
    setDeleteModal(subject);
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal) return;
    const result = await onDeleteSubject(deleteModal.id);
    if (!result.ok) {
      onShowToast(result.error || 'Failed to delete');
    }
    setDeleteModal(null);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleReviewClick = (e: React.MouseEvent, subjectId: string) => {
    e.stopPropagation();
    const count = dueCounts[subjectId] || 0;
    if (count > 0) {
      onStartReview(subjectId);
    }
  };

  return (
    <div className="dashboard">
      {/* Delete Modal */}
      {deleteModal && (
        <DeleteModal
          subject={deleteModal}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteModal(null)}
        />
      )}

      {/* Content */}
      <div className="dashboard-content">
        {/* Header */}
        <div className="flex items-center justify-between w-full max-w-md mb-6">
          <div className="flex items-center gap-3">
            <img 
              src={hermieLogo} 
              alt="Hermie" 
              className="w-10 h-10 rounded-xl object-cover"
            />
            <div>
              <h1 className="text-xl font-semibold text-white">Hermie</h1>
              <span className="text-xs text-neutral-600">v1.0</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={onOpenManage} 
              className="flex items-center gap-1.5 px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-400 text-sm hover:bg-neutral-800 hover:text-white hover:border-neutral-700 transition-all"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
              Manage
            </button>
            <button onClick={onToggleStudyMode} className="study-btn-compact">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Study
            </button>
          </div>
        </div>

        {/* Subjects Panel */}
        <div className="subjects-panel">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-neutral-300">Subjects</h2>
            <span className="text-xs text-neutral-500">{subjects.length}</span>
          </div>

          {/* Create input */}
          <div className="flex flex-col gap-2 mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newSubjectName}
                onChange={(e) => {
                  setNewSubjectName(e.target.value);
                  setCreateError(null);
                }}
                onKeyDown={handleKeyDown}
                placeholder="New subject…"
                className={`subject-input ${createError ? 'error' : ''}`}
              />
              <button
                onClick={handleCreate}
                disabled={!newSubjectName.trim()}
                className="subject-add-btn"
              >
                Add
              </button>
            </div>
            {createError && <span className="text-xs text-red-400">{createError}</span>}
          </div>

          {/* Subject list */}
          <div className="subject-list">
            {subjects.map((subject) => {
              const dueCount = dueCounts[subject.id] || 0;
              return (
                <div
                  key={subject.id}
                  onClick={() => onSelectSubject(subject.id)}
                  className={`subject-row ${selectedSubjectId === subject.id ? 'selected' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-neutral-200">{subject.name}</span>
                    {subject.id === 'inbox' && (
                      <span className="text-xs text-neutral-500">Default</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Review button */}
                    <button
                      onClick={(e) => handleReviewClick(e, subject.id)}
                      disabled={dueCount === 0}
                      className="subject-review-btn"
                      title={dueCount > 0 ? `Review ${dueCount} cards` : 'No cards due'}
                    >
                      Review{dueCount > 0 && ` (${dueCount})`}
                    </button>
                    {subject.id !== 'inbox' && (
                      <button
                        onClick={(e) => handleDeleteClick(e, subject)}
                        className="subject-delete-btn"
                        title="Delete subject"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    )}
                    {selectedSubjectId === subject.id && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Captures Panel */}
        <div className="captures-panel">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-neutral-300">Recent Captures</h2>
            <span className="text-xs text-neutral-500">{captures.length}</span>
          </div>

          {captures.length === 0 ? (
            <p className="text-xs text-neutral-600">No captures yet</p>
          ) : (
            <div className="captures-list">
              {captures.map((capture) => (
                <div key={capture.id} className="capture-row">
                  <span className="text-xs text-neutral-400 font-mono">
                    {capture.id.slice(0, 8)}…
                  </span>
                  <span className="text-xs text-neutral-500">
                    {formatTime(capture.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Keyboard hint */}
        <p className="hint-text mt-4">
          <kbd>Alt</kbd>
          <span className="hint-plus">+</span>
          <kbd>S</kbd>
          <span className="text-neutral-500 ml-2">to toggle Study Mode</span>
        </p>
      </div>

      {/* Toast */}
      {toast && <div className="toast toast-normal">{toast}</div>}
    </div>
  );
}

