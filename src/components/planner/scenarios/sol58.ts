import { APPROVER } from '../model.ts';
import type { LogEntry, PastEva, PlannerState, Poi, TrafficRating } from '../model.ts';
import { POI_1B, POI_4, POI_5, crewName, crewWith, emptyState, measured, pastDebrief, priorOnly, seedPoi, walked } from './shared.ts';

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO "Sol 58 — End of campaign"  ·  SIMULATED HISTORY (demo data, not NASA measurements)
// The hub lab finishes sample SW-41-03 from POI-6 (visited on Sol 41, priority LOW): sulfate far
// above the orbital prior plus an organic signal. Science asks for POI-6 at HIGH with an extended
// investigation; Mission Control re-plans Sol 59 with the two crew members who still have dose budget.
// This seed is also the starting point of the scripted 80-second demo (planner/demoSol58.ts).
// ═══════════════════════════════════════════════════════════════════════════════

export const POI_6: Poi = {
  id: 'POI-6',
  name: 'Hogwallow Flats sulfate bench',
  lat: 18.4365,
  lon: 77.444,
  interestType: 'Astrobiology',
  infoToCollect: 'Sulfate-cemented mudstone bench at the delta front: sulfate abundance and organics in the matrix.',
  samplesRequired: true,
  sampleNotes: 'Sample SW-41-03 collected on Sol 41 (1 core). Extended investigation: 2 more cores along the bench.',
  priority: 'LOW',
  instruments: ['supercam', 'abrader', 'pixl', 'sherloc', 'drill'],
  durationMin: 60,
  geologicalUnit: 'Sulfate-cemented lacustrine mudstone (delta front bench)',
  orbitalPrior: { uncertainty: '±50%', mineral: 'MRO/CRISM: weak polyhydrated sulfate signature (18 m/px)', hydrationEst: '2.0 wt% H2O' },
  pdsInSituPosterior: {
    hydrationPosterior: '7.8 wt% H2O',
    uncertaintyAfter: '±4%',
    pixl: 'Hub lab XRD/XRF on SW-41-03: SO3 24 ± 2 wt% vs orbital prior 6 ± 5 wt% (residual +3.6σ)',
    sherloc: 'Hub lab UV fluorescence on SW-41-03: organic-compound signal in the sulfate matrix',
    biosignatureRating: 'HIGH (possible past microbial habitability)'
  },
  measuredAt: 'Sol 41 · 11:30 LST'
};

export const POI_8: Poi = {
  id: 'POI-8',
  name: 'Three Forks bench, short sampling',
  lat: 18.442,
  lon: 77.4535,
  interestType: 'Geology',
  infoToCollect: 'One chip of the bench sandstone for the grain-size series.',
  samplesRequired: true,
  sampleNotes: '1 chip',
  priority: 'MED',
  instruments: ['supercam', 'abrader', 'pixl'],
  durationMin: 25,
  geologicalUnit: 'Cross-bedded delta sandstone',
  orbitalPrior: { uncertainty: '±34%', mineral: 'MRO/CRISM: Fe/Mg smectite clay (18 m/px)', hydrationEst: '3.6 wt% H2O' }
};

const pois: Poi[] = [
  measured(seedPoi('POI-1'), 'Sol 1 · 11:10 LST'),
  measured(seedPoi('POI-2'), 'Sol 2 · 12:05 LST'),
  priorOnly(seedPoi('POI-3')),
  POI_4,
  POI_5,
  POI_1B,
  POI_6,
  POI_8
];

const P: Record<string, string[]> = { A: ['CM1', 'CM2'], B: ['CM3', 'CM4'], C: ['CM1', 'CM4'], D: ['CM2', 'CM3'] };

// sol, pair, planned POIs, reached, outcome, planned min, actual min, reason, via shelter, leg ratings
type Row = [number, string, string[], string[], PastEva['outcome'], number, number, string?, boolean?, Record<number, TrafficRating>?];
const ROWS: Row[] = [
  [1, 'A', ['POI-1'], ['POI-1'], 'completed', 100, 118, undefined, false, { 1: 'harder' }],
  [2, 'A', ['POI-2'], ['POI-2'], 'completed', 138, 149],
  [6, 'C', ['POI-5'], ['POI-5'], 'completed', 112, 110, undefined, false, { 0: 'easier' }],
  [11, 'A', ['POI-4', 'POI-2'], ['POI-4'], 'aborted', 205, 268, 'SEP alert at 10:52 LST, 33 min from a shelter: diverted to the delta alcove, sheltered 3 h 10 min, POI-2 not reached', true],
  [15, 'B', ['POI-1b'], ['POI-1b'], 'completed', 108, 111],
  [27, 'D', ['POI-4', 'POI-1'], ['POI-4', 'POI-1'], 'completed', 142, 146],
  [34, 'A', ['POI-2', 'POI-5'], ['POI-2'], 'partial', 221, 204, 'Séítah megaripple field softer than predicted (+31 min); POI-5 skipped at turn-back time', false, { 0: 'harder' }],
  [41, 'A', ['POI-6'], ['POI-6'], 'completed', 160, 171, undefined, false, { 0: 'expected', 1: 'expected' }],
  [48, 'B', ['POI-5'], ['POI-5'], 'completed', 112, 107, undefined, false, { 1: 'easier' }],
  [55, 'C', ['POI-1b'], ['POI-1b'], 'completed', 108, 104]
];

