import { useEffect, useState } from 'react';
import { APPROVER, SEED_STATE, applyDebrief, missionVersion, newMissionId, nextPoiId, planFor } from './model.ts';
import { marsLmst } from './analysis.ts';
import type { DailyMission, Debrief, FieldEvent, LogEntry, PlannerState, Poi, Priority, ReplanSuggestion, Role } from './model.ts';

// Versioned key: bump it whenever the saved shape or the seed changes, so an old state
// left in the browser can never leak into the demo.
const STORAGE_KEY = 'syncrowalk-planner-v2';
const OLD_STORAGE_KEYS = ['syncrowalk-planner-v1'];

const load = (): PlannerState => {
  try {
    OLD_STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.pois) && Array.isArray(parsed?.missions)) {
        // Older saved states lack newer fields: take them from the seed
        return { ...SEED_STATE, ...parsed };
      }
    }
  } catch {
    /* storage unavailable or corrupted: fall back to seed */
  }
  return SEED_STATE;
};

// One more line in the mission log (newest last)
const withLog = (s: PlannerState, entry: Omit<LogEntry, 'id' | 'ts'> & { ts?: string }): LogEntry[] => [
  ...s.log,
  { ts: `Sol ${s.todaySol} · ${marsLmst()} LST`, ...entry, id: `LOG-${String(entry.sol).padStart(3, '0')}-${s.log.length + 1}` }
];

// A NO-GO plan can never reach the astronauts
const isNoGo = (s: PlannerState, m: DailyMission) => m.poiIds.length > 0 && planFor(s, m).evaluation.overall === 'violated';

// A sent mission that gets edited must be re-sent to the astronauts
const markChanged = (m: DailyMission): DailyMission =>
  m.status === 'sent' ? { ...m, status: 'changed' } : m;

export type NewPoi = Pick<
  Poi,
  'name' | 'lat' | 'lon' | 'interestType' | 'infoToCollect' | 'samplesRequired' | 'sampleNotes'
> & { fromFieldEventId?: string };

