import { useRef, useEffect } from 'react';
import { useMicMeter } from '../hooks';

// ── Shared dictation types ───────────────────────────────────────────────────
export type DictationStatus =
  | 'idle'
  | 'awaiting_manual_pause'
  | 'recording'
  | 'finalizing'
  | 'audio_saved'
  | 'done'
  | 'error';

export interface DictationState {
  status: DictationStatus;
  transcript: string;
  capturedTimestamp: string;
  capturedWasRunning: boolean;
  noSpeechHint: boolean;
  error?: string;
}

export const INITIAL_DICTATION: DictationState = {
  status: 'idle',
  transcript: '',
  capturedTimestamp: '',
  capturedWasRunning: false,
  noSpeechHint: false,
};

// ── MicLevelMeter ────────────────────────────────────────────────────────────
export function MicLevelMeter({ stream }: { stream: MediaStream | null }) {
  const barLevels = useMicMeter(stream);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return;
    const BAR_COUNT = barLevels.length;
    const W = canvas.width;
    const H = canvas.height;
    ctx2d.clearRect(0, 0, W, H);
    for (let i = 0; i < BAR_COUNT; i++) {
      const avg = barLevels[i];
      const barH = Math.max(2, avg * H);
      const x = (i / BAR_COUNT) * W;
      const barW = W / BAR_COUNT - 1;
      ctx2d.fillStyle = avg > 0.05 ? 'rgba(8,32,48,0.8)' : 'rgba(8,32,48,0.2)';
      ctx2d.fillRect(x, H - barH, barW, barH);
    }
  }, [barLevels]);

  if (!stream) return null;

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={32}
      style={{
        width: '100%',
        height: '32px',
        display: 'block',
        borderRadius: '4px',
        background: 'rgba(8,32,48,0.06)',
        marginBottom: '0.75rem',
      }}
    />
  );
}

// ── DictationOverlay ─────────────────────────────────────────────────────────
export interface DictationOverlayProps {
  state: DictationState;
  micStream: MediaStream | null;
  micDevices: MediaDeviceInfo[];
  selectedMicId: string;
  setSelectedMicId: (id: string) => void;
  onCancel: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onAccept: () => void;
}

export function DictationOverlay({
  state, micStream, micDevices, selectedMicId, setSelectedMicId,
  onCancel, onStartRecording, onStopRecording, onAccept,
}: DictationOverlayProps) {
  if (state.status === 'idle') return null;

  return (
    <div className="dictation-overlay">
      {state.status === 'awaiting_manual_pause' && (
        <div className="dictation-card">
          <p className="label" style={{ color: 'var(--amber)', marginBottom: '0.75rem' }}>🎙 DICTATE</p>
          <p style={{ color: 'var(--text)', marginBottom: '0.75rem', lineHeight: 1.6 }}>
            Spotify can't be paused automatically — please pause your playback now,
            then press <strong>Start Recording</strong>.
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Timestamp captured: {state.capturedTimestamp}
          </p>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{
              display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.7rem',
              letterSpacing: '0.08em', color: 'var(--text-dim)', marginBottom: '0.375rem',
            }}>
              MICROPHONE INPUT
            </label>
            <select
              className="text-input"
              value={selectedMicId}
              onChange={(e) => setSelectedMicId(e.target.value)}
              style={{ cursor: 'pointer', fontSize: '0.875rem' }}
            >
              <option value="">Default (system)</option>
              {micDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Microphone ${d.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-ghost" onClick={onCancel}>Cancel</button>
            <button className="btn-primary" onClick={onStartRecording}>● Start Recording</button>
          </div>
        </div>
      )}

      {state.status === 'recording' && (
        <div className="dictation-card">
          <p className="label" style={{ color: 'var(--error)', marginBottom: '0.5rem' }}>● RECORDING…</p>
          <MicLevelMeter stream={micStream} />
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-dim)', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>
            LIVE TRANSCRIPT (BROWSER SPEECH RECOGNITION)
          </p>
          <p style={{ color: state.transcript ? 'var(--text)' : 'var(--text-muted)', minHeight: '3rem', fontFamily: 'var(--font-serif)', lineHeight: 1.6, marginBottom: '0.5rem' }}>
            {state.transcript || 'Listening…'}
          </p>
          {state.noSpeechHint && !state.transcript && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-dim)', fontStyle: 'italic', marginBottom: '0.75rem' }}>
              Speak clearly into your microphone…
            </p>
          )}
          <button className="btn-primary" onClick={onStopRecording}>■ Stop Recording</button>
        </div>
      )}

      {state.status === 'finalizing' && (
        <div className="dictation-card">
          <p className="label" style={{ color: 'var(--amber)', marginBottom: '0.75rem' }}>⏳ FINALIZING RECORDING…</p>
        </div>
      )}

      {state.status === 'audio_saved' && (
        <div className="dictation-card">
          <p className="label" style={{ color: 'var(--success)', marginBottom: '0.75rem' }}>AUDIO SAVED ✓</p>
          {!state.transcript && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Audio saved — no transcript captured
            </p>
          )}
        </div>
      )}

      {state.status === 'done' && (
        <div className="dictation-card">
          <p className="label" style={{ color: 'var(--success)', marginBottom: '0.75rem' }}>✓ TRANSCRIPT READY</p>
          <p style={{ color: 'var(--text)', fontFamily: 'var(--font-serif)', lineHeight: 1.6, marginBottom: '1rem' }}>
            {state.transcript || <span style={{ color: 'var(--text-muted)' }}>Audio saved — no transcript captured</span>}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-ghost" onClick={onCancel}>Discard</button>
            <button className="btn-primary" disabled={!state.transcript} onClick={onAccept}>
              Use Transcript →
            </button>
          </div>
        </div>
      )}

      {state.status === 'error' && (
        <div className="dictation-card">
          <p className="label" style={{ color: 'var(--error)', marginBottom: '0.75rem' }}>DICTATION ERROR</p>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>{state.error}</p>
          <button className="btn-ghost" onClick={onCancel}>Dismiss</button>
        </div>
      )}
    </div>
  );
}
