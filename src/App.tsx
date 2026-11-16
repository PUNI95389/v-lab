import { useCallback, useEffect, useState } from 'react';
import { CurriculumView } from './components/CurriculumView';
import { LiveLabWorkbench } from './components/LiveLabWorkbench';
import { ProgressView } from './components/ProgressView';
import { TeacherDashboard } from './components/TeacherDashboard';
import { AppView, TopBar } from './components/TopBar';
import {
  INITIAL_COURSES,
  INITIAL_STUDENT_PROGRESS,
  INITIAL_STUDENTS,
} from './data/initialStore';
import { EXPERIMENT_MAP, SYLLABUS_EXPERIMENTS } from './data/syllabus';
import {
  ClassroomStudent,
  Course,
  ObservationEntry,
  StudentExperimentProgress,
} from './types/lab';

const STORAGE_KEYS = {
  courses: 'principia_courses_v1',
  students: 'principia_students_v1',
  progress: 'principia_progress_v1',
  activeExp: 'principia_active_exp_v1',
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('curriculum');
  const [activeExperimentId, setActiveExperimentId] = useState<string>(() =>
    loadFromStorage<string>(STORAGE_KEYS.activeExp, 'c10-ohms-law')
  );
  const [courses, setCourses] = useState<Course[]>(() =>
    loadFromStorage<Course[]>(STORAGE_KEYS.courses, INITIAL_COURSES)
  );
  const [students, setStudents] = useState<ClassroomStudent[]>(() =>
    loadFromStorage<ClassroomStudent[]>(STORAGE_KEYS.students, INITIAL_STUDENTS)
  );
  const [progressMap, setProgressMap] = useState<Record<string, StudentExperimentProgress>>(() =>
    loadFromStorage<Record<string, StudentExperimentProgress>>(
      STORAGE_KEYS.progress,
      INITIAL_STUDENT_PROGRESS
    )
  );
  const [teacherModalOpen, setTeacherModalOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.courses, JSON.stringify(courses));
    } catch {
      // Ignore storage quota errors
    }
  }, [courses]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.students, JSON.stringify(students));
    } catch {
      // Ignore storage quota errors
    }
  }, [students]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.progress, JSON.stringify(progressMap));
    } catch {
      // Ignore storage quota errors
    }
  }, [progressMap]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.activeExp, JSON.stringify(activeExperimentId));
    } catch {
      // Ignore storage quota errors
    }
  }, [activeExperimentId]);

  const activeExperiment =
    EXPERIMENT_MAP[activeExperimentId] ?? SYLLABUS_EXPERIMENTS[0];

  const handleSelectExperiment = useCallback((experimentId: string) => {
    setActiveExperimentId(experimentId);
    setActiveView('workbench');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleRecordReading = useCallback(
    (experimentId: string, entry: ObservationEntry, checkpointsMet: number[]) => {
      setProgressMap((prev) => {
        const existing = prev[experimentId] ?? {
          experimentId,
          status: 'in_progress',
          readings: [],
          checkpointsCompleted: [],
          quizAnswers: {},
          quizScorePct: null,
          accuracyPct: 92,
          timeSpentSec: 0,
          lastUpdated: new Date().toISOString(),
        };
        const nextReadings = [...existing.readings, entry];
        const mergedCheckpoints = Array.from(
          new Set([...existing.checkpointsCompleted, ...checkpointsMet])
        ).sort((a, b) => a - b);
        const avgErr =
          nextReadings.reduce((s, r) => s + r.errorPct, 0) / nextReadings.length;
        return {
          ...prev,
          [experimentId]: {
            ...existing,
            status: existing.status === 'completed' ? 'completed' : 'in_progress',
            readings: nextReadings,
            checkpointsCompleted: mergedCheckpoints,
            accuracyPct: Math.max(70, Number((100 - avgErr * 0.4).toFixed(1))),
            lastUpdated: new Date().toISOString(),
          },
        };
      });
    },
    []
  );

  const handleDeleteReading = useCallback((experimentId: string, readingId: string) => {
    setProgressMap((prev) => {
      const existing = prev[experimentId];
      if (!existing) return prev;
      return {
        ...prev,
        [experimentId]: {
          ...existing,
          readings: existing.readings.filter((r) => r.id !== readingId),
          lastUpdated: new Date().toISOString(),
        },
      };
    });
  }, []);

  const handleUpdateCheckpoints = useCallback(
    (experimentId: string, checkpoints: number[]) => {
      setProgressMap((prev) => {
        const existing = prev[experimentId] ?? {
          experimentId,
          status: 'in_progress',
          readings: [],
          checkpointsCompleted: [],
          quizAnswers: {},
          quizScorePct: null,
          accuracyPct: 90,
          timeSpentSec: 0,
          lastUpdated: new Date().toISOString(),
        };
        if (existing.checkpointsCompleted.length === checkpoints.length) return prev;
        return {
          ...prev,
          [experimentId]: {
            ...existing,
            status: existing.status === 'completed' ? 'completed' : 'in_progress',
            checkpointsCompleted: checkpoints,
            lastUpdated: new Date().toISOString(),
          },
        };
      });
    },
    []
  );

  const handleAnswerQuiz = useCallback(
    (experimentId: string, questionIdx: number, answerIdx: number, scorePct: number) => {
      setProgressMap((prev) => {
        const existing = prev[experimentId] ?? {
          experimentId,
          status: 'in_progress',
          readings: [],
          checkpointsCompleted: [],
          quizAnswers: {},
          quizScorePct: null,
          accuracyPct: 90,
          timeSpentSec: 0,
          lastUpdated: new Date().toISOString(),
        };
        return {
          ...prev,
          [experimentId]: {
            ...existing,
            status: existing.status === 'completed' ? 'completed' : 'in_progress',
            quizAnswers: { ...existing.quizAnswers, [questionIdx]: answerIdx },
            quizScorePct: scorePct,
            lastUpdated: new Date().toISOString(),
          },
        };
      });
    },
    []
  );

  const handleCompleteLab = useCallback((experimentId: string, accuracyPct: number) => {
    setProgressMap((prev) => {
      const existing = prev[experimentId] ?? {
        experimentId,
        status: 'completed',
        readings: [],
        checkpointsCompleted: [],
        quizAnswers: {},
        quizScorePct: null,
        accuracyPct,
        timeSpentSec: 120,
        lastUpdated: new Date().toISOString(),
      };
      return {
        ...prev,
        [experimentId]: {
          ...existing,
          status: 'completed',
          accuracyPct,
          lastUpdated: new Date().toISOString(),
        },
      };
    });
  }, []);

  const handleSaveCourse = useCallback((course: Course) => {
    setCourses((prev) => {
      const exists = prev.some((c) => c.id === course.id);
      if (exists) {
        return prev.map((c) => (c.id === course.id ? course : c));
      }
      return [course, ...prev];
    });
  }, []);

  const handleDeleteCourse = useCallback((courseId: string) => {
    setCourses((prev) => prev.filter((c) => c.id !== courseId));
  }, []);

  const handleUpdateStudentRemark = useCallback((studentId: string, remark: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, teacherRemarks: remark } : s))
    );
  }, []);

  const handlePrimaryTopBarAction = () => {
    if (activeView === 'teacher') {
      setTeacherModalOpen(true);
    } else {
      setActiveView('workbench');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
      <TopBar
        activeView={activeView}
        onNavigate={(v) => {
          setActiveView(v);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onPrimaryAction={handlePrimaryTopBarAction}
      />

      <main className="flex-1">
        {activeView === 'curriculum' && (
          <CurriculumView
            courses={courses}
            progressMap={progressMap}
            onSelectExperiment={handleSelectExperiment}
            onGoToTeacher={() => setActiveView('teacher')}
          />
        )}

        {activeView === 'workbench' && (
          <LiveLabWorkbench
            experiment={activeExperiment}
            progress={progressMap[activeExperiment.id]}
            onSelectExperiment={handleSelectExperiment}
            onRecordReading={handleRecordReading}
            onDeleteReading={handleDeleteReading}
            onUpdateCheckpoints={handleUpdateCheckpoints}
            onAnswerQuiz={handleAnswerQuiz}
            onCompleteLab={handleCompleteLab}
            onBackToCatalog={() => setActiveView('curriculum')}
          />
        )}

        {activeView === 'progress' && (
          <ProgressView
            courses={courses}
            progressMap={progressMap}
            onSelectExperiment={handleSelectExperiment}
          />
        )}

        {activeView === 'teacher' && (
          <TeacherDashboard
            courses={courses}
            students={students}
            activeStudentProgress={progressMap}
            isCreateModalOpen={teacherModalOpen}
            onSetCreateModalOpen={setTeacherModalOpen}
            onSaveCourse={handleSaveCourse}
            onDeleteCourse={handleDeleteCourse}
            onUpdateStudentRemark={handleUpdateStudentRemark}
            onLaunchExperiment={handleSelectExperiment}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>Principia Labs · Class 9 to Engineering Interactive Virtual Laboratory</span>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => setActiveView('curriculum')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Syllabus Catalog
            </button>
            <button
              type="button"
              onClick={() => setActiveView('progress')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Student Progress
            </button>
            <button
              type="button"
              onClick={() => setActiveView('teacher')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Teacher Course Desk
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
