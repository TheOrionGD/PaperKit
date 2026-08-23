import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Check, Download, Eye, Sparkles, RefreshCw, LogOut, ArrowRight,
  FileText, Shield, Layers, Minimize2, FileCode, Edit3, Lock,
  Bot, Scale, Search, Split, FileCheck, Trophy, Clock, Pause, Play
} from 'lucide-react';
import { FileTypeIcon } from '../icons/ToolIcons';
import FilePreviewModal from '../ui/FilePreviewModal';
import { downloadAndOpenFile } from '../../services/native';
import './CommonResultScreen.css';

/**
 * Standard Action Definitions for Dynamic Next Actions
 */
export const ACTION_PRESETS = {
  compress: {
    id: 'compress',
    label: 'Compress PDF',
    desc: 'Reduce file size',
    icon: Minimize2,
    route: '/tools/compress',
  },
  split: {
    id: 'split',
    label: 'Split PDF',
    desc: 'Divide into smaller parts',
    icon: Split,
    route: '/tools/split',
  },
  merge: {
    id: 'merge',
    label: 'Merge PDF',
    desc: 'Combine with other PDFs',
    icon: Layers,
    route: '/tools/merge',
  },
  convert: {
    id: 'convert',
    label: 'Convert Document',
    desc: 'Word, Excel, Images',
    icon: FileCode,
    route: '/tools/convert',
  },
  protect: {
    id: 'protect',
    label: 'Password Protect',
    desc: '256-bit AES encryption',
    icon: Lock,
    route: '/tools/protect',
  },
  watermark: {
    id: 'watermark',
    label: 'Add Watermark',
    desc: 'Stamp text or branding',
    icon: Shield,
    route: '/tools/watermark',
  },
  aiSummary: {
    id: 'ai-summary',
    label: 'AI Summary',
    desc: 'Executive summary & bullets',
    icon: FileText,
    route: '/ai/summarize',
  },
  aiChat: {
    id: 'ai-chat',
    label: 'Ask AI',
    desc: 'Interactive Q&A & citations',
    icon: Bot,
    route: '/ai/ask',
  },
  aiSearch: {
    id: 'ai-search',
    label: 'Search Document',
    desc: 'Semantic concept search',
    icon: Search,
    route: '/ai/search',
  },
  aiCompare: {
    id: 'ai-compare',
    label: 'Semantic Compare',
    desc: 'Detect meaningful changes',
    icon: Scale,
    route: '/ai/compare',
  },
  ocr: {
    id: 'ocr',
    label: 'Run OCR',
    desc: 'Extract digital text',
    icon: FileCheck,
    route: '/ai/ocr',
  },
};

