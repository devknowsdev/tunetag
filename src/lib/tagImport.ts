import type { TagPackImport, TagType } from '../types';

const VALID_TYPES: TagType[] = [
  'section', 'source', 'action', 'quality', 'mix', 'genre_marker', 'timing', 'custom',
];

export interface ImportParseResult {
  ok: boolean;
  data: TagPackImport | null;
  errors: string[];
}

/**
 * Parses and validates a raw JSON string from the import box.
 * Returns a normalized TagPackImport or a list of validation errors.
 * Does not throw — all errors are returned inline.
 */
export function parseTagPackJson(raw: string): ImportParseResult {
  const errors: string[] = [];
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw.trim());
  } catch {
    return { ok: false, data: null, errors: ['Invalid JSON — could not parse.'] };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, data: null, errors: ['Expected a JSON object at the top level.'] };
  }

  const obj = parsed as Record<string, unknown>;

  // Validate required top-level fields
  if (typeof obj.packId !== 'string' || !obj.packId.trim()) {
    errors.push('Missing or empty "packId" field.');
  }
  if (typeof obj.label !== 'string' || !obj.label.trim()) {
    errors.push('Missing or empty "label" field.');
  }
  if (!Array.isArray(obj.tags)) {
    errors.push('"tags" must be an array.');
    return { ok: false, data: null, errors };
  }

  if (errors.length > 0) {
    return { ok: false, data: null, errors };
  }

  // Validate and normalize individual tag rows
  const normalizedTags: TagPackImport['tags'] = [];
  const rowErrors: string[] = [];

  for (let i = 0; i < (obj.tags as unknown[]).length; i++) {
    const row = (obj.tags as unknown[])[i];
    if (typeof row !== 'object' || row === null) {
      rowErrors.push(`Row ${i + 1}: not an object — skipped.`);
      continue;
    }
    const r = row as Record<string, unknown>;
    if (typeof r.label !== 'string' || !r.label.trim()) {
      rowErrors.push(`Row ${i + 1}: missing or empty "label" — skipped.`);
      continue;
    }
    const type: TagType = VALID_TYPES.includes(r.type as TagType)
      ? (r.type as TagType)
      : 'custom';

    if (typeof r.type === 'string' && !VALID_TYPES.includes(r.type as TagType)) {
      rowErrors.push(`Row ${i + 1} ("${r.label}"): unknown type "${r.type}" — mapped to "custom".`);
    }

    normalizedTags.push({
      label: (r.label as string).trim(),
      type,
      category: typeof r.category === 'string' && r.category.trim()
        ? r.category.trim()
        : 'Imported',
    });
  }

  return {
    ok: true,
    data: {
      packId: (obj.packId as string).trim().toLowerCase().replace(/\s+/g, '_'),
      label: (obj.label as string).trim(),
      version: typeof obj.version === 'number' ? obj.version : 1,
      tags: normalizedTags,
    },
    errors: rowErrors, // non-fatal row warnings
  };
}

/**
 * The AI prompt users can copy to generate a correctly formatted tag pack.
 */
export const AI_IMPORT_PROMPT = `Generate a JSON tag pack for music annotation. Output valid JSON only (no markdown).
Use this schema:
{ "packId": "string", "label": "string", "version": 1, "tags": [{ "label": "string", "type": "section|source|action|quality|mix|genre_marker|timing|custom", "category": "string" }] }
Requirements:
- 30–80 tags
- practical for listening notes, arrangement, performance, and mix annotation
- avoid duplicates and near-duplicates
- short labels (1–3 words)
- include common genre-specific terms and mix descriptors`;
