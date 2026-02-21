import type { TagDef, PromptsTagsLibraryState } from '../types';

/**
 * Returns the effective list of tags visible in a session for a given track.
 * Applies: pack filter → hidden builtins → session-hidden → search query.
 */
export function getSessionTags(
  lib: PromptsTagsLibraryState,
  trackId: number,
  searchQuery: string = ''
): TagDef[] {
  const sessionHidden = new Set(lib.sessionHiddenTagIdsByTrack[trackId] ?? []);
  const hiddenBuiltins = new Set(lib.hiddenBuiltinTagIds);

  let tags = lib.tags.filter((tag) => {
    // Filter out soft-deleted builtins
    if (tag.source === 'builtin' && hiddenBuiltins.has(tag.id)) return false;
    // Filter out session-hidden tags
    if (sessionHidden.has(tag.id)) return false;
    // Only show tags from enabled packs (custom tags with no packIds always show)
    if (tag.packIds.length > 0) {
      const inEnabledPack = tag.packIds.some((pid) => lib.enabledPackIds.includes(pid));
      if (!inEnabledPack) return false;
    }
    return true;
  });

  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    tags = tags.filter(
      (tag) =>
        tag.normalized.includes(q) ||
        tag.category.toLowerCase().includes(q) ||
        tag.type.includes(q)
    );
  }

  return tags;
}

/**
 * Groups a flat tag list by category, preserving insertion order.
 * Returns an ordered array of [category, tags] pairs.
 */
export function groupTagsByCategory(tags: TagDef[]): Array<[string, TagDef[]]> {
  const map = new Map<string, TagDef[]>();
  for (const tag of tags) {
    if (!map.has(tag.category)) map.set(tag.category, []);
    map.get(tag.category)!.push(tag);
  }
  return Array.from(map.entries());
}

/**
 * Returns all tags visible in the full library manager (ignores session-hidden,
 * but respects hidden builtins). Used in PhasePromptsTags.
 */
export function getLibraryTags(
  lib: PromptsTagsLibraryState,
  searchQuery: string = ''
): TagDef[] {
  const hiddenBuiltins = new Set(lib.hiddenBuiltinTagIds);

  let tags = lib.tags.filter((tag) => {
    if (tag.source === 'builtin' && hiddenBuiltins.has(tag.id)) return false;
    return true;
  });

  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    tags = tags.filter(
      (tag) =>
        tag.normalized.includes(q) ||
        tag.category.toLowerCase().includes(q) ||
        tag.type.includes(q)
    );
  }

  return tags;
}

/**
 * Returns hidden builtin tags (for the "restore" UI in PhasePromptsTags).
 */
export function getHiddenBuiltinTags(lib: PromptsTagsLibraryState): TagDef[] {
  const hiddenIds = new Set(lib.hiddenBuiltinTagIds);
  return lib.tags.filter((t) => t.source === 'builtin' && hiddenIds.has(t.id));
}

/**
 * Converts a set of active tag IDs to a comma-separated string for storage.
 * Maintains backward compatibility with TimelineEntry.tags format.
 */
export function tagIdsToString(tagIds: string[], allTags: TagDef[]): string {
  const tagMap = new Map(allTags.map((t) => [t.id, t.label]));
  return tagIds
    .map((id) => tagMap.get(id) ?? '')
    .filter(Boolean)
    .join(', ');
}

/**
 * Normalizes a label string for deduplication comparison.
 */
export function normalizeLabel(label: string): string {
  return label.trim().toLowerCase();
}
