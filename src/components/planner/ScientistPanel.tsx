import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Crosshair, FlaskConical, Gem, Lightbulb, List, Map as MapIcon, MapPin, MapPinPlus, Pencil, PlusCircle, ScrollText, Trash2 } from 'lucide-react';
import MissionLog from './MissionLog.tsx';
import { DiscoveryDetail, DiscoveryList } from './Discoveries.tsx';
import { Card, Label, PanelTabs, Segmented, TabPanel } from './ui.tsx';
import { FIELD_EVENT_META, INTEREST_TYPES, PRIORITY_META, planFor } from './model.ts';
import {
  CONSTRAINT_STATUS,
  DEMO_ASSUMPTIONS as A,
  HYPOTHESES,
  HYPOTHESIS_STATUS,
  MISSION_OBJECTIVE,
  TIME_WINDOW,
  distToPolylineKm,
  getHydration,
  hypothesisStatus
} from './analysis.ts';
import { SimBadge, ValueWithUncertainty } from './analysisUi.tsx';
import type { FieldEvent, Poi } from './model.ts';
import type { PlannerStore } from './usePlannerStore.ts';

type LatLon = { lat: number; lon: number } | null;
export type ScientistView = 'define' | 'list' | 'discoveries' | 'hypotheses' | 'log';

const EMPTY_FORM = {
  name: '',
  lat: '',
  lon: '',
  interestType: INTEREST_TYPES[0],
  infoToCollect: '',
  samplesRequired: 'no' as 'yes' | 'no',
  sampleNotes: ''
};

/**
 * SCIENTIST — defines points of interest (coordinates typed or picked on the map),
 * their type of interest, the information to collect and whether samples are needed.
 * Menu: "Add point" (definition form) · "My points" (list, edit, delete)
 * · "Discoveries" (in-situ field discoveries FE-…, can become points of interest).
 */
