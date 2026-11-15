import { SEED_STATE } from '../model.ts';
import type { PlannerState } from '../model.ts';
import { SOL1_STATE } from './sol1.ts';
import { SOL3_STATE } from './sol3.ts';
import { SOL20_STATE } from './sol20.ts';

// Scenario selector (top bar). Each scenario is a complete seed of the shared state.
// All of them are simulated histories written for the demo.
export interface Scenario {
  id: string;
  label: string;
  summary: string;
  state: PlannerState;
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'demo',
    label: 'Sol 24 — Live ops',
    summary: 'Default demo: Sol 24 plan sent, Sol 25 draft NO-GO, SEP drill in Mission Control › Environment.',
    state: SEED_STATE
  },
  {
    id: 'sol1',
    label: 'Sol 1 — Landing',
    summary: 'Orbital priors only: no in-situ measurement, no validated terrain, plan v1. Uncertainty is at its highest.',
    state: SOL1_STATE
  },
  {
    id: 'sol3',
    label: 'Sol 3 — Early ops',
    summary: 'Two EVAs debriefed: first in-situ measurements, a soft-soil report that moved a route, POI-4 promoted, Sol 3 plan at v2.',
    state: SOL3_STATE
  },
  {
    id: 'sol20',
    label: 'Sol 20 — Advanced ops',
    summary: '16 EVAs: route history, terrain validated in situ, follow-up targets, two SEP events, one astronaut out of dose budget.',
    state: SOL20_STATE
  }
];

export const scenarioById = (id: string) => SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];

/** A fresh copy of a scenario seed. */
export const scenarioState = (id: string): PlannerState => JSON.parse(JSON.stringify(scenarioById(id).state));
