import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Crosshair, MapPin, Pencil, PlusCircle, Trash2 } from 'lucide-react';
import { Card, Label, Segmented } from './ui.tsx';
import { INTEREST_TYPES, PRIORITY_META } from './model.ts';
import type { Poi } from './model.ts';
import type { PlannerStore } from './usePlannerStore.ts';

type LatLon = { lat: number; lon: number } | null;

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
 */
export default function ScientistPanel({
  store,
  draftPoint,
  setDraftPoint,
  pickMode,
  setPickMode,
  selectedPoiId,
  onFocusPoi,
  onToast
}: {
  store: PlannerStore;
  draftPoint: LatLon;
  setDraftPoint: (p: LatLon) => void;
  pickMode: boolean;
  setPickMode: (v: boolean) => void;
  selectedPoiId: string | null;
  onFocusPoi: (poi: Poi) => void;
  onToast: (msg: string) => void;
}) {
  const { state } = store;
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // A point picked on the map fills the coordinate fields
  useEffect(() => {
    if (draftPoint) {
      setForm((f) => ({ ...f, lat: draftPoint.lat.toFixed(5), lon: draftPoint.lon.toFixed(5) }));
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
      sampleNotes: form.samplesRequired === 'yes' ? form.sampleNotes.trim() : ''
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

  return (
    <>
      <Card
        eyebrow={editingId ? `Editing ${editingId}` : 'New point of interest'}
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

      <Card
        eyebrow="Science targets"
        title="Your points of interest"
        aside={<span className="mh-pill mh-pill--info">{state.pois.length} defined</span>}
      >
        {state.pois.length === 0 && (
          <p className="m-0 text-base text-mh-text2">No points of interest yet. Add the first one above.</p>
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
    </>
  );
}