export default function CommonResultScreen({
  title = 'Operation Completed ✓',
  subtitle = 'Your file is ready!',
  file = null, // { name, size, pageCount, download_url, mimeType, rawFile }
  files = null, // Array of parts [{ name, download_url, size, file }]
  rawText = null,
  metrics = null, // Array of { label, value, badge }
  nextActions = [], // Array of action presets or custom { id, label, desc, icon, route, onClick }
  primaryAction = null, // { label, onClick, icon }
  secondaryActions: _secondaryActions = null, // Array of { label, onClick, icon }
  onReset = null,
  sourceWorkflow = 'paperkit-tool',
  autoDownloadDelay = 3, // Auto download after 3 seconds
}) {
  const navigate = useNavigate();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [activePreviewTarget, setActivePreviewTarget] = useState(null);

  // 3-Second Auto Download State Machine
  const [countdown, setCountdown] = useState(autoDownloadDelay);
  const [autoDownloadActive, setAutoDownloadActive] = useState(true);
  const [downloadTriggered, setDownloadTriggered] = useState(false);

  function formatSize(bytes) {
    if (!bytes || bytes === 0) return 'Ready';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function handlePreviewTrigger(targetFile) {
    setActivePreviewTarget(targetFile || file);
    setIsPreviewOpen(true);
  }

  function handleDefaultDownload() {
    if (file?.download_url) {
      downloadAndOpenFile(file.download_url, file.name || 'document.pdf', file.mimeType);
    } else if (files && files.length > 0) {
      files.forEach((f, idx) => {
        if (f.download_url) {
          downloadAndOpenFile(f.download_url, f.name || f.filename || `part_${idx + 1}.pdf`, f.mimeType);
        }
      });
    }
  }

  const triggerDownload = useCallback(() => {
    if (downloadTriggered) return;
    setDownloadTriggered(true);
    setAutoDownloadActive(false);

    if (primaryAction?.onClick) {
      primaryAction.onClick();
    } else {
      handleDefaultDownload();
    }
  }, [downloadTriggered, primaryAction]);

  useEffect(() => {
    if (!autoDownloadActive || downloadTriggered) return;

    if (countdown <= 0) {
      triggerDownload();
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          triggerDownload();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoDownloadActive, countdown, downloadTriggered, triggerDownload]);

  function handleActionClick(action) {
    if (action.onClick) {
      action.onClick();
      return;
    }

    if (action.route) {
      // Pass state directly to target screen with zero re-upload needed
      const statePayload = action.getStatePayload 
        ? action.getStatePayload({ file, files, rawText })
        : {
            chainedFile: file?.rawFile || file,
            chainedFiles: files || (file ? [file] : []),
            rawText: rawText || (file?.text || ''),
            fromWorkflow: sourceWorkflow,
          };

      navigate(action.route, { state: statePayload });
    }
  }

  return (
    <div className="common-result">
      {/* ── Celebration Confetti Burst ── */}
      <div className="common-result__confetti-container">
        {[...Array(12)].map((_, i) => (
          <span key={i} className={`common-result__confetti-particle particle-${i + 1}`} />
        ))}
      </div>

      {/* ── Celebration Reward Header ── */}
      <div className="common-result__header">
        <div className="common-result__badge-wrapper">
          <div className="common-result__badge-ring" />
          <div className="common-result__badge-icon">
            <Check size={30} strokeWidth={3.5} />
          </div>
        </div>
        <div className="common-result__reward-tag">
          <Trophy size={14} color="#F59E0B" />
          <span>Reward Unlocked: Processing Complete</span>
        </div>
        <h2 className="common-result__title">{title}</h2>
        <p className="common-result__subtitle">{subtitle}</p>
      </div>

      {/* ── 3-Second Auto Download Indicator Bar ── */}
      <div className="common-result__autodownload-card">
        <div className="common-result__autodownload-info">
          <div className="common-result__autodownload-icon-box">
            <Clock size={16} className={autoDownloadActive && !downloadTriggered ? "animate-pulse" : ""} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="common-result__autodownload-title-row">
              <span className="common-result__autodownload-status">
                {downloadTriggered 
                  ? '✓ Download Started' 
                  : autoDownloadActive 
                    ? `Auto-downloading in ${countdown}s...` 
                    : 'Auto-download Paused'}
              </span>
              <span className="common-result__autodownload-badge">3s Timer</span>
            </div>
            <div className="common-result__autodownload-bar-bg">
              <div 
                className="common-result__autodownload-bar-fill" 
                style={{ width: `${autoDownloadActive ? Math.max(0, (countdown / 3) * 100) : (downloadTriggered ? 100 : 0)}%` }} 
              />
            </div>
          </div>
        </div>
        
        <div className="common-result__autodownload-actions">
          {autoDownloadActive && !downloadTriggered ? (
            <button 
              type="button" 
              className="common-result__autodownload-btn"
              onClick={() => setAutoDownloadActive(false)}
            >
              <Pause size={12} /> Pause
            </button>
          ) : !downloadTriggered ? (
            <button 
              type="button" 
              className="common-result__autodownload-btn"
              onClick={() => setAutoDownloadActive(true)}
            >
              <Play size={12} /> Resume
            </button>
          ) : null}

          <button 
            type="button" 
            className="common-result__autodownload-btn primary"
            onClick={triggerDownload}
          >
            <Download size={12} /> {downloadTriggered ? 'Download Again' : 'Download Now'}
          </button>
        </div>
      </div>

      {/* ── Main Output File Card ── */}
      {file && (
        <div className="common-result__file-card">
          <div className="common-result__file-main">
            <div className="common-result__file-icon">
              <FileTypeIcon type={file.mimeType?.includes('word') || file.name?.endsWith('.docx') ? 'word' : 'pdf'} size={24} />
            </div>
            <div className="common-result__file-meta">
              <h4 className="common-result__file-name">{file.name || 'Completed_Document.pdf'}</h4>
              <p className="common-result__file-details">
                {formatSize(file.size)}
                {file.pageCount ? ` • ${file.pageCount} ${file.pageCount === 1 ? 'page' : 'pages'}` : ''}
              </p>
            </div>
          </div>
          <div className="common-result__file-actions">
            {file.download_url && (
              <button
                type="button"
                className="common-result__btn-preview"
                onClick={() => handlePreviewTrigger(file)}
                id="result-preview-btn"
              >
                <Eye size={13} />
                <span>Preview</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Custom Metric Box (Compression, Similarity, OCR) ── */}
      {metrics && Array.isArray(metrics) && metrics.length > 0 && (
        <div className="common-result__metric-box">
          {metrics.map((m, idx) => (
            <div key={idx} className="common-result__metric-item">
              <span className="common-result__metric-label">{m.label}</span>
              <span className="common-result__metric-value">{m.value}</span>
              {m.badge && <span className="common-result__metric-badge">{m.badge}</span>}
            </div>
          ))}
        </div>
      )}

      {/* ── Generated Parts Box (Split / Extract) ── */}
      {files && Array.isArray(files) && files.length > 1 && (
        <div className="common-result__parts-box">
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
            Generated Files ({files.length} Parts):
          </div>
          {files.map((p, idx) => (
            <div key={idx} className="common-result__part-row">
              <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }}>
                {p.name || p.filename || `Part ${idx + 1}.pdf`}
              </span>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {p.download_url && (
                  <button
                    type="button"
                    className="common-result__btn-preview"
                    style={{ padding: '2px 8px', fontSize: '10px' }}
                    onClick={() => handlePreviewTrigger(p)}
                  >
                    <Eye size={10} /> Preview
                  </button>
                )}
                {p.download_url && (
                  <button
                    type="button"
                    className="common-result__btn-preview"
                    style={{ padding: '2px 8px', fontSize: '10px', backgroundColor: 'var(--color-primary)', color: '#ffffff' }}
                    onClick={() => downloadAndOpenFile(p.download_url, p.name || p.filename || `part_${idx + 1}.pdf`, p.mimeType)}
                  >
                    <Download size={10} /> Download
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── What Would You Like To Do Next? ── */}
      {nextActions && nextActions.filter(Boolean).length > 0 && (
        <div className="common-result__next-section">
          <div className="common-result__next-header">
            <Sparkles size={14} color="var(--color-primary)" />
            <span className="common-result__next-title">What would you like to do next?</span>
          </div>

          <div className="common-result__actions-grid">
            {nextActions.filter(Boolean).map((action, idx) => {
              const ActionIcon = action.icon || ArrowRight;
              return (
                <button
                  key={action.id || idx}
                  type="button"
                  className="common-result__action-card"
                  onClick={() => handleActionClick(action)}
                  id={`next-action-${action.id || idx}`}
                >
                  <div className="common-result__action-icon">
                    <ActionIcon size={16} />
                  </div>
                  <p className="common-result__action-label">{action.label}</p>
                  {action.desc && <p className="common-result__action-desc">{action.desc}</p>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Primary & Secondary Footer Buttons ── */}
      <div className="common-result__footer">
        <button
          type="button"
          className="common-result__primary-btn"
          onClick={primaryAction?.onClick || handleDefaultDownload}
          id="result-primary-download-btn"
        >
          {primaryAction?.icon ? <primaryAction.icon size={16} /> : <Download size={16} />}
          <span>{primaryAction?.label || (files && files.length > 1 ? 'Download All Files' : 'Download Document')}</span>
        </button>

        <div className="common-result__secondary-row">
          {onReset && (
            <button
              type="button"
              className="common-result__secondary-btn"
              onClick={onReset}
              id="result-reset-btn"
            >
              <RefreshCw size={13} />
              <span>Start Another</span>
            </button>
          )}

          <button
            type="button"
            className="common-result__secondary-btn"
            onClick={() => navigate('/')}
            id="result-exit-btn"
          >
            <LogOut size={13} />
            <span>Exit to Dashboard</span>
          </button>
        </div>
      </div>

      {/* Interactive Preview Modal */}
      <FilePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        fileUrl={activePreviewTarget?.download_url || file?.download_url}
        fileName={activePreviewTarget?.name || activePreviewTarget?.filename || file?.name}
        fileSize={activePreviewTarget?.size || file?.size}
        mimeType={activePreviewTarget?.mimeType || file?.mimeType || 'application/pdf'}
        rawFile={activePreviewTarget?.rawFile || file?.rawFile}
      />
    </div>
  );
}
