import { BASE, CREW_ROSTER, SEED_STATE } from '../model.ts';
import { SHELTERS, TRAFFIC_FACTOR } from '../analysis.ts';
import type { CrewMember, Debrief, PastEva, PlannerState, Poi, TrafficObs, TrafficRating } from '../model.ts';

// ═══════════════════════════════════════════════════════════════════════════════
// Building blocks shared by the scenario seeds. EVERYTHING in the scenarios is a
// SIMULATED HISTORY written for the demo: no value here is a NASA measurement.
// ═══════════════════════════════════════════════════════════════════════════════

export const SIMULATED_HISTORY = 'simulated history';

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

/** A seed POI (POI-1 … POI-3), deep-copied. */
export const seedPoi = (id: string): Poi => clone(SEED_STATE.pois.find((p) => p.id === id) as Poi);

/** The same POI as known from orbit only: no in-situ measurement yet. */
export const priorOnly = (p: Poi): Poi => {
  const { pdsInSituPosterior: _posterior, measuredAt: _measuredAt, ...rest } = p;
  return rest;
};

export const measured = (p: Poi, when: string): Poi => ({ ...p, measuredAt: when });

// Targets that appear after landing (found in the field or derived from a debrief)
export const POI_4: Poi = {
  id: 'POI-4',
  name: 'Séítah–delta contact vein',
  lat: 18.4395,
  lon: 77.4485,
  interestType: 'Water / hydration',
  infoToCollect: 'Opal-A and Mg-carbonate vein chemistry; fluid history at the contact.',
  samplesRequired: true,
  sampleNotes: '2 vein chips',
  priority: 'HIGH',
  instruments: ['supercam', 'abrader', 'pixl', 'sherloc'],
  durationMin: 30,
  geologicalUnit: 'Hydrated carbonate–silica fracture vein (0.4 m wide)',
  fromFieldEventId: 'FE-002-001',
  orbitalPrior: {
    uncertainty: '±40%',
    mineral: 'MRO/CRISM: no dominant signature (vein far below the 18 m pixel)',
    hydrationEst: '2.0 wt% H2O'
  },
  pdsInSituPosterior: {
    hydrationPosterior: '11.2 wt% H2O',
    uncertaintyAfter: '±3.5%',
    supercam: 'LIBS/VISIR: hydrated silica + Mg-carbonate',
    pixl: 'XRF: SiO2 61 wt%, MgO 14 wt% (opal-A + Mg-carbonate)',
    sherloc: 'UV Raman: hydrated silica and carbonate bands',
    biosignatureRating: 'HIGH (late aqueous fluids)'
  },
  measuredAt: 'Sol 2 · 11:05 LST'
};

export const POI_5: Poi = {
  id: 'POI-5',
  name: 'Yori Pass margin carbonates',
  lat: 18.448,
  lon: 77.446,
  interestType: 'Astrobiology',
  infoToCollect: 'Margin carbonate texture and silica cement; organics in the fine sandstone.',
  samplesRequired: true,
  sampleNotes: '1 core',
  priority: 'MED',
  instruments: ['supercam', 'abrader', 'sherloc', 'drill'],
  durationMin: 35,
  geologicalUnit: 'Carbonate-cemented fine sandstone (delta margin)',
  orbitalPrior: { uncertainty: '±31%', mineral: 'MRO/CRISM: Mg-carbonate + olivine (18 m/px)', hydrationEst: '3.4 wt% H2O' },
  pdsInSituPosterior: {
    hydrationPosterior: '4.1 wt% H2O',
    uncertaintyAfter: '±4.4%',
    pixl: 'XRF: MgO 19 wt%, FeO 16 wt%, SiO2 38 wt%',
    sherloc: 'UV Raman: Fe-Mg carbonate, weak organic fluorescence',
    biosignatureRating: 'HIGH (carbonate-hosted organics)'
  },
  measuredAt: 'Sol 6 · 11:40 LST'
};

export const POI_2B: Poi = {
  id: 'POI-2b',
  name: 'Bastide contact, closer sampling',
  lat: 18.4291,
  lon: 77.46,
  interestType: 'Geology',
  infoToCollect: 'Fresh olivine–carbonate contact seen 15 m east of Bastide: sample both sides of the contact.',
  samplesRequired: true,
  sampleNotes: '2 chips across the contact',
  priority: 'HIGH',
  instruments: ['abrader', 'pixl', 'sherloc'],
  durationMin: 30,
  geologicalUnit: 'Olivine cumulate / carbonate alteration front',
  parentId: 'POI-2',
  fromFieldEventId: 'FE-014-001',
  orbitalPrior: { uncertainty: '±36%', mineral: 'MRO/CRISM: Regional Olivine + Mg-Carbonate (18 m/px)', hydrationEst: '2.5 wt% H2O' }
};

