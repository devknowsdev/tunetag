import { useState, useMemo } from 'react';
import type {
  TagDef,
  TagType,
  TagPack,
  PromptsTagsLibraryState,
  UndoAction,
  TagPackImport,
} from '../types';
import {
  getLibraryTags,
  getHiddenBuiltinTags,
  groupTagsByCategory,
} from '../lib/tagLibrary';
import { parseTagPackJson, AI_IMPORT_PROMPT } from '../lib/tagImport';
import { BUILTIN_PACKS } from '../lib/tagPacks';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  library: PromptsTagsLibraryState;
  undoStack: UndoAction[];
  onBack: () => void;
  addCustomTag: (label: string, type: TagType, category: string) => void;
  hideBuiltinTag: (tagId: string) => void;
  deleteCustomTag: (tagId: string) => void;
  restoreHiddenTag: (tagId: string) => void;
  togglePackEnabled: (packId: string) => void;
  importTagPack: (raw: TagPackImport) => { added: number; merged: number; errors: string[] };
  undoLastAction: () => void;
}

// ─── Tab type ─────────────────────────────────────────────────────────────────

type Tab = 'library' | 'packs' | 'import';

const TAB_LABELS: Record<Tab, string> = {
  library: 'Tag Library',
  packs: 'Genre Packs',
  import: 'Import',
};

const TAG_TYPES: TagType[] = [
  'section', 'source', 'action', 'quality', 'mix', 'genre_marker', 'timing', 'custom',
];

// ─── Component ────────────────────────────────────────────────────────────────