export default function ScientistPanel({
  store,
  draftPoint,
  setDraftPoint,
  pickMode,
  setPickMode,
  selectedPoiId,
  onFocusPoi,
  onToast,
  view,
  setView,
  fieldEvents,
  shownFeId,
  onShowFe,
  onOpenPoiPopup,
  selectedFeId,
  setSelectedFeId,
  onOpenFieldMap,
  pendingFe,
  clearPendingFe
}: {
  store: PlannerStore;
  draftPoint: LatLon;
  setDraftPoint: (p: LatLon) => void;
  pickMode: boolean;
  setPickMode: (v: boolean) => void;
  selectedPoiId: string | null;
  onFocusPoi: (poi: Poi) => void;
  onToast: (msg: string) => void;
  view: ScientistView;
  setView: (v: ScientistView) => void;
  fieldEvents: FieldEvent[];
  shownFeId: string | null;
  onShowFe: (fe: FieldEvent | null) => void;
  onOpenPoiPopup: (poi: Poi) => void;
  selectedFeId: string | null;
  setSelectedFeId: (id: string) => void;
  onOpenFieldMap: () => void;
  pendingFe: FieldEvent | null; // set by the field discoveries map window ("Use as point of interest")
  clearPendingFe: () => void;
}) {
  const { state } = store;
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fromFeId, setFromFeId] = useState<string | null>(null); // form pre-filled from a field discovery

  // A point picked on the map fills the coordinate fields
  useEffect(() => {
    if (draftPoint) {
      setForm((f) => ({ ...f, lat: draftPoint.lat.toFixed(5), lon: draftPoint.lon.toFixed(5) }));
      setView('define');
    }
  }, [draftPoint]);

  const set = <K extends keyof typeof EMPTY_FORM>(k: K, v: (typeof EMPTY_FORM)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onCoordChange = (k: 'lat' | 'lon', v: string) => {
    const next = { ...form, [k]: v };
    setForm(next);
    const lat = Number(next.lat);
    const lon = Number(next.lon);
    if (next.lat !== '' && next.lon !== '' && Number.isFinite(lat) && Number.isFinite(lon)) {
      setDraftPoint({ lat, lon });
    }
  };

  const reset = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFromFeId(null);
    setError(null);
    setDraftPoint(null);
    setPickMode(false);
  };

  const startEdit = (poi: Poi) => {
    setEditingId(poi.id);
    setError(null);
    setForm({
      name: poi.name,
      lat: poi.lat.toFixed(5),
      lon: poi.lon.toFixed(5),
      interestType: poi.interestType,
      infoToCollect: poi.infoToCollect,
      samplesRequired: poi.samplesRequired ? 'yes' : 'no',
      sampleNotes: poi.sampleNotes
    });
    setDraftPoint({ lat: poi.lat, lon: poi.lon });
    onFocusPoi(poi);
    setView('define');
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const lat = Number(form.lat);
    const lon = Number(form.lon);
    if (!form.name.trim()) return setError('Give the point of interest a name.');
    if (form.lat === '' || !Number.isFinite(lat) || lat < -90 || lat > 90)
      return setError('Latitude must be a number between -90 and 90.');
    if (form.lon === '' || !Number.isFinite(lon) || lon < -180 || lon > 180)
      return setError('Longitude must be a number between -180 and 180.');
    if (!form.infoToCollect.trim()) return setError('Describe the information to collect.');

    const data = {
      name: form.name.trim(),
      lat,
      lon,
      interestType: form.interestType,
      infoToCollect: form.infoToCollect.trim(),
      samplesRequired: form.samplesRequired === 'yes',
      sampleNotes: form.samplesRequired === 'yes' ? form.sampleNotes.trim() : '',
      ...(fromFeId && !editingId ? { fromFieldEventId: fromFeId } : {})
    };
    if (editingId) {
      store.updatePoiDefinition(editingId, data);
      onToast(`${editingId} updated`);
    } else {
      const id = store.addPoi(data);
      onToast(`${id} added — mission control can now prioritise it`);
    }
    reset();
  };

  const scheduledSols = (poiId: string) =>
    state.missions.filter((m) => m.poiIds.includes(poiId)).map((m) => m.sol).sort((a, b) => a - b);

  const awaiting = state.pois.filter((p) => !p.priority).length;
  const selectedPoi = state.pois.find((p) => p.id === selectedPoiId) ?? null;

  // What visiting a target costs, estimated with the Mission Control EVA model
  const operationalImpact = (poi: Poi) => {
    const statusOf = (buffer: number) =>
      buffer < TIME_WINDOW.returnBufferMin ? 'violated' : buffer < TIME_WINDOW.returnBufferMin * 1.1 ? 'watch' : 'ok';
    const scheduled = state.missions.filter((m) => m.poiIds.includes(poi.id)).sort((a, b) => a.sol - b.sol)[0];
    if (scheduled) {
      const plan = planFor(state, scheduled);
      return {
        text: `Scheduled Sol ${scheduled.sol}: ${poi.durationMin} min on site · return buffer ${plan.metrics.bufferMin} min`,
        status: statusOf(plan.metrics.bufferMin)
      };
    }
    // Not scheduled: cost of adding it as a detour to the next mission with stops
    const next = [...state.missions]
      .filter((m) => m.sol >= state.todaySol && m.poiIds.length)
      .sort((a, b) => a.sol - b.sol)[0];
    if (!next) return { text: 'Not scheduled yet · no upcoming mission to compare with', status: 'ok' };
    const plan = planFor(state, next);
    const detourKm = distToPolylineKm([poi.lat, poi.lon], plan.path.map((p) => [p.lat, p.lon])) * 2 * A.shelterPathTortuosity;
    const deltaMin = Math.round((detourKm / A.walkSpeedKmhFlat) * 60 + poi.durationMin);
    const newBuffer = plan.metrics.bufferMin - deltaMin;
    return { text: `Not scheduled. Adding it to Sol ${next.sol} ≈ +${deltaMin} min → buffer ${newBuffer} min`, status: statusOf(newBuffer) };
  };

  // Field discovery → pre-filled "Add point" form (the scientist reviews it, then saves)
  const applyDiscovery = (fe: FieldEvent) => {
    const meta = FIELD_EVENT_META[fe.class] ?? FIELD_EVENT_META['formation-interest'];
    setEditingId(null);
    setError(null);
    setFromFeId(fe.id);
    setForm({
      name: fe.title,
      lat: fe.lat.toFixed(5),
      lon: fe.lon.toFixed(5),
      interestType: meta.interestType,
      infoToCollect: `${fe.description}\nField directive: ${fe.actionDirective}`,
      samplesRequired: 'no',
      sampleNotes: ''
    });
    setDraftPoint({ lat: fe.lat, lon: fe.lon });
    setView('define');
  };
  const poiFromFe = (feId: string) => state.pois.find((p) => p.fromFieldEventId === feId);

  // "Use as point of interest" pressed in the field discoveries map window
  useEffect(() => {
    if (pendingFe) {
      applyDiscovery(pendingFe);
      clearPendingFe();
    }
  }, [pendingFe]);
  const fe = fieldEvents.find((f) => f.id === selectedFeId) ?? fieldEvents[0];

  return (
    <>
      <PanelTabs
        label="Scientist menu"
        value={view}
        onChange={setView}
        tabs={[
          { id: 'define', label: editingId ? 'Edit point' : 'Add point', icon: MapPinPlus },
          { id: 'list', label: 'My points', icon: List, badge: state.pois.length },
          { id: 'discoveries', label: 'Discoveries', icon: Gem, badge: fieldEvents.filter((f) => !poiFromFe(f.id)).length },
          { id: 'hypotheses', label: 'Hypotheses', icon: Lightbulb },
          { id: 'log', label: 'Log', icon: ScrollText }
        ]}
      />

      {view === 'define' && (
      <TabPanel id="define">
      <Card
        eyebrow={editingId ? `Editing ${editingId}` : fromFeId ? `From field discovery ${fromFeId}` : 'New point of interest'}
        title={editingId ? 'Edit point of interest' : 'Define a point of interest'}
        subtitle="Type the coordinates or pick the site directly on the map."
        icon={MapPin}
        highlight={pickMode}
      >
        <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
          <div>
            <Label htmlFor="poi-name">Name</Label>
            <input
              id="poi-name"
              className="mh-input"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Delta front vein"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="poi-lat">Latitude (°N)</Label>
              <input
                id="poi-lat"
                className="mh-input font-mono"
                inputMode="decimal"
                value={form.lat}
                onChange={(e) => onCoordChange('lat', e.target.value)}
                placeholder="18.44907"
              />
            </div>
            <div>
              <Label htmlFor="poi-lon">Longitude (°E)</Label>
              <input
                id="poi-lon"
                className="mh-input font-mono"
                inputMode="decimal"
                value={form.lon}
                onChange={(e) => onCoordChange('lon', e.target.value)}
                placeholder="77.45527"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setPickMode(!pickMode)}
            aria-pressed={pickMode}
            className={`mh-btn self-start ${pickMode ? 'mh-btn--primary' : 'mh-btn--tinted'}`}
          >
            <Crosshair className="w-5 h-5" />
            {pickMode ? 'Click a point on the map… (cancel)' : 'Pick on map'}
          </button>

          <div>
            <Label htmlFor="poi-type">Type of interest</Label>
            <select
              id="poi-type"
              className="mh-input"
              value={form.interestType}
              onChange={(e) => set('interestType', e.target.value)}
            >
              {INTEREST_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="poi-info">Information to collect</Label>
            <textarea
              id="poi-info"
              className="mh-input min-h-24 resize-y"
              value={form.infoToCollect}
              onChange={(e) => set('infoToCollect', e.target.value)}
              placeholder="e.g. Mineral chemistry of the vein, context images, layering"
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="mh-label !text-base">Collect samples for analysis?</span>
            <Segmented
              label="Collect samples"
              value={form.samplesRequired}
              onChange={(v) => set('samplesRequired', v)}
              options={[
                { value: 'no', label: 'No' },
                { value: 'yes', label: 'Yes' }
              ]}
            />
          </div>

          {form.samplesRequired === 'yes' && (
            <div>
              <Label htmlFor="poi-samples">Samples to collect</Label>
              <input
                id="poi-samples"
                className="mh-input"
                value={form.sampleNotes}
                onChange={(e) => set('sampleNotes', e.target.value)}
                placeholder="e.g. 1 core, 2 rock chips"
              />
            </div>
          )}

          {error && (
            <div className="mh-alert !bg-mh-crit-bg !text-mh-crit" role="alert">
              <p className="m-0">{error}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="submit" className="mh-btn mh-btn--primary">
              <PlusCircle className="w-5 h-5" />
              {editingId ? 'Save changes' : 'Add point of interest'}
            </button>
            {(editingId || form.name || form.lat || form.lon) && (
              <button type="button" onClick={reset} className="mh-btn mh-btn--plain">
                Cancel
              </button>
            )}
          </div>
        </form>
      </Card>
      </TabPanel>
      )}

      {view === 'list' && (
      <TabPanel id="list">
      {selectedPoi && (() => {
        const h = getHydration(selectedPoi);
        const hyps = HYPOTHESES.filter((x) => x.poiIds.includes(selectedPoi.id));
        const impact = operationalImpact(selectedPoi);
        const measured = state.measured.includes(selectedPoi.id);
        const post = selectedPoi.pdsInSituPosterior;
        return (
          <Card
            eyebrow={`Selected target · ${selectedPoi.id}`}
            title={selectedPoi.name}
            icon={FlaskConical}
            highlight
            aside={measured ? <span className="mh-pill mh-pill--ok">Measured in the field</span> : undefined}
          >
            {selectedPoi.geologicalUnit && <p className="m-0 text-base text-mh-text2">{selectedPoi.geologicalUnit}</p>}
            {h.prior && h.posterior ? (
              <ValueWithUncertainty
                label="Hydration"
                unit="wt% H₂O"
                prior={h.prior}
                posterior={h.posterior}
                priorSource="MRO · CRISM · 18 m/px"
                posteriorSource="Handheld SuperCam + PIXL + SHERLOC · cm scale"
              />
            ) : h.prior ? (
              <>
                <ValueWithUncertainty label="Hydration" value={h.prior.value} sigma={h.prior.sigma} unit="wt% H₂O" kind="prior" source="MRO · CRISM · 18 m/px" />
                <p className="m-0 text-base text-mh-text2">No in-situ measurement yet. The 12-min funnel will replace this estimate.</p>
              </>
            ) : (
              <p className="m-0 text-base text-mh-text2">No orbital hydration estimate for this target.</p>
            )}

            <div className="flex flex-col gap-1">
              <span className="font-mono text-[13px] uppercase tracking-[0.08em] text-mh-text2">Linked hypothesis</span>
              {hyps.length ? (
                hyps.map((x) => (
                  <span key={x.id} className="text-base">
                    <strong>{x.id}</strong> · {x.title}
                  </span>
                ))
              ) : (
                <span className="text-base text-mh-text2">Not linked yet</span>
              )}
            </div>

            <div className="mh-tile !gap-1.5">
              <span className="font-mono text-[13px] uppercase tracking-[0.08em] text-mh-text2">
                Operational impact · Mission Control model
              </span>
              <span className="flex flex-wrap items-center gap-2 text-base">
                <span className={`mh-pill ${CONSTRAINT_STATUS[impact.status as keyof typeof CONSTRAINT_STATUS].cls} !text-[13px]`}>
                  {CONSTRAINT_STATUS[impact.status as keyof typeof CONSTRAINT_STATUS].label}
                </span>
                <span>{impact.text}</span>
                <SimBadge />
              </span>
            </div>

            {post?.pixl && (
              <details>
                <summary className="cursor-pointer text-base font-semibold text-mh-link min-h-11 flex items-center">Instrument notes</summary>
                <dl className="m-0 flex flex-col gap-2 pt-1">
                  {[
                    ['SuperCam', post.supercam],
                    ['PIXL XRF', post.pixl],
                    ['SHERLOC Raman', post.sherloc],
                    ['Biosignature potential', post.biosignatureRating]
                  ]
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <div key={k} className="flex flex-col gap-0.5">
                        <dt className="font-mono text-[13px] uppercase tracking-[0.08em] text-mh-text2">{k}</dt>
                        <dd className="m-0 text-base">{v}</dd>
                      </div>
                    ))}
                </dl>
              </details>
            )}
          </Card>
        );
      })()}
      <Card
        eyebrow="Science targets"
        title="Your points of interest"
        subtitle={awaiting > 0 ? `${awaiting} waiting for a priority from mission control.` : 'All points have a priority.'}
        aside={<span className="mh-pill mh-pill--info">{state.pois.length} defined</span>}
      >
        {state.pois.length === 0 && (
          <div className="flex flex-col gap-3 items-start">
            <p className="m-0 text-base text-mh-text2">No points of interest yet.</p>
            <button type="button" className="mh-btn mh-btn--primary" onClick={() => setView('define')}>
              <PlusCircle className="w-5 h-5" /> Add the first one
            </button>
          </div>
        )}
        <ul className="m-0 p-0 list-none flex flex-col gap-2">
          {state.pois.map((poi) => {
            const sols = scheduledSols(poi.id);
            return (
              <li
                key={poi.id}
                className={`p-4 rounded-mh-md flex flex-col gap-2 ${
                  selectedPoiId === poi.id ? 'bg-mh-fill-blue' : 'bg-mh-fill'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onFocusPoi(poi)}
                  className="text-left bg-transparent border-0 p-0 cursor-pointer text-mh-text flex flex-col gap-1 min-h-11"
                >
                  <span className="font-mono text-[13px] text-mh-text2">
                    {poi.id} · {poi.lat.toFixed(5)}° N, {poi.lon.toFixed(5)}° E
                  </span>
                  <strong className="text-base">{poi.name}</strong>
                </button>
                <div className="flex flex-wrap gap-2">
                  <span className="mh-pill mh-pill--info">{poi.interestType}</span>
                  <span className={`mh-pill ${poi.samplesRequired ? 'mh-pill--ok' : 'mh-pill--info'}`}>
                    {poi.samplesRequired ? 'Samples required' : 'No samples'}
                  </span>
                  {poi.priority ? (
                    <span className={`mh-pill ${PRIORITY_META[poi.priority].cls}`}>
                      Priority: {PRIORITY_META[poi.priority].label}
                    </span>
                  ) : (
                    <span className="mh-pill mh-pill--warn">Awaiting priority</span>
                  )}
                  {(state.measured.includes(poi.id) || poi.measuredAt) && (
                    <span className="mh-pill mh-pill--ok">Measured in situ{poi.measuredAt ? ` · ${poi.measuredAt}` : ''}</span>
                  )}
                  {!poi.pdsInSituPosterior && <span className="mh-pill mh-pill--warn">Orbital prior only</span>}
                  {poi.parentId && <span className="mh-pill mh-pill--info">Follow-up of {poi.parentId}</span>}
                  {sols.length > 0 && (
                    <span className="mh-pill mh-pill--ok">Scheduled Sol {sols.join(', ')}</span>
                  )}
                </div>
                <p className="m-0 text-base text-mh-text2">{poi.infoToCollect}</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => startEdit(poi)} className="mh-btn mh-btn--plain !px-4">
                    <Pencil className="w-4 h-4" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Delete ${poi.id} “${poi.name}”? It will also be removed from any mission.`)) {
                        store.deletePoi(poi.id);
                        if (editingId === poi.id) reset();
                        onToast(`${poi.id} deleted`);
                      }
                    }}
                    className="mh-btn mh-btn--danger !px-4"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
      </TabPanel>
      )}

      {view === 'discoveries' && (
        <TabPanel id="discoveries">
          <Card
            eyebrow="Field discoveries"
            title="In-situ discoveries"
            subtitle="Logged by the crew during EVAs. Review one, show it on the map or turn it into a point of interest."
            icon={Gem}
          >
            <button type="button" className="mh-btn mh-btn--tinted self-start" onClick={onOpenFieldMap}>
              <MapIcon className="w-5 h-5" /> Open discoveries map
            </button>
            <DiscoveryList
              fieldEvents={fieldEvents}
              selectedId={fe?.id ?? null}
              onSelect={(item) => setSelectedFeId(item.id)}
              linkedPoiId={(id) => poiFromFe(id)?.id}
            />
          </Card>

          {fe && (
            <Card eyebrow={fe.id} title={fe.title} highlight={shownFeId === fe.id}>
              <DiscoveryDetail
                fe={fe}
                linkedPoiId={poiFromFe(fe.id)?.id}
                shownOnMap={shownFeId === fe.id}
                onToggleShow={() => onShowFe(shownFeId === fe.id ? null : fe)}
                onUse={() => applyDiscovery(fe)}
              />
            </Card>
          )}
        </TabPanel>
      )}

      {view === 'log' && (
        <TabPanel id="log">
          <MissionLog state={state} />
        </TabPanel>
      )}

      {view === 'hypotheses' && (
        <TabPanel id="hypotheses">
          <Card eyebrow={`Objective · ${MISSION_OBJECTIVE}`} title="Hypotheses" icon={Lightbulb} aside={<SimBadge />}>
            <p className="m-0 text-base text-mh-text2">
              Status from the in-situ measurements of the targets that test each hypothesis (demo rule: a result 1σ above the
              orbital prior supports it, 1σ below weakens it).
            </p>
            <ul className="m-0 p-0 list-none flex flex-col gap-2">
              {HYPOTHESES.map((hy) => {
                const meta = HYPOTHESIS_STATUS[hypothesisStatus(hy, state.pois) as keyof typeof HYPOTHESIS_STATUS];
                return (
                  <li key={hy.id} className="mh-tile !gap-2">
                    <span className="flex flex-wrap items-center gap-2">
                      <strong className="text-base">{hy.id}</strong>
                      <span className={`mh-pill ${meta.cls} !text-[13px]`}>{meta.label}</span>
                    </span>
                    <span className="text-base">{hy.title}</span>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[14px] text-mh-text2">Tested by</span>
                      {hy.poiIds.map((pid) => {
                        const poi = state.pois.find((p) => p.id === pid);
                        return poi ? (
                          <button
                            key={pid}
                            type="button"
                            onClick={() => onOpenPoiPopup(poi)}
                            className="mh-btn bg-mh-card text-mh-text !min-h-11 !px-4 !text-[15px]"
                          >
                            {pid}
                          </button>
                        ) : (
                          <span key={pid} className="text-[14px] text-mh-text2">
                            {pid} (not a target yet)
                          </span>
                        );
                      })}
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
