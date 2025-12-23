import React, { useState, useRef, useEffect } from 'react';
import { OverlayPill } from './OverlayPill';
import { OverlayPanel } from './OverlayPanel';

interface Subject {
  id: string;
  name: string;
  createdAt: number;
}

interface UndoBubble {
  id: string;
  countdown: number;
  status: 'active' | 'undone' | 'too-late';
}

interface StudyOverlayProps {
  subjects: Subject[];
  selectedSubjectId: string;
  onSelectSubject: (id: string) => void;
  onCycleSubject: () => void;
  onCapture: () => void;
  undoBubble: UndoBubble | null;
  onUndo: () => void;
  toast: string | null;
}

export function StudyOverlay({
  subjects,
  selectedSubjectId,
  onSelectSubject,
  onCycleSubject,
  onCapture,
  undoBubble,
  onUndo,
  toast,
}: StudyOverlayProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId) || subjects[0];
  const subjectName = selectedSubject?.name || 'Inbox';

  // Close panel on outside click
  useEffect(() => {
    if (!isPanelOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsPanelOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPanelOpen]);

  const togglePanel = () => setIsPanelOpen(!isPanelOpen);

  return (
    <div className="w-full h-full flex items-center justify-end bg-transparent p-4">
      <div className="flex items-center gap-2" ref={containerRef}>
        {/* Slide-out panel (left of pill) */}
        <OverlayPanel
          subjects={subjects}
          selectedSubjectId={selectedSubjectId}
          onSelectSubject={onSelectSubject}
          isOpen={isPanelOpen}
        />

        {/* Main pill (right side) */}
        <OverlayPill
          subjectName={subjectName}
          onCapture={onCapture}
          onCycleSubject={onCycleSubject}
          onTogglePanel={togglePanel}
          isPanelOpen={isPanelOpen}
          undoBubble={undoBubble}
          onUndo={onUndo}
        />
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-sm text-white px-3.5 py-1.5 rounded-lg text-[11px] whitespace-nowrap animate-fade-in-up">
          {toast}
        </div>
      )}
    </div>
  );
}
