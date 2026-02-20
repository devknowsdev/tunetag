import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  AppState,
  TrackAnnotation,
  Phase,
  MarkEntryDraft,
  GlobalAnalysis,
  TimelineEntry,
} from '../types';
import { TRACKS } from '../lib/schema';

const STORAGE_KEY = 'beatpulse_v1';
const ANNOTATOR_KEY = 'beatpulse_annotator';
const AUTOSAVE_DEBOUNCE_MS = 500;

function makeEmptyAnnotation(trackId: number, annotator: string): TrackAnnotation {
  const track = TRACKS.find((t) => t.id === trackId)!;
  return {
    track,
    annotator,
    timeline: [],
    global: {},
    status: 'not_started',
    elapsedSeconds: 0,
  };
}

function makeDefaultAppState(): AppState {
  const annotator = localStorage.getItem(ANNOTATOR_KEY) ?? '';
  return {
    annotations: {
      1: makeEmptyAnnotation(1, annotator),
      2: makeEmptyAnnotation(2, annotator),
      3: makeEmptyAnnotation(3, annotator),
    },
    activeTrackId: null,
    phase: 'select',
    markEntryDraft: null,
    globalCategoryIndex: 0,
    globalOnSummary: false,
    timerRunning: false,
  };
}

function loadSavedState(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppState;
  } catch {
    return null;
  }
}

export interface UseAnnotationStateReturn {
  appState: AppState;
  hasSavedState: boolean;
  // FIX #2: returns the saved snapshot so the caller can read timer values
  // synchronously in the same event handler, before React re-render propagates.
  resumeSavedState: () => AppState | null;
  discardSavedState: () => void;

  annotations: Record<number, TrackAnnotation>;
  activeTrackId: number | null;
  setActiveTrackId: (id: number | null) => void;

  phase: Phase;
  setPhase: (p: Phase) => void;

  markEntryDraft: MarkEntryDraft | null;
  setMarkEntryDraft: (d: MarkEntryDraft | null) => void;

  globalCategoryIndex: number;
  setGlobalCategoryIndex: (i: number) => void;

  globalOnSummary: boolean;
  setGlobalOnSummary: (v: boolean) => void;

  timerRunning: boolean;
  setTimerRunning: (v: boolean) => void;

  annotator: string;
  setAnnotator: (name: string) => void;

  updateTimeline: (trackId: number, entries: TimelineEntry[]) => void;
  updateGlobal: (trackId: number, global: Partial<GlobalAnalysis>) => void;
  setStatus: (
    trackId: number,
    status: TrackAnnotation['status'],
    extra?: Partial<TrackAnnotation>
  ) => void;
  updateElapsedSeconds: (trackId: number, seconds: number) => void;
  resetTrack: (trackId: number) => void;
}

