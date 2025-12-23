import React from 'react';

interface OverlayPillProps {
  subjectName: string;
  onCapture: () => void;
  onCycleSubject: () => void;
  onTogglePanel: () => void;
  isPanelOpen: boolean;
  undoBubble: {
    id: string;
    countdown: number;
    status: 'active' | 'undone' | 'too-late';
  } | null;
  onUndo: () => void;
}

export function OverlayPill({
  subjectName,
  onCapture,
  onCycleSubject,
  onTogglePanel,
  isPanelOpen,
  undoBubble,
  onUndo,
}: OverlayPillProps) {
  const truncatedName = subjectName.length > 8 
    ? subjectName.slice(0, 8) + '…' 
    : subjectName;

  return (
    <div className="w-[84px] h-[200px] bg-neutral-900/50 backdrop-blur-xl border border-white/[0.18] rounded-full flex flex-col items-center justify-center gap-3 shadow-[0_8px_32px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.08)] relative shrink-0">
      {/* Handle to toggle panel */}
      <button
        onClick={onTogglePanel}
        className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-4 h-10 bg-white/[0.08] border border-white/[0.12] rounded-l-lg flex items-center justify-center cursor-pointer text-white/50 transition-all duration-200 hover:bg-white/[0.15] hover:text-white/80"
        title={isPanelOpen ? 'Close panel' : 'Open panel'}
      >
        <svg 
          width="8" 
          height="16" 
          viewBox="0 0 8 16" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="1.5"
          className={`transition-transform duration-200 ${isPanelOpen ? 'rotate-180' : ''}`}
        >
          <path d="M6 2L2 8L6 14" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Subject name */}
      <button
        onClick={onCycleSubject}
        className="text-[11px] uppercase tracking-wider text-white/70 bg-transparent border-none cursor-pointer px-2 py-1 rounded transition-all duration-150 max-w-[72px] overflow-hidden text-ellipsis whitespace-nowrap hover:text-white/95 hover:bg-white/[0.08]"
        title="Click to switch subject"
      >
        {truncatedName}
      </button>

      {/* Scissors button */}
      <button
        onClick={onCapture}
        className="w-14 h-14 rounded-full bg-white/[0.08] border border-white/[0.18] text-white/85 flex items-center justify-center cursor-pointer transition-all duration-200 hover:bg-white/[0.18] hover:scale-[1.03] hover:border-white/30 hover:text-white active:scale-[0.97]"
        title="Capture Screenshot (Alt+X)"
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="6" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <line x1="20" y1="4" x2="8.12" y2="15.88" />
          <line x1="14.47" y1="14.48" x2="20" y2="20" />
          <line x1="8.12" y1="8.12" x2="12" y2="12" />
        </svg>
      </button>

      {/* Undo section */}
      {undoBubble && (
        <div className="flex flex-col items-center gap-1">
          {undoBubble.status === 'active' && (
            <>
              <button 
                onClick={onUndo} 
                className="w-7 h-7 rounded-full bg-white/10 border border-white/15 text-white/80 flex items-center justify-center cursor-pointer transition-all duration-150 hover:bg-white/20 hover:text-white"
                title="Undo"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7v6h6" />
                  <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                </svg>
              </button>
              <span className="text-[10px] text-white/50">{undoBubble.countdown}s</span>
            </>
          )}
          {undoBubble.status === 'undone' && (
            <span className="text-sm text-white/70">✓</span>
          )}
          {undoBubble.status === 'too-late' && (
            <span className="text-sm text-white/70">✗</span>
          )}
        </div>
      )}
    </div>
  );
}
