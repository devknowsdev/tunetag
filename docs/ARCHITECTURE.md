# BeatPulse — Architecture Reference

## Overview
BeatPulse is a single-page React application for annotating music tracks.
It runs entirely in the browser. There is no backend, no database, no server.
Data persists in localStorage. Exports are generated client-side using ExcelJS.

## Tech Stack
| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build tool | Vite 5 |
| Excel export | ExcelJS 4 |
| ID generation | uuid v9 |
| Fonts | JetBrains Mono, Playfair Display, Georgia |
| Storage | localStorage (autosave), sessionStorage (API key) |

## Directory Structure
```
beatpulse-annotator/
├── public/
│   └── template.xlsx              # Excel template — track data is stamped into this
├── scripts/
│   └── validateExport.ts          # Standalone export validation (run with tsx)
├── docs/
│   ├── ARCHITECTURE.md            # This file
│   └── DESIGNER_HANDOFF.md        # Visual design + component inventory
├── src/
│   ├── App.tsx                    # Root: timer, phase routing, resume banner, help modal
│   ├── main.tsx                   # React DOM mount
│   ├── index.css                  # All styles — CSS variables + component classes
│   ├── types/
│   │   └── index.ts               # All TypeScript interfaces and types
│   ├── hooks/
│   │   ├── useAnnotationState.ts  # All app state: annotations, phase, autosave
│   │   ├── useTimer.ts            # Single timer instance (lives in App only)
│   │   └── useKeyboardShortcuts.ts
│   ├── lib/
│   │   ├── schema.ts              # Track definitions, categories, section types, tags
│   │   ├── excelExport.ts         # ExcelJS write logic — stamps template with annotation data
│   │   ├── lintAnnotation.ts      # Pre-export validation — returns issues + canExport flag
│   │   └── polishText.ts          # OpenAI API call for narrative polish
│   └── components/
│       ├── ApiKeyGate.tsx         # Collects OpenAI key once per session (sessionStorage)
│       ├── PhaseSelect.tsx        # Track picker with status badges
│       ├── PhaseReady.tsx         # Pre-listen confirmation + annotator name
│       ├── PhaseListening.tsx     # Timer + mark + dictation + timeline display
│       ├── PhaseMarkEntry.tsx     # Section editor (fixed overlay on top of Listening)
│       ├── PhaseGlobal.tsx        # 9-category global analysis, one at a time
│       ├── PhaseReview.tsx        # Full read-through, quality check, export
│       ├── LintPanel.tsx          # Renders lint issues with navigate-to-fix links
│       └── HowToUse.tsx           # In-app instructions modal (opened via "?" button)
```

## State Architecture

### AppState — the single source of truth (persisted to localStorage)
```typescript
interface AppState {
  annotations: Record<number, TrackAnnotation>; // keyed by track id
  activeTrackId: number | null;
  phase: Phase;
  markEntryDraft: MarkEntryDraft | null;
  globalCategoryIndex: number;
  globalOnSummary: boolean;
  timerRunning: boolean;
}
```

### TrackAnnotation — per-track state (nested in AppState.annotations)
```typescript
interface TrackAnnotation {
  track: Track;
  annotator: string;
  timeline: TimelineEntry[];       // up to 10 entries (MAX_TIMELINE_ROWS)
  global: Partial<GlobalAnalysis>; // 9 categories
  status: 'not_started' | 'in_progress' | 'complete' | 'skipped';
  elapsedSeconds: number;          // updated on every timer tick
  resumePhase?: Phase;             // set by setPhase(), used by PhaseSelect for exact resume
  startedAt?: number;
  completedAt?: number;
  lastSavedAt?: number;
  skipReason?: string;
}
```

### Phase machine
```
select ──→ ready ──→ listening ⇄ mark_entry
                          │
                          ↓
                       global ──→ review ──→ select
```
Rules:
- Only one phase renders at a time — except `listening` + `mark_entry` co-render
  (mark_entry is a fixed overlay; listening stays mounted to preserve scroll)
- `isActive={phase === 'listening'}` prop gates keyboard shortcuts and handlers
  in PhaseListening while mark_entry is open
- Phase is persisted in AppState; `resumePhase` is persisted per-track

### Timer — single instance at App level
- `useTimer` lives **only** in App.tsx
- Props thread down to PhaseListening: `elapsedSeconds`, `isTimerRunning`, `timerStart`, `timerPause`
- Timer ticks → `updateElapsedSeconds(id, secs)` → persisted to `TrackAnnotation.elapsedSeconds`
- `timerStart()` / `timerPause()` wrappers keep `timer.*` and `state.timerRunning` in sync
- On track/phase change: a `useEffect` keyed on `[state.activeTrackId, state.phase, state.timerRunning]`
  rehydrates `elapsedSeconds` from persisted state and aligns running/paused status

