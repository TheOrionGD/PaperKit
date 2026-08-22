import './JobProgressBar.css';

const STATUS_LABELS = {
  CREATED:    'Creating job...',
  VALIDATING: 'Validating inputs...',
  QUEUED:     'Queued',
  PROCESSING: 'Processing...',
  COMPLETED:  'Completed',
  FAILED:     'Failed',
  CANCELLED:  'Cancelled',
};

const STATUS_COLORS = {
  CREATED:    'var(--color-text-muted)',
  VALIDATING: 'var(--color-primary)',
  QUEUED:     'var(--color-primary)',
  PROCESSING: 'var(--color-primary)',
  COMPLETED:  '#22c55e',
  FAILED:     'var(--color-danger, #ef4444)',
  CANCELLED:  'var(--color-text-muted)',
};

export default function JobProgressBar({ job, onCancel, compact = false }) {
  if (!job) return null;

  const { status, progress, error, durationMs, outputAssets = [] } = job;
  const label     = STATUS_LABELS[status] || status;
  const color     = STATUS_COLORS[status] || 'var(--color-primary)';
  const isTerminal = ['COMPLETED', 'FAILED', 'CANCELLED'].includes(status);
  const pct       = Math.max(0, Math.min(100, progress || 0));

  const durationStr = durationMs != null
    ? durationMs < 1000
      ? `${durationMs}ms`
      : `${(durationMs / 1000).toFixed(1)}s`
    : null;

  return (
    <div className={`job-progress ${compact ? 'job-progress--compact' : ''} job-progress--${status.toLowerCase()}`}
         role="status" aria-live="polite">
      <div className="job-progress__header">
        <span className="job-progress__label" style={{ color }}>
          {status === 'PROCESSING' && (
            <span className="job-progress__spinner" />
          )}
          {label}
        </span>
        <span className="job-progress__pct">{pct}%</span>
      </div>

      <div className="job-progress__track" aria-label={`Progress: ${pct}%`}>
        <div
          className={`job-progress__fill ${status === 'PROCESSING' ? 'job-progress__fill--animated' : ''}`}
          style={{ width: `${pct}%`, background: color }}
        />
      </div>

      {!compact && (
        <div className="job-progress__footer">
          {durationStr && (
            <span className="job-progress__duration">⏱ {durationStr}</span>
          )}
          {error && (
            <span className="job-progress__error">⚠ {error}</span>
          )}
          {status === 'COMPLETED' && outputAssets.length > 0 && (
            <div className="job-progress__outputs">
              {outputAssets.map((asset, i) => (
                <a
                  key={i}
                  href={asset.storageUrl?.startsWith('http')
                    ? asset.storageUrl
                    : `${import.meta.env.VITE_API_URL || 'https://paperkit-backend.onrender.com'}${asset.storageUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="job-progress__download-btn"
                  id={`job-download-${i}`}
                  download={asset.filename}
                >
                  ↓ {asset.filename || 'Download'}
                </a>
              ))}
            </div>
          )}
          {!isTerminal && onCancel && (
            <button
              className="job-progress__cancel-btn"
              onClick={onCancel}
              id="job-cancel-btn"
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
}
