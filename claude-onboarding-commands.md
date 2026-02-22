# TuneTag Annotator — Fresh Claude Onboarding Commands
# Run all of these and paste the output into a new Claude chat.

cd "/Users/duif/DK APP DEV/TuneTag/tunetag-annotator"

# --- Project structure ---
find . -maxdepth 4 -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/dist/*'

# --- Config files ---
cat package.json
cat vite.config.ts
cat wrangler.jsonc
cat tsconfig.json

# --- Handover docs ---
cat "HANDOVER 12pm.md"

# --- Entry points ---
cat src/main.tsx
cat src/App.tsx

# --- Types ---
cat src/types/index.ts

# --- Components ---
cat src/components/SetupScreen.tsx
cat src/components/PhaseListening.tsx
cat src/components/PhaseMarkEntry.tsx
cat src/components/PhaseGlobal.tsx
cat src/components/PhaseReady.tsx
cat src/components/PhaseReview.tsx
cat src/components/PhaseSelect.tsx
cat src/components/SpotifyPlayer.tsx
cat src/components/RecordingsPanel.tsx
cat src/components/LintPanel.tsx
cat src/components/HowToUse.tsx
cat src/components/AppSidebar.tsx
cat src/components/WaveformScrubber.tsx

# --- Hooks ---
cat src/hooks/useAnnotationState.ts
cat src/hooks/useAudioRecorder.ts
cat src/hooks/useDictation.ts
cat src/hooks/useMicMeter.ts
cat src/hooks/useAudioDevices.ts
cat src/hooks/useSpotifyPlayer.ts
cat src/hooks/useKeyboardShortcuts.ts
cat src/hooks/useTimer.ts
cat src/hooks/index.ts

# --- Lib ---
cat src/lib/schema.ts
cat src/lib/spotifyAuth.ts
cat src/lib/spotifyApi.ts
cat src/lib/excelExport.ts
cat src/lib/lintAnnotation.ts
cat src/lib/polishText.ts
cat src/lib/tagPacks.ts
cat src/lib/tagLibrary.ts
cat src/lib/tagImport.ts
cat src/lib/phraseBuilder.ts
cat src/lib/loadResearchedPacks.ts

# --- CSS ---
cat src/index.css

# --- Recent git history ---
git log --oneline -10

# --- TypeScript check ---
npx tsc --noEmit

# --- Line counts (to spot big files) ---
wc -l src/**/*.{ts,tsx,css} src/*.{ts,tsx} | sort -rn
