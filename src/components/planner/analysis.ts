// @ts-nocheck -- numeric demo model ported from the dev_dac branch; kept untyped like MissionPlanner.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// EVA ANALYSIS MODEL — DEMO ASSUMPTIONS + PURE, TESTABLE HELPERS
// Every constant below is ILLUSTRATIVE (a "demo value"), chosen to be physically
// plausible. Nothing here is a NASA requirement or a PDS measurement, except where
// a published reference is cited as context.
// ═══════════════════════════════════════════════════════════════════════════════

export const BASE = { name: 'Astronaut base', lat: 18.44907, lon: 77.45527 };

export const KM_PER_DEG = 59.16; // km per degree of latitude on Mars

export const DEMO_ASSUMPTIONS = {
  // ── Radiation ──────────────────────────────────────────────────────────────
  // GCR dose equivalent at the surface: 0.64 mSv/sol (MSL/RAD at Gale, Hassler et al. 2014)
  doseBackgroundMsvPerSol: 0.64,
  // Surface ABSORBED dose rate in µGy/h (tissue). EVA dose (mSv) = rate × hours × qualityFactor ÷ 1000
  doseRateNominalUgyH: 9.1,
  doseRateSepUgyH: 820, // scripted SEP event (demo)
  qualityFactor: 3.05, // mSv per mGy for surface GCR (0.64 mSv ÷ 0.21 mGy per sol)
  habitatShieldingFactor: 0.6, // dose inside the base = surface dose × 0.6
  stormShelterFactor: 0.1, // inside the storm shelter / rock alcove during an SEP
  crewSurfaceDoseBudgetMsv: 40, // demo budget for this surface phase
  nasaCareerLimitMsv: 600, // NASA-STD-3001 career limit — context only, not used in decisions
  surfacePhaseSols: 45,
  evaDoseLimitMsv: 2, // demo per-EVA dose limit
  sepMinWarningMin: 40, // minimum warning before ~100 MeV protons arrive → max time to shelter
  // ── Mobility (reduced suit mobility) ───────────────────────────────────────
  walkSpeedKmhFlat: 2.5,
  slopeSpeedLossPerDeg: 0.035, // speed × (1 − 0.035 × slope°), never below 30 %
  softSoilSpeedFactor: 0.6, // within softSoilRadiusKm of a soft-soil field report
  softSoilRadiusKm: 0.08,
  notEvaluatedSpeedFactor: 0.75, // terrain not evaluated from orbit → walk slower
  shelterPathTortuosity: 1.2, // straight line → walkable path when running to a shelter
  // ── Timeline ───────────────────────────────────────────────────────────────
  egressMin: 20, // airlock + suit checks
  ingressMin: 15,
  funnelMinPerPoi: 12, // handheld SuperCam → abrader → PIXL/SHERLOC
  // ── Metabolic & suit consumables ───────────────────────────────────────────
  metabolicWalkFlatW: 300,
  metabolicPerSlopeDegW: 25,
  softTerrainMetabolicFactor: 1.3,
  metabolicStationW: 220,
  metabolicOverheadW: 180, // egress / ingress
  suitConsumablesWh: 2000, // demo O2 / cooling capacity, expressed as metabolic energy
  suitReservePct: 20,
  // ── Terrain & environment ──────────────────────────────────────────────────
  slopeLimitDeg: 15,
  notEvaluatedMaxPct: 10, // max share of the route on not-evaluated terrain
  dustDevilWindowLst: ['11:00', '15:00'],
  tauNominal: 0.45, // MEDA historical (Sol 455)
  tauSep: 2.4, // scripted dust front with the SEP scenario
  tauVisibilityDegraded: 3,
  latitudeDeg: 18.44,
  solarDeclinationDeg: 12.3 // Ls ≈ 30° (demo season)
};

// EVA time window (demo parameters)
export const TIME_WINDOW = { evaMaxMin: 300, returnBufferMin: 45, latestReturn: '14:30' };

