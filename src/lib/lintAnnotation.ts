import type { TrackAnnotation, LintResult, LintIssue, Phase } from '../types';
import { MAX_TIMELINE_ROWS, GLOBAL_CATEGORIES } from './schema';

export function lintAnnotation(annotation: TrackAnnotation): LintResult {
  const issues: LintIssue[] = [];

  // ── ERRORS ──────────────────────────────────────────────────────────────────

  if (!annotation.annotator.trim()) {
    issues.push({
      field: 'Annotator Name',
      severity: 'error',
      message: 'Annotator name is required',
      phase: 'ready',
    });
  }

  if (annotation.timeline.length === 0) {
    issues.push({
      field: 'Timeline',
      severity: 'error',
      message: 'No sections logged — add at least one timeline entry',
      phase: 'listening',
    });
  }

  if (annotation.timeline.length > MAX_TIMELINE_ROWS) {
    issues.push({
      field: 'Timeline',
      severity: 'error',
      message: `Too many sections (${annotation.timeline.length}) — maximum is ${MAX_TIMELINE_ROWS}`,
      phase: 'listening',
    });
  }

  for (let i = 0; i < annotation.timeline.length; i++) {
    const entry = annotation.timeline[i];
    if (!entry.sectionType.trim()) {
      issues.push({
        field: `Timeline row ${i + 1}`,
        severity: 'error',
        message: 'Missing section type',
        phase: 'listening',
      });
    }
    if (!entry.narrative.trim()) {
      issues.push({
        field: `Timeline row ${i + 1}`,
        severity: 'error',
        message: 'Missing narrative description',
        phase: 'listening',
      });
    }
  }

  for (const cat of GLOBAL_CATEGORIES) {
    if (!cat.canBeNA) {
      const val = (annotation.global as Record<string, string>)[cat.key];
      if (!val || !val.trim()) {
        issues.push({
          field: cat.displayLabel,
          severity: 'error',
          message: `Required global category is empty`,
          phase: 'global',
        });
      }
    }
  }

  // ── WARNINGS ─────────────────────────────────────────────────────────────────

  if (
    annotation.timeline.length > 0 &&
    annotation.timeline.length < 3
  ) {
    issues.push({
      field: 'Timeline',
      severity: 'warning',
      message: `Only ${annotation.timeline.length} section${annotation.timeline.length === 1 ? '' : 's'} logged — consider adding more structural detail`,
      phase: 'listening',
    });
  }

  for (let i = 0; i < annotation.timeline.length; i++) {
    const entry = annotation.timeline[i];
    const rowLabel = `Timeline row ${i + 1}`;

    if (/\bI\b/.test(entry.narrative)) {
      issues.push({
        field: rowLabel,
        severity: 'warning',
        message: 'Appears to use first-person — check before submitting',
        phase: 'listening',
      });
    }

    if (/^(In this song|This track|The song)/i.test(entry.narrative)) {
      issues.push({
        field: rowLabel,
        severity: 'warning',
        message: "Avoid referential openers ('In this song', 'This track')",
        phase: 'listening',
      });
    }

    if (/\b(nice|cool|good)\b/i.test(entry.narrative)) {
      issues.push({
        field: rowLabel,
        severity: 'warning',
        message: "Vague adjective detected — be more specific",
        phase: 'listening',
      });
    }

    if (!entry.tags.trim()) {
      issues.push({
        field: rowLabel,
        severity: 'warning',
        message: 'No tags — add instrument and vibe context',
        phase: 'listening',
      });
    }
  }

  // Check all text fields for referential openers and vague adjectives
  for (const cat of GLOBAL_CATEGORIES) {
    const val = ((annotation.global as Record<string, string>)[cat.key] ?? '');
    if (!val) continue;

    if (/^(In this song|This track|The song)/i.test(val)) {
      issues.push({
        field: cat.displayLabel,
        severity: 'warning',
        message: "Avoid referential openers ('In this song', 'This track')",
        phase: 'global',
      });
    }

    if (/\b(nice|cool|good)\b/i.test(val)) {
      issues.push({
        field: cat.displayLabel,
        severity: 'warning',
        message: "Vague adjective detected — be more specific",
        phase: 'global',
      });
    }
  }

  const wowValue = (annotation.global as Record<string, string>)['wow'] ?? '';
  if (wowValue.trim() && wowValue.trim().split(/\s+/).length < 15) {
    issues.push({
      field: "THE 'WOW' FACTOR",
      severity: 'warning',
      message: "Wow Factor seems brief — this is a critical field for TuneTag",
      phase: 'global',
    });
  }

  if ((annotation.elapsedSeconds ?? 0) > 1800) {
    issues.push({
      field: 'Session Timer',
      severity: 'warning',
      message: 'Session exceeded 30 minutes — TuneTag recommends staying under 30',
      phase: 'listening',
    });
  }

  const canExport = !issues.some((i) => i.severity === 'error');
  return { issues, canExport };
}
