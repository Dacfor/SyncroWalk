import { APPROVER } from '../model.ts';
import type { LogEntry, PastEva, PlannerState, TrafficRating } from '../model.ts';
import { POI_1B, POI_2B, POI_4, POI_4B, POI_5, crewName, crewWith, emptyState, measured, pastDebrief, priorOnly, seedPoi, walked } from './shared.ts';

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO "Sol 20 — Advanced ops"  ·  SIMULATED HISTORY (demo data, not NASA measurements)
// 16 EVAs in 20 sols: route history, trafficability validated in situ, follow-up targets
// derived from debriefs, two SEP events, and a crew member at the end of the dose budget.
// ═══════════════════════════════════════════════════════════════════════════════
const pois = [
  measured(seedPoi('POI-1'), 'Sol 1 · 11:10 LST'),
  measured(seedPoi('POI-2'), 'Sol 2 · 12:05 LST'),
  priorOnly(seedPoi('POI-3')), // still orbital only: the scarp keeps it out of reach
  POI_4,
  POI_5,
  POI_2B, // derived from POI-2 (Sol 14 debrief), not sampled yet
  POI_1B,
  POI_4B
];

// EVA pairs used so far (rotation)
const P: Record<string, string[]> = {
  A: ['CM1', 'CM2'],
  B: ['CM3', 'CM4'],
  C: ['CM1', 'CM4'],
  D: ['CM2', 'CM3'],
  E: ['CM1', 'CM3'],
  F: ['CM2', 'CM4']
};

