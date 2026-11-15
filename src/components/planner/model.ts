import {
  BASE,
  DEMO_ASSUMPTIONS,
  SHELTERS,
  TRAFFIC_FACTOR,
  TIME_WINDOW,
  computeMissionMetrics,
  evaluateConstraints,
  missionReason,
  remainingEvasByDose
} from './analysis.ts';

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED MISSION-PLANNING MODEL
// One store is shared by the three simulated users (scientist, mission control,
// astronaut). Each user reads the same data but can only perform its own actions.
// ═══════════════════════════════════════════════════════════════════════════════

export type Role = 'scientist' | 'control' | 'astronaut';
export type Priority = 'HIGH' | 'MED' | 'LOW';
export type MissionStatus = 'draft' | 'sent' | 'changed';

export interface Poi {
  id: string;
  name: string;
  lat: number;
  lon: number;
  // Defined by the scientist
  interestType: string;
  infoToCollect: string;
  samplesRequired: boolean;
  sampleNotes: string;
  // Defined by mission control
  priority: Priority | null;
  instruments: string[];
  durationMin: number;
  // Set when the POI was created from a field discovery (FE-…)
  fromFieldEventId?: string;
  // Optional legacy PDS readings (used by the CRISM prior ↔ PDS posterior layer)
  pdsInSituPosterior?: {
    hydrationPosterior: string;
    uncertaintyAfter: string;
    supercam?: string;
    pixl?: string;
    sherloc?: string;
    biosignatureRating?: string;
  };
  orbitalPrior?: { uncertainty: string; mineral?: string; hydrationEst?: string };
  geologicalUnit?: string;
  /** Follow-up target derived from another POI (e.g. POI-2b, closer sampling) */
  parentId?: string;
  /** When the in-situ measurement was taken, e.g. "Sol 2 · 11:05 LST" */
  measuredAt?: string;
}

export interface DailyMission {
  id: string;
  sol: number;
  startTime: string; // "HH:MM" LST
  poiIds: string[]; // ordered stops; the route always starts and ends at the base
  extraEquipment: string[];
  status: MissionStatus;
  /** Crew ids of the two astronauts going out [EV1, EV2]; default = the roster seats */
  evaPair?: [string, string];
  /** Plan version (v1, v2, …): a replan creates a new version */
  version?: number;
  approvedBy?: string;
  /** Replan only: time on site for this mission, when shorter than the POI default */
  durationOverrides?: Record<string, number>;
  /** Replan only: the route passes by the field shelter after this many stops */
  viaShelterAfter?: number | null;
  /** The last replan applied to this mission (before / after comparison) */
  replan?: ReplanRecord;
  /** Id of the post-EVA debrief, once the crew has submitted it */
  debriefId?: string;
}

// ── Post-EVA debrief (astronaut → scientist, mission control) ────────────────
export type PoiOutcome = 'completed' | 'partial' | 'skipped';
export type TrafficRating = 'easier' | 'expected' | 'harder';
export interface DebriefPoi {
  poiId: string;
  status: PoiOutcome;
  reason: string;
  samples: { id: string; collected: boolean; note: string }[];
  observation: string;
  proposePoi: boolean;
}
export interface DebriefLeg {
  from: string;
  to: string;
  a: [number, number];
  b: [number, number];
  rating: TrafficRating;
}
export interface Debrief {
  id: string;
  missionId: string;
  sol: number;
  planVersion: number;
  pois: DebriefPoi[];
  legs: DebriefLeg[];
  actualMin: number;
  borg: number; // perceived exertion, Borg 6–20
  suitIssues: string;
  dust: 'none' | 'light' | 'heavy';
  dosimeterMsv: number;
  tlx: { mental: number; physical: number; temporal: number }; // simplified NASA-TLX, 0–100
  psych: string;
  signedBy: string;
  signedAt: string;
}

/** A stretch walked by the crew, with the trafficability they found. */
export interface TrafficObs {
  a: [number, number];
  b: [number, number];
  rating: TrafficRating;
  factor: number;
  sol: number;
  note?: string;
}

/** A past EVA (route history layer). */
export interface PastEva {
  id: string;
  sol: number;
  pair: string[]; // names
  planVersion: string;
  poiIds: string[]; // planned
  reached: string[];
  outcome: 'completed' | 'partial' | 'aborted';
  plannedMin: number;
  actualMin: number;
  reason?: string; // why it was cut short
  viaShelter?: boolean; // the crew went to the field shelter
}

/** Notification shown in the other roles' views (e.g. "Sol N debrief received"). */
export interface Notice {
  id: string;
  sol: number;
  title: string;
  text: Partial<Record<Role, string>>;
  seenBy: Role[];
}

// Mission log: one line per decision, with the evidence that drove it
export type LogType = 'science' | 'safety' | 'replan';
export interface LogEntry {
  id: string;
  sol: number;
  ts: string; // LST
  type: LogType;
  planVersion: string;
  evidence: string;
  decision: string;
  approvedBy: string;
  outcome: string;
}

export interface PlannerState {
  pois: Poi[];
  missions: DailyMission[];
  packed: Record<string, string[]>; // astronaut checklist: missionId -> packed items
  fieldEvents: FieldEvent[]; // in-situ discoveries & anomaly reports (crew → scientist & route model)
  measured: string[]; // POI ids measured in the field by the astronauts
  sepAlert: boolean; // scripted SEP / DONKI alert (demo switch in Mission Control)
  crew: CrewMember[]; // crew status (simulated telemetry); dose is updated by the EVA debriefs
  log: LogEntry[]; // mission log (plan versions, evidence, decisions)
  todaySol: number; // "today" of the loaded scenario
  scenarioId: string;
  debriefs: Debrief[];
  traffic: TrafficObs[]; // trafficability validated in situ
  evaHistory: PastEva[]; // past EVAs (route history)
  notices: Notice[];
}

