/* SplitPDFScreen — Split PDF with 4 modes & Smart Workflow Chaining */
import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layers, Eye, Scissors } from 'lucide-react';
import { FileTypeIcon } from '../../components/icons/ToolIcons';
import { PrimaryButton } from '../../components/ui/Button';
import Toast from '../../components/ui/Toast';
import FilePreviewModal from '../../components/ui/FilePreviewModal';
import CommonResultScreen, { ACTION_PRESETS } from '../../components/common/CommonResultScreen';
import { downloadAndOpenFile } from '../../services/native';
import { useToast } from '../../hooks/useToast';
import { useProcessing } from '../../context/ProcessingContext';
import './SplitPDFScreen.css';

const MODES = [
  { id: 'range',      label: 'By Page Range',    desc: 'e.g. 1-20, 21-40' },
  { id: 'every',      label: 'Every N Pages',    desc: 'e.g. chunks of 2 pages' },
  { id: 'extract',    label: 'Extract Selected', desc: 'e.g. 1, 3, 5-7' },
  { id: 'individual', label: 'Single Pages',     desc: '1 file per page' },
];

export default function SplitPDFScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [mode, setMode] = useState('range');
  const [pageRange, setPageRange] = useState('');
  const [everyN, setEveryN] = useState(1);
  const [splitting, setSplitting] = useState(false);
  const [splitResult, setSplitResult] = useState(null);

  // File preview state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewTarget, setPreviewTarget] = useState(null);

  const { runProcessing } = useProcessing();
  const { toast, showToast, dismissToast } = useToast();

  useEffect(() => {
    // Check if incoming from another tool
    const incoming = location.state?.chainedFile || location.state?.file;
    if (incoming) {
      const fileObj = incoming instanceof File ? incoming : incoming.file || incoming;
      setSelectedFile(fileObj);
      showToast(`Loaded ${fileObj.name || 'document'} for splitting`, 'info');
    }
  }, [location.state, showToast]);

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setSplitResult(null);
  }

  async function handleSplit() {
    if (!selectedFile) {
      fileInputRef.current?.click();
      return;
    }
    setSplitting(true);
    try {
      const result = await runProcessing(
        'split-pdf',
        { file: selectedFile, mode, pageRange, everyN, pages: pageRange }
      );
      
      const stem = selectedFile.name ? selectedFile.name.replace(/\.pdf$/i, '') : 'document';
      const partsCount = result.parts || (result.download_urls?.length || 1);
      
      let generatedParts = [];
      if (result.download_urls && Array.isArray(result.download_urls)) {
        generatedParts = result.download_urls.map((url, idx) => ({
          name: `${stem}_part_${idx + 1}.pdf`,
          filename: `${stem}_part_${idx + 1}.pdf`,
          download_url: url,
          size: Math.round((selectedFile.size || 50000) / partsCount),
        }));
      } else if (result.parts && Array.isArray(result.parts)) {
        generatedParts = result.parts;
      } else {
        generatedParts = [{
          name: `${stem}_split.pdf`,
          filename: `${stem}_split.pdf`,
          download_url: result.download_url,
          size: selectedFile.size || 0,
        }];
      }

      setSplitResult({
        ...result,
        partsList: generatedParts,
        primaryFile: generatedParts[0],
      });

      showToast('PDF Split Successfully ✓', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to split PDF', 'error');
    } finally {
      setSplitting(false);
    }
  }

  function handleChainToMerge() {
    if (!splitResult?.partsList) return;
    navigate('/tools/merge', {
      state: {
        chainedFiles: splitResult.partsList,
        fromWorkflow: 'split-pdf',
      },
    });
  }

  // Common Result Screen on completion matching specification:
  // PDF Split Successfully ✓
  // Options: Download All | Merge These PDFs | Compress | Convert | Edit | Password Protect | Exit
  if (splitResult) {
    return (
      <div className="split-screen">
        <CommonResultScreen
          title="PDF Split Successfully ✓"
          subtitle={`${splitResult.partsList.length} independent PDF document(s) generated`}
          file={splitResult.primaryFile}
          files={splitResult.partsList}
          metrics={[
            { label: 'Split Mode', value: MODES.find(m => m.id === mode)?.label || 'Page Range' },
            { label: 'Generated Parts', value: `${splitResult.partsList.length} Files`, badge: 'Complete' },
          ]}
          nextActions={[
            {
              id: 'merge-these',
              label: 'Merge These PDFs',
              desc: 'Transfer parts directly to Merge module',
              icon: Layers,
              onClick: handleChainToMerge,
            },
            ACTION_PRESETS.compress,
            ACTION_PRESETS.convert,
            ACTION_PRESETS.protect,
          ]}
          primaryAction={{
            label: `Download All (${splitResult.partsList.length} Files)`,
            onClick: () => {
              splitResult.partsList.forEach(p => {
                if (p.download_url) {
                  downloadAndOpenFile(p.download_url, p.name || p.filename || 'split_part.pdf', 'application/pdf');
                }
              });
            }
          }}
          onReset={() => {
            setSplitResult(null);
            setSelectedFile(null);
            setPageRange('');
          }}
          sourceWorkflow="split-pdf"
        />
        <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
      </div>
    );
  }

  return (
    <div className="split-screen">
      <div className="split-screen__body">
        {/* File picker */}
        {!selectedFile ? (
          <button className="compress-screen__pick-btn" onClick={() => fileInputRef.current?.click()} id="split-pick-file-btn">
            <div className="compress-screen__pick-icon" style={{ width: 52, height: 52, background: 'var(--color-primary-soft)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Scissors size={26} color="var(--color-primary)" />
            </div>
            <p className="compress-screen__pick-label">Choose PDF File to Split</p>
            <p className="compress-screen__pick-sub">Select by ranges (e.g. 1-20), extract chunks, or split single sheets</p>
          </button>
        ) : (
          <div className="compress-screen__file-card" onClick={() => fileInputRef.current?.click()}>
            <FileTypeIcon type="pdf" size={40} />
            <div className="compress-screen__file-info">
              <p className="compress-screen__file-name">{selectedFile.name}</p>
              <p className="compress-screen__file-meta">
                {(selectedFile.size / 1024).toFixed(1)} KB • Ready to split
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPreviewTarget({
                  rawFile: selectedFile instanceof Blob ? selectedFile : null,
                  download_url: selectedFile instanceof Blob ? URL.createObjectURL(selectedFile) : null,
                  name: selectedFile.name,
                });
                setPreviewModalOpen(true);
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: 'var(--color-primary)' }}
            >
              <Eye size={18} />
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
          id="split-file-input"
        />

        {/* Split modes */}
        <div className="split-screen__modes" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
          {MODES.map(m => (
            <button
              key={m.id}
              className={`split-screen__mode-btn ${mode === m.id ? 'split-screen__mode-btn--active' : ''}`}
              onClick={() => { setMode(m.id); setSplitResult(null); }}
              id={`split-mode-${m.id}`}
              style={{ padding: '10px 12px', textAlign: 'left', borderRadius: '12px', border: mode === m.id ? '2px solid var(--color-primary)' : '1px solid var(--color-divider)', background: mode === m.id ? 'var(--color-primary-soft)' : 'var(--color-surface)', cursor: 'pointer' }}
            >
              <div style={{ fontWeight: 600, fontSize: '13px', color: mode === m.id ? 'var(--color-primary)' : 'var(--color-text)' }}>{m.label}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{m.desc}</div>
            </button>
          ))}
        </div>

        {/* Mode options */}
        <div className="split-screen__options" style={{ marginTop: '14px' }}>
          {(mode === 'range' || mode === 'extract') && (
            <div className="split-screen__option">
              <label className="split-screen__label" htmlFor="split-range" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>
                {mode === 'range' ? 'Page Ranges (e.g. 1-20, 21-40 or 1-3; 4-6)' : 'Pages to Extract (e.g. 1, 3, 5-7)'}
              </label>
              <input
                id="split-range"
                className="split-screen__input"
                type="text"
                placeholder={mode === 'range' ? '1-20, 21-40' : '1, 3, 5-7'}
                value={pageRange}
                onChange={e => { setPageRange(e.target.value); setSplitResult(null); }}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--color-divider)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
              />
            </div>
          )}
          {mode === 'every' && (
            <div className="split-screen__option">
              <label className="split-screen__label" htmlFor="split-every" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>
                Split every N pages
              </label>
              <input
                id="split-every"
                className="split-screen__input"
                type="number"
                min={1}
                value={everyN}
                onChange={e => { setEveryN(Number(e.target.value)); setSplitResult(null); }}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--color-divider)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
              />
            </div>
          )}
          {mode === 'individual' && (
            <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--color-surface)', border: '1px solid var(--color-divider)', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              Each page of your document will be separated into an independent single-page PDF.
            </div>
          )}
        </div>
      </div>

      <div className="compress-screen__footer">
        <PrimaryButton
          onClick={handleSplit}
          loading={splitting}
          disabled={splitting}
          id="split-submit-btn"
        >
          {selectedFile ? 'SPLIT PDF' : 'SELECT PDF TO SPLIT'}
        </PrimaryButton>
      </div>

      <FilePreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        fileUrl={previewTarget?.download_url}
        fileName={previewTarget?.name}
        rawFile={previewTarget?.rawFile}
      />

      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
    </div>
  );
}
