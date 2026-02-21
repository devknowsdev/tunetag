import ExcelJS from 'exceljs';
import type { TrackAnnotation } from '../types';
import { MAX_TIMELINE_ROWS } from './schema';

// Timezone-safe Excel time serial: fractional day
// [m]:ss format displays as minutes:seconds without date offset
function parseTimestampToExcelSerial(mss: string): number | null {
  const match = mss.trim().match(/^(\d+):([0-5]\d)$/);
  if (!match) return null;
  const m = parseInt(match[1], 10);
  const s = parseInt(match[2], 10);
  return (m * 60 + s) / 86400;
}

export async function exportAnnotationsToExcel(
  templateBuffer: ArrayBuffer,
  annotations: TrackAnnotation[]
): Promise<Blob> {
  // 1. Load template
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(templateBuffer);

  // 2. Process each annotation
  for (const annotation of annotations) {
    const ws = wb.getWorksheet(annotation.track.sheetName);
    if (!ws) {
      console.error(`Sheet not found: ${annotation.track.sheetName}`);
      continue; // skip — do not exit
    }

    if (
      annotation.status !== 'complete' &&
      annotation.status !== 'skipped'
    ) {
      continue; // not_started or in_progress — skip
    }

    // 3. ALWAYS clear all 10 timeline rows first
    for (let i = 0; i < 10; i++) {
      const row = 6 + i;
      ws.getCell(`A${row}`).value = null;
      ws.getCell(`B${row}`).value = null;
      ws.getCell(`C${row}`).value = null;
      ws.getCell(`D${row}`).value = null;
    }

    // 4. Write annotator name
    ws.getCell('B2').value = annotation.annotator;

    if (annotation.status === 'complete') {
      // 4a. Cap entries at MAX_TIMELINE_ROWS
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
          ws.getCell(`A${rowNum}`).value = entry.timestamp; // string fallback
        }

        ws.getCell(`B${rowNum}`).value = entry.sectionType;
        ws.getCell(`C${rowNum}`).value = entry.narrative;
        ws.getCell(`D${rowNum}`).value = entry.tags;
      }

      // Global — write to column C ONLY (never touch column B guidance text)
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
      // SKIPPED TRACK — minimal writes only
      ws.getCell('C6').value = 'SKIPPED';
      ws.getCell('C19').value = annotation.skipReason
        ? `Skipped — ${annotation.skipReason}`
        : 'Skipped — annotator elected to skip this track';
      // All other cells remain as cleared in step 3
    }
  }

  // 5. Return blob
  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export function downloadBlob(
  blob: Blob,
  annotatorName: string
): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `TuneTag_${annotatorName.replace(/\s+/g, '_')}_${Date.now()}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
