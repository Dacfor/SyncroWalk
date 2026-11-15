import type { ReactNode, RefObject } from 'react';
import { ClipboardCheck, Printer, X } from 'lucide-react';
import { SimBadge } from './analysisUi.tsx';
import {
  BASE,
  FIELD_EVENT_META,
  SEAT_LABEL,
  TODAY_SOL,
  crewAssignment,
  instrumentName,
  isHazard,
  missionVersion,
  planFor
} from './model.ts';
import {
  DEMO_ASSUMPTIONS as A,
  MISSION_OBJECTIVE,
  SHELTERS,
  SLOPE_FEATURES,
  TIME_WINDOW,
  addMinutesToLst,
  distKm,
  distToPolylineKm,
  lstToMin
} from './analysis.ts';
import type { DailyMission, PlannerState, Poi } from './model.ts';

// ═══════════════════════════════════════════════════════════════════════════════
// EVA BRIEFING — the page the astronaut opens (and prints) before leaving the base.
// Everything is derived from the approved plan and the shared state; nothing is typed here.
// ═══════════════════════════════════════════════════════════════════════════════

const PRE_EVA_CHECKS = [
  'Suit pressure and leak check',
  'Dosimeter zeroed and start value logged',
  'Comms check with IV1 (voice + telemetry)',
  'O₂, CO₂ scrubber and cooling at 100 %'
];
const DOC_MIN_PER_STOP = 5; // photo documentation
const SAMPLE_MIN = 8; // per sample: collect, bag, label

/** Sample bag ids for a stop, e.g. S24-1A, S24-1B (sol – POI number – letter). */
export const sampleBagIds = (sol: number, poi: Poi): string[] => {
  if (!poi.samplesRequired) return [];
  const n = Math.min(6, Math.max(1, Number(poi.sampleNotes.match(/\d+/)?.[0] ?? 1)));
  const tag = poi.id.replace(/^POI-/, '');
  return Array.from({ length: n }, (_, i) => `S${sol}-${tag}${String.fromCharCode(65 + i)}`);
};

const photosFor = (poi: Poi): string[] => {
  const list = ['Context panorama (360°)', 'Work area with scale bar and north arrow'];
  if (poi.instruments.includes('abrader')) list.push('Abraded patch, before and after');
  if (poi.instruments.includes('drill')) list.push('Core hole and core tip');
  if (poi.samplesRequired) list.push('Each sample in place, then in its bag with the ID visible');
  return list;
};

/** Split of the time on site: experiments, sampling, photos. */
const timeBudget = (poi: Poi, sol: number) => {
  const photos = Math.min(DOC_MIN_PER_STOP, poi.durationMin);
  const sampling = Math.min(poi.durationMin - photos, sampleBagIds(sol, poi).length * SAMPLE_MIN);
  return { photos, sampling, experiments: Math.max(0, poi.durationMin - photos - sampling) };
};

/** 1–3 lines: the evidence that changed the plan since the previous sol. */
const whatChanged = (state: PlannerState, mission: DailyMission): string[] => {
  const v = missionVersion(mission);
  if (mission.replan && mission.replan.toVersion === v) {
    return [
      `Plan v${mission.replan.fromVersion} → v${v}: ${mission.replan.reason}.`,
      ...mission.replan.steps.slice(0, 2).map((st) => st.text)
    ];
  }
  const recent = state.log
    .filter((e) => e.sol === mission.sol || e.sol === mission.sol - 1)
    .filter((e) => e.type !== 'science' || e.sol !== mission.sol || !e.decision.includes('approved'))
    .slice(-2)
    .map((e) => `Sol ${e.sol}: ${e.evidence} → ${e.decision}.`);
  return recent.length ? recent : [`No change: plan v${v} as approved.`];
};

