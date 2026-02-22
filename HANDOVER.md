# TuneTag Annotator — Project Handover Doc
*Last updated: 21 February 2026*

---

## Project Overview

**App:** TuneTag Annotator  
**Purpose:** Real-time audio annotation tool for music supervisors and sound editors. Annotate Spotify tracks with timestamped notes, record voice memos, export to Excel.  
**Stack:** React + TypeScript + Vite  
**Repo:** GitHub (main branch, always up to date)  
**Live URL:** https://tunetag.devknowsdev.workers.dev/  
**Hosting:** Cloudflare Pages (via Wrangler)  
**Local dev:** `npm run dev` → http://127.0.0.1:5173  

---

## Key File Paths

```
/Users/duif/DK APP DEV/TuneTag/tunetag-annotator          ← live project
/Users/duif/DK APP DEV/TuneTag/tunetag-annotator BACKUP.zip ← original backup
```

### Source structure
```
src/
├── App.tsx                          ← root component, all state, phase routing
├── main.tsx                         ← entry point
├── index.css                        ← all CSS vars, dark/light theme (770 lines)
├── global.d.ts                      ← global type declarations
├── types/index.ts                   ← shared types incl. RecordingEntry
├── components/
│   ├── SetupScreen.tsx              ← NEW — onboarding/setup screen (written this session, save manually)
│   ├── ApiKeyGate.tsx               ← OLD — to be deleted once SetupScreen is wired in
│   ├── PhaseListening.tsx           ← largest file (1254 lines) — needs refactor
│   ├── PhaseMarkEntry.tsx
│   ├── PhaseGlobal.tsx
│   ├── PhaseReady.tsx
│   ├── PhaseReview.tsx
│   ├── PhaseSelect.tsx
│   ├── SpotifyPlayer.tsx
│   ├── HowToUse.tsx
│   └── LintPanel.tsx
├── hooks/
│   ├── useAnnotationState.ts
│   ├── useAudioDevices.ts
│   ├── useKeyboardShortcuts.ts
│   ├── useSpotifyPlayer.ts
│   └── useTimer.ts
└── lib/
    ├── excelExport.ts
    ├── lintAnnotation.ts
    ├── polishText.ts                ← uses OpenAI API for transcript polish
    ├── schema.ts
    ├── spotifyApi.ts
    └── spotifyAuth.ts               ← REDIRECT_URI needs updating (see below)
```

---

## What Was Built This Session

### 1. Audio Recording + Dictation (Prompts 1–4, Claude Code)
- `RecordingEntry` type added to `src/types/index.ts`
- `App.tsx` — recordings state + `addRecording`, `deleteRecording`, `clearRecordings`
- `PhaseListening.tsx` — extended with:
  - Parallel MediaRecorder + Web Speech API on shared mic stream
  - Mic level meter (20-bar canvas, ~15fps via AudioContext + AnalyserNode)
  - Static waveform per saved recording (60-bar SVG via `decodeAudioData`)
  - `<audio controls>` player per recording
  - USE TRANSCRIPT / DOWNLOAD / DELETE per card
  - Whisper transcription via OpenAI API with inline key prompt (sessionStorage)
  - Collapsible RECORDINGS panel, auto-expands on new entry
  - Save to folder (File System Access API), DELETE ALL TRACK, DELETE SESSION
  - Save/Discard confirmation dialog before any delete
  - `beforeunload` warning when unsaved recordings exist
  - FINALIZING RECORDING… → AUDIO SAVED ✓ states
  - Live transcript display with 5s no-speech hint
  - Non-fatal transcript failure (audio saved even if no transcript)
  - Session-only notice at top of recordings panel

### 2. Launch Stabilisation
- `vite.config.ts` — server host/port/strictPort added
- `package.json` — `dev:chrome` script added
- `scripts/open-chrome.sh` — created and made executable

### 3. SetupScreen (written this session, not yet committed)
- `src/components/SetupScreen.tsx` — full onboarding screen replacing `ApiKeyGate.tsx`
  - Hero / about section
  - Spotify API key input (required)
  - OpenAI API key input (optional)
  - Audio device selection (mic + speaker) with permission request
  - 3-second mic test with level meter + playback
  - Browser compatibility checklist (4 APIs detected at runtime)
  - Enter App button (disabled until Spotify key saved)