// sol, pair, planned POIs, reached, outcome, planned min, actual min, reason, via shelter, leg ratings
type Row = [number, string, string[], string[], PastEva['outcome'], number, number, string?, boolean?, Record<number, TrafficRating>?];
const ROWS: Row[] = [
  [1, 'A', ['POI-1'], ['POI-1'], 'completed', 100, 118, undefined, false, { 1: 'harder' }],
  [2, 'A', ['POI-2'], ['POI-2'], 'completed', 138, 149],
  [3, 'A', ['POI-4', 'POI-1'], ['POI-4', 'POI-1'], 'completed', 142, 139],
  [4, 'B', ['POI-1'], ['POI-1'], 'completed', 100, 97],
  [5, 'A', ['POI-2'], ['POI-2'], 'completed', 138, 141],
  [6, 'C', ['POI-5'], ['POI-5'], 'completed', 112, 110, undefined, false, { 0: 'easier' }],
  [7, 'A', ['POI-2', 'POI-5'], ['POI-2'], 'partial', 221, 204, 'Terrain: megaripple field softer than predicted on the Séítah leg (+31 min); POI-5 skipped at turn-back time', false, { 0: 'harder' }],
  [8, 'B', ['POI-4'], ['POI-4'], 'completed', 104, 101],
  [9, 'D', ['POI-1', 'POI-4'], ['POI-1', 'POI-4'], 'completed', 142, 146],
  [11, 'A', ['POI-4', 'POI-2'], ['POI-4'], 'aborted', 205, 268, 'SEP alert at 10:52 LST, 33 min from a shelter: diverted to the delta alcove, sheltered 3 h 10 min, POI-2 not reached', true],
  [13, 'C', ['POI-5'], ['POI-5'], 'completed', 112, 109],
  [14, 'A', ['POI-2'], ['POI-2'], 'completed', 138, 143],
  [15, 'B', ['POI-1b'], ['POI-1b'], 'completed', 108, 111],
  [16, 'E', ['POI-2', 'POI-5'], ['POI-2'], 'aborted', 221, 187, 'SEP alert at 11:20 LST at the far end of the route (38 min from a shelter): returned to the base, POI-5 not reached', false],
  [18, 'B', ['POI-4b'], ['POI-4b'], 'completed', 98, 96],
  [19, 'F', ['POI-5'], ['POI-5'], 'completed', 112, 107, undefined, false, { 1: 'easier' }]
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
  ['001-2', 1, '12:20', 'safety', 'v1 → v2', 'Sol 1 debrief: soft soil on leg 2 (+18 min)', 'Sol 2 route moved to the bench', APPROVER, 'Sol 2 plan v2 sent'],
  ['002-1', 2, '11:05', 'science', 'v2', 'Sol 2 PIXL/SHERLOC at FE-002-001: 11.2 wt% H2O (prior 2.0)', 'FE-002-001 promoted to POI-4', 'Sci Lead Dr. A. Patel', 'POI-4 added'],
  ['002-2', 2, '16:40', 'replan', 'v1 → v2', 'Sol 3 plan v1 NO-GO: 19.4° scarp, 22 % not evaluated', 'Dropped POI-3, added POI-4', APPROVER, 'Sol 3 plan v2 GO'],
  ['006-1', 6, '12:10', 'science', 'v1', 'Sol 6 SHERLOC at POI-5: carbonate-hosted organic fluorescence', 'POI-5 raised to a repeat target', 'Sci Lead Dr. A. Patel', 'Two more visits planned'],
  ['007-1', 7, '13:05', 'safety', 'v1 → v2', 'Sol 7 debrief: megaripple field softer than predicted (+31 min on the Séítah leg)', 'POI-5 skipped at turn-back time; Séítah leg speed derated by 30 %', APPROVER, 'EVA partial in 204 min'],
  ['011-1', 11, '10:52', 'safety', 'v1 → v2', 'DONKI SEP alert, proton flux above 35 pfu; crew 33 min from a shelter', 'EVA aborted: diverted to the delta alcove (pre-authorised rule)', 'Rad Safety Officer K. Chen', 'Crew sheltered 3 h 10 min, +2.2 mSv each'],
  ['012-1', 12, '08:00', 'safety', '—', 'SEP event still above threshold (46 h in total)', 'No EVA; crew in the storm shelter', 'Rad Safety Officer K. Chen', '+11.5 mSv each over the event'],
  ['014-1', 14, '12:40', 'science', 'v1', 'Sol 14 debrief: fresh olivine–carbonate contact 15 m east of Bastide (FE-014-001)', 'Derived target POI-2b created (follow-up of POI-2)', 'Sci Lead Dr. A. Patel', 'POI-2b high priority'],
  ['016-1', 16, '11:20', 'safety', 'v1 → v2', 'Second SEP alert with the crew at the far end of the route (38 min from a shelter)', 'EVA aborted: return to base; POI-5 not reached', 'Rad Safety Officer K. Chen', '+2.4 mSv for the EVA pair, +5.0 mSv each in shelter'],
  ['019-1', 19, '16:30', 'safety', '—', 'Dose review: Okafor 29.6 mSv, no budget left for an EVA; Haddad and Tanaka one EVA each', 'EVA pair must rotate: Lindqvist first choice for the next EVAs', 'Flight surgeon Dr. M. Lindqvist', 'Sol 20 plan to be re-crewed'],
  ['019-2', 19, '17:10', 'science', 'v1', 'POI-2b not sampled yet: both sides of the contact needed to test hypothesis H1', 'Sol 20: POI-2 + POI-2b', APPROVER, 'Sol 20 plan v1 drafted']
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

export const SOL20_STATE: PlannerState = {
  ...emptyState(),
  scenarioId: 'sol20',
  todaySol: 20,
  pois,
  measured: ['POI-1', 'POI-2', 'POI-4', 'POI-5', 'POI-1b', 'POI-4b'],
  missions: [
    {
      // Default seats put Okafor on the EVA: NO-GO on dose until the pair is rotated
      id: 'M-s20-20',
      sol: 20,
      startTime: '09:30',
      poiIds: ['POI-2', 'POI-2b'],
      extraEquipment: ['Spare battery pack', 'Navigation tablet'],
      status: 'draft',
      version: 1
    },
    {
      id: 'M-s20-21',
      sol: 21,
      startTime: '09:30',
      poiIds: ['POI-5'],
      extraEquipment: ['Comms relay'],
      status: 'draft',
      version: 1,
      evaPair: ['CM4', 'CM3']
    }
  ],
  fieldEvents: [
    {
      id: 'FE-001-001',
      ts: 'Sol 1 · 11:48 LST',
      source: 'EVA debrief · Cmdr. Lena Okafor',
      method: 'crew observation',
      class: 'soft-soil',
      title: 'Soft sand on the return leg from Wildcat Ridge',
      confidence: 1,
      lat: 18.4474,
      lon: 77.4531,
      photo: 'VISORCAM_EV1_SOL001_1148',
      description: 'Boot sinkage 6–8 cm for about 120 m. Not visible in HiRISE.',
      actionDirective: 'Keep to the consolidated bench west of the sand.',
      status: 'confirmed'
    },
    {
      id: 'FE-002-001',
      ts: 'Sol 2 · 11:05 LST',
      source: 'visorCam + handheld PIXL/SHERLOC',
      method: 'Rapid 12-min field funnel',
      class: 'formation-interest',
      title: 'Séítah–delta contact hydrated carbonate–silica vein',
      confidence: 0.94,
      lat: 18.4395,
      lon: 77.4485,
      photo: 'WATSON_EV2_SOL002_VEIN',
      description: 'Fracture vein 0.4 m wide, 11.2 wt% H2O, opal-A and Mg-carbonate.',
      actionDirective: 'Promoted to POI-4 (high priority).',
      status: 'confirmed'
    },
    {
      id: 'FE-007-001',
      ts: 'Sol 7 · 11:32 LST',
      source: 'EVA debrief · Dr. Samir Haddad',
      method: 'crew observation',
      class: 'soft-soil',
      title: 'Séítah megaripple field softer than predicted',
      confidence: 1,
      lat: 18.4335,
      lon: 77.4568,
      photo: 'VISORCAM_EV2_SOL007_1132',
      description: 'Megaripple crests collapse under load; +31 min on the Séítah leg.',
      actionDirective: 'Speed derated by 30 % on this leg; avoid the ripple troughs.',
      status: 'confirmed'
    },
    {
      id: 'FE-014-001',
      ts: 'Sol 14 · 12:02 LST',
      source: 'EVA debrief · Cmdr. Lena Okafor',
      method: 'crew observation',
      class: 'formation-interest',
      title: 'Fresh olivine–carbonate contact 15 m east of Bastide',
      confidence: 0.85,
      lat: 18.4291,
      lon: 77.46,
      photo: 'VISORCAM_EV1_SOL014_1202',
      description: 'Sharp alteration front, unweathered on both sides. Better sampling site than the original outcrop.',
      actionDirective: 'Derived target POI-2b (follow-up of POI-2).',
      status: 'confirmed'
    },
    {
      id: 'FE-018-001',
      ts: 'Sol 18 · 10:20 LST',
      source: 'visorCam',
      method: 'objectDetection-demo',
      class: 'boulder',
      title: 'Cape Nukshak float boulder apron (0.9 m)',
      confidence: 0.69,
      lat: 18.4422,
      lon: 77.4502,
      photo: 'NAVCAM_EV1_SOL018_1020',
      description: 'Angular basaltic float boulders 12 m east of the direct climb.',
      actionDirective: 'Deviate 15 m west along the bench [demo model, not certified].',
      status: 'needs review'
    }
  ],
  // Every stretch walked so far, in chronological order (the latest rating of a stretch wins)
  traffic: ROWS.flatMap(([sol, , , reached, , , , , viaShelter, ratings]) => walked(pois, reached, sol, ratings ?? {}, viaShelter)),
  evaHistory: history,
  debriefs: history.map((eva, i) =>
    pastDebrief(eva, eva.pair[0], {
      borg: eva.outcome === 'completed' ? 12 + (i % 3) : 16,
      dose: eva.outcome === 'aborted' ? (eva.sol === 11 ? 2.2 : 2.4) : 0.08,
      suit: eva.sol === 16 ? 'Left glove wrist bearing stiff with dust' : '',
      signedAt: '13:10 LST'
    })
  ),
  // Dose accounting (per person): habitat background 20 sols × 0.64 × 0.6 = 7.7 mSv; storm shelter during
  // SEP 1 (46 h) 11.5 mSv and SEP 2 (20 h) 5.0 mSv; nominal EVAs 0.08 mSv each; caught outside on Sol 11
  // (+2.2, Okafor and Haddad) and on Sol 16 (+2.4, Okafor and Tanaka).
  crew: crewWith({
    CM1: { evasCompleted: 10, dosePlannedMsv: 12.8, doseActualMsv: 29.6, fatigue: 'High', psych: 'Tired, asks for a rest sol (Sol 19 check-in)', vitals: { heartRate: 92, spo2: 96, sleepH: 5.6 } },
    CM2: { evasCompleted: 9, dosePlannedMsv: 12.8, doseActualMsv: 27.1, fatigue: 'Moderate', psych: 'Nominal (Sol 19 check-in)', vitals: { heartRate: 88, spo2: 97, sleepH: 6.3 } },
    CM3: { evasCompleted: 6, dosePlannedMsv: 12.8, doseActualMsv: 27.1, fatigue: 'Moderate', psych: 'Nominal', vitals: { heartRate: 78, spo2: 98, sleepH: 6.9 } },
    CM4: { evasCompleted: 7, dosePlannedMsv: 12.8, doseActualMsv: 25.0, fatigue: 'Low', psych: 'Nominal (Sol 19 check-in)', vitals: { heartRate: 70, spo2: 98, sleepH: 7.2 } }
  }),
  log
};
