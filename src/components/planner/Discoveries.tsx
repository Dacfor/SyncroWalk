import { Eye, PlusCircle } from 'lucide-react';
import { FIELD_EVENT_META } from './model.ts';
import type { FieldEvent } from './model.ts';

// Shared by the scientist "Discoveries" tab and the field discoveries map window.

const metaOf = (fe: FieldEvent) => FIELD_EVENT_META[fe.class] ?? FIELD_EVENT_META['formation-interest'];

export function DiscoveryList({
  fieldEvents,
  selectedId,
  onSelect,
  linkedPoiId
}: {
  fieldEvents: FieldEvent[];
  selectedId: string | null;
  onSelect: (fe: FieldEvent) => void;
  linkedPoiId: (feId: string) => string | undefined;
}) {
  return (
    <ul className="m-0 p-0 list-none flex flex-col gap-2" aria-label="Discoveries">
      {fieldEvents.map((item) => {
        const m = metaOf(item);
        const isSel = item.id === selectedId;
        const linked = linkedPoiId(item.id);
        return (
          <li key={item.id}>
            <button
              type="button"
              aria-pressed={isSel}
              onClick={() => onSelect(item)}
              className={`w-full min-h-11 p-3 rounded-mh-md border-2 cursor-pointer text-left text-mh-text flex items-center gap-3 ${
                isSel ? 'bg-mh-fill-blue border-mh-primary' : 'bg-mh-fill border-transparent'
              }`}
            >
              <span className="text-[18px] leading-none shrink-0" style={{ color: m.color }} aria-hidden="true">
                ◆
              </span>
              <span className="min-w-0 flex flex-col">
                <span className="text-base font-semibold">{item.id}</span>
                <span className="text-base text-mh-text2">{m.label}</span>
              </span>
              {linked && <span className="mh-pill mh-pill--ok ml-auto shrink-0">{linked}</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function DiscoveryDetail({
  fe,
  linkedPoiId,
  shownOnMap,
  onToggleShow,
  onUse,
  elevM
}: {
  fe: FieldEvent;
  linkedPoiId?: string;
  shownOnMap: boolean;
  onToggleShow: () => void;
  onUse: () => void;
  elevM?: number;
}) {
  const m = metaOf(fe);
  const rows: [string, string][] = [
    ['Logged', fe.ts],
    ['Source', fe.source],
    ['Method', fe.method],
    ['Image', fe.photo],
    ['Location', `${fe.lat.toFixed(4)}° N · ${fe.lon.toFixed(4)}° E`]
  ];
  if (elevM !== undefined) rows.push(['MOLA elevation', `${elevM} m`]);

  return (
    <section className="flex flex-col gap-3" aria-label={`${fe.id} details`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="mh-pill" style={{ background: `${m.color}26`, color: 'var(--mh-text)' }}>
          {m.label}
        </span>
        <span className={`mh-pill ${fe.status === 'confirmed' ? 'mh-pill--ok' : 'mh-pill--warn'}`}>
          {fe.status === 'confirmed' ? 'Confirmed' : fe.status === 'proposed' ? 'POI proposed by the crew' : 'Needs review'}
        </span>
        <span className="mh-pill mh-pill--info">Confidence {Math.round(fe.confidence * 100)}%</span>
      </div>
      <p className="m-0 text-base">{fe.description}</p>
      <dl className="m-0 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {rows.map(([k, v]) => (
          <div key={k} className="flex flex-col gap-0.5 min-w-0">
            <dt className="font-mono text-[13px] uppercase tracking-[0.08em] text-mh-text2">{k}</dt>
            <dd className="m-0 text-base break-words">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mh-tile !gap-1">
        <span className="font-mono text-[13px] uppercase tracking-[0.08em] text-mh-text2">Field directive</span>
        <span className="text-base">{fe.actionDirective}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`mh-btn ${shownOnMap ? 'mh-btn--plain' : 'mh-btn--tinted'}`}
          aria-pressed={shownOnMap}
          onClick={onToggleShow}
        >
          <Eye className="w-5 h-5" /> {shownOnMap ? 'Hide from main map' : 'Show on main map'}
        </button>
        {linkedPoiId ? (
          <span className="mh-pill mh-pill--ok self-center">Already a point of interest · {linkedPoiId}</span>
        ) : (
          <button type="button" className="mh-btn mh-btn--primary" onClick={onUse}>
            <PlusCircle className="w-5 h-5" /> Use as point of interest
          </button>
        )}
      </div>
    </section>
  );
}
