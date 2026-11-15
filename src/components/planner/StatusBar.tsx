import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { marsLmst } from './analysis.ts';

// Status bar at the bottom of the page, in the same look as the top navbar (Mission Hub):
// clocks, sol, scenario, plan version, data links, last update.

export type LinkState = 'ok' | 'degraded' | 'checking' | 'live' | 'built-in';

// Same status pills used everywhere else in the app (dot + label, never colour alone)
const NEUTRAL_PILL = 'bg-mh-nav text-mh-nav-text2 ring-1 ring-inset ring-mh-nav-text2/40';
const LINK_META: Record<LinkState, { cls: string; label: string }> = {
  ok: { cls: 'mh-pill--ok', label: 'OK' },
  live: { cls: 'mh-pill--ok', label: 'Live' },
  degraded: { cls: 'mh-pill--warn', label: 'Degraded' },
  checking: { cls: 'mh-pill--info', label: 'Checking' },
  'built-in': { cls: NEUTRAL_PILL, label: 'Built-in copy' }
};

const hms = (d: Date) => d.toISOString().slice(11, 19);

function Item({ label, title, children, last = false }: { label: string; title: string; children: ReactNode; last?: boolean }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 shrink-0 min-h-7 px-3 border-r border-mh-nav-fill last:border-r-0 ${last ? 'ml-auto border-l' : ''}`}
    >
      <span className="font-mono text-[12px] text-mh-nav-text2">{label}</span>
      {children}
    </span>
  );
}

const Value = ({ children }: { children: ReactNode }) => (
  <strong className="font-mono text-[13px] font-medium text-mh-nav-text tabular-nums">{children}</strong>
);

const Pill = ({ cls, children }: { cls: string; children: ReactNode }) => (
  <span className={`mh-pill ${cls} !py-0 !px-2 !gap-1 !text-[12px]`}>{children}</span>
);

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
      ? { cls: 'mh-pill--crit', label: 'NO-GO' }
      : planVerdict === 'watch'
        ? { cls: 'mh-pill--warn', label: 'GO · watch' }
        : planVerdict === 'ok'
          ? { cls: 'mh-pill--ok', label: 'GO' }
          : { cls: NEUTRAL_PILL, label: 'No EVA' };
  const link = (name: string, st: LinkState) => (
    <Item label={name} title={`${name} data link`}>
      <Pill cls={LINK_META[st].cls}>{LINK_META[st].label}</Pill>
    </Item>
  );
  return (
    <footer className="mh-navbar mh-statusbar" aria-label="Status bar">
      <div className="px-1 sm:px-3 py-1 flex items-center overflow-x-auto mh-no-scrollbar whitespace-nowrap">
        <Item label="UTC" title="Coordinated Universal Time">
          <Value>{hms(now)}</Value>
        </Item>
        <Item label="LMST Jezero" title="Local mean solar time at Jezero (77.45° E), from the real clock">
          <Value>{marsLmst(now)}</Value>
        </Item>
        <Item label="Sol" title="Mission sol of the loaded scenario (simulated)">
          <Value>{sol}</Value>
        </Item>
        <Item label="Scenario" title="Loaded scenario (simulated history)">
          <strong className="text-[13px] font-semibold text-mh-nav-text">{scenario}</strong>
        </Item>
        <Item label="Plan" title="Plan of the day">
          <Value>{planVersion}</Value>
          <Pill cls={verdict.cls}>{verdict.label}</Pill>
        </Item>
        {link('Trek', trek)}
        {link('MMGIS', mmgis)}
        <Item label="Last update" title="Last change of the shared mission state" last>
          <Value>{hms(lastUpdate)} UTC</Value>
        </Item>
      </div>
    </footer>
  );
}
