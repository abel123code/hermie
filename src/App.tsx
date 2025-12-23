import React from 'react';
import { StudyOverlay } from './components/StudyOverlay';
import { Dashboard } from './components/Dashboard';
import { useSubjects, useCaptures } from './hooks/useSubjects';
import { useStudyMode } from './hooks/useStudyMode';

function App() {
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

  // Study mode & capture handling
  const {
    studyMode,
    toast,
    undoBubble,
    toggleStudyMode,
    handleCapture,
    handleUndo,
    showToast,
  } = useStudyMode(selectedSubjectIdRef, reloadCaptures);

  // Loading state
  if (isLoading) {
    return (
      <div className="dashboard">
        <div className="dashboard-content">
          <span className="text-neutral-500">Loading...</span>
        </div>
      </div>
    );
  }

  // Study Mode
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

  // Dashboard
  return (
    <Dashboard
      subjects={subjects}
      selectedSubjectId={selectedSubjectId}
      onSelectSubject={setSelectedSubjectId}
      onCreateSubject={createSubject}
      onDeleteSubject={deleteSubject}
      onToggleStudyMode={toggleStudyMode}
      captures={captures}
      toast={toast}
      onShowToast={showToast}
    />
  );
}

export default App;
