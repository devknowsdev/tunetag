import type { LintResult, Phase } from '../types';

interface Props {
  result: LintResult;
  onNavigate?: (phase: Phase) => void;
  onExport?: () => void;
  exporting?: boolean;
}

export function LintPanel({ result, onNavigate, onExport, exporting }: Props) {
  const { issues, canExport } = result;

  if (issues.length === 0) {
    return (
      <div className="lint-panel lint-clean">
        <span style={{ fontSize: '1.25rem' }}>✓</span>
        <span>Ready to export</span>
      </div>
    );
  }

  return (
    <div className="lint-panel">
      <div className="lint-issues">
        {issues.map((issue, i) => (
          <div key={i} className={`lint-issue lint-${issue.severity}`}>
            <span className="lint-icon">{issue.severity === 'error' ? '●' : '◆'}</span>
            <div className="lint-body">
              <span className="lint-field">{issue.field}</span>
              <span className="lint-message">{issue.message}</span>
            </div>
            {issue.severity === 'error' && issue.phase && onNavigate && (
              <button
                className="btn-link lint-fix"
                onClick={() => onNavigate(issue.phase!)}
              >
                Fix this
              </button>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        {canExport ? (
          <button
            className="btn-primary"
            onClick={onExport}
            disabled={exporting}
            style={{ width: '100%' }}
          >
            {exporting ? 'Preparing...' : '⬇ DOWNLOAD WORKBOOK'}
          </button>
        ) : (
          <button className="btn-primary" disabled style={{ width: '100%', opacity: 0.35 }}>
            Fix errors above to unlock export
          </button>
        )}
      </div>
    </div>
  );
}
