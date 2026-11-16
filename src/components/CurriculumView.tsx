import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  FlaskConical,
  Search,
} from 'lucide-react';
import { GRADE_LEVELS, SUBJECT_AREAS, SYLLABUS_EXPERIMENTS } from '../data/syllabus';
import { Course, ExperimentSpec, GradeLevel, StudentExperimentProgress, SubjectArea } from '../types/lab';

interface CurriculumViewProps {
  courses: Course[];
  progressMap: Record<string, StudentExperimentProgress>;
  onSelectExperiment: (experimentId: string) => void;
  onGoToTeacher: () => void;
}

export const CurriculumView: React.FC<CurriculumViewProps> = ({
  courses,
  progressMap,
  onSelectExperiment,
  onGoToTeacher,
}) => {
  const [selectedGrade, setSelectedGrade] = useState<'All' | GradeLevel>('All');
  const [selectedSubject, setSelectedSubject] = useState<'All' | SubjectArea>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [heroImgError, setHeroImgError] = useState(false);

  const activeCourses = useMemo(() => courses.filter((c) => c.status === 'active'), [courses]);

  const filteredExperiments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return SYLLABUS_EXPERIMENTS.filter((exp) => {
      if (selectedGrade !== 'All' && exp.gradeLevel !== selectedGrade) return false;
      if (selectedSubject !== 'All' && exp.subject !== selectedSubject) return false;
      if (!q) return true;
      return (
        exp.title.toLowerCase().includes(q) ||
        exp.subtopic.toLowerCase().includes(q) ||
        exp.code.toLowerCase().includes(q) ||
        exp.aim.toLowerCase().includes(q)
      );
    });
  }, [selectedGrade, selectedSubject, searchQuery]);

  const completedCount = Object.values(progressMap).filter((p) => p.status === 'completed').length;

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 space-y-12">
      {/* Section 1: Hero Split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-8 sm:p-10 flex flex-col justify-between">
          <div className="space-y-5">
            <p className="text-xs font-medium text-sky-700 tracking-wide">
              Class 9 through Engineering · Virtual Science &amp; Engineering Workbench
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-tight text-balance">
              Perform live laboratory experiments with instant scientific feedback.
            </h1>
            <p className="text-base text-slate-600 leading-relaxed max-w-xl">
              Explore 32 interactive simulations spanning Physics, Chemistry, Biology, Mathematics, and Engineering. Adjust physical apparatus in real time, log experimental observations, and track syllabus mastery.
            </p>
          </div>

          <div className="pt-8 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => onSelectExperiment('c10-ohms-law')}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Launch Live Lab</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onGoToTeacher}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Open Teacher Desk</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-6 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 min-h-[280px]">
          {!heroImgError ? (
            <img
              src="/src/assets/images/hero_science_bench_1794836360161.jpg"
              alt="Modern academic science and engineering workbench with optical prism, volumetric flasks, and oscilloscope"
              referrerPolicy="no-referrer"
              onError={() => setHeroImgError(true)}
              className="w-full h-full lg:h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-100 to-sky-50 text-slate-600">
              <FlaskConical className="w-10 h-10 text-sky-600 mb-3" />
              <p className="text-sm font-medium">Interactive Virtual Laboratory Bench</p>
            </div>
          )}
        </div>
      </section>

      {/* Full-width 4-column quantitative overview strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-white border border-slate-200 rounded-xl p-6">
        <div className="space-y-1">
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {SYLLABUS_EXPERIMENTS.length}
          </div>
          <div className="text-xs text-slate-600">Live Screen Experiments</div>
        </div>
        <div className="space-y-1">
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">5</div>
          <div className="text-xs text-slate-600">Syllabus Tiers (Class 9–Engg)</div>
        </div>
        <div className="space-y-1">
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {activeCourses.length}
          </div>
          <div className="text-xs text-slate-600">Active Teacher Courses</div>
        </div>
        <div className="space-y-1">
          <div className="text-2xl font-bold text-emerald-700 font-mono tabular-nums">
            {completedCount}/{SYLLABUS_EXPERIMENTS.length}
          </div>
          <div className="text-xs text-slate-600">Your Verified Labs</div>
        </div>
      </section>

      {/* Section 2: Assigned Teacher Courses */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Enrolled Courses</h2>
            <p className="text-sm text-slate-600 mt-1">
              Structured lab tracks assigned and managed by your instructors.
            </p>
          </div>
          <button
            type="button"
            onClick={onGoToTeacher}
            className="text-sm font-medium text-sky-700 hover:text-sky-800 hover:underline cursor-pointer whitespace-nowrap shrink-0"
          >
            Manage Courses in Teacher Desk
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activeCourses.map((course) => {
            const doneInCourse = course.experimentIds.filter(
              (eid) => progressMap[eid]?.status === 'completed'
            ).length;
            const totalInCourse = course.experimentIds.length || 1;
            const pct = Math.round((doneInCourse / totalInCourse) * 100);
            const firstExpId = course.experimentIds[0] ?? SYLLABUS_EXPERIMENTS[0].id;

            return (
              <div
                key={course.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col sm:flex-row"
              >
                <div className="sm:w-44 h-40 sm:h-auto shrink-0 bg-slate-100">
                  {course.coverImage ? (
                    <img
                      src={course.coverImage}
                      alt={course.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-500">
                      <BookOpen className="w-8 h-8" />
                    </div>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5">
                      <span className="font-mono">{course.code}</span>
                      <span aria-hidden="true">·</span>
                      <span>{course.gradeLevel}</span>
                      <span aria-hidden="true">·</span>
                      <span>{course.instructor}</span>
                    </div>
                    <h3 className="text-base font-semibold text-slate-900 leading-snug">
                      {course.title}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-2">{course.description}</p>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-mono tabular-nums">
                        {doneInCourse}/{course.experimentIds.length} labs verified ({pct}%)
                      </span>
                      <span className="text-slate-500 font-mono tabular-nums">
                        Due {course.dueDate}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sky-600 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="pt-1 flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        Pass threshold: <span className="font-mono tabular-nums">{course.passingAccuracyPct}%</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => onSelectExperiment(firstExpId)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 hover:text-sky-800 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <span>Open First Lab</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 3: Complete Class 9 to Engineering Syllabus Directory */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Complete Syllabus Experiment Catalog
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Filter by academic tier or discipline to launch any live simulation.
            </p>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search experiments or topics..."
              aria-label="Search syllabus experiments"
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-600"
            />
          </div>
        </div>

        {/* Interactive Filter Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-2 border-b border-slate-200">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
            {(['All', ...GRADE_LEVELS] as const).map((grade) => (
              <button
                key={grade}
                type="button"
                onClick={() => setSelectedGrade(grade)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedGrade === grade
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {grade === 'All' ? 'All Levels' : grade}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
            {(['All', ...SUBJECT_AREAS] as const).map((subj) => (
              <button
                key={subj}
                type="button"
                onClick={() => setSelectedSubject(subj)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedSubject === subj
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {subj === 'All' ? 'All Disciplines' : subj}
              </button>
            ))}
          </div>
        </div>

        {filteredExperiments.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
            <p className="text-sm font-medium text-slate-900">No experiments match these filters.</p>
            <p className="text-xs text-slate-500">
              Try clearing your search term or selecting All Levels.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedGrade('All');
                setSelectedSubject('All');
                setSearchQuery('');
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredExperiments.map((exp: ExperimentSpec) => {
              const prog = progressMap[exp.id];
              const isCompleted = prog?.status === 'completed';
              const isInProgress = prog?.status === 'in_progress';

              return (
                <article
                  key={exp.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4 hover:border-slate-300 transition-colors"
                >
                  <div className="space-y-2.5">
                    {/* Unboxed clean metadata with typographic separators */}
                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-slate-700">{exp.code}</span>
                      <span aria-hidden="true">·</span>
                      <span>{exp.gradeLevel}</span>
                      <span aria-hidden="true">·</span>
                      <span>{exp.subject}</span>
                      <span aria-hidden="true">·</span>
                      <span>{exp.durationMin} min</span>
                    </div>

                    <h3 className="text-base font-semibold text-slate-900 leading-snug">
                      {exp.title}
                    </h3>

                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{exp.aim}</p>

                    <div className="pt-1 font-mono text-xs text-sky-800 truncate" title={exp.formula}>
                      {exp.formula}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="text-xs flex items-center gap-1.5">
                      {isCompleted ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="text-emerald-700 font-medium tabular-nums">
                            Verified · {prog.accuracyPct.toFixed(0)}%
                          </span>
                        </>
                      ) : isInProgress ? (
                        <>
                          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="text-amber-700 font-medium tabular-nums">
                            In Progress · {prog.readings.length} logs
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-500">{exp.subtopic}</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectExperiment(exp.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span>Perform Lab</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
