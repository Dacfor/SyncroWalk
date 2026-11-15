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
  pdsInSituPosterior?: { hydrationPosterior: string; uncertaintyAfter: string };
  orbitalPrior?: { uncertainty: string };
}

export interface DailyMission {
  id: string;
  sol: number;
  startTime: string; // "HH:MM" LST
  poiIds: string[]; // ordered stops; the route always starts and ends at the base
  extraEquipment: string[];
  status: MissionStatus;
}

export interface PlannerState {
  pois: Poi[];
  missions: DailyMission[];
  packed: Record<string, string[]>; // astronaut checklist: missionId -> packed items
}

// ── Constants ────────────────────────────────────────────────────────────────
export const BASE = { name: 'Astronaut base', lat: 18.44907, lon: 77.45527 };
export const TODAY_SOL = 24;
export const WALK_SPEED_KMH = 2.5; // demo parameter for EVA traverse on foot
export const LATEST_RETURN = '14:30'; // demo parameter: latest return to base (LST)
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
  | { kind: 'depart'; time: string }
  | { kind: 'travel'; from: string; to: string; km: number; minutes: number; start: string; end: string }
  | { kind: 'stop'; poi: Poi; order: number; start: string; end: string }
  | { kind: 'return'; time: string };

export interface MissionPlan {
  stops: Poi[];
  path: { lat: number; lon: number }[]; // base → stops → base (straight segments)
  totalKm: number;
  walkMin: number;
  workMin: number;
  returnTime: string;
  lateReturn: boolean;
  schedule: ScheduleItem[];
  equipment: string[];
}

/** Straight-line route from the base through every stop and back, with a timed schedule. */
export const planMission = (mission: DailyMission, pois: Poi[]): MissionPlan => {
  const stops = mission.poiIds
    .map((id) => pois.find((p) => p.id === id))
    .filter((p): p is Poi => Boolean(p));
  const path = [BASE, ...stops, BASE].map(({ lat, lon }) => ({ lat, lon }));

  const schedule: ScheduleItem[] = [{ kind: 'depart', time: mission.startTime }];
  let clock = toMin(mission.startTime);
  let totalKm = 0;
  let walkMin = 0;
  let workMin = 0;
  const names = [BASE.name, ...stops.map((s) => s.id), BASE.name];

  for (let i = 0; i < path.length - 1; i++) {
    const km = marsDistanceKm(path[i], path[i + 1]);
    const minutes = Math.max(1, Math.round((km / WALK_SPEED_KMH) * 60));
    totalKm += km;
    walkMin += minutes;
    schedule.push({
      kind: 'travel',
      from: names[i],
      to: names[i + 1],
      km,
      minutes,
      start: toHHMM(clock),
      end: toHHMM(clock + minutes)
    });
    clock += minutes;
    const stop = stops[i];
    if (stop) {
      schedule.push({ kind: 'stop', poi: stop, order: i + 1, start: toHHMM(clock), end: toHHMM(clock + stop.durationMin) });
      clock += stop.durationMin;
      workMin += stop.durationMin;
    }
  }
  schedule.push({ kind: 'return', time: toHHMM(clock) });

  return {
    stops,
    path,
    totalKm,
    walkMin,
    workMin,
    returnTime: toHHMM(clock),
    lateReturn: stops.length > 0 && clock > toMin(LATEST_RETURN),
    schedule,
    equipment: equipmentFor(mission, stops)
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
      pdsInSituPosterior: { hydrationPosterior: '8.9 wt% H2O', uncertaintyAfter: '±3.8%' },
      orbitalPrior: { uncertainty: '±32%' }
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
      pdsInSituPosterior: { hydrationPosterior: '4.8 wt% H2O', uncertaintyAfter: '±4.2%' },
      orbitalPrior: { uncertainty: '±36%' }
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
      pdsInSituPosterior: { hydrationPosterior: '5.4 wt% H2O', uncertaintyAfter: '±5.1%' },
      orbitalPrior: { uncertainty: '±29%' }
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
  packed: {}
};

// ── Crew status (simulated telemetry, demo data — not real) ──────────────────
// Surface dose = cumulative since landing, planned vs measured by suit dosimeter.
export interface CrewMember {
  id: string;
  name: string;
  role: string;
  evaCrew: boolean; // goes out on the daily EVA
  evasCompleted: number;
  dosePlannedMsv: number;
  doseActualMsv: number;
  vitals: { heartRate: number; spo2: number; sleepH: number };
  fatigue: 'Low' | 'Moderate' | 'High';
  psych: string;
}

export const CREW_ROSTER: CrewMember[] = [
  {
    id: 'EV1',
    name: 'Cmdr. Lena Okafor',
    role: 'EVA lead · Field geology',
    evaCrew: true,
    evasCompleted: 7,
    dosePlannedMsv: 15.4,
    doseActualMsv: 14.9,
    vitals: { heartRate: 88, spo2: 97, sleepH: 7.1 },
    fatigue: 'Low',
    psych: 'Nominal (Sol 23 check-in)'
  },
  {
    id: 'EV2',
    name: 'Dr. Samir Haddad',
    role: 'EVA · Astrobiology & sampling',
    evaCrew: true,
    evasCompleted: 6,
    dosePlannedMsv: 15.4,
    doseActualMsv: 15.6,
    vitals: { heartRate: 101, spo2: 96, sleepH: 5.9 },
    fatigue: 'Moderate',
    psych: 'Nominal · reports short sleep'
  },
  {
    id: 'IV',
    name: 'Eng. Rui Tanaka',
    role: 'IV operator · Base & comms',
    evaCrew: false,
    evasCompleted: 3,
    dosePlannedMsv: 12.6,
    doseActualMsv: 12.2,
    vitals: { heartRate: 72, spo2: 98, sleepH: 7.6 },
    fatigue: 'Low',
    psych: 'Nominal'
  }
];
