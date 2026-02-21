/**
 * Phrase builder for Who / What / Where / When annotation helper.
 * Generates natural-language sentences from four structured fields.
 */

export interface PhraseBuilderInput {
  who: string;    // Sound source, e.g. "Bass", "Backing Vocal"
  what: string;   // Action or quality, e.g. "builds", "widens"
  where: string;  // Section or space, e.g. "in the chorus", "across the mix"
  when: string;   // Timing, e.g. "after the fill", "at the drop"
}

/**
 * Sentence templates. {who}, {what}, {where}, {when} are substituted.
 * Templates are selected based on which fields are populated.
 */
const TEMPLATES_ALL = [
  '{Who} {what} {where} {when}.',
  '{when}, {who} {what} {where}.',
  '{where}, {who} {what} {when}.',
];

const TEMPLATES_NO_WHEN = [
  '{Who} {what} {where}.',
  '{where}, {who} {what}.',
];

const TEMPLATES_NO_WHERE = [
  '{Who} {what} {when}.',
  '{when}, {who} {what}.',
];

const TEMPLATES_MINIMAL = [
  '{Who} {what}.',
];

/**
 * Generates a sentence from the four fields.
 * Empty fields are omitted gracefully — the template is chosen based on
 * which fields are present.
 *
 * @param input - The four builder fields (empty strings are treated as absent)
 * @param templateIndex - Optional: pick a specific template variant (for cycling)
 * @returns A formatted sentence string, or empty string if insufficient input.
 */
export function buildPhrase(input: PhraseBuilderInput, templateIndex = 0): string {
  const { who, what, where, when } = input;

  const hasWho = who.trim().length > 0;
  const hasWhat = what.trim().length > 0;
  const hasWhere = where.trim().length > 0;
  const hasWhen = when.trim().length > 0;

  // Need at least who + what to form a sentence
  if (!hasWho || !hasWhat) return '';

  let templates: string[];
  if (hasWhere && hasWhen) {
    templates = TEMPLATES_ALL;
  } else if (hasWhere && !hasWhen) {
    templates = TEMPLATES_NO_WHEN;
  } else if (!hasWhere && hasWhen) {
    templates = TEMPLATES_NO_WHERE;
  } else {
    templates = TEMPLATES_MINIMAL;
  }

  const template = templates[templateIndex % templates.length];

  const sentence = template
    .replace('{Who}', capitalize(who.trim()))
    .replace('{who}', who.trim().toLowerCase())
    .replace('{what}', what.trim().toLowerCase())
    .replace('{where}', where.trim().toLowerCase())
    .replace('{when}', when.trim().toLowerCase());

  return cleanSentence(sentence);
}

/**
 * Returns all possible sentence variants for the given input.
 * Used to let users cycle through template options before inserting.
 */
export function buildAllPhraseVariants(input: PhraseBuilderInput): string[] {
  const { who, what, where, when } = input;
  const hasWhere = where.trim().length > 0;
  const hasWhen = when.trim().length > 0;

  let templates: string[];
  if (hasWhere && hasWhen) {
    templates = TEMPLATES_ALL;
  } else if (hasWhere && !hasWhen) {
    templates = TEMPLATES_NO_WHEN;
  } else if (!hasWhere && hasWhen) {
    templates = TEMPLATES_NO_WHERE;
  } else {
    templates = TEMPLATES_MINIMAL;
  }

  return templates
    .map((_, i) => buildPhrase(input, i))
    .filter(Boolean);
}

// ─── Suggested dropdown values ────────────────────────────────────────────────
// These are starter options shown in the builder dropdowns.
// The user can also type freely.

export const WHO_SUGGESTIONS = [
  'Bass', 'Sub', 'Kick', 'Snare', 'Hats', 'Percussion',
  'Lead', 'Pad', 'Chords', 'Arp',
  'Vocal lead', 'Backing vocal', 'Guitar', 'Keys', 'Strings', 'Brass',
  'FX', 'Ambience',
];

export const WHAT_SUGGESTIONS = [
  'enters', 'drops out', 'builds', 'resolves', 'swells', 'cuts through',
  'doubles', 'widens', 'narrows', 'pushes', 'drags', 'tightens',
  'distorts', 'clips', 'masks', 'gets more syncopated', 'gets sparser',
  'gets denser', 'takes centre stage', 'sits in the background',
];

export const WHERE_SUGGESTIONS = [
  'in the intro', 'in the verse', 'in the chorus', 'in the bridge',
  'in the drop', 'in the breakdown', 'in the build', 'in the outro',
  'across the mix', 'in the low end', 'in the midrange', 'at the top',
];

export const WHEN_SUGGESTIONS = [
  'after the fill', 'before the drop', 'at the transition',
  'from bar 1', 'midway through', 'at the end', 'on beat 1',
  'on the offbeat', 'early in the section', 'late in the section',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Cleans up double spaces and stray punctuation from template substitution.
 */
function cleanSentence(str: string): string {
  return str
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+\./g, '.')
    .replace(/\s+,/g, ',')
    .trim();
}
