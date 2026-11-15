import { ChevronRight, Pause, Play, Square } from 'lucide-react';

/**
 * Scripted demo controls, shown in the bottom status bar (right before "Last update") while the demo
 * runs: step counter, step title, progress and the controls
 * (Esc stops, → skips to the next step, Space pauses / resumes).
 */
export default function DemoBar({
  step,
  total,
  title,
  progress,
  paused,
  onNext,
  onTogglePause,
  onStop
}: {
  step: number;
  total: number;
  title: string;
  progress: number; // 0 … 1
  paused: boolean;
  onNext: () => void;
  onTogglePause: () => void;
  onStop: () => void;
}) {
  const btn = 'inline-flex items-center justify-center w-6 h-6 rounded-mh-sm bg-mh-nav-fill text-mh-nav-text hover:opacity-80';
  return (
    <span
      className="inline-flex items-center gap-2 shrink-0 min-h-7 px-3 border-r border-mh-nav-fill"
      role="status"
      aria-live="polite"
      aria-label="Scripted demo"
    >
      <span className="font-mono text-[12px] text-[#FF6B35] font-semibold">DEMO</span>
      <span className="font-mono text-[12px] text-mh-nav-text2 tabular-nums">
        {step}/{total}
      </span>
      <strong className="text-[13px] font-semibold text-mh-nav-text">{title}</strong>
      <span className="w-24 h-1 rounded-full bg-mh-nav-fill overflow-hidden" aria-hidden="true">
        <span className="block h-full bg-[#FF6B35] transition-[width] duration-300 ease-linear" style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }} />
      </span>
      <span className="inline-flex items-center gap-1">
        <button type="button" className={btn} onClick={onTogglePause} title={paused ? 'Resume (Space)' : 'Pause (Space)'} aria-label={paused ? 'Resume demo' : 'Pause demo'}>
          {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
        </button>
        <button type="button" className={btn} onClick={onNext} title="Next step (→)" aria-label="Next demo step">
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <button type="button" className={btn} onClick={onStop} title="Stop the demo (Esc)" aria-label="Stop demo">
          <Square className="w-3.5 h-3.5" />
        </button>
      </span>
    </span>
  );
}
