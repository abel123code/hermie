import React, { useState, useCallback, useRef } from 'react';
import { StudyOverlay } from './components/StudyOverlay';
import { Dashboard } from './components/Dashboard';
import { ReviewScreen } from './components/ReviewScreen';
import { ManagePage } from './components/ManagePage';
import { useSubjects, useCaptures, useDueCounts } from './hooks/useSubjects';
import { useStudyMode } from './hooks/useStudyMode';
import { useGameStats } from './hooks/useGameStats';

type View = 'dashboard' | 'review' | 'manage';

function App() {
  // View state
  const [view, setView] = useState<View>('dashboard');
  const [reviewSubjectId, setReviewSubjectId] = useState<string>('inbox');

  // Subjects & captures
  const {
    subjects,
    selectedSubjectId,
    selectedSubjectIdRef,
    setSelectedSubjectId,
    isLoading,
    createSubject,
    deleteSubject,
    cycleSubject,
  } = useSubjects();

  const { captures, reload: reloadCaptures } = useCaptures(selectedSubjectId, isLoading);
  const { dueCounts, reload: reloadDueCounts } = useDueCounts(subjects);
  const { stats, level, reload: reloadStats } = useGameStats();

  // Store reload functions in refs to avoid dependency issues
  const reloadDueCountsRef = useRef(reloadDueCounts);
  reloadDueCountsRef.current = reloadDueCounts;

  const reloadCapturesRef = useRef(reloadCaptures);
  reloadCapturesRef.current = reloadCaptures;

  const reloadStatsRef = useRef(reloadStats);
  reloadStatsRef.current = reloadStats;

  // Study mode & capture handling
  const {
    studyMode,
    toast,
    undoBubble,
    toggleStudyMode,
    handleCapture,
    handleUndo,
    showToast,
  } = useStudyMode(selectedSubjectIdRef, useCallback(() => {
    reloadCapturesRef.current();
    reloadStatsRef.current();
  }, []));

  // Start review for a subject
  const handleStartReview = useCallback((subjectId: string) => {
    setReviewSubjectId(subjectId);
    setView('review');
  }, []);

  // Exit review back to dashboard
  const handleExitReview = useCallback(() => {
    setView('dashboard');
    reloadDueCountsRef.current();
    reloadStatsRef.current();
  }, []);

  // Open manage page
  const handleOpenManage = useCallback(() => {
    setView('manage');
  }, []);

  // Exit manage page back to dashboard
  const handleExitManage = useCallback(() => {
    setView('dashboard');
    reloadCapturesRef.current();
    reloadDueCountsRef.current();
    reloadStatsRef.current();
  }, []);

  // Get subject name for review screen
  const reviewSubject = subjects.find(s => s.id === reviewSubjectId);
  const reviewSubjectName = reviewSubject?.name || 'Unknown';

  // Loading state
  if (isLoading) {
    return (
      <div className="dashboard">
        <div className="dashboard-content">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '40px' }}>📚</div>
            <span style={{ color: '#636E72', fontFamily: '"Fredoka"', fontSize: '16px' }}>Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  // Study Mode (overlay takes precedence)
  if (studyMode) {
    return (
      <StudyOverlay
        subjects={subjects}
        selectedSubjectId={selectedSubjectId}
        onSelectSubject={setSelectedSubjectId}
        onCycleSubject={cycleSubject}
        onCapture={handleCapture}
        undoBubble={undoBubble}
        onUndo={handleUndo}
        toast={toast}
      />
    );
  }

  // Manage page
  if (view === 'manage') {
    return (
      <ManagePage
        subjects={subjects}
        initialSubjectId={selectedSubjectId}
        onBack={handleExitManage}
      />
    );
  }

  // Review screen
  if (view === 'review') {
    return (
      <ReviewScreen
        subjectId={reviewSubjectId}
        subjectName={reviewSubjectName}
        onBack={handleExitReview}
        onShowToast={showToast}
      />
    );
  }

  // Dashboard
  return (
    <Dashboard
      subjects={subjects}
      selectedSubjectId={selectedSubjectId}
      onSelectSubject={setSelectedSubjectId}
      onCreateSubject={createSubject}
      onDeleteSubject={deleteSubject}
      onToggleStudyMode={toggleStudyMode}
      onStartReview={handleStartReview}
      onOpenManage={handleOpenManage}
      dueCounts={dueCounts}
      captures={captures}
      toast={toast}
      onShowToast={showToast}
      stats={stats}
      level={level}
    />
  );
}

export default App;
