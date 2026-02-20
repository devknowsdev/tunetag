// FIX #6: wasPolished tracked locally, set true only when user accepts cleaned text.
// FIX #7: narrativeRaw is a one-time snapshot taken at mount; never overwritten on keystrokes.
import { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  TrackAnnotation,
  Phase,
  MarkEntryDraft,
  TimelineEntry,
} from '../types';
import {
  SECTION_TYPE_SHORTCUTS,
  TAG_SUGGESTIONS,
  NARRATIVE_PROMPTS_FIRST,
  NARRATIVE_PROMPTS_SUBSEQUENT,
} from '../lib/schema';
import { polishText, PolishUnavailableError } from '../lib/polishText';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

interface Props {
  annotation: TrackAnnotation;
  draft: MarkEntryDraft;
  setMarkEntryDraft: (d: MarkEntryDraft | null) => void;
  setPhase: (p: Phase) => void;
  updateTimeline: (trackId: number, entries: TimelineEntry[]) => void;
  onTimerResume: () => void;
  onTimerPause: () => void;
}

const TIMESTAMP_RE = /^\d+:[0-5]\d$/;

function parseToSeconds(mss: string): number {
  const match = mss.match(/^(\d+):([0-5]\d)$/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return parseInt(match[1]) * 60 + parseInt(match[2]);
}

function nudgeTimestamp(ts: string, deltaSec: number): string {
  const secs = parseToSeconds(ts);
  if (secs === Number.MAX_SAFE_INTEGER) return ts;
  const newSecs = Math.max(0, secs + deltaSec);
  const m = Math.floor(newSecs / 60);
  const s = newSecs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function PhaseMarkEntry({
  annotation,
  draft,
  setMarkEntryDraft,
  setPhase,
  updateTimeline,
  onTimerResume,
  onTimerPause,
}: Props) {
  const track = annotation.track;
  const timeline = annotation.timeline;

  const [timestamp, setTimestamp] = useState(draft.timestamp);
  const [tsEditing, setTsEditing] = useState(false);
  const [tsRaw, setTsRaw] = useState(draft.timestamp);
  const [sectionType, setSectionType] = useState(draft.sectionType);
  const [sectionTypeCustom, setSectionTypeCustom] = useState(
    SECTION_TYPE_SHORTCUTS.includes(draft.sectionType) ? '' : draft.sectionType
  );
  const [narrative, setNarrative] = useState(draft.narrative);
  const [tags, setTags] = useState(draft.tags);

  // FIX #7: narrativeRaw is captured ONCE at mount from the draft.
  // It must NOT be updated on keystrokes — it is the "rough baseline" snapshot.
  // For new entries: draft.narrativeRaw is '' or the initial dictated text.
  // For edits: draft.narrativeRaw is whatever was saved from the first time.
  // We store it in a ref so it never changes during this editor session.
  const narrativeRawRef = useRef<string>(draft.narrativeRaw || draft.narrative);

  // FIX #6: track whether the user accepted polished text this session.
  const [wasPolishedThisSession, setWasPolishedThisSession] = useState(false);

  // Polish state
  const [polishStatus, setPolishStatus] = useState<'idle' | 'loading' | 'ready'>('idle');
  const [polishedText, setPolishedText] = useState('');
  const [polishCooldown, setPolishCooldown] = useState(false);
  const [polishToast, setPolishToast] = useState<string | null>(null);

  // Sync relevant draft fields back to appState for autosave persistence
  // (narrative, sectionType, tags, timestamp changes should survive refresh).
  // We do NOT update narrativeRaw here — it's captured once at mount above.
  const syncDraft = useCallback(() => {
    setMarkEntryDraft({
      ...draft,
      timestamp,
      sectionType,
      narrative,
      // FIX #7: always persist the original rough snapshot, not the current narrative
      narrativeRaw: narrativeRawRef.current,
      tags,
    });
  }, [draft, timestamp, sectionType, narrative, tags, setMarkEntryDraft]);

  useEffect(() => { syncDraft(); }, [timestamp, sectionType, narrative, tags]);

  // On unmount: restore timer if it was running before this mark entry opened
  useEffect(() => {
    return () => {
      if (draft.wasTimerRunning) onTimerResume();
    };
  }, []); // intentional empty deps — run once on mount/unmount only

  // Previous section reference
  const prevEntry = (() => {
    if (draft.mode === 'edit' && draft.entryId) {
      const idx = timeline.findIndex((e) => e.id === draft.entryId);
      return idx > 0 ? timeline[idx - 1] : null;
    }
    return timeline.length > 0 ? timeline[timeline.length - 1] : null;
  })();

  const isFirstSection = !prevEntry;
  const narrativePrompts = isFirstSection ? NARRATIVE_PROMPTS_FIRST : NARRATIVE_PROMPTS_SUBSEQUENT;

  const timestampValid = TIMESTAMP_RE.test(timestamp);

  function handleTsBlur() {
    if (TIMESTAMP_RE.test(tsRaw)) setTimestamp(tsRaw);
    setTsEditing(false);
  }

  function nudge(delta: number) {
    const nudged = nudgeTimestamp(timestamp, delta);
    setTimestamp(nudged);
    setTsRaw(nudged);
  }

  function handleChipClick(shortcut: string) {
    setSectionType(shortcut);
    setSectionTypeCustom('');
  }

  function handleCustomType(val: string) {
    setSectionTypeCustom(val);
    setSectionType(val);
  }

  function appendTag(tag: string) {
    setTags((prev) => {
      const existing = prev.split(',').map((t) => t.trim()).filter(Boolean);
      if (existing.includes(tag)) return prev;
      return existing.length ? `${prev}, ${tag}` : tag;
    });
  }

  function copyTagsFromPrev() {
    if (prevEntry?.tags) setTags(prevEntry.tags);
  }

  // Polish
  async function handlePolish() {
    if (!narrative.trim() || polishCooldown) return;
    setPolishStatus('loading');
    setPolishToast(null);
    try {
      const result = await polishText(narrative, {
        type: 'timeline',
        sectionType,
        timestamp,
        prev: prevEntry
          ? { sectionType: prevEntry.sectionType, narrative: prevEntry.narrative }
          : undefined,
      });
      setPolishedText(result);
      setPolishStatus('ready');
    } catch (e) {
      setPolishToast(
        e instanceof PolishUnavailableError
          ? 'Style clean-up unavailable — your notes were kept'
          : 'Style clean-up failed — your notes were kept'
      );
      setPolishStatus('idle');
    }
    setPolishCooldown(true);
    setTimeout(() => setPolishCooldown(false), 1500);
  }

  function acceptPolished() {
    // FIX #6: only now do we set wasPolished = true
    setNarrative(polishedText);
    setWasPolishedThisSession(true);
    setPolishStatus('idle');
    setPolishedText('');
  }

  function keepOriginal() {
    setPolishStatus('idle');
    setPolishedText('');
  }

  // Save
  const canSave = sectionType.trim() && narrative.trim() && timestampValid;

  function handleSave() {
    if (!canSave) return;

    // Look up the existing entry's wasPolished value in edit mode
    const existingEntry = draft.mode === 'edit' && draft.entryId
      ? timeline.find((e) => e.id === draft.entryId)
      : undefined;

    const entry: TimelineEntry = {
      id: draft.mode === 'edit' && draft.entryId ? draft.entryId : uuidv4(),
      timestamp,
      sectionType: sectionType.trim(),
      narrative: narrative.trim(),
      // FIX #7: use the stable raw snapshot, not the current (potentially edited) narrative
      narrativeRaw: narrativeRawRef.current || narrative.trim(),
      tags: tags.trim(),
      // FIX #6: set true if user accepted polish THIS session, or it was already true from a prior edit
      wasPolished: wasPolishedThisSession || (existingEntry?.wasPolished ?? false),
      isDictated: draft.isDictated,
    };

    let newTimeline: TimelineEntry[];
    if (draft.mode === 'edit' && draft.entryId) {
      newTimeline = timeline.map((e) => (e.id === draft.entryId ? entry : e));
    } else {
      newTimeline = [...timeline, entry];
    }

    // Sort chronologically — invalid timestamps sort last
    newTimeline.sort((a, b) => parseToSeconds(a.timestamp) - parseToSeconds(b.timestamp));

    updateTimeline(track.id, newTimeline);
    setMarkEntryDraft(null);
    setPhase('listening');
  }

  function handleDiscard() {
    if (narrative.trim()) {
      if (!window.confirm('Discard this section?')) return;
    }
    setMarkEntryDraft(null);
    setPhase('listening');
  }

  useKeyboardShortcuts([
    { key: 'Enter', ctrl: true, handler: handleSave, allowInInput: true },
    { key: 'Escape', handler: handleDiscard },
  ]);

  const narrativeRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const ta = narrativeRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  }, [narrative]);

  return (
    <div className="mark-entry-overlay" onClick={handleDiscard}>
      <div className="mark-entry-panel slide-up" onClick={(e) => e.stopPropagation()}>
        {/* Sticky header: label + timestamp + actions */}
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          padding: '0.75rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
        }}>
          {/* Left: label + timestamp + nudge */}
          <div style={{ minWidth: 0 }}>
            <p className="label" style={{ marginBottom: '0.2rem' }}>
              {draft.mode === 'edit' ? 'EDIT SECTION' : 'NEW SECTION'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {tsEditing ? (
                <input
                  autoFocus
                  type="text"
                  value={tsRaw}
                  onChange={(e) => setTsRaw(e.target.value)}
                  onBlur={handleTsBlur}
                  onKeyDown={(e) => e.key === 'Enter' && handleTsBlur()}
                  style={{
                    fontFamily: 'var(--font-mono)', fontSize: '1.75rem',
                    color: timestampValid ? 'var(--amber)' : 'var(--error)',
                    background: 'transparent',
                    border: `1px solid ${timestampValid ? 'var(--border-active)' : 'var(--error)'}`,
                    borderRadius: 'var(--radius)', width: '6rem', padding: '0.25rem',
                  }}
                />
              ) : (
                <button
                  onClick={() => { setTsEditing(true); setTsRaw(timestamp); }}
                  style={{
                    fontFamily: 'var(--font-mono)', fontSize: '1.75rem', color: 'var(--amber)',
                    background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
                  }}
                  title="Click to edit timestamp"
                >
                  {timestamp}
                </button>
              )}
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                {[-5, -1, +1, +5].map((d) => (
                  <button key={d} className="nudge-btn" onClick={() => nudge(d)}>
                    {d > 0 ? `+${d}s` : `${d}s`}
                  </button>
                ))}
              </div>
            </div>
            {!timestampValid && (
              <p style={{ color: 'var(--error)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', marginTop: '0.125rem' }}>
                Use M:SS format
              </p>
            )}
          </div>

          {/* Right: Discard + Save */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.375rem', flexShrink: 0 }}>
            <button className="btn-primary btn-small" disabled={!canSave} onClick={handleSave}>
              SAVE
            </button>
            <button className="btn-ghost btn-destructive btn-small" onClick={handleDiscard}>
              DISCARD
            </button>
            <span className="kbd-hint" style={{ marginTop: '0.125rem' }}>⌘↵ save · Esc discard</span>
          </div>
        </div>

        {/* Dictated badge (below header) */}
        {draft.isDictated && (
          <div style={{
            margin: '0.75rem 1.25rem 0',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.375rem 0.625rem', background: 'var(--amber-bg)',
            border: '1px solid var(--amber)', borderRadius: 'var(--radius)',
          }}>
            <span style={{ fontSize: '0.875rem' }}>🎙</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--amber)' }}>
              DICTATED — transcript pre-filled below
            </span>
          </div>
        )}

        {/* Section type */}
        <div style={{ padding: '1rem 1.25rem 0' }}>
          <label className="label" style={{ display: 'block', marginBottom: '0.5rem' }}>
            SECTION TYPE <span style={{ color: 'var(--error)' }}>*</span>
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.5rem' }}>
            {SECTION_TYPE_SHORTCUTS.map((s) => (
              <button
                key={s}
                className={`chip ${sectionType === s && !sectionTypeCustom ? 'chip--selected' : ''}`}
                onClick={() => handleChipClick(s)}
              >
                {s}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={sectionTypeCustom}
            onChange={(e) => handleCustomType(e.target.value)}
            placeholder="Or type your own section name"
            className="text-input"
            style={{ fontSize: '0.875rem' }}
          />
        </div>

        {/* Previous section reference — ALWAYS VISIBLE, never collapsible */}
        <div style={{ padding: '0.75rem 1.25rem 0' }}>
          <div className="prev-section-ref">
            {prevEntry ? (
              <>
                <p style={{ margin: '0 0 0.25rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  ← Previous: {prevEntry.sectionType} at {prevEntry.timestamp}
                </p>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                  {prevEntry.narrative}
                </p>
              </>
            ) : (
              <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                Opening section — describe what you hear at 0:00
              </p>
            )}
          </div>
        </div>

        {/* Narrative */}
        <div style={{ padding: '1rem 1.25rem 0' }}>
          <label className="label" style={{ display: 'block', marginBottom: '0.375rem' }}>
            DESCRIBE THIS SECTION <span style={{ color: 'var(--error)' }}>*</span>
          </label>
          <div style={{ marginBottom: '0.5rem' }}>
            {narrativePrompts.map((prompt, i) => (
              <p key={i} style={{ margin: '0 0 0.125rem', fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--text-dim)' }}>
                › {prompt}
              </p>
            ))}
          </div>
          <textarea
            ref={narrativeRef}
            value={narrative}
            onChange={(e) => {
              setNarrative(e.target.value);
              const ta = e.target;
              ta.style.height = 'auto';
              ta.style.height = ta.scrollHeight + 'px';
            }}
            placeholder="Type rough notes freely…"
            className="text-area"
            style={{ minHeight: '6rem' }}
          />

          {/* Polish */}
          {narrative.trim() && (
            <div style={{ marginTop: '0.5rem' }}>
              {polishStatus === 'idle' && (
                <button
                  className={`btn-ghost btn-small ${polishCooldown ? 'btn-cooling' : ''}`}
                  onClick={handlePolish}
                  disabled={polishCooldown}
                >
                  {polishCooldown ? '◌ cooling down' : 'Clean up style ✦'}
                </button>
              )}
              {polishStatus === 'loading' && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Cleaning…
                </span>
              )}
              {polishStatus === 'ready' && (
                <div className="polish-diff">
                  <div className="polish-col">
                    <p className="label" style={{ marginBottom: '0.375rem', color: 'var(--text-dim)' }}>YOUR NOTES</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontFamily: 'var(--font-serif)' }}>{narrative}</p>
                  </div>
                  <div className="polish-col">
                    <p className="label" style={{ marginBottom: '0.375rem', color: 'var(--amber)' }}>CLEANED UP</p>
                    <textarea
                      value={polishedText}
                      onChange={(e) => setPolishedText(e.target.value)}
                      className="text-area"
                      style={{ minHeight: '4rem', fontSize: '0.875rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button className="btn-ghost btn-small" onClick={keepOriginal}>Keep original</button>
                    <button className="btn-primary btn-small" onClick={acceptPolished}>Use cleaned version</button>
                  </div>
                </div>
              )}
              {polishToast && (
                <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  {polishToast}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Tags */}
        <div style={{ padding: '1rem 1.25rem 0' }}>
          <label className="label" style={{ display: 'block', marginBottom: '0.25rem' }}>
            TAGS
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--text-dim)', marginLeft: '0.5rem', letterSpacing: 0 }}>
              (comma-separated — type anything)
            </span>
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Piano, Lo-fi, Melancholic…"
            className="text-input"
            style={{ marginBottom: '0.5rem' }}
          />
          {prevEntry?.tags && (
            <button className="btn-ghost btn-small" onClick={copyTagsFromPrev} style={{ marginBottom: '0.5rem' }}>
              Copy tags from {prevEntry.sectionType}
            </button>
          )}
          {Object.entries(TAG_SUGGESTIONS).map(([group, suggestions]) => (
            <div key={group} style={{ marginBottom: '0.5rem' }}>
              <p className="label" style={{ marginBottom: '0.25rem', fontSize: '0.6875rem' }}>{group.toUpperCase()}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                {suggestions.map((tag) => (
                  <button key={tag} className="chip chip--small" onClick={() => appendTag(tag)}>{tag}</button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom padding so last field isn't flush against the player bar */}
        <div style={{ height: '2rem' }} />
      </div>
    </div>
  );
}
