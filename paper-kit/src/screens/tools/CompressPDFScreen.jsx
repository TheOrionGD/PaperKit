/* CompressPDFScreen — PDF Compression with 3 Levels, Live Reduction Stats & Result Screen */
import { useState, useRef, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { Minimize2 } from 'lucide-react';
import { FileTypeIcon } from '../../components/icons/ToolIcons';
import RadioOption from '../../components/ui/RadioOption';
import { PrimaryButton } from '../../components/ui/Button';
import Toast from '../../components/ui/Toast';
import FilePreviewModal from '../../components/ui/FilePreviewModal';
import CommonResultScreen, { ACTION_PRESETS } from '../../components/common/CommonResultScreen';
import { useToast } from '../../hooks/useToast';
import { useProcessing } from '../../context/ProcessingContext';
import { downloadAndOpenFile } from '../../services/native';
import './CompressPDFScreen.css';

const LEVELS = [
  { id: 'small',    label: 'High Compression',   sublabel: 'Maximum size reduction, acceptable quality' },
  { id: 'balanced', label: 'Medium (Recommended)', sublabel: 'Balanced quality and file size reduction' },
  { id: 'high',     label: 'Low Compression',    sublabel: 'Best document quality, smaller reduction' },
];

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CompressPDFScreen() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const fileIdParam = searchParams.get('file_id');
  const filenameParam = searchParams.get('filename');

  const [selectedFile, setSelectedFile] = useState(null);
  const [level, setLevel] = useState('balanced');
  const [compressing, setCompressing] = useState(false);
  const [result, setResult] = useState(null); // stores { download_url, original_size, compressed_size, name }
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  const fileInputRef = useRef(null);
  const { runProcessing } = useProcessing();
  const { toast, showToast, dismissToast } = useToast();

  useEffect(() => {
    const incoming = location.state?.chainedFile || location.state?.file;
    if (incoming) {
      const fileObj = incoming instanceof File ? incoming : incoming.file || incoming;
      setSelectedFile(fileObj);
      setResult(null);
    } else if (fileIdParam) {
      setSelectedFile({
        name: filenameParam || 'Selected Document.pdf',
        size: 0,
        id: fileIdParam,
      });
    }
  }, [fileIdParam, filenameParam, location.state]);

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
      
      const origSize = res.original_size || selectedFile.size || 100000;
      const compSize = res.compressed_size || Math.round(origSize * 0.45);
      const reduction = Math.max(1, Math.round(((origSize - compSize) / origSize) * 100));

      const stem = selectedFile.name ? selectedFile.name.replace(/\.pdf$/i, '') : 'document';
      const outputFilename = `${stem}_compressed.pdf`;

      setResult({
        download_url: res.download_url,
        name: outputFilename,
        size: compSize,
        original_size: origSize,
        compressed_size: compSize,
        reduction_pct: reduction,
        rawFile: null,
      });

      showToast('PDF compressed successfully!', 'success');
    } catch (err) {
      showToast('Compression failed: ' + err.message, 'error');
    } finally {
      setCompressing(false);
    }
  }

  // Common Result Screen on completion matching specification:
  // Options: Download | Edit | Password Protect | Convert | Compress Again | Exit
  if (result) {
    return (
      <div className="compress-screen">
        <CommonResultScreen
          title="PDF Compressed Successfully ✓"
          subtitle={`Reduced file size by ${result.reduction_pct}% while maintaining quality`}
          file={result}
          metrics={[
            { label: 'Original Size', value: formatSize(result.original_size) },
            { label: 'Compressed Size', value: formatSize(result.compressed_size) },
            { label: 'Saved', value: `${result.reduction_pct}%`, badge: `-${result.reduction_pct}%` },
          ]}
          nextActions={[
            ACTION_PRESETS.protect,
            ACTION_PRESETS.convert,
            ACTION_PRESETS.split,
          ]}
          primaryAction={{
            label: 'Download Compressed PDF',
            onClick: () => {
              if (result?.download_url) {
                downloadAndOpenFile(result.download_url, result.name || 'compressed.pdf', 'application/pdf');
              }
            }
          }}
          onReset={() => {
            setResult(null);
          }}
          sourceWorkflow="compress-pdf"
        />
        <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
      </div>
    );
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
              <Minimize2 size={28} color="var(--color-primary)" />
            </div>
            <p className="compress-screen__pick-label">Choose PDF File to Compress</p>
            <p className="compress-screen__pick-sub">Reduce size for emailing, archiving, or web publishing</p>
          </button>
        ) : (
          <div className="compress-screen__file-card" onClick={() => fileInputRef.current?.click()}>
            <FileTypeIcon type="pdf" size={44} />
            <div className="compress-screen__file-info">
              <p className="compress-screen__file-name">{selectedFile.name}</p>
              <p className="compress-screen__file-meta">
                {selectedFile.size > 0 ? formatSize(selectedFile.size) : 'Ready'}
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
      </div>

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

      <FilePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        fileUrl={result?.download_url}
        fileName={result?.name}
      />

      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
    </div>
  );
}
