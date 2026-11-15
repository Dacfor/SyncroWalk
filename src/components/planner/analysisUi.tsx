// @ts-nocheck -- display components for the demo EVA model (ported from the dev_dac branch)
import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { CONSTRAINT_STATUS, constraintMargin, constraintValue, residualLevel } from './analysis.ts';

// Small badge for every number that is not a real NASA measurement
export function SimBadge({ label = 'demo value' }: any) {
  return (
    <span className="mh-sim-badge" title="Simulated / illustrative value — not a NASA measurement">
      {label}
    </span>
  );
}

export const fmtNum = (v, digits) => (v == null ? '—' : v.toFixed(digits ?? (Math.abs(v) >= 10 ? 1 : 2)));

const MEASURE_KIND = {
  prior: { label: 'Orbital prior', cls: 'mh-pill--warn' },
  insitu: { label: 'In-situ', cls: 'mh-pill--ok' },
  fused: { label: 'Fused posterior', cls: 'mh-pill--info' }
};

/**
 * The single way to show a measured / estimated value: value ± 1σ in the same unit,
 * relative uncertainty, provenance (mission · instrument · resolution) and kind.
 * Variant "compare" (pass `prior` + `posterior`): overlapping 1σ intervals and the residual.
 */
export function ValueWithUncertainty({
  label,
  value,
  sigma,
  unit,
  kind = 'prior',
  source,
  simulated = true,
  prior,
  posterior,
  priorSource,
  posteriorSource,
  compact = false
}: any) {
  if (prior && posterior) {
    const lo = Math.min(prior.value - 2 * prior.sigma, posterior.value - 2 * posterior.sigma, 0);
    const hi = Math.max(prior.value + 2 * prior.sigma, posterior.value + 2 * posterior.sigma);
    const x = (v) => 40 + ((v - lo) / (hi - lo || 1)) * 252;
    const residual = posterior.value - prior.value;
    const nSigma = residual / (prior.sigma || 1);
    const level = residualLevel(nSigma);
    return (
      <div className="flex flex-col gap-2">
        {label && <span className="font-mono text-[13px] uppercase tracking-[0.08em] text-mh-text2">{label}</span>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <ValueWithUncertainty value={prior.value} sigma={prior.sigma} unit={unit} kind="prior" source={priorSource} simulated={simulated} compact />
          <ValueWithUncertainty value={posterior.value} sigma={posterior.sigma} unit={unit} kind="insitu" source={posteriorSource} simulated={simulated} compact />
        </div>
        <svg
          viewBox="0 0 300 46"
          className="w-full h-auto max-h-24"
          role="img"
          aria-label={`Prior ${fmtNum(prior.value)} ± ${fmtNum(prior.sigma)} versus in-situ ${fmtNum(posterior.value)} ± ${fmtNum(posterior.sigma)} ${unit}`}
        >
          <line x1="8" x2="292" y1="40" y2="40" stroke="var(--mh-sep)" strokeWidth="1" />
          <text x="8" y="14" fontSize="7" fill="var(--mh-text2)">Prior</text>
          <text x="8" y="30" fontSize="7" fill="#35B17A">In situ</text>
          <rect x={x(prior.value - prior.sigma)} y="6" width={Math.max(2, x(prior.value + prior.sigma) - x(prior.value - prior.sigma))} height="10" rx="5" fill="#8E8E93" opacity="0.55" />
          <line x1={x(prior.value)} x2={x(prior.value)} y1="3" y2="19" stroke="#8E8E93" strokeWidth="2" />
          <rect x={x(posterior.value - posterior.sigma)} y="22" width={Math.max(3, x(posterior.value + posterior.sigma) - x(posterior.value - posterior.sigma))} height="10" rx="5" fill="#35B17A" />
          <line x1={x(posterior.value)} x2={x(posterior.value)} y1="19" y2="35" stroke="#35B17A" strokeWidth="2" />
          <text x="8" y="46" fontSize="8" fill="var(--mh-text2)">{fmtNum(lo, 1)}</text>
          <text x="292" y="46" fontSize="8" fill="var(--mh-text2)" textAnchor="end">{fmtNum(hi, 1)} {unit}</text>
        </svg>
        <span className="flex flex-wrap items-center gap-2 text-base">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: level.color }} aria-hidden="true" />
          <span>
            Residual: <strong>{residual >= 0 ? '+' : '−'}{fmtNum(Math.abs(residual), 1)} {unit}</strong> ({fmtNum(Math.abs(nSigma), 1)} σ) · {level.label}
          </span>
        </span>
      </div>
    );
  }

  const meta = MEASURE_KIND[kind] ?? MEASURE_KIND.prior;
  const rel = value ? Math.abs((sigma / value) * 100) : null;
  return (
    <div className={`flex flex-col gap-1 min-w-0 ${compact ? 'p-3 rounded-mh-md bg-mh-fill' : ''}`}>
      {label && <span className="font-mono text-[13px] uppercase tracking-[0.08em] text-mh-text2">{label}</span>}
      <span className="flex flex-wrap items-center gap-1.5">
        <span className={`mh-pill ${meta.cls} !text-[13px] !py-0.5`}>{meta.label}</span>
        {simulated && <SimBadge />}
      </span>
      <span className="text-base">
        <span className="whitespace-nowrap">
          <strong className="text-[18px]">{fmtNum(value, 1)}</strong> ± {fmtNum(sigma)} {unit}
        </span>
        {rel != null && <span className="text-mh-text2 whitespace-nowrap"> ({fmtNum(rel, 0)}%)</span>}
      </span>
      {source && <span className="font-mono text-[12px] text-mh-text2 break-words">{source}</span>}
    </div>
  );
}