// ── Constants ────────────────────────────────────────────────────────────────
export { BASE } from './analysis.ts';
export const TODAY_SOL = 24; // "today" of the default scenario; use state.todaySol everywhere else
// Sol → Earth date (simulated landing date; 1 sol = 1.02749 days)
export const LANDING_DATE = '2039-08-02';
export const solDate = (sol: number) =>
  new Date(Date.parse(`${LANDING_DATE}T00:00:00Z`) + (sol - 1) * 1.0274912517 * 86400000).toISOString().slice(0, 10);
export const WALK_SPEED_KMH = DEMO_ASSUMPTIONS.walkSpeedKmhFlat; // flat-ground speed; terrain slows it down
export const LATEST_RETURN = TIME_WINDOW.latestReturn; // demo parameter: latest return to base (LST)
export const DAYLIGHT = { start: '08:00', end: '16:00' };
const MARS_RADIUS_KM = 3389.5;

export const INTEREST_TYPES = [
  'Geology',
  'Astrobiology',
  'Water / hydration',
  'Mineral resources',
  'Atmosphere',
  'Hazard survey'
];

export const INSTRUMENTS: { id: string; name: string }[] = [
  { id: 'supercam', name: 'Handheld SuperCam (LIBS/VISIR)' },
  { id: 'abrader', name: 'Rotary abrader' },
  { id: 'pixl', name: 'Handheld PIXL (XRF)' },
  { id: 'sherloc', name: 'Handheld SHERLOC (UV Raman)' },
  { id: 'drill', name: 'Core drill' },
  { id: 'microscope', name: 'Microscopic imager' },
  { id: 'camera', name: 'Context camera' },
  { id: 'gpr', name: 'Ground-penetrating radar' }
];

export const STANDARD_EQUIPMENT = [
  'Spare battery pack',
  'Comms relay',
  'Navigation tablet',
  'Emergency O₂ reserve',
  'Water & nutrition'
];

export const SAMPLE_KIT = 'Sample tubes & sealing kit';

export const PRIORITY_META: Record<Priority, { label: string; cls: string; color: string }> = {
  HIGH: { label: 'High', cls: 'mh-pill--crit', color: 'var(--mh-accent)' },
  MED: { label: 'Medium', cls: 'mh-pill--warn', color: 'var(--mh-warn)' },
  LOW: { label: 'Low', cls: 'mh-pill--info', color: 'var(--mh-info)' }
};

// Field discoveries (FE-…) logged during EVAs: colour, label and suggested interest type per class
// Field-event classes that are operational hazards (the only ones Mission Control sees);
// science discoveries stay with the Scientist until they are turned into a POI.
export const HAZARD_CLASSES = ['boulder', 'soft-soil'];
export const isHazard = (fe: { class: string }) => HAZARD_CLASSES.includes(fe.class);

export const FIELD_EVENT_META: Record<string, { color: string; label: string; interestType: string }> = {
  'formation-interest': { color: '#38bdf8', label: 'Formation of interest', interestType: 'Geology' },
  boulder: { color: '#E5484D', label: 'Boulder hazard', interestType: 'Hazard survey' },
  'soft-soil': { color: '#E5C04A', label: 'Soft soil', interestType: 'Hazard survey' }
};

export interface FieldEvent {
  id: string;
  ts: string;
  source: string;
  method: string;
  class: string;
  title: string;
  confidence: number;
  lat: number;
  lon: number;
  photo: string;
  description: string;
  actionDirective: string;
  status: string;
}

export const instrumentName = (id: string) =>
  INSTRUMENTS.find((i) => i.id === id)?.name ?? id;

// ── Helpers ──────────────────────────────────────────────────────────────────
export const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
export const toHHMM = (min: number) => {
  const m = Math.max(0, Math.round(min));
  return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

/** Great-circle distance on Mars, in km. */
export const marsDistanceKm = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * MARS_RADIUS_KM * Math.asin(Math.sqrt(h));
};

export type ScheduleItem =
  | { kind: 'egress'; start: string; end: string }
  | { kind: 'travel'; from: string; to: string; km: number; minutes: number; start: string; end: string }
  | { kind: 'stop'; poi: Poi; order: number; start: string; end: string }
  | { kind: 'shelter'; name: string; start: string; end: string }
  | { kind: 'ingress'; start: string; end: string };

export interface MissionPlan {
  stops: Poi[];
  waypoints: { lat: number; lon: number }[]; // base → stops → base
  path: { lat: number; lon: number }[]; // terrain-following geometry through every waypoint
  totalKm: number;
  walkMin: number;
  workMin: number;
  returnTime: string; // EVA end, back inside the base (after ingress)
  lateReturn: boolean;
  schedule: ScheduleItem[];
  equipment: string[];
  // Full EVA model (dose, slopes, consumables, shelter time…) and its constraint check
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metrics: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  evaluation: any;
}

export interface PlanContext {
  fieldEvents?: FieldEvent[];
  traffic?: TrafficObs[];
  sepAlert?: boolean;
  pair?: { id: string; name: string; doseActualMsv: number }[]; // EVA pair, for the dose-budget check
  sol?: number;
}

// ── Terrain-following route geometry ────────────────────────────────────────
// Deterministic PRNG so every route keeps the same "hand-walked" shape across renders
const hashString = (str: string) =>
  [...str].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 2166136261);
const seededRandom = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

/**
 * Turns a straight segment into a meandering, terrain-following walk.
 * The path still starts and ends exactly on the two waypoints: only the in-between
 * geometry is displaced (max lateral detour ≈ 35 m, one vertex every ~15 m).
 */
