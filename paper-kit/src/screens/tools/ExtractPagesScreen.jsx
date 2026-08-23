/* ExtractPagesScreen — PDF Page Extractor with Visual & Range Selectors & Smart Chaining */
import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layers, Eye, Check, Scissors } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { FileTypeIcon } from '../../components/icons/ToolIcons';
import { PrimaryButton, SecondaryButton } from '../../components/ui/Button';
import Toast from '../../components/ui/Toast';
import FilePreviewModal from '../../components/ui/FilePreviewModal';
import CommonResultScreen, { ACTION_PRESETS } from '../../components/common/CommonResultScreen';
import { useToast } from '../../hooks/useToast';
import { useProcessing } from '../../context/ProcessingContext';
import { downloadAndOpenFile } from '../../services/native';
import './CompressPDFScreen.css';

export default function ExtractPagesScreen() {
  const _navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [selectedPages, setSelectedPages] = useState(new Set());
  const [rangeInput, setRangeInput] = useState('');
  const [extractMode, _setExtractMode] = useState('single'); // single (1 combined PDF) | separate (1 PDF per page)
  const [extracting, setExtracting] = useState(false);
  const [extractResult, setExtractResult] = useState(null);

  // Preview modal
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewTarget, setPreviewTarget] = useState(null);

  const { runProcessing } = useProcessing();
  const { toast, showToast, dismissToast } = useToast();

  async function loadPdfDetails(file) {
    try {
      const buffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer, { updateMetadata: false });
      const count = pdfDoc.getPageCount();
      setPageCount(count);
      if (count > 0) setSelectedPages(new Set([1]));
    } catch (err) {
      console.error(err);
      setPageCount(1);
    }
  }

  useEffect(() => {
    const incoming = location.state?.chainedFile || location.state?.file;
    if (incoming) {
      const fileObj = incoming instanceof File ? incoming : incoming.file || incoming;
      setSelectedFile(fileObj);
      loadPdfDetails(fileObj);
    }
  }, [location.state]);

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setSelectedPages(new Set());
    setExtractResult(null);
    await loadPdfDetails(file);
  }

  function togglePage(pageNum) {
    setSelectedPages(prev => {
      const next = new Set(prev);
      if (next.has(pageNum)) next.delete(pageNum);
      else next.add(pageNum);
      return next;
    });
    setExtractResult(null);
  }

  function handleSelectAll() {
    const all = new Set();
    for (let i = 1; i <= pageCount; i++) all.add(i);
    setSelectedPages(all);
    setExtractResult(null);
  }

  function handleSelectNone() {
    setSelectedPages(new Set());
    setExtractResult(null);
  }

  function applyRangeInput() {
    if (!rangeInput.trim()) return;
    const parts = rangeInput.split(/[,;]/);
    const newSet = new Set();
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.includes('-')) {
        const [start, end] = trimmed.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = Math.max(1, start); i <= Math.min(pageCount, end); i++) {
            newSet.add(i);
          }
        }
      } else {
        const num = Number(trimmed);
        if (!isNaN(num) && num >= 1 && num <= pageCount) {
          newSet.add(num);
        }
      }
    }
    if (newSet.size > 0) {
      setSelectedPages(newSet);
      showToast(`Selected ${newSet.size} pages from range`, 'info');
    }
  }

  async function handleExtract() {
    if (!selectedFile) {
      fileInputRef.current?.click();
      return;
    }
    if (selectedPages.size === 0) {
      showToast('Please select at least 1 page to extract', 'warning');
      return;
    }

    setExtracting(true);
    setExtractResult(null);

    try {
      const pagesArray = Array.from(selectedPages).sort((a, b) => a - b);
      const pagesRangeStr = pagesArray.join(',');

      const res = await runProcessing('split-pdf', {
        file: selectedFile,
        mode: extractMode === 'separate' ? 'individual' : 'extract',
        pages: pagesRangeStr,
        pageRange: pagesRangeStr,
      });

      const stem = selectedFile.name ? selectedFile.name.replace(/\.pdf$/i, '') : 'document';
      const outputFilename = `${stem}_extracted_p${pagesRangeStr}.pdf`;

      setExtractResult({
        download_url: res.download_url || (res.download_urls && res.download_urls[0]),
        name: outputFilename,
        size: res.size || Math.round((selectedFile.size || 50000) * (selectedPages.size / Math.max(1, pageCount))),
        pageCount: selectedPages.size,
        selectedPagesCount: selectedPages.size,
        pagesStr: pagesRangeStr,
        rawFile: null,
      });

      showToast('Pages extracted successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to extract pages', 'error');
    } finally {
      setExtracting(false);
    }
  }

  // Common Result Screen on completion matching specification:
  // Options: Download | Merge Extracted Pages | Edit PDF | Compress | Password Protect | Extract More Pages | Exit
  if (extractResult) {
    return (
      <div className="compress-screen">
        <CommonResultScreen
          title="Pages Extracted Successfully ✓"
          subtitle={`Created new PDF containing ${extractResult.selectedPagesCount} extracted pages`}
          file={extractResult}
          metrics={[
            { label: 'Original Doc', value: `${pageCount} Pages` },
            { label: 'Extracted Pages', value: extractResult.pagesStr, badge: 'Extracted' },
          ]}
          nextActions={[
            {
              id: 'merge-extracted',
              label: 'Merge Extracted Pages',
              desc: 'Combine with other documents',
              icon: Layers,
              route: '/tools/merge',
            },
            ACTION_PRESETS.compress,
            ACTION_PRESETS.protect,
          ]}
          primaryAction={{
            label: 'Download Extracted PDF',
            onClick: () => {
              if (extractResult?.download_url) {
                downloadAndOpenFile(extractResult.download_url, extractResult.name || 'extracted_pages.pdf', 'application/pdf');
              }
            }
          }}
          onReset={() => {
            setExtractResult(null);
            setSelectedPages(new Set([1]));
          }}
          sourceWorkflow="extract-pages"
        />
        <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
      </div>
    );
  }

  return (
    <div className="compress-screen">
      <div className="compress-screen__body">
        {/* File picker */}
        {!selectedFile ? (
          <button className="compress-screen__pick-btn" onClick={() => fileInputRef.current?.click()} id="extract-pick-btn">
            <div className="compress-screen__pick-icon" style={{ width: 52, height: 52, background: 'rgba(13, 148, 136, 0.1)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Scissors size={26} color="#0D9488" />
            </div>
            <p className="compress-screen__pick-label">Choose PDF to Extract Pages</p>
            <p className="compress-screen__pick-sub">Select pages visually or specify custom page ranges (e.g. 10-20)</p>
          </button>
        ) : (
          <div className="compress-screen__file-card" onClick={() => fileInputRef.current?.click()}>
            <FileTypeIcon type="pdf" size={40} />
            <div className="compress-screen__file-info">
              <p className="compress-screen__file-name">{selectedFile.name}</p>
              <p className="compress-screen__file-meta">
                {(selectedFile.size / 1024).toFixed(1)} KB • {pageCount} pages total
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
          id="extract-file-input"
        />

        {/* Page range input */}
        {selectedFile && pageCount > 0 && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600 }}>Specify Page Range</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Select All
                </button>
                <span style={{ color: 'var(--color-divider)' }}>•</span>
                <button
                  type="button"
                  onClick={handleSelectNone}
                  style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}
                >
                  Clear
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <input
                type="text"
                placeholder="e.g. 10-20, 25, 30-35"
                value={rangeInput}
                onChange={e => setRangeInput(e.target.value)}
                style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--color-divider)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
              />
              <SecondaryButton onClick={applyRangeInput} style={{ padding: '0 16px' }}>
                Apply Range
              </SecondaryButton>
            </div>

            {/* Visual Page Selection Grid */}
            <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
              Select Pages Visually ({selectedPages.size} of {pageCount} selected):
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(68px, 1fr))', gap: '8px', maxHeight: '220px', overflowY: 'auto', padding: '6px', background: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-divider)' }}>
              {Array.from({ length: pageCount }, (_, i) => i + 1).map(pageNum => {
                const isSelected = selectedPages.has(pageNum);
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => togglePage(pageNum)}
                    style={{
                      aspectRatio: '1',
                      borderRadius: '10px',
                      border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-divider)',
                      background: isSelected ? 'var(--color-primary-soft)' : 'var(--color-bg)',
                      color: isSelected ? 'var(--color-primary)' : 'var(--color-text)',
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: '13px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '2px',
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                  >
                    <span>P. {pageNum}</span>
                    {isSelected && <Check size={12} color="var(--color-primary)" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="compress-screen__footer">
        <PrimaryButton
          onClick={handleExtract}
          loading={extracting}
          disabled={extracting}
          id="extract-submit-btn"
        >
          {selectedFile ? `EXTRACT ${selectedPages.size} ${selectedPages.size === 1 ? 'PAGE' : 'PAGES'}` : 'SELECT PDF TO EXTRACT'}
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