// Local slopes (HiRISE DTM 1 m/px — demo values). MOLA alone (~460 m/px) cannot see them.
export const SLOPE_FEATURES = [
  { id: 'SCARP', name: 'Delta scarp below Skinner Ridge', slopeDeg: 19.4, radiusKm: 0.06, coords: [[18.4468, 77.4542], [18.4518, 77.4595]] },
  { id: 'WILDCAT', name: 'Wildcat Ridge climb', slopeDeg: 13.5, radiusKm: 0.07, coords: [[18.4438, 77.4516], [18.4452, 77.4512]] },
  { id: 'NUKSHAK', name: 'Cape Nukshak bench', slopeDeg: 14.2, radiusKm: 0.03, coords: [[18.4398, 77.4484], [18.4408, 77.4485]] }
];

// Shelters: the astronaut base (storm shelter inside) and a rock alcove at the delta foot
export const SHELTERS = [
  { id: 'BASE', name: BASE.name, lat: BASE.lat, lon: BASE.lon },
  { id: 'ALCOVE', name: 'Delta basal alcove', lat: 18.4428, lon: 77.4472 }
];

// Terrain not evaluated from orbit (same zones as the map layer)
export const NOT_EVALUATED_BOUNDS = [
  [[18.4505, 77.4565], [18.4555, 77.4645]],
  [[18.4235, 77.4485], [18.4295, 77.4565]]
];

// Orbital CRISM prior zones (18 m/px). sigmaPct = 1σ relative uncertainty of the hydration estimate (demo)
export const PRIOR_ZONES = [
  { id: 'PZ-DELTA', label: 'Fe/Mg smectite (delta front)', sigmaPct: 32, coords: [[18.4415, 77.4455], [18.4525, 77.4465], [18.4535, 77.4605], [18.4425, 77.4585]] },
  { id: 'PZ-SEITAH', label: 'Olivine + carbonate (Séítah)', sigmaPct: 36, coords: [[18.4235, 77.4535], [18.4355, 77.4545], [18.4365, 77.4665], [18.4245, 77.4655]] }
];

// Hypotheses for the objective "Delta phyllosilicates & biosignatures" (demo data)
export const MISSION_OBJECTIVE = 'Delta phyllosilicates & biosignatures';
export const HYPOTHESES = [
  { id: 'H1', title: 'Delta-front mudstones preserve aqueous clays', poiIds: ['POI-1', 'POI-2'] },
  { id: 'H2', title: 'Silica veins at the Séítah–delta contact record late fluids', poiIds: ['POI-4'] },
  { id: 'H3', title: 'Delta conglomerates sample the wider watershed', poiIds: ['POI-3'] }
];

