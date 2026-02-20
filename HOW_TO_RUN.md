# Running BeatPulse Locally

## First time only

Open Terminal, navigate to this folder, and run:

    npm install

This installs all dependencies. Takes about 1 minute. You only do this once.

## Every time you want to use it

### Option A — Terminal (recommended)

    cd /Users/duif/DK\ APP\ DEV/BeatPulseLab/beatpulse-annotator
    npm run dev

Then open http://localhost:5173 in Chrome or Edge.

### Option B — Auto-open browser

    npm run start:local

### Option C — Shell script

Double-click start.sh in Finder.
If macOS says it can't be opened: right-click → Open → Open.

## To stop the app

Press Ctrl+C in the Terminal window that's running it.

## Your data

All annotation progress saves automatically in your browser's local storage.
It persists between sessions. To reset: clear site data for localhost in Chrome
(Settings → Privacy → Clear browsing data → check only "Site data" → clear for localhost).

## API Key

You'll be asked for an OpenAI API key once per browser session.
Get one at https://platform.openai.com
The key is stored in sessionStorage only (gone when you close the tab).

## Updating the track list

Edit src/lib/schema.ts and replace the TRACKS array with your track data.
Each track needs: id, artist, name, spotifyId, spotifyUrl, sheetName, audioLabel.
Restart the dev server after saving.
