// Simplified: start logic moved to App.tsx (onStartListening callback).
import { useState } from 'react';
import type { TrackAnnotation } from '../types';
import { STYLE_RULES } from '../lib/schema';

interface Props {
  annotation: TrackAnnotation;
  annotator: string;
  setAnnotator: (name: string) => void;
  onStartListening: () => void;  // App.tsx handles timer + status + phase change
}

export function PhaseReady({ annotation, annotator, setAnnotator, onStartListening }: Props) {
  const track = annotation.track;
  const [sectionOpen, setSectionOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(() => {
    const s = new Set<number>();
    STYLE_RULES.forEach((r) => { if (r.defaultExpanded) s.add(r.num); });
    return s;
  });

  function toggleRule(num: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(num)) next.delete(num);
      else next.add(num);
      return next;
    });
  }

  return (
    <div className="phase-container fade-in">
      {/* Track header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <p className="label" style={{ color: 'var(--amber)', marginBottom: '0.375rem' }}>
          TRACK {track.id} — PART 1
        </p>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: '1.5rem',
            margin: '0 0 0.25rem',
            color: 'var(--text)',
          }}
        >
          {track.name}
        </h2>
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>{track.artist}</p>
      </div>

      {/* Spotify embed */}
      <div style={{ marginBottom: '1.5rem', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <iframe
          src={`https://open.spotify.com/embed/track/${track.spotifyId}?utm_source=generator&theme=0`}
          width="100%"
          height="152"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          title={`${track.artist} - ${track.name}`}
        />
      </div>

      {/* Annotator name */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label className="label" style={{ display: 'block', marginBottom: '0.375rem' }}>
          ANNOTATOR NAME
        </label>
        <input
          type="text"
          value={annotator}
          onChange={(e) => setAnnotator(e.target.value)}
          placeholder="Your name"
          className="text-input"
        />
      </div>

      {/* Style rules accordion */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={() => setSectionOpen((v) => !v)}
          className="accordion-header"
          style={{ width: '100%', marginBottom: sectionOpen ? '0.75rem' : 0 }}
        >
          <span className="label" style={{ flex: 1, textAlign: 'left' }}>
            STYLE RULES — READ BEFORE ANNOTATING
          </span>
          <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>
            {sectionOpen ? '▲' : '▼'}
          </span>
        </button>
        {sectionOpen && <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {STYLE_RULES.map((rule) => (
            <div key={rule.num} className="accordion-item">
              <button className="accordion-header" onClick={() => toggleRule(rule.num)}>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: '0.75rem' }}>
                  {String(rule.num).padStart(2, '0')}
                </span>
                <span style={{ flex: 1, textAlign: 'left', marginLeft: '0.75rem' }}>
                  {rule.title}
                </span>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                  {expanded.has(rule.num) ? '▲' : '▼'}
                </span>
              </button>
              {expanded.has(rule.num) && (
                <div className="accordion-body">{rule.body}</div>
              )}
            </div>
          ))}
        </div>}
      </div>

      {/* Timer notice */}
      <div className="notice-amber" style={{ marginBottom: '1.5rem' }}>
        Session timer starts when you click Start Listening. A warning appears at 20 minutes.
      </div>

      {/* Start button */}
      <button
        className="btn-primary"
        style={{ width: '100%', fontSize: '1rem', padding: '0.875rem' }}
        disabled={!annotator.trim()}
        onClick={onStartListening}
      >
        ▶ START LISTENING
      </button>
    </div>
  );
}
