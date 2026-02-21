import type { TagDef, TagPack } from '../types';

// ─── Built-in Pack Definitions ────────────────────────────────────────────────

export const BUILTIN_PACKS: TagPack[] = [
  {
    id: 'general',
    label: 'General',
    description: 'Core annotation tags for any genre — sections, sources, actions, qualities, mix, timing.',
    builtin: true,
  },
  {
    id: 'dnb',
    label: 'DnB / Jungle',
    description: 'Drum & bass and jungle-specific terms for grooves, bass design and arrangement.',
    builtin: true,
  },
  {
    id: 'house',
    label: 'House',
    description: 'House music annotation tags — groove, harmony, arrangement and mix.',
    builtin: true,
  },
  {
    id: 'trap',
    label: 'Hip-Hop / Trap',
    description: 'Hip-hop and trap production terms — rhythm, vocal arrangement, mix.',
    builtin: true,
  },
];

// ─── Helper ───────────────────────────────────────────────────────────────────

function makeTag(
  label: string,
  type: TagDef['type'],
  category: string,
  packIds: string[]
): TagDef {
  return {
    id: `builtin_${label.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    label,
    normalized: label.trim().toLowerCase(),
    type,
    category,
    source: 'builtin',
    packIds,
  };
}

// ─── General Pack Tags ────────────────────────────────────────────────────────

const generalSections: TagDef[] = [
  'Intro', 'Verse', 'Pre-Chorus', 'Chorus', 'Bridge', 'Breakdown',
  'Build', 'Drop', 'Outro', 'Turnaround', 'Transition', 'Fill',
  'Instrumental', 'Hook', 'Post-Chorus', 'Tag Ending', 'Solo',
].map(l => makeTag(l, 'section', 'Sections', ['general']));

const generalSources: TagDef[] = [
  'Kick', 'Snare', 'Clap', 'Hats', 'Percussion', 'Bass', 'Sub',
  'Lead', 'Pad', 'Chords', 'Arp', 'FX', 'Vocal Lead', 'Backing Vocal',
  'Guitar', 'Keys', 'Ambience', 'Strings', 'Brass', 'Rhodes',
].map(l => makeTag(l, 'source', 'Sources', ['general']));

const generalActions: TagDef[] = [
  'Enters', 'Drops Out', 'Doubles', 'Builds', 'Resolves', 'Swells',
  'Cuts Through', 'Masks', 'Clips', 'Distorts', 'Widens', 'Narrows',
  'Drags', 'Pushes', 'Tightens', 'Repeats', 'Call-Response',
].map(l => makeTag(l, 'action', 'Actions', ['general']));

const generalQualities: TagDef[] = [
  'Tight', 'Loose', 'Swung', 'Straight', 'Syncopated', 'Driving',
  'Laid-back', 'Punchy', 'Warm', 'Bright', 'Dark', 'Gritty',
  'Clean', 'Airy', 'Dense', 'Sparse',
].map(l => makeTag(l, 'quality', 'Qualities', ['general']));

const generalMix: TagDef[] = [
  'Muddy', 'Boxy', 'Harsh', 'Buried', 'Upfront', 'Mono', 'Stereo-wide',
  'Dry', 'Wet', 'Reverb-heavy', 'Delay-heavy', 'Sidechained',
  'Low-end Clash', 'Transient-heavy',
].map(l => makeTag(l, 'mix', 'Mix & Space', ['general']));

const generalTiming: TagDef[] = [
  'On Beat', 'Offbeat', 'Before Drop', 'After Fill', 'Transition Point',
  'Late', 'Early', 'Bar Marker',
].map(l => makeTag(l, 'timing', 'Timing', ['general']));

// ─── DnB Pack Tags ────────────────────────────────────────────────────────────

const dnbDrums: TagDef[] = [
  'Breakbeat', 'Amen', 'Break Chop', 'Ghost Snare', 'Shuffle Hats',
  'Roller', 'Halftime Feel', 'Double-time Hats', 'Snare Crack',
].map(l => makeTag(l, 'genre_marker', 'Drums & Groove', ['dnb']));

const dnbBass: TagDef[] = [
  'Reese', 'Sub Pressure', 'Wobble', 'Neuro Bass', 'Foghorn',
  'Growl', 'Mid-bass', 'Sub Drop',
].map(l => makeTag(l, 'genre_marker', 'Bass', ['dnb']));

const dnbArrangement: TagDef[] = [
  'DJ Intro', 'First Drop', 'Switch-up', 'Second Drop',
  'Bassless Outro', '16-bar Section',
].map(l => makeTag(l, 'section', 'Arrangement', ['dnb']));

const dnbMix: TagDef[] = [
  'Low-end Clash', 'Bass Masking', 'Transient Punch', 'Headroom Issue',
].map(l => makeTag(l, 'mix', 'Mix & Energy', ['dnb']));

// ─── House Pack Tags ──────────────────────────────────────────────────────────

const houseGroove: TagDef[] = [
  'Four-on-the-floor', 'Offbeat Hat', 'Shuffle', 'Groove Loop',
  'Jackin Feel', 'Driving Kick',
].map(l => makeTag(l, 'genre_marker', 'Groove & Drums', ['house']));

const houseHarmony: TagDef[] = [
  'Bassline Groove', 'Chord Stab', 'Organ Stab', 'Piano House',
  'Vamp', 'Filtered Chords',
].map(l => makeTag(l, 'genre_marker', 'Harmony & Bass', ['house']));

const houseArrangement: TagDef[] = [
  'DJ Intro', 'Beatless Breakdown', 'Buildup', 'Tension Ramp',
  'Riser', 'Sweep', 'Filter-in', 'Filter-out',
].map(l => makeTag(l, 'section', 'Arrangement', ['house']));

const houseMix: TagDef[] = [
  'Sidechain Pump', 'Kick-bass Ducking', 'Mono Kick',
  'Wide Hats', 'Sub Focus',
].map(l => makeTag(l, 'mix', 'Mix & Motion', ['house']));

// ─── Hip-Hop / Trap Pack Tags ─────────────────────────────────────────────────

const trapRhythm: TagDef[] = [
  '808', 'Half-time Feel', 'Hat Rolls', 'Triplet Hats', 'Clap Stack',
  'Snare Pocket', 'Bounce',
].map(l => makeTag(l, 'genre_marker', 'Rhythm', ['trap']));

const trapProduction: TagDef[] = [
  'Sparse Beat', 'Sample Chop', 'Reverse Hit', 'Pitch Shift', 'Drop-out',
].map(l => makeTag(l, 'genre_marker', 'Production', ['trap']));

const trapVocal: TagDef[] = [
  'Hook', 'Adlibs', 'Doubles', 'Punch-in', 'Beat Switch',
].map(l => makeTag(l, 'genre_marker', 'Vocal & Arrangement', ['trap']));

const trapMix: TagDef[] = [
  'Vocal Forward', 'Low-end Heavy', 'Grit', 'Air', 'Mono Compatibility',
].map(l => makeTag(l, 'mix', 'Mix', ['trap']));

// ─── Merged Export ────────────────────────────────────────────────────────────

/**
 * All seed tags for every built-in pack, ready to load into the library.
 * Deduplication is handled separately in tagLibrary.ts if two packs share a label.
 */
export const BUILTIN_TAGS: TagDef[] = [
  // General
  ...generalSections,
  ...generalSources,
  ...generalActions,
  ...generalQualities,
  ...generalMix,
  ...generalTiming,
  // DnB
  ...dnbDrums,
  ...dnbBass,
  ...dnbArrangement,
  ...dnbMix,
  // House
  ...houseGroove,
  ...houseHarmony,
  ...houseArrangement,
  ...houseMix,
  // Trap
  ...trapRhythm,
  ...trapProduction,
  ...trapVocal,
  ...trapMix,
];

/** Default library state — used when no saved state exists. */
export const DEFAULT_LIBRARY_STATE = {
  enabledPackIds: ['general'],
  hiddenBuiltinTagIds: [] as string[],
  hiddenBuiltinPackIds: [] as string[],
  customSectionTypes: [] as string[],
  sessionActiveTagIdsByTrack: {} as Record<number, string[]>,
  sessionHiddenTagIdsByTrack: {} as Record<number, string[]>,
  phraseBank: [],
  promptTemplates: {
    firstSection: [
      'How does the song open?',
      'What is the very first thing you hear?',
      'What instruments or sounds establish the mood?',
    ],
    subsequentSection: [
      'What changed from the previous section?',
      'What is now happening that was not before?',
      'Did the energy level rise or drop?',
      'Did the rhythm, density, or texture shift?',
    ],
  },
};
