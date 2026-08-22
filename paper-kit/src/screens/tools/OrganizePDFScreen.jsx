/* OrganizePDFScreen — visually rotate, reorder, remove, or extract pages using pdf.js thumbnails */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RotateCw, Trash2, Grid } from 'lucide-react';
import { FileTypeIcon } from '../../components/icons/ToolIcons';
import { PrimaryButton } from '../../components/ui/Button';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import Toast from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';
import { getFileDownloadUrl } from '../../services/files';
import { useProcessing } from '../../context/ProcessingContext';
import './OrganizePDFScreen.css';

export default function OrganizePDFScreen({ mode = 'organize' }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileIdParam = searchParams.get('file_id');

  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  
  const [pages, setPages] = useState([]); // Array of { originalIndex, index, rotation, dataUrl, selected }
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);

  const { runProcessing } = useProcessing();
  const { toast, showToast, dismissToast } = useToast();

  /* Get readable title based on route mode */
  const _title = mode === 'extract'
    ? 'Extract Pages'
    : mode === 'remove'
    ? 'Remove Pages'
    : mode === 'reorder'
    ? 'Reorder Pages'
    : 'Organize Pages';

  /* Load PDF.js and render thumbnails */
  const loadPdf = useCallback(async (fileOrUrl) => {
    setLoading(true);
    setLoadError(null);
    setPages([]);
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString();

      let doc;
      if (typeof fileOrUrl === 'string') {
        doc = await pdfjsLib.getDocument(fileOrUrl).promise;
      } else {
        const arrayBuffer = await fileOrUrl.arrayBuffer();
        doc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      }

      // Generate thumbnails for all pages
      const pageList = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        // Render at low scale for thumbnails
        const viewport = page.getViewport({ scale: 0.18 });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport }).promise;

        pageList.push({
          id: `p-${i}-${Date.now()}-${Math.random()}`,
          originalIndex: i - 1, // 0-based
          index: i - 1,
          rotation: 0,
          dataUrl: canvas.toDataURL('image/jpeg', 0.85),
          selected: false,
        });
      }
      setPages(pageList);
    } catch (err) {
      console.error('Failed to parse PDF:', err);
      setLoadError('Failed to parse PDF pages: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch remote file if file_id search param is set
  useEffect(() => {
    if (fileIdParam) {
      setSelectedFile({ name: 'Loading PDF document...', id: fileIdParam });
      getFileDownloadUrl(fileIdParam)
        .then(url => {
          loadPdf(url);
        })
        .catch(err => {
          setLoadError('Failed to fetch file: ' + err.message);
          setSelectedFile(null);
        });
    }
  }, [fileIdParam, loadPdf]);

  async function handleFileSelect(file) {
    if (!file) return;
    setSelectedFile(file);
    try {
      await loadPdf(file);
    } catch (err) {
      showToast('Reading file failed: ' + err.message, 'error');
    }
  }

  // Rotate individual page 90 degrees clockwise
  function rotatePage(idx) {
    setPages(prev => prev.map((p, i) => {
      if (i === idx) {
        return { ...p, rotation: (p.rotation + 90) % 360 };
      }
      return p;
    }));
  }

  // Remove individual page from list
  function deletePage(idx) {
    setPages(prev => prev.filter((_, i) => i !== idx));
  }

  // Toggle page selection (for extract/remove modes)
  function toggleSelectPage(idx) {
    setPages(prev => prev.map((p, i) => {
      if (i === idx) {
        return { ...p, selected: !p.selected };
      }
      return p;
    }));
  }

  // Drag and Drop reordering
  const handleDragStart = (e, index) => {
    if (mode === 'extract' || mode === 'remove') return; // Disable reorder in selection modes
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const updatedPages = [...pages];
    const draggedItem = updatedPages[draggedIndex];
    updatedPages.splice(draggedIndex, 1);
    updatedPages.splice(index, 0, draggedItem);
    setDraggedIndex(index);
    setPages(updatedPages);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Submit visual changes to the backend
  async function handleApply() {
    if (!selectedFile) {
      fileInputRef.current?.click();
      return;
    }
    if (pages.length === 0) return;

    let targetPages;
    const toolId = `${mode}-pages`;

    if (mode === 'extract') {
      const selected = pages.filter(p => p.selected);
      if (selected.length === 0) {
        showToast('Select at least one page to extract', 'warning');
        return;
      }
      targetPages = selected.map(p => ({ index: p.originalIndex, rotation: p.rotation }));
    } else if (mode === 'remove') {
      const remaining = pages.filter(p => !p.selected);
      if (pages.every(p => p.selected)) {
        showToast('Cannot remove all pages from PDF', 'warning');
        return;
      }
      if (!pages.some(p => p.selected)) {
        showToast('Select at least one page to remove', 'warning');
        return;
      }
      targetPages = remaining.map(p => ({ index: p.originalIndex, rotation: p.rotation }));
    } else {
      targetPages = pages.map(p => ({ index: p.originalIndex, rotation: p.rotation }));
    }

    const pageIndices = targetPages.map(p => p.index);
    const rotations = targetPages.map(p => p.rotation);

    setProcessing(true);
    try {
      const inputVal = selectedFile.id || selectedFile;
      const result = await runProcessing(
        'organize-pages',
        { file: inputVal, pageIndices, rotations },
        { tool_id: toolId }
      );

      setTimeout(() => {
        if (result.download_url) {
          const url = result.download_url.startsWith('http') || result.download_url.startsWith('blob:')
            ? result.download_url
            : `${import.meta.env.VITE_API_URL || 'https://paperkit-backend.onrender.com'}${result.download_url}`;
          window.open(url, '_blank');
        }
        navigate('/files', { replace: true });
      }, 1500);
    } catch (err) {
      showToast(err.message || 'Operation failed', 'error');
    } finally {
      setProcessing(false);
    }
  }

  // Select/Deselect all pages helper
  function toggleSelectAll(select) {
    setPages(prev => prev.map(p => ({ ...p, selected: select })));
  }

  return (
    <div className="organize-screen">
      <div className="organize-screen__body">
        {/* File picker */}
        {!selectedFile ? (
          <button 
            className="compress-screen__pick-btn" 
            onClick={() => fileInputRef.current?.click()} 
            id="organize-pick-file-btn"
          >
            <div className="compress-screen__pick-icon" style={{ width: 48, height: 48, background: '#DBEAFE', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Grid size={24} color="#2563EB" />
            </div>
            <p className="compress-screen__pick-label">Choose PDF File</p>
            <p className="compress-screen__pick-sub">Select PDF to {mode} pages</p>
          </button>
        ) : (
          <div className="compress-screen__file-card" onClick={() => !fileIdParam && fileInputRef.current?.click()}>
            <FileTypeIcon type="pdf" size={40} />
            <div className="compress-screen__file-info">
              <p className="compress-screen__file-name">{selectedFile.name}</p>
              <p className="compress-screen__file-meta">
                {loading ? 'Reading document...' : selectedFile ? `Document Loaded (${pages.length} pages)` : 'Preparing...'}
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
          id="organize-file-input"
        />

        {loading && <LoadingState text="Parsing PDF pages into thumbnails..." />}
        {loadError && <ErrorState title="Failed to read PDF" message={loadError} onRetry={() => loadPdf(selectedFile)} />}

        {pages.length > 0 && !loading && (
          <>
            {/* Quick Actions Bar */}
            {(mode === 'extract' || mode === 'remove') && (
              <div className="organize-screen__summary-bar">
                <span>
                  {mode === 'extract' 
                    ? `${pages.filter(p => p.selected).length} of ${pages.length} pages selected for extraction`
                    : `${pages.filter(p => p.selected).length} of ${pages.length} pages marked for removal`}
                </span>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <button 
                    onClick={() => toggleSelectAll(true)} 
                    style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Select All
                  </button>
                  <span style={{ color: 'var(--color-primary-border)' }}>|</span>
                  <button 
                    onClick={() => toggleSelectAll(false)} 
                    style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {/* Thumbnail Grid */}
            <div className="organize-screen__grid">
              {pages.map((p, index) => (
                <div
                  key={p.id}
                  className={`page-card ${draggedIndex === index ? 'page-card--dragging' : ''}`}
                  draggable={mode !== 'extract' && mode !== 'remove'}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  onClick={() => (mode === 'extract' || mode === 'remove') && toggleSelectPage(index)}
                >
                  {/* Action buttons (only in organize mode) */}
                  {mode === 'organize' && (
                    <div className="page-card__controls">
                      <button
                        className="page-card__btn"
                        onClick={(e) => { e.stopPropagation(); rotatePage(index); }}
                        title="Rotate Page"
                        aria-label="Rotate Page"
                      >
                        <RotateCw size={12} />
                      </button>
                      <button
                        className="page-card__btn page-card__btn--danger"
                        onClick={(e) => { e.stopPropagation(); deletePage(index); }}
                        title="Delete Page"
                        aria-label="Delete Page"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}

                  {/* Image container */}
                  <div className="page-card__image-container">
                    <img
                      src={p.dataUrl}
                      alt={`Page ${p.originalIndex + 1}`}
                      className="page-card__img"
                      style={{ transform: `rotate(${p.rotation}deg)` }}
                      draggable="false"
                    />
                  </div>

                  {/* Page number badge */}
                  <span className="page-card__badge">Page {p.originalIndex + 1}</span>

                  {/* Selection Checkbox */}
                  {(mode === 'extract' || mode === 'remove') && (
                    <input
                      type="checkbox"
                      className="page-card__checkbox"
                      checked={p.selected}
                      onChange={() => toggleSelectPage(index)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="compress-screen__footer">
        <PrimaryButton
          onClick={handleApply}
          loading={processing || false}
          disabled={processing || false}
          id="organize-submit-btn"
        >
          {!selectedFile
            ? 'SELECT PDF TO ORGANIZE'
            : mode === 'extract' 
            ? 'EXTRACT PAGES' 
            : mode === 'remove' 
            ? 'REMOVE PAGES' 
            : 'APPLY CHANGES'}
        </PrimaryButton>
      </div>

      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
    </div>
  );
}