export function PhasePromptsTags({
  library,
  undoStack,
  onBack,
  addCustomTag,
  hideBuiltinTag,
  deleteCustomTag,
  restoreHiddenTag,
  togglePackEnabled,
  importTagPack,
  undoLastAction,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('library');

  const latestUndo = undoStack[0] ?? null;

  return (
    <div style={styles.root}>
      {/* ── Top bar ── */}
      <div style={styles.topBar}>
        <button className="btn-ghost btn-small" onClick={onBack}>
          ← BACK
        </button>
        <span style={styles.screenTitle}>PROMPTS &amp; TAGS</span>
        <button
          className="btn-ghost btn-small"
          onClick={undoLastAction}
          disabled={!latestUndo}
          title={latestUndo ? `Undo: ${latestUndo.label}` : 'Nothing to undo'}
          style={{ opacity: latestUndo ? 1 : 0.35 }}
        >
          ↩ UNDO{latestUndo ? `: ${latestUndo.label}` : ''}
        </button>
      </div>

      {/* ── Tab bar ── */}
      <div style={styles.tabBar}>
        {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
          <button
            key={tab}
            className={activeTab === tab ? 'btn-primary btn-small' : 'btn-ghost btn-small'}
            onClick={() => setActiveTab(tab)}
            style={styles.tabButton}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div style={styles.content}>
        {activeTab === 'library' && (
          <TagLibraryTab
            library={library}
            addCustomTag={addCustomTag}
            hideBuiltinTag={hideBuiltinTag}
            deleteCustomTag={deleteCustomTag}
            restoreHiddenTag={restoreHiddenTag}
          />
        )}
        {activeTab === 'packs' && (
          <PacksTab
            library={library}
            togglePackEnabled={togglePackEnabled}
          />
        )}
        {activeTab === 'import' && (
          <ImportTab importTagPack={importTagPack} />
        )}
      </div>
    </div>
  );
}

// ─── Tag Library Tab ──────────────────────────────────────────────────────────

function TagLibraryTab({
  library,
  addCustomTag,
  hideBuiltinTag,
  deleteCustomTag,
  restoreHiddenTag,
}: {
  library: PromptsTagsLibraryState;
  addCustomTag: (label: string, type: TagType, category: string) => void;
  hideBuiltinTag: (tagId: string) => void;
  deleteCustomTag: (tagId: string) => void;
  restoreHiddenTag: (tagId: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [showHidden, setShowHidden] = useState(false);
  const [addLabel, setAddLabel] = useState('');
  const [addType, setAddType] = useState<TagType>('custom');
  const [addCategory, setAddCategory] = useState('');
  const [addError, setAddError] = useState('');

  const visibleTags = useMemo(
    () => getLibraryTags(library, search),
    [library, search]
  );
  const grouped = useMemo(() => groupTagsByCategory(visibleTags), [visibleTags]);
  const hiddenTags = useMemo(() => getHiddenBuiltinTags(library), [library]);

  function handleAdd() {
    if (!addLabel.trim()) {
      setAddError('Label is required.');
      return;
    }
    const normalized = addLabel.trim().toLowerCase();
    if (library.tags.some((t) => t.normalized === normalized)) {
      setAddError('A tag with this label already exists.');
      return;
    }
    addCustomTag(addLabel.trim(), addType, addCategory.trim() || 'Custom');
    setAddLabel('');
    setAddCategory('');
    setAddError('');
  }

  return (
    <div style={styles.tabContent}>
      {/* Search */}
      <input
        type="text"
        placeholder="Search tags…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={styles.searchInput}
      />

      {/* Add custom tag */}
      <div style={styles.addRow}>
        <input
          type="text"
          placeholder="New tag label…"
          value={addLabel}
          onChange={(e) => { setAddLabel(e.target.value); setAddError(''); }}
          style={{ ...styles.searchInput, flex: 2 }}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <select
          value={addType}
          onChange={(e) => setAddType(e.target.value as TagType)}
          style={styles.select}
        >
          {TAG_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Category (optional)"
          value={addCategory}
          onChange={(e) => setAddCategory(e.target.value)}
          style={{ ...styles.searchInput, flex: 1.5 }}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button className="btn-primary btn-small" onClick={handleAdd}>
          + ADD
        </button>
      </div>
      {addError && <p style={styles.errorText}>{addError}</p>}

      {/* Tag list by category */}
      {grouped.length === 0 && (
        <p style={styles.emptyText}>
          {search ? 'No tags match your search.' : 'No tags in library.'}
        </p>
      )}
      {grouped.map(([category, tags]) => (
        <div key={category} style={styles.categoryGroup}>
          <div style={styles.categoryHeader}>
            <span>{category}</span>
            <span style={styles.categoryCount}>{tags.length}</span>
          </div>
          <div style={styles.tagChipGrid}>
            {tags.map((tag) => (
              <TagRow
                key={tag.id}
                tag={tag}
                onHide={() => hideBuiltinTag(tag.id)}
                onDelete={() => deleteCustomTag(tag.id)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Hidden tags section */}
      {hiddenTags.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <button
            className="btn-ghost btn-small"
            onClick={() => setShowHidden((v) => !v)}
          >
            {showHidden ? '▾' : '▸'} Hidden built-in tags ({hiddenTags.length})
          </button>
          {showHidden && (
            <div style={styles.tagChipGrid}>
              {hiddenTags.map((tag) => (
                <div key={tag.id} style={styles.hiddenTagRow}>
                  <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                    {tag.label}
                  </span>
                  <button
                    className="btn-ghost btn-small"
                    onClick={() => restoreHiddenTag(tag.id)}
                  >
                    RESTORE
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tag Row ──────────────────────────────────────────────────────────────────

function TagRow({
  tag,
  onHide,
  onDelete,
}: {
  tag: TagDef;
  onHide: () => void;
  onDelete: () => void;
}) {
  return (
    <div style={styles.tagRow}>
      <span style={styles.tagLabel}>{tag.label}</span>
      <span style={styles.tagType}>{tag.type}</span>
      <span style={styles.tagSource}>{tag.source}</span>
      <button
        className="btn-ghost btn-small"
        onClick={tag.source === 'builtin' ? onHide : onDelete}
        style={{ color: 'var(--error)', marginLeft: 'auto' }}
        title={tag.source === 'builtin' ? 'Hide (soft delete)' : 'Delete permanently'}
      >
        {tag.source === 'builtin' ? 'HIDE' : 'DELETE'}
      </button>
    </div>
  );
}

// ─── Packs Tab ────────────────────────────────────────────────────────────────

function PacksTab({
  library,
  togglePackEnabled,
}: {
  library: PromptsTagsLibraryState;
  togglePackEnabled: (packId: string) => void;
}) {
  const allPacks: TagPack[] = library.packs;

  return (
    <div style={styles.tabContent}>
      <p style={styles.helpText}>
        Enable packs to make their tags available in your annotation sessions.
        Built-in packs cannot be deleted — only hidden.
      </p>
      {allPacks.map((pack) => {
        const isEnabled = library.enabledPackIds.includes(pack.id);
        const tagCount = library.tags.filter((t) => t.packIds.includes(pack.id)).length;
        const isBuiltin = BUILTIN_PACKS.some((p) => p.id === pack.id);
        return (
          <div
            key={pack.id}
            style={{
              ...styles.packRow,
              borderColor: isEnabled ? 'var(--amber)' : 'var(--border)',
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={styles.packLabel}>
                {pack.label}
                {isBuiltin && <span style={styles.builtinBadge}>BUILT-IN</span>}
              </div>
              {pack.description && (
                <div style={styles.packDescription}>{pack.description}</div>
              )}
              <div style={styles.packMeta}>{tagCount} tags</div>
            </div>
            <button
              className={isEnabled ? 'btn-primary btn-small' : 'btn-ghost btn-small'}
              onClick={() => togglePackEnabled(pack.id)}
            >
              {isEnabled ? '✓ ENABLED' : 'ENABLE'}
            </button>
          </div>
        );
      })}
      {allPacks.length === 0 && (
        <p style={styles.emptyText}>No packs loaded. Import a pack to get started.</p>
      )}
    </div>
  );
}

// ─── Import Tab ───────────────────────────────────────────────────────────────

function ImportTab({
  importTagPack,
}: {
  importTagPack: (raw: TagPackImport) => { added: number; merged: number; errors: string[] };
}) {
  const [jsonText, setJsonText] = useState('');
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<{
    added: number;
    merged: number;
    errors: string[];
  } | null>(null);
  const [promptCopied, setPromptCopied] = useState(false);

  function handleImport() {
    setImportResult(null);
    const parsed = parseTagPackJson(jsonText);
    if (!parsed.ok || !parsed.data) {
      setParseErrors(parsed.errors);
      return;
    }
    setParseErrors(parsed.errors); // may include non-fatal row warnings
    const result = importTagPack(parsed.data);
    setImportResult(result);
    if (result.added > 0 || result.merged > 0) {
      setJsonText('');
    }
  }

  function handleCopyPrompt() {
    navigator.clipboard.writeText(AI_IMPORT_PROMPT).then(() => {
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    });
  }

  return (
    <div style={styles.tabContent}>
      <p style={styles.helpText}>
        Paste an AI-generated tag pack as JSON. Duplicate tags are automatically
        merged — no manual cleanup needed.
      </p>

      {/* AI prompt helper */}
      <div style={styles.promptBox}>
        <div style={styles.promptBoxHeader}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            AI PROMPT — copy and send to Claude or ChatGPT
          </span>
          <button
            className="btn-ghost btn-small"
            onClick={handleCopyPrompt}
          >
            {promptCopied ? '✓ COPIED' : 'COPY PROMPT'}
          </button>
        </div>
        <pre style={styles.promptText}>{AI_IMPORT_PROMPT}</pre>
      </div>

      {/* JSON input */}
      <textarea
        value={jsonText}
        onChange={(e) => { setJsonText(e.target.value); setParseErrors([]); setImportResult(null); }}
        placeholder={'Paste JSON here…\n\n{ "packId": "...", "label": "...", "tags": [...] }'}
        style={styles.importTextarea}
        spellCheck={false}
      />

      {/* Parse errors */}
      {parseErrors.length > 0 && (
        <div style={styles.errorBox}>
          {parseErrors.map((err, i) => (
            <div key={i} style={styles.errorText}>⚠ {err}</div>
          ))}
        </div>
      )}

      {/* Import result */}
      {importResult && (
        <div style={styles.successBox}>
          <div style={{ color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
            ✓ Import complete — {importResult.added} tags added, {importResult.merged} merged.
          </div>
          {importResult.errors.map((err, i) => (
            <div key={i} style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
              {err}
            </div>
          ))}
        </div>
      )}

      <button
        className="btn-primary"
        onClick={handleImport}
        disabled={!jsonText.trim()}
        style={{ marginTop: '1rem', opacity: jsonText.trim() ? 1 : 0.4 }}
      >
        IMPORT PACK
      </button>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    background: 'var(--bg)',
    color: 'var(--text)',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem 1.25rem',
    borderBottom: '1px solid var(--border)',
    background: 'var(--surface)',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  screenTitle: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.85rem',
    color: 'var(--amber)',
    letterSpacing: '0.1em',
    flex: 1,
    textAlign: 'center',
  },
  tabBar: {
    display: 'flex',
    gap: '0.5rem',
    padding: '0.75rem 1.25rem',
    borderBottom: '1px solid var(--border)',
    background: 'var(--surface)',
    flexWrap: 'wrap',
  },
  tabButton: {
    minWidth: 100,
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '1.25rem',
    maxWidth: 860,
    width: '100%',
    margin: '0 auto',
  },
  tabContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  searchInput: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.85rem',
    padding: '0.5rem 0.75rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  select: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.8rem',
    padding: '0.5rem 0.5rem',
  },
  addRow: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  errorText: {
    color: 'var(--error)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.8rem',
  },
  emptyText: {
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.85rem',
    padding: '1rem 0',
  },
  categoryGroup: {
    marginTop: '0.75rem',
  },
  categoryHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.7rem',
    color: 'var(--amber)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    paddingBottom: '0.4rem',
    borderBottom: '1px solid var(--border)',
    marginBottom: '0.4rem',
  },
  categoryCount: {
    color: 'var(--text-dim)',
    fontSize: '0.7rem',
  },
  tagChipGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  tagRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.35rem 0.5rem',
    borderRadius: 'var(--radius)',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
  },
  tagLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.85rem',
    flex: 2,
  },
  tagType: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    flex: 1,
  },
  tagSource: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.7rem',
    color: 'var(--text-dim)',
    flex: 1,
  },
  hiddenTagRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.35rem 0.5rem',
    borderRadius: 'var(--radius)',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    marginTop: '0.25rem',
  },
  helpText: {
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.8rem',
    lineHeight: 1.5,
    margin: 0,
  },
  packRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.85rem 1rem',
    borderRadius: 'var(--radius)',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    transition: 'border-color var(--transition)',
  },
  packLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.9rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  packDescription: {
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    marginTop: '0.2rem',
  },
  packMeta: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.72rem',
    color: 'var(--text-dim)',
    marginTop: '0.2rem',
  },
  builtinBadge: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.65rem',
    color: 'var(--text-dim)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-pill)',
    padding: '0.1rem 0.4rem',
    letterSpacing: '0.05em',
  },
  promptBox: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '0.75rem',
  },
  promptBoxHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  promptText: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    whiteSpace: 'pre-wrap',
    margin: 0,
    lineHeight: 1.6,
  },
  importTextarea: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.8rem',
    padding: '0.75rem',
    minHeight: 180,
    resize: 'vertical',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  errorBox: {
    background: 'var(--error-bg)',
    border: '1px solid var(--error)',
    borderRadius: 'var(--radius)',
    padding: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  successBox: {
    background: 'var(--surface)',
    border: '1px solid var(--success)',
    borderRadius: 'var(--radius)',
    padding: '0.75rem',
  },
};