export default function EvaBriefing({
  state,
  mission,
  mapRef,
  onClose,
  onOpenDebrief
}: {
  state: PlannerState;
  mission: DailyMission;
  mapRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onOpenDebrief: () => void;
}) {
  const plan = planFor(state, mission);
  const m = plan.metrics;
  const noGo = plan.evaluation.overall === 'violated';
  const pending = mission.status === 'changed';
  const seated = crewAssignment(state.crew, mission);
  const evCrew = seated.filter((c) => c.seatNow.startsWith('EV'));
  const ivCrew = seated.filter((c) => c.seatNow.startsWith('IV'));
  type Stop = { kind: string; name: string; lat: number; lon: number; etaLst: string; departLst: string; stationMin?: number; poiId?: string };
  const stops: Stop[] = m.stops;
  const poiStops = stops.filter((st) => st.kind === 'poi');
  const lastPoi = poiStops[poiStops.length - 1];
  const turnBackLst = lastPoi
    ? addMinutesToLst(TIME_WINDOW.latestReturn, -(TIME_WINDOW.returnBufferMin + (lstToMin(m.endLst) - lstToMin(lastPoi.departLst))))
    : null;
  const budgets = plan.stops.map((p) => timeBudget(p, mission.sol));
  const sum = (k: 'photos' | 'sampling' | 'experiments') => budgets.reduce((s, b) => s + b[k], 0);
  const egressEnd = addMinutesToLst(m.startLst, A.egressMin);

  // Hazards along the route: field reports within 100 m, slopes close to the limit, not-evaluated terrain
  const pathPts = plan.path.map((pt) => [pt.lat, pt.lon]);
  const fieldHazards = state.fieldEvents.filter(isHazard).filter((fe) => distToPolylineKm([fe.lat, fe.lon], pathPts) <= 0.1);
  const slopes = SLOPE_FEATURES.filter((f: { coords: number[][]; radiusKm: number }) =>
    f.coords.some((c) => distToPolylineKm(c, pathPts) <= f.radiusKm + 0.03)
  );
  // Comms (demo model): beyond ~0.75 km from the base the ridge blocks the direct link → relay
  const basePt = [BASE.lat, BASE.lon];
  const far = (st: Stop) => distKm([st.lat, st.lon], basePt) > 0.75;
  const commsWindows = stops.slice(1).map((st, i) => ({ a: stops[i], b: st, relay: far(stops[i]) || far(st) }));
  const packed = state.packed[mission.id] ?? [];
  const checklist = [...PRE_EVA_CHECKS, `Navigation tablet loaded with plan v${missionVersion(mission)}`, ...plan.equipment];
  const changed = whatChanged(state, mission);

  const H = ({ children }: { children: ReactNode }) => <h3 className="mh-brief-h">{children}</h3>;
  const KV = ({ k, v }: { k: string; v: ReactNode }) => (
    <div className="mh-kv">
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );

  return (
    <div className="mh-print-overlay fixed inset-0 z-[1200] bg-black/60 flex items-center justify-center p-3 sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="briefing-title"
        onClick={(e) => e.stopPropagation()}
        className="mh-print-root mh-window bg-mh-card w-full max-w-[1100px] h-[94vh] flex flex-col overflow-hidden select-text"
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="px-5 py-3 flex flex-wrap items-start justify-between gap-3 border-b border-mh-sep shrink-0">
          <div className="flex flex-col gap-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`mh-verdict ${noGo ? 'mh-verdict--nogo' : pending ? 'mh-verdict--hold' : 'mh-verdict--go'}`}>
                {noGo ? 'NO-GO' : pending ? 'HOLD' : 'GO'}
              </span>
              <h2 id="briefing-title" className="m-0 text-[22px] leading-tight font-bold">
                EVA Briefing · Sol {mission.sol}
                {mission.sol === TODAY_SOL ? ' (today)' : ''}
              </h2>
            </div>
            <p className="m-0 text-base text-mh-text2">
              <span className="font-mono">Plan v{missionVersion(mission)}</span> · approved by{' '}
              {pending ? 'pending approval' : (mission.approvedBy ?? 'Mission Control')} · {MISSION_OBJECTIVE}
              {noGo ? ' · do not leave the base' : pending ? ' · wait for the approved version' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 mh-no-print">
            <button type="button" onClick={() => window.print()} className="mh-btn mh-btn--tinted">
              <Printer className="w-4 h-4" /> Print
            </button>
            <button type="button" onClick={onClose} className="mh-btn mh-btn--icon bg-mh-fill text-mh-text shrink-0" aria-label="Close briefing">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="mh-print-scroll flex-1 min-h-0 overflow-y-auto p-5 flex flex-col gap-5">
          {/* Crew + what changed */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <section aria-label="Crew">
              <H>Crew</H>
              <dl className="mh-kv-list">
                {evCrew.map((c) => (
                  <KV key={c.id} k={c.seatNow} v={`${c.name} · ${SEAT_LABEL[c.seatNow]}`} />
                ))}
                {ivCrew.map((c) => (
                  <KV key={c.id} k={c.seatNow} v={`${c.name} · ${SEAT_LABEL[c.seatNow]} (in the habitat)`} />
                ))}
              </dl>
            </section>
            <section aria-label="What changed since yesterday">
              <H>What changed since yesterday</H>
              <ul className="m-0 pl-4 flex flex-col gap-1 text-base">
                {changed.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
          </div>

          {/* Day summary */}
          <section aria-label="Day summary" className="break-inside-avoid">
            <H>
              Day summary <SimBadge label="demo model" />
            </H>
            <dl className="mh-kv-grid">
              <KV k="Distance" v={`${m.distanceKm.toFixed(2)} km`} />
              <KV k="Ascent / descent" v={`+${Math.round(m.gainM)} m / −${Math.round(m.lossM)} m (MOLA profile)`} />
              <KV k="Total EVA time" v={`${m.evaDurationMin} min (${m.startLst}–${m.endLst} LST)`} />
              <KV k="Walking time" v={`${Math.round(m.walkMin)} min`} />
              <KV k="On-site time" v={`${m.stationMin} min`} />
              <KV k="Experiments / sampling" v={`${sum('experiments')} min / ${sum('sampling')} min (+${sum('photos')} min photos)`} />
              <KV k="Egress" v={`${m.startLst}–${egressEnd} LST (airlock, suit checks)`} />
              <KV k="Turn-back time" v={turnBackLst ? `${turnBackLst} LST` : '—'} />
              <KV k="Latest return" v={`${TIME_WINDOW.latestReturn} LST`} />
              <KV k="Return buffer" v={`${m.bufferMin} min (minimum ${TIME_WINDOW.returnBufferMin})`} />
            </dl>
          </section>

          {/* Route map: approved route, shelters, 40-min ring */}
          <div className="border border-mh-sep h-[300px] shrink-0 break-inside-avoid">
            <div ref={mapRef} className="w-full h-full" />
          </div>

          {/* Timeline per stop */}
          <section aria-label="Timeline">
            <H>Timeline (LST)</H>
            <div className="mh-table-wrap">
              <table className="mh-table mh-table--compact mh-brief-table">
                <thead>
                  <tr>
                    <th scope="col">ETA</th>
                    <th scope="col">Stop</th>
                    <th scope="col">Task</th>
                    <th scope="col">Instruments</th>
                    <th scope="col">Samples (bag ID)</th>
                    <th scope="col">Photos required</th>
                    <th scope="col">Time budget</th>
                  </tr>
                </thead>
                <tbody>
                  {stops.map((st, i) => {
                    const poi = st.poiId ? plan.stops.find((p) => p.id === st.poiId) : null;
                    if (!poi) {
                      return (
                        <tr key={`${st.name}-${i}`}>
                          <td className="font-mono">{st.kind === 'start' ? m.startLst : st.etaLst}</td>
                          <td colSpan={5}>
                            <strong>{st.name}</strong>
                            {st.kind === 'start' && ` · egress, leave the airlock at ${st.departLst}`}
                            {st.kind === 'shelter' && ' · pass by the shelter, no stop planned'}
                            {st.kind === 'base' && ` · ingress, EVA ends ${m.endLst}`}
                          </td>
                          <td className="font-mono">{st.kind === 'start' ? `${A.egressMin} min` : st.kind === 'base' ? `${A.ingressMin} min` : '—'}</td>
                        </tr>
                      );
                    }
                    const bags = sampleBagIds(mission.sol, poi);
                    const b = timeBudget(poi, mission.sol);
                    return (
                      <tr key={poi.id} className="break-inside-avoid">
                        <td className="font-mono">{st.etaLst}</td>
                        <td>
                          <strong>{poi.id}</strong>
                          <br />
                          {poi.name}
                        </td>
                        <td>{poi.infoToCollect}</td>
                        <td>{poi.instruments.length ? poi.instruments.map(instrumentName).join(', ') : 'None assigned'}</td>
                        <td>
                          {bags.length ? (
                            <>
                              <span className="font-mono">{bags.join(', ')}</span>
                              <br />
                              {poi.sampleNotes || 'Required'}
                            </>
                          ) : (
                            'None'
                          )}
                        </td>
                        <td>{photosFor(poi).join('; ')}</td>
                        <td className="font-mono">
                          {poi.durationMin} min
                          <br />
                          exp {b.experiments} · smp {b.sampling} · pho {b.photos}
                          <br />
                          leave {st.departLst}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="mh-brief-debrief">
                    <td className="font-mono">{m.endLst}</td>
                    <td colSpan={5}>
                      <strong>Post-EVA debrief (mandatory)</strong> · targets, samples, terrain, exertion, suit, dosimeter. It updates the
                      Scientist's discoveries, the route model and the crew dose.
                    </td>
                    <td>
                      <button type="button" className="mh-btn mh-btn--primary mh-no-print" onClick={onOpenDebrief}>
                        <ClipboardCheck className="w-4 h-4" /> Open debrief
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Hazards along route */}
            <section aria-label="Hazards along route" className="break-inside-avoid">
              <H>Hazards along route</H>
              <ul className="m-0 pl-4 flex flex-col gap-1 text-base">
                {fieldHazards.map((fe) => (
                  <li key={fe.id}>
                    <strong>{(FIELD_EVENT_META[fe.class] ?? { label: fe.class }).label}</strong> · {fe.title} ({fe.id}, {fe.ts}). {fe.actionDirective}
                  </li>
                ))}
                {slopes.map((f: { id: string; name: string; slopeDeg: number }) => (
                  <li key={f.id}>
                    <strong>Slope {f.slopeDeg}°</strong> · {f.name} (limit {A.slopeLimitDeg}°)
                  </li>
                ))}
                {m.neKm > 0 && (
                  <li>
                    <strong>Not-evaluated terrain</strong> · {m.neKm.toFixed(2)} km of the route ({m.nePct.toFixed(0)} %): walk slower, probe before stepping.
                  </li>
                )}
                {!fieldHazards.length && !slopes.length && m.neKm === 0 && <li>No reported hazard within 100 m of the route.</li>}
              </ul>
            </section>

            {/* Hard limits */}
            <section aria-label="Hard limits" className="break-inside-avoid mh-brief-limits">
              <H>Hard limits</H>
              <dl className="mh-kv-list">
                <KV k="Turn back by" v={turnBackLst ? `${turnBackLst} LST` : '—'} />
                <KV k="Back in base by" v={`${TIME_WINDOW.latestReturn} LST`} />
                <KV k="Max EVA time" v={`${state.sepAlert && mission.sol === TODAY_SOL ? A.sepEvaMaxMin : TIME_WINDOW.evaMaxMin} min (plan ${m.evaDurationMin})`} />
                <KV k="Max time to shelter" v={`${state.sepAlert && mission.sol === TODAY_SOL ? A.sepShelterMaxMin : A.sepMinWarningMin} min (route ${Math.round(m.maxTimeToShelterMin)})`} />
                <KV k="Max EVA dose" v={`${A.evaDoseLimitMsv} mSv (plan ${m.doseEvaMsv.toFixed(2)})`} />
                <KV k="Slope limit" v={`${A.slopeLimitDeg}° (route ${m.maxSlopeDeg.toFixed(1)}°)`} />
                <KV k="Suit reserve" v={`${A.suitReservePct} % (plan ends at ${Math.round(m.consumablesRemainingPct)} %)`} />
              </dl>
            </section>

            {/* Abort rules */}
            <section aria-label="Abort rules" className="break-inside-avoid">
              <H>Abort rules</H>
              <dl className="mh-kv-list mh-kv-list--wide">
                <KV k="SEP alert" v="Go to the nearest shelter now (base or delta alcove)." />
                <KV k={`Dust τ > ${A.tauVisibilityDegraded}`} v="Visibility lost: return to base along the outbound track." />
                <KV k={`Dosimeter ≥ ${A.evaDoseLimitMsv} mSv`} v="Return to base." />
                <KV k={`Consumables < ${A.suitReservePct} %`} v="Reserve reached: return to base." />
                <KV k="Unexpected soft soil" v="Stop, probe, use “Report anomaly”, wait for Mission Control." />
              </dl>
            </section>

            {/* Shelters */}
            <section aria-label="Shelters" className="break-inside-avoid">
              <H>Shelters and 40-min ring</H>
              <ul className="m-0 pl-4 flex flex-col gap-1 text-base">
                {SHELTERS.map((sh: { id: string; name: string; lat: number; lon: number }) => (
                  <li key={sh.id}>
                    <strong>{sh.name}</strong> · {sh.lat.toFixed(4)}° N, {sh.lon.toFixed(4)}° E
                    {sh.id !== 'BASE' && m.viaShelter ? ' · on the route' : ''}
                  </li>
                ))}
                <li>
                  Farthest point of the route: <strong>{Math.round(m.maxTimeToShelterMin)} min</strong> from a shelter. The dashed green line on the
                  map is the {A.sepMinWarningMin}-min ring (SEP warning time).
                </li>
              </ul>
            </section>

            {/* Comms windows */}
            <section aria-label="Comms windows" className="break-inside-avoid">
              <H>
                Comms windows <SimBadge />
              </H>
              <ul className="m-0 pl-4 flex flex-col gap-1 text-base">
                <li>
                  {ivCrew[0]?.name ?? 'IV1'} on the base console. Check in at every stop arrival and every 15 min.
                </li>
                {commsWindows.map(({ a, b, relay }) => (
                  <li key={`${a.name}-${b.name}-${a.departLst}`}>
                    <span className="font-mono">
                      {a.departLst}–{b.etaLst}
                    </span>{' '}
                    {a.name.split(' · ')[0]} → {b.name.split(' · ')[0]}: {relay ? 'no direct link, relay via the rover mast' : 'direct link to the base'}
                  </li>
                ))}
              </ul>
            </section>

            {/* Pre-EVA checklist */}
            <section aria-label="Pre-EVA equipment checklist" className="break-inside-avoid">
              <H>Pre-EVA equipment checklist</H>
              <ul className="m-0 p-0 list-none flex flex-col gap-1 text-base">
                {checklist.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className={`mh-checkbox ${packed.includes(item) ? 'is-on' : ''}`} aria-hidden="true" />
                    <span>
                      {item}
                      {packed.includes(item) ? ' (packed)' : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
