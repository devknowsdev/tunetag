import { useState } from 'react';
import type { Phase, TrackAnnotation } from '../types';
import { SpotifyPlayer } from './SpotifyPlayer';
import type { UseSpotifyPlayerReturn } from '../hooks/useSpotifyPlayer';

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  phase: Phase;
  activeAnnotation: TrackAnnotation | null;
  timerElapsed: number;
  timerRunning: boolean;
  onSetup: () => void;
  onHelp: () => void;
  onSpotifyLogin: () => void;
  spotifyToken: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  spotifyPlayer: UseSpotifyPlayerReturn;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatMSS(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ── Component ────────────────────────────────────────────────────────────────

export function AppSidebar({
  phase,
  activeAnnotation,
  timerElapsed,
  timerRunning,
  onSetup,
  onHelp,
  onSpotifyLogin,
  spotifyToken,
  spotifyPlayer,
}: Props) {
  const [open, setOpen] = useState(false);

  // Hidden in flow mode
  if (phase === 'flow') return null;

  const itemStyle: React.CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.6875rem',
    letterSpacing: '0.05em',
    padding: '0.75rem 1rem',
    width: '100%',
    textAlign: 'left',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'block',
  };

  const dividerStyle: React.CSSProperties = {
    height: '1px',
    background: 'var(--border)',
    margin: '0.25rem 0',
  };

  return (
    <>
      {/* ── TOGGLE TAB ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close sidebar' : 'Open sidebar'}
        style={{
          position: 'fixed',
          left: open ? '220px' : 0,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 60,
          background: 'var(--surface)',
          border: '1px solid var(--border-active)',
          borderLeft: open ? '1px solid var(--border-active)' : 'none',
          borderRadius: open ? '0 var(--radius-pill) var(--radius-pill) 0' : '0 var(--radius-pill) var(--radius-pill) 0',
          color: 'var(--amber)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.7rem',
          padding: '0.5rem 0.4rem',
          cursor: 'pointer',
          lineHeight: 1,
          transition: 'left var(--transition)',
          writingMode: 'vertical-rl',
          letterSpacing: '0.08em',
        }}
      >
        {open ? '◀' : '▶'}
      </button>

      {/* ── SIDEBAR PANEL ── */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          height: '100vh',
          width: '220px',
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform var(--transition)',
        }}
      >
        {/* APP section */}
        <div style={{ paddingTop: '1rem' }}>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.6rem',
            color: 'var(--text-dim)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            padding: '0 1rem 0.25rem',
          }}>
            APP
          </p>
          <button className="btn-ghost" style={itemStyle} onClick={onSetup}>
            SETUP
          </button>
          <button className="btn-ghost" style={itemStyle} onClick={onHelp}>
            ? HELP
          </button>
        </div>

        <div style={dividerStyle} />

        {/* SPOTIFY section */}
        <div>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.6rem',
            color: 'var(--text-dim)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            padding: '0.5rem 1rem 0.25rem',
          }}>
            SPOTIFY
          </p>
          {!spotifyToken ? (
            <button className="btn-ghost" style={itemStyle} onClick={onSpotifyLogin}>
              ♫ CONNECT SPOTIFY
            </button>
          ) : (
            <div style={{ padding: '0.5rem 0.5rem' }}>
              <SpotifyPlayer
                player={spotifyPlayer}
                spotifyId={activeAnnotation?.track.spotifyId ?? null}
              />
            </div>
          )}
        </div>

        {/* SESSION section — only if a track is active */}
        {activeAnnotation && (
          <>
            <div style={dividerStyle} />
            <div>
              <p style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.6rem',
                color: 'var(--text-dim)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                padding: '0.5rem 1rem 0.25rem',
              }}>
                SESSION
              </p>
              <div style={{ padding: '0.25rem 1rem 0.75rem' }}>
                <p style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1rem',
                  color: timerRunning ? 'var(--amber)' : 'var(--text-dim)',
                  letterSpacing: '0.04em',
                  margin: '0 0 0.25rem',
                  transition: 'color var(--transition)',
                }}>
                  ⏱ {formatMSS(timerElapsed)}
                </p>
                <p style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {activeAnnotation.track.name}
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── MOBILE OVERLAY ── */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 40,
            background: 'rgba(0,0,0,0.45)',
          }}
          // Only shown on mobile — hidden on desktop via media query below
          className="sidebar-overlay"
        />
      )}

      {/* ── RESPONSIVE: hide overlay on desktop ── */}
      <style>{`
        @media (min-width: 769px) {
          .sidebar-overlay { display: none !important; }
        }
      `}</style>
    </>
  );
}
