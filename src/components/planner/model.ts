import { BASE, DEMO_ASSUMPTIONS, TIME_WINDOW, computeMissionMetrics, evaluateConstraints } from './analysis.ts';

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
}

export interface PlannerState {
  pois: Poi[];
  missions: DailyMission[];
  packed: Record<string, string[]>; // astronaut checklist: missionId -> packed items
  fieldEvents: FieldEvent[]; // in-situ discoveries & anomaly reports (crew → scientist & route model)
  measured: string[]; // POI ids measured in the field by the astronauts
  sepAlert: boolean; // scripted SEP / DONKI alert (demo switch in Mission Control)
  crew: CrewMember[]; // crew status (simulated telemetry); dose is updated by the EVA debriefs
}

// ── Constants ────────────────────────────────────────────────────────────────
export { BASE } from './analysis.ts';
export const TODAY_SOL = 24;
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
  sepAlert?: boolean;
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

/**
 * Route from the base through every stop and back, following the terrain, with a timed schedule.
 * Times come from the EVA model in analysis.ts: egress/ingress, walking speed reduced by slope,
 * soft soil and not-evaluated terrain, time on site set by mission control.
 */
export const planMission = (mission: DailyMission, pois: Poi[], ctx: PlanContext = {}): MissionPlan => {
  const stops = mission.poiIds
    .map((id) => pois.find((p) => p.id === id))
    .filter((p): p is Poi => Boolean(p));
  const waypoints = [BASE, ...stops, BASE].map(({ lat, lon }) => ({ lat, lon }));
  const legs = waypoints.slice(1).map((to, i) => {
    // Seed by the two endpoints: the same leg keeps the same shape in every mission
    const from = waypoints[i];
    return terrainLeg(from, to, `${from.lat},${from.lon}>${to.lat},${to.lon}`);
  });
  const path = legs.flatMap((leg, i) => (i === 0 ? leg : leg.slice(1)));

  const metrics = computeMissionMetrics(waypoints, legs, stops, mission.startTime, ctx);
  const at = (min: number) => toHHMM(toMin(mission.startTime) + min);
  const names = [BASE.name, ...stops.map((st) => st.id), BASE.name];

  const schedule: ScheduleItem[] = [{ kind: 'egress', start: at(0), end: at(DEMO_ASSUMPTIONS.egressMin) }];
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
    const stop = stops[i];
    if (stop) schedule.push({ kind: 'stop', poi: stop, order: i + 1, start: at(leg.endMin), end: at(leg.endMin + stop.durationMin) });
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
    evaluation: evaluateConstraints(metrics, { sepAlert: ctx.sepAlert })
  };
};

/** Plan of a mission with the shared context (field reports slow the route, SEP alert). */
export const planFor = (state: PlannerState, mission: DailyMission) =>
  planMission(mission, state.pois, { fieldEvents: state.fieldEvents, sepAlert: state.sepAlert });

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
      status: 'sent'
    },
    {
      id: 'M-seed-25',
      sol: 25,
      startTime: '10:00',
      poiIds: ['POI-3'],
      extraEquipment: ['Comms relay'],
      status: 'sent'
    }
  ],
  packed: {},
  measured: [],
  sepAlert: false,
  crew: [], // filled below with CREW_ROSTER (declared after the seed)
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
