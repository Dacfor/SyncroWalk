import { crewAssignment, planFor, suggestReplan } from './model.ts';
import { remainingEvasByDose, DEMO_ASSUMPTIONS } from './analysis.ts';
import type { PlannerState, Role } from './model.ts';
import type { PlannerStore } from './usePlannerStore.ts';
import { POI_6, SOL58_LAB_FE_ID, SOL58_MISSION_59, SOL58_MISSION_61, SOL58_NOTICE_ID } from './scenarios/sol58.ts';

// ═══════════════════════════════════════════════════════════════════════════════
// SCRIPTED DEMO "Sol 58 — End of campaign" (about 80 seconds, runs on its own).
// Every step calls the same store actions and view setters the buttons call, so what the
// video shows is exactly what a user can do by hand. Nothing here changes the model.
// ═══════════════════════════════════════════════════════════════════════════════

/** What a step can drive in the planner (the setters MissionPlanner already owns). */
export interface DemoCtx {
  store: PlannerStore;
  state: () => PlannerState;
  loadScenario: (id: string) => void;
  setRole: (role: Role) => void;
  setView: (role: Role, view: string) => void;
  selectMission: (id: string | null) => void;
  focusPoi: (poiId: string) => void;
  showFe: (feId: string | null) => void;
  setAstronautSol: (sol: number) => void;
  setBriefing: (open: boolean) => void;
  highlight: (pts: [number, number][] | null) => void;
}

export interface DemoStep {
  /** Seconds from the start of the demo */
  at: number;
  title: string;
  /** Caption shown under the map; reads the live state so the numbers always match the screen */
  caption: (s: PlannerState) => string;
  run: (ctx: DemoCtx) => void;
}

const hm = (min: number) => `${Math.floor(min / 60)} h ${String(Math.round(min % 60)).padStart(2, '0')}`;
const m59 = (s: PlannerState) => s.missions.find((m) => m.id === SOL58_MISSION_59);
const pairOf = (s: PlannerState) =>
  crewAssignment(s.crew, m59(s))
    .filter((c) => c.seatNow.startsWith('EV'))
    .map((c) => c.name.split(' ').slice(-1)[0]);
const violatedNames = (s: PlannerState) => {
  const m = m59(s);
  return m ? planFor(s, m).evaluation.rows.filter((r: { status: string }) => r.status === 'violated').map((r: { name: string }) => r.name) : [];
};

