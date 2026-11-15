import { useState } from 'react';
import type { ReactNode } from 'react';
import { ClipboardCheck, X } from 'lucide-react';
import { sampleBagIds } from './Briefing.tsx';
import { BASE, FIELD_SHELTER_NAME, crewAssignment, missionVersion, planFor } from './model.ts';
import { addMinutesToLst, marsLmst } from './analysis.ts';
import type { DailyMission, Debrief, DebriefLeg, DebriefPoi, PlannerState, PoiOutcome, TrafficRating } from './model.ts';

// ═══════════════════════════════════════════════════════════════════════════════
// EVA DEBRIEF — the form the astronaut fills in after the EVA (mandatory).
// On submit (see applyDebrief in model.ts): observations become field events for the
// Scientist, trafficability updates the route model, the dosimeter reading updates the
// crew dose, the mission log gets "Sol N debrief received".
// ═══════════════════════════════════════════════════════════════════════════════

const OUTCOMES: { value: PoiOutcome; label: string }[] = [
  { value: 'completed', label: 'Completed' },
  { value: 'partial', label: 'Partial' },
  { value: 'skipped', label: 'Skipped' }
];
const RATINGS: { value: TrafficRating; label: string }[] = [
  { value: 'easier', label: 'Easier' },
  { value: 'expected', label: 'As expected' },
  { value: 'harder', label: 'Harder' }
];
const BORG: Record<number, string> = { 6: 'no exertion', 9: 'very light', 11: 'light', 13: 'somewhat hard', 15: 'hard', 17: 'very hard', 19: 'extremely hard', 20: 'maximal' };
const borgLabel = (v: number) => BORG[v] ?? BORG[v - 1] ?? '';

function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="mh-choice" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

const H = ({ children }: { children: ReactNode }) => <h3 className="mh-brief-h">{children}</h3>;

