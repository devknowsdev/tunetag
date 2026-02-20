import { useState } from 'react';
import type { TrackAnnotation, Phase, TemplateState, TimelineEntry, MarkEntryDraft } from '../types';
import { GLOBAL_CATEGORIES } from '../lib/schema';
import { lintAnnotation } from '../lib/lintAnnotation';
import { exportAnnotationsToExcel, downloadBlob } from '../lib/excelExport';
import { LintPanel } from './LintPanel';

interface Props {
  annotation: TrackAnnotation;
  allAnnotations: Record<number, TrackAnnotation>;
  templateState: TemplateState;
  setPhase: (p: Phase) => void;
  setActiveTrackId: (id: number | null) => void;
  setMarkEntryDraft: (d: MarkEntryDraft | null) => void;
  setGlobalCategoryIndex: (i: number) => void;
  setGlobalOnSummary: (v: boolean) => void;
  annotator: string;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

export function PhaseReview({
  annotation,
  allAnnotations,
  templateState,
  setPhase,
  setActiveTrackId,
  setMarkEntryDraft,
  setGlobalCategoryIndex,
  setGlobalOnSummary,
  annotator,
}: Props) {
  const track = annotation.track;
  const global = annotation.global as Record<string, string>;
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const lintResult = lintAnnotation(annotation);

  // Canonical order (chronological) for review display
  const sortedTimeline = [...annotation.timeline].sort((a, b) => {
    function parseToSeconds(mss: string): number {
      const match = mss.match(/^(\d+):([0-5]\d)$/);
      if (!match) return Number.MAX_SAFE_INTEGER;
      return parseInt(match[1]) * 60 + parseInt(match[2]);
    }
    return parseToSeconds(a.timestamp) - parseToSeconds(b.timestamp);
  });

  async function doExport(annotations: TrackAnnotation[]) {
    if (templateState.status !== 'ready') return;
    setExporting(true);
    setExportError(null);
    try {
      const blob = await exportAnnotationsToExcel(
        templateState.buffer,
        annotations
      );
      downloadBlob(blob, annotator || 'annotator');
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : 'Export failed — please try again'
      );
    } finally {
      setExporting(false);
    }
  }

  function handleExportThis() {
    doExport([annotation]);
  }

  function handleExportAll() {
    const completed = Object.values(allAnnotations).filter(
      (a) => a.status === 'complete' || a.status === 'skipped'
    );
    doExport(completed);
  }

  // FIX #4: set phase to 'mark_entry' (not 'listening') after setting the draft
  function handleEditEntry(entry: TimelineEntry) {
    setMarkEntryDraft({
      mode: 'edit',
      entryId: entry.id,
      timestamp: entry.timestamp,
      sectionType: entry.sectionType,
      narrative: entry.narrative,
      narrativeRaw: entry.narrativeRaw,
      tags: entry.tags,
      wasTimerRunning: false, // timer is not running during review
    });
    setPhase('mark_entry');
  }

  function handleEditCategory(i: number) {
    setGlobalCategoryIndex(i);
    setGlobalOnSummary(false);
    setPhase('global');
  }

  const templateReady = templateState.status === 'ready';

  return (
    <div className="phase-container fade-in">
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <p className="label" style={{ color: 'var(--amber)', marginBottom: '0.375rem' }}>
          TRACK {track.id} — REVIEW
        </p>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: '1.5rem',
            margin: '0 0 0.25rem',
          }}
        >
          {track.name}
        </h2>
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>{track.artist}</p>
        <p style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', marginTop: '0.375rem' }}>
          Annotated by {annotation.annotator} · {formatElapsed(annotation.elapsedSeconds ?? 0)}
        </p>
      </div>

      {/* Timeline */}
      <div style={{ marginBottom: '1.5rem' }}>
        <p className="label" style={{ marginBottom: '0.75rem' }}>
          PART 1 — TIMELINE ({sortedTimeline.length} sections)
        </p>
        {sortedTimeline.map((entry, i) => (
          <div key={entry.id} className="review-entry">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="timestamp-label">{entry.timestamp}</span>
                <span style={{ marginLeft: '0.625rem', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  {entry.sectionType}
                </span>
              </div>
              <button className="btn-link" style={{ fontSize: '0.75rem' }} onClick={() => handleEditEntry(entry)}>
                Edit
              </button>
            </div>
            <p style={{ margin: '0.375rem 0 0.25rem', fontFamily: 'var(--font-serif)', fontSize: '0.9375rem', color: 'var(--text)', lineHeight: 1.6 }}>
              {entry.narrative}
            </p>
            {entry.tags && (
              <p style={{ margin: 0, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                {entry.tags}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Global analysis */}
      <div style={{ marginBottom: '1.5rem' }}>
        <p className="label" style={{ marginBottom: '0.75rem' }}>PART 2 — GLOBAL ANALYSIS</p>
        {GLOBAL_CATEGORIES.map((cat, i) => (
          <div key={cat.key} className="review-entry">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <p className="label" style={{ marginBottom: '0.25rem', fontSize: '0.6875rem' }}>
                {cat.displayLabel}
              </p>
              <button className="btn-link" style={{ fontSize: '0.75rem' }} onClick={() => handleEditCategory(i)}>
                Edit
              </button>
            </div>
            <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: '0.9375rem', color: global[cat.key] ? 'var(--text)' : 'var(--text-dim)' }}>
              {global[cat.key] || '—'}
            </p>
          </div>
        ))}
      </div>

      {/* Lint panel + export */}
      <div style={{ marginBottom: '1.5rem' }}>
        <p className="label" style={{ marginBottom: '0.75rem' }}>QUALITY CHECK</p>
        <LintPanel
          result={lintResult}
          onNavigate={(phase) => setPhase(phase)}
          onExport={handleExportThis}
          exporting={exporting}
        />
      </div>

      {/* Additional export buttons */}
      {templateReady ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <button
            className="btn-ghost"
            disabled={!lintResult.canExport || exporting}
            onClick={handleExportThis}
          >
            ⬇ Download workbook (this track filled)
          </button>
          <button
            className="btn-ghost"
            disabled={exporting}
            onClick={handleExportAll}
          >
            ⬇ Download workbook (all completed tracks)
          </button>
        </div>
      ) : (
        <div className="notice-error" style={{ marginBottom: '1.5rem' }}>
          Template not loaded — export unavailable. Refresh the page to reload it.
        </div>
      )}

      {exportError && (
        <p style={{ color: 'var(--error)', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', marginBottom: '1rem' }}>
          Export error: {exportError}
        </p>
      )}

      {/* Next track */}
      <button
        className="btn-ghost"
        style={{ width: '100%' }}
        onClick={() => {
          setActiveTrackId(null);
          setPhase('select');
        }}
      >
        → NEXT TRACK
      </button>
    </div>
  );
}