export const DEMO_SOL58_STEPS: DemoStep[] = [
  {
    at: 0,
    title: 'Sol 58',
    caption: () =>
      'Sol 58, end of the science campaign at Jezero. On Sol 41, EV1 and EV2 walked to POI-6 "Hogwallow Flats sulfate bench", a LOW-priority target, and collected sample SW-41-03.',
    run: (c) => {
      c.loadScenario('sol58');
      c.setRole('scientist');
      c.setView('scientist', 'list');
      setTimeout(() => c.focusPoi(POI_6.id), 400);
    }
  },
  {
    at: 7,
    title: 'Hub lab result',
    caption: () =>
      'This morning the hub lab finishes SW-41-03: sulfate 24 ± 2 wt% SO₃ against an orbital prior of 6 ± 5 wt% (+3.6σ), plus an organic-compound fluorescence signal. Possible evidence of past microbial habitability.',
    run: (c) => {
      c.setView('scientist', 'discoveries');
      c.showFe(SOL58_LAB_FE_ID);
    }
  },
  {
    at: 15,
    title: 'Science request',
    caption: () =>
      'The Scientist reviews the discovery and asks for POI-6 at HIGH priority on Sol 59, with an extended investigation: +90 minutes on site. It is not a new target, and no further EVA was planned there.',
    run: (c) => {
      c.store.dismissNotice(SOL58_NOTICE_ID, 'scientist');
      c.focusPoi(POI_6.id);
    }
  },
  {
    at: 22,
    title: 'Mission Control',
    caption: (s) => {
      const p = s.pois.find((x) => x.id === POI_6.id);
      return `Mission Control sets POI-6 to HIGH with ${p?.durationMin ?? 150} min on site and adds it to Sol 59. Plan v1, EV1 + EV2 to POI-8 for a short sampling, was already sent to the crew.`;
    },
    run: (c) => {
      c.setRole('control');
      c.store.dismissNotice(SOL58_NOTICE_ID, 'control');
      c.setView('control', 'pois');
      c.store.setPriority(POI_6.id, 'HIGH');
      c.store.setDuration(POI_6.id, 150);
      c.store.updateMission(SOL58_MISSION_59, { poiIds: ['POI-6', 'POI-8'] });
      c.focusPoi(POI_6.id);
    }
  },
  {
    at: 30,
    title: 'NO-GO',
    caption: (s) => {
      const v = violatedNames(s);
      return `With POI-6 added, plan v1 is NO-GO: ${v.length ? v.join(' · ') : 'constraints violated'}. A NO-GO plan can never reach the astronauts.`;
    },
    run: (c) => {
      c.selectMission(SOL58_MISSION_59);
      c.setView('control', 'route');
    }
  },
  {
    at: 37,
    title: 'Crew dose',
    caption: (s) => {
      const A = DEMO_ASSUMPTIONS;
      const row = (id: string) => {
        const m = s.crew.find((x) => x.id === id);
        if (!m) return '';
        const left = remainingEvasByDose(m.doseActualMsv, s.todaySol);
        return `${m.name.split(' ').slice(-1)[0]} ${m.doseActualMsv.toFixed(1)} mSv (${Math.round((m.doseActualMsv / A.crewSurfaceDoseBudgetMsv) * 100)} %, ${left} EVA${left === 1 ? '' : 's'} left)`;
      };
      return `Surface dose budget ${A.crewSurfaceDoseBudgetMsv} mSv each. ${row('CM1')} and ${row('CM2')} are not eligible. ${row('CM3')} and ${row('CM4')} are.`;
    },
    run: (c) => c.setView('control', 'crew')
  },
  {
    at: 44,
    title: 'Replan v2',
    caption: (s) => {
      const m = m59(s);
      if (!m) return '';
      const r = m.replan;
      const dropped = m.poiIds.includes('POI-8') ? '' : ` POI-8 is dropped from Sol 59: EVA ${r?.before.durationMin ?? '—'} → ${r?.after.durationMin ?? '—'} min.`;
      return `Suggested replan, plan v2: ${pairOf(s).join(' + ')} go out instead of ${(r?.before.pair ?? []).map((n) => n.split(' ').slice(-1)[0]).join(' + ')}, who have no dose budget left.${dropped}`;
    },
    run: (c) => {
      c.setView('control', 'route');
      const s = c.state();
      const m = m59(s);
      const r = m ? suggestReplan(s, m) : null;
      if (r) c.store.applyReplan(SOL58_MISSION_59, r);
    }
  },
  {
    at: 52,
    title: 'Plan v2 figures',
    caption: (s) => {
      const m = m59(s);
      if (!m) return '';
      const p = planFor(s, m);
      const x = p.metrics;
      const verdict = p.evaluation.overall === 'violated' ? 'NO-GO' : p.evaluation.overall === 'watch' ? 'GO with a WATCH' : 'GO';
      const moved = m.poiIds.includes('POI-8') ? '' : 'POI-8 moves to Sol 61. ';
      return `${moved}Plan v2: ${x.distanceKm.toFixed(1)} km on terrain validated in situ on Sol 41, EVA ${hm(x.evaDurationMin)}, egress ${m.startTime} LST, back at ${x.endLst} LST, return buffer ${x.bufferMin} min, suit reserve ${Math.round(x.consumablesRemainingPct)} %, dose +${x.doseEvaMsv.toFixed(2)} mSv each: ${verdict}.`;
    },
    run: (c) => {
      const s = c.state();
      const m = m59(s);
      const m61 = s.missions.find((x) => x.id === SOL58_MISSION_61);
      if (m && m61 && !m.poiIds.includes('POI-8') && !m61.poiIds.includes('POI-8')) {
        c.store.updateMission(SOL58_MISSION_61, { poiIds: [...m61.poiIds, 'POI-8'] });
      }
      if (m) {
        const pts = planFor(s, m).metrics.stops.map((st: { lat: number; lon: number }) => [st.lat, st.lon] as [number, number]);
        c.highlight(pts);
      }
    }
  },
  {
    at: 60,
    title: 'Approved and sent',
    caption: (s) => {
      const m = m59(s);
      const v = m?.version ?? 2;
      return `Plan v${v} is approved and sent to the hub. The mission log keeps the version, the evidence (lab result SW-41-03) and the decision, so every change is traceable.`;
    },
    run: (c) => {
      c.highlight(null);
      c.store.sendMission(SOL58_MISSION_59);
      c.setView('control', 'log');
    }
  },
  {
    at: 66,
    title: 'Astronaut briefing',
    caption: () =>
      'The astronauts open the Sol 59 briefing: what changed and why, the day figures, the timeline per stop, the turn-back time, the abort rules and the mandatory post-EVA debrief.',
    run: (c) => {
      c.setRole('astronaut');
      c.setAstronautSol(59);
      c.setView('astronaut', 'schedule');
      setTimeout(() => c.setBriefing(true), 600);
    }
  },
  {
    at: 74,
    title: 'EVA',
    caption: (s) => `EVA starts at ${m59(s)?.startTime ?? '09:30'} LST toward POI-6. The decision was taken next to the data, within the same sol.`,
    run: (c) => {
      c.setBriefing(false);
      c.setView('astronaut', 'schedule');
      setTimeout(() => c.focusPoi(POI_6.id), 300);
    }
  }
];

/** Total length of the scripted demo, in seconds (last step plus its reading time). */
export const DEMO_SOL58_SECONDS = 80;
