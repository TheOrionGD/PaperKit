/* FilePreviewModal.jsx — Comprehensive Multi-Format Document & Media Previewer for PaperKit */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, Download, FileText, Image as ImageIcon, Code, Table,
  ZoomIn, ZoomOut, RotateCw, Maximize2, Minimize2, ChevronLeft,
  ChevronRight, Copy, Check, Search, Printer, Eye, ExternalLink,
  Sparkles, Sliders, Scissors, Columns, ArrowRight, Loader2, AlertCircle,
} from 'lucide-react';
import { downloadAndOpenFile } from '../../services/native';
import { convertFile } from '../../services/tools';
import './FilePreviewModal.css';

import { resolveBackendFileUrl } from '../../services/api';

function resolveFullUrl(url) {
  return resolveBackendFileUrl(url);
}

export default function FilePreviewModal({
  isOpen,
  onClose,
  fileUrl,
  fileName = 'Document',
  fileSize,
  mimeType,
  fileId,
  rawFile,
}) {
  const navigate = useNavigate();

  // Mode & format detection
  const ext = useMemo(() => {
    if (fileName && fileName.includes('.')) {
      return fileName.split('.').pop().toLowerCase();
    }
    return '';
  }, [fileName]);

  const fileKind = useMemo(() => {
    if (mimeType === 'application/pdf' || ext === 'pdf') return 'pdf';
    if (mimeType?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'ico'].includes(ext)) return 'image';
    if (['txt', 'log', 'env', 'conf', 'ini'].includes(ext) || mimeType === 'text/plain') return 'text';
    if (['md', 'markdown'].includes(ext)) return 'markdown';
    if (['json', 'js', 'jsx', 'ts', 'tsx', 'py', 'html', 'css', 'scss', 'xml', 'yaml', 'yml', 'sh', 'bat'].includes(ext)) return 'code';
    if (['csv', 'tsv'].includes(ext)) return 'csv';
    if (['doc', 'docx'].includes(ext)) return 'word';
    if (['xls', 'xlsx'].includes(ext)) return 'excel';
    if (['ppt', 'pptx'].includes(ext)) return 'ppt';
    if (mimeType?.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext)) return 'audio';
    if (mimeType?.startsWith('video/') || ['mp4', 'webm', 'mov'].includes(ext)) return 'video';
    return 'generic';
  }, [ext, mimeType]);

  // General State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [copied, setCopied] = useState(false);
  const [showShortcutsMenu, setShowShortcutsMenu] = useState(false);

  // PDF Specific State
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [pageThumbnails, setPageThumbnails] = useState([]);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [viewMode, setViewMode] = useState('single'); // 'single' | 'continuous'
  const [renderedPages, setRenderedPages] = useState({}); // { [pageNum]: dataUrl }
  const [pageJumpVal, setPageJumpVal] = useState('1');

  // Text / Code Specific State
  const [textContent, setTextContent] = useState('');
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [wordWrap, setWordWrap] = useState(true);
  const [renderMarkdown, setRenderMarkdown] = useState(true);
  const [csvAsTable, setCsvAsTable] = useState(true);

  // Image info
  const [imageMeta, setImageMeta] = useState(null); // { width, height }

  // Refs
  const modalRef = useRef(null);
  const contentContainerRef = useRef(null);
  const canvasRefs = useRef({});

  // Reset state on open/close or target file change
  useEffect(() => {
    if (!isOpen) {
      setPdfDoc(null);
      setRenderedPages({});
      setPageThumbnails([]);
      setTextContent('');
      setError(null);
      setLoading(true);
      setRotation(0);
      setZoom(1);
      setCurrentPage(1);
      setPageJumpVal('1');
      setShowThumbnails(false);
      return;
    }

    setLoading(true);
    setError(null);
    setRotation(0);
    setZoom(1);
    setCurrentPage(1);
    setPageJumpVal('1');
  }, [isOpen, fileUrl, rawFile]);

  // Load PDF content via PDF.js
  const loadPdfDocument = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const pdfjsLib = await import('pdfjs-dist');
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString();
      } catch {
        // Fallback worker if URL construction fails in certain environments
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.0.379'}/pdf.worker.min.mjs`;
      }

      let loadingTask;
      if (rawFile instanceof File || rawFile instanceof Blob) {
        const ab = await rawFile.arrayBuffer();
        loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(ab) });
      } else if (fileUrl) {
        const targetUrl = resolveFullUrl(fileUrl);
        // Fetch as arraybuffer to prevent CORS issue on some servers
        try {
          const resp = await fetch(targetUrl);
          if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching document`);
          const buf = await resp.arrayBuffer();
          loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buf) });
        } catch {
          loadingTask = pdfjsLib.getDocument({ url: targetUrl });
        }
      } else {
        throw new Error('No valid PDF file or URL supplied');
      }

      const doc = await loadingTask.promise;
      setPdfDoc(doc);
      setNumPages(doc.numPages);
      setCurrentPage(1);
      setPageJumpVal('1');

      // Generate low-res thumbnails asynchronously
      const thumbs = [];
      for (let i = 1; i <= Math.min(doc.numPages, 50); i++) {
        try {
          const p = await doc.getPage(i);
          const vp = p.getViewport({ scale: 0.2 });
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = vp.width;
          canvas.height = vp.height;
          await p.render({ canvasContext: ctx, viewport: vp }).promise;
          thumbs.push({ pageNum: i, url: canvas.toDataURL('image/jpeg', 0.8) });
        } catch (e) {
          console.warn('Thumbnail generation skipped for page', i, e);
        }
      }
      setPageThumbnails(thumbs);
    } catch (err) {
      console.error('Failed to load PDF in preview:', err);
      setError('Unable to render PDF preview directly: ' + (err.message || 'Check network or file permissions'));
    } finally {
      setLoading(false);
    }
  }, [fileUrl, rawFile]);

  // Load Text / Code / Markdown / CSV content
  const loadTextDocument = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let text = '';
      if (rawFile instanceof File || rawFile instanceof Blob) {
        text = await rawFile.text();
      } else if (fileUrl) {
        const targetUrl = resolveFullUrl(fileUrl);
        const resp = await fetch(targetUrl);
        if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching text file`);
        text = await resp.text();
      }
      setTextContent(text);
    } catch (err) {
      console.error('Failed to load text preview:', err);
      setError('Unable to load text contents: ' + (err.message || 'File not readable'));
    } finally {
      setLoading(false);
    }
  }, [fileUrl, rawFile]);

  // Load Office Document Preview (DOCX / XLSX / PPTX)
  const loadOfficeDocumentPreview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Extract text content from document buffer
      let ab;
      if (rawFile instanceof File || rawFile instanceof Blob) {
        ab = await rawFile.arrayBuffer();
      } else if (fileUrl) {
        const resp = await fetch(resolveFullUrl(fileUrl));
        if (resp.ok) ab = await resp.arrayBuffer();
      }

      if (ab) {
        const decoder = new TextDecoder('utf-8', { fatal: false });
        const rawStr = decoder.decode(ab);
        const cleanText = rawStr
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (cleanText && cleanText.length > 15) {
          const sentences = cleanText.split(/(?<=\.|\?|!)\s+/).filter(s => s.trim().length > 0);
          setTextContent(sentences.join('\n\n'));
        }
      }

      // Auto-attempt backend conversion to PDF if fileId exists
      if (fileId) {
        try {
          const fromFmt = ext.startsWith('doc') ? 'word' : ext.startsWith('xls') ? 'excel' : 'ppt';
          const res = await convertFile(fileId, fromFmt, 'pdf');
          if (res && res.download_url) {
            const pdfjsLib = await import('pdfjs-dist');
            try {
              pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
            } catch {
              pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.0.379'}/pdf.worker.min.mjs`;
            }
            const pdfResp = await fetch(resolveFullUrl(res.download_url));
            const pdfBuf = await pdfResp.arrayBuffer();
            const doc = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBuf) }).promise;
            setPdfDoc(doc);
            setNumPages(doc.numPages);
            setCurrentPage(1);
            setPageJumpVal('1');
          }
        } catch (convErr) {
          console.warn('Auto PDF preview conversion skipped:', convErr);
        }
      }
    } catch (err) {
      console.warn('Office preview extraction notice:', err);
    } finally {
      setLoading(false);
    }
  }, [fileId, ext, rawFile, fileUrl]);

  const handleConvertOfficeToPdf = async () => {
    try {
      setLoading(true);
      setError(null);
      let targetFileId = fileId;
      if (!targetFileId && rawFile) {
        const { uploadFile } = await import('../../services/files');
        const uploadRes = await uploadFile(rawFile);
        targetFileId = uploadRes._id || uploadRes.id;
      }

      if (!targetFileId) {
        throw new Error('Please save document to workspace to enable live PDF conversion');
      }

      const fromFmt = ext.startsWith('doc') ? 'word' : ext.startsWith('xls') ? 'excel' : 'ppt';
      const res = await convertFile(targetFileId, fromFmt, 'pdf');
      if (res && res.download_url) {
        const pdfjsLib = await import('pdfjs-dist');
        try {
          pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
        } catch {
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.0.379'}/pdf.worker.min.mjs`;
        }
        const pdfResp = await fetch(resolveFullUrl(res.download_url));
        const pdfBuf = await pdfResp.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBuf) }).promise;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setCurrentPage(1);
        setPageJumpVal('1');
      }
    } catch (err) {
      console.error('Office to PDF preview failed:', err);
      setError(err?.message || 'Failed to render PDF preview');
    } finally {
      setLoading(false);
    }
  };

  // Dispatch loader based on file type
  useEffect(() => {
    if (!isOpen) return;

    if (fileKind === 'pdf') {
      loadPdfDocument();
    } else if (['text', 'code', 'markdown', 'csv'].includes(fileKind)) {
      loadTextDocument();
    } else if (['word', 'excel', 'ppt'].includes(fileKind)) {
      loadOfficeDocumentPreview();
    } else if (fileKind === 'image') {
      // Pre-load image to get dimensions
      const targetUrl = rawFile instanceof File ? URL.createObjectURL(rawFile) : resolveFullUrl(fileUrl);
      const img = new Image();
      img.onload = () => {
        setImageMeta({ width: img.naturalWidth, height: img.naturalHeight });
        setLoading(false);
      };
      img.onerror = () => {
        setError('Failed to load image preview');
        setLoading(false);
      };
      img.src = targetUrl;
    } else {
      setLoading(false);
    }
  }, [isOpen, fileKind, fileUrl, rawFile, loadPdfDocument, loadTextDocument, loadOfficeDocumentPreview]);

  // Render active PDF page(s) on canvas with sharp DPI scaling
  const renderPdfPage = useCallback(async (pageNum) => {
    if (!pdfDoc) return;
    try {
      const page = await pdfDoc.getPage(pageNum);
      const dpr = window.devicePixelRatio || 1.5;
      const baseScale = 1.35 * zoom;
      const viewport = page.getViewport({ scale: baseScale, rotation: (page.rotate + rotation) % 360 });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      ctx.scale(dpr, dpr);
      await page.render({
        canvasContext: ctx,
        viewport: viewport,
      }).promise;

      setRenderedPages(prev => ({
        ...prev,
        [pageNum]: canvas.toDataURL('image/jpeg', 0.95),
      }));
    } catch (err) {
      console.error(`Failed to render page ${pageNum}:`, err);
    }
  }, [pdfDoc, zoom, rotation]);

  // Trigger render when currentPage, zoom, or rotation changes
  useEffect(() => {
    if (pdfDoc && fileKind === 'pdf') {
      if (viewMode === 'single') {
        renderPdfPage(currentPage);
      } else {
        // Continuous mode: render all pages
        for (let i = 1; i <= numPages; i++) {
          renderPdfPage(i);
        }
      }
    }
  }, [pdfDoc, currentPage, zoom, rotation, viewMode, numPages, renderPdfPage, fileKind]);

  // Page jump handler
  const handlePageJump = (e) => {
    e.preventDefault();
    const p = parseInt(pageJumpVal, 10);
    if (!isNaN(p) && p >= 1 && p <= numPages) {
      setCurrentPage(p);
      setPageJumpVal(String(p));
      // Scroll into view if continuous
      if (viewMode === 'continuous' && canvasRefs.current[p]) {
        canvasRefs.current[p].scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      setPageJumpVal(String(currentPage));
    }
  };

  const handleNextPage = useCallback(() => {
    if (currentPage < numPages) {
      const next = currentPage + 1;
      setCurrentPage(next);
      setPageJumpVal(String(next));
    }
  }, [currentPage, numPages]);

  const handlePrevPage = useCallback(() => {
    if (currentPage > 1) {
      const prev = currentPage - 1;
      setCurrentPage(prev);
      setPageJumpVal(String(prev));
    }
  }, [currentPage]);

  // Zoom helpers
  const handleZoomIn = useCallback(() => setZoom(z => Math.min(3, +(z + 0.25).toFixed(2))), []);
  const handleZoomOut = useCallback(() => setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2))), []);
  const handleResetZoom = useCallback(() => setZoom(1), []);
  const handleRotate = useCallback(() => setRotation(r => (r + 90) % 360), []);

  // Copy text helper
  const handleCopyText = () => {
    if (!textContent) return;
    navigator.clipboard.writeText(textContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Download handler
  const handleDownload = () => {
    if (rawFile instanceof File) {
      const url = URL.createObjectURL(rawFile);
      downloadAndOpenFile(url, fileName || rawFile.name, mimeType);
      return;
    }

    if (fileUrl) {
      const fullUrl = resolveFullUrl(fileUrl);
      downloadAndOpenFile(fullUrl, fileName || 'document.pdf', mimeType);
    }
  };

  // Print handler
  const handlePrint = () => {
    if (fileKind === 'pdf' && renderedPages[currentPage]) {
      const printWin = window.open('', '_blank');
      if (printWin) {
        printWin.document.write(`
          <html>
            <head><title>Print ${fileName}</title></head>
            <body style="margin:0;display:flex;justify-content:center;align-items:center;">
              <img src="${renderedPages[currentPage]}" style="max-width:100%;height:auto;" onload="window.print();window.close();" />
            </body>
          </html>
        `);
        printWin.document.close();
      }
    } else {
      window.print();
    }
  };

  // Keyboard navigation & shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        if (fileKind === 'pdf') handleNextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        if (fileKind === 'pdf') handlePrevPage();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      } else if (e.key === '0') {
        handleResetZoom();
      } else if (e.key === 'r' || e.key === 'R') {
        handleRotate();
      } else if (e.key === 'f' || e.key === 'F') {
        setIsFullscreen(f => !f);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, fileKind, handleNextPage, handlePrevPage, handleZoomIn, handleZoomOut, handleResetZoom, handleRotate, onClose]);

  if (!isOpen) return null;

  const targetFileSrc = rawFile instanceof File ? URL.createObjectURL(rawFile) : resolveFullUrl(fileUrl);

  // Formatted CSV rows
  const parsedCsv = fileKind === 'csv' && textContent ? textContent.split('\n').filter(Boolean).map(r => r.split(',')) : [];

  return (
    <div className="preview-modal__backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        ref={modalRef}
        className={`preview-modal__container ${isFullscreen ? 'preview-modal__container--fullscreen' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Top Header Bar ── */}
        <div className="preview-modal__header">
          <div className="preview-modal__title-box">
            <div className="preview-modal__file-badge preview-modal__file-badge--active">
              {fileKind === 'pdf' && <FileText size={18} color="#2563EB" />}
              {fileKind === 'image' && <ImageIcon size={18} color="#059669" />}
              {(fileKind === 'code' || fileKind === 'text' || fileKind === 'markdown') && <Code size={18} color="#7C3AED" />}
              {fileKind === 'csv' && <Table size={18} color="#EA580C" />}
              {(fileKind === 'word' || fileKind === 'excel' || fileKind === 'ppt') && <FileText size={18} color="#D97706" />}
              {fileKind === 'generic' && <FileText size={18} color="#4B5563" />}
            </div>
            <div className="preview-modal__title-info">
              <h3 className="preview-modal__title" title={fileName}>{fileName}</h3>
              <div className="preview-modal__meta-tags">
                {ext && <span className="preview-tag">{ext.toUpperCase()}</span>}
                {fileSize && (
                  <span className="preview-tag">
                    {(fileSize / 1024 > 1024 ? `${(fileSize / (1024 * 1024)).toFixed(2)} MB` : `${(fileSize / 1024).toFixed(1)} KB`)}
                  </span>
                )}
                {numPages > 0 && <span className="preview-tag">{numPages} {numPages === 1 ? 'Page' : 'Pages'}</span>}
                {imageMeta && <span className="preview-tag">{imageMeta.width} × {imageMeta.height} px</span>}
              </div>
            </div>
          </div>

          <div className="preview-modal__header-actions">
            {/* Open with Tool shortcut dropdown */}
            <div className="preview-modal__tool-dropdown-wrap">
              <button
                type="button"
                className="preview-btn preview-btn--subtle"
                onClick={() => setShowShortcutsMenu(s => !s)}
                title="Open in PaperKit tools"
              >
                <Sparkles size={16} color="var(--color-primary)" />
                <span className="preview-btn__label">Smart Tools</span>
              </button>

              {showShortcutsMenu && (
                <div className="preview-modal__dropdown-menu">
                  <div className="preview-modal__dropdown-title">Action with Document</div>
                  {fileKind === 'pdf' ? (
                    <>
                      <button
                        onClick={() => { onClose(); navigate(`/ai/summarize`, { state: { fileId, file: rawFile } }); }}
                        className="preview-modal__dropdown-item"
                      >
                        <Sparkles size={14} /> AI Document Summary
                      </button>
                      <button
                        onClick={() => { onClose(); navigate(`/ai/ocr`, { state: { fileId, file: rawFile } }); }}
                        className="preview-modal__dropdown-item"
                      >
                        <Search size={14} /> OCR Text Recognition
                      </button>
                      <button
                        onClick={() => { onClose(); navigate(`/tools/compress`, { state: { fileId, file: rawFile } }); }}
                        className="preview-modal__dropdown-item"
                      >
                        <Sliders size={14} /> Compress PDF File
                      </button>
                      <button
                        onClick={() => { onClose(); navigate(`/tools/split`, { state: { fileId, file: rawFile } }); }}
                        className="preview-modal__dropdown-item"
                      >
                        <Scissors size={14} /> Split or Extract Pages
                      </button>
                      <button
                        onClick={() => { onClose(); navigate(`/tools/convert?from=pdf&to=word`); }}
                        className="preview-modal__dropdown-item"
                      >
                        <ArrowRight size={14} /> Convert PDF to Word
                      </button>
                    </>
                  ) : ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext) ? (
                    <button
                      onClick={() => { onClose(); navigate(`/tools/convert?from=${ext.startsWith('doc') ? 'word' : ext.startsWith('xls') ? 'excel' : 'ppt'}&to=pdf`); }}
                      className="preview-modal__dropdown-item"
                    >
                      <ArrowRight size={14} /> Convert to PDF
                    </button>
                  ) : (
                    <button
                      onClick={() => { onClose(); navigate(`/ai/ocr`, { state: { file: rawFile } }); }}
                      className="preview-modal__dropdown-item"
                    >
                      <Search size={14} /> OCR Text Detection
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Print */}
            <button
              type="button"
              className="preview-icon-btn"
              onClick={handlePrint}
              title="Print (Ctrl+P)"
            >
              <Printer size={17} />
            </button>

            {/* Download */}
            <button
              type="button"
              className="preview-btn preview-btn--primary"
              onClick={handleDownload}
              title="Download file to device"
            >
              <Download size={16} />
              <span className="preview-btn__label">Download</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              className="preview-icon-btn"
              onClick={() => setIsFullscreen(f => !f)}
              title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
            >
              {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
            </button>

            {/* Close */}
            <button
              type="button"
              className="preview-modal__close-btn"
              onClick={onClose}
              aria-label="Close Preview"
              title="Close (Esc)"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── Contextual Secondary Control Toolbar ── */}
        <div className="preview-modal__toolbar">
          <div className="preview-modal__toolbar-group">
            {/* Zoom Controls */}
            <button type="button" className="preview-icon-btn" onClick={handleZoomOut} disabled={zoom <= 0.5} title="Zoom Out (-)">
              <ZoomOut size={16} />
            </button>
            <button type="button" className="preview-toolbar__zoom-badge" onClick={handleResetZoom} title="Reset Zoom (0)">
              {Math.round(zoom * 100)}%
            </button>
            <button type="button" className="preview-icon-btn" onClick={handleZoomIn} disabled={zoom >= 3} title="Zoom In (+)">
              <ZoomIn size={16} />
            </button>

            {/* Rotate */}
            <button type="button" className="preview-icon-btn" onClick={handleRotate} title="Rotate 90° Clockwise (R)">
              <RotateCw size={16} />
            </button>
          </div>

          {/* PDF Page Navigation */}
          {fileKind === 'pdf' && numPages > 0 && (
            <div className="preview-modal__toolbar-group">
              <button
                type="button"
                className="preview-icon-btn"
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
                title="Previous Page (Left Arrow)"
              >
                <ChevronLeft size={18} />
              </button>

              <form onSubmit={handlePageJump} className="preview-toolbar__page-form">
                <input
                  type="text"
                  className="preview-toolbar__page-input"
                  value={pageJumpVal}
                  onChange={e => setPageJumpVal(e.target.value)}
                  onBlur={() => setPageJumpVal(String(currentPage))}
                  aria-label="Jump to page"
                />
                <span className="preview-toolbar__page-total">/ {numPages}</span>
              </form>

              <button
                type="button"
                className="preview-icon-btn"
                onClick={handleNextPage}
                disabled={currentPage >= numPages}
                title="Next Page (Right Arrow)"
              >
                <ChevronRight size={18} />
              </button>

              <div className="preview-toolbar__divider" />

              {/* Toggle Thumbnails */}
              <button
                type="button"
                className={`preview-toolbar__chip ${showThumbnails ? 'preview-toolbar__chip--active' : ''}`}
                onClick={() => setShowThumbnails(s => !s)}
                title="Toggle Thumbnail Drawer"
              >
                <Columns size={15} />
                <span>Pages</span>
              </button>

              {/* View mode toggle: Single vs Continuous */}
              <button
                type="button"
                className={`preview-toolbar__chip ${viewMode === 'continuous' ? 'preview-toolbar__chip--active' : ''}`}
                onClick={() => setViewMode(v => v === 'single' ? 'continuous' : 'single')}
                title="Toggle Continuous Scroll Mode"
              >
                <span>{viewMode === 'single' ? '1-Page' : 'Scroll'}</span>
              </button>
            </div>
          )}

          {/* Text/Code Controls */}
          {['text', 'code', 'markdown', 'csv'].includes(fileKind) && (
            <div className="preview-modal__toolbar-group">
              <button
                type="button"
                className="preview-toolbar__chip"
                onClick={handleCopyText}
                title="Copy entire text"
              >
                {copied ? <Check size={15} color="#10B981" /> : <Copy size={15} />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>

              <button
                type="button"
                className={`preview-toolbar__chip ${showLineNumbers ? 'preview-toolbar__chip--active' : ''}`}
                onClick={() => setShowLineNumbers(l => !l)}
                title="Toggle Line Numbers"
              >
                <span>Lines</span>
              </button>

              <button
                type="button"
                className={`preview-toolbar__chip ${wordWrap ? 'preview-toolbar__chip--active' : ''}`}
                onClick={() => setWordWrap(w => !w)}
                title="Toggle Word Wrap"
              >
                <span>Wrap</span>
              </button>

              {fileKind === 'markdown' && (
                <button
                  type="button"
                  className={`preview-toolbar__chip ${renderMarkdown ? 'preview-toolbar__chip--active' : ''}`}
                  onClick={() => setRenderMarkdown(r => !r)}
                  title="Toggle Formatted Markdown"
                >
                  <Eye size={15} />
                  <span>{renderMarkdown ? 'Formatted' : 'Raw'}</span>
                </button>
              )}

              {fileKind === 'csv' && (
                <button
                  type="button"
                  className={`preview-toolbar__chip ${csvAsTable ? 'preview-toolbar__chip--active' : ''}`}
                  onClick={() => setCsvAsTable(c => !c)}
                  title="Toggle Table Grid"
                >
                  <Table size={15} />
                  <span>{csvAsTable ? 'Table Grid' : 'Raw CSV'}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Main Body & Viewer Area ── */}
        <div className="preview-modal__body-layout">
          {/* Collapsible Left Thumbnail Sidebar for PDFs */}
          {fileKind === 'pdf' && showThumbnails && pageThumbnails.length > 0 && (
            <div className="preview-modal__sidebar">
              <div className="preview-modal__sidebar-header">
                <span>Thumbnails ({numPages})</span>
                <button type="button" onClick={() => setShowThumbnails(false)} className="preview-icon-btn">
                  <X size={14} />
                </button>
              </div>
              <div className="preview-modal__sidebar-thumbs">
                {pageThumbnails.map(thumb => (
                  <div
                    key={thumb.pageNum}
                    className={`preview-sidebar__thumb-item ${currentPage === thumb.pageNum ? 'preview-sidebar__thumb-item--active' : ''}`}
                    onClick={() => {
                      setCurrentPage(thumb.pageNum);
                      setPageJumpVal(String(thumb.pageNum));
                      if (viewMode === 'continuous' && canvasRefs.current[thumb.pageNum]) {
                        canvasRefs.current[thumb.pageNum].scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                  >
                    <img src={thumb.url} alt={`Page ${thumb.pageNum}`} />
                    <span className="preview-sidebar__thumb-num">{thumb.pageNum}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Viewer Stage */}
          <div ref={contentContainerRef} className="preview-modal__stage">
            {loading && (
              <div className="preview-modal__center-state">
                <Loader2 className="animate-spin" size={40} color="var(--color-primary)" />
                <p className="preview-modal__state-title">Rendering high-fidelity preview...</p>
                <p className="preview-modal__state-sub">Loading document buffers and font assets</p>
              </div>
            )}

            {error && (
              <div className="preview-modal__center-state">
                <AlertCircle size={44} color="#EF4444" />
                <p className="preview-modal__state-title">Preview Unavailable</p>
                <p className="preview-modal__state-sub">{error}</p>
                <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                  <button className="preview-btn preview-btn--primary" onClick={handleDownload}>
                    <Download size={16} /> Download File Directly
                  </button>
                  {fileUrl && (
                    <a
                      href={resolveFullUrl(fileUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="preview-btn preview-btn--subtle"
                    >
                      <ExternalLink size={16} /> Open in Browser Tab
                    </a>
                  )}
                </div>
              </div>
            )}

            {!loading && !error && (
              <div className="preview-modal__content-scroll">
                {/* 1. PDF & Converted PDF Document Rendering */}
                {(fileKind === 'pdf' || pdfDoc) && (
                  <div className="preview-modal__pdf-container" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.15s ease' }}>
                    {viewMode === 'single' ? (
                      renderedPages[currentPage] ? (
                        <div className="preview-modal__pdf-sheet">
                          <img
                            src={renderedPages[currentPage]}
                            alt={`Page ${currentPage}`}
                            className="preview-modal__pdf-canvas-img"
                          />
                          <div className="preview-modal__page-indicator">Page {currentPage} of {numPages}</div>
                        </div>
                      ) : (
                        <div className="preview-modal__center-state" style={{ minHeight: '300px' }}>
                          <Loader2 className="animate-spin" size={28} color="var(--color-primary)" />
                          <p>Rendering Page {currentPage}...</p>
                        </div>
                      )
                    ) : (
                      /* Continuous Scroll Mode */
                      <div className="preview-modal__pdf-continuous">
                        {Array.from({ length: numPages }, (_, i) => i + 1).map(pNum => (
                          <div
                            key={pNum}
                            ref={el => (canvasRefs.current[pNum] = el)}
                            className="preview-modal__pdf-sheet"
                          >
                            {renderedPages[pNum] ? (
                              <img
                                src={renderedPages[pNum]}
                                alt={`Page ${pNum}`}
                                className="preview-modal__pdf-canvas-img"
                              />
                            ) : (
                              <div style={{ height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Loader2 className="animate-spin" size={24} color="var(--color-primary)" />
                              </div>
                            )}
                            <div className="preview-modal__page-indicator">Page {pNum} of {numPages}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Image Rendering */}
                {fileKind === 'image' && !pdfDoc && (
                  <div className="preview-modal__image-wrapper" style={{ transform: `scale(${zoom}) rotate(${rotation}deg)`, transformOrigin: 'center center', transition: 'transform 0.15s ease' }}>
                    <img
                      src={targetFileSrc}
                      alt={fileName}
                      className="preview-modal__image-element"
                    />
                  </div>
                )}

                {/* 3. Text & Code Rendering */}
                {['text', 'code', 'markdown', 'csv'].includes(fileKind) && !pdfDoc && (
                  <div className="preview-modal__text-wrapper">
                    {fileKind === 'markdown' && renderMarkdown ? (
                      <div className="preview-modal__markdown-view">
                        <div className="preview-modal__markdown-rendered">
                          {textContent.split('\n').map((line, lIdx) => {
                            if (line.startsWith('# ')) return <h1 key={lIdx}>{line.slice(2)}</h1>;
                            if (line.startsWith('## ')) return <h2 key={lIdx}>{line.slice(3)}</h2>;
                            if (line.startsWith('### ')) return <h3 key={lIdx}>{line.slice(4)}</h3>;
                            if (line.startsWith('- ') || line.startsWith('* ')) return <li key={lIdx}>{line.slice(2)}</li>;
                            if (!line.trim()) return <br key={lIdx} />;
                            return <p key={lIdx}>{line}</p>;
                          })}
                        </div>
                      </div>
                    ) : fileKind === 'csv' && csvAsTable && parsedCsv.length > 0 ? (
                      <div className="preview-modal__table-view">
                        <table className="preview-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              {parsedCsv[0].map((header, hIdx) => (
                                <th key={hIdx}>{header.trim()}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {parsedCsv.slice(1).map((row, rIdx) => (
                              <tr key={rIdx}>
                                <td className="preview-table__row-num">{rIdx + 1}</td>
                                {row.map((cell, cIdx) => (
                                  <td key={cIdx}>{cell.trim()}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className={`preview-modal__code-view ${wordWrap ? 'preview-modal__code-view--wrap' : ''}`}>
                        {textContent.split('\n').map((line, lIdx) => (
                          <div key={lIdx} className="preview-modal__code-line">
                            {showLineNumbers && <span className="preview-modal__line-number">{lIdx + 1}</span>}
                            <span className="preview-modal__line-text">{line || ' '}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Interactive Office Document Reader & Live Conversion View */}
                {!pdfDoc && ['word', 'excel', 'ppt'].includes(fileKind) && (
                  <div className="preview-modal__office-container">
                    <div className="preview-modal__office-banner">
                      <div className="preview-modal__office-badge">
                        <FileText size={20} color="var(--color-primary)" />
                        <span>Microsoft Office Document ({ext.toUpperCase()})</span>
                      </div>
                      <button
                        className="preview-btn preview-btn--primary"
                        onClick={handleConvertOfficeToPdf}
                      >
                        <Sparkles size={16} />
                        <span>Render High-Fidelity Interactive PDF</span>
                      </button>
                    </div>

                    {textContent ? (
                      <div className="preview-modal__document-reader">
                        <div className="preview-modal__reader-header">
                          <h4>Interactive Document Reader</h4>
                          <span className="preview-tag">Extracted Text View</span>
                        </div>
                        <div className="preview-modal__reader-body">
                          {textContent.split('\n\n').map((paragraph, pIdx) => (
                            <p key={pIdx} className="preview-modal__reader-paragraph">
                              {paragraph}
                            </p>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="preview-modal__office-card">
                        <div className="preview-modal__office-icon">
                          <FileText size={48} color="var(--color-primary)" />
                        </div>
                        <h3 className="preview-modal__office-title">{fileName}</h3>
                        <p className="preview-modal__office-desc">
                          This is a Microsoft Office document ({ext.toUpperCase()}). Click below to convert it into an interactive high-fidelity PDF to view, zoom, and print directly inside PaperKit.
                        </p>

                        <div className="preview-modal__office-actions">
                          <button
                            className="preview-btn preview-btn--primary"
                            onClick={handleConvertOfficeToPdf}
                          >
                            <Sparkles size={16} />
                            <span>Render High-Fidelity Interactive PDF</span>
                          </button>

                          <button
                            className="preview-btn preview-btn--subtle"
                            onClick={handleDownload}
                          >
                            <Download size={16} />
                            <span>Download Original {ext.toUpperCase()}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. Audio / Video Native Players */}
                {fileKind === 'audio' && (
                  <div className="preview-modal__media-card">
                    <audio controls src={targetFileSrc} style={{ width: '100%', maxWidth: 450 }} />
                  </div>
                )}

                {fileKind === 'video' && (
                  <div className="preview-modal__media-card">
                    <video controls src={targetFileSrc} style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '12px' }} />
                  </div>
                )}

                {/* 6. Generic Binary Fallback */}
                {fileKind === 'generic' && (
                  <div className="preview-modal__office-card">
                    <FileText size={48} color="var(--color-text-muted)" />
                    <h3 className="preview-modal__office-title">{fileName}</h3>
                    <p className="preview-modal__office-desc">
                      Binary file format. Download to open with your default desktop application.
                    </p>
                    <button className="preview-btn preview-btn--primary" onClick={handleDownload}>
                      <Download size={16} /> Download File
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
