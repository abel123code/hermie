import React, { useEffect, useState } from 'react';

interface Subject {
  id: string;
  name: string;
  createdAt: number;
}

interface Capture {
  id: string;
  subjectId: string;
  imagePath: string;
  createdAt: number;
}

interface OverlayPanelProps {
  subjects: Subject[];
  selectedSubjectId: string;
  onSelectSubject: (id: string) => void;
  isOpen: boolean;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function OverlayPanel({ subjects, selectedSubjectId, onSelectSubject, isOpen }: OverlayPanelProps) {
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      window.hermie.capturesLatestBySubject(selectedSubjectId, 3)
        .then(setCaptures)
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, selectedSubjectId]);

  if (!isOpen) return null;

  return (
    <div className="w-[260px] bg-neutral-900/95 backdrop-blur-2xl border border-white/12 rounded-5xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] animate-slide-in">
      {/* Header */}
      <div className="mb-3">
        <span className="text-[13px] font-semibold text-white/90 tracking-wide">Study Mode</span>
      </div>

      {/* Subject selector */}
      <div className="mb-2">
        <span className="block text-[10px] uppercase tracking-widest text-white/50 mb-1">Subject</span>
        <div className="flex flex-col gap-0.5 max-h-[120px] overflow-y-auto mt-1.5 scrollbar-thin">
          {subjects.map((subject) => (
            <button
              key={subject.id}
              onClick={() => onSelectSubject(subject.id)}
              className={`flex items-center justify-between w-full px-2.5 py-1.5 bg-transparent border-none rounded-md cursor-pointer transition-all duration-150 text-left
                ${selectedSubjectId === subject.id 
                  ? 'bg-white/12' 
                  : 'hover:bg-white/8'
                }`}
            >
              <span className={`text-xs overflow-hidden text-ellipsis whitespace-nowrap max-w-[180px] ${
                selectedSubjectId === subject.id ? 'text-white/95' : 'text-white/80'
              }`}>
                {subject.name}
              </span>
              {selectedSubjectId === subject.id && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white/70 shrink-0">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-white/10 my-3" />

      {/* Recent captures */}
      <div className="mb-2">
        <span className="block text-[10px] uppercase tracking-widest text-white/50 mb-1">Latest Captures</span>
        {isLoading ? (
          <span className="block text-xs text-white/40 italic">Loading...</span>
        ) : captures.length === 0 ? (
          <span className="block text-xs text-white/40 italic">No captures yet</span>
        ) : (
          <div className="flex flex-col gap-1.5">
            {captures.map((capture) => (
              <div key={capture.id} className="flex items-center justify-between text-[11px] py-1">
                <span className="text-white/70 font-mono">{capture.id.slice(0, 6)}…</span>
                <span className="text-white/50">{formatRelativeTime(capture.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-white/10 my-3" />

      {/* Action rows */}
      <div className="mt-1">
        <button 
          className="flex items-center gap-2 w-full px-2.5 py-2 bg-transparent border-none rounded-lg text-white/60 text-xs cursor-pointer transition-all duration-150 hover:bg-white/8 hover:text-white/90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24" />
          </svg>
          <span>Settings</span>
          <span className="ml-auto text-[9px] uppercase tracking-wider text-white/35 bg-white/8 px-1.5 py-0.5 rounded">Soon</span>
        </button>
      </div>
    </div>
  );
}
