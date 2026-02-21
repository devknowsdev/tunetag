import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SetupScreenProps {
  onEnter: () => void
}

interface BrowserSupport {
  speechRecognition: boolean
  mediaRecorder: boolean
  fileSystemAccess: boolean
  audioOutputSelection: boolean
}

interface AudioDevice {
  deviceId: string
  label: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function detectBrowserSupport(): BrowserSupport {
  return {
    speechRecognition: 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window,
    mediaRecorder: 'MediaRecorder' in window,
    fileSystemAccess: 'showDirectoryPicker' in window,
    audioOutputSelection: 'setSinkId' in HTMLMediaElement.prototype,
  }
}

function saveToSession(key: string, value: string) {
  try { sessionStorage.setItem(key, value) } catch { /* ignore */ }
}

function loadFromSession(key: string): string {
  try { return sessionStorage.getItem(key) ?? '' } catch { return '' }
}

function removeFromSession(key: string) {
  try { sessionStorage.removeItem(key) } catch { /* ignore */ }
}

// ─── Shared inline styles ─────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: '1.25rem 1.5rem',
  marginBottom: '1.25rem',
}

const sectionTitle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.7rem',
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  color: 'var(--amber)',
  marginBottom: '0.75rem',
}

const bodyText: React.CSSProperties = {
  fontSize: '0.875rem',
  color: 'var(--text-muted)',
  lineHeight: 1.6,
  marginBottom: '0.75rem',
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: '0.5rem 0.75rem',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  color: 'var(--text)',
  fontSize: '0.875rem',
  fontFamily: 'var(--font-mono)',
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  color: 'var(--text)',
  fontSize: '0.875rem',
  marginBottom: '0.5rem',
}

const fieldLabel: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'var(--text-dim)',
  marginBottom: '0.35rem',
  fontFamily: 'var(--font-mono)',
  letterSpacing: '0.05em',
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.75rem',
        fontWeight: 700,
        color: ok ? 'var(--success)' : 'var(--error)',
        flexShrink: 0,
        minWidth: 16,
      }}>
        {ok ? '✓' : '✗'}
      </span>
      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{label}</span>
    </div>
  )
}

// ─── ApiKeyField ──────────────────────────────────────────────────────────────

function ApiKeyField({
  description,
  sessionKey,
  linkText,
  linkHref,
}: {
  description: string
  sessionKey: string
  linkText: string
  linkHref: string
}) {
  const [value, setValue] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setSaved(!!loadFromSession(sessionKey))
  }, [sessionKey])

  function handleSave() {
    if (!value.trim()) return
    saveToSession(sessionKey, value.trim())
    setSaved(true)
    setValue('')
  }

  function handleClear() {
    removeFromSession(sessionKey)
    setSaved(false)
  }

  return (
    <div>
      <p style={bodyText}>{description}</p>
      {saved ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <span style={{ color: 'var(--success)', fontWeight: 700, fontSize: '0.875rem', fontFamily: 'var(--font-mono)' }}>
            ✓ KEY SAVED
          </span>
          <button onClick={handleClear} className="btn-ghost btn-small">Clear</button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <input
            type="password"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="Paste key here…"
            style={inputStyle}
          />
          <button onClick={handleSave} disabled={!value.trim()} className="btn-primary btn-small">
            Save
          </button>
        </div>
      )}
      <a
        href={linkHref}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontSize: '0.8rem',
          color: 'var(--amber)',
          textDecoration: 'none',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.03em',
        }}
      >
        {linkText} ↗
      </a>
    </div>
  )
}

// ─── MicTest ─────────────────────────────────────────────────────────────────