export const POI_1B: Poi = {
  id: 'POI-1b',
  name: 'Wildcat Ridge sulfate vein, second core',
  lat: 18.4457,
  lon: 77.4504,
  interestType: 'Astrobiology',
  infoToCollect: 'Second core 30 m along the sulfate vein, to test whether the organics follow the sulfate.',
  samplesRequired: true,
  sampleNotes: '1 core',
  priority: 'MED',
  instruments: ['abrader', 'sherloc', 'drill'],
  durationMin: 35,
  geologicalUnit: 'Sulfate vein in lacustrine mudstone',
  parentId: 'POI-1',
  orbitalPrior: { uncertainty: '±32%', mineral: 'MRO/CRISM: Fe/Mg Smectite Clay (18 m/px)', hydrationEst: '4.2 wt% H2O' },
  pdsInSituPosterior: {
    hydrationPosterior: '9.4 wt% H2O',
    uncertaintyAfter: '±3.9%',
    pixl: 'XRF: SO3 27 wt%, MgO 12 wt%',
    sherloc: 'UV Raman: aromatic organics along the sulfate vein',
    biosignatureRating: 'VERY HIGH'
  },
  measuredAt: 'Sol 15 · 11:20 LST'
};

export const POI_4B: Poi = {
  id: 'POI-4b',
  name: 'Contact vein, upslope extension',
  lat: 18.4402,
  lon: 77.4478,
  interestType: 'Water / hydration',
  infoToCollect: 'Follow the opal vein upslope: does the silica content hold?',
  samplesRequired: true,
  sampleNotes: '1 vein chip',
  priority: 'LOW',
  instruments: ['supercam', 'pixl'],
  durationMin: 25,
  geologicalUnit: 'Hydrated silica vein',
  parentId: 'POI-4',
  orbitalPrior: { uncertainty: '±40%', mineral: 'MRO/CRISM: no dominant signature', hydrationEst: '2.0 wt% H2O' },
  pdsInSituPosterior: {
    hydrationPosterior: '9.8 wt% H2O',
    uncertaintyAfter: '±4.0%',
    pixl: 'XRF: SiO2 58 wt%',
    sherloc: 'UV Raman: hydrated silica',
    biosignatureRating: 'MODERATE'
  },
  measuredAt: 'Sol 18 · 10:55 LST'
};

/** Crew roster with per-member overrides. */
export const crewWith = (rows: Record<string, Partial<CrewMember>>): CrewMember[] =>
  CREW_ROSTER.map((c) => ({ ...clone(c), ...rows[c.id] }));

export const crewName = (id: string) => CREW_ROSTER.find((c) => c.id === id)?.name ?? id;

const ALCOVE = SHELTERS.find((s: { id: string }) => s.id === 'ALCOVE') ?? SHELTERS[1];

/** Stretches walked on an EVA (base → stops → base), rated "as expected" unless overridden by leg index. */
export const walked = (pois: Poi[], ids: string[], sol: number, ratings: Record<number, TrafficRating> = {}, viaShelter = false): TrafficObs[] => {
  const pts: { name: string; lat: number; lon: number }[] = [
    { name: 'Base', lat: BASE.lat, lon: BASE.lon },
    ...ids.map((id) => pois.find((p) => p.id === id)).filter((p): p is Poi => Boolean(p)).map((p) => ({ name: p.id, lat: p.lat, lon: p.lon })),
    ...(viaShelter ? [{ name: 'Delta basal alcove', lat: ALCOVE.lat, lon: ALCOVE.lon }] : []),
    { name: 'Base', lat: BASE.lat, lon: BASE.lon }
  ];
  return pts.slice(1).map((b, i) => {
    const rating = ratings[i] ?? 'expected';
    return { a: [pts[i].lat, pts[i].lon], b: [b.lat, b.lon], rating, factor: TRAFFIC_FACTOR[rating], sol, note: `${pts[i].name} → ${b.name}` };
  });
};

/** Compact debrief record for a past EVA of the simulated history. */
export const pastDebrief = (eva: PastEva, signedBy: string, x: { borg: number; dose: number; suit?: string; signedAt: string }): Debrief => ({
  id: `DB-${String(eva.sol).padStart(3, '0')}-1`,
  missionId: `M-past-${eva.sol}`,
  sol: eva.sol,
  planVersion: Number(eva.planVersion.replace(/\D/g, '')) || 1,
  pois: eva.poiIds.map((id) => ({
    poiId: id,
    status: eva.reached.includes(id) ? (eva.outcome === 'partial' && id === eva.reached[eva.reached.length - 1] && eva.reached.length === eva.poiIds.length ? 'partial' : 'completed') : 'skipped',
    reason: eva.reached.includes(id) ? '' : (eva.reason ?? ''),
    samples: [],
    observation: '',
    proposePoi: false
  })),
  legs: [],
  actualMin: eva.actualMin,
  borg: x.borg,
  suitIssues: x.suit ?? '',
  dust: 'light',
  dosimeterMsv: x.dose,
  tlx: { mental: 40, physical: 50, temporal: 35 },
  psych: 'Nominal',
  signedBy,
  signedAt: x.signedAt
});

/** Empty parts of the state every scenario starts from. */
export const emptyState = (): Pick<PlannerState, 'packed' | 'measured' | 'sepAlert' | 'debriefs' | 'traffic' | 'evaHistory' | 'notices' | 'fieldEvents'> => ({
  packed: {},
  measured: [],
  sepAlert: false,
  debriefs: [],
  traffic: [],
  evaHistory: [],
  notices: [],
  fieldEvents: []
});
