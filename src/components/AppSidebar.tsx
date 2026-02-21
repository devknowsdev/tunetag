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

  // Show in all phases (including flow and fullscreen)
  const isImmersive = phase === 'flow';

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

  const sectionLabelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.6rem',
    color: 'var(--text-dim)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    padding: '0.5rem 1rem 0.25rem',
  };

  return (
    <>
      {/* ── TOGGLE TAB ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close sidebar' : 'Open sidebar'}
        style={{
          position: 'fixed',
          left: open ? '240px' : 0,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 120,
          background: 'var(--surface)',
          border: '1px solid var(--border-active)',
          borderLeft: open ? '1px solid var(--border-active)' : 'none',
          borderRadius: '0 var(--radius-pill) var(--radius-pill) 0',
          color: 'var(--amber)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8rem',
          padding: '0.75rem 0.5rem',
          cursor: 'pointer',
          lineHeight: 1,
          transition: 'left 200ms ease',
          writingMode: 'vertical-rl',
          letterSpacing: '0.1em',
          minHeight: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.25rem',
        }}
      >
        {open ? '◀ CLOSE' : '▶ MENU'}
      </button>

      {/* ── SIDEBAR PANEL ── */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          height: '100vh',
          width: '240px',
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          zIndex: 110,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 200ms ease',
          boxShadow: open ? '4px 0 24px rgba(0,0,0,0.4)' : 'none',
        }}
      >
        {/* APP section */}
        <div style={{ paddingTop: '1rem' }}>
          <p style={sectionLabelStyle}>APP</p>
          <button className="btn-ghost" style={itemStyle} onClick={() => { onSetup(); setOpen(false); }}>
            ⚙ SETUP
          </button>
          <button className="btn-ghost" style={itemStyle} onClick={() => { onHelp(); setOpen(false); }}>
            ? HELP
          </button>
        </div>

        <div style={dividerStyle} />

        {/* SPOTIFY section */}
        <div>
          <p style={sectionLabelStyle}>SPOTIFY</p>
          {!spotifyToken ? (
            <button className="btn-ghost" style={itemStyle} onClick={onSpotifyLogin}>
              ♫ CONNECT SPOTIFY
            </button>
          ) : (
            <div style={{ padding: '0.5rem' }}>
              <SpotifyPlayer
                player={spotifyPlayer}
                spotifyId={activeAnnotation?.track.spotifyId ?? null}
                compact
              />
            </div>
          )}
        </div>

        {/* SESSION section — only if a track is active */}
        {activeAnnotation && (
          <>
            <div style={dividerStyle} />
            <div>
              <p style={sectionLabelStyle}>SESSION</p>
              <div style={{ padding: '0.25rem 1rem 0.75rem' }}>
                <p style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1.25rem',
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
                <p style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.65rem',
                  color: 'var(--text-dim)',
                  margin: '0.125rem 0 0',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {activeAnnotation.track.artist}
                </p>
              </div>
            </div>
          </>
        )}

        {/* IMMERSIVE MODE hints — shown in flow/fullscreen */}
        {isImmersive && (
          <>
            <div style={dividerStyle} />
            <div>
              <p style={sectionLabelStyle}>IMMERSIVE MODE</p>
              <p style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.65rem',
                color: 'var(--text-dim)',
                padding: '0.5rem 1rem',
                lineHeight: 1.6,
              }}>
                Spotify controls and timeline drawer are available below the waveform.
                Close this menu to return to the full flow view.
              </p>
            </div>
          </>
        )}
      </div>

      {/* ── OVERLAY (closes sidebar on click-outside) ── */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.5)',
          }}
        />
      )}
    </>
  );
}
