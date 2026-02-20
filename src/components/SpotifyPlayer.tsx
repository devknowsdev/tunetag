// Fixed bottom player bar for the Spotify Web Playback SDK.
// z-index 150 — above all phase content, below HowToUse modal (200).
// All colours and fonts use existing CSS variables.

import type { UseSpotifyPlayerReturn } from '../hooks/useSpotifyPlayer';

interface SpotifyPlayerProps {
  player: UseSpotifyPlayerReturn;
}

/** Format milliseconds → m:ss */
function fmtMs(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function SpotifyPlayer({ player }: SpotifyPlayerProps) {
  const {
    isReady,
    isPlaying,
    position,
    duration,
    volume,
    play,
    pause,
    seek,
    setVolume,
    currentTrackName,
    currentArtistName,
  } = player;

  const progress = duration > 0 ? position / duration : 0;

  function handleProgressClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!isReady || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    seek(Math.floor(ratio * duration));
  }

  function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    setVolume(parseFloat(e.target.value));
  }

  function handlePlayPause() {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }

  function handleSeekToStart() {
    seek(0);
  }

  return (
    <div style={styles.bar}>
      {/* Progress bar */}
      <div
        style={styles.progressTrack}
        onClick={handleProgressClick}
        role="slider"
        aria-label="Playback position"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div style={{ ...styles.progressFill, width: `${progress * 100}%` }} />
      </div>

      {/* Main row */}
      <div style={styles.row}>
        {/* Track info */}
        <div style={styles.trackInfo}>
          <span style={styles.trackName}>
            {currentTrackName ?? (isReady ? 'No track playing' : 'Connecting…')}
          </span>
          {currentArtistName && (
            <span style={styles.artistName}>{currentArtistName}</span>
          )}
        </div>

        {/* Controls */}
        <div style={styles.controls}>
          {/* Seek to start */}
          <button
            style={styles.iconBtn}
            onClick={handleSeekToStart}
            disabled={!isReady}
            aria-label="Seek to start"
            title="Seek to start"
          >
            ⏮
          </button>

          {/* Play / Pause */}
          <button
            style={{ ...styles.iconBtn, ...styles.playBtn }}
            onClick={handlePlayPause}
            disabled={!isReady}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
        </div>

        {/* Time + Volume */}
        <div style={styles.rightSide}>
          <span style={styles.time}>
            {fmtMs(position)}&nbsp;/&nbsp;{fmtMs(duration)}
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={handleVolumeChange}
            disabled={!isReady}
            aria-label="Volume"
            style={styles.volumeSlider}
          />
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 150,
    background: 'var(--surface)',
    borderTop: '1px solid var(--border-active)',
  },
  progressTrack: {
    width: '100%',
    height: '3px',
    background: 'var(--border)',
    cursor: 'pointer',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    background: 'var(--amber)',
    pointerEvents: 'none',
    transition: 'width 0.25s linear',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.5rem 1rem',
    gap: '0.75rem',
    maxWidth: '800px',
    margin: '0 auto',
    width: '100%',
  },
  trackInfo: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.1rem',
    overflow: 'hidden',
  },
  trackName: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    color: 'var(--text)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  artistName: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.6875rem',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    flexShrink: 0,
  },
  iconBtn: {
    background: 'transparent',
    border: '1px solid var(--border-active)',
    borderRadius: '4px',
    color: 'var(--text-muted)',
    fontSize: '0.875rem',
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'color 150ms ease, border-color 150ms ease',
    padding: 0,
  },
  playBtn: {
    color: 'var(--amber)',
    borderColor: 'var(--amber)',
  },
  rightSide: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
    flexShrink: 0,
  },
  time: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.6875rem',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
  },
  volumeSlider: {
    width: '72px',
    accentColor: 'var(--amber)',
    cursor: 'pointer',
  },
};