// ── Time & geometry ─────────────────────────────────────────────────────────
export const lstToMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
export const addMinutesToLst = (hhmm, minutes) => {
  const total = (((lstToMin(hhmm) + minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(Math.round(total) % 60).padStart(2, '0')}`;
};

const COS_LAT = Math.cos((DEMO_ASSUMPTIONS.latitudeDeg * Math.PI) / 180);
const toKmXY = ([lat, lon]) => [lon * COS_LAT * KM_PER_DEG, lat * KM_PER_DEG];
export const distKm = (a, b) => {
  const [ax, ay] = toKmXY(a);
  const [bx, by] = toKmXY(b);
  return Math.hypot(ax - bx, ay - by);
};
const distToSegmentKm = (p, a, b) => {
  const [px, py] = toKmXY(p);
  const [ax, ay] = toKmXY(a);
  const [bx, by] = toKmXY(b);
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};
export const distToPolylineKm = (p, coords) =>
  coords.slice(1).reduce((m, b, i) => Math.min(m, distToSegmentKm(p, coords[i], b)), Infinity);
export const bearingDeg = (from, to) => {
  const [ax, ay] = toKmXY(from);
  const [bx, by] = toKmXY(to);
  return ((Math.atan2(bx - ax, by - ay) * 180) / Math.PI + 360) % 360;
};
export const compassPoint = (deg) => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(deg / 45) % 8];
const inNotEvaluated = ([lat, lon]) =>
  NOT_EVALUATED_BOUNDS.some(([[a, b], [c, d]]) => lat >= a && lat <= c && lon >= b && lon <= d);

// Local Jezero MOLA elevation estimator (Séítah ≈ −2570 m → western delta ≈ −2490 m)
export const molaElevationEstimate = (lat, lon) =>
  Math.round(-2564 + Math.max(0, (lat - 18.435) * 1400 - (lon - 77.455) * 900));

const localSlopeFeature = (pt) =>
  SLOPE_FEATURES.filter((f) => distToPolylineKm(pt, f.coords) <= f.radiusKm).sort((a, b) => b.slopeDeg - a.slopeDeg)[0] ??
  null;
const isSoftSoil = (pt, fieldEvents, A) =>
  fieldEvents.some((f) => f.class === 'soft-soil' && distKm(pt, [f.lat, f.lon]) <= A.softSoilRadiusKm);

// Walking speed multiplier at a point (slope feature, soft soil, not-evaluated terrain)
const terrainSpeedFactor = (pt, slopeDeg, fieldEvents, A) => {
  let f = Math.max(0.3, 1 - A.slopeSpeedLossPerDeg * slopeDeg);
  if (isSoftSoil(pt, fieldEvents, A)) f *= A.softSoilSpeedFactor;
  if (inNotEvaluated(pt)) f *= A.notEvaluatedSpeedFactor;
  return f;
};

// Minutes to walk to the nearest shelter (base or alcove) from a point
export const timeToShelterMin = (pt, fieldEvents, A = DEMO_ASSUMPTIONS) => {
  const feature = localSlopeFeature(pt);
  const local = terrainSpeedFactor(pt, feature?.slopeDeg ?? 0, fieldEvents, A);
  const speed = A.walkSpeedKmhFlat * (0.5 + 0.5 * local);
  const km = Math.min(...SHELTERS.map((s) => distKm(pt, [s.lat, s.lon]))) * A.shelterPathTortuosity;
  return (km / speed) * 60;
};

/**
 * Full EVA model for one daily mission. Pure: depends only on its arguments.
 * waypoints = base → stops → base, legs = terrain-following geometry of each leg,
 * stops = the POIs in visit order (time on site = durationMin set by mission control).
 * Returns distances, ETAs (LST), buffer, slopes, not-evaluated km, time-to-shelter,
 * a ~40-sample elevation profile, metabolic load, suit consumables and EVA dose per EV.
 */
export const computeMissionMetrics = (waypoints, legs, stopPois, startLst, ctx = {}) => {
  const A = DEMO_ASSUMPTIONS;
  const { fieldEvents = [], sepAlert = false } = ctx;
  const wps = waypoints.map((p) => [p.lat, p.lon]);
  const legsXY = legs.map((leg) => leg.map((p) => [p.lat, p.lon]));
  const elevAt = (i) => molaElevationEstimate(wps[i][0], wps[i][1]);

  let t = A.egressMin; // minutes since the start of the EVA
  let energyKJ = (A.metabolicOverheadW * A.egressMin * 60) / 1000;
  let peakW = A.metabolicOverheadW;
  let distanceKm = 0;
  let walkMin = 0;
  let stationMin = 0;
  let neKm = 0;
  let steepKm = 0;
  let maxSlopeDeg = 0;
  let maxSlopeName = 'MOLA gradient';
  let maxShelterMin = 0;
  let gainM = 0;
  const raw = [];
  const legStats = [];
  const stops = [{ kind: 'start', name: BASE.name, lat: wps[0][0], lon: wps[0][1], etaMin: 0, departMin: t, distKm: 0 }];

  legsXY.forEach((leg, li) => {
    const elevA = elevAt(li);
    const elevB = elevAt(li + 1);
    const legLen = leg.slice(1).reduce((s, q, i) => s + distKm(leg[i], q), 0) || 1e-9;
    const legStart = t;
    const legStartKm = distanceKm;
    let along = 0;
    let prevElev = elevA;
    leg.slice(1).forEach((q, i) => {
      const p = leg[i];
      const d = distKm(p, q);
      along += d;
      const f = along / legLen;
      // Elevation anchored on the waypoints, MOLA trend in between
      const elev = elevA + (elevB - elevA) * f + (molaElevationEstimate(q[0], q[1]) - (elevA + (elevB - elevA) * f));
      const mid = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      const profileSlope = d > 0 ? Math.abs((Math.atan2(elev - prevElev, d * 1000) * 180) / Math.PI) : 0;
      const feature = localSlopeFeature(mid);
      const slope = Math.max(profileSlope, feature?.slopeDeg ?? 0);
      if (slope > maxSlopeDeg) {
        maxSlopeDeg = slope;
        maxSlopeName = feature && feature.slopeDeg >= profileSlope ? feature.name : 'MOLA gradient';
      }
      const ne = inNotEvaluated(mid);
      const soft = isSoftSoil(mid, fieldEvents, A);
      const speed = A.walkSpeedKmhFlat * terrainSpeedFactor(mid, slope, fieldEvents, A);
      const segMin = (d / speed) * 60;
      const watts = (A.metabolicWalkFlatW + A.metabolicPerSlopeDegW * slope) * (soft || ne ? A.softTerrainMetabolicFactor : 1);
      energyKJ += (watts * segMin * 60) / 1000;
      peakW = Math.max(peakW, watts);
      if (elev > prevElev) gainM += elev - prevElev;
      prevElev = elev;
      distanceKm += d;
      walkMin += segMin;
      t += segMin;
      if (ne) neKm += d;
      if (slope > A.slopeLimitDeg) steepKm += d;
      maxShelterMin = Math.max(maxShelterMin, timeToShelterMin(mid, fieldEvents, A));
      raw.push({ distKm: distanceKm, elev, slope, ne, soft, steep: slope > A.slopeLimitDeg, a: p, b: q });
    });
    legStats.push({ km: distanceKm - legStartKm, startMin: legStart, endMin: t });

    const poi = stopPois[li];
    if (poi) {
      const st = poi.durationMin ?? A.funnelMinPerPoi;
      stops.push({ kind: 'poi', poiId: poi.id, name: `${poi.id} · ${poi.name.split('(')[0].trim()}`, lat: wps[li + 1][0], lon: wps[li + 1][1], etaMin: t, stationMin: st, distKm: distanceKm, departMin: t + st });
      stationMin += st;
      energyKJ += (A.metabolicStationW * st * 60) / 1000;
      t += st;
    } else {
      stops.push({ kind: 'base', name: BASE.name, lat: wps[li + 1][0], lon: wps[li + 1][1], etaMin: t, distKm: distanceKm, departMin: t });
    }
  });

  energyKJ += (A.metabolicOverheadW * A.ingressMin * 60) / 1000;
  const evaDurationMin = Math.round(t + A.ingressMin);
  const endLst = addMinutesToLst(startLst, evaDurationMin);
  const bufferMin = Math.round(lstToMin(TIME_WINDOW.latestReturn) - lstToMin(startLst) - evaDurationMin);
  const energyWh = energyKJ / 3.6;
  const consumablesUsedPct = (energyWh / A.suitConsumablesWh) * 100;
  const toMsv = (ugyPerH, minutes) => (ugyPerH * (minutes / 60) * A.qualityFactor) / 1000;
  const doseEvaMsv = toMsv(sepAlert ? A.doseRateSepUgyH : A.doseRateNominalUgyH, evaDurationMin);

  // ~40 samples for the elevation profile + contiguous segments (steep / not evaluated)
  const n = 40;
  const samples = raw.length
    ? Array.from({ length: n + 1 }, (_, i) => raw.find((s) => s.distKm >= (distanceKm * i) / n - 1e-9) ?? raw[raw.length - 1])
    : [];
  const segments = raw.map((s, i) => ({ from: i === 0 ? 0 : raw[i - 1].distKm, to: s.distKm, steep: s.steep, ne: s.ne, a: s.a, b: s.b }));

  return {
    stops: stops.map((s) => ({
      ...s,
      etaLst: addMinutesToLst(startLst, Math.round(s.etaMin)),
      departLst: addMinutesToLst(startLst, Math.round(s.departMin ?? s.etaMin))
    })),
    legStats,
    startLst,
    endLst,
    distanceKm,
    walkMin,
    stationMin,
    evaDurationMin,
    bufferMin,
    maxSlopeDeg,
    maxSlopeName,
    steepKm,
    neKm,
    nePct: distanceKm ? (neKm / distanceKm) * 100 : 0,
    maxTimeToShelterMin: maxShelterMin,
    gainM,
    energyKJ,
    energyWh,
    avgW: evaDurationMin ? (energyKJ * 1000) / (evaDurationMin * 60) : 0,
    peakW,
    consumablesRemainingPct: Math.max(0, 100 - consumablesUsedPct),
    doseEvaMsv,
    samples,
    segments
  };
};

/**
 * Turns mission metrics into an explicit list of constraints with numeric margins.
 * status: ok (margin ≥ 10 % of scale) · watch (0–10 %) · violated (margin < 0).
 * The binding constraint (smallest relative margin) is flagged `determinant`.
 */
export const evaluateConstraints = (m, ctx = {}) => {
  const A = DEMO_ASSUMPTIONS;
  const tw = TIME_WINDOW;
  const rows = [];
  const add = (id, name, value, limit, dir, unit, scale, fmt = (v) => `${Math.round(v)}`) => {
    const margin = dir === 'max' ? limit - value : value - limit;
    const rel = margin / Math.abs(scale || limit || 1);
    const status = margin < 0 ? 'violated' : rel < 0.1 ? 'watch' : 'ok';
    rows.push({ id, name, value, limit, dir, unit, margin, rel, status, fmt });
  };
  add('duration', 'EVA duration', m.evaDurationMin, tw.evaMaxMin, 'max', 'min');
  add('buffer', 'Return buffer', m.bufferMin, tw.returnBufferMin, 'min', 'min');
  add('latest', 'Back in base by', lstToMin(m.endLst), lstToMin(tw.latestReturn), 'max', 'LST', tw.evaMaxMin, (v) =>
    addMinutesToLst('00:00', Math.round(v))
  );
  add('slope', 'Max slope', m.maxSlopeDeg, A.slopeLimitDeg, 'max', '°', A.slopeLimitDeg, (v) => v.toFixed(1));
  add('shelter', 'Max time to shelter', m.maxTimeToShelterMin, A.sepMinWarningMin, 'max', 'min');
  add('consumables', 'Suit consumables left', m.consumablesRemainingPct, A.suitReservePct, 'min', '%', 100);
  add('notEvaluated', 'Not-evaluated terrain', m.nePct, A.notEvaluatedMaxPct, 'max', '%', 100, (v) => v.toFixed(1));
  add('dose', 'EVA dose', m.doseEvaMsv, A.evaDoseLimitMsv, 'max', 'mSv', A.evaDoseLimitMsv, (v) => v.toFixed(2));
  if (ctx.sepAlert) {
    rows.push({ id: 'sep', name: 'SEP alert: stay in shelter', value: 1, limit: 0, dir: 'max', unit: '', margin: -1, rel: -1, status: 'violated', fmt: () => 'active' });
  }
  const determinant = rows.reduce((d, r) => (r.rel < d.rel ? r : d), rows[0]);
  determinant.determinant = true;
  const overall = rows.some((r) => r.status === 'violated') ? 'violated' : rows.some((r) => r.status === 'watch') ? 'watch' : 'ok';
  return { rows, determinant, overall };
};

export const CONSTRAINT_STATUS = {
  ok: { label: 'OK', cls: 'mh-pill--ok', color: '#35B17A' },
  watch: { label: 'Watch', cls: 'mh-pill--warn', color: '#E5C04A' },
  violated: { label: 'Violated', cls: 'mh-pill--crit', color: '#E5484D' }
};

// Constraint value / margin formatting (table, GO/NO-GO banner, mission reasons)
const unitSuffix = (u) => (!u || u === 'LST' ? '' : u === '°' || u === '%' ? u : ` ${u}`);
export const constraintValue = (r, v) => `${r.fmt(v)}${unitSuffix(r.unit)}`;
export const constraintMargin = (r) => {
  if (r.id === 'sep') return 'active';
  const mag = Math.abs(r.margin);
  const txt = r.id === 'slope' || r.id === 'notEvaluated' ? mag.toFixed(1) : r.id === 'dose' ? mag.toFixed(2) : Math.round(mag);
  return `${r.margin >= 0 ? '+' : '−'}${txt}${r.unit === 'LST' ? ' min' : unitSuffix(r.unit)}`;
};
const constraintShort = (r, m) => {
  switch (r.id) {
    case 'duration':
      return `EVA ${r.value} min > ${r.limit} min`;
    case 'buffer':
      return `buffer ${r.value} min (min ${r.limit})`;
    case 'latest':
      return `back ${r.fmt(r.value)} > ${r.fmt(r.limit)}`;
    case 'slope':
      return `${r.value.toFixed(1)}° ${m?.maxSlopeName?.toLowerCase() ?? 'slope'}`;
    case 'shelter':
      return `${Math.round(r.value)} min to shelter`;
    case 'consumables':
      return `consumables ${Math.round(r.value)}% left`;
    case 'notEvaluated':
      return `${r.value.toFixed(0)}% not evaluated`;
    case 'dose':
      return `EVA dose ${r.value.toFixed(2)} mSv`;
    default:
      return r.name;
  }
};
// One-line verdict, e.g. "NO-GO: buffer −10 min (min 45) · 19.4° delta scarp"
export const missionReason = (ev, m) => {
  const rank = ['sep', 'buffer', 'slope', 'dose', 'shelter', 'consumables', 'duration', 'latest', 'notEvaluated'];
  const bad = ev.rows.filter((r) => r.status === 'violated').sort((a, b) => rank.indexOf(a.id) - rank.indexOf(b.id));
  if (bad.length) return `NO-GO: ${bad.slice(0, 2).map((r) => constraintShort(r, m)).join(' · ')}`;
  const watch = ev.rows.filter((r) => r.status === 'watch');
  if (watch.length) return `Watch: ${watch.map((r) => constraintShort(r, m)).join(' · ')}`;
  return `All constraints met · buffer ${m.bufferMin} min`;
};

// ── Crew dose budget ────────────────────────────────────────────────────────
// Per-EVA dose allocation = nominal EVA dose + worst case: SEP rate for the full warning time
const evaDoseAllocationMsv = (typicalEvaDoseMsv, A) =>
  typicalEvaDoseMsv + (A.doseRateSepUgyH * (A.sepMinWarningMin / 60) * A.qualityFactor) / 1000;
// EVAs still allowed by dose: (budget − actual − future habitat background) ÷ per-EVA allocation
export const remainingEvasByDose = (doseActualMsv, currentSol, A = DEMO_ASSUMPTIONS) => {
  const typicalEvaDose = (A.doseRateNominalUgyH * 4 * A.qualityFactor) / 1000; // a typical 4 h EVA
  const solsLeft = Math.max(0, A.surfacePhaseSols - currentSol);
  const habitatFuture = solsLeft * A.doseBackgroundMsvPerSol * A.habitatShieldingFactor;
  const left = A.crewSurfaceDoseBudgetMsv - doseActualMsv - habitatFuture;
  return Math.max(0, Math.floor(left / evaDoseAllocationMsv(typicalEvaDose, A)));
};

// ── Science: hydration with uncertainty, residuals, hypotheses ──────────────
const parseNum = (s) => {
  const m = String(s ?? '').match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
};
export const getHydration = (poi) => {
  const pv = parseNum(poi.orbitalPrior?.hydrationEst);
  const pr = parseNum(poi.orbitalPrior?.uncertainty);
  const prior = pv != null && pr != null ? { value: pv, sigma: (pv * pr) / 100, relPct: pr } : null;
  const qv = parseNum(poi.pdsInSituPosterior?.hydrationPosterior);
  const qr = parseNum(poi.pdsInSituPosterior?.uncertaintyAfter);
  const sampled = Boolean(poi.pdsInSituPosterior?.pixl || poi.pdsInSituPosterior?.sherloc);
  const posterior = sampled && qv != null && qr != null ? { value: qv, sigma: (qv * qr) / 100, relPct: qr } : null;
  const residual = prior && posterior ? { delta: posterior.value - prior.value, nSigma: (posterior.value - prior.value) / prior.sigma } : null;
  return { prior, posterior, residual };
};

// Does the in-situ value confirm (≈ prior) or contradict the orbital estimate?
export const residualLevel = (nSigma) =>
  Math.abs(nSigma) < 1
    ? { label: 'Confirms prior', color: '#8E8E93', strength: 0 }
    : Math.abs(nSigma) < 2
      ? { label: 'Partly contradicts prior', color: '#E5C04A', strength: 1 }
      : { label: 'Contradicts prior', color: '#FF6B35', strength: 2 };

// Hypothesis status from the POIs that test it (demo rule)
export const hypothesisStatus = (h, pois) => {
  const evidence = pois
    .filter((p) => h.poiIds.includes(p.id))
    .map((p) => getHydration(p).residual)
    .filter(Boolean);
  if (!evidence.length) return 'open';
  if (evidence.some((r) => r.nSigma <= -1)) return 'weakened';
  return evidence.some((r) => r.nSigma >= 1) ? 'supported' : 'open';
};
export const HYPOTHESIS_STATUS = {
  supported: { label: 'Supported', cls: 'mh-pill--ok' },
  weakened: { label: 'Weakened', cls: 'mh-pill--crit' },
  open: { label: 'Open', cls: 'mh-pill--info' }
};

// ── Environment ─────────────────────────────────────────────────────────────
// Solar elevation: sin e = sin φ sin δ + cos φ cos δ cos h  (h = hour angle from local solar noon)
export const sunElevationDeg = (lst, A = DEMO_ASSUMPTIONS) => {
  const rad = Math.PI / 180;
  const h = ((lstToMin(lst) - 720) / 60) * 15;
  const s =
    Math.sin(A.latitudeDeg * rad) * Math.sin(A.solarDeclinationDeg * rad) +
    Math.cos(A.latitudeDeg * rad) * Math.cos(A.solarDeclinationDeg * rad) * Math.cos(h * rad);
  return Math.asin(s) / rad;
};

// Area reachable from a shelter within `minutes` (rays every 5°, terrain-aware walking speed)
export const shelterIsochrone = (shelter, minutes, fieldEvents, A = DEMO_ASSUMPTIONS) => {
  const stepKm = 0.02;
  const origin = [shelter.lat, shelter.lon];
  return Array.from({ length: 72 }, (_, i) => {
    const th = (i * 5 * Math.PI) / 180;
    let tMin = 0;
    let r = 0;
    let pt = origin;
    while (r < 4) {
      const next = [origin[0] + ((r + stepKm) * Math.cos(th)) / KM_PER_DEG, origin[1] + ((r + stepKm) * Math.sin(th)) / (KM_PER_DEG * COS_LAT)];
      const slope = localSlopeFeature(next)?.slopeDeg ?? 0;
      const speed = A.walkSpeedKmhFlat * terrainSpeedFactor(next, slope, fieldEvents, A);
      const dt = ((stepKm * A.shelterPathTortuosity) / speed) * 60;
      if (tMin + dt > minutes) break;
      tMin += dt;
      r += stepKm;
      pt = next;
    }
    return pt;
  });
};
