import React, { useState, useEffect, useCallback } from 'react';
import { Subject, CaptureListItem, CaptureFilter } from '../types';

interface ManagePageProps {
  subjects: Subject[];
  initialSubjectId: string;
  onBack: () => void;
}

const FILTERS: { value: CaptureFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'due', label: 'Due' },
  { value: 'new', label: 'New' },
  { value: 'learning', label: 'Learning' },
  { value: 'review', label: 'Review' },
];

const PAGE_SIZE = 50;

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatDueTime(dueAt: number, now: number): string {
  const diff = dueAt - now;
  
  // Already due
  if (diff <= 0) {
    return 'Now';
  }
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 60) {
    return `${minutes}m`;
  }
  if (hours < 24) {
    return `${hours}h`;
  }
  if (days === 1) {
    return 'Tomorrow';
  }
  return `${days}d`;
}

const badgeColors: Record<string, string> = {
  new: 'bg-green-500/15 text-green-500',
  learning: 'bg-yellow-500/15 text-yellow-500',
  review: 'bg-blue-500/15 text-blue-500',
  due: 'bg-red-500/15 text-red-500',
};

export function ManagePage({ subjects, initialSubjectId, onBack }: ManagePageProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState(initialSubjectId);
  const [filter, setFilter] = useState<CaptureFilter>('all');
  const [captures, setCaptures] = useState<CaptureListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [previewCapture, setPreviewCapture] = useState<CaptureListItem | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<CaptureListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);

  // Load captures
  const loadCaptures = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const newOffset = reset ? 0 : offset;
      const items = await window.hermie.manageListCaptures(
        selectedSubjectId,
        filter,
        PAGE_SIZE,
        newOffset
      );
      
      if (reset) {
        setCaptures(items);
        setOffset(0);
      } else {
        setCaptures(prev => [...prev, ...items]);
      }
      
      setHasMore(items.length === PAGE_SIZE);
    } catch (error) {
      console.error('Failed to load captures:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedSubjectId, filter, offset]);

  // Reset and reload when subject or filter changes
  useEffect(() => {
    setCaptures([]);
    setOffset(0);
    setImageUrls({});
    loadCaptures(true);
  }, [selectedSubjectId, filter]);

  // Load image URLs for visible captures
  useEffect(() => {
    const loadUrls = async () => {
      const newUrls: Record<string, string> = { ...imageUrls };
      let hasNew = false;
      
      for (const capture of captures) {
        if (!newUrls[capture.id]) {
          const url = await window.hermie.getImageUrl(capture.imagePath);
          if (url) {
            newUrls[capture.id] = url;
            hasNew = true;
          }
        }
      }
      
      if (hasNew) {
        setImageUrls(newUrls);
      }
    };
    
    loadUrls();
  }, [captures]);

  // Load preview image when preview opens
  useEffect(() => {
    if (previewCapture) {
      window.hermie.getImageUrl(previewCapture.imagePath).then(url => {
        setPreviewImageUrl(url);
      });
    } else {
      setPreviewImageUrl(null);
    }
  }, [previewCapture]);

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleLoadMore = () => {
    setOffset(prev => prev + PAGE_SIZE);
    loadCaptures();
  };

  const handleDelete = async (capture: CaptureListItem) => {
    setDeleting(true);
    try {
      const result = await window.hermie.manageDeleteCapture(capture.id);
      if (result.ok) {
        setCaptures(prev => prev.filter(c => c.id !== capture.id));
        setDeleteConfirm(null);
        setPreviewCapture(null);
        setToast('Capture deleted');
      } else {
        setToast(result.error || 'Failed to delete');
      }
    } catch (error) {
      setToast('Failed to delete capture');
    } finally {
      setDeleting(false);
    }
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (deleteConfirm) {
        setDeleteConfirm(null);
      } else if (previewCapture) {
        setPreviewCapture(null);
      } else {
        onBack();
      }
    }
  }, [deleteConfirm, previewCapture, onBack]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const now = Date.now();

  return (
    <div className="min-h-screen bg-neutral-950 p-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-400 text-sm hover:bg-neutral-800 hover:text-white hover:border-neutral-700 transition-all"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h1 className="text-xl font-semibold text-white">Manage Captures</h1>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        {/* Subject selector */}
        <select
          className="px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white text-sm min-w-[160px] cursor-pointer focus:outline-none focus:border-blue-500"
          value={selectedSubjectId}
          onChange={(e) => setSelectedSubjectId(e.target.value)}
        >
          {subjects.map(subject => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>

        {/* Filter pills */}
        <div className="flex gap-1.5">
          {FILTERS.map(f => (
            <button
              key={f.value}
              className={`px-3.5 py-1.5 rounded-full text-xs transition-all ${
                filter === f.value
                  ? 'bg-blue-500 text-white'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300'
              }`}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Capture grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3 flex-1">
        {loading && captures.length === 0 ? (
          // Skeleton loading
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-44 bg-neutral-900 rounded-lg animate-pulse"
            />
          ))
        ) : captures.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-neutral-500">
            <div className="text-5xl mb-4 opacity-50">📷</div>
            <p className="text-base text-neutral-400 mb-1">No captures yet</p>
            <span className="text-sm">Start study mode to capture screenshots</span>
          </div>
        ) : (
          captures.map(capture => (
            <div
              key={capture.id}
              className="relative h-44 flex flex-col bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden cursor-pointer hover:border-neutral-700 hover:-translate-y-0.5 transition-all group"
              onClick={() => setPreviewCapture(capture)}
            >
              <div className="flex-1 min-h-0 bg-neutral-950 overflow-hidden">
                {imageUrls[capture.id] ? (
                  <img
                    src={imageUrls[capture.id]}
                    alt="Capture"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 animate-pulse" />
                )}
              </div>
              <div className="px-2.5 py-1.5 border-t border-neutral-800">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-neutral-500">{formatDate(capture.createdAt)}</span>
                  <div className="flex gap-1">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium uppercase ${badgeColors[capture.state]}`}>
                      {capture.state}
                    </span>
                    {capture.dueAt <= now && (
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium uppercase ${badgeColors.due}`}>
                        due
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-neutral-600 mt-0.5">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  <span>Next: {formatDueTime(capture.dueAt, now)}</span>
                </div>
              </div>
              <button
                className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center bg-black/70 rounded text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteConfirm(capture);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Load more */}
      {hasMore && !loading && (
        <button
          onClick={handleLoadMore}
          className="block w-full max-w-[200px] mx-auto mt-6 px-5 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-400 text-sm hover:bg-neutral-800 hover:text-white transition-all"
        >
          Load more
        </button>
      )}

      {loading && captures.length > 0 && (
        <div className="text-center py-4 text-neutral-500 text-sm">Loading...</div>
      )}

      {/* Preview Modal */}
      {previewCapture && (
        <div
          className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 backdrop-blur-sm"
          onClick={() => setPreviewCapture(null)}
        >
          <div
            className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-[90vw] max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-neutral-800">
              <span className="text-sm font-medium text-white">{selectedSubject?.name}</span>
              <span className="text-xs text-neutral-500 flex-1">{formatDate(previewCapture.createdAt)}</span>
              <button
                className="w-8 h-8 flex items-center justify-center text-neutral-500 hover:bg-neutral-800 hover:text-white rounded-md transition-all"
                onClick={() => setPreviewCapture(null)}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center p-5 bg-neutral-950">
              {previewImageUrl ? (
                <img
                  src={previewImageUrl}
                  alt="Preview"
                  className="max-w-full max-h-[70vh] object-contain rounded-lg"
                />
              ) : (
                <div className="text-neutral-500 text-sm">Loading...</div>
              )}
            </div>
            <div className="flex items-center justify-between px-5 py-4 border-t border-neutral-800">
              <div className="flex gap-1.5">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${badgeColors[previewCapture.state]}`}>
                  {previewCapture.state}
                </span>
                {previewCapture.dueAt <= now && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${badgeColors.due}`}>
                    due
                  </span>
                )}
              </div>
              <button
                className="flex items-center gap-1.5 px-4 py-2 border border-red-500 rounded-lg text-red-500 text-sm hover:bg-red-500 hover:text-white transition-all"
                onClick={() => setDeleteConfirm(previewCapture)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 backdrop-blur-sm"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 max-w-[340px] text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-white mb-2">Delete capture?</h3>
            <p className="text-sm text-neutral-500 mb-5">This action cannot be undone.</p>
            <div className="flex gap-2.5">
              <button
                className="flex-1 py-2.5 px-4 bg-neutral-800 rounded-lg text-neutral-400 text-sm hover:bg-neutral-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="flex-1 py-2.5 px-4 bg-red-500 rounded-lg text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 bg-neutral-900 border border-neutral-800 rounded-lg text-white text-sm z-[200] animate-[slideUp_0.2s_ease]">
          {toast}
        </div>
      )}
    </div>
  );
}
