import { ArrowRight, GitBranch, Wand2 } from 'lucide-react';
import { SimBadge } from './analysisUi.tsx';
import type { PlanSummary, ReplanStep, ReplanStepCode } from './model.ts';

// NO-GO → replan: the strategy steps and the before / after comparison.
// Shared by the "Suggested replan" card (not applied yet) and the "Last replan" record.

const STEP_LABEL: Record<ReplanStepCode, string> = {
  crew: 'Crew',
  a: 'a · Drop POI',
  b: 'b · Shorten',
  c: 'c · Shelter',
  d: 'd · Postpone',
  sci: 'Science'
};

const verdict = (s: PlanSummary) =>
  s.overall === 'violated' ? { label: 'NO-GO', cls: 'mh-pill--crit' } : s.overall === 'watch' ? { label: 'GO · watch', cls: 'mh-pill--warn' } : { label: 'GO', cls: 'mh-pill--ok' };

export function ReplanSteps({ steps }: { steps: ReplanStep[] }) {
  if (!steps.length) return null;
  return (
    <ol className="m-0 p-0 list-none flex flex-col gap-1.5">
      {steps.map((st, i) => (
        <li key={i} className="flex items-start gap-2 text-base">
          <span className="mh-step-code shrink-0">{STEP_LABEL[st.code]}</span>
          <span>{st.text}</span>
        </li>
      ))}
    </ol>
  );
}

export function ReplanCompare({ before, after, fromVersion, toVersion }: { before: PlanSummary; after: PlanSummary; fromVersion: number; toVersion: number }) {
  const rows: [string, string, string][] = [
    ['Sol', `Sol ${before.sol}`, `Sol ${after.sol}`],
    ['POIs', before.poiIds.join(' → ') || '—', after.poiIds.join(' → ') || '—'],
    ['EVA pair', before.pair.map((n) => n.split(' ').slice(-1)[0]).join(' + '), after.pair.map((n) => n.split(' ').slice(-1)[0]).join(' + ')],
    ['Distance', `${before.km.toFixed(2)} km`, `${after.km.toFixed(2)} km`],
    ['Duration', `${before.durationMin} min`, `${after.durationMin} min`],
    ['Return buffer', `${before.bufferMin} min`, `${after.bufferMin} min`],
    ['Max time to shelter', `${Math.round(before.shelterMin)} min`, `${Math.round(after.shelterMin)} min${after.viaShelter ? ' · via shelter' : ''}`],
    ['EVA dose', `${before.doseMsv.toFixed(2)} mSv`, `${after.doseMsv.toFixed(2)} mSv`],
    ['Constraints violated', before.violated.length ? `${before.violated.length}: ${before.violated.join('; ')}` : 'none', after.violated.length ? `${after.violated.length}: ${after.violated.join('; ')}` : 'none']
  ];
  const vb = verdict(before);
  const va = verdict(after);
  return (
    <div className="mh-table-wrap">
      <table className="mh-table mh-table--compact">
        <thead>
          <tr>
            <th scope="col"></th>
            <th scope="col">
              Before · v{fromVersion} <span className={`mh-pill ${vb.cls} ml-1`}>{vb.label}</span>
            </th>
            <th scope="col">
              After · v{toVersion} <span className={`mh-pill ${va.cls} ml-1`}>{va.label}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([k, b, a]) => (
            <tr key={k}>
              <th scope="row">{k}</th>
              <td className="text-mh-text2">{b}</td>
              <td className={a !== b ? 'font-semibold' : ''}>{a}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Card for a replan: suggested (with the Apply button) or already applied (record). */
export function ReplanCard({
  title,
  reason,
  steps,
  before,
  after,
  fromVersion,
  toVersion,
  ok = true,
  onApply,
  footer
}: {
  title: string;
  reason: string;
  steps: ReplanStep[];
  before: PlanSummary;
  after: PlanSummary;
  fromVersion: number;
  toVersion: number;
  ok?: boolean;
  onApply?: () => void;
  footer?: string;
}) {
  return (
    <section className="mh-replan flex flex-col gap-3" aria-label={title}>
      <div className="flex flex-wrap items-center gap-2">
        {onApply ? <Wand2 className="w-5 h-5 shrink-0" aria-hidden="true" /> : <GitBranch className="w-5 h-5 shrink-0" aria-hidden="true" />}
        <strong className="text-[17px]">{title}</strong>
        <span className="font-mono text-[13px] text-mh-text2 flex items-center gap-1">
          v{fromVersion} <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" /> v{toVersion}
        </span>
        <SimBadge label="demo model" />
      </div>
      <p className="m-0 text-base">
        <strong>Why:</strong> {reason}
      </p>
      {ok ? (
        <>
          <ReplanSteps steps={steps} />
          <ReplanCompare before={before} after={after} fromVersion={fromVersion} toVersion={toVersion} />
          {onApply && (
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className="mh-btn mh-btn--primary" onClick={onApply}>
                <Wand2 className="w-5 h-5" /> Apply replan
              </button>
              <span className="text-base text-mh-text2">Creates plan v{toVersion} and writes the reason in the mission log. It still needs approval.</span>
            </div>
          )}
        </>
      ) : (
        <p className="m-0 text-base">
          No compliant plan found by dropping a stop, shortening time on site, diverting via a shelter or postponing. Remove the
          stop that breaks the constraint, or ask the Scientist for an alternative target.
        </p>
      )}
      {footer && <p className="m-0 text-base text-mh-text2">{footer}</p>}
    </section>
  );
}
