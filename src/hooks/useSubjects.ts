import { useState, useCallback, useEffect, useRef } from 'react';
import { Subject, Capture } from '../types';

export function useSubjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectIdState] = useState<string>('inbox');
  const selectedSubjectIdRef = useRef<string>(selectedSubjectId);
  const [isLoading, setIsLoading] = useState(true);

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId) || subjects[0];

  // Wrapper to keep ref in sync with state
  const setSelectedSubjectId = useCallback((id: string) => {
    selectedSubjectIdRef.current = id;
    setSelectedSubjectIdState(id);
  }, []);

  // Load subjects only once on mount (no dependencies on selectedSubjectId)
  const loadSubjects = useCallback(async () => {
    try {
      const list = await window.hermie.subjectsList();
      setSubjects(list);
      // Use ref to check current selection without creating dependency
      if (!list.find(s => s.id === selectedSubjectIdRef.current)) {
        setSelectedSubjectId('inbox');
      }
    } catch (error) {
      console.error('Failed to load subjects:', error);
    } finally {
      setIsLoading(false);
    }
  }, [setSelectedSubjectId]);

  // Load subjects on mount and subscribe to changes
  useEffect(() => {
    loadSubjects();
    
    // Subscribe to subjects:changed event from main process
    window.hermie.onSubjectsChanged(() => {
      loadSubjects();
    });
    
    // Cleanup: remove listener on unmount (though onSubjectsChanged already handles this)
    return () => {
      // The preload's onSubjectsChanged already removes listeners, but we can add explicit cleanup if needed
    };
  }, [loadSubjects]);

  const createSubject = async (name: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const result = await window.hermie.subjectsCreate(name);
      if ('error' in result) {
        return { ok: false, error: result.error };
      }
      setSubjects(prev => [...prev, result]);
      setSelectedSubjectId(result.id);
      return { ok: true };
    } catch (error) {
      console.error('Failed to create subject:', error);
      return { ok: false, error: 'Failed to create subject' };
    }
  };

  const deleteSubject = async (id: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const result = await window.hermie.subjectsDelete(id);
      if (result.ok) {
        setSubjects(prev => prev.filter(s => s.id !== id));
        // Use ref for current selection to avoid stale closure
        if (selectedSubjectIdRef.current === id) {
          setSelectedSubjectId('inbox');
        }
        return { ok: true };
      }
      return { ok: false, error: result.error || 'Failed to delete' };
    } catch (error) {
      console.error('Failed to delete subject:', error);
      return { ok: false, error: 'Failed to delete subject' };
    }
  };

  const cycleSubject = useCallback(() => {
    if (subjects.length === 0) return;
    const currentIndex = subjects.findIndex(s => s.id === selectedSubjectIdRef.current);
    const nextIndex = (currentIndex + 1) % subjects.length;
    setSelectedSubjectId(subjects[nextIndex].id);
  }, [subjects, setSelectedSubjectId]);

  return {
    subjects,
    selectedSubject,
    selectedSubjectId,
    selectedSubjectIdRef,
    setSelectedSubjectId,
    isLoading,
    createSubject,
    deleteSubject,
    cycleSubject,
    reload: loadSubjects,
  };
}

export function useCaptures(selectedSubjectId: string, isLoading: boolean) {
  const [captures, setCaptures] = useState<Capture[]>([]);

  const loadCaptures = useCallback(async () => {
    try {
      const list = await window.hermie.capturesLatestBySubject(selectedSubjectId, 10);
      setCaptures(list);
    } catch (error) {
      console.error('Failed to load captures:', error);
    }
  }, [selectedSubjectId]);

  useEffect(() => {
    if (!isLoading) {
      loadCaptures();
    }
  }, [selectedSubjectId, isLoading, loadCaptures]);

  return { captures, reload: loadCaptures };
}

// Hook to fetch due counts for all subjects
export function useDueCounts(subjects: Subject[]) {
  const [dueCounts, setDueCounts] = useState<Record<string, number>>({});
  
  // Store subjects in a ref to avoid dependency issues
  const subjectsRef = useRef<Subject[]>(subjects);
  subjectsRef.current = subjects;
  
  // Track previous subject IDs to detect actual changes
  const prevSubjectIdsRef = useRef<string>('');

  const loadDueCounts = useCallback(async () => {
    const currentSubjects = subjectsRef.current;
    if (currentSubjects.length === 0) return;
    
    try {
      const counts: Record<string, number> = {};
      // Fetch all due counts in parallel
      await Promise.all(
        currentSubjects.map(async (subject) => {
          const count = await window.hermie.reviewDueCount(subject.id);
          counts[subject.id] = count;
        })
      );
      setDueCounts(counts);
    } catch (error) {
      console.error('Failed to load due counts:', error);
    }
  }, []);

  // Reload only when subject IDs actually change
  useEffect(() => {
    const currentIds = subjects.map(s => s.id).join(',');
    if (currentIds !== prevSubjectIdsRef.current) {
      prevSubjectIdsRef.current = currentIds;
      loadDueCounts();
    }
  }, [subjects, loadDueCounts]);

  return { dueCounts, reload: loadDueCounts };
}

