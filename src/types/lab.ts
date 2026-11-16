export type GradeLevel = 'Class 9' | 'Class 10' | 'Class 11' | 'Class 12' | 'Engineering';

export type SubjectArea = 'Physics' | 'Chemistry' | 'Biology' | 'Mathematics' | 'Engineering';

export type SimulationEngineId =
  | 'pendulum'
  | 'buoyancy'
  | 'sound_reflection'
  | 'thermo_curve'
  | 'osmosis_cell'
  | 'linear_coord'
  | 'ohms_law'
  | 'snell_refraction'
  | 'lens_mirror'
  | 'acid_base_ph'
  | 'photosynthesis'
  | 'quadratic_roots'
  | 'projectile'
  | 'spring_shm'
  | 'bernoulli_flow'
  | 'chemical_equilibrium'
  | 'enzyme_kinetics'
  | 'trig_conics'
  | 'wheatstone_bridge'
  | 'pn_diode'
  | 'ydse_interference'
  | 'redox_titration'
  | 'galvanic_cell'
  | 'bohr_effect'
  | 'riemann_integral'
  | 'rlc_resonance'
  | 'opamp_gain'
  | 'logic_gates'
  | 'beam_bending'
  | 'otto_cycle'
  | 'pid_control'
  | 'fourier_series';

export interface ExperimentParameter {
  key: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  choices?: { label: string; value: number }[];
}

export interface ExperimentPreset {
  label: string;
  values: Record<string, number>;
}

export interface VivaQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface ExperimentSpec {
  id: string;
  code: string;
  title: string;
  gradeLevel: GradeLevel;
  subject: SubjectArea;
  subtopic: string;
  durationMin: number;
  engineId: SimulationEngineId;
  aim: string;
  formula: string;
  apparatus: string[];
  parameters: ExperimentParameter[];
  presets: ExperimentPreset[];
  observationColumns: string[];
  checkpoints: string[];
  quiz: VivaQuestion[];
}

export type FeedbackSeverity = 'nominal' | 'elevated' | 'critical' | 'verified';

export interface LiveFeedback {
  severity: FeedbackSeverity;
  statusLabel: string;
  headline: string;
  detail: string;
  checkpointIndicesMet: number[];
}

export interface SimulationReading {
  readouts: { label: string; value: string; unit?: string }[];
  observationRow: string[];
  theoreticalErrorPct: number;
  feedback: LiveFeedback;
}

export interface ObservationEntry {
  id: string;
  timestamp: string;
  values: string[];
  errorPct: number;
}

export interface StudentExperimentProgress {
  experimentId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  readings: ObservationEntry[];
  checkpointsCompleted: number[];
  quizAnswers: Record<number, number>;
  quizScorePct: number | null;
  accuracyPct: number;
  timeSpentSec: number;
  lastUpdated: string;
  teacherNote?: string;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  gradeLevel: GradeLevel;
  subject: SubjectArea;
  instructor: string;
  term: string;
  description: string;
  dueDate: string;
  passingAccuracyPct: number;
  experimentIds: string[];
  status: 'active' | 'draft' | 'archived';
  coverImage?: string;
}

export interface ClassroomStudent {
  id: string;
  name: string;
  email: string;
  gradeLevel: GradeLevel;
  batch: string;
  enrolledCourseIds: string[];
  completedExperimentIds: string[];
  avgAccuracyPct: number;
  totalReadings: number;
  lastActive: string;
  teacherRemarks: string;
}