const history: PastEva[] = ROWS.map(([sol, pair, poiIds, reached, outcome, plannedMin, actualMin, reason, viaShelter]) => ({
  id: `EVA-${String(sol).padStart(3, '0')}`,
  sol,
  pair: P[pair].map(crewName),
  planVersion: outcome === 'completed' ? 'v1' : 'v2',
  poiIds,
  reached,
  outcome,
  plannedMin,
  actualMin,
  reason,
  viaShelter
}));

const log: LogEntry[] = [
  ['001-1', 1, '07:40', 'science', 'v1', 'Orbital priors only (CRISM 18 m/px, 1σ ±29–36 %)', 'Sol 1: short first EVA to POI-1', APPROVER, 'EVA completed in 118 min (planned 100)'],
  ['002-1', 2, '11:05', 'science', 'v2', 'Sol 2 PIXL/SHERLOC at FE-002-001: 11.2 wt% H2O (prior 2.0)', 'FE-002-001 promoted to POI-4', 'Sci Lead Dr. A. Patel', 'POI-4 added'],
  ['011-1', 11, '10:52', 'safety', 'v1 → v2', 'DONKI SEP alert, proton flux above 35 pfu; crew 33 min from a shelter', 'EVA aborted: diverted to the delta alcove (pre-authorised rule)', 'Rad Safety Officer K. Chen', 'Crew sheltered 3 h 10 min, +2.2 mSv each'],
  ['034-1', 34, '13:05', 'safety', 'v1 → v2', 'Sol 34 debrief: megaripple field softer than predicted (+31 min on the Séítah leg)', 'POI-5 skipped at turn-back time; Séítah leg speed derated by 30 %', APPROVER, 'EVA partial in 204 min'],
  ['040-1', 40, '16:20', 'science', 'v1', 'POI-6 sulfate bench: low priority, one reconnaissance core wanted before the end of the campaign', 'Sol 41: EVA to POI-6, 60 min on site', APPROVER, 'Sol 41 plan v1 sent'],
  ['041-1', 41, '13:40', 'science', 'v1', 'Sol 41 debrief: POI-6 reached, sample SW-41-03 collected, route Base → POI-6 walked as expected', 'SW-41-03 queued for the hub lab (XRD + UV fluorescence)', 'Sci Lead Dr. A. Patel', 'Terrain Base → POI-6 validated in situ'],
  ['052-1', 52, '16:30', 'safety', '—', 'Dose review at Sol 52: Okafor and Haddad close to the 40 mSv surface budget', 'EVA pair rotation: Tanaka and Lindqvist first choice for the remaining EVAs', 'Flight surgeon Dr. M. Lindqvist', 'Sol 53–58 plans re-crewed'],
  ['057-1', 57, '17:10', 'science', 'v1', 'End of campaign in 12 sols: remaining targets are short sampling stops', 'Sol 59: POI-8 short sampling with Okafor and Haddad (82 min)', APPROVER, 'Sol 59 plan v1 sent']
].map(([id, sol, t, type, planVersion, evidence, decision, approvedBy, outcome]) => ({
  id: `LOG-${id}`,
  sol: sol as number,
  ts: `Sol ${sol} · ${t} LST`,
  type: type as LogEntry['type'],
  planVersion: planVersion as string,
  evidence: evidence as string,
  decision: decision as string,
  approvedBy: approvedBy as string,
  outcome: outcome as string
}));

export const SOL58_LAB_FE_ID = 'FE-058-001';
export const SOL58_NOTICE_ID = 'N-058-1';
export const SOL58_MISSION_59 = 'M-s58-59';
export const SOL58_MISSION_61 = 'M-s58-61';

