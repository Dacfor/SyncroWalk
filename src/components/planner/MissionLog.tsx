import { useState } from 'react';
import { ScrollText } from 'lucide-react';
import { SimBadge } from './analysisUi.tsx';
import { Card } from './ui.tsx';
import { solDate } from './model.ts';
import type { LogType, PlannerState } from './model.ts';

// Mission log (Mission Control and Scientist): one row per decision, grouped by sol, with the
// plan version, the evidence that drove it, the decision, who approved it and the outcome.

const TYPE_META: Record<LogType, { label: string; cls: string }> = {
  science: { label: 'Science evidence', cls: 'mh-pill--info' },
  safety: { label: 'Safety event', cls: 'mh-pill--crit' },
  replan: { label: 'Replan', cls: 'mh-pill--warn' }
};
const FILTERS: { value: LogType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'science', label: 'Science evidence' },
  { value: 'safety', label: 'Safety event' },
  { value: 'replan', label: 'Replan' }
];

export default function MissionLog({ state }: { state: PlannerState }) {
  const [filter, setFilter] = useState<LogType | 'all'>('all');
  const rows = [...state.log].filter((e) => filter === 'all' || e.type === filter).sort((a, b) => b.sol - a.sol || b.id.localeCompare(a.id));
  const count = (t: LogType | 'all') => (t === 'all' ? state.log.length : state.log.filter((e) => e.type === t).length);
  const simulated = state.scenarioId !== 'demo' || state.log.length > 0;

  return (
    <Card
      eyebrow="Decisions and evidence"
      title="Mission log"
      icon={ScrollText}
      aside={simulated ? <SimBadge label="simulated history" /> : undefined}
      subtitle={`Sol 1 to Sol ${state.todaySol}: every plan version with the evidence that drove it.`}
    >
      <div className="mh-choice self-start flex-wrap" role="radiogroup" aria-label="Filter by type">
        {FILTERS.map((f) => (
          <button key={f.value} type="button" role="radio" aria-checked={filter === f.value} onClick={() => setFilter(f.value)}>
            {f.label} <span className="font-mono opacity-70">{count(f.value)}</span>
          </button>
        ))}
      </div>

      <div className="mh-table-wrap">
        <table className="mh-table mh-table--compact mh-log-table">
          <thead>
            <tr>
              <th scope="col">Sol · plan</th>
              <th scope="col">Evidence</th>
              <th scope="col">Decision</th>
              <th scope="col">Approved by · outcome</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id}>
                <td className="whitespace-nowrap">
                  <strong className="font-mono">Sol {e.sol}</strong>
                  <br />
                  <span className="font-mono text-mh-text2">{e.planVersion}</span>
                  <br />
                  <span className={`mh-pill ${TYPE_META[e.type].cls}`}>{TYPE_META[e.type].label}</span>
                  <br />
                  <span className="font-mono text-[11px] text-mh-text2" title={`${solDate(e.sol)} (simulated Earth date)`}>
                    {e.ts.replace(/^Sol \d+ · /, '')}
                  </span>
                </td>
                <td>{e.evidence}</td>
                <td>{e.decision}</td>
                <td>
                  {e.approvedBy}
                  <br />
                  <span className="text-mh-text2">{e.outcome}</span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="text-mh-text2">
                  No entries of this type yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {state.debriefs.length > 0 && (
        <details>
          <summary className="cursor-pointer text-base font-semibold text-mh-link">EVA debriefs on file ({state.debriefs.length})</summary>
          <div className="mh-table-wrap mt-2">
            <table className="mh-table mh-table--compact">
              <thead>
                <tr>
                  <th scope="col">Sol</th>
                  <th scope="col">Signed by</th>
                  <th scope="col">POIs</th>
                  <th scope="col">Min</th>
                  <th scope="col">Borg</th>
                  <th scope="col">mSv</th>
                  <th scope="col">Suit</th>
                </tr>
              </thead>
              <tbody>
                {[...state.debriefs]
                  .sort((a, b) => b.sol - a.sol)
                  .map((d) => (
                    <tr key={d.id}>
                      <td className="font-mono">{d.sol}</td>
                      <td>{d.signedBy}</td>
                      <td>{d.pois.map((x) => `${x.poiId} ${x.status}`).join(', ')}</td>
                      <td className="font-mono">{d.actualMin}</td>
                      <td className="font-mono">{d.borg}</td>
                      <td className="font-mono">{d.dosimeterMsv.toFixed(2)}</td>
                      <td>{d.suitIssues || 'None'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </Card>
  );
}
