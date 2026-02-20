# BeatPulse Annotator

A focused React + TypeScript music annotation tool for BeatPulse Labs structured data work.

## Setup

```bash
cd beatpulse-annotator
npm install
npm run dev
```

Open http://localhost:5173

## Before running

The file `public/template.xlsx` must be present (it is included in this project).

## Validate Excel export

Run this before submitting to BeatPulse:

```bash
npx tsx scripts/validateExport.ts
```

Must exit with code 0. It writes a test export to `/tmp/beatpulse_test_export.xlsx` — open that in Excel or LibreOffice to visually verify:
- Timestamps show as `0:15` not `0.010416...`
- Column B guidance text in Part 2 is untouched
- Example sheet is exactly as received

## Key edge cases addressed in this build

1. **`wasTimerRunning`** — captures the timer state *before* the pause fires. Not hardcoded `true`.
2. **`setAnnotator()`** — updates both the `beatpulse_annotator` localStorage key AND all track annotations, so `B2` always has the current name.
3. **`elapsedSeconds`** — written back to `TrackAnnotation` on every timer tick via the `onTick` callback.
4. **Skipped tracks** — clears all 10 timeline rows first, then writes `SKIPPED` to C6 and reason to C19 only. Nothing else.

## Dictate feature

Press **🎙 Dictate** in the listening screen:
1. App timer pauses and the captured timestamp is saved
2. Spotify can't be controlled programmatically — you'll be prompted to pause it manually
3. Press **Start Recording** — uses the browser's Web Speech API (Chrome recommended)
4. Press **Stop Recording** to finish
5. Review transcript → **Use Transcript →** opens Mark Entry with it pre-filled
6. If refreshed mid-flow, the captured transcript lives in the `markEntryDraft` (persisted to localStorage), so you won't lose it after the recording step completes

Speech recognition requires Chrome or another browser with Web Speech API support.

## Pre-submission checklist

- [ ] Run `npx tsx scripts/validateExport.ts` — exits 0
- [ ] Open exported `.xlsx` — timestamps show as `0:15`
- [ ] Part 2 column B guidance text untouched
- [ ] Example sheet untouched
- [ ] In-app lint panel shows zero errors

## Architecture notes

- `src/lib/schema.ts` — single source of truth for all content (tracks, categories, style rules, tag suggestions). Future template parser replaces this file only.
- `src/lib/excelExport.ts` — `exceljs` only. Timestamps are fractional day serials `(m*60+s)/86400`, never JS Date objects.
- API key is runtime-only — entered in the UI, stored in `sessionStorage`, never in `.env` or code.
- Autosave debounces at 500ms to `localStorage` key `beatpulse_v1`.