---

## Pending Manual Changes (before next Claude Code session)

| # | File | Action | Status |
|---|------|---------|--------|
| 1 | `src/components/SetupScreen.tsx` | Save the file written this session | ⏳ Save manually |
| 2 | `src/App.tsx` | Swap `ApiKeyGate` import → `SetupScreen` | ⏳ Edit manually |
| 3 | `src/lib/spotifyAuth.ts` | Update REDIRECT_URI to dynamic `window.location.origin + '/callback'` | ⏳ Edit manually |

### App.tsx changes needed:
```ts
// REMOVE:
import ApiKeyGate from './components/ApiKeyGate'
// ADD:
import SetupScreen from './components/SetupScreen'

// REMOVE:
<ApiKeyGate ... />
// ADD:
<SetupScreen onEnter={(key) => { /* existing handler */ }} />
```

### spotifyAuth.ts change needed:
```ts
// REMOVE whatever is hardcoded, ADD:
const REDIRECT_URI = window.location.origin + '/callback'
```

---

## Planned Refactor (Claude Code — next session)

`PhaseListening.tsx` at 1254 lines needs splitting into focused files.
Run these prompts one at a time, confirming `npx tsc --noEmit` clean after each.

| Prompt | Action |
|--------|--------|
| 1 | Housekeeping — `.gitignore` DS_Store, delete `netlify.toml`, review `scripts/` |
| 2 | Extract `src/hooks/useMicMeter.ts` |
| 3 | Extract `src/hooks/useAudioRecorder.ts` |
| 4 | Extract `src/hooks/useDictation.ts` |
| 5 | Extract `src/components/RecordingsPanel.tsx` |
| 6 | Final cleanup — verify PhaseListening < 300 lines, barrel file `src/hooks/index.ts` |
| 7 | Commit and push |

---

## Spotify Developer Setup

**Dashboard:** https://developer.spotify.com/dashboard  
**App:** TuneTag (existing — do NOT delete, 24hr creation limit applies)  

**Settings to confirm:**
- ✅ Web API — enabled
- ✅ Web Playback SDK — enabled
- ❌ Android SDK — off
- ❌ iOS SDK — off
- ❌ App Remote SDK — off

**Redirect URIs to add:**
```
https://tunetag.devknowsdev.workers.dev/callback
http://127.0.0.1:5173/callback
```

**Note:** App is in Development Mode — add your Spotify account email as a test user to use the live deployment. For public access, submit a quota extension request explaining the app's purpose.

---

## Cloudflare Deployment

**Live URL:** https://tunetag.devknowsdev.workers.dev/  
**Config file:** `wrangler.jsonc` in project root  
**Deploy:** automatic on push to `main`, or retrigger from Cloudflare dashboard  

`wrangler.jsonc` content:
```json
{
  "name": "tunetag-annotator",
  "compatibility_date": "2026-02-21",
  "assets": {
    "directory": "./dist"
  }
}
```

---

## Useful Terminal Commands

```bash
# Navigate to project
cd "/Users/duif/DK APP DEV/TuneTag/tunetag-annotator"

# Run locally
npm run dev

# TypeScript check
npx tsc --noEmit

# Build for production
npm run build

# Commit and push
git add .
git commit -m "your message"
git push

# Check recent commits
git log --oneline -5

# Check file sizes
wc -l src/**/*.{ts,tsx,css} src/*.{ts,tsx,css} | sort -rn

# Check folder sizes
du -sh src/* | sort -rh
```

---

## Session Keys (stored in sessionStorage, cleared on tab close)

| Key | Purpose |
|-----|---------|
| `spotify_api_key` | Spotify client token |
| `openai_api_key` | OpenAI key for Whisper + text polish |

---

## Known Issues / Notes

- `PhaseListening.tsx` is 1254 lines — functional but needs refactor for maintainability
- `netlify.toml` still in repo — safe to delete (no longer using Netlify)
- `.DS_Store` in `src/` — add to `.gitignore` and delete
- Build warning: JS bundle is 1.17MB — will improve naturally after refactor introduces code splitting opportunities
- OpenAI "AI Style Clean-Up" label in UI is vague — consider renaming to "Whisper Transcription" during refactor
