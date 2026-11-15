import { APPROVER } from '../model.ts';
import type { PlannerState } from '../model.ts';
import { crewWith, emptyState, priorOnly, seedPoi } from './shared.ts';

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO "Sol 1 — Landing"  ·  SIMULATED HISTORY (demo data, not NASA measurements)
// Only orbital priors: no in-situ measurement, no validated terrain, plan v1.
// What it shows: how uncertain the plan is before anyone has walked on the surface.
// ═══════════════════════════════════════════════════════════════════════════════
export const SOL1_STATE: PlannerState = {
  ...emptyState(),
  scenarioId: 'sol1',
  todaySol: 1,
  pois: [priorOnly(seedPoi('POI-1')), priorOnly(seedPoi('POI-2')), priorOnly(seedPoi('POI-3'))],
  missions: [
    {
      id: 'M-s1-1',
      sol: 1,
      startTime: '10:00',
      poiIds: ['POI-1'],
      extraEquipment: ['Navigation tablet', 'Comms relay'],
      status: 'sent',
      version: 1,
      approvedBy: APPROVER
    },
    {
      id: 'M-s1-2',
      sol: 2,
      startTime: '09:30',
      poiIds: ['POI-2'],
      extraEquipment: ['Spare battery pack'],
      status: 'draft',
      version: 1
    },
    // Preset EVA already sent to the crew (astronaut view)
    {
      id: 'M-s1-3',
      sol: 3,
      startTime: '09:30',
      poiIds: ['POI-1', 'POI-2'],
      extraEquipment: ['Spare battery pack', 'Navigation tablet'],
      status: 'sent',
      version: 1,
      approvedBy: APPROVER
    }
  ],
  crew: crewWith({
    CM1: { evasCompleted: 0, dosePlannedMsv: 0.64, doseActualMsv: 0.39, fatigue: 'Low', psych: 'Nominal (post-landing check)', vitals: { heartRate: 76, spo2: 98, sleepH: 6.4 } },
    CM2: { evasCompleted: 0, dosePlannedMsv: 0.64, doseActualMsv: 0.38, fatigue: 'Low', psych: 'Nominal (post-landing check)', vitals: { heartRate: 81, spo2: 97, sleepH: 6.1 } },
    CM3: { evasCompleted: 0, dosePlannedMsv: 0.64, doseActualMsv: 0.38, fatigue: 'Low', psych: 'Nominal (post-landing check)', vitals: { heartRate: 70, spo2: 98, sleepH: 6.8 } },
    CM4: { evasCompleted: 0, dosePlannedMsv: 0.64, doseActualMsv: 0.38, fatigue: 'Low', psych: 'Nominal (post-landing check)', vitals: { heartRate: 68, spo2: 98, sleepH: 6.6 } }
  }),
  log: [
    {
      id: 'LOG-001-1',
      sol: 1,
      ts: 'Sol 1 · 07:40 LST',
      type: 'science',
      planVersion: 'v1',
      evidence: 'Orbital priors only: CRISM mineralogy at 18 m/px (1σ ±29–36 %), HiRISE imagery, MOLA topography. No in-situ measurement.',
      decision: 'Sol 1: short first EVA to POI-1 (highest priority, 11 min from the base)',
      approvedBy: APPROVER,
      outcome: 'Plan v1 sent to the crew'
    },
    {
      id: 'LOG-001-2',
      sol: 1,
      ts: 'Sol 1 · 07:55 LST',
      type: 'safety',
      planVersion: 'v1',
      evidence: 'Two zones not evaluated from orbit; no trafficability validated; soft soil cannot be seen at HiRISE scale',
      decision: 'POI-3 kept out of the first sols (19.4° scarp, 56 % of the route not evaluated)',
      approvedBy: APPROVER,
      outcome: 'Walking speed derated on not-evaluated terrain'
    }
  ]
};
