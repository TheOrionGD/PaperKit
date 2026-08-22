/* SplitPDFScreen — split a PDF by range or every N pages */
import { useState, useRef } from 'react';
import { FileTypeIcon } from '../../components/icons/ToolIcons';
import { PrimaryButton } from '../../components/ui/Button';
import Toast from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';
import { useProcessing } from '../../context/ProcessingContext';
import './SplitPDFScreen.css';

const MODES = [
  { id: 'range',    label: 'By Page Range' },
  { id: 'every',    label: 'Every N Pages' },
  { id: 'extract',  label: 'Extract Pages' },
];

export default function SplitPDFScreen() {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [mode, setMode] = useState('range');
  const [pageRange, setPageRange] = useState('');
  const [everyN, setEveryN] = useState(1);
  const [splitting, setSplitting] = useState(false);
  const { runProcessing } = useProcessing();
  const { toast, showToast, dismissToast } = useToast();

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
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
      if (result.download_url) {
        const url = result.download_url.startsWith('http') || result.download_url.startsWith('blob:')
          ? result.download_url
          : `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${result.download_url}`;
        window.open(url, '_blank');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSplitting(false);
    }
  }

  return (
    <div className="split-screen">
      <div className="split-screen__body">
        {/* File picker */}
        {!selectedFile ? (
          <button className="compress-screen__pick-btn" onClick={() => fileInputRef.current?.click()} id="split-pick-file-btn">
            <div className="compress-screen__pick-icon" style={{ width: 48, height: 48, background: '#DBEAFE', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l5.1 5.1M4 4l5 5" />
              </svg>
            </div>
            <p className="compress-screen__pick-label">Choose PDF File</p>
            <p className="compress-screen__pick-sub">Tap to select a PDF to split</p>
          </button>
        ) : (
          <div className="compress-screen__file-card" onClick={() => fileInputRef.current?.click()}>
            <FileTypeIcon type="pdf" size={40} />
            <div className="compress-screen__file-info">
              <p className="compress-screen__file-name">{selectedFile.name}</p>
              <p className="compress-screen__file-meta">Ready</p>
            </div>
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

        {/* Split mode */}
        <div className="split-screen__modes">
          {MODES.map(m => (
            <button
              key={m.id}
              className={`split-screen__mode-btn ${mode === m.id ? 'split-screen__mode-btn--active' : ''}`}
              onClick={() => setMode(m.id)}
              id={`split-mode-${m.id}`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Mode options */}
        <div className="split-screen__options">
          {(mode === 'range' || mode === 'extract') && (
            <div className="split-screen__option">
              <label className="auth-screen__label" htmlFor="split-range">
                {mode === 'range' ? 'Page Range (e.g. 1-3, 5)' : 'Pages to Extract (e.g. 1,3,5-7)'}
              </label>
              <input
                id="split-range"
                className="split-screen__input"
                type="text"
                placeholder={mode === 'range' ? '1-5, 8, 10-12' : '1, 3, 5-7'}
                value={pageRange}
                onChange={e => setPageRange(e.target.value)}
              />
            </div>
          )}
          {mode === 'every' && (
            <div className="split-screen__option">
              <label className="auth-screen__label" htmlFor="split-every">Split every N pages</label>
              <input
                id="split-every"
                className="split-screen__input"
                type="number"
                min={1}
                value={everyN}
                onChange={e => setEveryN(Number(e.target.value))}
              />
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

      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
    </div>
  );
}