function MicTest({ selectedMicId, selectedSpeakerId }: { selectedMicId: string; selectedSpeakerId: string }) {
  const [state, setState] = useState<'idle' | 'recording' | 'playing' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')
  const [barLevels, setBarLevels] = useState<number[]>(Array(20).fill(0))
  const chunksRef = useRef<Blob[]>([])
  const animRef = useRef<number | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  const stopMeter = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current)
    analyserRef.current?.disconnect()
    audioCtxRef.current?.close()
    analyserRef.current = null
    audioCtxRef.current = null
    setBarLevels(Array(20).fill(0))
  }, [])

  const startMeter = useCallback((stream: MediaStream) => {
    const ctx = new AudioContext()
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 64
    ctx.createMediaStreamSource(stream).connect(analyser)
    audioCtxRef.current = ctx
    analyserRef.current = analyser
    const buf = new Uint8Array(analyser.frequencyBinCount)
    const tick = () => {
      analyser.getByteFrequencyData(buf)
      setBarLevels(Array.from({ length: 20 }, (_, i) => buf[Math.floor(i * buf.length / 20)] / 255))
      animRef.current = requestAnimationFrame(tick)
    }
    tick()
  }, [])

  async function runTest() {
    setError('')
    setState('recording')
    chunksRef.current = []
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: selectedMicId ? { deviceId: { exact: selectedMicId } } : true,
      })
      startMeter(stream)
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus' : 'audio/webm'
      const recorder = new MediaRecorder(stream, { mimeType })
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        stopMeter()
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        if (selectedSpeakerId && 'setSinkId' in audio) {
          try { await (audio as any).setSinkId(selectedSpeakerId) } catch { /* ignore */ }
        }
        setState('playing')
        audio.onended = () => { URL.revokeObjectURL(url); setState('done') }
        audio.onerror = () => { setState('error'); setError('Playback failed.') }
        audio.play().catch(() => { setState('error'); setError('Playback failed.') })
      }
      recorder.start()
      setTimeout(() => { if (recorder.state === 'recording') recorder.stop() }, 3000)
    } catch (err: any) {
      stopMeter()
      setState('error')
      setError(err?.message ?? 'Could not access microphone.')
    }
  }

  return (
    <div>
      {state === 'recording' && (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 28, marginBottom: '0.75rem' }}>
          {barLevels.map((level, i) => (
            <div key={i} style={{
              flex: 1, borderRadius: 2,
              height: `${Math.max(4, level * 100)}%`,
              background: level > 0.7 ? 'var(--error)' : 'var(--amber)',
              transition: 'height 0.05s',
            }} />
          ))}
        </div>
      )}
      <button
        onClick={runTest}
        disabled={state === 'recording' || state === 'playing'}
        className={state === 'done' ? 'btn-ghost btn-small' : 'btn-primary btn-small'}
      >
        {state === 'idle' && 'Test Recording (3 sec)'}
        {state === 'recording' && 'Recording…'}
        {state === 'playing' && 'Playing back…'}
        {state === 'done' && 'Mic working ✓ — Test again?'}
        {state === 'error' && 'Test failed — try again'}
      </button>
      {error && <p style={{ marginTop: '0.5rem', color: 'var(--error)', fontSize: '0.8rem' }}>{error}</p>}
      {state === 'done' && (
        <p style={{ marginTop: '0.5rem', color: 'var(--success)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
          ✓ Audio recorded and played back successfully.
        </p>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SetupScreen({ onEnter }: SetupScreenProps) {
  const [spotifyKeySaved, setSpotifyKeySaved] = useState(false)
  const [support, setSupport] = useState<BrowserSupport | null>(null)
  const [micDevices, setMicDevices] = useState<AudioDevice[]>([])
  const [speakerDevices, setSpeakerDevices] = useState<AudioDevice[]>([])
  const [selectedMicId, setSelectedMicId] = useState('')
  const [selectedSpeakerId, setSelectedSpeakerId] = useState('')
  const [devicesLoaded, setDevicesLoaded] = useState(false)

  useEffect(() => {
    setSupport(detectBrowserSupport())
    const id = setInterval(() => {
      setSpotifyKeySaved(!!loadFromSession('spotify_api_key'))
    }, 400)
    return () => clearInterval(id)
  }, [])

  async function loadDevices() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(t => t.stop())
      const devices = await navigator.mediaDevices.enumerateDevices()
      setMicDevices(devices.filter(d => d.kind === 'audioinput').map(d => ({
        deviceId: d.deviceId, label: d.label || `Mic ${d.deviceId.slice(0, 6)}`,
      })))
      setSpeakerDevices(devices.filter(d => d.kind === 'audiooutput').map(d => ({
        deviceId: d.deviceId, label: d.label || `Speaker ${d.deviceId.slice(0, 6)}`,
      })))
    } catch { /* permission denied */ }
    setDevicesLoaded(true)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      color: 'var(--text)',
      overflowY: 'auto',
      padding: '3rem 1rem 6rem',
    }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>

        {/* HERO */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <p className="label" style={{ color: 'var(--amber)', marginBottom: '0.5rem' }}>
            TUNETAG ANNOTATOR
          </p>
          <h1 style={{
            fontSize: 'clamp(1.5rem, 4vw, 2rem)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            marginBottom: '0.75rem',
            color: 'var(--text)',
          }}>
            Set up your session
          </h1>
          <p style={{ ...bodyText, maxWidth: 460, margin: '0 auto', marginBottom: 0 }}>
            Real-time audio annotation for music supervisors and sound editors.
            Complete the steps below — you'll only need to do this once per session.
          </p>
        </div>

        {/* STEP 1: SPOTIFY */}
        <div style={card}>
          <p style={sectionTitle}>
            <span style={{ opacity: 0.5 }}>01 / </span>
            Spotify API Key <span style={{ color: 'var(--error)', marginLeft: 4, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>required</span>
          </p>
          <ApiKeyField
            description="Required to load and play tracks. Enter your Spotify client token below."
            sessionKey="spotify_api_key"
            linkText="How to get a Spotify API key"
            linkHref="https://developer.spotify.com/documentation/web-api"
          />
        </div>

        {/* STEP 2: OPENAI */}
        <div style={card}>
          <p style={sectionTitle}>
            <span style={{ opacity: 0.5 }}>02 / </span>
            OpenAI API Key <span style={{ color: 'var(--text-dim)', marginLeft: 4, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>optional</span>
          </p>
          <ApiKeyField
            description="Enables Whisper transcription and AI transcript polish for voice memos. Not required — the app works fully without it."
            sessionKey="openai_api_key"
            linkText="How to get an OpenAI API key"
            linkHref="https://platform.openai.com/api-keys"
          />
        </div>

        {/* STEP 3: AUDIO DEVICES */}
        <div style={card}>
          <p style={sectionTitle}>
            <span style={{ opacity: 0.5 }}>03 / </span>
            Audio Input & Output
          </p>
          <p style={bodyText}>
            Select your microphone and speaker, then run a 3-second test to confirm audio is working.
          </p>
          {!devicesLoaded ? (
            <button onClick={loadDevices} className="btn-ghost btn-small">
              Grant Mic Access & Load Devices
            </button>
          ) : (
            <>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={fieldLabel}>Microphone Input</label>
                <select value={selectedMicId} onChange={e => setSelectedMicId(e.target.value)} style={selectStyle}>
                  <option value="">System default</option>
                  {micDevices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={fieldLabel}>Speaker Output</label>
                {support?.audioOutputSelection ? (
                  <select value={selectedSpeakerId} onChange={e => setSelectedSpeakerId(e.target.value)} style={selectStyle}>
                    <option value="">System default</option>
                    {speakerDevices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label}</option>)}
                  </select>
                ) : (
                  <p style={{ ...bodyText, marginBottom: 0, fontStyle: 'italic' }}>
                    Output selection requires Chrome or Edge.
                  </p>
                )}
              </div>
              <MicTest selectedMicId={selectedMicId} selectedSpeakerId={selectedSpeakerId} />
            </>
          )}
        </div>

        {/* STEP 4: BROWSER COMPAT */}
        <div style={card}>
          <p style={sectionTitle}>
            <span style={{ opacity: 0.5 }}>04 / </span>
            Browser Compatibility
          </p>
          <p style={bodyText}>Chrome or Edge recommended for full feature support.</p>
          {support && (
            <div>
              <StatusBadge ok={support.speechRecognition} label="Web Speech API — live transcription" />
              <StatusBadge ok={support.mediaRecorder} label="MediaRecorder — audio recording" />
              <StatusBadge ok={support.fileSystemAccess} label="File System Access API — save to folder" />
              <StatusBadge ok={support.audioOutputSelection} label="Audio output device selection" />
              {Object.values(support).some(v => !v) && (
                <p style={{ ...bodyText, marginTop: '0.75rem', marginBottom: 0, fontStyle: 'italic' }}>
                  Some features are unavailable in this browser.
                </p>
              )}
            </div>
          )}
        </div>

        {/* ENTER APP */}
        <div style={{ textAlign: 'center', paddingTop: '0.5rem' }}>
          <p style={{ ...bodyText, marginBottom: '1rem' }}>
            {spotifyKeySaved
              ? "You're all set — click below to open the app."
              : 'Add your Spotify API key above to continue.'}
          </p>
          <button
            onClick={onEnter}
            className="btn-primary"
            style={{
              padding: '0.75rem 2.5rem',
              fontSize: '0.9rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              opacity: 1,
              cursor: 'pointer',
            }}
          >
            ENTER APP →
          </button>
          {!spotifyKeySaved && (
            <div style={{
              marginTop: '1.25rem',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              textAlign: 'left',
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--amber)' }}>
                ⚠ No Spotify key —
              </span>
              <span style={{ marginLeft: '0.25rem' }}>
                the app will work but playback won't be automatic. You'll need to manually
                play, pause and seek in the Spotify app while annotating.
              </span>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
