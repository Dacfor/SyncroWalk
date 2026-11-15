import { useState } from 'react';
import { ArrowDown, ArrowUp, CalendarDays, HeartPulse, MapPin, PlusCircle, Route, Send, Trash2, Users, X } from 'lucide-react';
import { Card, Chip, Label, PanelTabs, Segmented, Stat, STATUS_META, TabPanel } from './ui.tsx';
import {
  CREW_ROSTER,
  DAYLIGHT,
  INSTRUMENTS,
  LATEST_RETURN,
  PRIORITY_META,
  STANDARD_EQUIPMENT,
  TODAY_SOL,
  WALK_SPEED_KMH,
  planMission
} from './model.ts';
import type { Poi, Priority } from './model.ts';
import type { PlannerStore } from './usePlannerStore.ts';

const PRIORITY_RANK: Record<string, number> = { HIGH: 0, MED: 1, LOW: 2, NONE: 3 };
const byPriority = (a: Poi, b: Poi) =>
  PRIORITY_RANK[a.priority ?? 'NONE'] - PRIORITY_RANK[b.priority ?? 'NONE'] || a.id.localeCompare(b.id);

const DURATIONS = [15, 30, 45, 60, 90, 120];

export type ControlView = 'pois' | 'calendar' | 'route' | 'crew';

/**
 * MISSION CONTROL — prioritises the scientist's points of interest, assigns the
 * instruments for each site, plans one terrain-following route per daily mission
 * (always from the astronaut base) and sends the calendar to the astronauts.
 * Menu: "Points" (priority & instruments) · "Calendar" (daily missions, send) · "Route" (mission editor)
 * · "Crew" (simulated health & radiation status).
 */
