import { APPROVER, summarizePlan } from '../model.ts';
import type { DailyMission, PastEva, PlannerState } from '../model.ts';
import { POI_4, crewName, crewWith, emptyState, measured, pastDebrief, priorOnly, seedPoi, walked } from './shared.ts';

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO "Sol 3 — Early ops"  ·  SIMULATED HISTORY (demo data, not NASA measurements)
// Two EVAs done (Sol 1, Sol 2), both debriefed. The first in-situ measurements are on the
// map, the debriefs already changed two plans, and the Sol 3 plan is at v2 after a replan.
// ═══════════════════════════════════════════════════════════════════════════════
const pois = [
  measured(seedPoi('POI-1'), 'Sol 1 · 11:10 LST'),
  measured(seedPoi('POI-2'), 'Sol 2 · 12:05 LST'),
  priorOnly(seedPoi('POI-3')),
  POI_4
];

const PAIR = [crewName('CM1'), crewName('CM2')];
const history: PastEva[] = [
  { id: 'EVA-001', sol: 1, pair: PAIR, planVersion: 'v1', poiIds: ['POI-1'], reached: ['POI-1'], outcome: 'completed', plannedMin: 100, actualMin: 118 },
  { id: 'EVA-002', sol: 2, pair: PAIR, planVersion: 'v2', poiIds: ['POI-2'], reached: ['POI-2'], outcome: 'completed', plannedMin: 138, actualMin: 149 }
];

// Sol 3, plan v1 (written on Sol 1 from orbit) and plan v2 (after the Sol 2 debrief)
const SOL3_V1: DailyMission = {
  id: 'M-s3-3',
  sol: 3,
  startTime: '09:30',
  poiIds: ['POI-1', 'POI-3'],
  extraEquipment: ['Navigation tablet'],
  status: 'draft',
  version: 1
};
const SOL3_V2: DailyMission = {
  ...SOL3_V1,
  poiIds: ['POI-4', 'POI-1'],
  status: 'sent',
  version: 2,
  approvedBy: APPROVER
};

