import { useEffect, useState } from 'react';

interface HowToUseProps {
  onClose: () => void;
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop: '1px solid var(--border)', marginTop: '0.5rem' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          textAlign: 'left',
          background: 'transparent',
          border: 'none',
          padding: '0.6rem 0',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.75rem',
          color: 'var(--amber)',
          letterSpacing: '0.12em',
        }}
        aria-expanded={open}
      >
        {title}
        <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginLeft: '0.5rem' }}>
          {open ? '▲' : '▼'}
        </span>
      </button>
      {open && (
        <div style={{ paddingBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {children}
        </div>
      )}
    </div>
  );
}

export function HowToUse({ onClose }: HowToUseProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <button style={styles.closeBtn} onClick={onClose} aria-label="Close help">✕</button>

        <div style={styles.content}>
          <p style={styles.mono as React.CSSProperties}>BEATPULSE — HOW TO USE</p>
          <p style={styles.body}>
            This tool helps you annotate music tracks. You work through each track in two parts.
          </p>

          <Section title="BEFORE YOU START">
            <ul style={styles.list}>
              <li style={styles.li}>Open Spotify on your phone or another device.</li>
              <li style={styles.li}>Have your annotation brief open for reference.</li>
              <li style={styles.li}>You'll need an OpenAI API key (entered once per session).</li>
            </ul>
          </Section>

          <Section title="THE FLOW">
            <p style={styles.body}>Each track follows this path:</p>
            <p style={styles.flow as React.CSSProperties}>
              SELECT TRACK → READY → LISTENING → MARK ENTRY → GLOBAL → REVIEW
            </p>
          </Section>

          <Section title="SELECT">
            <p style={styles.body}>
              Pick a track. Tracks show their status: Not Started / In Progress / Complete.
              <br />
              If a track is In Progress, you'll be asked to Resume or Start Over.
            </p>
          </Section>

          <Section title="READY">
            <p style={styles.body}>
              Check the track details. Enter your name if not already set. Press START when
              Spotify is playing and you're ready to annotate.
            </p>
          </Section>

          <Section title="LISTENING — most of your time is here">
            <p style={styles.body}>
              The timer runs. Listen actively. When something changes (new section, key moment):
            </p>
            <ul style={styles.list}>
              <li style={styles.li}>Press <span style={styles.key as React.CSSProperties}>M</span> or tap MARK THIS MOMENT to log the timestamp.</li>
              <li style={styles.li}>Press <span style={styles.key as React.CSSProperties}>Space</span> to pause/resume the timer.</li>
              <li style={styles.li}>Use DICTATE to speak a voice note instead of typing.</li>
              <li style={styles.li}>Tap the timer display to pause/resume.</li>
              <li style={styles.li}>You can edit or delete any section from this screen.</li>
            </ul>
            <p style={styles.body}>When you've captured everything, press DONE — PART 2.</p>
          </Section>

          <Section title="MARK ENTRY — opens over Listening">
            <p style={styles.body}>Fill in or edit a section. Fields:</p>
            <ul style={styles.list}>
              <li style={styles.li}><span style={styles.field as React.CSSProperties}>Timestamp</span> — set automatically. Edit if needed.</li>
              <li style={styles.li}><span style={styles.field as React.CSSProperties}>Section Type</span> — tap a chip or type your own.</li>
              <li style={styles.li}><span style={styles.field as React.CSSProperties}>Narrative</span> — your written observation. Can be AI-polished.</li>
              <li style={styles.li}><span style={styles.field as React.CSSProperties}>Tags</span> — optional freeform labels.</li>
            </ul>
            <p style={styles.body}>Press SAVE to return. Timer resumes automatically if it was running.</p>
          </Section>

          <Section title="GLOBAL ANALYSIS — Part 2">
            <p style={styles.body}>
              9 categories covering the track as a whole. Work through each one.
              <br />
              Each has guidance. You can mark N/A if a category doesn't apply.
              <br />
              A summary view shows all 9 before you move to Review.
            </p>
          </Section>

          <Section title="REVIEW">
            <p style={styles.body}>
              Read through everything. Edit any section or global entry if needed.
              <br />
              Run the Quality Check — it flags missing fields or issues.
              <br />
              Export to Excel when ready.
            </p>
          </Section>

          <Section title="AUTOSAVE">
            <p style={styles.body}>
              Your work saves automatically to your browser's local storage every 0.5 seconds.
              <br />
              If you close the tab, you'll be offered to Resume or Start Fresh on next open.
            </p>
          </Section>

          <Section title="EXPORT">
            <p style={styles.body}>
              Downloads an .xlsx workbook pre-filled with your annotations.
              <br />
              The file is named after you (your name + timestamp).
            </p>
          </Section>

          <Section title="KEYBOARD SHORTCUTS">
            <p style={styles.shortcut as React.CSSProperties}>
              <span style={styles.key as React.CSSProperties}>M</span>
              &nbsp;&nbsp;→&nbsp;&nbsp;Mark This Moment (Listening screen only)
            </p>
            <p style={styles.shortcut as React.CSSProperties}>
              <span style={styles.key as React.CSSProperties}>Space</span>
              &nbsp;&nbsp;→&nbsp;&nbsp;Pause / Resume timer (Listening screen only)
            </p>
          </Section>

          <Section title="TIPS FOR FOCUS">
            <ul style={styles.list}>
              <li style={styles.li}>Use Dictate if typing breaks your flow — speak, then edit the transcript.</li>
              <li style={styles.li}>Pause the timer anytime by tapping the timestamp display.</li>
              <li style={styles.li}>You can leave mid-track and come back — progress is always saved.</li>
              <li style={styles.li}>If something goes wrong, reload the page — your data will still be there.</li>
            </ul>
          </Section>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    zIndex: 200,
    background: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(3px)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    overflowY: 'auto' as const,
    padding: '2rem 1rem 3rem',
  },
  panel: {
    position: 'relative' as const,
    width: '100%',
    maxWidth: '600px',
    background: 'var(--surface)',
    border: '1px solid var(--border-active)',
    borderRadius: 'var(--radius)',
    padding: '2rem',
  },
  closeBtn: {
    position: 'absolute' as const,
    top: '1rem',
    right: '1rem',
    background: 'transparent',
    border: '1px solid var(--border-active)',
    borderRadius: '4px',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    lineHeight: 1,
  },
  content: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0',
    paddingRight: '1.5rem',
  },
  mono: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.8125rem',
    color: 'var(--amber)',
    letterSpacing: '0.1em',
    marginBottom: '0.5rem',
  },
  body: {
    fontFamily: 'var(--font-serif)',
    fontSize: '0.9rem',
    color: 'var(--text)',
    lineHeight: 1.6,
    margin: '0',
  },
  flow: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    letterSpacing: '0.05em',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '0.5rem 0.75rem',
    margin: '0.25rem 0',
  },
  list: {
    paddingLeft: '1.25rem',
    margin: '0.25rem 0',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.25rem',
  },
  li: {
    fontFamily: 'var(--font-serif)',
    fontSize: '0.9rem',
    color: 'var(--text)',
    lineHeight: 1.55,
  },
  key: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    color: 'var(--amber)',
    background: 'var(--amber-bg)',
    border: '1px solid var(--border-active)',
    borderRadius: '3px',
    padding: '0 0.3rem',
  },
  field: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
  },
  shortcut: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.8125rem',
    color: 'var(--text)',
    margin: '0.25rem 0',
  },
};