export const SOL58_STATE: PlannerState = {
  ...emptyState(),
  scenarioId: 'sol58',
  todaySol: 58,
  pois,
  measured: [],
  missions: [
    {
      // Sol 59 plan v1, already sent: a short sampling stop with the default EVA pair
      id: SOL58_MISSION_59,
      sol: 59,
      startTime: '09:30',
      poiIds: ['POI-8'],
      extraEquipment: ['Spare battery pack', 'Navigation tablet'],
      status: 'sent',
      version: 1,
      approvedBy: APPROVER
    },
    {
      id: 'M-s58-60',
      sol: 60,
      startTime: '09:30',
      poiIds: [],
      extraEquipment: [],
      status: 'draft',
      version: 1
    },
    {
      id: SOL58_MISSION_61,
      sol: 61,
      startTime: '09:30',
      poiIds: ['POI-5'],
      extraEquipment: ['Spare battery pack'],
      evaPair: ['CM3', 'CM4'],
      status: 'draft',
      version: 1
    }
  ],
  fieldEvents: [
    {
      id: 'FE-034-001',
      ts: 'Sol 34 · 11:32 LST',
      source: 'EVA debrief · Dr. Samir Haddad',
      method: 'crew observation',
      class: 'soft-soil',
      title: 'Séítah megaripple field softer than predicted',
      confidence: 1,
      lat: 18.4335,
      lon: 77.4568,
      photo: 'VISORCAM_EV2_SOL034_1132',
      description: 'Megaripple crests collapse under load; +31 min on the Séítah leg.',
      actionDirective: 'Speed derated by 30 % on this leg; avoid the ripple troughs.',
      status: 'confirmed'
    },
    {
      id: SOL58_LAB_FE_ID,
      ts: 'Sol 58 · 08:05 LST',
      source: 'Hub lab · sample SW-41-03 (POI-6, collected Sol 41)',
      method: 'Hub lab: XRD + XRF + UV fluorescence',
      class: 'formation-interest',
      title: 'Lab result SW-41-03: sulfate 24 ± 2 wt% SO3 (prior 6 ± 5), organic signal',
      confidence: 0.94,
      lat: POI_6.lat,
      lon: POI_6.lon,
      photo: 'HUBLAB_SW-41-03_XRD',
      description:
        'Sulfate 24 ± 2 wt% SO3 against an orbital prior of 6 ± 5 wt% (residual +3.6σ). UV fluorescence shows an organic-compound signal in the sulfate matrix. Possible evidence of past microbial habitability.',
      actionDirective: 'For the Scientist to review: extended investigation of POI-6 before the end of the campaign?',
      status: 'needs review'
    }
  ],
  notices: [
    {
      id: SOL58_NOTICE_ID,
      sol: 58,
      title: 'Hub lab result · sample SW-41-03 · POI-6',
      text: {
        scientist: 'Sulfate 24 ± 2 wt% SO3 vs orbital prior 6 ± 5 (+3.6σ), with an organic-compound fluorescence signal. Review the discovery.',
        control: 'The hub lab reports an unexpected result from POI-6 (Sol 41 sample). Science may ask to re-plan Sol 59.'
      },
      seenBy: []
    }
  ],
  traffic: ROWS.flatMap(([sol, , , reached, , , , , viaShelter, ratings]) => walked(pois, reached, sol, ratings ?? {}, viaShelter)),
  evaHistory: history,
  debriefs: history.map((eva, i) =>
    pastDebrief(eva, eva.pair[0], {
      borg: eva.outcome === 'completed' ? 12 + (i % 3) : 16,
      dose: eva.outcome === 'aborted' ? 2.2 : 0.08,
      suit: eva.sol === 34 ? 'Left glove wrist bearing stiff with dust' : '',
      signedAt: '13:10 LST'
    })
  ),
  // Dose (per person, 58 sols): habitat background 58 × 0.64 × 0.6 ≈ 22 mSv, storm shelter during the
  // Sol 11 SEP, nominal EVAs, and the Sol 11 EVA pair caught outside. Okafor and Haddad are at the budget.
  crew: crewWith({
    CM1: { evasCompleted: 14, dosePlannedMsv: 34.0, doseActualMsv: 39.2, fatigue: 'Moderate', psych: 'Nominal (Sol 57 check-in)', vitals: { heartRate: 90, spo2: 96, sleepH: 6.2 } },
    CM2: { evasCompleted: 13, dosePlannedMsv: 34.0, doseActualMsv: 38.8, fatigue: 'Moderate', psych: 'Nominal (Sol 57 check-in)', vitals: { heartRate: 86, spo2: 97, sleepH: 6.4 } },
    CM3: { evasCompleted: 9, dosePlannedMsv: 34.0, doseActualMsv: 25.6, fatigue: 'Low', psych: 'Nominal', vitals: { heartRate: 74, spo2: 98, sleepH: 7.1 } },
    CM4: { evasCompleted: 9, dosePlannedMsv: 34.0, doseActualMsv: 27.2, fatigue: 'Low', psych: 'Nominal (Sol 57 check-in)', vitals: { heartRate: 70, spo2: 98, sleepH: 7.3 } }
  }),
  log
};
