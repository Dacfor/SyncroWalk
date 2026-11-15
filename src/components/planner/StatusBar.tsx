import { useEffect, useState } from 'react';
import { marsLmst } from './analysis.ts';

// Fixed status bar at the bottom of the console (Astro "global status bar" pattern):
// clocks, sol, scenario, plan version, data links, last update.

export type LinkState = 'ok' | 'degraded' | 'checking' | 'live' | 'built-in';

const LINK_META: Record<LinkState, { cls: string; label: string }> = {
  ok: { cls: 'mh-status--normal', label: 'OK' },
  live: { cls: 'mh-status--normal', label: 'LIVE' },
  degraded: { cls: 'mh-status--serious', label: 'DEGRADED' },
  checking: { cls: 'mh-status--standby', label: 'CHECKING' },
  'built-in': { cls: 'mh-status--off', label: 'BUILT-IN COPY' }
};

const hms = (d: Date) => d.toISOString().slice(11, 19);

export default function StatusBar({
  sol,
  scenario,
  planVersion,
  planVerdict,
  trek,
  mmgis,
  lastUpdate
}: {
  sol: number;
  scenario: string;
  planVersion: string;
  planVerdict: 'ok' | 'watch' | 'violated' | 'none';
  trek: LinkState;
  mmgis: LinkState;
  lastUpdate: Date;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const verdict =
    planVerdict === 'violated'
      ? { cls: 'mh-status--critical', label: 'NO-GO' }
      : planVerdict === 'watch'
        ? { cls: 'mh-status--caution', label: 'GO · WATCH' }
        : planVerdict === 'ok'
          ? { cls: 'mh-status--normal', label: 'GO' }
          : { cls: 'mh-status--off', label: 'NO EVA' };
  const link = (name: string, st: LinkState) => (
    <span title={`${name} data link`}>
      <i>{name}</i>
      <span className={`mh-status ${LINK_META[st].cls}`}>{LINK_META[st].label}</span>
    </span>
  );
  return (
    <footer className="mh-statusbar" aria-label="Status bar">
      <span title="Coordinated Universal Time">
        <i>UTC</i>
        <b>{hms(now)}</b>
      </span>
      <span title="Local mean solar time at Jezero (77.45° E), from the real clock">
        <i>LMST Jezero</i>
        <b>{marsLmst(now)}</b>
      </span>
      <span title="Mission sol of the loaded scenario (simulated)">
        <i>Sol</i>
        <b>{sol}</b>
      </span>
      <span title="Loaded scenario (simulated history)">
        <i>Scenario</i>
        <b>{scenario}</b>
      </span>
      <span title="Plan of the day">
        <i>Plan</i>
        <b>{planVersion}</b>
        <span className={`mh-status ${verdict.cls}`}>{verdict.label}</span>
      </span>
      {link('Trek', trek)}
      {link('MMGIS', mmgis)}
      <span title="Last change of the shared mission state">
        <i>Last update</i>
        <b>{hms(lastUpdate)} UTC</b>
      </span>
    </footer>
  );
}
