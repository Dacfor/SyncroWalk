import { Backpack, CalendarDays, Clock, MapPin } from 'lucide-react';
import { Card, PanelTabs, Stat, TabPanel } from './ui.tsx';
import { PRIORITY_META, TODAY_SOL, instrumentName, planMission } from './model.ts';
import type { Poi } from './model.ts';
import type { PlannerStore } from './usePlannerStore.ts';

/**
 * ASTRONAUT — sees the calendar sent by mission control, with today's EVA in focus:
 * the timed schedule, the points of interest to reach and the material to bring.
 * Selecting another Sol shows that day's points of interest and route on the map.
 * Menu: "Today"/"Day" (schedule) · "Targets" · "Material" (checklist) · "Calendar".
 */
export type AstronautView = 'schedule' | 'targets' | 'material' | 'calendar';

export default function AstronautPanel({
  store,
  selectedSol,
  setSelectedSol,
  onFocusPoi,
  view,
  setView
}: {
  store: PlannerStore;
  selectedSol: number;
  setSelectedSol: (sol: number) => void;
  onFocusPoi: (poi: Poi) => void;
  view: AstronautView;
  setView: (v: AstronautView) => void;
}) {
  const { state } = store;
  // Drafts are not visible until mission control sends them
  const visible = state.missions.filter((m) => m.status !== 'draft').sort((a, b) => a.sol - b.sol);
  const sols = [...new Set([TODAY_SOL, ...visible.map((m) => m.sol)])].sort((a, b) => a - b);
  const mission = visible.find((m) => m.sol === selectedSol) ?? null;
  const plan = mission ? planMission(mission, state.pois) : null;
  const packed = mission ? state.packed[mission.id] ?? [] : [];
  const isToday = selectedSol === TODAY_SOL;
  const packedCount = plan ? packed.filter((p) => plan.equipment.includes(p)).length : 0;

  // Which Sol the views refer to, with shortcuts back to today / to the calendar
  const dayBar = (
    <div className="bg-mh-card rounded-mh-lg shadow-mh px-5 py-3 flex flex-wrap items-center justify-between gap-2">
      <span className="text-base">
        Showing <strong>Sol {selectedSol}</strong>
        {isToday ? ' · Today' : ''}
      </span>
      <span className="flex flex-wrap gap-2">
        {!isToday && (
          <button type="button" className="mh-btn mh-btn--tinted !min-h-11" onClick={() => setSelectedSol(TODAY_SOL)}>
            Back to today
          </button>
        )}
        <button type="button" className="mh-btn mh-btn--plain !min-h-11" onClick={() => setView('calendar')}>
          <CalendarDays className="w-5 h-5" /> Change day
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
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Mission day">
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
                    className={`min-h-11 px-4 py-2 rounded-mh-md border-2 text-left cursor-pointer flex flex-col ${
                      sel ? 'bg-mh-fill-blue border-mh-primary text-mh-text' : 'bg-mh-fill border-transparent text-mh-text'
                    }`}
                  >
                    <strong className="text-base">
                      Sol {sol}
                      {sol === TODAY_SOL ? ' · Today' : ''}
                    </strong>
                    <span className="text-base text-mh-text2">
                      {m ? `${m.startTime} · ${m.poiIds.length} stop${m.poiIds.length === 1 ? "" : "s"}` : 'No EVA'}
                    </span>
                  </button>
                );
              })}
            </div>
            {sols.some((s) => s < TODAY_SOL) && (
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
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Stat tile label="Depart" value={`${mission.startTime}`} />
                    <Stat tile label="Return" value={`${plan.returnTime}`} />
                    <Stat tile label="Distance" value={`${plan.totalKm.toFixed(2)} km`} />
                    <Stat tile label="Stops" value={plan.stops.length} />
                  </div>

                  <ol className="m-0 p-0 list-none flex flex-col">
                    {plan.schedule.map((item, i) => {
                      const time =
                        item.kind === 'depart' || item.kind === 'return' ? item.time : `${item.start}–${item.end}`;
                      const text =
                        item.kind === 'depart'
                          ? 'Leave the base'
                          : item.kind === 'return'
                            ? 'Back at the base'
                            : item.kind === 'travel'
                              ? `Walk to ${item.to} · ${item.km.toFixed(2)} km`
                              : `${item.poi.id} · ${item.poi.name}`;
                      const strong = item.kind === 'stop' || item.kind === 'depart' || item.kind === 'return';
                      return (
                        <li key={i} className="flex gap-4 py-2 border-b border-mh-sep last:border-0">
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
                  <ol className="m-0 p-0 list-none flex flex-col gap-2">
                    {plan.stops.map((poi, idx) => (
                      <li key={poi.id} className="mh-tile !gap-2">
                        <button
                          type="button"
                          onClick={() => onFocusPoi(poi)}
                          className="flex items-center gap-3 text-left bg-transparent border-0 p-0 cursor-pointer text-mh-text min-h-11"
                        >
                          <span className="w-9 h-9 shrink-0 rounded-full bg-mh-primary text-mh-on-primary font-mono flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <strong className="text-base">
                            {poi.id} · {poi.name}
                          </strong>
                        </button>
                        <div className="flex flex-wrap gap-2">
                          {poi.priority && (
                            <span className={`mh-pill ${PRIORITY_META[poi.priority].cls}`}>
                              {PRIORITY_META[poi.priority].label} priority
                            </span>
                          )}
                          <span className="mh-pill mh-pill--info">{poi.durationMin} min on site</span>
                          <span className={`mh-pill ${poi.samplesRequired ? 'mh-pill--ok' : 'mh-pill--info'}`}>
                            {poi.samplesRequired ? 'Collect samples' : 'No samples'}
                          </span>
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