export default function ControlPanel({
  store,
  selectedPoiId,
  setSelectedPoiId,
  selectedMissionId,
  setSelectedMissionId,
  onFocusPoi,
  onToast,
  view,
  setView
}: {
  store: PlannerStore;
  selectedPoiId: string | null;
  setSelectedPoiId: (id: string | null) => void;
  selectedMissionId: string | null;
  setSelectedMissionId: (id: string | null) => void;
  onFocusPoi: (poi: Poi) => void;
  onToast: (msg: string) => void;
  view: ControlView;
  setView: (v: ControlView) => void;
}) {
  const { state } = store;
  const [customItem, setCustomItem] = useState('');
  const pois = [...state.pois].sort(byPriority);
  const missions = [...state.missions].sort((a, b) => a.sol - b.sol);
  const pending = missions.filter((m) => m.status !== 'sent').length;
  const mission = state.missions.find((m) => m.id === selectedMissionId) ?? null;
  const plan = mission ? planMission(mission, state.pois) : null;

  const addCustomItem = () => {
    const item = customItem.trim();
    if (!mission || !item || mission.extraEquipment.includes(item)) return;
    store.updateMission(mission.id, { extraEquipment: [...mission.extraEquipment, item] });
    setCustomItem('');
  };

  const toPrioritise = pois.filter((p) => !p.priority).length;

  // Crew status (simulated): EVA crew is "out" when today's mission has been sent with stops
  const todaySent = state.missions.find((m) => m.sol === TODAY_SOL && m.status !== 'draft' && m.poiIds.length > 0);
  const crew = CREW_ROSTER.map((c) => {
    const doseDeltaPct = Math.round((c.doseActualMsv / c.dosePlannedMsv - 1) * 100);
    const health =
      c.fatigue !== 'Low' || doseDeltaPct > 0
        ? { label: 'Monitor', cls: 'mh-pill--warn' }
        : { label: 'Nominal', cls: 'mh-pill--ok' };
    return { ...c, doseDeltaPct, health, onEvaToday: c.evaCrew && !!todaySent };
  });
  const crewToWatch = crew.filter((c) => c.health.label !== 'Nominal').length;
  const openMission = (id: string) => {
    setSelectedMissionId(id);
    setView('route');
  };

  return (
    <>
      <PanelTabs
        label="Mission control menu"
        value={view}
        onChange={setView}
        tabs={[
          { id: 'pois', label: 'Points', icon: MapPin, badge: toPrioritise },
          { id: 'calendar', label: 'Calendar', icon: CalendarDays, badge: pending },
          { id: 'route', label: mission ? `Route · Sol ${mission.sol}` : 'Route', icon: Route },
          { id: 'crew', label: 'Crew', icon: Users, badge: crewToWatch }
        ]}
      />

      {/* ── 1. Points of interest from the scientist ─────────────────────── */}
      {view === 'pois' && (
      <TabPanel id="pois">
      <Card
        eyebrow="From the scientist"
        title="Points of interest"
        subtitle="Select a point to set its priority, instruments and time on site."
        icon={MapPin}
        aside={
          <span className={`mh-pill ${pois.some((p) => !p.priority) ? 'mh-pill--warn' : 'mh-pill--ok'}`}>
            {pois.filter((p) => !p.priority).length} to prioritise
          </span>
        }
      >
        {pois.length === 0 && (
          <p className="m-0 text-base text-mh-text2">The scientist has not defined any point of interest yet.</p>
        )}
        <ul className="m-0 p-0 list-none flex flex-col gap-2">
          {pois.map((poi) => {
            const open = selectedPoiId === poi.id;
            return (
              <li key={poi.id} className={`rounded-mh-md ${open ? 'bg-mh-fill-blue' : 'bg-mh-fill'}`}>
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => {
                    setSelectedPoiId(open ? null : poi.id);
                    if (!open) onFocusPoi(poi);
                  }}
                  className="w-full min-h-11 p-4 text-left bg-transparent border-0 cursor-pointer text-mh-text flex flex-col gap-2"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="flex flex-col gap-0.5 min-w-0">
                      <span className="font-mono text-[13px] text-mh-text2">{poi.id}</span>
                      <strong className="text-base">{poi.name}</strong>
                    </span>
                    {poi.priority ? (
                      <span className={`mh-pill shrink-0 ${PRIORITY_META[poi.priority].cls}`}>
                        {PRIORITY_META[poi.priority].label}
                      </span>
                    ) : (
                      <span className="mh-pill mh-pill--warn shrink-0">No priority</span>
                    )}
                  </span>
                  <span className="text-base text-mh-text2">
                    {poi.interestType} · {poi.instruments.length} instruments · {poi.durationMin} min
                    {poi.samplesRequired ? ' · samples' : ''}
                  </span>
                </button>

                {open && (
                  <div className="px-4 pb-4 flex flex-col gap-4">
                    <div className="mh-tile !bg-mh-card">
                      <span className="mh-eyebrow">Scientist request</span>
                      <p className="m-0 text-base">{poi.infoToCollect}</p>
                      <p className="m-0 text-base text-mh-text2">
                        {poi.samplesRequired
                          ? `Samples: ${poi.sampleNotes || 'required'}`
                          : 'No samples requested'}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <span className="mh-label !text-base">Priority</span>
                      <Segmented
                        label={`Priority of ${poi.id}`}
                        value={(poi.priority ?? 'NONE') as Priority | 'NONE'}
                        onChange={(v) => store.setPriority(poi.id, v === 'NONE' ? null : v)}
                        options={[
                          { value: 'HIGH', label: 'High' },
                          { value: 'MED', label: 'Medium' },
                          { value: 'LOW', label: 'Low' },
                          { value: 'NONE', label: 'Unset' }
                        ]}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <span className="mh-label !text-base">Instruments for the experiments</span>
                      <div className="flex flex-wrap gap-2">
                        {INSTRUMENTS.map((ins) => (
                          <Chip
                            key={ins.id}
                            on={poi.instruments.includes(ins.id)}
                            onClick={() => store.toggleInstrument(poi.id, ins.id)}
                          >
                            {ins.name}
                          </Chip>
                        ))}
                      </div>
                    </div>

                    <div className="max-w-xs">
                      <Label htmlFor={`dur-${poi.id}`}>Time on site</Label>
                      <select
                        id={`dur-${poi.id}`}
                        className="mh-input"
                        value={poi.durationMin}
                        onChange={(e) => store.setDuration(poi.id, Number(e.target.value))}
                      >
                        {DURATIONS.map((d) => (
                          <option key={d} value={d}>
                            {d} min
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
      </TabPanel>
      )}

      {/* ── 2. Calendar of daily missions ───────────────────────────────── */}
      {view === 'calendar' && (
      <TabPanel id="calendar">
      <Card
        eyebrow="Schedule"
        title="Daily missions calendar"
        subtitle="One EVA per Sol. Every route starts and ends at the astronaut base."
        icon={CalendarDays}
      >
        <ul className="m-0 p-0 list-none flex flex-col gap-2">
          {missions.map((m) => {
            const p = planMission(m, state.pois);
            const sel = m.id === selectedMissionId;
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => openMission(m.id)}
                  aria-current={sel ? 'true' : undefined}
                  title="Open the route editor" 
                  className={`w-full p-4 rounded-mh-md border-2 text-left cursor-pointer text-mh-text flex flex-col gap-2 ${
                    sel ? 'bg-mh-fill-blue border-mh-primary' : 'bg-mh-fill border-transparent'
                  }`}
                >
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-base">
                      Sol {m.sol}
                      {m.sol === TODAY_SOL ? ' · Today' : ''}
                    </strong>
                    <span className={`mh-pill ${STATUS_META[m.status].cls}`}>{STATUS_META[m.status].label}</span>
                  </span>
                  <span className="text-base text-mh-text2">
                    {m.startTime} → {p.returnTime} LST · {p.stops.length} stop{p.stops.length === 1 ? "" : "s"} · {p.totalKm.toFixed(2)} km
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {missions.length === 0 && <p className="m-0 text-base text-mh-text2">No missions planned yet.</p>}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="mh-btn mh-btn--tinted"
            onClick={() => openMission(store.addMission())}
          >
            <PlusCircle className="w-5 h-5" /> New daily mission
          </button>
          <button
            type="button"
            className="mh-btn mh-btn--primary"
            disabled={pending === 0}
            onClick={() => {
              const n = store.sendAllMissions();
              onToast(`Calendar sent to the astronauts (${n} updated mission${n === 1 ? '' : 's'})`);
            }}
          >
            <Send className="w-5 h-5" />
            {pending === 0 ? 'Calendar up to date' : `Send calendar to astronauts (${pending})`}
          </button>
        </div>
      </Card>
      </TabPanel>
      )}

      {/* ── 3. Selected mission editor ──────────────────────────────────── */}
      {view === 'route' && (!mission || !plan) && (
        <TabPanel id="route">
          <Card eyebrow="Route editor" title="No mission selected" icon={Route}>
            <p className="m-0 text-base text-mh-text2">
              Open a daily mission from the calendar, or create a new one, to plan its route.
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="mh-btn mh-btn--tinted" onClick={() => setView('calendar')}>
                <CalendarDays className="w-5 h-5" /> Open the calendar
              </button>
              <button type="button" className="mh-btn mh-btn--primary" onClick={() => openMission(store.addMission())}>
                <PlusCircle className="w-5 h-5" /> New daily mission
              </button>
            </div>
          </Card>
        </TabPanel>
      )}
      {view === 'route' && mission && plan && (
        <TabPanel id="route">
        <Card
          eyebrow={`Mission plan · ${STATUS_META[mission.status].label}`}
          title={`Sol ${mission.sol} route`}
          icon={Route}
          highlight
          aside={
            <button
              type="button"
              className="mh-btn mh-btn--icon bg-mh-fill text-mh-text"
              aria-label="Close mission editor"
              onClick={() => {
                setSelectedMissionId(null);
                setView('calendar');
              }}
            >
              <X className="w-5 h-5" />
            </button>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="m-sol">Sol</Label>
              <input
                id="m-sol"
                type="number"
                min={1}
                className="mh-input"
                value={mission.sol}
                onChange={(e) => store.updateMission(mission.id, { sol: Math.max(1, Number(e.target.value) || 1) })}
              />
            </div>
            <div>
              <Label htmlFor="m-start">Departure time (LST)</Label>
              <input
                id="m-start"
                type="time"
                className="mh-input"
                min={DAYLIGHT.start}
                max={DAYLIGHT.end}
                value={mission.startTime}
                onChange={(e) => e.target.value && store.updateMission(mission.id, { startTime: e.target.value })}
              />
            </div>
          </div>
          {missions.some((m) => m.id !== mission.id && m.sol === mission.sol) && (
            <div className="mh-alert" role="alert">
              <p className="m-0">Another mission is already planned on Sol {mission.sol}.</p>
            </div>
          )}

          {/* Stops */}
          <div className="flex flex-col gap-2">
            <span className="mh-label !text-base">Stops (the route follows the terrain from the base)</span>
            <ol className="m-0 p-0 list-none flex flex-col gap-2">
              <li className="mh-tile !flex-row items-center !gap-3">
                <span aria-hidden="true">⌂</span>
                <span className="text-base font-semibold">Depart base · {mission.startTime}</span>
              </li>
              {plan.stops.map((poi, idx) => (
                <li key={poi.id} className="p-3 rounded-mh-md bg-mh-fill flex items-center gap-3">
                  <span className="w-9 h-9 shrink-0 rounded-full bg-mh-primary text-mh-on-primary font-mono flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="flex-1 min-w-0 flex flex-col">
                    <strong className="text-base">
                      {poi.id} · {poi.name}
                    </strong>
                    <span className="text-base text-mh-text2">
                      {poi.priority ? PRIORITY_META[poi.priority].label : 'No'} priority · {poi.durationMin} min
                    </span>
                  </span>
                  <span className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      className="mh-btn mh-btn--icon bg-mh-card text-mh-text"
                      aria-label={`Move ${poi.id} earlier`}
                      disabled={idx === 0}
                      onClick={() => {
                        const ids = [...mission.poiIds];
                        [ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
                        store.updateMission(mission.id, { poiIds: ids });
                      }}
                    >
                      <ArrowUp className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      className="mh-btn mh-btn--icon bg-mh-card text-mh-text"
                      aria-label={`Move ${poi.id} later`}
                      disabled={idx === plan.stops.length - 1}
                      onClick={() => {
                        const ids = [...mission.poiIds];
                        [ids[idx + 1], ids[idx]] = [ids[idx], ids[idx + 1]];
                        store.updateMission(mission.id, { poiIds: ids });
                      }}
                    >
                      <ArrowDown className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      className="mh-btn mh-btn--icon mh-btn--danger"
                      aria-label={`Remove ${poi.id} from this mission`}
                      onClick={() =>
                        store.updateMission(mission.id, { poiIds: mission.poiIds.filter((x) => x !== poi.id) })
                      }
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </span>
                </li>
              ))}
              <li className="mh-tile !flex-row items-center !gap-3">
                <span aria-hidden="true">⌂</span>
                <span className="text-base font-semibold">Back at base · {plan.returnTime}</span>
              </li>
            </ol>

            <Label htmlFor="m-add">Add a stop</Label>
            <select
              id="m-add"
              className="mh-input"
              value=""
              onChange={(e) =>
                e.target.value && store.updateMission(mission.id, { poiIds: [...mission.poiIds, e.target.value] })
              }
            >
              <option value="">Choose a point of interest…</option>
              {pois
                .filter((p) => !mission.poiIds.includes(p.id))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id} · {p.name} ({p.priority ? PRIORITY_META[p.priority].label : 'no'} priority)
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat tile label="Distance" value={`${plan.totalKm.toFixed(2)} km`} />
            <Stat tile label="Walking" value={`${plan.walkMin} min`} />
            <Stat tile label="On site" value={`${plan.workMin} min`} />
            <Stat tile label="Return" value={`${plan.returnTime} LST`} />
          </div>
          <p className="m-0 text-base text-mh-text2">
            Distances follow the terrain. Walking speed {WALK_SPEED_KMH} km/h (demo parameter). Latest return {LATEST_RETURN} LST.
          </p>
          {plan.lateReturn && (
            <div className="mh-alert !bg-mh-crit-bg !text-mh-crit" role="alert">
              <p className="m-0">
                <strong>Late return:</strong> the crew would be back at {plan.returnTime}, after the {LATEST_RETURN}{' '}
                limit. Remove a stop or depart earlier.
              </p>
            </div>
          )}

          {/* Equipment */}
          <div className="flex flex-col gap-2">
            <span className="mh-label !text-base">Material to bring</span>
            <p className="m-0 text-base text-mh-text2">
              Instruments and sample kits are added automatically from the stops.
            </p>
            <ul className="m-0 pl-5 text-base flex flex-col gap-1">
              {plan.equipment.map((item) => (
                <li key={item}>{item}</li>
              ))}
              {plan.equipment.length === 0 && <li className="text-mh-text2">Nothing yet</li>}
            </ul>
            <div className="flex flex-wrap gap-2">
              {[...new Set([...STANDARD_EQUIPMENT, ...mission.extraEquipment])].map((item) => (
                <Chip
                  key={item}
                  on={mission.extraEquipment.includes(item)}
                  onClick={() =>
                    store.updateMission(mission.id, {
                      extraEquipment: mission.extraEquipment.includes(item)
                        ? mission.extraEquipment.filter((x) => x !== item)
                        : [...mission.extraEquipment, item]
                    })
                  }
                >
                  {item}
                </Chip>
              ))}
            </div>
            <div className="flex gap-2">
              <label htmlFor="m-custom" className="sr-only">
                Other material
              </label>
              <input
                id="m-custom"
                className="mh-input"
                placeholder="Other material…"
                value={customItem}
                onChange={(e) => setCustomItem(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomItem())}
              />
              <button type="button" className="mh-btn mh-btn--tinted shrink-0" onClick={addCustomItem}>
                Add
              </button>
            </div>
          </div>

          <button
            type="button"
            className="mh-btn mh-btn--danger self-start"
            onClick={() => {
              if (window.confirm(`Delete the Sol ${mission.sol} mission?`)) {
                store.deleteMission(mission.id);
                setSelectedMissionId(null);
                setView('calendar');
                onToast(`Sol ${mission.sol} mission deleted`);
              }
            }}
          >
            <Trash2 className="w-5 h-5" /> Delete mission
          </button>
        </Card>
        </TabPanel>
      )}

      {/* ── 4. Crew health & radiation (simulated telemetry) ─────────────── */}
      {view === 'crew' && (
        <TabPanel id="crew">
          <Card
            eyebrow="Crew health & radiation"
            title="Astronauts status"
            icon={Users}
            aside={<span className="mh-pill mh-pill--warn">Simulated telemetry</span>}
          >
            <ul className="m-0 p-0 list-none flex flex-col gap-3">
              {crew.map((c) => {
                const fillPct = Math.min(100, (c.doseActualMsv / c.dosePlannedMsv) * 100);
                const over = c.doseDeltaPct > 0;
                return (
                  <li key={c.id} className="mh-tile !gap-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <span className="flex flex-col min-w-0">
                        <strong className="text-base">
                          {c.id} · {c.name}
                        </strong>
                        <span className="text-base text-mh-text2">
                          {c.role}
                          {c.onEvaToday ? ` · on today’s EVA (Sol ${TODAY_SOL})` : ''}
                        </span>
                      </span>
                      <span className={`mh-pill shrink-0 ${c.health.cls}`}>{c.health.label}</span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-mono text-[13px] uppercase tracking-[0.08em] text-mh-text2">
                          Radiation dose (surface, cumulative)
                        </span>
                        <span className={`text-base font-semibold ${over ? 'text-mh-crit' : ''}`}>
                          {c.doseActualMsv.toFixed(2)} / {c.dosePlannedMsv.toFixed(1)} mSv
                        </span>
                      </div>
                      <div
                        className="mh-progress"
                        role="meter"
                        aria-valuemin={0}
                        aria-valuemax={c.dosePlannedMsv}
                        aria-valuenow={c.doseActualMsv}
                        aria-label={`${c.id} measured dose versus planned`}
                      >
                        <span style={{ width: `${fillPct}%`, background: over ? 'var(--mh-crit)' : 'var(--mh-ok)' }} />
                      </div>
                      <span className="text-base text-mh-text2">
                        Measured vs planned: {over ? `+${c.doseDeltaPct}% above plan` : `${c.doseDeltaPct}% (within plan)`}
                      </span>
                    </div>

                    <span className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <Stat label="EVAs done" value={c.evasCompleted} />
                      <Stat label="Heart rate" value={`${c.vitals.heartRate} bpm`} />
                      <Stat label="SpO₂" value={`${c.vitals.spo2}%`} />
                      <Stat label="Sleep" value={`${c.vitals.sleepH} h`} />
                    </span>
                    <span className="flex items-start gap-2 text-base text-mh-text2">
                      <HeartPulse className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>
                        Fatigue {c.fatigue.toLowerCase()} · Psych: {c.psych}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
        </TabPanel>
      )}
    </>
  );
}