export default function EvaDebrief({
  state,
  mission,
  onClose,
  onSubmit
}: {
  state: PlannerState;
  mission: DailyMission;
  onClose: () => void;
  onSubmit: (d: Debrief) => void;
}) {
  const plan = planFor(state, mission);
  const m = plan.metrics;
  const ev = crewAssignment(state.crew, mission).filter((c) => c.seatNow.startsWith('EV'));

  const [pois, setPois] = useState<DebriefPoi[]>(() =>
    plan.stops.map((p) => ({
      poiId: p.id,
      status: 'completed',
      reason: '',
      samples: sampleBagIds(mission.sol, p).map((id) => ({ id, collected: true, note: '' })),
      observation: '',
      proposePoi: false
    }))
  );
  // Legs walked: base → stops (→ shelter) → base
  const [legs, setLegs] = useState<DebriefLeg[]>(() => {
    type St = { kind: string; name: string; lat: number; lon: number; poiId?: string };
    const label = (st: St) => (st.kind === 'poi' ? (st.poiId as string) : st.kind === 'shelter' ? FIELD_SHELTER_NAME.split(' (')[0] : 'Base');
    const stops: St[] = m.stops;
    return stops.slice(1).map((st, i) => ({
      from: label(stops[i]),
      to: label(st),
      a: [stops[i].lat, stops[i].lon],
      b: [st.lat, st.lon],
      rating: 'expected'
    }));
  });
  const [actualMin, setActualMin] = useState<number>(m.evaDurationMin);
  const [borg, setBorg] = useState(12);
  const [suitIssues, setSuitIssues] = useState('');
  const [dust, setDust] = useState<Debrief['dust']>('light');
  const [dosimeter, setDosimeter] = useState<string>(m.doseEvaMsv.toFixed(2));
  const [tlx, setTlx] = useState({ mental: 40, physical: 50, temporal: 35 });
  const [psych, setPsych] = useState('Nominal');
  const [signedBy, setSignedBy] = useState(ev[0]?.name ?? '');
  // Default signature time: 20 min after the planned end of the EVA (mission clock, LST)
  const [signedAt, setSignedAt] = useState(() => `${addMinutesToLst(m.endLst, 20)} LST`);
  const [error, setError] = useState<string | null>(null);

  const setPoi = (i: number, patch: Partial<DebriefPoi>) => setPois((list) => list.map((x, k) => (k === i ? { ...x, ...patch } : x)));

  const submit = () => {
    const dose = Number(dosimeter);
    if (!signedBy.trim()) return setError('Sign the debrief: enter your name.');
    if (!Number.isFinite(dose) || dose < 0) return setError('Dosimeter reading must be a number in mSv.');
    const missing = pois.find((x) => x.status !== 'completed' && !x.reason.trim());
    if (missing) return setError(`Give the reason why ${missing.poiId} was ${missing.status}.`);
    onSubmit({
      id: `DB-${String(mission.sol).padStart(3, '0')}-${state.debriefs.filter((d) => d.sol === mission.sol).length + 1}`,
      missionId: mission.id,
      sol: mission.sol,
      planVersion: missionVersion(mission),
      pois,
      legs,
      actualMin,
      borg,
      suitIssues: suitIssues.trim(),
      dust,
      dosimeterMsv: dose,
      tlx,
      psych: psych.trim(),
      signedBy: signedBy.trim(),
      signedAt: signedAt.trim() || `${marsLmst()} LST`
    });
  };

  return (
    <div className="fixed inset-0 z-[1200] bg-black/60 flex items-center justify-center p-3 sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="debrief-title"
        onClick={(e) => e.stopPropagation()}
        className="mh-window bg-mh-card w-full max-w-[980px] h-[94vh] flex flex-col overflow-hidden select-text"
      >
        <div className="px-5 py-3 flex items-start justify-between gap-3 border-b border-mh-sep shrink-0">
          <div className="flex flex-col gap-1 min-w-0">
            <h2 id="debrief-title" className="m-0 text-[22px] leading-tight font-bold">
              EVA Debrief · Sol {mission.sol}
            </h2>
            <p className="m-0 text-base text-mh-text2">
              <span className="font-mono">Plan v{missionVersion(mission)}</span> · {ev.map((c) => `${c.seatNow} ${c.name}`).join(' · ')} · planned {m.evaDurationMin} min,{' '}
              {m.distanceKm.toFixed(2)} km
            </p>
          </div>
          <button type="button" onClick={onClose} className="mh-btn mh-btn--icon bg-mh-fill text-mh-text shrink-0" aria-label="Close debrief">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-5 flex flex-col gap-5">
          {/* Per POI */}
          <section aria-label="Targets">
            <H>Targets</H>
            <div className="flex flex-col gap-3">
              {pois.map((x, i) => {
                const poi = plan.stops[i];
                return (
                  <div key={x.poiId} className="mh-debrief-poi">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-base">
                        {x.poiId} · {poi?.name}
                      </strong>
                      <Choice label={`${x.poiId} outcome`} value={x.status} options={OUTCOMES} onChange={(v) => setPoi(i, { status: v })} />
                    </div>
                    {x.status !== 'completed' && (
                      <label className="mh-field">
                        <span>Reason ({x.status})</span>
                        <input className="mh-input" value={x.reason} onChange={(e) => setPoi(i, { reason: e.target.value })} placeholder="e.g. turn-back time reached" />
                      </label>
                    )}
                    {x.samples.length > 0 && (
                      <div className="flex flex-col gap-1">
                        <span className="mh-field-label">Samples collected</span>
                        {x.samples.map((sm, k) => (
                          <div key={sm.id} className="flex items-center gap-2">
                            <label className="flex items-center gap-2 shrink-0 w-28 font-mono text-[13px] cursor-pointer">
                              <input
                                type="checkbox"
                                checked={sm.collected}
                                onChange={(e) => setPoi(i, { samples: x.samples.map((s2, j) => (j === k ? { ...s2, collected: e.target.checked } : s2)) })}
                              />
                              {sm.id}
                            </label>
                            <input
                              className="mh-input"
                              aria-label={`Note for sample ${sm.id}`}
                              value={sm.note}
                              onChange={(e) => setPoi(i, { samples: x.samples.map((s2, j) => (j === k ? { ...s2, note: e.target.value } : s2)) })}
                              placeholder="Note (depth, texture, contamination…)"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    <label className="mh-field">
                      <span>Observations / anomalies</span>
                      <textarea
                        className="mh-input min-h-16 resize-y"
                        value={x.observation}
                        onChange={(e) => setPoi(i, { observation: e.target.value })}
                        placeholder="What you saw that the plan did not expect"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-base cursor-pointer">
                      <input type="checkbox" checked={x.proposePoi} onChange={(e) => setPoi(i, { proposePoi: e.target.checked })} />
                      Propose a new POI here (sent to the Scientist)
                    </label>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Trafficability per leg */}
          <section aria-label="Terrain trafficability">
            <H>Terrain trafficability vs predicted</H>
            <div className="flex flex-col gap-1.5">
              {legs.map((l, i) => (
                <div key={`${l.from}-${l.to}-${i}`} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-base">
                    <span className="font-mono text-mh-text2">Leg {i + 1}</span> · {l.from} → {l.to}
                  </span>
                  <Choice
                    label={`Leg ${i + 1} trafficability`}
                    value={l.rating}
                    options={RATINGS}
                    onChange={(v) => setLegs((list) => list.map((y, k) => (k === i ? { ...y, rating: v } : y)))}
                  />
                </div>
              ))}
            </div>
            <p className="m-0 mt-2 text-base text-mh-text2">Updates the walking speed of the route model on these stretches (easier +15 %, harder −30 %).</p>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Exertion and workload */}
            <section aria-label="Exertion and workload">
              <H>Exertion and workload</H>
              <div className="flex flex-col gap-3">
                <label className="mh-field">
                  <span>
                    Perceived exertion (Borg 6–20): <strong className="font-mono">{borg}</strong> · {borgLabel(borg)}
                  </span>
                  <input type="range" min={6} max={20} step={1} value={borg} onChange={(e) => setBorg(Number(e.target.value))} />
                </label>
                {(
                  [
                    ['mental', 'Mental demand'],
                    ['physical', 'Physical demand'],
                    ['temporal', 'Time pressure']
                  ] as const
                ).map(([k, label]) => (
                  <label key={k} className="mh-field">
                    <span>
                      {label} (NASA-TLX, 0–100): <strong className="font-mono">{tlx[k]}</strong>
                    </span>
                    <input type="range" min={0} max={100} step={5} value={tlx[k]} onChange={(e) => setTlx((t) => ({ ...t, [k]: Number(e.target.value) }))} />
                  </label>
                ))}
                <label className="mh-field">
                  <span>Psychological state (self-assessment)</span>
                  <input className="mh-input" value={psych} onChange={(e) => setPsych(e.target.value)} placeholder="e.g. Nominal, tired but focused" />
                </label>
              </div>
            </section>

            {/* Suit, dust, dose */}
            <section aria-label="Suit and dose">
              <H>Suit, dust, dose</H>
              <div className="flex flex-col gap-3">
                <label className="mh-field">
                  <span>Suit issues</span>
                  <textarea className="mh-input min-h-16 resize-y" value={suitIssues} onChange={(e) => setSuitIssues(e.target.value)} placeholder="None, or e.g. left glove stiff, visor fogging" />
                </label>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="mh-field-label">Dust on suit and seals</span>
                  <Choice
                    label="Dust"
                    value={dust}
                    onChange={setDust}
                    options={[
                      { value: 'none', label: 'None' },
                      { value: 'light', label: 'Light' },
                      { value: 'heavy', label: 'Heavy' }
                    ]}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="mh-field">
                    <span>Dosimeter reading (mSv)</span>
                    <input className="mh-input font-mono" inputMode="decimal" value={dosimeter} onChange={(e) => setDosimeter(e.target.value)} />
                  </label>
                  <label className="mh-field">
                    <span>Actual EVA duration (min)</span>
                    <input className="mh-input font-mono" type="number" min={0} value={actualMin} onChange={(e) => setActualMin(Math.max(0, Number(e.target.value) || 0))} />
                  </label>
                </div>
              </div>
            </section>
          </div>

          {/* Signature */}
          <section aria-label="Signature">
            <H>Signature</H>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px_auto] gap-3 items-end">
              <label className="mh-field">
                <span>Name</span>
                <input className="mh-input" value={signedBy} onChange={(e) => setSignedBy(e.target.value)} />
              </label>
              <label className="mh-field">
                <span>Time (LST)</span>
                <input className="mh-input font-mono" value={signedAt} onChange={(e) => setSignedAt(e.target.value)} />
              </label>
              <button type="button" className="mh-btn mh-btn--primary" onClick={submit}>
                <ClipboardCheck className="w-4 h-4" /> Submit debrief
              </button>
            </div>
            {error && (
              <p className="m-0 mt-2 text-base text-mh-crit font-semibold" role="alert">
                {error}
              </p>
            )}
            <p className="m-0 mt-2 text-base text-mh-text2">
              Base: {BASE.lat.toFixed(4)}° N, {BASE.lon.toFixed(4)}° E. On submit: observations go to the Scientist, trafficability to the route model, dose to the crew
              status, and the mission log records “Sol {mission.sol} debrief received”.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
