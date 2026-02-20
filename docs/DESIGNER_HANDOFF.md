# BeatPulse — Designer Handoff

## Product context
BeatPulse is a focused annotation tool for music industry professionals.
The user listens to tracks, logs section boundaries with timestamps, writes analysis,
and exports everything to a structured Excel workbook.

**Primary user:** A music industry professional with ADHD and Autism who needs
low-friction, high-predictability interactions. The tool is used during active
listening sessions where attention and working memory are occupied by the music.

---

## Design principles

1. **One thing at a time.** Each screen has one primary action. No competing CTAs.
2. **State is always visible.** Timer running/paused, track status, progress counters
   — always on screen. No hidden state.
3. **Nothing is lost.** Autosave is invisible and continuous. The user should never
   need to think about saving.
4. **Reduce decisions.** Chips for section types, tag suggestions, AI polish option.
   Support the user, don't add decisions.
5. **Calm.** Dark theme, warm amber accent. No busy animations. Transitions are
   fade-in only. Nothing flashes or demands attention.
6. **Predictable.** The same action always does the same thing. No smart/adaptive UI.

---

## Current visual design

### Colour palette (all defined as CSS custom properties in src/index.css)

| Token | Hex | Usage |
|---|---|---|
| `--bg` | `#0a0a0a` | Page background — near-black |
| `--surface` | `#111111` | Cards, panels |
| `--surface-raised` | `#171717` | Elevated elements, modals |
| `--border` | `#1e1e1e` | Dividers, default borders |
| `--border-active` | `#2e2e2e` | Focused/active borders |
| `--amber` | `#f59e0b` | Primary accent — CTAs, timer, key labels |
| `--amber-bg` | `#1c1500` | Amber-tinted backgrounds |
| `--amber-glow` | `rgba(245,158,11,0.1)` | Subtle glow on amber elements |
| `--text` | `#d4cbbe` | Body text (warm off-white) |
| `--text-muted` | `#7a7268` | Secondary / supporting text |
| `--text-dim` | `#3e3c38` | Tertiary, disabled, metadata |
| `--error` | `#ef4444` | Errors, destructive actions, overdue timer |
| `--error-bg` | `#1c0a0a` | Error-tinted backgrounds |
| `--success` | `#22c55e` | Success confirmations |

### Typography

| Token | Stack | Usage |
|---|---|---|
| `--font-mono` | JetBrains Mono, monospace | Labels (all-caps, tracked), timestamps, codes, counters, metadata |
| `--font-serif` | Georgia, Times New Roman, serif | All user-written content: narratives, annotations |
| `--font-display` | Playfair Display, serif | Track names, screen titles |

**Label convention:** The `.label` class is monospace, 10px, letter-spacing 0.2em,
uppercase, `--text-dim` colour. Used for section headers and field labels throughout.

### Layout system

- Mobile-first. All screens designed for 375px+ viewport width.
- Max content width: **580px**, centred with `margin: 0 auto`.
- Phase containers: `padding: 1.5rem 1rem 3rem`.
- The Listening screen breaks the content-width convention — it is full-height,
  with a sticky topbar and a fixed bottom bar.
- Border radius: `--radius: 8px` (cards, buttons), `--radius-pill: 100px` (chips, badges).

### Motion
- Entry animation: `.fade-in` — `opacity 0→1`, `translateY 8px→0`, 200ms ease-out.
- Button hover: subtle background shift, 150ms. No scale transforms.
- MARK button: pulses gently when timer is running (CSS animation on `.mark-button--pulsing`).
- No other motion.

---

## Screen inventory

### 1. Select (PhaseSelect)
**Purpose:** Choose which track to work on.

**Layout:**
- Header: "BEATPULSE LABS" label + "Annotation Session" title (Playfair Display)
- Track cards: vertical list, full width. One card per track.
- Each card: Track number (amber label), track name (Playfair italic, 1.25rem),
  artist (muted, 0.875rem), status badge (top-right), progress summary (if in progress).

**Status badges:** pill shape, colour-coded.
- NOT STARTED — dim
- IN PROGRESS — amber
- COMPLETE — success green
- SKIPPED — muted

**Interaction:** tap card → confirm dialog for in-progress tracks (currently `window.confirm` — 
should be a custom modal in future).

---

### 2. Ready (PhaseReady)
**Purpose:** Confirm track details and start the session.

**Layout:**
- Track info block (artist, name, audio label, Spotify link)
- Annotator name field (text input, pre-filled if previously entered)
- Style rules / brief (collapsible sections, currently shown as expandable list)
- START LISTENING button (full-width amber CTA)

---

### 3. Listening (PhaseListening)
**Purpose:** Active annotation screen. Timer runs. User marks moments.

**Layout:**
- **Sticky topbar:**
  - Left: "TRACK N — PART 1 · TIMELINE" label + track name
  - Right: Timer display (monospace, 1.5rem, amber when running / muted when paused)
    — tap to toggle pause/resume. Shows warning colour + "⚠ 20 MIN" after 20 minutes.
  - Below timer: `{n} / {max}` counter + "M to mark" hint

- **Scrollable body:**
  - Dictation overlay (appears in-place when dictation is active, covers timeline)
  - MARK THIS MOMENT button (full-width, pulses when timer running)
  - 🎙 Dictate button (secondary, below MARK)
  - Timeline entries (reverse-chronological, newest at top):
    - Each entry: timestamp (amber), section type, narrative, tags, edit/delete icons
    - Dictated entries show a "🎙 dictated" badge

