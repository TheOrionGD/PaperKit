/* EditPDFScreen — Full PDF editor with overlay canvas, tool panel, undo/redo, and real backend save */
import {
  useState, useRef, useEffect, useCallback, useReducer
} from 'react';
import {
  Type, Image, PenLine, Highlighter, Eraser, StickyNote,
  ChevronLeft, ChevronRight, Plus, Minus, Undo2, Redo2,
  Save, Download, Trash2, Upload, Check, X
} from 'lucide-react';
import Toast from '../../components/ui/Toast';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import { useToast } from '../../hooks/useToast';
import { useUpload } from '../../hooks/useUpload';
import { useSearchParams } from 'react-router-dom';
import { getFileDownloadUrl } from '../../services/files';
import { applyPDFEdits } from '../../services/tools';
import './EditPDFScreen.css';

/* ─────────────────────────────────────────
   Tool definitions
───────────────────────────────────────── */
const TOOLS = [
  { id: 'text',          label: 'Text',            icon: Type,       cursor: 'text' },
  { id: 'erase_replace', label: 'Erase & Replace', icon: Eraser,     cursor: 'crosshair' },
  { id: 'highlight',     label: 'Highlight',       icon: Highlighter, cursor: 'crosshair' },
  { id: 'draw',          label: 'Draw',            icon: PenLine,    cursor: 'crosshair' },
  { id: 'image',         label: 'Image',           icon: Image,      cursor: 'default' },
  { id: 'erase',         label: 'Whiteout',        icon: Eraser,     cursor: 'crosshair' },
  { id: 'annotation',    label: 'Note',            icon: StickyNote, cursor: 'crosshair' },
];

const COLORS = ['#000000', '#e53e3e', '#3182ce', '#38a169', '#d69e2e', '#805ad5', '#e53e3e'];
const STROKE_WIDTHS = [1, 2, 4, 6];
const FONT_SIZES = [10, 12, 14, 18, 24, 32];

/* ─────────────────────────────────────────
   Operations reducer for undo/redo
───────────────────────────────────────── */
function opsReducer(state, action) {
  switch (action.type) {
    case 'ADD': {
      const next = state.past.concat(action.op);
      return { past: next, future: [] };
    }
    case 'UNDO': {
      if (!state.past.length) return state;
      const prev = [...state.past];
      const undone = prev.pop();
      return { past: prev, future: [undone, ...state.future] };
    }
    case 'REDO': {
      if (!state.future.length) return state;
      const [redo, ...rest] = state.future;
      return { past: [...state.past, redo], future: rest };
    }
    case 'CLEAR':
      return { past: [], future: [] };
    default:
      return state;
  }
}

