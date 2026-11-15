// THEMIS surface temperature: map readout panel (observation picker, colour scale, value under the cursor).
// The hover value lives in this component so moving the mouse does not re-render the whole planner.
import { useEffect, useState } from 'react';
import { Thermometer } from 'lucide-react';
import { TEMPERATURE_STOPS, formatLst, kToC, sampleCrop, type ThemisCrop, type ThemisObs } from './themis.ts';

export const formatTemp = (k: number) => `${k.toFixed(1)} K (${kToC(k).toFixed(1)} °C)`;

const obsLabel = (o: ThemisObs) => `${o.date} · ${o.night ? 'night' : 'day'} ${formatLst(o.lst)} LST`;

export default function ThemisTemperaturePanel({
  map,
  catalog,
  catalogError,
  obsId,
  onObsChange,
  crop,
  loading,
  error
}: {
  map: any; // Leaflet map (loaded from the CDN, untyped)
  catalog: ThemisObs[];
  catalogError: string | null;
  obsId: string | null;
  onObsChange: (id: string) => void;
  crop: ThemisCrop | null;
  loading: boolean;
  error: string | null;
}) {
  const [hoverK, setHoverK] = useState<number | null>(null);

  useEffect(() => {
    setHoverK(null);
    if (!map || !crop) return;
    const onMove = (e: any) => {
      const k = sampleCrop(crop, e.latlng.lat, e.latlng.lng);
      setHoverK(Number.isNaN(k) ? null : k); // same grid cell → same value → React skips the re-render
    };
    const onOut = () => setHoverK(null);
    map.on('mousemove', onMove);
    map.on('mouseout', onOut);
    return () => {
      map.off('mousemove', onMove);
      map.off('mouseout', onOut);
    };
  }, [map, crop]);

  const obs = catalog.find((o) => o.id === obsId) ?? null;

  return (
    <div
      className="absolute bottom-3 left-3 z-20 w-[300px] max-w-[calc(100%-5rem)] max-h-[calc(100%-1.5rem)] overflow-y-auto bg-mh-card text-mh-text rounded-mh-md shadow-mh p-3 flex flex-col gap-2"
      aria-live="polite"
    >
      <span className="flex items-center gap-2 font-semibold text-[14px]">
        <Thermometer className="w-4 h-4" aria-hidden="true" /> THEMIS surface temperature
      </span>

      {catalogError && <span className="text-[13px] text-mh-crit">THEMIS catalogue unavailable: {catalogError}</span>}
      {!catalogError && !catalog.length && <span className="text-[13px] text-mh-text2">Loading the THEMIS catalogue (ODE)…</span>}
      {catalog.length > 0 && (
        <label className="mh-layer-select is-on" title="Single THEMIS passes over Jezero (Mars Odyssey, ODE catalogue)">
          <span>Pass</span>
          <select value={obsId ?? ''} onChange={(e) => onObsChange(e.target.value)} aria-label="THEMIS observation">
            {[...catalog].reverse().map((o) => (
              <option key={o.id} value={o.id}>
                {obsLabel(o)}
              </option>
            ))}
          </select>
        </label>
      )}
      {obs && (
        <span className="text-[12px] text-mh-text2 font-mono">
          {obs.id} · Ls {obs.ls.toFixed(0)}°
        </span>
      )}

      {loading && <span className="text-[13px]">Loading the real data (PDS, ~0.5 MB)…</span>}
      {error && <span className="text-[13px] text-mh-crit">{error}</span>}

      {crop && !loading && (
        <>
          <span className="h-2.5 rounded-full" aria-hidden="true" style={{ background: `linear-gradient(90deg, ${TEMPERATURE_STOPS.join(', ')})` }} />
          <span className="flex justify-between gap-2 text-[12px] font-mono">
            <span>
              {crop.lo.toFixed(0)} K ({kToC(crop.lo).toFixed(0)} °C)
            </span>
            <span>
              {crop.hi.toFixed(0)} K ({kToC(crop.hi).toFixed(0)} °C)
            </span>
          </span>
          <span className="text-[13px]">
            {hoverK != null ? (
              <>
                Under the cursor: <strong className="font-mono">{formatTemp(hoverK)}</strong>
              </>
            ) : (
              <span className="text-mh-text2">Hover or click the map to read the local temperature.</span>
            )}
          </span>
          <span className="text-[11px] text-mh-text2">
            Mars Odyssey THEMIS band 9 (12.6 µm), ~100 m/px · colours stretched to this pass (2–98%) · coverage{' '}
            {crop.coveragePct.toFixed(0)}%
          </span>
        </>
      )}
    </div>
  );
}
