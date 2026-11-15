import { AlertTriangle, Backpack, CalendarDays, CheckCircle2, ClipboardCheck, Clock, FileText, MapPin } from 'lucide-react';
import { Card, PanelTabs, Stat, TabPanel } from './ui.tsx';
import { PRIORITY_META, instrumentName, missionVersion, planFor } from './model.ts';
import { DEMO_ASSUMPTIONS as A, TIME_WINDOW, addMinutesToLst, bearingDeg, compassPoint, distKm, lstToMin } from './analysis.ts';
import { SimBadge } from './analysisUi.tsx';
import type { Poi } from './model.ts';
import type { PlannerStore } from './usePlannerStore.ts';

/**
 * ASTRONAUT — sees the calendar sent by mission control, with today's EVA in focus:
 * the timed schedule, the points of interest to reach and the material to bring.
 * Selecting another Sol shows that day's points of interest and route on the map.
 * Menu: "Today"/"Day" (mini-HUD + schedule) · "Targets" (log measurements) · "Material" (checklist) · "Calendar".
 * Field actions flow back: "Log measurement" marks a target as measured for the scientist,
 * "Report anomaly" creates a field discovery and slows the mission-control route model.
 */
export type AstronautView = 'schedule' | 'targets' | 'material' | 'calendar';

