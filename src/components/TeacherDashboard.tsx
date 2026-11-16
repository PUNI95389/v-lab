import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Download,
  Edit3,
  FlaskConical,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { EXPERIMENT_MAP, GRADE_LEVELS, SUBJECT_AREAS, SYLLABUS_EXPERIMENTS } from '../data/syllabus';
import {
  ClassroomStudent,
  Course,
  GradeLevel,
  StudentExperimentProgress,
  SubjectArea,
} from '../types/lab';

interface TeacherDashboardProps {
  courses: Course[];
  students: ClassroomStudent[];
  activeStudentProgress: Record<string, StudentExperimentProgress>;
  isCreateModalOpen: boolean;
  onSetCreateModalOpen: (open: boolean) => void;
  onSaveCourse: (course: Course) => void;
  onDeleteCourse: (courseId: string) => void;
  onUpdateStudentRemark: (studentId: string, remark: string) => void;
  onLaunchExperiment: (experimentId: string) => void;
}

type TeacherTab = 'courses' | 'students' | 'syllabus';

const EMPTY_COURSE = (): Course => ({
  id: `crs-${Date.now()}`,
  code: 'SCI-11-NEW',
  title: '',
  gradeLevel: 'Class 11',
  subject: 'Physics',
  instructor: 'Dr. Meera Kulkarni',
  term: 'Term 1 · 2026',
  description: '',
  dueDate: '2026-12-15',
  passingAccuracyPct: 85,
  experimentIds: [],
  status: 'active',
  coverImage: '/src/assets/images/course_physics_optics_1794836360009.jpg',
});

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  courses,
  students,
  activeStudentProgress,
  isCreateModalOpen,
  onSetCreateModalOpen,
  onSaveCourse,
  onDeleteCourse,
  onUpdateStudentRemark,
  onLaunchExperiment,
}) => {
  const [activeTab, setActiveTab] = useState<TeacherTab>('courses');
  const [courseSearch, setCourseSearch] = useState('');
  const [courseStatusFilter, setCourseStatusFilter] = useState<'all' | 'active' | 'draft' | 'archived'>('all');
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [expPickerGrade, setExpPickerGrade] = useState<'All' | GradeLevel>('All');

  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id ?? 'stu-current');
  const [remarkDraft, setRemarkDraft] = useState<string>('');

  // Merge live student progress into stu-current row
  const liveStudents = useMemo(() => {
    const completedIds = Object.values(activeStudentProgress)
      .filter((p) => p.status === 'completed')
      .map((p) => p.experimentId);
    const completedEntries = Object.values(activeStudentProgress).filter(
      (p) => p.status === 'completed'
    );
    const totalReadings = Object.values(activeStudentProgress).reduce(
      (sum, p) => sum + p.readings.length,
      0
    );
    const avgAccuracy =
      completedEntries.length > 0
        ? completedEntries.reduce((s, p) => s + p.accuracyPct, 0) / completedEntries.length
        : 0;

    return students.map((stu) =>
      stu.id === 'stu-current'
        ? {
            ...stu,
            completedExperimentIds: completedIds,
            totalReadings,
            avgAccuracyPct: Number(avgAccuracy.toFixed(1)),
          }
        : stu
    );
  }, [students, activeStudentProgress]);

  const filteredCourses = useMemo(() => {
    const q = courseSearch.trim().toLowerCase();
    return courses.filter((c) => {
      if (courseStatusFilter !== 'all' && c.status !== courseStatusFilter) return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.instructor.toLowerCase().includes(q) ||
        c.gradeLevel.toLowerCase().includes(q)
      );
    });
  }, [courses, courseSearch, courseStatusFilter]);

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    return liveStudents.filter((s) => {
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.batch.toLowerCase().includes(q) ||
        s.gradeLevel.toLowerCase().includes(q)
      );
    });
  }, [liveStudents, studentSearch]);

  const selectedStudent =
    liveStudents.find((s) => s.id === selectedStudentId) ?? liveStudents[0];

  const openNewCourse = () => {
    setEditingCourse(EMPTY_COURSE());
    onSetCreateModalOpen(true);
  };

  const openEditCourse = (course: Course) => {
    setEditingCourse({ ...course, experimentIds: [...course.experimentIds] });
    onSetCreateModalOpen(true);
  };

  const closeModal = () => {
    onSetCreateModalOpen(false);
    setEditingCourse(null);
  };

  const formCourse = editingCourse ?? EMPTY_COURSE();

  const handleToggleExpInCourse = (expId: string) => {
    const cur = formCourse.experimentIds;
    const next = cur.includes(expId) ? cur.filter((id) => id !== expId) : [...cur, expId];
    setEditingCourse({ ...formCourse, experimentIds: next });
  };

  const handleSubmitCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCourse.title.trim()) return;
    const coverBySubject: Record<SubjectArea, string> = {
      Physics: '/src/assets/images/course_physics_optics_1794836360009.jpg',
      Chemistry: '/src/assets/images/course_chemistry_titration_1794836359991.jpg',
      Biology: '/src/assets/images/course_chemistry_titration_1794836359991.jpg',
      Mathematics: '/src/assets/images/course_physics_optics_1794836360009.jpg',
      Engineering: '/src/assets/images/course_engineering_circuits_1794836360730.jpg',
    };
    onSaveCourse({
      ...formCourse,
      title: formCourse.title.trim(),
      code: formCourse.code.trim() || 'LAB-101',
      coverImage: coverBySubject[formCourse.subject],
    });
    closeModal();
  };

  const handleExportGradebook = () => {
    const headers = [
      'Student Name',
      'Email',
      'Level',
      'Batch',
      'Completed Labs',
      'Readings Logged',
      'Avg Accuracy (%)',
      'Last Active',
    ];
    const lines = [
      headers.join(','),
      ...liveStudents.map((s) =>
        [
          `"${s.name}"`,
          s.email,
          s.gradeLevel,
          s.batch,
          s.completedExperimentIds.length,
          s.totalReadings,
          s.avgAccuracyPct,
          s.lastActive,
        ].join(',')
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'classroom-gradebook.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const avgClassAccuracy = useMemo(() => {
    if (liveStudents.length === 0) return 0;
    return liveStudents.reduce((s, st) => s + st.avgAccuracyPct, 0) / liveStudents.length;
  }, [liveStudents]);

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Workspace Sidebar (240px–260px) */}
        <aside className="w-full lg:w-64 shrink-0 bg-white border border-slate-200 rounded-xl p-4 space-y-5">
          <div className="space-y-1 px-2">
            <div className="text-xs text-slate-500">Faculty Console</div>
            <div className="text-base font-semibold text-slate-900">Teacher Desk</div>
          </div>

          <nav className="space-y-1">
            <button
              type="button"
              onClick={() => setActiveTab('courses')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                activeTab === 'courses'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>Course Manager</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('students')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                activeTab === 'students'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>Student Progress</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('syllabus')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                activeTab === 'syllabus'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <FlaskConical className="w-4 h-4 shrink-0" />
              <span>All 32 Syllabus Labs</span>
            </button>
          </nav>

          <div className="pt-4 border-t border-slate-100 space-y-3 px-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Active Courses</span>
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {courses.filter((c) => c.status === 'active').length}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Enrolled Students</span>
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {liveStudents.length}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Class Accuracy</span>
              <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                {avgClassAccuracy.toFixed(1)}%
              </span>
            </div>
          </div>
        </aside>

        {/* Main Content Viewport */}
        <main className="flex-1 w-full space-y-6">
          {/* Top Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <div className="text-xs text-slate-500">
                Principia Faculty /{' '}
                {activeTab === 'courses'
                  ? 'Course Management'
                  : activeTab === 'students'
                  ? 'Student Roster & Progress'
                  : 'Syllabus Directory'}
              </div>
              <h1 className="text-xl font-bold text-slate-900 mt-0.5">
                {activeTab === 'courses'
                  ? 'Manage Courses & Assigned Experiments'
                  : activeTab === 'students'
                  ? 'Classroom Progress & Evaluation'
                  : 'Complete Class 9–Engineering Lab Matrix'}
              </h1>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleExportGradebook}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Gradebook</span>
              </button>
              <button
                type="button"
                onClick={openNewCourse}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-lg cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Course</span>
              </button>
            </div>
          </div>

          {/* TAB 1: COURSES MANAGER */}
          {activeTab === 'courses' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
                  {(['all', 'active', 'draft', 'archived'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setCourseStatusFilter(st)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize cursor-pointer whitespace-nowrap shrink-0 ${
                        courseStatusFilter === st
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                    placeholder="Filter courses..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
                  />
                </div>
              </div>

              {filteredCourses.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
                  <p className="text-sm font-medium text-slate-900">No courses found</p>
                  <p className="text-xs text-slate-500">
                    Create a new course and assign syllabus experiments for your students.
                  </p>
                  <button
                    type="button"
                    onClick={openNewCourse}
                    className="px-4 py-2 text-xs font-semibold bg-sky-600 text-white rounded-lg hover:bg-sky-700 cursor-pointer"
                  >
                    Create First Course
                  </button>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                          <th className="py-3 px-4 font-medium">Course</th>
                          <th className="py-3 px-4 font-medium">Level · Subject</th>
                          <th className="py-3 px-4 font-medium">Instructor</th>
                          <th className="py-3 px-4 font-medium text-right">Experiments</th>
                          <th className="py-3 px-4 font-medium text-right">Pass %</th>
                          <th className="py-3 px-4 font-medium">Due Date</th>
                          <th className="py-3 px-4 font-medium">Status</th>
                          <th className="py-3 px-4 font-medium text-right">Manage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredCourses.map((course) => (
                          <tr key={course.id} className="hover:bg-slate-50/70">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900">{course.title}</div>
                              <div className="font-mono text-slate-500 mt-0.5">{course.code}</div>
                            </td>
                            <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                              {course.gradeLevel} · {course.subject}
                            </td>
                            <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                              {course.instructor}
                            </td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900 font-semibold">
                              {course.experimentIds.length}
                            </td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                              {course.passingAccuracyPct}%
                            </td>
                            <td className="py-3 px-4 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                              {course.dueDate}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap capitalize">
                              <span
                                className={
                                  course.status === 'active'
                                    ? 'text-emerald-700 font-medium'
                                    : course.status === 'draft'
                                    ? 'text-amber-700 font-medium'
                                    : 'text-slate-500'
                                }
                              >
                                {course.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                              <button
                                type="button"
                                onClick={() => openEditCourse(course)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-sky-700 hover:bg-sky-50 rounded cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteCourse(course.id)}
                                aria-label="Delete course"
                                className="inline-flex items-center p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: STUDENT PROGRESS */}
          {activeTab === 'students' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              <div className="xl:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-900">
                    Enrolled Student Roster
                  </span>
                  <div className="relative w-56">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Search student or batch..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-600"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                        <th className="py-2.5 px-4 font-medium">Student</th>
                        <th className="py-2.5 px-4 font-medium">Batch / Tier</th>
                        <th className="py-2.5 px-4 font-medium text-right">Completed</th>
                        <th className="py-2.5 px-4 font-medium text-right">Readings</th>
                        <th className="py-2.5 px-4 font-medium text-right">Accuracy</th>
                        <th className="py-2.5 px-4 font-medium">Last Active</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStudents.map((stu) => {
                        const isSelected = stu.id === selectedStudent?.id;
                        return (
                          <tr
                            key={stu.id}
                            onClick={() => {
                              setSelectedStudentId(stu.id);
                              setRemarkDraft(stu.teacherRemarks);
                            }}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-sky-50/70' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="py-2.5 px-4">
                              <div className="font-semibold text-slate-900">{stu.name}</div>
                              <div className="text-slate-500">{stu.email}</div>
                            </td>
                            <td className="py-2.5 px-4 text-slate-700 whitespace-nowrap">
                              {stu.gradeLevel} · {stu.batch}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-900">
                              {stu.completedExperimentIds.length}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">
                              {stu.totalReadings}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-emerald-700">
                              {stu.avgAccuracyPct > 0 ? `${stu.avgAccuracyPct.toFixed(1)}%` : '—'}
                            </td>
                            <td className="py-2.5 px-4 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                              {stu.lastActive}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Selected Student Evaluation Panel */}
              {selectedStudent && (
                <div className="xl:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                  <div className="space-y-1 pb-3 border-b border-slate-100">
                    <div className="text-xs text-slate-500">
                      {selectedStudent.gradeLevel} · {selectedStudent.batch}
                    </div>
                    <h2 className="text-base font-semibold text-slate-900">
                      {selectedStudent.name}
                    </h2>
                    <div className="text-xs text-slate-500">{selectedStudent.email}</div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-800">
                      Verified Labs ({selectedStudent.completedExperimentIds.length})
                    </div>
                    {selectedStudent.completedExperimentIds.length === 0 ? (
                      <p className="text-xs text-slate-500">No experiments completed yet.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {selectedStudent.completedExperimentIds.map((eid) => {
                          const exp = EXPERIMENT_MAP[eid];
                          return (
                            <li
                              key={eid}
                              className="flex items-center justify-between gap-2 text-xs py-1"
                            >
                              <span className="inline-flex items-center gap-1.5 text-slate-800 truncate">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span className="truncate">{exp ? exp.title : eid}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => onLaunchExperiment(eid)}
                                className="text-sky-700 hover:underline shrink-0 cursor-pointer"
                              >
                                Inspect
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <label
                      htmlFor="teacher-remark"
                      className="block text-xs font-semibold text-slate-800"
                    >
                      Instructor Evaluation Remarks
                    </label>
                    <textarea
                      id="teacher-remark"
                      rows={3}
                      value={
                        remarkDraft !== '' && selectedStudentId === selectedStudent.id
                          ? remarkDraft
                          : selectedStudent.teacherRemarks
                      }
                      onChange={(e) => setRemarkDraft(e.target.value)}
                      className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const text =
                          remarkDraft.trim() || selectedStudent.teacherRemarks;
                        onUpdateStudentRemark(selectedStudent.id, text);
                      }}
                      className="w-full py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg cursor-pointer"
                    >
                      Save Evaluation Remark
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ALL 32 SYLLABUS LABS */}
          {activeTab === 'syllabus' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                      <th className="py-3 px-4 font-medium">Code</th>
                      <th className="py-3 px-4 font-medium">Experiment Title</th>
                      <th className="py-3 px-4 font-medium">Tier</th>
                      <th className="py-3 px-4 font-medium">Discipline</th>
                      <th className="py-3 px-4 font-medium">Core Formula</th>
                      <th className="py-3 px-4 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {SYLLABUS_EXPERIMENTS.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                          {exp.code}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-slate-900">{exp.title}</td>
                        <td className="py-2.5 px-4 text-slate-700 whitespace-nowrap">
                          {exp.gradeLevel}
                        </td>
                        <td className="py-2.5 px-4 text-slate-700 whitespace-nowrap">
                          {exp.subject}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-sky-800">{exp.formula}</td>
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onLaunchExperiment(exp.id)}
                            className="text-sky-700 hover:text-sky-900 font-semibold cursor-pointer"
                          >
                            Test Simulation
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Create / Edit Course Modal */}
      {isCreateModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Course Editor"
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">
                {editingCourse && courses.some((c) => c.id === editingCourse.id)
                  ? 'Edit Course'
                  : 'Create New Course'}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close dialog"
                className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCourse} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="block text-xs font-medium text-slate-700">Course Title</label>
                  <input
                    required
                    type="text"
                    value={formCourse.title}
                    onChange={(e) => setEditingCourse({ ...formCourse, title: e.target.value })}
                    placeholder="e.g., Class 11 Mechanics & Fluid Dynamics"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">Course Code</label>
                  <input
                    type="text"
                    value={formCourse.code}
                    onChange={(e) => setEditingCourse({ ...formCourse, code: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">Academic Level</label>
                  <select
                    value={formCourse.gradeLevel}
                    onChange={(e) =>
                      setEditingCourse({ ...formCourse, gradeLevel: e.target.value as GradeLevel })
                    }
                    className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    {GRADE_LEVELS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">Subject</label>
                  <select
                    value={formCourse.subject}
                    onChange={(e) =>
                      setEditingCourse({ ...formCourse, subject: e.target.value as SubjectArea })
                    }
                    className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    {SUBJECT_AREAS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">Due Date</label>
                  <input
                    type="date"
                    value={formCourse.dueDate}
                    onChange={(e) => setEditingCourse({ ...formCourse, dueDate: e.target.value })}
                    className="w-full px-2.5 py-2 text-xs font-mono border border-slate-200 rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">Pass Threshold %</label>
                  <input
                    type="number"
                    min={50}
                    max={100}
                    value={formCourse.passingAccuracyPct}
                    onChange={(e) =>
                      setEditingCourse({
                        ...formCourse,
                        passingAccuracyPct: Number(e.target.value),
                      })
                    }
                    className="w-full px-2.5 py-2 text-xs font-mono border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">Instructor</label>
                  <input
                    type="text"
                    value={formCourse.instructor}
                    onChange={(e) =>
                      setEditingCourse({ ...formCourse, instructor: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">Course Status</label>
                  <select
                    value={formCourse.status}
                    onChange={(e) =>
                      setEditingCourse({
                        ...formCourse,
                        status: e.target.value as Course['status'],
                      })
                    }
                    className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="active">Active (Visible to Students)</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">Description</label>
                <textarea
                  rows={2}
                  value={formCourse.description}
                  onChange={(e) =>
                    setEditingCourse({ ...formCourse, description: e.target.value })
                  }
                  placeholder="Describe course learning outcomes and lab expectations..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
              </div>

              {/* Assign Experiments from Syllabus */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-900">
                    Assign Syllabus Experiments ({formCourse.experimentIds.length} selected)
                  </span>
                  <select
                    aria-label="Filter syllabus picker by level"
                    value={expPickerGrade}
                    onChange={(e) => setExpPickerGrade(e.target.value as 'All' | GradeLevel)}
                    className="text-xs border border-slate-200 rounded px-2 py-1 bg-white"
                  >
                    <option value="All">All Levels</option>
                    {GRADE_LEVELS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                  {SYLLABUS_EXPERIMENTS.filter(
                    (ex) => expPickerGrade === 'All' || ex.gradeLevel === expPickerGrade
                  ).map((ex) => {
                    const checked = formCourse.experimentIds.includes(ex.id);
                    return (
                      <label
                        key={ex.id}
                        className="flex items-center justify-between gap-3 px-3 py-2 text-xs hover:bg-slate-50 cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleToggleExpInCourse(ex.id)}
                            className="rounded border-slate-300 text-sky-600 focus:ring-sky-600"
                          />
                          <span className="font-mono text-slate-500 shrink-0">{ex.code}</span>
                          <span className="text-slate-900 font-medium truncate">{ex.title}</span>
                        </span>
                        <span className="text-slate-500 shrink-0">
                          {ex.gradeLevel} · {ex.subject}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg cursor-pointer"
                >
                  Save Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
