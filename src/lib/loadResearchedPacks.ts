import type { TagPackImport, TagType } from '../types';

// Pack files saved in /public — served at root by Vite.
// Files that don't exist yet return a non-ok response and are skipped silently.
const PACK_FILES = [
  '/tag-packs-part1.json',
  '/tag-packs-part2.json',
  '/tag-packs-part3.json',
  '/tag-packs-part4.json',
];

const VALID_TYPES: ReadonlySet<string> = new Set([
  'section', 'source', 'action', 'quality', 'mix', 'genre_marker', 'timing', 'custom',
]);

/**
 * Converts a single pack entry from the researched-JSON format
 * (which uses "terms" + "group") into the TagPackImport shape
 * (which uses "tags" + "category") that importTagPack expects.
 */
function adaptPack(raw: unknown): TagPackImport | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const p = raw as Record<string, unknown>;

  if (typeof p.packId !== 'string' || !p.packId.trim()) return null;
  if (typeof p.label !== 'string' || !p.label.trim()) return null;

  // Support both "terms" (researched JSON) and "tags" (manual import format)
  const termArray = Array.isArray(p.terms) ? p.terms
    : Array.isArray(p.tags) ? p.tags
    : [];

  const tags = termArray
    .filter((t): t is Record<string, unknown> => typeof t === 'object' && t !== null)
    .map((t) => ({
      label: typeof t.label === 'string' ? t.label.trim() : '',
      type: (VALID_TYPES.has(t.type as string) ? t.type : 'custom') as TagType,
      // "group" is the category field in researched JSON; fall back to "category"
      category: typeof t.group === 'string' && t.group.trim()
        ? t.group.trim()
        : typeof t.category === 'string' && t.category.trim()
          ? t.category.trim()
          : 'Imported',
    }))
    .filter((t) => t.label.length > 0);

  return {
    packId: p.packId.trim(),
    label: p.label.trim(),
    version: typeof p.version === 'number' ? p.version : 1,
    tags,
  };
}

/**
 * Fetches all researched pack files from /public and imports them
 * into the library via importTagPack. Missing files are skipped silently.
 * Network or parse errors are caught and logged, never thrown.
 */
export async function loadResearchedPacks(
  importTagPack: (raw: TagPackImport) => void
): Promise<void> {
  for (const url of PACK_FILES) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue; // file doesn't exist yet — skip silently

      const raw: unknown = await res.json();

      // The JSON wraps packs in a top-level "packs" array
      if (
        typeof raw === 'object' &&
        raw !== null &&
        Array.isArray((raw as Record<string, unknown>).packs)
      ) {
        for (const pack of (raw as Record<string, unknown>).packs as unknown[]) {
          const adapted = adaptPack(pack);
          if (adapted) {
            importTagPack(adapted);
          }
        }
      }
    } catch {
      // Network or parse error — skip silently, do not block app load
    }
  }
}