export const terrainLeg = (
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
  seedKey: string
): { lat: number; lon: number }[] => {
  const rand = seededRandom(hashString(seedKey));
  const dLat = b.lat - a.lat;
  const dLon = b.lon - a.lon;
  const len = Math.hypot(dLat, dLon);
  if (len === 0) return [a, b];
  const steps = Math.max(8, Math.round(len / 0.00025));
  const nLat = -dLon / len; // unit normal to the segment
  const nLon = dLat / len;
  const amp = Math.min(len * 0.09, 0.0006);
  const f1 = 1 + Math.floor(rand() * 2);
  const f2 = 3 + Math.floor(rand() * 3);
  const p1 = rand() * Math.PI * 2;
  const p2 = rand() * Math.PI * 2;
  const a1 = (0.6 + rand() * 0.4) * (rand() < 0.5 ? -1 : 1);
  const out = [a];
  for (let k = 1; k < steps; k++) {
    const t = k / steps;
    const envelope = Math.sin(Math.PI * t); // 0 at both waypoints
    const wobble =
      0.75 * a1 * Math.sin(2 * Math.PI * f1 * t + p1) +
      0.25 * Math.sin(2 * Math.PI * f2 * t + p2) +
      (rand() - 0.5) * 0.15;
    const off = amp * envelope * wobble;
    out.push({ lat: a.lat + dLat * t + nLat * off, lon: a.lon + dLon * t + nLon * off });
  }
  out.push(b);
  return out;
};

// Field shelter used when a replan diverts the route (the base is the other shelter)
const FIELD_SHELTER = SHELTERS.find((sh: { id: string }) => sh.id === 'ALCOVE') ?? SHELTERS[SHELTERS.length - 1];
export const FIELD_SHELTER_NAME = `${FIELD_SHELTER.name} (SEP shelter)`;

/**
 * Route from the base through every stop and back, following the terrain, with a timed schedule.
 * Times come from the EVA model in analysis.ts: egress/ingress, walking speed reduced by slope,
 * soft soil and not-evaluated terrain, time on site set by mission control.
 * A replan can shorten the time on site of a stop for this mission only (`durationOverrides`)
 * and divert the route via the field shelter (`viaShelterAfter` = number of stops before it).
 */
export const planMission = (mission: DailyMission, pois: Poi[], ctx: PlanContext = {}): MissionPlan => {
  const stops = mission.poiIds
    .map((id) => pois.find((p) => p.id === id))
    .filter((p): p is Poi => Boolean(p))
    .map((p) => ({ ...p, durationMin: mission.durationOverrides?.[p.id] ?? p.durationMin }));
  // Sequence walked: the POIs, plus the field shelter when the route is diverted via it
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seq: any[] = [...stops];
  if (mission.viaShelterAfter != null && stops.length) {
    seq.splice(Math.min(mission.viaShelterAfter, stops.length), 0, {
      id: 'SHELTER',
      name: FIELD_SHELTER_NAME,
      lat: FIELD_SHELTER.lat,
      lon: FIELD_SHELTER.lon,
      durationMin: 0,
      isShelter: true
    });
  }
  const waypoints = [BASE, ...seq, BASE].map(({ lat, lon }) => ({ lat, lon }));
  const legs = waypoints.slice(1).map((to, i) => {
    // Seed by the two endpoints: the same leg keeps the same shape in every mission
    const from = waypoints[i];
    return terrainLeg(from, to, `${from.lat},${from.lon}>${to.lat},${to.lon}`);
  });
  const path = legs.flatMap((leg, i) => (i === 0 ? leg : leg.slice(1)));

  const metrics = computeMissionMetrics(waypoints, legs, seq, mission.startTime, ctx);
  const at = (min: number) => toHHMM(toMin(mission.startTime) + min);
  const names = [BASE.name, ...seq.map((st) => (st.isShelter ? st.name : st.id)), BASE.name];

  const schedule: ScheduleItem[] = [{ kind: 'egress', start: at(0), end: at(DEMO_ASSUMPTIONS.egressMin) }];
  let order = 0;
  metrics.legStats.forEach((leg: { km: number; startMin: number; endMin: number }, i: number) => {
    schedule.push({
      kind: 'travel',
      from: names[i],
      to: names[i + 1],
      km: leg.km,
      minutes: Math.max(1, Math.round(leg.endMin - leg.startMin)),
      start: at(leg.startMin),
      end: at(leg.endMin)
    });
    const stop = seq[i];
    if (stop?.isShelter) schedule.push({ kind: 'shelter', name: stop.name, start: at(leg.endMin), end: at(leg.endMin) });
    else if (stop) schedule.push({ kind: 'stop', poi: stop, order: ++order, start: at(leg.endMin), end: at(leg.endMin + stop.durationMin) });
  });
  const lastArrival = metrics.legStats.length ? metrics.legStats[metrics.legStats.length - 1].endMin : DEMO_ASSUMPTIONS.egressMin;
  schedule.push({ kind: 'ingress', start: at(lastArrival), end: metrics.endLst });

  return {
    stops,
    waypoints,
    path,
    totalKm: metrics.distanceKm,
    walkMin: Math.round(metrics.walkMin),
    workMin: metrics.stationMin,
    returnTime: metrics.endLst,
    lateReturn: stops.length > 0 && toMin(metrics.endLst) > toMin(LATEST_RETURN),
    schedule,
    equipment: equipmentFor(mission, stops),
    metrics,
    evaluation: evaluateConstraints(metrics, { sepAlert: ctx.sepAlert, pair: ctx.pair, sol: ctx.sol })
  };
};

/**
 * Plan of a mission with the shared context: field reports slow the route, the SEP alert
 * applies to today's EVA only, and the EVA pair must have dose budget left.
 */
