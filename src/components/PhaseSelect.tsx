// FIX #3: Resume uses annotation.resumePhase (persisted per-track) for exact phase restore.
import type { TrackAnnotation, Phase } from '../types';
import { TRACKS } from '../lib/schema';

interface Props {
  annotations: Record<number, TrackAnnotation>;
  setActiveTrackId: (id: number) => void;
  setPhase: (p: Phase) => void;
  resetTrack: (id: number) => void;
}

const STATUS_LABEL: Record<TrackAnnotation['status'], string> = {
  not_started: 'NOT STARTED',
  in_progress: 'IN PROGRESS',
  complete: 'COMPLETE',
  skipped: 'SKIPPED',
};

export function PhaseSelect({
  annotations,
  setActiveTrackId,
  setPhase,
  resetTrack,
}: Props) {
  function handleCardClick(trackId: number) {
    const ann = annotations[trackId];
    const status = ann?.status ?? 'not_started';

    if (status === 'not_started') {
      setActiveTrackId(trackId);
      setPhase('ready');
    } else if (status === 'in_progress') {
      const choice = window.confirm(
        `Track ${trackId} is in progress.\n\nOK = Resume where you left off\nCancel = Start over`
      );
      if (choice) {
        setActiveTrackId(trackId);
        // Use the per-track persisted resumePhase if available (set whenever
        // setPhase is called with a non-select phase). Falls back to a safe
        // heuristic: listening if timeline has entries, ready otherwise.
        const nextPhase = ann.resumePhase ?? (ann.timeline.length > 0 ? 'listening' : 'ready');
        setPhase(nextPhase);
      } else {
        if (window.confirm('Start over? This will clear all progress for this track.')) {
          setActiveTrackId(trackId);
          resetTrack(trackId);
          setPhase('ready');
        }
      }
    } else if (status === 'complete') {
      setActiveTrackId(trackId);
      setPhase('review');
    } else if (status === 'skipped') {
      if (window.confirm('Unskip and restart this track?')) {
        setActiveTrackId(trackId);
        resetTrack(trackId);
        setPhase('ready');
      }
    }
  }

  return (
    <div className="phase-container fade-in">
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <p className="label" style={{ marginBottom: '0.5rem' }}>BEATPULSE LABS</p>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2rem',
            color: 'var(--amber)',
            margin: 0,
          }}
        >
          Annotation Session
        </h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {TRACKS.map((track) => {
          const ann = annotations[track.id];
          const status = ann?.status ?? 'not_started';
          const timeline = ann?.timeline ?? [];
          const global = ann?.global ?? {};
          const globalFilled = Object.values(global).filter((v) => v && (v as string).trim()).length;

          return (
            <button
              key={track.id}
              className="track-card"
              onClick={() => handleCardClick(track.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <p className="label" style={{ color: 'var(--amber)', marginBottom: '0.375rem' }}>
                  TRACK {track.id}
                </p>
                <span className={`status-badge status-${status}`}>
                  {STATUS_LABEL[status]}
                </span>
              </div>
              <p
                style={{
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  fontSize: '1.25rem',
                  margin: '0 0 0.25rem',
                  color: 'var(--text)',
                }}
              >
                {track.name}
              </p>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.875rem' }}>
                {track.artist}
              </p>
              {status === 'in_progress' && (
                <p
                  style={{
                    color: 'var(--text-dim)',
                    margin: '0.5rem 0 0',
                    fontSize: '0.8125rem',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {timeline.length} sections · {globalFilled}/9 categories
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
