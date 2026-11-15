import { useEffect, useRef, useState } from 'react';
import type { ComponentType, KeyboardEvent, SVGProps } from 'react';
import { Check, ChevronDown, Database, RotateCcw, FlaskConical, SquareTerminal } from 'lucide-react';
import { AstronautIcon } from './icons.tsx';
import type { Role } from './model.ts';

export const ROLES: { id: Role; label: string; description: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { id: 'scientist', label: 'Scientist', description: 'Defines points of interest', Icon: FlaskConical },
  { id: 'control', label: 'Mission Control', description: 'Plans routes and the calendar', Icon: SquareTerminal },
  { id: 'astronaut', label: 'Astronaut', description: 'Follows the daily EVA', Icon: AstronautIcon }
];

/**
 * User icon + current role in the navbar. Opens a menu to switch the simulated user.
 * No authentication yet: switching role is immediate.
 */
export default function UserMenu({
  role,
  onSelect,
  pendingMissions,
  onResetDemo,
  onOpenEvidence
}: {
  role: Role;
  onSelect: (role: Role) => void;
  pendingMissions: number;
  onResetDemo: () => void;
  onOpenEvidence: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = ROLES.find((r) => r.id === role) ?? ROLES[0];

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
    if (open) itemRefs.current[ROLES.findIndex((r) => r.id === role)]?.focus();
  }, [open, role]);

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
      const next = (idx + (e.key === 'ArrowDown' ? 1 : -1) + ROLES.length) % ROLES.length;
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
        title="Switch user"
      >
        <span className="w-8 h-8 rounded-full bg-mh-nav-text text-mh-nav flex items-center justify-center shrink-0">
          <current.Icon className="w-4 h-4" aria-hidden="true" />
        </span>
        <span className="flex flex-col items-start leading-tight text-left">
          {/* <span className="font-mono text-[13px] text-mh-nav-text2">Signed in as</span> */}
          <span className="font-semibold">{current.label}</span>
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Switch user"
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 top-full mt-2 w-[min(20rem,calc(100vw-2rem))] z-[1100] bg-mh-card text-mh-text rounded-mh-md shadow-mh ring-1 ring-mh-sep p-2 flex flex-col gap-1"
        >
          <div className="px-3 pt-2 pb-1 flex flex-col gap-0.5">
            <span className="mh-eyebrow">Switch user</span>
            <span className="text-base text-mh-text2">Demo only — no authentication yet</span>
          </div>
          {ROLES.map((r, i) => {
            const active = r.id === role;
            return (
              <button
                key={r.id}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  if (!active) onSelect(r.id);
                  close();
                }}
                className={`w-full min-h-14 px-3 py-2 rounded-mh-sm border-0 text-left cursor-pointer flex items-center gap-3 text-mh-text focus-visible:outline-3 ${active ? 'bg-mh-fill-blue' : 'bg-transparent hover:bg-mh-fill'
                  }`}
              >
                <r.Icon className="w-5 h-5 shrink-0 text-mh-primary dark:text-mh-link" aria-hidden="true" />
                <span className="flex-1 min-w-0 flex flex-col">
                  <span className="text-base font-semibold flex items-center gap-2">
                    {r.label}
                    {r.id === 'control' && pendingMissions > 0 && (
                      <span className="mh-pill mh-pill--warn">{pendingMissions} unsent</span>
                    )}
                  </span>
                  <span className="text-base text-mh-text2">{r.description}</span>
                </span>
                {active && <Check className="w-5 h-5 shrink-0 text-mh-primary dark:text-mh-link" aria-label="Current user" />}
              </button>
            );
          })}
          <div className="border-t border-mh-sep mt-1 pt-1 flex flex-col gap-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onOpenEvidence();
              }}
              className="w-full min-h-11 px-3 py-2 rounded-mh-sm border-0 text-left cursor-pointer flex items-center gap-3 text-mh-text bg-transparent hover:bg-mh-fill"
              title="NASA Trek, USGS & PDS sources of every map layer"
            >
              <Database className="w-5 h-5 shrink-0 text-mh-text2" aria-hidden="true" />
              <span className="flex flex-col">
                <span className="text-base font-semibold">Evidence</span>
                <span className="text-base text-mh-text2">Data sources, resolution and limits</span>
              </span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onResetDemo();
                close();
              }}
              className="w-full min-h-11 px-3 py-2 rounded-mh-sm border-0 text-left cursor-pointer flex items-center gap-3 text-mh-text bg-transparent hover:bg-mh-fill"
              title="Restore the seed data and the default layers"
            >
              <RotateCcw className="w-5 h-5 shrink-0 text-mh-text2" aria-hidden="true" />
              <span className="flex flex-col">
                <span className="text-base font-semibold">Reset demo</span>
                <span className="text-base text-mh-text2">Seed data, all optional layers off</span>
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
