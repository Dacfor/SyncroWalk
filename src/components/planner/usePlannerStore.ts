import { useEffect, useState } from 'react';
import { SEED_STATE, newMissionId, nextPoiId, TODAY_SOL } from './model.ts';
import type { DailyMission, FieldEvent, PlannerState, Poi, Priority } from './model.ts';

const STORAGE_KEY = 'syncrowalk-planner-v1';

const load = (): PlannerState => {
  try {
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
      let sol = TODAY_SOL;
      while (usedSols.has(sol)) sol++;
      setState((s) => ({
        ...s,
        missions: [...s.missions, { id, sol, startTime: '09:30', poiIds: [], extraEquipment: [], status: 'draft' }]
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
      setState((s) => ({ ...s, missions: s.missions.map((m) => (m.id === id ? { ...m, status: 'sent' } : m)) }));
    },
    setSepAlert(on: boolean) {
      setState((s) => ({ ...s, sepAlert: on }));
    },
    sendAllMissions(): number {
      const pending = state.missions.filter((m) => m.status !== 'sent').length;
      setState((s) => ({ ...s, missions: s.missions.map((m) => ({ ...m, status: 'sent' })) }));
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

    resetDemoData() {
      setState(SEED_STATE);
    }
  };

  return { state, ...actions };
}

export type PlannerStore = ReturnType<typeof usePlannerStore>;
