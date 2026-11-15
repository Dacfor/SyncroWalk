// ═══════════════════════════════════════════════════════════════════════════════
// TIMELINE — one slider across the years with only the dates that have time-stamped data.
// At each date every time-dependent layer shows ONLY the data of that date (no mixing of
// years): the THEMIS observation acquired that day, Perseverance's position on that Sol.
// Static mosaics (HiRISE, CTX, MOLA, TES…) are not time-dependent and stay as the base.
// ═══════════════════════════════════════════════════════════════════════════════
import type { ThemisObs } from './themis.ts';

// Perseverance landed at Octavia E. Butler on 2021-02-18 20:55 UTC (Sol 0)
const M20_LANDING_MS = Date.UTC(2021, 1, 18, 20, 55);
const SOL_MS = 88775.244 * 1000; // one Mars solar day

export const solToDate = (sol: number) => new Date(M20_LANDING_MS + sol * SOL_MS);
export const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export interface RoverWaypoint {
  sol: number;
  name: string;
  lat: number;
  lon: number;
  elev: number;
}

export interface Epoch {
  date: string; // YYYY-MM-DD (UTC)
  time: number; // ms, for sorting
  themis: ThemisObs[]; // THEMIS observations acquired that day
  rover: RoverWaypoint | null; // Perseverance waypoint of that day
}

/** All dates with time-stamped data, oldest first. */
export const buildEpochs = (themis: ThemisObs[], waypoints: RoverWaypoint[]): Epoch[] => {
  const byDate = new Map<string, Epoch>();
  const at = (date: string, time: number) => {
    let e = byDate.get(date);
    if (!e) {
      e = { date, time, themis: [], rover: null };
      byDate.set(date, e);
    }
    return e;
  };
  themis.forEach((o) => at(o.date, Date.parse(o.utc)).themis.push(o));
  waypoints.forEach((w) => {
    const d = solToDate(w.sol);
    const e = at(isoDay(d), d.getTime());
    if (!e.rover || w.sol > e.rover.sol) e.rover = w;
  });
  return [...byDate.values()].sort((a, b) => a.time - b.time);
};

/** Index of the epoch closest in time to `time` among those matching `pred`. */
export const nearestEpoch = (epochs: Epoch[], time: number, pred: (e: Epoch) => boolean) => {
  let best = -1;
  let bestDt = Infinity;
  epochs.forEach((e, i) => {
    if (!pred(e)) return;
    const dt = Math.abs(e.time - time);
    if (dt < bestDt) {
      bestDt = dt;
      best = i;
    }
  });
  return best;
};
