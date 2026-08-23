import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PDFDocument } from 'pdf-lib';
import { FileTypeIcon } from '../../components/icons/ToolIcons';
import { PrimaryButton } from '../../components/ui/Button';
import Toggle from '../../components/ui/Toggle';
import Toast from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';
import { useProcessing } from '../../context/ProcessingContext';
import './RotatePDFScreen.css';

const DEGREES = [
  { value: 90, label: '90° Clockwise' },
  { value: 180, label: '180° Flip' },
  { value: 270, label: '90° Counter-Clockwise' },
];

export default function RotatePDFScreen() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [degrees, setDegrees] = useState(90);
  const [rotateAll, setRotateAll] = useState(true);
  const [pageRange, setPageRange] = useState('');
  const [rotating, setRotating] = useState(false);

  const { runProcessing } = useProcessing();
  const { toast, showToast, dismissToast } = useToast();

  async function getPdfPageCount(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { updateMetadata: false });
      return pdfDoc.getPageCount();
    } catch (err) {
      console.error('Error reading PDF pages:', err);
      return 0;
    }
  }

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setTotalPages(0);
    try {
      const pageCount = await getPdfPageCount(file);
      setTotalPages(pageCount);
    } catch (err) {
      showToast('Reading file failed: ' + err.message, 'error');
    }
  }

  function parsePageRange(rangeStr, maxPages) {
    if (!rangeStr.trim()) return null;
    const pages = new Set();
    const parts = rangeStr.split(',');
    for (let part of parts) {
      part = part.trim();
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-');
        const start = parseInt(startStr.trim(), 10);
        const end = parseInt(endStr.trim(), 10);
        if (!isNaN(start) && !isNaN(end)) {
          const rStart = Math.min(start, end);
          const rEnd = Math.max(start, end);
          for (let i = rStart; i <= rEnd; i++) {
            if (i >= 1 && i <= maxPages) pages.add(i - 1);
          }
        }
      } else {
        const val = parseInt(part, 10);
        if (!isNaN(val)) {
          if (val >= 1 && val <= maxPages) pages.add(val - 1);
        }
      }
    }
    return pages.size > 0 ? Array.from(pages).sort((a, b) => a - b) : null;
  }

  async function handleRotate() {
    if (!selectedFile) {
      fileInputRef.current?.click();
      return;
    }
    
    let targetPages = null;
    if (!rotateAll) {
      if (!pageRange.trim()) {
        showToast('Specify pages to rotate', 'warning');
        return;
      }
      targetPages = parsePageRange(pageRange, totalPages);
      if (!targetPages) {
        showToast('Invalid page range format', 'warning');
        return;
      }
    }

    setRotating(true);
    try {
      const result = await runProcessing('rotate-pdf', { file: selectedFile, degrees, targetPages });
      
      setTimeout(() => {
        if (result.download_url) {
          const url = result.download_url.startsWith('http') || result.download_url.startsWith('blob:')
            ? result.download_url
            : `${import.meta.env.VITE_API_URL || 'https://paperkit-backend.onrender.com'}${result.download_url}`;
          window.open(url, '_blank');
        }
        navigate('/files', { replace: true });
      }, 500);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setRotating(false);
    }
  }

  return (
    <div className="rotate-screen">
      <div className="rotate-screen__body">
        {/* File picker */}
        {!selectedFile ? (
          <button className="compress-screen__pick-btn" onClick={() => fileInputRef.current?.click()} id="rotate-pick-file-btn">
            <div className="compress-screen__pick-icon" style={{ width: 48, height: 48, background: '#DBEAFE', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
            </div>
            <p className="compress-screen__pick-label">Choose PDF File</p>
            <p className="compress-screen__pick-sub">Tap to select a PDF to rotate</p>
          </button>
        ) : (
          <div className="compress-screen__file-card" onClick={() => fileInputRef.current?.click()}>
            <FileTypeIcon type="pdf" size={40} />
            <div className="compress-screen__file-info">
              <p className="compress-screen__file-name">{selectedFile.name}</p>
              <p className="compress-screen__file-meta">{totalPages ? `${totalPages} pages` : 'Ready'}</p>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
          id="rotate-file-input"
        />

        {selectedFile && (
          <>
            <h3 className="convert-screen__options-title" style={{ marginTop: 'var(--space-2)' }}>Rotation Angle</h3>
            <div className="rotate-screen__degrees">
              {DEGREES.map(d => (
                <button
                  key={d.value}
                  className={`rotate-screen__degree-btn ${degrees === d.value ? 'rotate-screen__degree-btn--active' : ''}`}
                  onClick={() => setDegrees(d.value)}
                  id={`rotate-deg-${d.value}`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            {/* Page selection */}
            <div className="rotate-screen__options">
              <div className="convert-screen__option-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="convert-screen__option-label">Rotate All Pages</span>
                <Toggle checked={rotateAll} onChange={setRotateAll} id="rotate-all-pages-toggle" label="Rotate All" />
              </div>

              {!rotateAll && (
                <div className="rotate-screen__option">
                  <label className="rotate-screen__label" htmlFor="rotate-pages">
                    Pages to Rotate (e.g. 1-3, 5)
                  </label>
                  <input
                    id="rotate-pages"
                    className="rotate-screen__input"
                    type="text"
                    placeholder={`e.g. 1, 3, 5-${totalPages}`}
                    value={pageRange}
                    onChange={e => setPageRange(e.target.value)}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="compress-screen__footer">
        <PrimaryButton
          onClick={handleRotate}
          loading={rotating}
          disabled={rotating}
          id="rotate-submit-btn"
        >
          {selectedFile ? 'ROTATE PDF' : 'SELECT PDF TO ROTATE'}
        </PrimaryButton>
      </div>

      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
    </div>
  );
}
