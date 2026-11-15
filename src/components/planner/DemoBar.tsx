import { ChevronRight, Pause, Play, Square } from 'lucide-react';

/**
 * Control bar of the scripted demo: step counter, step title, progress and the controls
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
  return (
    <div className="fixed inset-x-0 bottom-0 z-[1300] pointer-events-none flex justify-center px-4 pb-12" role="status" aria-live="polite">
      <div className="pointer-events-auto rounded-mh-md shadow-mh ring-1 ring-white/15 bg-[#0A0A0A]/92 text-white backdrop-blur-sm overflow-hidden">
        <div className="h-1 bg-white/15">
          <div className="h-full bg-[#FF6B35] transition-[width] duration-300 ease-linear" style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }} />
        </div>
        <div className="px-4 py-2 flex items-center gap-4">
          <span className="font-mono text-[15px] text-white/70 shrink-0">
            {step}/{total}
          </span>
          <span className="text-[17px] font-semibold whitespace-nowrap">{title}</span>
          <span className="flex items-center gap-1 shrink-0">
            <button type="button" className="mh-btn mh-btn--icon !bg-white/10 !text-white" onClick={onTogglePause} title={paused ? 'Resume (Space)' : 'Pause (Space)'} aria-label={paused ? 'Resume demo' : 'Pause demo'}>
              {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
            <button type="button" className="mh-btn mh-btn--icon !bg-white/10 !text-white" onClick={onNext} title="Next step (→)" aria-label="Next demo step">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button type="button" className="mh-btn mh-btn--icon !bg-white/10 !text-white" onClick={onStop} title="Stop the demo (Esc)" aria-label="Stop demo">
              <Square className="w-4 h-4" />
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
