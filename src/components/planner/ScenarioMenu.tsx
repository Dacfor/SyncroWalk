import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Check, ChevronDown, History } from 'lucide-react';
import { SCENARIOS } from './scenarios/index.ts';

/**
 * Scenario selector in the navbar, same look and behaviour as the user menu.
 * Each scenario loads a complete (simulated) history and resets the filters.
 */
export default function ScenarioMenu({ value, onSelect }: { value: string; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = SCENARIOS.find((s) => s.id === value) ?? SCENARIOS[0];

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Focus the active item when the menu opens
  useEffect(() => {
    if (open) itemRefs.current[SCENARIOS.findIndex((s) => s.id === value)]?.focus();
  }, [open, value]);

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onMenuKeyDown = (e: KeyboardEvent) => {
    const idx = itemRefs.current.findIndex((el) => el === document.activeElement);
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = (idx + (e.key === 'ArrowDown' ? 1 : -1) + SCENARIOS.length) % SCENARIOS.length;
      itemRefs.current[next]?.focus();
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="mh-btn bg-mh-nav-fill text-mh-nav-text h-11 !py-0 !pl-1.5 !pr-4 !gap-2.5"
        title={current.summary}
      >
        <span className="w-8 h-8 rounded-full bg-mh-nav-text text-mh-nav flex items-center justify-center shrink-0">
          <History className="w-4 h-4" aria-hidden="true" />
        </span>
        <span className="font-semibold">{current.label}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Choose scenario"
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 top-full mt-2 w-[min(24rem,calc(100vw-2rem))] z-[1100] bg-mh-card text-mh-text rounded-mh-md shadow-mh ring-1 ring-mh-sep p-2 flex flex-col gap-1"
        >
          <div className="px-3 pt-2 pb-1 flex flex-col gap-0.5">
            <span className="mh-eyebrow">Scenario</span>
            <span className="text-base text-mh-text2">Loads a simulated history and resets the layers</span>
          </div>
          {SCENARIOS.map((s, i) => {
            const active = s.id === value;
            return (
              <button
                key={s.id}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  if (!active) onSelect(s.id);
                  close();
                }}
                className={`w-full min-h-14 px-3 py-2 rounded-mh-sm border-0 text-left cursor-pointer flex items-center gap-3 text-mh-text focus-visible:outline-3 ${
                  active ? 'bg-mh-fill-blue' : 'bg-transparent hover:bg-mh-fill'
                }`}
              >
                <span className="flex-1 min-w-0 flex flex-col">
                  <span className="text-base font-semibold">{s.label}</span>
                  <span className="text-base text-mh-text2">{s.summary}</span>
                </span>
                {active && <Check className="w-5 h-5 shrink-0 text-mh-primary dark:text-mh-link" aria-label="Current scenario" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
