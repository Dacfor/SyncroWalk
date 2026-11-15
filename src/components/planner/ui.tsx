import type { ComponentType, KeyboardEvent, ReactNode } from 'react';
import { Check } from 'lucide-react';

// Operations-console building blocks shared by the three role panels
// (look: Astro UX Design System — docked windows, dense rows, status colours only).

/**
 * Docked window: compact header (icon, TITLE in caps, context in mono) with the counter
 * and the actions on the right, then the body.
 */
export function Card({
  eyebrow,
  title,
  subtitle,
  icon: Icon,
  aside,
  highlight = false,
  children
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  aside?: ReactNode;
  highlight?: boolean;
  children?: ReactNode;
}) {
  return (
    <section className={`mh-panel ${highlight ? 'is-highlight' : ''}`}>
      <header className="mh-panel__head">
        {Icon && <Icon aria-hidden={true} />}
        <h2 className="mh-panel__title">{title}</h2>
        {eyebrow && <span className="mh-panel__meta">{eyebrow}</span>}
        {aside && <div className="mh-panel__actions">{aside}</div>}
      </header>
      <div className="mh-panel__body">
        {subtitle && <p className="mh-panel__sub">{subtitle}</p>}
        {children}
      </div>
    </section>
  );
}

/** Label + value. Values are numbers, times or coordinates most of the time: monospace, tabular. */
export function Stat({ label, value, tile = false }: { label: ReactNode; value: ReactNode; tile?: boolean }) {
  return (
    <span className={`flex flex-col gap-0.5 min-w-0 ${tile ? 'mh-tile' : ''}`}>
      <span className="mh-stat-label">{label}</span>
      <span className="mh-num text-[13px] font-medium">{value}</span>
    </span>
  );
}

export function Label({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mh-label">
      {children}
    </label>
  );
}

/** Segmented choice (radio group): joined rectangular buttons. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="mh-segmented self-start" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Check mark box used by toggles (state is never shown by colour alone). */
export function CheckBox({ on }: { on: boolean }) {
  return (
    <span className={`mh-check ${on ? 'is-on' : ''}`} aria-hidden="true">
      {on && <Check />}
    </span>
  );
}

/** Toggle chip with an explicit on/off state. */
export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={`mh-btn mh-toggle ${on ? 'is-on' : ''}`}>
      <CheckBox on={on} />
      <span>{children}</span>
    </button>
  );
}

// Plan status: draft = standby, changed = serious (needs action), sent = normal
export const STATUS_META = {
  draft: { label: 'Draft', cls: 'mh-pill--info' },
  changed: { label: 'Changed · not sent', cls: 'mh-pill--warn' },
  sent: { label: 'Sent', cls: 'mh-pill--ok' }
} as const;

export interface PanelTab<T extends string> {
  id: T;
  label: string;
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  badge?: ReactNode;
}

/**
 * Role menu: a compact tab strip that chooses which window is shown in the side column.
 * Sticky so it stays reachable while the column scrolls. Arrow keys move between tabs.
 */
export function PanelTabs<T extends string>({
  label,
  tabs,
  value,
  onChange
}: {
  label: string;
  tabs: PanelTab<T>[];
  value: T;
  onChange: (id: T) => void;
}) {
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const idx = tabs.findIndex((t) => t.id === value);
    const next = tabs[(idx + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
    onChange(next.id);
    document.getElementById(`tab-${next.id}`)?.focus();
  };

  return (
    <nav className="lg:sticky lg:top-0 z-20" aria-label={label}>
      <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className="mh-tabs">
        {tabs.map((t) => {
          const active = t.id === value;
          return (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`tabpanel-${t.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(t.id)}
              className="mh-tab"
            >
              <t.icon aria-hidden={true} />
              <span>{t.label}</span>
              {t.badge !== undefined && t.badge !== null && t.badge !== 0 && <span className="mh-count">{t.badge}</span>}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function TabPanel({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div role="tabpanel" id={`tabpanel-${id}`} aria-labelledby={`tab-${id}`} className="flex flex-col gap-2">
      {children}
    </div>
  );
}
