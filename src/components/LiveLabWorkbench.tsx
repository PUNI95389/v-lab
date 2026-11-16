import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Info,
  Pause,
  Play,
  Plus,
  RotateCcw,
  ShieldAlert,
  StepForward,
  Trash2,
} from 'lucide-react';
import { GRADE_LEVELS, SYLLABUS_EXPERIMENTS } from '../data/syllabus';
import { evaluateSimulation } from '../simulations/evaluateSimulation';
import {
  handleCanvasPointerInteraction,
  renderSimulationCanvas,
} from '../simulations/renderSimulationCanvas';
import {
  ExperimentSpec,
  FeedbackSeverity,
  ObservationEntry,
  StudentExperimentProgress,
} from '../types/lab';

interface LiveLabWorkbenchProps {
  experiment: ExperimentSpec;
  progress: StudentExperimentProgress | undefined;
  onSelectExperiment: (id: string) => void;
  onRecordReading: (experimentId: string, entry: ObservationEntry, checkpointsMet: number[]) => void;
  onDeleteReading: (experimentId: string, readingId: string) => void;
  onUpdateCheckpoints: (experimentId: string, checkpoints: number[]) => void;
  onAnswerQuiz: (experimentId: string, questionIdx: number, answerIdx: number, scorePct: number) => void;
  onCompleteLab: (experimentId: string, accuracyPct: number) => void;
  onBackToCatalog: () => void;
}

function getDefaultParams(exp: ExperimentSpec): Record<string, number> {
  const obj: Record<string, number> = {};
  exp.parameters.forEach((p) => {
    obj[p.key] = p.defaultValue;
  });
  return obj;
}