export const planFor = (state: PlannerState, mission: DailyMission) =>
  planMission(mission, state.pois, {
    fieldEvents: state.fieldEvents,
    traffic: state.traffic,
    sepAlert: state.sepAlert && mission.sol === state.todaySol,
    pair: crewAssignment(state.crew, mission)
      .filter((c) => c.seatNow === 'EV1' || c.seatNow === 'EV2')
      .map((c) => ({ id: c.id, name: c.name, doseActualMsv: c.doseActualMsv })),
    sol: mission.sol
  });

// ── NO-GO → suggested replan ────────────────────────────────────────────────
export const APPROVER = 'Flight Dir. M. Vance';
export type ReplanStepCode = 'crew' | 'a' | 'b' | 'c' | 'd';
export interface ReplanStep {
  code: ReplanStepCode;
  text: string;
}
export interface PlanSummary {
  sol: number;
  poiIds: string[];
  km: number;
  durationMin: number;
  bufferMin: number;
  doseMsv: number;
  shelterMin: number;
  viaShelter: boolean;
  overall: string;
  violated: string[]; // names of the violated constraints
  pair: string[]; // names of the EVA pair
}
export interface ReplanRecord {
  fromVersion: number;
  toVersion: number;
  ts: string;
  reason: string; // the binding constraint of the plan that was NO-GO
  steps: ReplanStep[];
  before: PlanSummary;
  after: PlanSummary;
}
export interface ReplanSuggestion extends Omit<ReplanRecord, 'ts'> {
  mission: DailyMission; // the replanned mission (not saved yet)
  ok: boolean; // false when no compliant plan was found
}

export const missionVersion = (m: DailyMission) => m.version ?? 1;

export const summarizePlan = (state: PlannerState, mission: DailyMission): PlanSummary => {
  const plan = planFor(state, mission);
  const m = plan.metrics;
  return {
    sol: mission.sol,
    poiIds: plan.stops.map((p) => p.id),
    km: m.distanceKm,
    durationMin: m.evaDurationMin,
    bufferMin: m.bufferMin,
    doseMsv: m.doseEvaMsv,
    shelterMin: m.maxTimeToShelterMin,
    viaShelter: m.viaShelter,
    overall: plan.evaluation.overall,
    violated: plan.evaluation.rows.filter((r: { status: string }) => r.status === 'violated').map((r: { name: string }) => r.name),
    pair: crewAssignment(state.crew, mission)
      .filter((c) => c.seatNow.startsWith('EV'))
      .map((c) => c.name)
  };
};

const PRIORITY_ORDER: Record<string, number> = { HIGH: 0, MED: 1, LOW: 2, NONE: 3 };

/**
 * When a mission is NO-GO, proposes a plan that meets every constraint. Strategy, in order:
 *  (a) drop the lowest-priority (then farthest) POI;
 *  (b) shorten the time on site of the non-priority POIs;
 *  (c) divert the route via the nearest field shelter;
 *  (d) postpone the EVA to the next free sol.
 * Before that, an EVA crew member without dose budget is swapped with someone from the habitat.
 * Returns null when the mission is not NO-GO.
 */
