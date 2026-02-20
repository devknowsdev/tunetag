import { useState } from 'react';

interface Props {
  onDone: () => void;
}

export function ApiKeyGate({ onDone }: Props) {
  const [key, setKey] = useState('');

  function handleEnable() {
    if (key.trim()) {
      sessionStorage.setItem('beatpulse_api_key', key.trim());
    }
    onDone();
  }

  function handleSkip() {
    onDone();
  }

  return (
    <div className="gate-overlay">
      <div className="gate-card">
        <p className="label" style={{ marginBottom: '1rem' }}>
          AI STYLE CLEAN-UP
        </p>
        <p style={{ color: 'var(--text)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          AI style clean-up is available for this session. Enter your Anthropic
          API key to enable it. The key is held in memory only and cleared when
          you close the tab. It is never sent anywhere except Anthropic's API.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="sk-ant-..."
            onKeyDown={(e) => e.key === 'Enter' && handleEnable()}
            style={{
              flex: 1,
              padding: '0.625rem 0.75rem',
              background: 'var(--bg)',
              border: '1px solid var(--border-active)',
              borderRadius: 'var(--radius)',
              color: 'var(--text)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.875rem',
            }}
          />
          <button className="btn-primary" onClick={handleEnable}>
            Enable
          </button>
        </div>
        <button
          className="btn-link"
          onClick={handleSkip}
          style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}
        >
          Skip — annotate without style clean-up
        </button>
      </div>
    </div>
  );
}
