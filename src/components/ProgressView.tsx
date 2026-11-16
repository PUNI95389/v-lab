import React, { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Clock, Download } from 'lucide-react';
import { GRADE_LEVELS, SUBJECT_AREAS, SYLLABUS_EXPERIMENTS } from '../data/syllabus';
import { Course, GradeLevel, StudentExperimentProgress } from '../types/lab';

interface ProgressViewProps {
  courses: Course[];
  progressMap: Record<string, StudentExperimentProgress>;
  onSelectExperiment: (experimentId: string) => void;
}

export const ProgressView: React.FC<ProgressViewProps> = ({
  courses,
  progressMap,
  onSelectExperiment,
}) => {
  const [gradeFilter, setGradeFilter] = useState<'All' | GradeLevel>('All');

  const stats = useMemo(() => {
    const entries = Object.values(progressMap);
    const completed = entries.filter((e) => e.status === 'completed');
    const inProgress = entries.filter((e) => e.status === 'in_progress');
    const totalReadings = entries.reduce((sum, e) => sum + e.readings.length, 0);
    const avgAccuracy =
      completed.length > 0
        ? completed.reduce((s, e) => s + e.accuracyPct, 0) / completed.length
        : 0;
    const quizEntries = entries.filter((e) => e.quizScorePct !== null);
    const avgQuiz =
      quizEntries.length > 0
        ? quizEntries.reduce((s, e) => s + (e.quizScorePct ?? 0), 0) / quizEntries.length
        : 0;

    return {
      completedCount: completed.length,
      inProgressCount: inProgress.length,
      totalReadings,
      avgAccuracy,
      avgQuiz,
    };
  }, [progressMap]);

  const rows = useMemo(() => {
    return SYLLABUS_EXPERIMENTS.filter(
      (exp) => gradeFilter === 'All' || exp.gradeLevel === gradeFilter
    ).map((exp) => ({
      experiment: exp,
      progress: progressMap[exp.id],
    }));
  }, [gradeFilter, progressMap]);

  const handleExportReport = () => {
    const headers = [
      'Code',
      'Experiment',
      'Level',
      'Subject',
      'Status',
      'Readings Logged',
      'Checkpoints',
      'Viva Score (%)',
      'Accuracy (%)',
    ];
    const lines = [
      headers.join(','),
      ...rows.map(({ experiment, progress }) => {
        const status = progress?.status ?? 'not_started';
        const readings = progress?.readings.length ?? 0;
        const cps = `${progress?.checkpointsCompleted.length ?? 0}/${experiment.checkpoints.length}`;
        const quiz = progress?.quizScorePct ?? '—';
        const acc = progress?.accuracyPct ? progress.accuracyPct.toFixed(1) : '—';
        return [
          experiment.code,
          `"${experiment.title}"`,
          experiment.gradeLevel,
          experiment.subject,
          status,
          readings,
          cps,
          quiz,
          acc,
        ].join(',');
      }),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'principia-student-progress-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Student Progress &amp; Lab Mastery
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Track verified experiments, observation logs, and viva performance across Class 9 to Engineering.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportReport}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Progress CSV</span>
        </button>
      </div>

      {/* 4-Column Summary Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-white border border-slate-200 rounded-xl p-6">
        <div className="space-y-1">
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {stats.completedCount}/{SYLLABUS_EXPERIMENTS.length}
          </div>
          <div className="text-xs text-slate-600">
            Completed Labs ({stats.inProgressCount} in progress)
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {stats.totalReadings}
          </div>
          <div className="text-xs text-slate-600">Logged Observation Readings</div>
        </div>
        <div className="space-y-1">
          <div className="text-2xl font-bold text-emerald-700 font-mono tabular-nums">
            {stats.avgAccuracy > 0 ? `${stats.avgAccuracy.toFixed(1)}%` : '—'}
          </div>
          <div className="text-xs text-slate-600">Mean Experimental Accuracy</div>
        </div>
        <div className="space-y-1">
          <div className="text-2xl font-bold text-sky-700 font-mono tabular-nums">
            {stats.avgQuiz > 0 ? `${stats.avgQuiz.toFixed(0)}%` : '—'}
          </div>
          <div className="text-xs text-slate-600">Viva Concept Score</div>
        </div>
      </section>

      {/* Tier & Discipline Breakdown */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-900">Syllabus Tier Mastery</h2>
          <div className="space-y-3.5">
            {GRADE_LEVELS.map((lvl) => {
              const total = SYLLABUS_EXPERIMENTS.filter((e) => e.gradeLevel === lvl).length;
              const done = SYLLABUS_EXPERIMENTS.filter(
                (e) => e.gradeLevel === lvl && progressMap[e.id]?.status === 'completed'
              ).length;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              return (
                <div key={lvl} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800">{lvl}</span>
                    <span className="font-mono text-slate-600 tabular-nums">
                      {done}/{total} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-sky-600" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-900">Discipline Coverage &amp; Courses</h2>
          <div className="space-y-3.5">
            {SUBJECT_AREAS.map((subj) => {
              const total = SYLLABUS_EXPERIMENTS.filter((e) => e.subject === subj).length;
              const done = SYLLABUS_EXPERIMENTS.filter(
                (e) => e.subject === subj && progressMap[e.id]?.status === 'completed'
              ).length;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              return (
                <div key={subj} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800">{subj}</span>
                    <span className="font-mono text-slate-600 tabular-nums">
                      {done}/{total} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-600" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="pt-2 border-t border-slate-100 text-xs text-slate-500">
            Enrolled in {courses.filter((c) => c.status === 'active').length} active instructor courses.
          </div>
        </div>
      </section>

      {/* Detailed Activity Ledger Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">Experiment Progress Ledger</h2>

          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(['All', ...GRADE_LEVELS] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setGradeFilter(lvl)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer whitespace-nowrap shrink-0 ${
                  gradeFilter === lvl
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {lvl === 'All' ? 'All Levels' : lvl}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="py-3 px-4 font-medium">Code</th>
                <th className="py-3 px-4 font-medium">Experiment</th>
                <th className="py-3 px-4 font-medium">Syllabus</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium text-right">Readings</th>
                <th className="py-3 px-4 font-medium text-right">Checkpoints</th>
                <th className="py-3 px-4 font-medium text-right">Viva</th>
                <th className="py-3 px-4 font-medium text-right">Accuracy</th>
                <th className="py-3 px-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(({ experiment, progress }) => {
                const status = progress?.status ?? 'not_started';
                return (
                  <tr key={experiment.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                      {experiment.code}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-900">
                      {experiment.title}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">
                      {experiment.gradeLevel} · {experiment.subject}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      {status === 'completed' ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Completed</span>
                        </span>
                      ) : status === 'in_progress' ? (
                        <span className="inline-flex items-center gap-1.5 text-amber-700 font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          <span>In Progress</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">Not Started</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">
                      {progress?.readings.length ?? 0}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">
                      {progress?.checkpointsCompleted.length ?? 0}/{experiment.checkpoints.length}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">
                      {progress?.quizScorePct !== null && progress?.quizScorePct !== undefined
                        ? `${progress.quizScorePct}%`
                        : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-900 font-semibold">
                      {progress?.accuracyPct ? `${progress.accuracyPct.toFixed(1)}%` : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onSelectExperiment(experiment.id)}
                        className="inline-flex items-center gap-1 text-sky-700 hover:text-sky-900 font-semibold cursor-pointer"
                      >
                        <span>{status === 'not_started' ? 'Start' : 'Resume'}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