export const suggestReplan = (state: PlannerState, mission: DailyMission): ReplanSuggestion | null => {
  const A = DEMO_ASSUMPTIONS;
  const first = planFor(state, mission);
  if (first.evaluation.overall !== 'violated' || !first.stops.length) return null;
  const badIds = (m: DailyMission): string[] =>
    planFor(state, m)
      .evaluation.rows.filter((r: { status: string }) => r.status === 'violated')
      .map((r: { id: string }) => r.id);
  const isGo = (m: DailyMission) => badIds(m).length === 0;
  const TIME_IDS = ['duration', 'buffer', 'latest', 'consumables', 'dose', 'sepDuration'];
  const routeBad = (ids: string[]) => ids.filter((id) => id !== 'sepVia' && !id.startsWith('crewDose'));
  const poiOf = (id: string) => state.pois.find((p) => p.id === id);
  const steps: ReplanStep[] = [];
  let cur: DailyMission = { ...mission };

  // Best position for the field shelter in the current stop list: a GO plan first, then the shortest
  const withShelter = (m: DailyMission): DailyMission => {
    const options = Array.from({ length: m.poiIds.length + 1 }, (_, i) => ({ ...m, viaShelterAfter: i }));
    const km = (x: DailyMission) => planFor(state, x).metrics.distanceKm;
    return options.sort((x, y) => Number(isGo(y)) - Number(isGo(x)) || km(x) - km(y))[0];
  };

  // Crew: swap anyone on the EVA pair who has no dose budget left
  const exhausted = badIds(cur).filter((id) => id.startsWith('crewDose-')).map((id) => id.replace('crewDose-', ''));
  if (exhausted.length) {
    const seated = crewAssignment(state.crew, cur);
    const pair = seated.filter((c) => c.seatNow.startsWith('EV')).map((c) => c.id);
    const bench = seated
      .filter((c) => c.seatNow.startsWith('IV'))
      .sort((x, y) => remainingEvasByDose(y.doseActualMsv, cur.sol) - remainingEvasByDose(x.doseActualMsv, cur.sol));
    exhausted.forEach((id) => {
      const sub = bench.shift();
      if (!sub || remainingEvasByDose(sub.doseActualMsv, cur.sol) < 1) return;
      const out = seated.find((c) => c.id === id);
      pair[pair.indexOf(id)] = sub.id;
      steps.push({ code: 'crew', text: `EVA pair rotated: ${sub.name} replaces ${out?.name} (no dose budget left for an EVA)` });
    });
    cur = { ...cur, evaPair: pair as [string, string] };
  }

  // (a) drop one POI: a removal that gives a GO plan if there is one, else lowest priority, then farthest
  const dropOne = (): boolean => {
    if (cur.poiIds.length <= 1) return false;
    const rank = (id: string) => PRIORITY_ORDER[poiOf(id)?.priority ?? 'NONE'];
    const far = (id: string) => (poiOf(id) ? marsDistanceKm(BASE, poiOf(id) as Poi) : 0);
    const without = (id: string) => {
      const m = { ...cur, poiIds: cur.poiIds.filter((x) => x !== id) };
      return cur.viaShelterAfter != null ? withShelter(m) : m;
    };
    const pick = [...cur.poiIds].sort(
      (x, y) => Number(isGo(without(y))) - Number(isGo(without(x))) || rank(y) - rank(x) || far(y) - far(x)
    )[0];
    const before = planFor(state, cur).metrics.evaDurationMin;
    cur = without(pick);
    const after = planFor(state, cur).metrics.evaDurationMin;
    const poi = poiOf(pick);
    steps.push({
      code: 'a',
      text: `Dropped ${pick} (${poi?.priority ? PRIORITY_META[poi.priority].label.toLowerCase() : 'no'} priority, ${far(pick).toFixed(2)} km from the base): EVA shortened ${before} → ${after} min`
    });
    return true;
  };
  if (routeBad(badIds(cur)).length) dropOne();

  // (b) shorten the time on site of the non-priority POIs
  if (badIds(cur).some((id) => TIME_IDS.includes(id))) {
    const overrides: Record<string, number> = { ...cur.durationOverrides };
    const trimmed: string[] = [];
    cur.poiIds.forEach((id) => {
      const poi = poiOf(id);
      const now = overrides[id] ?? poi?.durationMin ?? 0;
      if (poi && poi.priority !== 'HIGH' && now > A.minStationMin) {
        overrides[id] = A.minStationMin;
        trimmed.push(`${id} ${now} → ${A.minStationMin} min`);
      }
    });
    if (trimmed.length) {
      cur = { ...cur, durationOverrides: overrides };
      steps.push({ code: 'b', text: `Time on site shortened at the non-priority stops: ${trimmed.join(', ')}` });
    }
  }

  // (c) divert the route via the nearest field shelter
  if (badIds(cur).includes('sepVia')) {
    const before = planFor(state, cur).metrics.distanceKm;
    cur = withShelter(cur);
    const after = planFor(state, cur).metrics.distanceKm;
    steps.push({ code: 'c', text: `Route diverted via ${FIELD_SHELTER.name}, the nearest field shelter (+${Math.max(0, after - before).toFixed(2)} km)` });
  }

  // (a) again, until the route is compliant or one stop is left
  while (routeBad(badIds(cur)).length && dropOne());

  // (d) postpone to the next free sol
  if (!isGo(cur)) {
    const used = new Set(state.missions.filter((m) => m.id !== mission.id).map((m) => m.sol));
    let sol = mission.sol + 1;
    while (used.has(sol)) sol++;
    const postponedOriginal: DailyMission = { ...mission, evaPair: cur.evaPair, sol };
    const postponedTrimmed: DailyMission = { ...cur, sol };
    if (isGo(postponedOriginal)) {
      cur = postponedOriginal;
      steps.length = 0;
      steps.push({ code: 'd', text: `EVA postponed to Sol ${sol} with the original stops: no compliant EVA on Sol ${mission.sol}` });
    } else if (isGo(postponedTrimmed)) {
      cur = postponedTrimmed;
      steps.push({ code: 'd', text: `EVA postponed to Sol ${sol}: still not compliant on Sol ${mission.sol}` });
    }
  }

  return {
    mission: cur,
    ok: isGo(cur),
    fromVersion: missionVersion(mission),
    toVersion: missionVersion(mission) + 1,
    reason: missionReason(first.evaluation, first.metrics).replace(/^NO-GO: /, ''),
    steps,
    before: summarizePlan(state, mission),
    after: summarizePlan(state, cur)
  };
};

/** Material to bring: instruments required at each stop + sample kit + extras chosen by control. */
export const equipmentFor = (mission: DailyMission, stops: Poi[]) => {
  const items = new Set<string>();
  stops.forEach((s) => s.instruments.forEach((i) => items.add(instrumentName(i))));
  if (stops.some((s) => s.samplesRequired)) items.add(SAMPLE_KIT);
  mission.extraEquipment.forEach((e) => items.add(e));
  return [...items];
};

export const nextPoiId = (pois: Poi[]) => {
  const max = pois.reduce((m, p) => Math.max(m, Number(p.id.replace(/\D/g, '')) || 0), 0);
  return `POI-${max + 1}`;
};

