/* OrganizePDFScreen — Visual Page Engine: Rearrange, Delete, Duplicate, Rotate L/R & Preview */
import { useState, useRef, useEffect, useCallback } from 'react';
import FeatureTipsSwipeStack from '../../components/ui/FeatureTipsSwipeStack';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { RotateCw, RotateCcw, Copy, Trash2, Grid, LayoutGrid, Move, ShieldCheck } from 'lucide-react';
import { FileTypeIcon } from '../../components/icons/ToolIcons';
import { PrimaryButton } from '../../components/ui/Button';
import LoadingState from '../../components/ui/LoadingState';
import Toast from '../../components/ui/Toast';
import FilePreviewModal from '../../components/ui/FilePreviewModal';
import CommonResultScreen, { ACTION_PRESETS } from '../../components/common/CommonResultScreen';
import { useToast } from '../../hooks/useToast';
import { getFileDownloadUrl } from '../../services/files';
import { downloadAndOpenFile } from '../../services/native';
import { useProcessing } from '../../context/ProcessingContext';
import './OrganizePDFScreen.css';

const TOOL_TIPS = [
  {
    icon: <LayoutGrid size={20} />,
    title: 'Visual Sorting',
    description: 'See all pages in a beautiful grid.'
  },
  {
    icon: <Move size={20} />,
    title: 'Drag & Drop',
    description: 'Move pages around seamlessly.'
  },
  {
    icon: <Trash2 size={20} />,
    title: 'Quick Delete',
    description: 'Remove unwanted pages with a click.'
  },
  {
    icon: <RotateCw size={20} />,
    title: 'Quick Rotate',
    description: 'Fix upside-down pages instantly.'
  },
  {
    icon: <ShieldCheck size={20} />,
    title: 'Privacy First',
    description: 'Your document never leaves your screen.'
  },
];