export const LiveLabWorkbench: React.FC<LiveLabWorkbenchProps> = ({
  experiment,
  progress,
  onSelectExperiment,
  onRecordReading,
  onDeleteReading,
  onUpdateCheckpoints,
  onAnswerQuiz,
  onCompleteLab,
  onBackToCatalog,
}) => {
  const [params, setParams] = useState<Record<string, number>>(() => getDefaultParams(experiment));
  const [isRunning, setIsRunning] = useState(true);
  const [simTime, setSimTime] = useState(0);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const simTimeRef = useRef(0);
  const lastFrameRef = useRef<number | null>(null);

  // Reset parameters when switching experiment
  useEffect(() => {
    setParams(getDefaultParams(experiment));
    setIsRunning(true);
    simTimeRef.current = 0;
    setSimTime(0);
    lastFrameRef.current = null;
  }, [experiment]);

  const reading = useMemo(
    () => evaluateSimulation(experiment.engineId, params),
    [experiment.engineId, params]
  );

  // Sync newly detected checkpoints to student progress
  useEffect(() => {
    const existing = progress?.checkpointsCompleted ?? [];
    const metNow = reading.feedback.checkpointIndicesMet;
    const merged = Array.from(new Set([...existing, ...metNow])).sort((a, b) => a - b);
    if (merged.length > existing.length) {
      onUpdateCheckpoints(experiment.id, merged);
    }
  }, [experiment.id, progress?.checkpointsCompleted, reading.feedback.checkpointIndicesMet, onUpdateCheckpoints]);

  // 60fps canvas animation loop
  useEffect(() => {
    let rafId = 0;

    const drawFrame = (now: number) => {
      if (lastFrameRef.current === null) lastFrameRef.current = now;
      const dt = Math.min(0.05, (now - lastFrameRef.current) / 1000);
      lastFrameRef.current = now;

      if (isRunning) {
        simTimeRef.current += dt;
        setSimTime(simTimeRef.current);
      }

      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        const rect = container.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const cssW = Math.max(320, Math.floor(rect.width));
        const cssH = 380;
        if (canvas.width !== Math.floor(cssW * dpr) || canvas.height !== Math.floor(cssH * dpr)) {
          canvas.width = Math.floor(cssW * dpr);
          canvas.height = Math.floor(cssH * dpr);
          canvas.style.width = `${cssW}px`;
          canvas.style.height = `${cssH}px`;
        }
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();
          ctx.scale(dpr, dpr);
          renderSimulationCanvas(ctx, cssW, cssH, experiment.engineId, params, simTimeRef.current);
          ctx.restore();
        }
      }
      rafId = requestAnimationFrame(drawFrame);
    };

    rafId = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(rafId);
  }, [experiment.engineId, isRunning, params]);

  const handleParamChange = useCallback((key: string, val: number) => {
    setParams((prev) => ({ ...prev, [key]: val }));
  }, []);

  const handlePointerEvent = (e: React.PointerEvent<HTMLCanvasElement>, isClick: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;
    handleCanvasPointerInteraction(
      experiment.engineId,
      relX,
      relY,
      rect.width,
      rect.height,
      params,
      handleParamChange,
      isClick
    );
  };

  const handleRecord = () => {
    const now = new Date();
    const ts = now.toTimeString().slice(0, 8);
    const entry: ObservationEntry = {
      id: `obs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: ts,
      values: reading.observationRow,
      errorPct: reading.theoreticalErrorPct,
    };
    onRecordReading(experiment.id, entry, reading.feedback.checkpointIndicesMet);
  };

  const handleStep = () => {
    setIsRunning(false);
    simTimeRef.current += 0.2;
    setSimTime(simTimeRef.current);
  };

  const handleReset = () => {
    setParams(getDefaultParams(experiment));
    simTimeRef.current = 0;
    setSimTime(0);
    setIsRunning(true);
  };

  const handleExportCsv = () => {
    const rows = progress?.readings ?? [];
    if (rows.length === 0) return;
    const headers = ['Trial', 'Timestamp', ...experiment.observationColumns, 'Error (%)'];
    const lines = [
      headers.join(','),
      ...rows.map((r, i) =>
        [i + 1, r.timestamp, ...r.values.map((v) => `"${v}"`), r.errorPct].join(',')
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${experiment.code.toLowerCase()}-observations.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleQuizOption = (qIdx: number, optIdx: number) => {
    const updatedAnswers = { ...(progress?.quizAnswers ?? {}), [qIdx]: optIdx };
    const correctCount = experiment.quiz.reduce(
      (acc, q, idx) => (updatedAnswers[idx] === q.correctIndex ? acc + 1 : acc),
      0
    );
    const scorePct = Math.round((correctCount / experiment.quiz.length) * 100);
    onAnswerQuiz(experiment.id, qIdx, optIdx, scorePct);
  };

  const expIndex = SYLLABUS_EXPERIMENTS.findIndex((e) => e.id === experiment.id);
  const prevExp = expIndex > 0 ? SYLLABUS_EXPERIMENTS[expIndex - 1] : null;
  const nextExp =
    expIndex >= 0 && expIndex < SYLLABUS_EXPERIMENTS.length - 1
      ? SYLLABUS_EXPERIMENTS[expIndex + 1]
      : null;

  const checkpointsDone = progress?.checkpointsCompleted ?? [];
  const observations = progress?.readings ?? [];
  const quizAnswers = progress?.quizAnswers ?? {};

  const computedAccuracy = useMemo(() => {
    const cpRatio = checkpointsDone.length / experiment.checkpoints.length;
    const obsScore = Math.min(1, observations.length / 2);
    const quizRatio =
      progress?.quizScorePct !== null && progress?.quizScorePct !== undefined
        ? progress.quizScorePct / 100
        : 0.7;
    const avgErr =
      observations.length > 0
        ? observations.reduce((s, o) => s + o.errorPct, 0) / observations.length
        : reading.theoreticalErrorPct;
    const raw = (cpRatio * 0.4 + obsScore * 0.3 + quizRatio * 0.3) * 100 - Math.min(8, avgErr * 0.25);
    return Math.max(60, Math.min(100, Number(raw.toFixed(1))));
  }, [
    checkpointsDone.length,
    experiment.checkpoints.length,
    observations,
    progress?.quizScorePct,
    reading.theoreticalErrorPct,
  ]);

  const severityStyle: Record<
    FeedbackSeverity,
    { box: string; icon: React.ReactNode; labelColor: string }
  > = {
    verified: {
      box: 'bg-emerald-50/70 border-emerald-200',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />,
      labelColor: 'text-emerald-800',
    },
    nominal: {
      box: 'bg-sky-50/70 border-sky-200',
      icon: <Info className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />,
      labelColor: 'text-sky-800',
    },
    elevated: {
      box: 'bg-amber-50/70 border-amber-200',
      icon: <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />,
      labelColor: 'text-amber-800',
    },
    critical: {
      box: 'bg-red-50/70 border-red-200',
      icon: <ShieldAlert className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />,
      labelColor: 'text-red-800',
    },
  };

  const activeSev = severityStyle[reading.feedback.severity];

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Contextual Breadcrumb & Experiment Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <button
              type="button"
              onClick={onBackToCatalog}
              className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Catalog</span>
            </button>
            <span aria-hidden="true">/</span>
            <span>{experiment.gradeLevel}</span>
            <span aria-hidden="true">/</span>
            <span>{experiment.subject}</span>
            <span aria-hidden="true">/</span>
            <span className="font-mono text-slate-700">{experiment.code}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {experiment.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">{experiment.aim}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <select
            aria-label="Switch active experiment"
            value={experiment.id}
            onChange={(e) => onSelectExperiment(e.target.value)}
            className="text-xs font-medium bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 max-w-[260px] focus:outline-none focus:ring-2 focus:ring-sky-600"
          >
            {GRADE_LEVELS.map((lvl) => (
              <optgroup key={lvl} label={lvl}>
                {SYLLABUS_EXPERIMENTS.filter((ex) => ex.gradeLevel === lvl).map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.code} · {ex.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          <button
            type="button"
            disabled={!prevExp}
            onClick={() => prevExp && onSelectExperiment(prevExp.id)}
            title="Previous Experiment"
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={!nextExp}
            onClick={() => nextExp && onSelectExperiment(nextExp.id)}
            title="Next Experiment"
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Two-Zone Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT ZONE (65% -> 8 cols): Interactive Canvas + Readouts + Observation Log */}
        <div className="lg:col-span-8 space-y-5">
          {/* Interactive Stage */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
              <div className="flex items-center gap-3 text-xs">
                <span className="font-semibold text-slate-900">Live Simulation Stage</span>
                <span aria-hidden="true" className="text-slate-300">|</span>
                <span className="font-mono text-sky-800">{experiment.formula}</span>
              </div>
              <div className="text-xs font-mono text-slate-500 tabular-nums">
                t = {simTime.toFixed(1)} s
              </div>
            </div>

            <div ref={containerRef} className="w-full relative bg-white">
              <canvas
                ref={canvasRef}
                onPointerDown={(e) => {
                  setIsDraggingCanvas(true);
                  handlePointerEvent(e, true);
                }}
                onPointerMove={(e) => {
                  if (isDraggingCanvas) handlePointerEvent(e, false);
                }}
                onPointerUp={() => setIsDraggingCanvas(false)}
                onPointerLeave={() => setIsDraggingCanvas(false)}
                className="block w-full touch-none cursor-crosshair"
              />
            </div>

            {/* Playback & Data Logging Toolbar */}
            <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsRunning((r) => !r)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-800 hover:bg-slate-100 rounded-md cursor-pointer whitespace-nowrap shrink-0"
                >
                  {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isRunning ? 'Pause' : 'Resume'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleStep}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-800 hover:bg-slate-100 rounded-md cursor-pointer whitespace-nowrap shrink-0"
                >
                  <StepForward className="w-3.5 h-3.5" />
                  <span>Step</span>
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-800 hover:bg-slate-100 rounded-md cursor-pointer whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleRecord}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-md cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Record Reading</span>
                </button>
                <button
                  type="button"
                  onClick={() => onCompleteLab(experiment.id, computedAccuracy)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md cursor-pointer whitespace-nowrap shrink-0 ${
                    progress?.status === 'completed'
                      ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {progress?.status === 'completed' ? 'Verified in Progress' : 'Complete & Verify Lab'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* 4-Column Live Instrument Readouts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white border border-slate-200 rounded-xl p-4">
            {reading.readouts.map((ro) => (
              <div key={ro.label} className="space-y-0.5">
                <div className="text-xs text-slate-500">{ro.label}</div>
                <div className="text-lg font-semibold text-slate-900 font-mono tabular-nums">
                  {ro.value}
                  {ro.unit ? <span className="text-xs text-slate-500 ml-1">{ro.unit}</span> : null}
                </div>
              </div>
            ))}
          </div>

          {/* Observation Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Observation Log ({observations.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Click Record Reading during live runs to capture data points for your lab report.
                </p>
              </div>
              <button
                type="button"
                disabled={observations.length === 0}
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download CSV</span>
              </button>
            </div>

            {observations.length === 0 ? (
              <div className="p-6 text-center space-y-2">
                <p className="text-xs text-slate-600">
                  No readings recorded yet. Adjust apparatus parameters and press Record Reading.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                      <th className="py-2.5 px-3 font-medium">#</th>
                      <th className="py-2.5 px-3 font-medium">Time</th>
                      {experiment.observationColumns.map((col) => (
                        <th key={col} className="py-2.5 px-3 font-medium">
                          {col}
                        </th>
                      ))}
                      <th className="py-2.5 px-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                    {observations.map((row, idx) => (
                      <tr key={row.id} className="hover:bg-slate-50/80">
                        <td className="py-2 px-3 text-slate-500">{idx + 1}</td>
                        <td className="py-2 px-3 text-slate-500">{row.timestamp}</td>
                        {row.values.map((val, cIdx) => (
                          <td key={cIdx} className="py-2 px-3 text-slate-900">
                            {val}
                          </td>
                        ))}
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => onDeleteReading(experiment.id, row.id)}
                            aria-label="Remove reading"
                            className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT ZONE (35% -> 4 cols): Real-Time Feedback + Controls + Checkpoints + Viva */}
        <div className="lg:col-span-4 space-y-5">
          {/* Real-Time Scientific Feedback */}
          <div className={`border rounded-xl p-4 space-y-2 ${activeSev.box}`}>
            <div className="flex items-start gap-2.5">
              {activeSev.icon}
              <div className="space-y-1">
                <div className={`text-xs font-semibold ${activeSev.labelColor}`}>
                  {reading.feedback.statusLabel}
                </div>
                <div className="text-sm font-semibold text-slate-900 leading-snug">
                  {reading.feedback.headline}
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">{reading.feedback.detail}</p>
              </div>
            </div>
          </div>

          {/* Parameter Controls & Presets */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Apparatus Controls</h2>
              <span className="text-xs text-slate-500 font-mono tabular-nums">
                Est. Accuracy {computedAccuracy}%
              </span>
            </div>

            {experiment.presets.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs text-slate-500">Quick Stages</div>
                <div className="flex flex-wrap gap-1.5">
                  {experiment.presets.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setParams(preset.values)}
                      className="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4 pt-1">
              {experiment.parameters.map((param) => {
                const curVal = params[param.key] ?? param.defaultValue;
                return (
                  <div key={param.key} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <label htmlFor={`param-${param.key}`} className="font-medium text-slate-700">
                        {param.label}
                      </label>
                      <span className="font-mono font-semibold text-slate-900 tabular-nums">
                        {curVal} {param.unit}
                      </span>
                    </div>

                    <input
                      id={`param-${param.key}`}
                      type="range"
                      min={param.min}
                      max={param.max}
                      step={param.step}
                      value={curVal}
                      onChange={(e) => handleParamChange(param.key, Number(e.target.value))}
                      className="lab-slider"
                    />

                    {param.choices && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {param.choices.map((ch) => (
                          <button
                            key={ch.label}
                            type="button"
                            onClick={() => handleParamChange(param.key, ch.value)}
                            className={`px-2 py-1 text-xs rounded border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                              Math.abs(curVal - ch.value) < 0.001
                                ? 'bg-sky-50 border-sky-600 text-sky-800 font-medium'
                                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {ch.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Guided Checkpoints */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Syllabus Checkpoints</h2>
              <span className="text-xs font-mono text-slate-600 tabular-nums">
                {checkpointsDone.length}/{experiment.checkpoints.length}
              </span>
            </div>
            <ul className="space-y-2.5">
              {experiment.checkpoints.map((cp, idx) => {
                const done = checkpointsDone.includes(idx);
                return (
                  <li key={idx} className="flex items-start gap-2.5 text-xs">
                    <CheckCircle2
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        done ? 'text-emerald-600' : 'text-slate-300'
                      }`}
                    />
                    <span className={done ? 'text-slate-900 font-medium' : 'text-slate-600'}>
                      {cp}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Lab Viva Concept Check */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Lab Viva Check</h2>
              {progress?.quizScorePct !== null && progress?.quizScorePct !== undefined && (
                <span className="text-xs font-mono text-emerald-700 font-semibold tabular-nums">
                  Score: {progress.quizScorePct}%
                </span>
              )}
            </div>

            <div className="space-y-4">
              {experiment.quiz.map((q, qIdx) => {
                const chosen = quizAnswers[qIdx];
                const answered = chosen !== undefined;
                const isCorrect = chosen === q.correctIndex;
                return (
                  <div key={qIdx} className="space-y-2 pt-2 border-t border-slate-100 first:border-t-0 first:pt-0">
                    <p className="text-xs font-medium text-slate-900 leading-relaxed">
                      {qIdx + 1}. {q.question}
                    </p>
                    <div className="space-y-1.5">
                      {q.options.map((opt, optIdx) => {
                        const isSelected = chosen === optIdx;
                        const btnStyle =
                          isSelected && isCorrect
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-medium'
                            : isSelected && !isCorrect
                            ? 'bg-red-50 border-red-400 text-red-900'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50';
                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => handleQuizOption(qIdx, optIdx)}
                            className={`w-full text-left px-3 py-2 text-xs border rounded-lg transition-colors cursor-pointer ${btnStyle}`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                    {answered && (
                      <p className={`text-xs ${isCorrect ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {isCorrect ? 'Correct: ' : 'Note: '}
                        {q.explanation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Apparatus Reference */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
            <h2 className="text-xs font-semibold text-slate-900">Standard Apparatus</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              {experiment.apparatus.join(' · ')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