export default function AstronautPanel({
  store,
  selectedSol,
  setSelectedSol,
  onFocusPoi,
  view,
  setView,
  onOpenBriefing,
  onOpenDebrief,
  onReportAnomaly
}: {
  store: PlannerStore;
  selectedSol: number;
  setSelectedSol: (sol: number) => void;
  onFocusPoi: (poi: Poi) => void;
  view: AstronautView;
  setView: (v: AstronautView) => void;
  onOpenBriefing: () => void;
  onOpenDebrief: () => void;
  onReportAnomaly: (at: { lat: number; lon: number; name: string }) => void;
}) {
  const { state } = store;
  // Drafts are not visible until mission control sends them
  const visible = state.missions.filter((m) => m.status !== 'draft').sort((a, b) => a.sol - b.sol);
  const sols = [...new Set([state.todaySol, ...visible.map((m) => m.sol)])].sort((a, b) => a - b);
  const mission = visible.find((m) => m.sol === selectedSol) ?? null;
  const plan = mission ? planFor(state, mission) : null;
  const packed = mission ? state.packed[mission.id] ?? [] : [];
  const isToday = selectedSol === state.todaySol;
  const packedCount = plan ? packed.filter((p) => plan.equipment.includes(p)).length : 0;

  // Mini-HUD (demo position model): the crew is at the last measured stop, or at the base
  const hud = (() => {
    if (!plan || !plan.stops.length) return null;
    const m = plan.metrics;
    const poiStops = m.stops.filter((st: { kind: string }) => st.kind === 'poi');
    const lastDone = [...poiStops].reverse().find((st: { poiId: string }) => state.measured.includes(st.poiId));
    const cur = lastDone ?? m.stops[0];
    const next = poiStops.find((st: { poiId: string }) => !state.measured.includes(st.poiId)) ?? m.stops[m.stops.length - 1];
    const bearing = bearingDeg([cur.lat, cur.lon], [next.lat, next.lon]);
    const dist = Math.max(0, next.distKm - cur.distKm) || distKm([cur.lat, cur.lon], [next.lat, next.lon]);
    const lastPoi = poiStops[poiStops.length - 1];
    // Leave the last target by this time to keep the minimum return buffer
    const returnLegMin = lstToMin(m.endLst) - lstToMin(lastPoi.departLst);
    const turnBackLst = addMinutesToLst(TIME_WINDOW.latestReturn, -(TIME_WINDOW.returnBufferMin + returnLegMin));
    return { m, cur, next, bearing, dist, lastPoi, turnBackLst };
  })();
  const reportHere = () => hud && onReportAnomaly({ lat: hud.next.lat, lon: hud.next.lon, name: hud.next.name });

  // Which Sol the views refer to, with shortcuts back to today / to the calendar
  const dayBar = (
    <div className="bg-mh-card rounded-mh-lg shadow-mh px-3 py-2 flex flex-wrap items-center justify-between gap-1.5">
      <span className="text-base">
        Showing <strong>Sol {selectedSol}</strong>
        {isToday ? ' · Today' : ''}
      </span>
      <span className="flex flex-wrap gap-1.5">
        {!isToday && (
          <button type="button" className="mh-btn mh-btn--tinted !min-h-7" onClick={() => setSelectedSol(state.todaySol)}>
            Back to today
          </button>
        )}
        <button type="button" className="mh-btn mh-btn--plain !min-h-7" onClick={() => setView('calendar')}>
          <CalendarDays className="w-4 h-4" /> Change day
        </button>
      </span>
    </div>
  );

  return (
    <>
      <PanelTabs
        label="Astronaut menu"
        value={view}
        onChange={setView}
        tabs={[
          { id: 'schedule', label: isToday ? 'Today' : `Sol ${selectedSol}`, icon: Clock },
          { id: 'targets', label: 'Targets', icon: MapPin, badge: plan?.stops.length },
          {
            id: 'material',
            label: 'Material',
            icon: Backpack,
            badge: plan ? plan.equipment.length - packedCount : undefined
          },
          { id: 'calendar', label: 'Calendar', icon: CalendarDays }
        ]}
      />

      {view === 'calendar' && (
        <TabPanel id="calendar">
          <Card eyebrow="From mission control" title="Mission calendar" icon={CalendarDays}>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Mission day">
              {sols.map((sol) => {
                const m = visible.find((x) => x.sol === sol);
                const sel = sol === selectedSol;
                return (
                  <button
                    key={sol}
                    type="button"
                    role="radio"
                    aria-checked={sel}
                    onClick={() => {
                      setSelectedSol(sol);
                      setView('schedule');
                    }}
                    className={`min-h-7 px-2.5 py-2 rounded-mh-md border-2 text-left cursor-pointer flex flex-col ${
                      sel ? 'bg-mh-fill-blue border-mh-primary text-mh-text' : 'bg-mh-fill border-transparent text-mh-text'
                    }`}
                  >
                    <strong className="text-base">
                      Sol {sol}
                      {sol === state.todaySol ? ' · Today' : ''}
                    </strong>
                    <span className="text-base text-mh-text2">
                      {m ? `${m.startTime} · ${m.poiIds.length} stop${m.poiIds.length === 1 ? "" : "s"}` : 'No EVA'}
                    </span>
                  </button>
                );
              })}
            </div>
            {sols.some((s) => s < state.todaySol) && (
              <p className="m-0 text-base text-mh-text2">Past Sols are kept for reference.</p>
            )}
          </Card>
        </TabPanel>
      )}

      {view !== 'calendar' && (
        <TabPanel id={view}>
          {dayBar}
          {!mission || !plan ? (
            <Card eyebrow={isToday ? 'Today' : `Sol ${selectedSol}`} title="No EVA scheduled">
              <p className="m-0 text-base text-mh-text2">
                Mission control has not sent an EVA for Sol {selectedSol}. Stay at the base and check again later.
              </p>
            </Card>
          ) : (
            <>
              {view === 'schedule' && hud && (
                <section
                  className={`p-3 sm:p-3 rounded-mh-lg shadow-mh flex flex-col gap-2.5 ${plan.evaluation.overall === 'violated' ? 'bg-mh-crit-bg' : 'bg-mh-card'}`}
                  aria-live="polite"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    {plan.evaluation.overall === 'violated' ? (
                      <span className="mh-pill mh-pill--crit">
                        {state.sepAlert && isToday ? 'SEP alert · NO-GO: stay in the base' : 'Not cleared · NO-GO: stay in the base'}
                      </span>
                    ) : mission.status === 'changed' ? (
                      <span className="mh-pill mh-pill--warn">New plan waiting for approval · do not leave</span>
                    ) : state.sepAlert && isToday ? (
                      <span className="mh-pill mh-pill--warn">SEP alert · shortened EVA via shelter · GO</span>
                    ) : (
                      <span className="mh-pill mh-pill--ok">On plan · GO</span>
                    )}
                    <span className="text-base font-semibold">
                      Sol {mission.sol} · plan v{missionVersion(mission)} · out {hud.m.startLst} → back in base {hud.m.endLst}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="mh-tile !gap-0.5">
                      <span className="mh-stat-label">Next waypoint</span>
                      <strong className="text-[14px] leading-tight">{hud.next.name}</strong>
                      <span className="text-base">
                        {hud.dist.toFixed(2)} km · {compassPoint(hud.bearing)} {Math.round(hud.bearing)}°
                      </span>
                    </div>
                    <div className="mh-tile !gap-0.5">
                      <span className="mh-stat-label">Turn back by</span>
                      <strong className="text-[18px] leading-tight">{hud.turnBackLst}</strong>
                      <span className="text-base text-mh-text2">
                        Leave {hud.lastPoi.poiId} (planned {hud.lastPoi.departLst})
                      </span>
                    </div>
                    <div className="mh-tile !gap-0.5">
                      <span className="mh-stat-label">Return buffer</span>
                      <strong className="text-[18px] leading-tight">{hud.m.bufferMin} min</strong>
                      <span className="text-base text-mh-text2">Min {TIME_WINDOW.returnBufferMin} · back by {TIME_WINDOW.latestReturn}</span>
                    </div>
                    <div className="mh-tile !gap-0.5">
                      <span className="mh-stat-label">EVA dose</span>
                      <strong className="text-[18px] leading-tight">{hud.m.doseEvaMsv.toFixed(2)} mSv</strong>
                      <span className="flex flex-wrap items-center gap-1.5 text-base text-mh-text2">
                        Limit {A.evaDoseLimitMsv} mSv <SimBadge />
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                    <button type="button" onClick={onOpenBriefing} className="mh-btn mh-btn--primary mh-btn--lg !min-h-8 !px-2">
                      <FileText className="w-4 h-4" /> EVA briefing
                    </button>
                    <button type="button" onClick={reportHere} className="mh-btn mh-btn--danger mh-btn--lg !min-h-8 !px-2">
                      <AlertTriangle className="w-4 h-4" /> Report anomaly
                    </button>
                    <button
                      type="button"
                      onClick={onOpenDebrief}
                      disabled={!!mission.debriefId}
                      className="mh-btn mh-btn--tinted mh-btn--lg !min-h-8 !px-2"
                      title="Mandatory after the EVA"
                    >
                      <ClipboardCheck className="w-4 h-4" /> {mission.debriefId ? 'Debrief sent' : 'EVA debrief'}
                    </button>
                  </div>
                  {mission.debriefId && (
                    <p className="m-0 text-base text-mh-text2">
                      Debrief {mission.debriefId} submitted: the Scientist and Mission Control have your observations, terrain ratings and dosimeter reading.
                    </p>
                  )}
                </section>
              )}
              {view === 'schedule' && (
                <Card
                  eyebrow={isToday ? `Today · Sol ${mission.sol}` : `Sol ${mission.sol}`}
                  title={isToday ? 'Today’s EVA schedule' : `EVA schedule · Sol ${mission.sol}`}
                  icon={Clock}
                  highlight={isToday}
                >
                  {mission.status === 'changed' && (
                    <div className="mh-alert" role="status">
                      <p className="m-0">Mission control is updating this plan. Wait for the new version before leaving.</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    <Stat tile label="Depart" value={`${mission.startTime}`} />
                    <Stat tile label="Back in base" value={`${plan.returnTime}`} />
                    <Stat tile label="Distance" value={`${plan.totalKm.toFixed(2)} km`} />
                    <Stat tile label="Stops" value={plan.stops.length} />
                  </div>

                  <ol className="m-0 p-0 list-none flex flex-col">
                    {plan.schedule.map((item, i) => {
                      const time = `${item.start}–${item.end}`;
                      const text =
                        item.kind === 'egress'
                          ? 'Egress: airlock & suit checks'
                          : item.kind === 'ingress'
                            ? 'Ingress: back inside the base'
                            : item.kind === 'travel'
                              ? `Walk to ${item.to} · ${item.km.toFixed(2)} km`
                              : item.kind === 'shelter'
                                ? `Pass by ${item.name}`
                              : `${item.poi.id} · ${item.poi.name}${state.measured.includes(item.poi.id) ? ' · measured' : ''}`;
                      const strong = item.kind !== 'travel';
                      return (
                        <li key={i} className="flex gap-2.5 py-2 border-b border-mh-sep last:border-0">
                          <span className="w-28 shrink-0 font-mono text-base text-mh-text2">{time}</span>
                          <span className={`text-base ${strong ? 'font-semibold' : 'text-mh-text2'}`}>{text}</span>
                        </li>
                      );
                    })}
                  </ol>
                </Card>
              )}
              {view === 'targets' && (
                <Card eyebrow="Targets" title="Points of interest to reach" icon={MapPin}>
                  <ol className="m-0 p-0 list-none flex flex-col gap-1.5">
                    {plan.stops.map((poi, idx) => (
                      <li key={poi.id} className="mh-tile !gap-1.5">
                        <button
                          type="button"
                          onClick={() => onFocusPoi(poi)}
                          className="flex items-center gap-2 text-left bg-transparent border-0 p-0 cursor-pointer text-mh-text min-h-7"
                        >
                          <span className="w-6 h-6 shrink-0 rounded-[2px] bg-mh-primary text-mh-on-primary font-mono flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <strong className="text-base">
                            {poi.id} · {poi.name}
                          </strong>
                        </button>
                        <div className="flex flex-wrap gap-1.5">
                          {poi.priority && (
                            <span className={`${PRIORITY_META[poi.priority].cls}`}>
                              {PRIORITY_META[poi.priority].label} priority
                            </span>
                          )}
                          <span className="mh-tag">{poi.durationMin} min on site</span>
                          <span className="mh-tag">{poi.samplesRequired ? 'Collect samples' : 'No samples'}</span>
                        </div>
                        <p className="m-0 text-base">{poi.infoToCollect}</p>
                        {poi.samplesRequired && poi.sampleNotes && (
                          <p className="m-0 text-base text-mh-text2">Samples: {poi.sampleNotes}</p>
                        )}
                        {poi.instruments.length > 0 && (
                          <p className="m-0 text-base text-mh-text2">
                            Instruments: {poi.instruments.map(instrumentName).join(', ')}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            aria-pressed={state.measured.includes(poi.id)}
                            onClick={() => store.toggleMeasured(poi.id)}
                            className={`mh-btn ${state.measured.includes(poi.id) ? 'mh-btn--plain' : 'mh-btn--primary'}`}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            {state.measured.includes(poi.id) ? 'Measured · undo' : 'Log measurement'}
                          </button>
                          <button
                            type="button"
                            onClick={() => onReportAnomaly({ lat: poi.lat, lon: poi.lon, name: `${poi.id} · ${poi.name}` })}
                            className="mh-btn mh-btn--danger"
                          >
                            <AlertTriangle className="w-4 h-4" /> Report anomaly
                          </button>
                        </div>
                      </li>
                    ))}
                  </ol>
                </Card>
              )}
              {view === 'material' && (
                <Card
                  eyebrow="Checklist"
                  title="Material to bring"
                  icon={Backpack}
                  aside={
                    <span className={`mh-pill ${packed.length >= plan.equipment.length ? 'mh-pill--ok' : 'mh-pill--warn'}`}>
                      {packed.filter((p) => plan.equipment.includes(p)).length}/{plan.equipment.length} packed
                    </span>
                  }
                >
                  <div
                    className="mh-progress"
                    role="progressbar"
                    aria-label="Packed items"
                    aria-valuemin={0}
                    aria-valuemax={plan.equipment.length}
                    aria-valuenow={packed.filter((p) => plan.equipment.includes(p)).length}
                  >
                    <span
                      style={{
                        width: `${
                          plan.equipment.length
                            ? (packed.filter((p) => plan.equipment.includes(p)).length / plan.equipment.length) * 100
                            : 0
                        }%`
                      }}
                    />
                  </div>
                  <ul className="mh-list">
                    {plan.equipment.map((item) => {
                      const done = packed.includes(item);
                      return (
                        <li key={item}>
                          <label className={`mh-row cursor-pointer ${done ? 'mh-row--filled' : '!bg-mh-fill'}`}>
                            <input type="checkbox" checked={done} onChange={() => store.togglePacked(mission.id, item)} />
                            <span className="text-base">{item}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              )}
            </>
          )}
        </TabPanel>
      )}
    </>
  );
}