const state: PlannerState = {
  ...emptyState(),
  scenarioId: 'sol3',
  todaySol: 3,
  pois,
  measured: ['POI-1', 'POI-2', 'POI-4'],
  missions: [
    SOL3_V2,
    {
      id: 'M-s3-4',
      sol: 4,
      startTime: '09:30',
      poiIds: ['POI-2'],
      extraEquipment: ['Spare battery pack'],
      status: 'draft',
      version: 1
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
      description: 'Boot sinkage 6–8 cm for about 120 m. Not visible in HiRISE. Leg 2 took 18 min longer than planned.',
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
      description: 'Fracture vein 0.4 m wide (below the 18 m CRISM pixel), analysed in 12 min with handheld SuperCam → abrader → PIXL/SHERLOC: 11.2 wt% H2O, opal-A and Mg-carbonate.',
      actionDirective: 'Promoted to POI-4 (high priority).',
      status: 'confirmed'
    },
    {
      id: 'FE-002-002',
      ts: 'Sol 2 · 12:31 LST',
      source: 'EVA debrief · Dr. Samir Haddad',
      method: 'crew observation',
      class: 'soft-soil',
      title: 'Séítah margin megaripple sand pocket',
      confidence: 1,
      lat: 18.4335,
      lon: 77.4568,
      photo: 'VISORCAM_EV2_SOL002_1231',
      description: 'Unconsolidated megaripple sand along the Séítah floor; high metabolic cost.',
      actionDirective: 'Avoid the ripple trough; stay on the bench.',
      status: 'confirmed'
    }
  ],
  // Stretches the crew has walked: the Sol 1 return leg was harder than predicted
  traffic: [...walked(pois, ['POI-1'], 1, { 1: 'harder' }), ...walked(pois, ['POI-2'], 2)],
  evaHistory: history,
  debriefs: [
    pastDebrief(history[0], PAIR[0], { borg: 13, dose: 0.06, signedAt: '12:20 LST' }),
    pastDebrief(history[1], PAIR[1], { borg: 14, dose: 0.07, signedAt: '12:50 LST' })
  ],
  crew: crewWith({
    CM1: { evasCompleted: 2, dosePlannedMsv: 1.92, doseActualMsv: 1.29, fatigue: 'Moderate', psych: 'Nominal (Sol 2 debrief)', vitals: { heartRate: 84, spo2: 97, sleepH: 6.9 } },
    CM2: { evasCompleted: 2, dosePlannedMsv: 1.92, doseActualMsv: 1.3, fatigue: 'Moderate', psych: 'Nominal (Sol 2 debrief)', vitals: { heartRate: 90, spo2: 97, sleepH: 6.2 } },
    CM3: { evasCompleted: 0, dosePlannedMsv: 1.92, doseActualMsv: 1.15, fatigue: 'Low', psych: 'Nominal', vitals: { heartRate: 71, spo2: 98, sleepH: 7.4 } },
    CM4: { evasCompleted: 0, dosePlannedMsv: 1.92, doseActualMsv: 1.15, fatigue: 'Low', psych: 'Nominal', vitals: { heartRate: 69, spo2: 98, sleepH: 7.2 } }
  }),
  log: [
    {
      id: 'LOG-001-1',
      sol: 1,
      ts: 'Sol 1 · 07:40 LST',
      type: 'science',
      planVersion: 'v1',
      evidence: 'Orbital priors only (CRISM 18 m/px, 1σ ±29–36 %)',
      decision: 'Sol 1: short first EVA to POI-1',
      approvedBy: APPROVER,
      outcome: 'EVA completed in 118 min (planned 100)'
    },
    {
      id: 'LOG-001-2',
      sol: 1,
      ts: 'Sol 1 · 12:20 LST',
      type: 'safety',
      planVersion: 'v1 → v2',
      evidence: 'Sol 1 debrief: soft soil on leg 2 (+18 min), boot sinkage 6–8 cm (FE-001-001)',
      decision: 'Sol 2 route moved to the bench west of the sand; walking speed derated within 80 m of the report',
      approvedBy: APPROVER,
      outcome: 'Sol 2 plan v2 sent'
    },
    {
      id: 'LOG-002-1',
      sol: 2,
      ts: 'Sol 2 · 11:05 LST',
      type: 'science',
      planVersion: 'v2',
      evidence: 'Sol 2 PIXL/SHERLOC at FE-002-001: 11.2 ± 0.4 wt% H2O, opal-A + Mg-carbonate (orbital prior 2.0 ± 0.8)',
      decision: 'FE-002-001 promoted to POI-4, high priority',
      approvedBy: 'Sci Lead Dr. A. Patel',
      outcome: 'POI-4 added to the target list'
    },
    {
      id: 'LOG-002-2',
      sol: 2,
      ts: 'Sol 2 · 16:40 LST',
      type: 'replan',
      planVersion: 'v1 → v2',
      evidence: 'Sol 3 plan v1 NO-GO: 19.4° scarp below POI-3 and 22 % of the route on not-evaluated terrain; POI-4 now outranks POI-3',
      decision: 'Dropped POI-3 (low priority); added POI-4 before POI-1',
      approvedBy: APPROVER,
      outcome: 'Sol 3 plan v2 GO, sent to the crew'
    }
  ]
};

// The replan record of the Sol 3 mission, with numbers computed by the EVA model itself
state.missions[0].replan = {
  fromVersion: 1,
  toVersion: 2,
  ts: 'Sol 2 · 16:40 LST',
  reason: '19.4° delta scarp below Skinner Ridge · 22 % of the route not evaluated · POI-4 promoted by the Sol 2 measurement',
  steps: [
    { code: 'a', text: 'Dropped POI-3 (low priority, on the scarp and on not-evaluated terrain)' },
    { code: 'sci', text: 'Added POI-4 (high priority): contact vein measured in situ on Sol 2, 11.2 wt% H2O' }
  ],
  before: summarizePlan(state, SOL3_V1),
  after: summarizePlan(state, SOL3_V2)
};

export const SOL3_STATE = state;
