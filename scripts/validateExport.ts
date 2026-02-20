/**
 * BeatPulse Export Validation Script
 * Run: npx tsx scripts/validateExport.ts
 * Must exit with code 0 before submission.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Types (inline to avoid Vite-specific path issues in Node) ─────────────────
interface TimelineEntry {
  id: string;
  timestamp: string;
  sectionType: string;
  narrative: string;
  narrativeRaw: string;
  tags: string;
  wasPolished: boolean;
}

interface GlobalAnalysis {
  genre: string;
  instrumentation: string;
  mix: string;
  playing: string;
  vocals: string;
  emotion: string;
  lyrics: string;
  quality: string;
  wow: string;
}

interface Track {
  id: number;
  artist: string;
  name: string;
  spotifyId: string;
  spotifyUrl: string;
  sheetName: string;
  audioLabel: string;
}

interface TrackAnnotation {
  track: Track;
  annotator: string;
  timeline: TimelineEntry[];
  global: Partial<GlobalAnalysis>;
  status: 'not_started' | 'in_progress' | 'complete' | 'skipped';
  skipReason?: string;
  elapsedSeconds: number;
}

// ── Inline export logic (mirrors src/lib/excelExport.ts) ─────────────────────
const MAX_TIMELINE_ROWS = 10;

function parseTimestampToExcelSerial(mss: string): number | null {
  const match = mss.trim().match(/^(\d+):([0-5]\d)$/);
  if (!match) return null;
  const m = parseInt(match[1], 10);
  const s = parseInt(match[2], 10);
  return (m * 60 + s) / 86400;
}

async function exportAnnotationsToExcel(
  templateBuffer: Buffer,
  annotations: TrackAnnotation[]
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(templateBuffer);

  for (const annotation of annotations) {
    const ws = wb.getWorksheet(annotation.track.sheetName);
    if (!ws) {
      console.error(`Sheet not found: ${annotation.track.sheetName}`);
      continue;
    }

    if (annotation.status !== 'complete' && annotation.status !== 'skipped') {
      continue;
    }

    // Clear all 10 timeline rows
    for (let i = 0; i < 10; i++) {
      const row = 6 + i;
      ws.getCell(`A${row}`).value = null;
      ws.getCell(`B${row}`).value = null;
      ws.getCell(`C${row}`).value = null;
      ws.getCell(`D${row}`).value = null;
    }

    ws.getCell('B2').value = annotation.annotator;

    if (annotation.status === 'complete') {
      const entries = annotation.timeline.slice(0, MAX_TIMELINE_ROWS);
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const rowNum = 6 + i;

        const serial = parseTimestampToExcelSerial(entry.timestamp);
        if (serial !== null) {
          const cell = ws.getCell(`A${rowNum}`);
          cell.value = serial;
          cell.numFmt = '[m]:ss';
        } else {
          ws.getCell(`A${rowNum}`).value = entry.timestamp;
        }

        ws.getCell(`B${rowNum}`).value = entry.sectionType;
        ws.getCell(`C${rowNum}`).value = entry.narrative;
        ws.getCell(`D${rowNum}`).value = entry.tags;
      }

      const g = annotation.global as Record<string, string>;
      ws.getCell('C19').value = g['genre'] ?? '';
      ws.getCell('C20').value = g['instrumentation'] ?? '';
      ws.getCell('C21').value = g['mix'] ?? '';
      ws.getCell('C22').value = g['playing'] ?? '';
      ws.getCell('C23').value = g['vocals'] ?? '';
      ws.getCell('C24').value = g['emotion'] ?? '';
      ws.getCell('C25').value = g['lyrics'] ?? '';
      ws.getCell('C26').value = g['quality'] ?? '';
      ws.getCell('C27').value = g['wow'] ?? '';
    } else if (annotation.status === 'skipped') {
      ws.getCell('C6').value = 'SKIPPED';
      ws.getCell('C19').value = annotation.skipReason
        ? `Skipped — ${annotation.skipReason}`
        : 'Skipped — annotator elected to skip this track';
    }
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

// ── Assertion helpers ─────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string, detail?: string): void {
  if (condition) {
    console.log(`  ✓ PASS: ${label}`);
    passed++;
  } else {
    console.log(`  ✗ FAIL: ${label}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

// ── Test data ─────────────────────────────────────────────────────────────────
const TRACKS: Track[] = [
  {
    id: 1,
    artist: 'C. Tangana',
    name: 'Nunca Estoy',
    spotifyId: '6N4ioa3XSbvjmwdVEERl8F',
    spotifyUrl: 'https://open.spotify.com/track/6N4ioa3XSbvjmwdVEERl8F',
    sheetName: 'Track 1',
    audioLabel: '',
  },
  {
    id: 2,
    artist: 'Izi',
    name: 'Chic',
    spotifyId: '7jUJ2RmT4PFHHq4goMWqm3',
    spotifyUrl: 'https://open.spotify.com/track/7jUJ2RmT4PFHHq4goMWqm3',
    sheetName: 'Track 2',
    audioLabel: '',
  },
  {
    id: 3,
    artist: 'Solomon Ray',
    name: 'Find Your Rest',
    spotifyId: '3XZMl51zqZDdAb0rwzSuxz',
    spotifyUrl: 'https://open.spotify.com/track/3XZMl51zqZDdAb0rwzSuxz',
    sheetName: 'Track 3',
    audioLabel: '',
  },
];

const TEST_ANNOTATOR = 'Test Validator';

const fakeAnnotations: TrackAnnotation[] = [
  {
    track: TRACKS[0],
    annotator: TEST_ANNOTATOR,
    timeline: [
      {
        id: 'e1',
        timestamp: '0:15',
        sectionType: 'Intro',
        narrative: 'Sparse guitar opens over ambient pad.',
        narrativeRaw: 'Sparse guitar opens over ambient pad.',
        tags: 'Acoustic Guitar, Pads, Lo-fi',
        wasPolished: false,
      },
      {
        id: 'e2',
        timestamp: '1:02',
        sectionType: 'Verse',
        narrative: 'Vocals enter with a relaxed delivery over soft drums.',
        narrativeRaw: 'Vocals enter with a relaxed delivery over soft drums.',
        tags: 'Male Vocals, Drums, Intimate',
        wasPolished: false,
      },
      {
        id: 'e3',
        timestamp: '2:30',
        sectionType: 'Chorus',
        narrative: 'Energy lifts as harmonies swell and synth pads thicken.',
        narrativeRaw: 'Energy lifts as harmonies swell and synth pads thicken.',
        tags: 'Harmonies, Synth, Euphoric',
        wasPolished: false,
      },
    ],
    global: {
      genre: 'Indie Pop, 2020s',
      instrumentation: 'Acoustic guitar, pads, synth, drums',
      mix: 'Warm, slightly wet reverb, intimate staging',
      playing: 'Loose and human, deliberate pacing',
      vocals: 'Soft male baritone, breathy, intimate delivery',
      emotion: 'Melancholic warmth, slow build to emotional peak',
      lyrics: 'Themes of longing and absence',
      quality: 'Professional, clean mix, intentional lo-fi warmth',
      wow: 'The harmonic convergence in the chorus creates unexpected emotional weight despite the sparse arrangement — a cinematic moment from minimal elements.',
    },
    status: 'complete',
    elapsedSeconds: 900,
  },
  {
    track: TRACKS[1],
    annotator: TEST_ANNOTATOR,
    timeline: [],
    global: {},
    status: 'skipped',
    skipReason: 'Genre too far outside expertise',
    elapsedSeconds: 0,
  },
  {
    track: TRACKS[2],
    annotator: '',
    timeline: [],
    global: {},
    status: 'not_started',
    elapsedSeconds: 0,
  },
];

// ── Run tests ─────────────────────────────────────────────────────────────────
async function run() {
  const templatePath = path.join(__dirname, '..', 'public', 'template.xlsx');

  if (!fs.existsSync(templatePath)) {
    console.error('ERROR: public/template.xlsx not found. Copy it before running.');
    process.exit(1);
  }

  // Load original template values for unchanged-cell checks
  const originalBuffer = fs.readFileSync(templatePath);
  const originalWb = new ExcelJS.Workbook();
  await originalWb.xlsx.load(originalBuffer);

  const origTrack1 = originalWb.getWorksheet('Track 1')!;
  const origTrack2 = originalWb.getWorksheet('Track 2')!;
  const origTrack3 = originalWb.getWorksheet('Track 3')!;
  const origExample = originalWb.getWorksheet('Example')!;

  const origA1_T1 = origTrack1.getCell('A1').value;
  const origB1_T1 = origTrack1.getCell('B1').value;
  const origA2_T1 = origTrack1.getCell('A2').value;
  const origB19_T1 = origTrack1.getCell('B19').value;
  const origB2_T3 = origTrack3.getCell('B2').value;
  const origExA1 = origExample.getCell('A1').value;
  const origExA3 = origExample.getCell('A3').value;

  // Run export
  const exportedBuffer = await exportAnnotationsToExcel(originalBuffer, fakeAnnotations);

  // Write for inspection
  const outputPath = '/tmp/beatpulse_test_export.xlsx';
  fs.writeFileSync(outputPath, exportedBuffer);
  console.log(`\nExported to: ${outputPath}\n`);

  // Reload for assertions
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(exportedBuffer);

  // ── SHEET PRESENCE ────────────────────────────────────────────────────────
  console.log('── Sheet presence:');
  assert(!!wb.getWorksheet('Track 1'), 'Track 1 sheet present');
  assert(!!wb.getWorksheet('Track 2'), 'Track 2 sheet present');
  assert(!!wb.getWorksheet('Track 3'), 'Track 3 sheet present');
  assert(!!wb.getWorksheet('Example'), 'Example sheet present');

  // ── COMPLETE TRACK (Track 1) ──────────────────────────────────────────────
  console.log('\n── Track 1 (complete):');
  const ws1 = wb.getWorksheet('Track 1')!;

  assert(
    ws1.getCell('B2').value === TEST_ANNOTATOR,
    'B2 = annotator name',
    `Got: ${ws1.getCell('B2').value}`
  );

  // Unchanged template cells
  assert(String(ws1.getCell('A1').value) === String(origA1_T1), 'A1 unchanged');
  assert(String(ws1.getCell('B1').value) === String(origB1_T1), 'B1 unchanged');
  assert(String(ws1.getCell('A2').value) === String(origA2_T1), 'A2 unchanged ("ANNOTATOR")');

  // Timestamp: A6 must be numeric serial
  const a6Cell = ws1.getCell('A6');
  const a6 = a6Cell.value;
  assert(typeof a6 === 'number', 'A6 is numeric (Excel serial)', `Got type: ${typeof a6}`);

  // FIX #11: explicitly verify numFmt is set to [m]:ss
  assert(
    a6Cell.numFmt === '[m]:ss',
    'A6 numFmt is [m]:ss',
    `Got: ${a6Cell.numFmt}`
  );

  if (typeof a6 === 'number') {
    // 0:15 = 15 seconds = 15/86400
    const expectedSerial = 15 / 86400;
    const delta = Math.abs(a6 - expectedSerial);
    assert(delta < 0.000001, 'A6 serial round-trips to 15 seconds', `Got: ${a6}, expected: ${expectedSerial}`);
  }

  assert(ws1.getCell('B6').value === 'Intro', 'B6 = first sectionType');
  assert(
    ws1.getCell('C6').value === 'Sparse guitar opens over ambient pad.',
    'C6 = first narrative'
  );
  assert(ws1.getCell('D6').value === 'Acoustic Guitar, Pads, Lo-fi', 'D6 = first tags');

  // Global
  assert(ws1.getCell('C19').value === 'Indie Pop, 2020s', 'C19 = genre');
  assert(
    typeof ws1.getCell('C27').value === 'string' &&
      (ws1.getCell('C27').value as string).length > 0,
    'C27 = wow factor (non-empty)'
  );

  // Column B guidance text in Part 2 must be UNCHANGED
  assert(
    String(ws1.getCell('B19').value) === String(origB19_T1),
    'B19 guidance text unchanged'
  );

  // Unused timeline rows cleared
  for (let r = 9; r <= 15; r++) {
    const val = ws1.getCell(`A${r}`).value;
    assert(
      val === null || val === undefined || val === '',
      `A${r} is empty (cleared)`
    );
  }

  // ── SKIPPED TRACK (Track 2) ───────────────────────────────────────────────
  console.log('\n── Track 2 (skipped):');
  const ws2 = wb.getWorksheet('Track 2')!;

  assert(ws2.getCell('B2').value === TEST_ANNOTATOR, 'B2 = annotator name');
  assert(ws2.getCell('C6').value === 'SKIPPED', 'C6 = "SKIPPED"');

  const c19Val = String(ws2.getCell('C19').value ?? '');
  assert(
    c19Val.includes('Genre too far outside expertise'),
    'C19 contains skip reason',
    `Got: ${c19Val}`
  );

  const c7Val = ws2.getCell('C7').value;
  assert(
    c7Val === null || c7Val === undefined || c7Val === '',
    'C7 is empty (not overwritten)'
  );

  // ── NOT_STARTED TRACK (Track 3) ───────────────────────────────────────────
  console.log('\n── Track 3 (not_started — should be untouched):');
  const ws3 = wb.getWorksheet('Track 3')!;

  // B2 should equal the original template value (not our annotator name)
  assert(
    String(ws3.getCell('B2').value ?? '') === String(origB2_T3 ?? ''),
    'B2 unchanged from template (not_started track not written)',
    `Got: ${ws3.getCell('B2').value}, expected: ${origB2_T3}`
  );

  // ── EXAMPLE SHEET — completely untouched ──────────────────────────────────
  console.log('\n── Example sheet (must be untouched):');
  const exSheet = wb.getWorksheet('Example')!;
  assert(
    String(exSheet.getCell('A1').value) === String(origExA1),
    'Example A1 unchanged'
  );
  assert(
    String(exSheet.getCell('A3').value) === String(origExA3),
    'Example A3 unchanged'
  );

  // FIX #11: scan all three Track sheets for #REF! / formula errors
  console.log('\n── Formula error scan (all Track sheets):');
  for (const sheetName of ['Track 1', 'Track 2', 'Track 3']) {
    const ws = wb.getWorksheet(sheetName)!;
    let errorFound = false;
    ws.eachRow((row) => {
      row.eachCell((cell) => {
        const v = cell.value;
        if (v && typeof v === 'object' && 'error' in (v as any)) {
          errorFound = true;
        }
        if (typeof v === 'string' && (v.startsWith('#REF!') || v.startsWith('#NAME?'))) {
          errorFound = true;
        }
      });
    });
    assert(!errorFound, `${sheetName}: no formula errors`);
  }

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  console.log(`\n══════════════════════════════════════════`);
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log(`══════════════════════════════════════════\n`);

  if (failed > 0) {
    console.log('❌ Validation FAILED — fix issues before submitting.');
    process.exit(1);
  } else {
    console.log('✅ All checks passed — export is valid.');
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