export function useAnnotationState(): UseAnnotationStateReturn {
  const [appState, setAppStateRaw] = useState<AppState>(makeDefaultAppState);
  const [hasSavedState, setHasSavedState] = useState<boolean>(false);
  const savedOnLoad = useRef<AppState | null>(null);

  useEffect(() => {
    const saved = loadSavedState();
    if (saved) {
      savedOnLoad.current = saved;
      setHasSavedState(true);
    }
  }, []);

  // Debounced autosave — keep a ref to the latest pending state so we can
  // flush it immediately on page unload (FIX #10).
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSave = useRef<AppState | null>(null);

  const persistState = useCallback((state: AppState) => {
    pendingSave.current = state;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        pendingSave.current = null;
      } catch {
        // Storage quota exceeded — swallow silently
      }
    }, AUTOSAVE_DEBOUNCE_MS);
  }, []);

  // FIX #10: flush pending save on tab close / page navigation / unmount
  useEffect(() => {
    function flushSave() {
      if (pendingSave.current) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingSave.current));
          pendingSave.current = null;
        } catch {
          // swallow
        }
      }
    }
    window.addEventListener('pagehide', flushSave);
    window.addEventListener('beforeunload', flushSave);
    return () => {
      window.removeEventListener('pagehide', flushSave);
      window.removeEventListener('beforeunload', flushSave);
      flushSave(); // also flush on component unmount (e.g. HMR reloads)
    };
  }, []);

  const setAppState = useCallback(
    (updater: AppState | ((prev: AppState) => AppState)) => {
      setAppStateRaw((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        persistState(next);
        return next;
      });
    },
    [persistState]
  );

  // FIX #2: return the saved snapshot so the caller can read timer-related
  // values (elapsedSeconds, timerRunning) synchronously in the same event
  // handler, without waiting for a React re-render.
  const resumeSavedState = useCallback((): AppState | null => {
    const snapshot = savedOnLoad.current;
    if (snapshot) {
      setAppStateRaw(snapshot);
      setHasSavedState(false);
      savedOnLoad.current = null;
      return snapshot;
    }
    return null;
  }, []);

  const discardSavedState = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHasSavedState(false);
    savedOnLoad.current = null;
  }, []);

  const setActiveTrackId = useCallback(
    (id: number | null) => setAppState((p) => ({ ...p, activeTrackId: id })),
    [setAppState]
  );

  const setPhase = useCallback(
    (phase: Phase) =>
      setAppState((p) => {
        // Persist resumePhase on the active track so PhaseSelect can restore it.
        // Only record non-select phases (there's no point resuming to 'select').
        if (phase !== 'select' && p.activeTrackId !== null) {
          const ann = p.annotations[p.activeTrackId];
          if (ann) {
            return {
              ...p,
              phase,
              annotations: {
                ...p.annotations,
                [p.activeTrackId]: { ...ann, resumePhase: phase },
              },
            };
          }
        }
        return { ...p, phase };
      }),
    [setAppState]
  );

  const setMarkEntryDraft = useCallback(
    (draft: MarkEntryDraft | null) =>
      setAppState((p) => ({ ...p, markEntryDraft: draft })),
    [setAppState]
  );

  const setGlobalCategoryIndex = useCallback(
    (i: number) => setAppState((p) => ({ ...p, globalCategoryIndex: i })),
    [setAppState]
  );

  const setGlobalOnSummary = useCallback(
    (v: boolean) => setAppState((p) => ({ ...p, globalOnSummary: v })),
    [setAppState]
  );

  const setTimerRunning = useCallback(
    (v: boolean) => setAppState((p) => ({ ...p, timerRunning: v })),
    [setAppState]
  );

  // FIX: setAnnotator updates both the separate persisted key AND all track
  // annotations, so B2 always reflects the current annotator name on export.
  const setAnnotator = useCallback(
    (name: string) => {
      localStorage.setItem(ANNOTATOR_KEY, name);
      setAppState((p) => {
        const annotations = { ...p.annotations };
        for (const id of Object.keys(annotations)) {
          const ann = annotations[Number(id)];
          annotations[Number(id)] = { ...ann, annotator: name };
        }
        return { ...p, annotations };
      });
    },
    [setAppState]
  );

  const updateTimeline = useCallback(
    (trackId: number, entries: TimelineEntry[]) => {
      setAppState((p) => ({
        ...p,
        annotations: {
          ...p.annotations,
          [trackId]: {
            ...p.annotations[trackId],
            timeline: entries,
            status:
              p.annotations[trackId].status === 'not_started'
                ? 'in_progress'
                : p.annotations[trackId].status,
          },
        },
      }));
    },
    [setAppState]
  );

  const updateGlobal = useCallback(
    (trackId: number, global: Partial<GlobalAnalysis>) => {
      setAppState((p) => ({
        ...p,
        annotations: {
          ...p.annotations,
          [trackId]: { ...p.annotations[trackId], global },
        },
      }));
    },
    [setAppState]
  );

  const setStatus = useCallback(
    (
      trackId: number,
      status: TrackAnnotation['status'],
      extra: Partial<TrackAnnotation> = {}
    ) => {
      setAppState((p) => ({
        ...p,
        annotations: {
          ...p.annotations,
          [trackId]: { ...p.annotations[trackId], status, ...extra },
        },
      }));
    },
    [setAppState]
  );

  // FIX: elapsedSeconds written back to TrackAnnotation on every timer tick
  const updateElapsedSeconds = useCallback(
    (trackId: number, seconds: number) => {
      setAppState((p) => ({
        ...p,
        annotations: {
          ...p.annotations,
          [trackId]: { ...p.annotations[trackId], elapsedSeconds: seconds },
        },
      }));
    },
    [setAppState]
  );

  const resetTrack = useCallback(
    (trackId: number) => {
      const annotator = localStorage.getItem(ANNOTATOR_KEY) ?? '';
      setAppState((p) => ({
        ...p,
        annotations: {
          ...p.annotations,
          [trackId]: makeEmptyAnnotation(trackId, annotator),
        },
        markEntryDraft: null,
        globalCategoryIndex: 0,
        globalOnSummary: false,
        phase: 'ready',
        timerRunning: false,
      }));
    },
    [setAppState]
  );

  const annotator =
    appState.activeTrackId !== null
      ? appState.annotations[appState.activeTrackId]?.annotator ?? ''
      : localStorage.getItem(ANNOTATOR_KEY) ?? '';

  return {
    appState,
    hasSavedState,
    resumeSavedState,
    discardSavedState,
    annotations: appState.annotations,
    activeTrackId: appState.activeTrackId,
    setActiveTrackId,
    phase: appState.phase,
    setPhase,
    markEntryDraft: appState.markEntryDraft,
    setMarkEntryDraft,
    globalCategoryIndex: appState.globalCategoryIndex,
    setGlobalCategoryIndex,
    globalOnSummary: appState.globalOnSummary,
    setGlobalOnSummary,
    timerRunning: appState.timerRunning,
    setTimerRunning,
    annotator,
    setAnnotator,
    updateTimeline,
    updateGlobal,
    setStatus,
    updateElapsedSeconds,
    resetTrack,
  };
}