/* ─────────────────────────────────────────
   Main component
───────────────────────────────────────── */
export default function EditPDFScreen() {
  const [searchParams] = useSearchParams();
  const fileIdParam = searchParams.get('file_id');

  /* File & PDF state */
  const fileInputRef = useRef(null);
  const imgInputRef = useRef(null);
  const pdfCanvasRef = useRef(null);
  const overlayRef = useRef(null);
  const [fileId, setFileId] = useState(fileIdParam || null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedUrl, setSavedUrl] = useState(null);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });

  /* Tool state */
  const [activeTool, setActiveTool] = useState('text');
  const [toolColor, setToolColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [fontSize, setFontSize] = useState(14);
  const [showOptions, setShowOptions] = useState(false);

  /* Operations state (undo/redo) */
  const [opsState, dispatch] = useReducer(opsReducer, { past: [], future: [] });

  /* Drawing state */
  const drawingRef = useRef(false);
  const currentStrokeRef = useRef([]);
  const startPosRef = useRef({ x: 0, y: 0 });

  /* Text input overlay */
  const [textInput, setTextInput] = useState(null); // { x, y, canvasX, canvasY }
  const [textValue, setTextValue] = useState('');
  const textInputRef = useRef(null);

  /* Toast */
  const { toast, showToast, dismissToast } = useToast();
  const { upload } = useUpload();

  /* ── Load PDF via pdf.js ── */
  const loadPdf = useCallback(async (fileOrUrl) => {
    setLoading(true);
    setLoadError(null);
    dispatch({ type: 'CLEAR' });
    setSavedUrl(null);
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString();
      let doc;
      if (typeof fileOrUrl === 'string' && fileOrUrl.trim()) {
        doc = await pdfjsLib.getDocument({ url: fileOrUrl }).promise;
      } else if (fileOrUrl instanceof File || fileOrUrl instanceof Blob) {
        const ab = await fileOrUrl.arrayBuffer();
        doc = await pdfjsLib.getDocument({ data: new Uint8Array(ab) }).promise;
      } else if (fileOrUrl && (fileOrUrl.data || fileOrUrl.url)) {
        doc = await pdfjsLib.getDocument(fileOrUrl).promise;
      } else {
        throw new Error('Expected data, blob, or valid URL parameter');
      }
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
      setCurrentPage(1);
    } catch (err) {
      setLoadError('Failed to load PDF: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  /* Auto-load from file_id param */
  useEffect(() => {
    if (fileIdParam) {
      setFileId(fileIdParam);
      getFileDownloadUrl(fileIdParam)
        .then(url => loadPdf(url))
        .catch(err => setLoadError('Failed to fetch file: ' + err.message));
    }
  }, [fileIdParam, loadPdf]);

  /* ── Render PDF page to canvas ── */
  const redrawOverlay = useCallback((w, h) => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);

    const pageOps = opsState.past.filter(op => op.page === currentPage - 1);
    for (const op of pageOps) {
      if (op.type === 'draw') {
        ctx.beginPath();
        ctx.strokeStyle = op.color;
        ctx.lineWidth = op.strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        const pts = op.points;
        if (pts.length < 2) continue;
        ctx.moveTo(pts[0][0] * scale, pts[0][1] * scale);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i][0] * scale, pts[i][1] * scale);
        }
        ctx.stroke();
      } else if (op.type === 'highlight') {
        ctx.fillStyle = `rgba(255, 235, 59, ${op.opacity ?? 0.4})`;
        ctx.fillRect(op.x * scale, op.y * scale, op.width * scale, op.height * scale);
      } else if (op.type === 'erase') {
        ctx.fillStyle = 'rgba(220, 220, 220, 0.8)';
        ctx.fillRect(op.x * scale, op.y * scale, op.width * scale, op.height * scale);
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 1;
        ctx.strokeRect(op.x * scale, op.y * scale, op.width * scale, op.height * scale);
      } else if (op.type === 'text') {
        ctx.fillStyle = op.color;
        ctx.font = `${op.fontSize * scale}px sans-serif`;
        ctx.fillText(op.text, op.x * scale, op.y * scale);
      } else if (op.type === 'annotation') {
        // Draw sticky note pin
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(op.x * scale, op.y * scale, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#333';
        ctx.font = `bold ${10 * scale}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', op.x * scale, op.y * scale);
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';
      } else if (op.type === 'image') {
        const img = new window.Image();
        img.onload = () => {
          ctx.drawImage(img, op.x * scale, op.y * scale, op.width * scale, op.height * scale);
        };
        img.src = op.imageData;
      }
    }
  }, [opsState.past, currentPage, scale]);

  useEffect(() => {
    if (!pdfDoc || !pdfCanvasRef.current) return;
    let cancelled = false;
    async function render() {
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale });
      const canvas = pdfCanvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      setPageSize({ width: viewport.width, height: viewport.height });
      if (!cancelled) {
        await page.render({ canvasContext: ctx, viewport }).promise;
        // Re-render overlay ops for current page
        redrawOverlay(viewport.width, viewport.height);
      }
    }
    render().catch(console.error);
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfDoc, currentPage, scale]);

  /* ── Redraw overlay canvas with current ops ── */


  /* Re-draw overlay when ops or page changes */
  useEffect(() => {
    if (pageSize.width > 0) {
      redrawOverlay(pageSize.width, pageSize.height);
    }
  }, [opsState.past, currentPage, pageSize, redrawOverlay]);

  /* ── Get canvas coordinates from mouse event ── */
  function getCanvasPos(e) {
    const rect = overlayRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  /* PDF-space coordinate (divide by scale) */
  function toPdfSpace(canvasX, canvasY) {
    return { x: canvasX / scale, y: canvasY / scale };
  }

  /* ── Pointer events ── */
  function handlePointerDown(e) {
    if (!pdfDoc) return;
    const { x, y } = getCanvasPos(e);

    if (activeTool === 'text') {
      setTextInput({ canvasX: x, canvasY: y, ...toPdfSpace(x, y) });
      setTextValue('');
      setTimeout(() => textInputRef.current?.focus(), 50);
      return;
    }

    if (activeTool === 'annotation') {
      const pdf = toPdfSpace(x, y);
      const text = window.prompt('Enter annotation note:');
      if (text && text.trim()) {
        dispatch({
          type: 'ADD',
          op: { type: 'annotation', page: currentPage - 1, x: pdf.x, y: pdf.y, text: text.trim() }
        });
      }
      return;
    }

    drawingRef.current = true;
    currentStrokeRef.current = [];
    startPosRef.current = { x, y };

    if (activeTool === 'draw') {
      const pdf = toPdfSpace(x, y);
      currentStrokeRef.current = [[pdf.x, pdf.y]];
    }
  }

  function handlePointerMove(e) {
    if (!drawingRef.current || !overlayRef.current) return;
    const { x, y } = getCanvasPos(e);

    if (activeTool === 'draw') {
      const pdf = toPdfSpace(x, y);
      currentStrokeRef.current.push([pdf.x, pdf.y]);
      // Live draw preview
      const ctx = overlayRef.current.getContext('2d');
      const pts = currentStrokeRef.current;
      const last = pts[pts.length - 2];
      if (!last) return;
      ctx.beginPath();
      ctx.strokeStyle = toolColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.moveTo(last[0] * scale, last[1] * scale);
      ctx.lineTo(pdf.x * scale, pdf.y * scale);
      ctx.stroke();
    }

    if (activeTool === 'highlight' || activeTool === 'erase') {
      // Live preview rect
      const ctx = overlayRef.current.getContext('2d');
      redrawOverlay(pageSize.width, pageSize.height);
      const { x: sx, y: sy } = startPosRef.current;
      const w = x - sx, h = y - sy;
      if (activeTool === 'highlight') {
        ctx.fillStyle = 'rgba(255, 235, 59, 0.4)';
        ctx.fillRect(sx, sy, w, h);
      } else {
        ctx.fillStyle = 'rgba(200, 200, 200, 0.7)';
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 1;
        ctx.fillRect(sx, sy, w, h);
        ctx.strokeRect(sx, sy, w, h);
      }
    }
  }

  function handlePointerUp(e) {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const { x, y } = getCanvasPos(e);
    const { x: sx, y: sy } = startPosRef.current;

    if (activeTool === 'draw') {
      if (currentStrokeRef.current.length >= 2) {
        dispatch({
          type: 'ADD',
          op: {
            type: 'draw',
            page: currentPage - 1,
            points: [...currentStrokeRef.current],
            color: toolColor,
            strokeWidth,
          }
        });
      }
    } else if (activeTool === 'highlight') {
      const pdf1 = toPdfSpace(sx, sy);
      const pdfW = (x - sx) / scale;
      const pdfH = (y - sy) / scale;
      if (Math.abs(pdfW) > 5 && Math.abs(pdfH) > 2) {
        dispatch({
          type: 'ADD',
          op: {
            type: 'highlight',
            page: currentPage - 1,
            x: Math.min(pdf1.x, pdf1.x + pdfW),
            y: Math.min(pdf1.y, pdf1.y + pdfH),
            width: Math.abs(pdfW),
            height: Math.abs(pdfH),
            opacity: 0.4,
          }
        });
      }
    } else if (activeTool === 'erase' || activeTool === 'erase_replace') {
      const pdf1 = toPdfSpace(sx, sy);
      const pdfW = (x - sx) / scale;
      const pdfH = (y - sy) / scale;
      const minX = Math.min(pdf1.x, pdf1.x + pdfW);
      const minY = Math.min(pdf1.y, pdf1.y + pdfH);
      const absW = Math.abs(pdfW);
      const absH = Math.abs(pdfH);

      if (absW > 5 && absH > 5) {
        dispatch({
          type: 'ADD',
          op: {
            type: 'erase',
            page: currentPage - 1,
            x: minX,
            y: minY,
            width: absW,
            height: absH,
          }
        });

        if (activeTool === 'erase_replace') {
          const canvasX = minX * scale;
          const canvasY = minY * scale;
          setTextInput({ canvasX, canvasY, x: minX, y: minY + 12 });
          setTextValue('');
          setTimeout(() => textInputRef.current?.focus(), 50);
        }
      }
    }
    currentStrokeRef.current = [];
  }

  /* ── Text submission ── */
  function commitText() {
    if (!textInput || !textValue.trim()) {
      setTextInput(null);
      return;
    }
    dispatch({
      type: 'ADD',
      op: {
        type: 'text',
        page: currentPage - 1,
        x: textInput.x,
        y: textInput.y,
        text: textValue.trim(),
        color: toolColor,
        fontSize,
      }
    });
    setTextInput(null);
    setTextValue('');
  }

  /* ── Image insertion ── */
  async function handleImageFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      // Place image at centre of visible canvas
      const cW = pageSize.width;
      const cH = pageSize.height;
      const iw = 200, ih = 150; // default px size
      const pdf = toPdfSpace((cW - iw) / 2, (cH - ih) / 2);
      dispatch({
        type: 'ADD',
        op: {
          type: 'image',
          page: currentPage - 1,
          x: pdf.x,
          y: pdf.y,
          width: iw / scale,
          height: ih / scale,
          imageData: dataUrl,
        }
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  /* ── File upload then load ── */
  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await upload(file);
      setFileId(result.id);
      await loadPdf(file);
    } catch {
      await loadPdf(file);
    }
  }

  /* ── Save / Export ── */
  async function handleSave() {
    if (!fileId) {
      showToast('Please choose a file first, then re-upload to get a file ID.', 'error');
      return;
    }
    if (!opsState.past.length) {
      showToast('No edits to save.', 'info');
      return;
    }
    setSaving(true);
    try {
      const ops = opsState.past.map(op => {
        const cleaned = { ...op };
        // Don't send imageData to non-image ops
        return cleaned;
      });
      const res = await applyPDFEdits(fileId, ops);
      setSavedUrl(res.download_url);
      showToast('PDF saved successfully!', 'success');
    } catch (err) {
      showToast('Save failed: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  function handleExport() {
    if (!savedUrl) {
      showToast('Save your edits first.', 'info');
      return;
    }
    const a = document.createElement('a');
    a.href = savedUrl;
    a.download = 'edited.pdf';
    a.click();
  }

  /* ── Overlay cursor ── */
  const activeCursor = TOOLS.find(t => t.id === activeTool)?.cursor || 'default';

  return (
    <div className="edit-screen">
      {/* ── Toolbar ── */}
      <div className="edit-screen__toolbar">
        <div className="edit-screen__tool-group">
          {TOOLS.map(tool => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                className={`edit-screen__tool-btn${isActive ? ' edit-screen__tool-btn--active' : ''}`}
                onClick={() => {
                  setActiveTool(tool.id);
                  if (tool.id === 'image') {
                    imgInputRef.current?.click();
                  }
                }}
                id={`edit-tool-${tool.id}`}
                title={tool.label}
                aria-label={tool.label}
              >
                <Icon size={18} />
                <span>{tool.label}</span>
              </button>
            );
          })}
        </div>

        <div className="edit-screen__toolbar-right">
          {/* Options toggle */}
          <button
            className="edit-screen__options-btn"
            onClick={() => setShowOptions(s => !s)}
            title="Style options"
            id="edit-options-toggle"
          >
            <span className="edit-screen__color-dot" style={{ background: toolColor }} />
            Options
          </button>

          <div className="edit-screen__actions">
            <button
              className="edit-screen__action-btn"
              onClick={() => dispatch({ type: 'UNDO' })}
              disabled={!opsState.past.length}
              title="Undo"
              id="edit-undo-btn"
            >
              <Undo2 size={16} />
            </button>
            <button
              className="edit-screen__action-btn"
              onClick={() => dispatch({ type: 'REDO' })}
              disabled={!opsState.future.length}
              title="Redo"
              id="edit-redo-btn"
            >
              <Redo2 size={16} />
            </button>
            <button
              className="edit-screen__action-btn edit-screen__action-btn--danger"
              onClick={() => dispatch({ type: 'CLEAR' })}
              disabled={!opsState.past.length}
              title="Clear all edits"
              id="edit-clear-btn"
            >
              <Trash2 size={16} />
            </button>
            <button
              className="edit-screen__save-btn"
              onClick={handleSave}
              disabled={saving || !fileId}
              id="edit-save-btn"
            >
              {saving ? (
                <span className="edit-screen__saving-spinner" />
              ) : (
                <Save size={16} />
              )}
              <span>{saving ? 'Saving…' : 'Save'}</span>
            </button>
            {savedUrl && (
              <button
                className="edit-screen__export-btn"
                onClick={handleExport}
                id="edit-export-btn"
              >
                <Download size={16} />
                <span>Export</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Style options panel ── */}
      {showOptions && (
        <div className="edit-screen__options-panel">
          <div className="edit-screen__options-row">
            <span className="edit-screen__options-label">Color</span>
            <div className="edit-screen__color-swatches">
              {COLORS.map(c => (
                <button
                  key={c}
                  className={`edit-screen__color-swatch${toolColor === c ? ' edit-screen__color-swatch--active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setToolColor(c)}
                  title={c}
                />
              ))}
              <input
                type="color"
                value={toolColor}
                onChange={e => setToolColor(e.target.value)}
                className="edit-screen__color-input"
                title="Custom color"
              />
            </div>
          </div>
          {(activeTool === 'draw') && (
            <div className="edit-screen__options-row">
              <span className="edit-screen__options-label">Stroke</span>
              <div className="edit-screen__stroke-btns">
                {STROKE_WIDTHS.map(w => (
                  <button
                    key={w}
                    className={`edit-screen__stroke-btn${strokeWidth === w ? ' active' : ''}`}
                    onClick={() => setStrokeWidth(w)}
                  >
                    <span style={{ height: w, width: 28, background: '#333', display: 'block', borderRadius: 2 }} />
                  </button>
                ))}
              </div>
            </div>
          )}
          {(activeTool === 'text') && (
            <div className="edit-screen__options-row">
              <span className="edit-screen__options-label">Size</span>
              <div className="edit-screen__font-btns">
                {FONT_SIZES.map(s => (
                  <button
                    key={s}
                    className={`edit-screen__font-btn${fontSize === s ? ' active' : ''}`}
                    onClick={() => setFontSize(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Canvas area ── */}
      <div className="edit-screen__canvas-area">
        {!pdfDoc && !loading && !loadError && (
          <div className="edit-screen__pick">
            <div className="edit-screen__pick-card">
              <Upload size={36} color="var(--color-primary)" />
              <p className="edit-screen__pick-title">Open a PDF to Edit</p>
              <p className="edit-screen__pick-sub">Choose a file from your device</p>
              <button
                className="edit-screen__choose-btn"
                onClick={() => fileInputRef.current?.click()}
                id="edit-choose-file-btn"
              >
                Choose PDF
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
                id="edit-file-input"
              />
            </div>
          </div>
        )}

        {loading && <LoadingState text="Loading PDF…" />}
        {loadError && (
          <ErrorState
            title="Failed to load PDF"
            message={loadError}
            onRetry={() => fileInputRef.current?.click()}
          />
        )}

        {pdfDoc && !loading && (
          <div
            className="edit-screen__pdf-wrap"
            style={{ position: 'relative', display: 'inline-block' }}
          >
            {/* PDF render canvas */}
            <canvas ref={pdfCanvasRef} className="edit-screen__canvas" />

            {/* Overlay interaction canvas */}
            <canvas
              ref={overlayRef}
              className="edit-screen__overlay"
              style={{ cursor: activeCursor }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />

            {/* Floating text input */}
            {textInput && (
              <div
                className="edit-screen__text-input-wrap"
                style={{ left: textInput.canvasX, top: textInput.canvasY }}
              >
                <input
                  ref={textInputRef}
                  className="edit-screen__text-input"
                  value={textValue}
                  onChange={e => setTextValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitText();
                    if (e.key === 'Escape') { setTextInput(null); setTextValue(''); }
                  }}
                  style={{ fontSize: fontSize * scale, color: toolColor }}
                  placeholder="Type here…"
                  id="edit-text-input"
                />
                <div className="edit-screen__text-input-actions">
                  <button onClick={commitText} id="edit-text-confirm"><Check size={14} /></button>
                  <button onClick={() => { setTextInput(null); setTextValue(''); }} id="edit-text-cancel"><X size={14} /></button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Page navigator + zoom ── */}
      {totalPages > 0 && (
        <div className="edit-screen__nav">
          <div className="edit-screen__ops-badge">
            {opsState.past.length > 0 && (
              <span>{opsState.past.filter(o => o.page === currentPage - 1).length} edit(s) on this page</span>
            )}
          </div>

          <div className="edit-screen__nav-controls">
            <button
              className="edit-screen__nav-btn"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              aria-label="Previous page"
              id="edit-prev-page-btn"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="edit-screen__page-info">
              <span>{currentPage}</span>
              <span className="edit-screen__page-sep">/</span>
              <span>{totalPages}</span>
            </div>
            <button
              className="edit-screen__nav-btn"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              aria-label="Next page"
              id="edit-next-page-btn"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="edit-screen__zoom">
            <button onClick={() => setScale(s => Math.max(0.5, +(s - 0.1).toFixed(1)))} aria-label="Zoom out" id="edit-zoom-out">
              <Minus size={14} />
            </button>
            <span>{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.min(3, +(s + 0.1).toFixed(1)))} aria-label="Zoom in" id="edit-zoom-in">
              <Plus size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Hidden image input */}
      <input
        ref={imgInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageFile}
        id="edit-image-input"
      />

      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
    </div>
  );
}