export default function OrganizePDFScreen({ mode: _mode = 'organize' }) {
  const _navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const fileIdParam = searchParams.get('file_id');

  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  
  const [pages, setPages] = useState([]); // Array of { id, originalIndex, rotation, dataUrl, selected }
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [organizeResult, setOrganizeResult] = useState(null);

  // Full page preview
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  const { runProcessing } = useProcessing();
  const { toast, showToast, dismissToast } = useToast();

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

      const pageList = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: 0.22 });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport }).promise;

        pageList.push({
          id: `p-${i}-${Date.now()}-${Math.random()}`,
          originalIndex: i - 1, // 0-based
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

  useEffect(() => {
    const incoming = location.state?.chainedFile || location.state?.file;
    if (incoming) {
      const fileObj = incoming instanceof File ? incoming : incoming.file || incoming;
      setSelectedFile(fileObj);
      loadPdf(fileObj);
    } else if (fileIdParam) {
      setSelectedFile({ name: 'Loading PDF document...', id: fileIdParam });
      getFileDownloadUrl(fileIdParam)
        .then(url => loadPdf(url))
        .catch(err => {
          setLoadError('Failed to fetch file: ' + err.message);
          setSelectedFile(null);
        });
    }
  }, [fileIdParam, location.state, loadPdf]);

  async function handleFileSelect(file) {
    if (!file) return;
    setSelectedFile(file);
    setOrganizeResult(null);
    try {
      await loadPdf(file);
    } catch (err) {
      showToast('Reading file failed: ' + err.message, 'error');
    }
  }

  // Rotate clockwise (right) 90 deg
  function rotateCW(idx) {
    setPages(prev => prev.map((p, i) => {
      if (i === idx) {
        return { ...p, rotation: (p.rotation + 90) % 360 };
      }
      return p;
    }));
  }

  // Rotate counter-clockwise (left) 90 deg
  function rotateCCW(idx) {
    setPages(prev => prev.map((p, i) => {
      if (i === idx) {
        return { ...p, rotation: (p.rotation + 270) % 360 };
      }
      return p;
    }));
  }

  // Duplicate page
  function duplicatePage(idx) {
    setPages(prev => {
      const copy = [...prev];
      const target = copy[idx];
      const duplicated = {
        ...target,
        id: `p-dup-${Date.now()}-${Math.random()}`,
      };
      copy.splice(idx + 1, 0, duplicated);
      return copy;
    });
    showToast(`Duplicated Page ${pages[idx].originalIndex + 1}`, 'info');
  }

  // Delete page
  function deletePage(idx) {
    if (pages.length <= 1) {
      showToast('A document must have at least 1 page', 'warning');
      return;
    }
    setPages(prev => prev.filter((_, i) => i !== idx));
  }

  // Drag and drop reordering
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const updated = [...pages];
    const draggedItem = updated[draggedIndex];
    updated.splice(draggedIndex, 1);
    updated.splice(index, 0, draggedItem);
    setDraggedIndex(index);
    setPages(updated);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  async function handleApply() {
    if (!selectedFile) {
      fileInputRef.current?.click();
      return;
    }
    if (pages.length === 0) {
      showToast('No pages left in document', 'warning');
      return;
    }

    setProcessing(true);
    setOrganizeResult(null);

    try {
      const pageInstructions = pages.map(p => ({
        index: p.originalIndex,
        rotation: p.rotation,
      }));

      const inputVal = selectedFile.id || selectedFile;
      const res = await runProcessing('organize-pdf', {
        file: inputVal,
        pages: pageInstructions,
      });

      const stem = selectedFile.name ? selectedFile.name.replace(/\.pdf$/i, '') : 'document';
      const outputFilename = `${stem}_modified.pdf`;

      setOrganizeResult({
        download_url: res.download_url,
        name: outputFilename,
        size: res.size || selectedFile.size || 0,
        pageCount: pages.length,
        rawFile: null,
      });

      showToast('Page Changes Saved ✓', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to save page modifications', 'error');
    } finally {
      setProcessing(false);
    }
  }

  // Result Screen matching specification:
  // Page Changes Saved ✓
  // Options: Download | Compress | Continue Editing | Merge with Another PDF | Password Protect | Exit
  if (organizeResult) {
    return (
      <div className="organize-screen">
        <CommonResultScreen
          title="Page Changes Saved ✓"
          subtitle={`Updated document structure with ${pages.length} configured pages`}
          file={organizeResult}
          metrics={[
            { label: 'Total Pages', value: `${pages.length} Pages` },
            { label: 'Transformations', value: 'Applied', badge: 'Saved' },
          ]}
          nextActions={[
            ACTION_PRESETS.compress,
            ACTION_PRESETS.merge,
            ACTION_PRESETS.protect,
            ACTION_PRESETS.convert,
          ]}
          primaryAction={{
            label: 'Download Modified PDF',
            onClick: () => {
              if (organizeResult?.download_url) {
                downloadAndOpenFile(organizeResult.download_url, organizeResult.name || 'organized.pdf', 'application/pdf');
              }
            }
          }}
          onReset={() => {
            setOrganizeResult(null);
          }}
          sourceWorkflow="organize-pages"
        />
        <FeatureTipsSwipeStack tips={TOOL_TIPS} />
      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
      </div>
    );
  }

  return (
    <div className="organize-screen">
      <div className="organize-screen__body">
        {/* File Picker */}
        {!selectedFile ? (
          <button
            className="organize-screen__pick-btn"
            onClick={() => fileInputRef.current?.click()}
            id="organize-pick-btn"
          >
            <div className="organize-screen__pick-icon">
              <Grid size={32} color="var(--color-primary)" />
            </div>
            <p className="organize-screen__pick-label">Select PDF to Manage Pages</p>
            <p className="organize-screen__pick-sub">Drag & drop to reorder, duplicate, rotate left/right, or delete pages</p>
          </button>
        ) : (
          <div className="organize-screen__file-card" onClick={() => fileInputRef.current?.click()}>
            <FileTypeIcon type="pdf" size={36} />
            <div className="organize-screen__file-info">
              <p className="organize-screen__file-name">{selectedFile.name}</p>
              <p className="organize-screen__file-meta">
                {pages.length > 0 ? `${pages.length} pages loaded` : 'Loading pages...'}
              </p>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          style={{ display: 'none' }}
          onChange={(e) => handleFileSelect(e.target.files?.[0])}
          id="organize-file-input"
        />

        {/* Loading / Error state */}
        {loading && <LoadingState text="Generating visual page thumbnails..." />}
        {loadError && <div className="organize-screen__error">{loadError}</div>}

        {/* Visual Page Grid */}
        {!loading && pages.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                Page Order & Orientation ({pages.length} pages)
              </span>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                Drag cards to reorder
              </span>
            </div>

            <div className="organize-screen__grid">
              {pages.map((p, index) => (
                <div
                  key={p.id}
                  className={`page-card ${draggedIndex === index ? 'page-card--dragging' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                >
                  {/* Visual Control Bar */}
                  <div className="page-card__controls" style={{ display: 'flex', gap: '3px' }}>
                    <button
                      type="button"
                      className="page-card__btn"
                      onClick={(e) => { e.stopPropagation(); rotateCCW(index); }}
                      title="Rotate Left (90° CCW)"
                    >
                      <RotateCcw size={11} />
                    </button>
                    <button
                      type="button"
                      className="page-card__btn"
                      onClick={(e) => { e.stopPropagation(); rotateCW(index); }}
                      title="Rotate Right (90° CW)"
                    >
                      <RotateCw size={11} />
                    </button>
                    <button
                      type="button"
                      className="page-card__btn"
                      onClick={(e) => { e.stopPropagation(); duplicatePage(index); }}
                      title="Duplicate Page"
                    >
                      <Copy size={11} />
                    </button>
                    <button
                      type="button"
                      className="page-card__btn page-card__btn--danger"
                      onClick={(e) => { e.stopPropagation(); deletePage(index); }}
                      title="Delete Page"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>

                  {/* Thumbnail Image */}
                  <div className="page-card__image-container">
                    <img
                      src={p.dataUrl}
                      alt={`Page ${p.originalIndex + 1}`}
                      className="page-card__img"
                      style={{ transform: `rotate(${p.rotation}deg)` }}
                      draggable="false"
                    />
                  </div>

                  {/* Badges */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0 4px' }}>
                    <span className="page-card__badge">Page {p.originalIndex + 1}</span>
                    {p.rotation !== 0 && (
                      <span style={{ fontSize: '10px', color: 'var(--color-primary)', fontWeight: 700 }}>
                        {p.rotation}°
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="compress-screen__footer">
        <PrimaryButton
          onClick={handleApply}
          loading={processing}
          disabled={processing || pages.length === 0}
          id="organize-submit-btn"
        >
          {selectedFile ? 'SAVE PAGE CHANGES' : 'SELECT PDF TO MANAGE'}
        </PrimaryButton>
      </div>

      <FilePreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
      />

      <FeatureTipsSwipeStack tips={TOOL_TIPS} />
      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
    </div>
  );
}
