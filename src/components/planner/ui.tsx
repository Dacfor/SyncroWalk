import type { ComponentType, KeyboardEvent, ReactNode } from 'react';

// Small Mission Hub layout helpers shared by the three role panels.

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
    <section
      className={`bg-mh-card rounded-mh-lg shadow-mh p-5 sm:p-6 flex flex-col gap-4 ${
        highlight ? 'ring-2 ring-mh-primary' : ''
      }`}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          {eyebrow && <span className="mh-eyebrow">{eyebrow}</span>}
          <h2 className="m-0 text-[22px] leading-tight font-bold flex items-start gap-2">
            {Icon && (
              <Icon className="w-6 h-6 mt-0.5 shrink-0 text-mh-primary dark:text-mh-link" aria-hidden={true} />
            )}
            <span>{title}</span>
          </h2>
          {subtitle && <p className="m-0 text-base text-mh-text2">{subtitle}</p>}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </header>
      {children}
    </section>
  );
}

export function Stat({ label, value, tile = false }: { label: ReactNode; value: ReactNode; tile?: boolean }) {
  return (
    <span className={`flex flex-col gap-0.5 ${tile ? 'mh-tile' : ''}`}>
      <span className="font-mono text-[13px] uppercase tracking-[0.08em] text-mh-text2">{label}</span>
      <span className="text-base font-semibold">{value}</span>
    </span>
  );
}

export function Label({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mh-label !text-base">
      {children}
    </label>
  );
}

/** iOS-style segmented choice (radio group). */
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
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className="!px-4"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Toggle chip with an explicit on/off state (never colour alone). */
export function Chip({
  on,
  onClick,
  children
}: {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`mh-btn !px-4 !font-medium ${on ? 'mh-btn--tinted' : 'bg-mh-fill text-mh-text2'}`}
    >
      <span
        className={`w-5 h-5 rounded-full border-2 border-current flex items-center justify-center text-xs ${
          on ? 'bg-current' : ''
        }`}
        aria-hidden="true"
      >
        {on && <span className="text-mh-card">✓</span>}
      </span>
      <span>{children}</span>
    </button>
  );
}

export const STATUS_META = {
  draft: { label: 'Draft', cls: 'mh-pill--warn' },
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
 * Role menu: chooses which panel (actions / views) is shown in the side column.
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
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="bg-mh-card rounded-mh-lg shadow-mh p-1.5 grid gap-1"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
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
              className={`min-h-14 px-2 py-2 rounded-mh-md border-0 cursor-pointer flex flex-col items-center justify-center gap-1 text-center transition-colors ${
                active
                  ? 'bg-mh-primary text-mh-on-primary shadow-mh-btn'
                  : 'bg-transparent text-mh-text2 hover:bg-mh-fill hover:text-mh-text'
              }`}
            >
              <span className="relative">
                <t.icon className="w-5 h-5" aria-hidden={true} />
                {t.badge !== undefined && t.badge !== null && t.badge !== 0 && (
                  <span className="absolute -top-2 -right-3 min-w-5 h-5 px-1 rounded-full bg-mh-accent text-white font-mono text-xs flex items-center justify-center">
                    {t.badge}
                  </span>
                )}
              </span>
              <span className="text-[15px] font-semibold leading-tight">{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function TabPanel({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div role="tabpanel" id={`tabpanel-${id}`} aria-labelledby={`tab-${id}`} className="flex flex-col gap-5 sm:gap-6">
      {children}
    </div>
  );
}
