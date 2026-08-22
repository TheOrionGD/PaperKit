import { useState, useRef, useEffect } from 'react';
import { Upload, Eye, Download } from 'lucide-react';
import { FileTypeIcon } from '../../components/icons/ToolIcons';
import RadioOption from '../../components/ui/RadioOption';
import { PrimaryButton } from '../../components/ui/Button';
import Toast from '../../components/ui/Toast';
import FilePreviewModal from '../../components/ui/FilePreviewModal';
import { useToast } from '../../hooks/useToast';
import { useSearchParams } from 'react-router-dom';
import { useProcessing } from '../../context/ProcessingContext';
import './CompressPDFScreen.css';

const LEVELS = [
  { id: 'high',     label: 'High Quality', sublabel: 'Best quality, larger size' },
  { id: 'balanced', label: 'Balanced',     sublabel: 'Good quality, good size' },
  { id: 'small',    label: 'Small Size',   sublabel: 'Smallest size, lower quality' },
];

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CompressPDFScreen() {
  const [searchParams] = useSearchParams();
  const fileIdParam = searchParams.get('file_id');
  const filenameParam = searchParams.get('filename');

  const [selectedFile, setSelectedFile] = useState(null);
  const [level, setLevel] = useState('balanced');
  const [compressing, setCompressing] = useState(false);
  const [result, setResult] = useState(null); // stores { download_url, original_size, compressed_size }
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  const fileInputRef = useRef(null);
  const { runProcessing } = useProcessing();
  const { toast, showToast, dismissToast } = useToast();

  useEffect(() => {
    if (fileIdParam) {
      setSelectedFile({
        name: filenameParam || 'Selected Document.pdf',
        size: 0,
        pageCount: null,
        id: fileIdParam
      });
    }
  }, [fileIdParam, filenameParam]);

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setResult(null);
  }

  async function handleCompress() {
    if (!selectedFile) {
      fileInputRef.current?.click();
      return;
    }
    setCompressing(true);
    setResult(null);
    try {
      const inputVal = selectedFile.id || selectedFile;
      const res = await runProcessing('compress-pdf', { file: inputVal }, { quality: level });
      setResult(res);
    } catch (err) {
      showToast('Compression failed: ' + err.message, 'error');
    } finally {
      setCompressing(false);
    }
  }

  return (
    <div className="compress-screen">
      <div className="compress-screen__body">
        {/* File selector */}
        {!selectedFile ? (
          <button
            className="compress-screen__pick-btn"
            onClick={() => fileInputRef.current?.click()}
            id="compress-pick-file-btn"
          >
            <div className="compress-screen__pick-icon">
              <Upload size={28} color="var(--color-primary)" />
            </div>
            <p className="compress-screen__pick-label">Choose PDF File</p>
            <p className="compress-screen__pick-sub">Tap to select a file</p>
          </button>
        ) : (
          <div className="compress-screen__file-card" onClick={() => fileInputRef.current?.click()}>
            <FileTypeIcon type="pdf" size={44} />
            <div className="compress-screen__file-info">
              <p className="compress-screen__file-name">{selectedFile.name}</p>
              <p className="compress-screen__file-meta">
                {selectedFile.size > 0 ? formatSize(selectedFile.size) : 'Ready'}
                {selectedFile.pageCount ? ` • ${selectedFile.pageCount} pages` : ''}
              </p>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
          id="compress-file-input"
        />

        {/* Compression level selection */}
        <div className="compress-screen__section">
          <h3 className="compress-screen__section-title">Compression Level</h3>
          <div className="compress-screen__levels">
            {LEVELS.map(l => (
              <RadioOption
                key={l.id}
                label={l.label}
                sublabel={l.sublabel}
                selected={level === l.id}
                onSelect={() => setLevel(l.id)}
                id={`compress-level-${l.id}`}
              />
            ))}
          </div>
        </div>

        {/* Real Compression Results Display after Processing */}
        {result && (
          <div className="compress-screen__section">
            <h3 className="compress-screen__section-title">Compression Results</h3>
            
            <div className="compress-screen__estimate" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-2) 0' }}>
              <span className="compress-screen__estimate-label" style={{ fontWeight: 'var(--font-weight-semibold)' }}>Estimated Size</span>
              <div className="compress-screen__estimate-values" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span className="compress-screen__estimate-from" style={{ color: 'var(--color-text-muted)' }}>{formatSize(result.original_size)}</span>
                <span className="compress-screen__estimate-arrow" style={{ color: 'var(--color-text-muted)' }}>→</span>
                <span className="compress-screen__estimate-to" style={{ fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)' }}>{formatSize(result.compressed_size)}</span>
                <span className="compress-screen__estimate-pct" style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: '#10B981',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: '700',
                  marginLeft: 'var(--space-2)'
                }}>
                  -{Math.round((1 - result.compressed_size / result.original_size) * 100)}%
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: 'var(--space-4)' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsPreviewOpen(true)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Eye size={18} />
                <span>PREVIEW PDF</span>
              </button>

              <a 
                href={result.download_url} 
                download={result.filename || 'compressed.pdf'}
                className="btn-primary"
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  textDecoration: 'none',
                  boxSizing: 'border-box'
                }}
              >
                <Download size={18} />
                <span>DOWNLOAD</span>
              </a>
            </div>
          </div>
        )}
      </div>

      <FilePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        fileUrl={result?.download_url}
        fileName={result?.filename || 'compressed.pdf'}
        mimeType="application/pdf"
      />

      <div className="compress-screen__footer">
        <PrimaryButton
          onClick={handleCompress}
          loading={compressing}
          disabled={compressing}
          id="compress-submit-btn"
        >
          {selectedFile ? 'COMPRESS PDF' : 'SELECT PDF TO COMPRESS'}
        </PrimaryButton>
      </div>

      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
    </div>
  );
}
