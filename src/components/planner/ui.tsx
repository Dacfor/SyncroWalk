import type { ComponentType, ReactNode } from 'react';

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