export function usePlannerStore() {
  const [state, setState] = useState<PlannerState>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable */
    }
  }, [state]);

  // Missions that contain a POI become "changed" when that POI changes
  const touchMissionsWith = (missions: DailyMission[], poiId: string) =>
    missions.map((m) => (m.poiIds.includes(poiId) ? markChanged(m) : m));

  const actions = {
    // ── Scientist ──────────────────────────────────────────────────────────
    addPoi(data: NewPoi): string {
      const id = nextPoiId(state.pois);
      setState((s) => ({
        ...s,
        pois: [...s.pois, { ...data, id, priority: null, instruments: [], durationMin: 30 }]
      }));
      return id;
    },
    updatePoiDefinition(id: string, data: NewPoi) {
      setState((s) => ({
        ...s,
        pois: s.pois.map((p) => (p.id === id ? { ...p, ...data } : p)),
        missions: touchMissionsWith(s.missions, id)
      }));
    },
    deletePoi(id: string) {
      setState((s) => ({
        ...s,
        pois: s.pois.filter((p) => p.id !== id),
        missions: s.missions.map((m) =>
          m.poiIds.includes(id) ? markChanged({ ...m, poiIds: m.poiIds.filter((x) => x !== id) }) : m
        )
      }));
    },

    // ── Mission control: POIs ──────────────────────────────────────────────
    setPriority(id: string, priority: Priority | null) {
      setState((s) => ({ ...s, pois: s.pois.map((p) => (p.id === id ? { ...p, priority } : p)) }));
    },
    toggleInstrument(id: string, instrumentId: string) {
      setState((s) => ({
        ...s,
        pois: s.pois.map((p) =>
          p.id === id
            ? {
                ...p,
                instruments: p.instruments.includes(instrumentId)
                  ? p.instruments.filter((i) => i !== instrumentId)
                  : [...p.instruments, instrumentId]
              }
            : p
        ),
        missions: touchMissionsWith(s.missions, id)
      }));
    },
    setDuration(id: string, durationMin: number) {
      setState((s) => ({
        ...s,
        pois: s.pois.map((p) => (p.id === id ? { ...p, durationMin } : p)),
        missions: touchMissionsWith(s.missions, id)
      }));
    },

    // ── Mission control: daily missions ────────────────────────────────────
    addMission(): string {
      const id = newMissionId();
      const usedSols = new Set(state.missions.map((m) => m.sol));
      let sol = state.todaySol;
      while (usedSols.has(sol)) sol++;
      setState((s) => ({
        ...s,
        missions: [...s.missions, { id, sol, startTime: '09:30', poiIds: [], extraEquipment: [], status: 'draft', version: 1 }]
      }));
      return id;
    },
    updateMission(id: string, patch: Partial<Omit<DailyMission, 'id' | 'status'>>) {
      setState((s) => ({
        ...s,
        missions: s.missions.map((m) => (m.id === id ? markChanged({ ...m, ...patch }) : m))
      }));
    },
    deleteMission(id: string) {
      setState((s) => ({ ...s, missions: s.missions.filter((m) => m.id !== id) }));
    },
    sendMission(id: string) {
      setState((s) => {
        const m = s.missions.find((x) => x.id === id);
        if (!m || isNoGo(s, m)) return s;
        return {
          ...s,
          missions: s.missions.map((x) => (x.id === id ? { ...x, status: 'sent', approvedBy: APPROVER } : x)),
          log: withLog(s, {
            sol: m.sol,
            type: m.replan && m.replan.toVersion === missionVersion(m) ? 'replan' : 'science',
            planVersion: `v${missionVersion(m)}`,
            evidence: m.replan && m.replan.toVersion === missionVersion(m) ? m.replan.reason : 'Constraints met (GO)',
            decision: `Sol ${m.sol} plan v${missionVersion(m)} approved: ${m.poiIds.join(' → ') || 'no stops'}`,
            approvedBy: APPROVER,
            outcome: 'Sent to the crew'
          })
        };
      });
    },
    // NO-GO → replan: saves the suggested plan as a new version (it still needs approval)
    applyReplan(id: string, r: ReplanSuggestion) {
      setState((s) => {
        const m = s.missions.find((x) => x.id === id);
        if (!m) return s;
        const { mission: next, ok: _ok, ...record } = r;
        const ts = `Sol ${s.todaySol} · ${marsLmst()} LST`;
        return {
          ...s,
          missions: s.missions.map((x) =>
            x.id === id
              ? { ...next, id, version: r.toVersion, approvedBy: undefined, status: m.status === 'draft' ? 'draft' : 'changed', replan: { ...record, ts } }
              : x
          ),
          log: withLog(s, {
            sol: m.sol,
            ts,
            type: s.sepAlert && m.sol === s.todaySol ? 'safety' : 'replan',
            planVersion: `v${r.fromVersion} → v${r.toVersion}`,
            evidence: `Plan v${r.fromVersion} NO-GO: ${r.reason}`,
            decision: r.steps.map((st) => st.text).join(' · '),
            approvedBy: 'Pending approval',
            outcome: `Plan v${r.toVersion} ${r.after.overall === 'violated' ? 'still NO-GO' : 'GO'}: ${r.after.poiIds.join(' → ')}, ${r.after.durationMin} min`
          })
        };
      });
    },
    setSepAlert(on: boolean) {
      setState((s) => ({
        ...s,
        sepAlert: on,
        log: withLog(s, {
          sol: s.todaySol,
          type: 'safety',
          planVersion: '—',
          evidence: on ? 'DONKI SEP alert (scripted): proton flux above 35 pfu expected' : 'DONKI: SEP alert cleared',
          decision: on ? 'Pre-authorised SEP rule in force: EVA ≤ 150 min, ≤ 25 min from a shelter, route via a field shelter' : 'Nominal EVA rules restored',
          approvedBy: 'Rad Safety Officer K. Chen',
          outcome: on ? 'Sol plans re-evaluated' : 'Sol plans re-evaluated'
        })
      }));
    },
    sendAllMissions(): number {
      const pending = state.missions.filter((m) => m.status !== 'sent' && !isNoGo(state, m)).length;
      setState((s) => ({
        ...s,
        missions: s.missions.map((m) => (m.status === 'sent' || isNoGo(s, m) ? m : { ...m, status: 'sent', approvedBy: APPROVER }))
      }));
      return pending;
    },

    // ── Astronaut ──────────────────────────────────────────────────────────
    togglePacked(missionId: string, item: string) {
      setState((s) => {
        const cur = s.packed[missionId] ?? [];
        return {
          ...s,
          packed: {
            ...s.packed,
            [missionId]: cur.includes(item) ? cur.filter((x) => x !== item) : [...cur, item]
          }
        };
      });
    },

    // Anomaly report from the field: becomes a discovery for the scientist and slows the route model
    addFieldEvent(fe: FieldEvent) {
      setState((s) => ({ ...s, fieldEvents: [...s.fieldEvents, fe] }));
    },
    toggleMeasured(poiId: string) {
      setState((s) => ({
        ...s,
        measured: s.measured.includes(poiId) ? s.measured.filter((x) => x !== poiId) : [...s.measured, poiId]
      }));
    },

    // Post-EVA debrief: observations → Scientist, trafficability → route model, dose → crew, log + notices
    submitDebrief(d: Debrief) {
      setState((s) => applyDebrief(s, d));
    },
    dismissNotice(id: string, role: Role) {
      setState((s) => ({
        ...s,
        notices: s.notices.map((n) => (n.id === id && !n.seenBy.includes(role) ? { ...n, seenBy: [...n.seenBy, role] } : n))
      }));
    },

    resetDemoData() {
      setState(SEED_STATE);
    }
  };

  return { state, ...actions };
}

export type PlannerStore = ReturnType<typeof usePlannerStore>;
