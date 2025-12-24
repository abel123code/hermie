import { useState, useEffect, useRef, useCallback } from 'react';
import { UndoBubble } from '../types';

export function useStudyMode(
  selectedSubjectIdRef: React.RefObject<string>,
  onCaptureComplete: () => void
) {
  const [studyMode, setStudyMode] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [undoBubble, setUndoBubble] = useState<UndoBubble | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Store onCaptureComplete in a ref to avoid stale closures
  const onCaptureCompleteRef = useRef(onCaptureComplete);
  onCaptureCompleteRef.current = onCaptureComplete;

  // Stable capture function that uses refs
  const handleCapture = useCallback(async () => {
    const result = await window.hermie.capture(selectedSubjectIdRef.current || 'inbox');
    if (result) {
      console.log('Capture result:', result);
      onCaptureCompleteRef.current();
    }
  }, [selectedSubjectIdRef]);
  
  // Store handleCapture in a ref for the effect to use
  const handleCaptureRef = useRef(handleCapture);
  handleCaptureRef.current = handleCapture;

  useEffect(() => {
    window.hermie.getStudyMode().then(setStudyMode);

    window.hermie.onStudyModeChanged(setStudyMode);

    window.hermie.onToast((message) => {
      setToast(message);
      setTimeout(() => setToast(null), 2000);
    });

    window.hermie.onCaptureSaved((payload) => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }

      const seconds = Math.ceil(payload.expiresInMs / 1000);
      setUndoBubble({ id: payload.id, countdown: seconds, status: 'active' });

      countdownRef.current = setInterval(() => {
        setUndoBubble((prev) => {
          if (!prev || prev.status !== 'active') return prev;
          if (prev.countdown <= 1) {
            clearInterval(countdownRef.current!);
            return null;
          }
          return { ...prev, countdown: prev.countdown - 1 };
        });
      }, 1000);
    });

    window.hermie.onCaptureTrigger(() => {
      // Use ref to get the latest handleCapture
      handleCaptureRef.current();
    });

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, []);

  const toggleStudyMode = async () => {
    await window.hermie.toggleStudyMode();
  };

  const handleUndo = async () => {
    if (!undoBubble || undoBubble.status !== 'active') return;

    const result = await window.hermie.undoCapture(undoBubble.id);

    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }

    if (result.ok) {
      setUndoBubble({ ...undoBubble, status: 'undone' });
      setTimeout(() => setUndoBubble(null), 1000);
      onCaptureCompleteRef.current();
    } else {
      setUndoBubble({ ...undoBubble, status: 'too-late' });
      setTimeout(() => setUndoBubble(null), 1000);
    }
  };

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  return {
    studyMode,
    toast,
    undoBubble,
    toggleStudyMode,
    handleCapture,
    handleUndo,
    showToast,
  };
}

