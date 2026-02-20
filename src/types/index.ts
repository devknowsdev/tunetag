export interface Track {
  id: number;
  artist: string;
  name: string;
  spotifyId: string;
  spotifyUrl: string;
  sheetName: string;
  audioLabel: string;
}

export interface TimelineEntry {
  id: string;
  timestamp: string;         // M:SS
  sectionType: string;
  narrative: string;
  narrativeRaw: string;
  tags: string;
  wasPolished: boolean;
  isDictated?: boolean;      // true if this entry came from voice dictation
}

export interface GlobalAnalysis {
  genre: string;
  instrumentation: string;
  mix: string;
  playing: string;
  vocals: string;
  emotion: string;
  lyrics: string;
  quality: string;
  wow: string;
}

export interface MarkEntryDraft {
  mode: 'new' | 'edit';
  entryId?: string;
  timestamp: string;
  sectionType: string;
  narrative: string;
  narrativeRaw: string;
  tags: string;
  wasTimerRunning: boolean;  // timer state BEFORE pause was triggered
  isDictated?: boolean;      // true if transcript came from voice dictation
  dictationTranscript?: string; // raw transcript before editing
}

export interface TrackAnnotation {
  track: Track;
  annotator: string;
  timeline: TimelineEntry[];
  global: Partial<GlobalAnalysis>;
  status: 'not_started' | 'in_progress' | 'complete' | 'skipped';
  skipReason?: string;
  startedAt?: number;
  completedAt?: number;
  elapsedSeconds: number;
  lastSavedAt?: number;
  resumePhase?: Phase;  // persisted so PhaseSelect can restore exact phase
}

export interface AppState {
  annotations: Record<number, TrackAnnotation>;
  activeTrackId: number | null;
  phase: Phase;
  markEntryDraft: MarkEntryDraft | null;
  globalCategoryIndex: number;
  globalOnSummary: boolean;
  timerRunning: boolean;
}

export type TemplateState =
  | { status: 'loading' }
  | { status: 'ready'; buffer: ArrayBuffer }
  | { status: 'failed'; error: string };

export type LintSeverity = 'error' | 'warning';

export interface LintIssue {
  field: string;
  severity: LintSeverity;
  message: string;
  phase?: Phase;  // optional: which phase to navigate to on "Fix this"
}

export interface LintResult {
  issues: LintIssue[];
  canExport: boolean;
}

export type Phase =
  | 'select'
  | 'ready'
  | 'listening'
  | 'mark_entry'
  | 'global'
  | 'review';

export interface CategoryDef {
  key: keyof GlobalAnalysis;
  excelLabel: string;
  displayLabel: string;
  guidance: string;
  suggestedTags?: string[];
  canBeNA: boolean;
}

// Dictation state (component-level, not persisted to AppState except via draft)
export type DictationStatus =
  | 'idle'
  | 'awaiting_manual_pause'  // prompt user to pause Spotify
  | 'recording'
  | 'transcribing'
  | 'done'
  | 'error';
