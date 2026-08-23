import { useState, useEffect, useCallback } from 'react';
import { Clock, CheckCircle, XCircle, AlertCircle, RefreshCw, Download, Eye } from 'lucide-react';
import { getProcessingHistory } from '../services/tools';
import { formatDateTime, formatFileTimestamp } from '../utils/dateUtils';
import LoadingState from '../components/ui/LoadingState';
import EmptyState from '../components/ui/EmptyState';
import FilePreviewModal from '../components/ui/FilePreviewModal';
import './HistoryScreen.css';

import { API_BASE } from '../services/api';

const STATUS_ICONS = {
  completed: <CheckCircle size={16} style={{ color: '#22c55e' }} />,
  failed:    <XCircle    size={16} style={{ color: '#ef4444' }} />,
  cancelled: <AlertCircle size={16} style={{ color: '#f59e0b' }} />,
};

const STATUS_LABELS = {
  completed: 'Completed',
  failed:    'Failed',
  cancelled: 'Cancelled',
};

function formatDuration(ms) {
  if (ms == null) return '—';
  if (ms < 1000)  return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function resolveUrl(url) {
  if (!url) return null;
  return url.startsWith('http') ? url : `${API_BASE}${url}`;
}

export default function HistoryScreen() {
  const [history, setHistory]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [filterStatus, setFilter] = useState('all');
  const [searchTerm, setSearch]   = useState('');
  const [expanded, setExpanded]   = useState(null);

  // File Preview Modal State
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewTarget, setPreviewTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getProcessingHistory(50, 0);
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = history.filter(item => {
    const matchStatus = filterStatus === 'all' || (item.status || 'completed') === filterStatus;
    const matchSearch = !searchTerm || item.action?.toLowerCase().includes(searchTerm.toLowerCase())
      || item.tool_id?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  // Stats
  const total     = history.length;
  const completed = history.filter(h => (h.status || 'completed') === 'completed').length;
  const failed    = history.filter(h => h.status === 'failed').length;
  const avgDur    = history.filter(h => h.duration_ms).reduce((s, h) => s + h.duration_ms, 0) / (history.filter(h => h.duration_ms).length || 1);

  return (
    <div className="history-screen">
      {/* Stats bar */}
      <div className="history-screen__stats">
        <div className="history-screen__stat">
          <span className="history-screen__stat-value">{total}</span>
          <span className="history-screen__stat-label">Total Operations</span>
        </div>
        <div className="history-screen__stat history-screen__stat--success">
          <span className="history-screen__stat-value">{completed}</span>
          <span className="history-screen__stat-label">Completed</span>
        </div>
        <div className="history-screen__stat history-screen__stat--error">
          <span className="history-screen__stat-value">{failed}</span>
          <span className="history-screen__stat-label">Failed</span>
        </div>
        <div className="history-screen__stat">
          <span className="history-screen__stat-value">{formatDuration(Math.round(avgDur))}</span>
          <span className="history-screen__stat-label">Avg Duration</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="history-screen__toolbar">
        <div className="history-screen__search-wrap">
          <input
            className="history-screen__search"
            type="text"
            placeholder="Search operations…"
            value={searchTerm}
            onChange={e => setSearch(e.target.value)}
            id="history-search"
          />
        </div>
        <div className="history-screen__filters">
          {['all','completed','failed','cancelled'].map(s => (
            <button key={s} id={`history-filter-${s}`}
              className={`history-screen__filter-btn ${filterStatus === s ? 'history-screen__filter-btn--active' : ''}`}
              onClick={() => setFilter(s)}>
              {s === 'all' ? 'All' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <button className="history-screen__refresh-btn" onClick={load} id="history-refresh" title="Refresh">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Content */}
      {loading && <LoadingState text="Loading history…" />}
      {!loading && error && (
        <div className="history-screen__error">{error}</div>
      )}
      {!loading && !error && filtered.length === 0 && (
        <EmptyState icon={Clock} title="No history yet" description="Your processing operations will appear here" />
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="history-screen__list">
          {filtered.map(item => {
            const status   = item.status || 'completed';
            const isExpand = expanded === item.id;
            const outUrl   = item.output_file?.storage_url;
            return (
              <div key={item.id}
                className={`history-item history-item--${status}`}
                onClick={() => setExpanded(isExpand ? null : item.id)}>
                <div className="history-item__main">
                  <div className="history-item__icon">
                    {STATUS_ICONS[status] || <CheckCircle size={16} style={{ color: '#22c55e' }} />}
                  </div>
                  <div className="history-item__content">
                    <div className="history-item__action">{item.action || item.tool_id}</div>
                    <div className="history-item__meta">
                      <span>{formatFileTimestamp(item.created_at)}</span>
                      {item.duration_ms != null && (
                        <span className="history-item__sep">·</span>
                      )}
                      {item.duration_ms != null && (
                        <span>⏱ {formatDuration(item.duration_ms)}</span>
                      )}
                    </div>
                  </div>
                  <div className="history-item__right">
                    <span className={`history-item__badge history-item__badge--${status}`}>
                      {STATUS_LABELS[status] || status}
                    </span>
                    {outUrl && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          type="button"
                          className="history-item__download"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewTarget({
                              url: resolveUrl(outUrl),
                              name: item.output_file?.filename || item.action || 'Output Document',
                              size: item.output_file?.size,
                              fileId: item.output_file?.id,
                            });
                            setPreviewModalOpen(true);
                          }}
                          title="Preview Document"
                          style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Eye size={14} color="var(--color-primary)" />
                        </button>
                        <a href={resolveUrl(outUrl)} target="_blank" rel="noopener noreferrer"
                          className="history-item__download" download
                          onClick={e => e.stopPropagation()} id={`history-dl-${item.id}`} title="Download">
                          <Download size={14} />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded details */}
                {isExpand && (
                  <div className="history-item__details" onClick={e => e.stopPropagation()}>
                    {item.input_files?.length > 0 && (
                      <div className="history-item__detail-row">
                        <span className="history-item__detail-label">Input</span>
                        <span className="history-item__detail-val">
                          {item.input_files.map((f, i) => (
                            <span key={i} className="history-item__file-chip">{f}</span>
                          ))}
                        </span>
                      </div>
                    )}
                    {item.output_file?.filename && (
                      <div className="history-item__detail-row">
                        <span className="history-item__detail-label">Output</span>
                        <span className="history-item__detail-val" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="history-item__file-chip">{item.output_file.filename}</span>
                          {item.output_file.size && (
                            <small className="history-item__size">
                              {' '}({(item.output_file.size / 1024).toFixed(1)} KB)
                            </small>
                          )}
                          {outUrl && (
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewTarget({
                                  url: resolveUrl(outUrl),
                                  name: item.output_file.filename,
                                  size: item.output_file.size,
                                  fileId: item.output_file.id,
                                });
                                setPreviewModalOpen(true);
                              }}
                              style={{
                                background: 'var(--color-primary-soft)',
                                border: 'none',
                                color: 'var(--color-primary)',
                                fontSize: '11px',
                                fontWeight: 600,
                                padding: '2px 8px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                marginLeft: '6px'
                              }}
                            >
                              <Eye size={12} /> Preview
                            </button>
                          )}
                        </span>
                      </div>
                    )}
                    {Object.keys(item.parameters || {}).length > 0 && (
                      <div className="history-item__detail-row">
                        <span className="history-item__detail-label">Params</span>
                        <span className="history-item__detail-val history-item__params">
                          {Object.entries(item.parameters).map(([k, v]) => (
                            <span key={k} className="history-item__param-chip">
                              {k}: <strong>{String(v)}</strong>
                            </span>
                          ))}
                        </span>
                      </div>
                    )}
                    {item.error && (
                      <div className="history-item__detail-row">
                        <span className="history-item__detail-label history-item__detail-label--error">Error</span>
                        <span className="history-item__detail-val history-item__detail-error">{item.error}</span>
                      </div>
                    )}
                    {item.started_at && (
                      <div className="history-item__detail-row">
                        <span className="history-item__detail-label">Started</span>
                        <span className="history-item__detail-val">{formatDateTime(item.started_at)}</span>
                      </div>
                    )}
                    {item.completed_at && (
                      <div className="history-item__detail-row">
                        <span className="history-item__detail-label">Completed</span>
                        <span className="history-item__detail-val">{formatDateTime(item.completed_at)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <FilePreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        fileUrl={previewTarget?.url}
        fileName={previewTarget?.name}
        fileSize={previewTarget?.size}
        mimeType={previewTarget?.mimeType}
        fileId={previewTarget?.fileId}
      />
    </div>
  );
}