// Elevation profile sparkline: > slope limit in red, not-evaluated in amber, POI markers
export function ElevationProfile({ metrics, slopeLimit, onSegment = null }: any) {
  const W = 320;
  const H = 96;
  const pad = { l: 34, r: 6, t: 8, b: 18 };
  const s = metrics.samples;
  if (!s.length) return null;
  const total = metrics.distanceKm || 1;
  const elevs = s.map((p) => p.elev);
  const lo = Math.floor(Math.min(...elevs) - 3);
  const hi = Math.ceil(Math.max(...elevs) + 3);
  const x = (d) => pad.l + (d / total) * (W - pad.l - pad.r);
  const y = (e) => pad.t + (1 - (e - lo) / (hi - lo || 1)) * (H - pad.t - pad.b);
  const line = s.map((p, i) => `${i ? 'L' : 'M'}${x(p.distKm).toFixed(1)},${y(p.elev).toFixed(1)}`).join(' ');
  const bands = metrics.segments.filter((g) => g.steep || g.ne);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`Elevation profile from ${lo} to ${hi} m over ${total.toFixed(2)} km`}>
      {bands.map((g, i) => (
        <rect
          key={i}
          x={x(g.from)}
          y={pad.t}
          width={Math.max(1.5, x(g.to) - x(g.from))}
          height={H - pad.t - pad.b}
          fill={g.steep ? '#E5484D' : '#E5C04A'}
          opacity={g.steep ? 0.35 : 0.3}
          className={onSegment ? 'cursor-pointer' : ''}
          onClick={onSegment ? () => onSegment(g) : undefined}
        >
          <title>{g.steep ? `Slope > ${slopeLimit}°` : 'Not evaluated'}</title>
        </rect>
      ))}
      <path d={line} fill="none" stroke="var(--mh-text)" strokeWidth="1.8" />
      {metrics.stops
        .filter((st) => st.kind === 'poi')
        .map((st) => (
          <g key={`${st.poiId}-${st.distKm}`}>
            <line x1={x(st.distKm)} x2={x(st.distKm)} y1={pad.t} y2={H - pad.b} stroke="#2D7FF9" strokeDasharray="2 2" />
            <text x={x(st.distKm)} y={H - 6} fontSize="8" textAnchor="middle" fill="#2D7FF9">
              {st.poiId}
            </text>
          </g>
        ))}
      <text x="2" y={pad.t + 6} fontSize="8" fill="var(--mh-text2)">{hi} m</text>
      <text x="2" y={H - pad.b} fontSize="8" fill="var(--mh-text2)">{lo} m</text>
      <text x={W - pad.r} y={H - 6} fontSize="8" fill="var(--mh-text2)" textAnchor="end">{total.toFixed(2)} km</text>
    </svg>
  );
}

export function ConstraintTable({ evaluation }: any) {
  return (
    <div className="mh-table-wrap">
      <table className="mh-table !text-[14px]">
        <thead>
          <tr>
            <th scope="col">Constraint</th>
            <th scope="col">Value</th>
            <th scope="col">Limit</th>
            <th scope="col">Margin</th>
          </tr>
        </thead>
        <tbody>
          {evaluation.rows.map((r) => {
            const st = CONSTRAINT_STATUS[r.status];
            return (
              <tr key={r.id} className={r.determinant ? 'bg-mh-fill-blue' : ''}>
                <td className="!py-2">
                  <span className="flex flex-col">
                    <span className="font-semibold">{r.name}</span>
                    {r.determinant && <span className="text-[12px] text-mh-link">Binding constraint</span>}
                  </span>
                </td>
                <td className="!py-2 whitespace-nowrap">{constraintValue(r, r.value)}</td>
                <td className="!py-2 whitespace-nowrap text-mh-text2">
                  {r.id === 'sep' ? '—' : `${r.dir === 'max' ? '≤' : '≥'} ${constraintValue(r, r.limit)}`}
                </td>
                <td className="!py-2 whitespace-nowrap">
                  <span className={`mh-pill ${st.cls} !text-[13px]`}>{constraintMargin(r)}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// GO / NO-GO banner for a daily mission: verdict + binding constraint + margin
export function GoNoGoBanner({ evaluation, title = '', children = null }: any) {
  const det = evaluation.determinant;
  const go = evaluation.overall !== 'violated';
  const cls =
    evaluation.overall === 'violated'
      ? 'bg-mh-crit-bg text-mh-crit'
      : evaluation.overall === 'watch'
        ? 'bg-mh-warn-bg text-mh-warn'
        : 'bg-mh-ok-bg text-mh-ok';
  return (
    <section className={`rounded-mh-md p-4 flex flex-col gap-2 ${cls}`} aria-live="polite">
      <div className="flex flex-wrap items-center gap-3">
        {go ? <CheckCircle2 className="w-8 h-8 shrink-0" aria-hidden="true" /> : <ShieldAlert className="w-8 h-8 shrink-0" aria-hidden="true" />}
        <span className="text-[28px] leading-none font-extrabold tracking-[-0.01em]">
          {go ? (evaluation.overall === 'watch' ? 'GO · watch' : 'GO') : 'NO-GO'}
        </span>
        {title && <span className="text-[17px] font-semibold text-mh-text">{title}</span>}
      </div>
      <p className="m-0 text-base text-mh-text">
        Binding constraint: <strong>{det.name}</strong> — {constraintValue(det, det.value)}
        {det.id !== 'sep' && (
          <>
            {' '}
            vs {det.dir === 'max' ? '≤' : '≥'} {constraintValue(det, det.limit)} · margin <strong>{constraintMargin(det)}</strong>
          </>
        )}
      </p>
      {children}
    </section>
  );
}