### Autosave
- Every `setAppState` call triggers a debounced (500ms) localStorage write
- Immediate flush registered on: `pagehide`, `beforeunload`, and hook unmount
- On app load: if saved state found, resume banner is shown
- `resumeSavedState()` returns the snapshot **synchronously** so the timer can be
  restored in the same event handler (before React re-render propagates)

---

## Data Flows

### Mark Entry (manual)
```
User presses M or taps MARK THIS MOMENT
  ↓
handleMark() in PhaseListening
  - guards: isActive, dictation idle, not at cap
  - captures wasTimerRunning = isTimerRunning (BEFORE pause)
  - calls timerPause()
  - calls setMarkEntryDraft({ mode:'new', timestamp, wasTimerRunning, ... })
  - calls setPhase('mark_entry')
  ↓
PhaseMarkEntry renders as overlay
  User fills: section type, narrative, tags
  Optional: AI polish (calls OpenAI via polishText.ts)
  ↓
Save: updateTimeline() appends/replaces entry → setPhase('listening')
  PhaseMarkEntry calls onTimerResume() if draft.wasTimerRunning was true
```

### Dictation flow
```
User taps 🎙 Dictate
  ↓
handleDictateClick() in PhaseListening
  - guards: isActive, not at cap, dictation idle
  - captures wasRunning = isTimerRunning (BEFORE pause)
  - calls timerPause()
  - calls dictation.begin(timestamp, wasRunning)
  ↓
DictationState: 'awaiting_manual_pause'
  User pauses Spotify manually → taps Start Recording
  ↓
DictationState: 'recording'
  Web Speech API streams transcript via recognitionRef (SpeechRecognitionCtor)
  Cleaned up on unmount via useEffect return
  ↓
DictationState: 'done'
  User reviews transcript → taps Use Transcript
  ↓
dictation.accept() → onComplete callback
  → setMarkEntryDraft({ narrative: transcript, wasTimerRunning: capturedWasRunning, isDictated: true })
  → setPhase('mark_entry')
  User edits/polishes before saving
```

### Excel Export
```
User clicks Export in PhaseReview
  ↓
exportAnnotationsToExcel(templateBuffer, annotations[])
  - ExcelJS reads the ArrayBuffer of template.xlsx (fetched on app load)
  - For each TrackAnnotation:
    - Finds the named sheet (track.sheetName)
    - Writes annotator name to B2
    - Writes timeline entries from row 9 downward (max 10)
    - Writes global analysis to fixed cells
  ↓
downloadBlob(blob, annotatorName)
  - Triggers browser file download
  - Filename: {annotatorName}_{timestamp}.xlsx
```

### Validation (lintAnnotation)
- Runs in PhaseReview on every render (not persisted)
- Returns `{ issues: LintIssue[], canExport: boolean }`
- Checks: timeline entries have section type + narrative, global categories filled,
  no empty required fields
- Export button is disabled if `canExport === false`

---

## Key Design Decisions

| Decision | Reason |
|---|---|
| No router | Phase is pure state. URL routing adds complexity without benefit for a single-user local tool. |
| No Redux/Zustand | useAnnotationState is the complete state layer. Adding a store would be indirection without benefit. |
| No backend | All data is local. ExcelJS runs in the browser. No auth, no network dependency. |
| Timer lives in App | Prevents duplicate timers and stale-closure bugs. Props thread down. |
| co-render listening + mark_entry | Keeps PhaseListening mounted (preserves scroll), mark_entry is a visual overlay. |
| resumePhase per track | The app is always at phase='select' when PhaseSelect renders, so global phase can't be used to infer the prior in-progress phase. Per-track resumePhase solves this cleanly. |
| Synchronous resumeSavedState() | React state updates are async; reading the snapshot in the same event handler lets us restore timer values before re-render. |

---

## Adding Tracks
Edit `src/lib/schema.ts`, `TRACKS` array. Each entry:
```typescript
{
  id: 4,                                    // must be unique, sequential
  artist: 'Artist Name',
  name: 'Track Name',
  spotifyId: 'SPOTIFY_TRACK_ID',
  spotifyUrl: 'https://open.spotify.com/track/SPOTIFY_TRACK_ID',
  sheetName: 'Track 4',                     // must match sheet name in template.xlsx
  audioLabel: 'Artist - Track (URL)',       // written to Excel
}
```
Also add the corresponding sheet to `template.xlsx` before building.

---

## Environment
- No `.env` required for core functionality
- OpenAI API key is collected at runtime via ApiKeyGate, stored in `sessionStorage`
- No build-time secrets

## Browser requirements
- Chrome or Edge recommended (Web Speech API for dictation)
- Firefox: all features except dictation
- Safari: untested
- localStorage must be available (private browsing may disable it)