export const newMissionId = () => `M-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

// ── Seed data (from the PDS Analyst's Notebook targets) ──────────────────────
export const SEED_STATE: PlannerState = {
  pois: [
    {
      id: 'POI-1',
      name: 'Wildcat Ridge (Hogwallow Flats)',
      lat: 18.4452,
      lon: 77.4512,
      interestType: 'Astrobiology',
      infoToCollect: 'Sulfate & clay mudstone chemistry; organics co-located with sulfates.',
      samplesRequired: true,
      sampleNotes: '1 core from the abraded patch',
      priority: 'HIGH',
      instruments: ['supercam', 'abrader', 'pixl', 'sherloc', 'drill'],
      durationMin: 45,
      geologicalUnit: 'Fine-grained sulfate & clay lacustrine mudstone',
      pdsInSituPosterior: {
        hydrationPosterior: '8.9 wt% H2O',
        uncertaintyAfter: '±3.8%',
        supercam: 'LIBS/VISIR: Hydrated Mg-Fe sulfate + clay matrix confirmed at 3.2 m',
        pixl: 'XRF Map: SO3 24.8 wt%, FeO 18.2 wt%, MgO 11.4 wt% (Ca/Mg sulfate veins)',
        sherloc: 'Deep-UV Raman & Fluorescence: 1-ring & 2-ring aromatic organics co-located with sulfates',
        biosignatureRating: 'VERY HIGH (Skinner/Wildcat PDS Class 1)'
      },
      orbitalPrior: { uncertainty: '±32%', mineral: 'MRO/CRISM: Fe/Mg Smectite Clay (18 m/px)', hydrationEst: '4.2 wt% H2O' }
    },
    {
      id: 'POI-2',
      name: 'Bastide & Garde outcrop (Séítah)',
      lat: 18.4285,
      lon: 77.4608,
      interestType: 'Geology',
      infoToCollect: 'Olivine cumulate texture and Fe-Mg carbonate alteration in fractures.',
      samplesRequired: true,
      sampleNotes: '2 rock chips from fracture fill',
      priority: 'MED',
      instruments: ['supercam', 'abrader', 'pixl'],
      durationMin: 40,
      geologicalUnit: 'Olivine cumulate with Fe-Mg carbonate alteration',
      pdsInSituPosterior: {
        hydrationPosterior: '4.8 wt% H2O',
        uncertaintyAfter: '±4.2%',
        supercam: 'LIBS/IR: Fo55 cumulate olivine grains + carbonate 2.3/2.5 µm bands',
        pixl: 'XRF: Igneous olivine cumulate with secondary Fe-Mg carbonate & sulfate in fractures',
        sherloc: 'UV Raman: Carbonate & perchlorate aqueous alteration products',
        biosignatureRating: 'MODERATE (Aqueous Carbonation)'
      },
      orbitalPrior: {
        uncertainty: '±36%',
        mineral: 'MRO/CRISM: Regional Olivine + Mg-Carbonate (18 m/px)',
        hydrationEst: '2.5 wt% H2O'
      }
    },
    {
      id: 'POI-3',
      name: 'Skinner Ridge (delta scarp)',
      lat: 18.4518,
      lon: 77.4595,
      interestType: 'Geology',
      infoToCollect: 'Clast diversity of the fluvial conglomerate; context imaging of the scarp.',
      samplesRequired: false,
      sampleNotes: '',
      priority: 'LOW',
      instruments: ['camera', 'supercam'],
      durationMin: 30,
      geologicalUnit: 'Fluvial sandstone & boulder conglomerate',
      pdsInSituPosterior: {
        hydrationPosterior: '5.4 wt% H2O',
        uncertaintyAfter: '±5.1%',
        supercam: 'RMI + LIBS: Diverse detrital clasts from Jezero watershed outside crater',
        pixl: 'XRF: Mafic & phyllosilicate-rich detrital grains cemented by sulfate',
        sherloc: 'Raman: Detrital carbonate + hydrated phases',
        biosignatureRating: 'HIGH (Watershed Sample Diversity)'
      },
      orbitalPrior: {
        uncertainty: '±29%',
        mineral: 'MRO/CRISM: Low-Ca Pyroxene + Detrital Phyllosilicate',
        hydrationEst: '3.1 wt% H2O'
      }
    }
  ],
  missions: [
    {
      id: 'M-seed-24',
      sol: 24,
      startTime: '09:30',
      poiIds: ['POI-1', 'POI-2'],
      extraEquipment: ['Spare battery pack', 'Navigation tablet'],
      status: 'sent',
      version: 1,
      approvedBy: 'Flight Dir. M. Vance'
    },
    {
      // Draft: POI-3 lies above the 19.4° delta scarp, on terrain not evaluated from orbit → NO-GO until replanned
      id: 'M-seed-25',
      sol: 25,
      startTime: '09:30',
      poiIds: ['POI-2', 'POI-3'],
      extraEquipment: ['Comms relay'],
      status: 'draft',
      version: 1
    }
  ],
  packed: {},
  measured: [],
  sepAlert: false,
  crew: [], // filled below with CREW_ROSTER (declared after the seed)
  todaySol: TODAY_SOL,
  scenarioId: 'demo',
  debriefs: [],
  traffic: [],
  evaHistory: [],
  notices: [],
  log: [
    {
      id: 'LOG-024-1',
      sol: 24,
      ts: 'Sol 24 · 08:30 LST',
      type: 'science',
      planVersion: 'v1',
      evidence: 'Orbital CRISM prior: Fe/Mg smectite on the delta front, olivine + carbonate in Séítah',
      decision: 'Sol 24 EVA to POI-1 and POI-2',
      approvedBy: 'Flight Dir. M. Vance',
      outcome: 'Plan v1 sent to the crew'
    }
  ],
  // Candidate field events & rapid in-situ discoveries (Sol 24)
  fieldEvents: [
    {
      id: 'FE-024-003',
      ts: 'Sol 24 · 10:42 LST',
      source: 'visorCam + Handheld PIXL/SHERLOC',
      method: 'Rapid 12-min Field Funnel',
      class: 'formation-interest',
      title: 'Séítah-Delta Contact Hydrated Carbonate-Silica Vein',
      confidence: 0.94,
      lat: 18.4395,
      lon: 77.4485,
      photo: 'PDS_SHERLOC_WATSON_SOL438_VEIN',
      description:
        'Sub-meter fracture vein (0.4 m wide — below the 18 m/px CRISM resolution) analysed in 12 min via handheld SuperCam → abrader → PIXL/SHERLOC. Shows 11.2 wt% H2O opal-A & Mg-carbonate.',
      actionDirective: 'Promote to a high-priority POI to update the CRISM prior → posterior.',
      status: 'confirmed'
    },
    {
      id: 'FE-024-001',
      ts: 'Sol 24 · 10:15 LST',
      source: 'visorCam',
      method: 'objectDetection-demo',
      class: 'boulder',
      title: 'Cape Nukshak Float Boulder Apron (0.9m)',
      confidence: 0.69,
      lat: 18.4422,
      lon: 77.4502,
      photo: 'PDS_NAVCAM_LEFT_SOL422',
      description: 'Angular basaltic float boulder field 12 m east of direct climb; low-confidence orbital detection.',
      actionDirective: 'Boulder detected 12 m right → deviate 15 m west along the bench [demo model — not certified]',
      status: 'needs review'
    },
    {
      id: 'FE-024-002',
      ts: 'Sol 24 · 11:02 LST',
      source: 'manual',
      method: 'manual',
      class: 'soft-soil',
      title: 'Séítah Margin Megaripple Sand Pocket',
      confidence: 1.0,
      lat: 18.4335,
      lon: 77.4568,
      photo: 'PDS_HAZCAM_SOL208_RIPPLE',
      description: 'Unconsolidated aeolian sand dunes along the Séítah floor; high wheel slip & metabolic cost.',
      actionDirective: 'Avoid the deep Séítah ripple trough; stay on the consolidated bench.',
      status: 'confirmed'
    }
  ]
};

// ── Crew status (simulated telemetry, demo data — not real) ──────────────────
// Crew of four: two go out (EV1, EV2), two stay in the habitat (IV1 comms / habitat,
// IV2 science & medical support). `seat` is the default assignment; each daily mission can
// name its own EVA pair (`evaPair`), so the pair can rotate from sol to sol.
// Surface dose = cumulative since landing, planned vs measured by the personal dosimeter.
export type CrewSeat = 'EV1' | 'EV2' | 'IV1' | 'IV2';
export interface CrewMember {
  id: string;
  name: string;
  role: string; // specialty
  seat: CrewSeat; // default seat
  evasCompleted: number;
  dosePlannedMsv: number;
  doseActualMsv: number;
  vitals: { heartRate: number; spo2: number; sleepH: number };
  fatigue: 'Low' | 'Moderate' | 'High';
  psych: string;
}

export const SEAT_LABEL: Record<CrewSeat, string> = {
  EV1: 'EVA lead',
  EV2: 'EVA',
  IV1: 'Comms & habitat',
  IV2: 'Science & medical support'
};

export const CREW_ROSTER: CrewMember[] = [
  {
    id: 'CM1',
    name: 'Cmdr. Lena Okafor',
    role: 'Field geology',
    seat: 'EV1',
    evasCompleted: 7,
    dosePlannedMsv: 15.4,
    doseActualMsv: 14.9,
    vitals: { heartRate: 88, spo2: 97, sleepH: 7.1 },
    fatigue: 'Low',
    psych: 'Nominal (Sol 23 check-in)'
  },
  {
    id: 'CM2',
    name: 'Dr. Samir Haddad',
    role: 'Astrobiology & sampling',
    seat: 'EV2',
    evasCompleted: 6,
    dosePlannedMsv: 15.4,
    doseActualMsv: 15.6,
    vitals: { heartRate: 101, spo2: 96, sleepH: 5.9 },
    fatigue: 'Moderate',
    psych: 'Nominal · reports short sleep'
  },
  {
    id: 'CM3',
    name: 'Eng. Rui Tanaka',
    role: 'Systems & comms',
    seat: 'IV1',
    evasCompleted: 3,
    dosePlannedMsv: 15.4,
    doseActualMsv: 14.6,
    vitals: { heartRate: 72, spo2: 98, sleepH: 7.6 },
    fatigue: 'Low',
    psych: 'Nominal'
  },
  {
    id: 'CM4',
    name: 'Dr. Maya Lindqvist',
    role: 'Flight surgeon & geochemistry',
    seat: 'IV2',
    evasCompleted: 4,
    dosePlannedMsv: 15.4,
    doseActualMsv: 14.7,
    vitals: { heartRate: 69, spo2: 98, sleepH: 7.3 },
    fatigue: 'Low',
    psych: 'Nominal (Sol 23 check-in)'
  }
];

export interface SeatedCrew extends CrewMember {
  seatNow: CrewSeat;
}

/** Who sits where for a mission: its EVA pair goes out, the other two stay in the habitat. */
export const crewAssignment = (crew: CrewMember[], mission?: Pick<DailyMission, 'evaPair'> | null): SeatedCrew[] => {
  const bySeat = (seat: CrewSeat) => crew.find((c) => c.seat === seat);
  const pairIds = mission?.evaPair ?? [bySeat('EV1')?.id, bySeat('EV2')?.id];
  const pair = pairIds.map((id) => crew.find((c) => c.id === id)).filter((c): c is CrewMember => Boolean(c));
  const inside = crew.filter((c) => !pair.includes(c));
  return [
    ...pair.map((c, i) => ({ ...c, seatNow: (i === 0 ? 'EV1' : 'EV2') as CrewSeat })),
    ...inside.map((c, i) => ({ ...c, seatNow: (i === 0 ? 'IV1' : 'IV2') as CrewSeat }))
  ];
};

SEED_STATE.crew = CREW_ROSTER;

// ── Post-EVA debrief → shared state ──────────────────────────────────────────
// Pure: returns the new state. Observations become field events for the Scientist, the
// trafficability updates the route model on the stretches walked, the dosimeter reading
// updates the crew dose, the log gets "Sol N debrief received", the other roles get a notice.
export const applyDebrief = (state: PlannerState, d: Debrief): PlannerState => {
  const mission = state.missions.find((m) => m.id === d.missionId);
  if (!mission) return state;
  const plan = planFor(state, mission);
  const pad = (n: number, len = 3) => String(n).padStart(len, '0');
  const pairIds = crewAssignment(state.crew, mission)
    .filter((c) => c.seatNow.startsWith('EV'))
    .map((c) => c.id);

  // Observations → field events (the Scientist's discoveries)
  const observed = d.pois.filter((x) => x.observation.trim());
  const newEvents: FieldEvent[] = observed.map((x, i) => {
    const poi = state.pois.find((pp) => pp.id === x.poiId);
    return {
      id: `FE-${pad(d.sol)}-${pad(state.fieldEvents.filter((f) => f.id.startsWith(`FE-${pad(d.sol)}-`)).length + i + 1)}`,
      ts: `Sol ${d.sol} · debrief ${d.signedAt}`,
      source: `EVA debrief · ${d.signedBy}`,
      method: 'crew observation',
      class: 'formation-interest',
      title: x.proposePoi ? `Proposed POI near ${x.poiId}: ${x.observation.trim().slice(0, 48)}` : `Observation at ${x.poiId}`,
      confidence: 0.8,
      lat: (poi?.lat ?? BASE.lat) + 0.00035,
      lon: (poi?.lon ?? BASE.lon) + 0.0004,
      photo: `VISORCAM_${d.id}_${x.poiId}`,
      description: x.observation.trim(),
      actionDirective: x.proposePoi ? 'The crew proposes a new point of interest here.' : 'For the Scientist to review.',
      status: x.proposePoi ? 'proposed' : 'needs review'
    };
  });

  // Trafficability → route model on the stretches walked
  const newTraffic: TrafficObs[] = d.legs.map((l) => ({
    a: l.a,
    b: l.b,
    rating: l.rating,
    factor: TRAFFIC_FACTOR[l.rating],
    sol: d.sol,
    note: `${l.from} → ${l.to}`
  }));
  const harder = d.legs.filter((l) => l.rating === 'harder');
  const easier = d.legs.filter((l) => l.rating === 'easier');

  // Dose and crew status
  const crew = state.crew.map((c) =>
    pairIds.includes(c.id)
      ? {
          ...c,
          doseActualMsv: Math.round((c.doseActualMsv + d.dosimeterMsv) * 100) / 100,
          evasCompleted: c.evasCompleted + 1,
          fatigue: (d.borg >= 15 ? 'High' : d.borg >= 12 ? 'Moderate' : 'Low') as CrewMember['fatigue'],
          psych: `${d.psych || 'Nominal'} (Sol ${d.sol} debrief)`
        }
      : c
  );

  const done = d.pois.filter((x) => x.status === 'completed').map((x) => x.poiId);
  const partial = d.pois.filter((x) => x.status !== 'completed');
  const samples = d.pois.flatMap((x) => x.samples.filter((sm) => sm.collected));
  const outcome: PastEva['outcome'] = partial.length ? 'partial' : 'completed';
  const proposed = observed.filter((x) => x.proposePoi).length;
  const terrain = harder.length
    ? `terrain harder than predicted on ${harder.length} leg${harder.length === 1 ? '' : 's'} (${harder.map((l) => `${l.from} → ${l.to}`).join(', ')})`
    : easier.length
      ? `terrain easier than predicted on ${easier.length} leg${easier.length === 1 ? '' : 's'}`
      : 'terrain as predicted';

  return {
    ...state,
    debriefs: [...state.debriefs, d],
    fieldEvents: [...state.fieldEvents, ...newEvents],
    traffic: [...state.traffic, ...newTraffic],
    crew,
    measured: [...new Set([...state.measured, ...done])],
    missions: state.missions.map((m) => (m.id === d.missionId ? { ...m, debriefId: d.id } : m)),
    evaHistory: [
      ...state.evaHistory,
      {
        id: `EVA-${pad(d.sol)}`,
        sol: d.sol,
        pair: crewAssignment(state.crew, mission)
          .filter((c) => c.seatNow.startsWith('EV'))
          .map((c) => c.name),
        planVersion: `v${d.planVersion}`,
        poiIds: plan.stops.map((x) => x.id),
        reached: d.pois.filter((x) => x.status !== 'skipped').map((x) => x.poiId),
        outcome,
        plannedMin: plan.metrics.evaDurationMin,
        actualMin: d.actualMin,
        reason: partial.map((x) => `${x.poiId} ${x.status}${x.reason ? `: ${x.reason}` : ''}`).join('; ') || undefined,
        viaShelter: plan.metrics.viaShelter
      }
    ],
    log: [
      ...state.log,
      {
        id: `LOG-${pad(d.sol)}-${state.log.length + 1}`,
        sol: d.sol,
        ts: `Sol ${d.sol} · ${d.signedAt}`,
        type: harder.length || d.suitIssues.trim() ? 'safety' : 'science',
        planVersion: `v${d.planVersion}`,
        evidence: `Sol ${d.sol} debrief received: ${done.length}/${d.pois.length} POIs completed, ${samples.length} sample${samples.length === 1 ? '' : 's'}, ${terrain}, dosimeter ${d.dosimeterMsv.toFixed(2)} mSv, Borg ${d.borg}${d.suitIssues.trim() ? `, suit: ${d.suitIssues.trim()}` : ''}`,
        decision: `${newEvents.length} observation${newEvents.length === 1 ? '' : 's'} sent to the Scientist${proposed ? ` (${proposed} proposed POI)` : ''}; route model updated on ${d.legs.length} leg${d.legs.length === 1 ? '' : 's'}; crew dose updated`,
        approvedBy: d.signedBy,
        outcome: `EVA ${outcome} in ${d.actualMin} min (planned ${plan.metrics.evaDurationMin})`
      }
    ],
    notices: [
      ...state.notices,
      {
        id: `N-${d.id}`,
        sol: d.sol,
        title: `Sol ${d.sol} debrief received`,
        text: {
          scientist: `${newEvents.length} new observation${newEvents.length === 1 ? '' : 's'} in Discoveries${proposed ? `, ${proposed} proposed as a new POI` : ''}; ${done.length} target${done.length === 1 ? '' : 's'} measured, ${samples.length} sample${samples.length === 1 ? '' : 's'} collected.`,
          control: `Route model updated: ${terrain}. EVA pair dose +${d.dosimeterMsv.toFixed(2)} mSv each. Exertion Borg ${d.borg}${d.suitIssues.trim() ? `; suit issue: ${d.suitIssues.trim()}` : ''}.`
        },
        seenBy: []
      }
    ]
  };
};