- **Fixed bottom bar:**
  - SKIP THIS TRACK (ghost, destructive)
  - DONE — PART 2 → (amber, disabled if timeline empty)

---

### 4. Mark Entry (PhaseMarkEntry — overlay)
**Purpose:** Write or edit a timeline section entry.

**Layout:** Full-screen fixed overlay. Content is a centred card (max 580px).
- Header: "MARK ENTRY" or "EDIT ENTRY" label
- Timestamp field (text, pre-filled, editable)
- Section type: chip grid + freeform text input
- Narrative textarea (serif font) + AI Polish button
- Tags textarea + tag suggestion chips (grouped by category)
- Cancel / Save buttons

**Timer state:** Timer is paused while this overlay is open.
Automatically resumes on Save if it was running when the user triggered Mark.

---

### 5. Global Analysis (PhaseGlobal)
**Purpose:** Fill in 9 whole-track analysis categories, one at a time.

**Layout:**
- Progress dots: 9 dots, current one highlighted amber
- Category label + guidance text
- Textarea for the user's response
- N/A toggle (for categories that don't apply)
- "Can be N/A" indicator where applicable
- Back / Next navigation
- "View Summary" option after all 9 done
- Summary view: all 9 categories in a read-through list → "Go to Review"

**Note:** The one-at-a-time model is intentional but may be slow for experienced users.
See designer recommendations below.

---

### 6. Review (PhaseReview)
**Purpose:** Final check before export.

**Layout:**
- Track header (name, artist, annotator, elapsed time)
- Timeline section (all entries in chronological order, each with Edit link)
- Global Analysis section (all 9 categories, each with Edit link)
- Quality Check panel (LintPanel component — lists issues, shows export readiness)
- Export buttons:
  - "Download workbook (this track)" — disabled if lint fails
  - "Download workbook (all completed tracks)"
- "→ NEXT TRACK" button

---

### 7. HowToUse (modal overlay)
**Purpose:** In-app reference. User can open at any time via "?" button.

**Layout:** Full-screen fixed overlay. Dark background with blur/dim.
Scrollable content panel (max 600px, centred).
Close button top-right. Escape key closes.
Content: structured text guide with section headers (monospace), body (serif).

---

## Button/component patterns

| Pattern | Class | Usage |
|---|---|---|
| Primary CTA | `.btn-primary` | One per screen. Amber background. |
| Secondary | `.btn-ghost` | Ghost with border. Non-destructive alternatives. |
| Destructive | `.btn-ghost.btn-destructive` | Skip Track, delete. Error colour border/text. |
| Small | `.btn-small` | Paired buttons (resume banner), compact contexts |
| Icon button | `.icon-btn` | Edit (✎) and delete (×) on timeline cards |
| Link button | `.btn-link` | Inline "Edit" in review entries |
| Chip | `.chip` (inferred) | Section type chips in Mark Entry |

---

## Accessibility notes

- All interactive elements have `title` attributes
- `disabled` states are correctly wired (e.g. Mark Entry cap, export validation)
- Keyboard navigation: M shortcut for mark, Escape for modals — full keyboard nav not implemented
- Colour contrast: amber (`#f59e0b`) on near-black (`#0a0a0a`) — passes AA at large text sizes,
  borderline at small text — verify with a contrast checker before expanding amber use
- No ARIA roles or landmarks currently implemented

---

## What a design pass should prioritise

### High priority
1. **Replace `window.confirm` / `window.prompt` dialogs** with custom modal components.
   Currently used for: resume/start-over on in-progress tracks, skip reason, delete confirm.
   These system dialogs are jarring, especially for ADHD users — they break context completely.

2. **Track progress indicator.** A persistent breadcrumb or stepper showing the current
   phase (Select → Ready → Listening → Global → Review) would reduce "where am I?" anxiety.

3. **Resume banner improvement.** Currently: "Resume where you left off?" with no context.
   Should show: track name, elapsed time, last phase. Enough information to confirm before
   committing.

### Medium priority
4. **Global Analysis layout.** One-at-a-time is deliberate (reduces overwhelm) but slow.
   Consider: keep one-at-a-time on mobile, offer a two-column grid on wider viewports.
   Or: add a "Fill all" shortcut mode for experienced users.

5. **Persistent mini-timer.** If the user navigates away from Listening with the timer
   running (currently prevented by the isActive guard, but could happen in edge cases),
   there's no visible indicator. A floating amber pip showing timer state would provide
   reassurance.

6. **Export section prominence.** In Review, the export buttons are at the bottom after
   the lint panel. For a completed, clean annotation, the primary action should be more
   immediately reachable.

### Lower priority
7. Keyboard navigation pass (Tab order, focus management on phase transitions)
8. Toast notifications instead of `alert()` for success states
9. Swipe gestures on mobile for Global category navigation
10. Dark/light mode toggle (currently dark-only — the palette is designed for dark)

---

## Files to read before designing
| File | Why |
|---|---|
| `src/index.css` | All current styles. Understand token usage before adding new ones. |
| `src/types/index.ts` | Data shapes. Understand what fields exist before designing new inputs. |
| `src/lib/schema.ts` | Track list, global categories, section type chips, tag suggestions. |
| `docs/ARCHITECTURE.md` | Phase machine, state flows — important for interaction design. |

---

## What not to change
- The autosave model (must remain invisible and continuous)
- The co-render of Listening + Mark Entry (functional constraint, not cosmetic)
- The Excel template structure (fixed by the .xlsx file; data mapping is rigid)
- The `Phase` type union (changing this touches the entire state machine)
