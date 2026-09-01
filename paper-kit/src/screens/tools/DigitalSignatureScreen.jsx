/* DigitalSignatureScreen — Draw, Type, or Upload Digital Signatures with Interactive PDF Visual Placement */
import { useState, useRef, useEffect, useCallback } from 'react';
import FeatureTipsSwipeStack from '../../components/ui/FeatureTipsSwipeStack';
import { PenTool, Type, Image as ImageIcon, Download, Check, Trash2, Lock, Users, ShieldCheck, Clock, ChevronLeft, ChevronRight, Move, Sparkles } from 'lucide-react';
import { uploadFile } from '../../services/files';
import { signPDF } from '../../services/tools';
import { PrimaryButton } from '../../components/ui/Button';
import Toast from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';
import './CompressPDFScreen.css';

const TOOL_TIPS = [
  {
    icon: <PenTool size={20} />,
    title: 'E-Sign Instantly',
    description: 'Draw, type, or upload your signature.'
  },
  {
    icon: <Move size={20} />,
    title: 'Interactive Placement',
    description: 'Click or drag on the page preview to place signature.'
  },
  {
    icon: <Lock size={20} />,
    title: 'Legally Binding',
    description: 'Secure digital signatures you can trust.'
  },
  {
    icon: <Users size={20} />,
    title: 'Multi-Signer',
    description: 'Add custom signer names & date stamps.'
  },
  {
    icon: <ShieldCheck size={20} />,
    title: 'Tamper-Proof',
    description: 'Document integrity is cryptographically sealed.'
  },
];

const FONTS = ['Caveat', 'Dancing Script', 'Pacifico', 'Great Vibes', 'cursive'];

export default function DigitalSignatureScreen() {
  const fileInputRef = useRef(null);
  const sigImgInputRef = useRef(null);
  const canvasRef = useRef(null);
  const pdfRenderCanvasRef = useRef(null);
  const previewContainerRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [sigMode, setSigMode] = useState('draw'); // draw | type | upload
  const [typedName, setTypedName] = useState('');
  const [selectedFont, setSelectedFont] = useState('Caveat');
  const [signerName, setSignerName] = useState('');
  const [includeDate, setIncludeDate] = useState(true);
  const [pageNum, setPageNum] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pdfPageSize, setPdfPageSize] = useState({ width: 612, height: 792 }); // PDF points
  const [posX, setPosX] = useState(100);
  const [posY, setPosY] = useState(650);
  const [sigWidth] = useState(160);
  const [sigHeight] = useState(60);

  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState(null);
  const [running, setRunning] = useState(false);
  const [signedResult, setSignedResult] = useState(null);
  const [renderingPdf, setRenderingPdf] = useState(false);
  const [isDraggingPlacement, setIsDraggingPlacement] = useState(false);

  const { toast, showToast, dismissToast } = useToast();

  // Load & render PDF page preview via pdfjs-dist
  const renderPdfPage = useCallback(async (file, pageIndex) => {
    if (!file || !pdfRenderCanvasRef.current) return;
    setRenderingPdf(true);
    try {
      const pdfjsLib = await import('pdfjs-dist');
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString();
      } catch {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.0.379'}/pdf.worker.min.mjs`;
      }

      const arrayBuffer = await file.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      setTotalPages(doc.numPages);

      const targetPageNum = Math.min(Math.max(1, pageIndex), doc.numPages);
      const page = await doc.getPage(targetPageNum);
      const origViewport = page.getViewport({ scale: 1.0 });
      setPdfPageSize({ width: origViewport.width, height: origViewport.height });

      const canvas = pdfRenderCanvasRef.current;
      const viewport = page.getViewport({ scale: 1.5 });
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;
    } catch (err) {
      console.error('Error rendering PDF preview page:', err);
    } finally {
      setRenderingPdf(false);
    }
  }, []);

  useEffect(() => {
    if (selectedFile) {
      renderPdfPage(selectedFile, pageNum);
    }
  }, [selectedFile, pageNum, renderPdfPage]);

  // Setup drawing canvas context
  useEffect(() => {
    if (sigMode === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#1E3A8A';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, [sigMode]);

  // Accurate mouse/touch coordinates relative to canvas internal size
  function getCanvasCoords(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  function startDrawing(e) {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const coords = getCanvasCoords(e, canvas);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  }

  function draw(e) {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const coords = getCanvasCoords(e, canvas);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  }

  function stopDrawing() {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (canvasRef.current) {
      setSignatureDataUrl(canvasRef.current.toDataURL('image/png'));
    }
  }

  function clearCanvas() {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setSignatureDataUrl(null);
    }
  }

  function hasDrawnContent(canvas) {
    if (!canvas) return false;
    const ctx = canvas.getContext('2d');
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 10) return true;
    }
    return false;
  }

  function handleUploadSignatureImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSignatureDataUrl(reader.result);
    };
    reader.readAsDataURL(file);
  }

  function generateTypedSignatureDataUrl() {
    if (!typedName.trim()) return null;
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 120;
    const ctx = canvas.getContext('2d');
    ctx.font = `42px "${selectedFont}", cursive`;
    ctx.fillStyle = '#1E3A8A';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(typedName.trim(), 200, 60);
    return canvas.toDataURL('image/png');
  }

  // Interactive PDF Placement Click / Drag
  function handlePlacementUpdate(clientX, clientY) {
    if (!previewContainerRef.current) return;
    const rect = previewContainerRef.current.getBoundingClientRect();
    const relX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const relY = Math.max(0, Math.min(clientY - rect.top, rect.height));

    const pointX = Math.round((relX / rect.width) * pdfPageSize.width);
    const pointY = Math.round((relY / rect.height) * pdfPageSize.height);

    const clampedX = Math.max(0, Math.min(pointX, pdfPageSize.width - sigWidth));
    const clampedY = Math.max(0, Math.min(pointY, pdfPageSize.height - sigHeight));

    setPosX(clampedX);
    setPosY(clampedY);
  }

  function handlePreviewMouseDown(e) {
    setIsDraggingPlacement(true);
    handlePlacementUpdate(e.clientX, e.clientY);
  }

  function handlePreviewMouseMove(e) {
    if (isDraggingPlacement) {
      handlePlacementUpdate(e.clientX, e.clientY);
    }
  }

  function handlePreviewMouseUp() {
    setIsDraggingPlacement(false);
  }

  async function handleSignPDF() {
    if (!selectedFile) {
      fileInputRef.current?.click();
      return;
    }

    let finalSigData = signatureDataUrl;

    if (sigMode === 'draw') {
      if (!canvasRef.current || !hasDrawnContent(canvasRef.current)) {
        if (!signerName.trim()) {
          showToast('Please draw your signature on the canvas', 'warning');
          return;
        }
        finalSigData = null;
      } else {
        finalSigData = canvasRef.current.toDataURL('image/png');
      }
    } else if (sigMode === 'type') {
      if (!typedName.trim()) {
        showToast('Please type your name for the signature', 'warning');
        return;
      }
      finalSigData = generateTypedSignatureDataUrl();
    } else if (sigMode === 'upload') {
      if (!signatureDataUrl) {
        showToast('Please upload a signature image file', 'warning');
        return;
      }
    }

    setRunning(true);
    setSignedResult(null);

    try {
      const uploadRes = await uploadFile(selectedFile);
      const fileId = uploadRes._id || uploadRes.id;

      const dateStr = includeDate ? new Date().toLocaleDateString() : '';
      const signatures = [
        {
          page: Number(pageNum) || 1,
          x: Number(posX) || 100,
          y: Number(posY) || 650,
          width: sigWidth,
          height: sigHeight,
          image_base64: finalSigData || '',
          signer_name: signerName.trim() || (sigMode === 'type' ? typedName.trim() : ''),
          date_text: dateStr,
        },
      ];

      const res = await signPDF(fileId, signatures);
      setSignedResult(res);
      showToast('Document digitally signed successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to sign PDF', 'error');
    } finally {
      setRunning(false);
    }
  }

  // Active signature preview image for overlay
  const currentSigImagePreview = sigMode === 'type'
    ? (typedName.trim() ? generateTypedSignatureDataUrl() : null)
    : signatureDataUrl;

  return (
    <div className="compress-screen">
      <div className="compress-screen__body">
        {/* File picker */}
        {!selectedFile ? (
          <button className="compress-screen__pick-btn" onClick={() => fileInputRef.current?.click()} id="sign-pick-btn">
            <div className="compress-screen__pick-icon" style={{ width: 52, height: 52, background: 'rgba(79, 70, 229, 0.1)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PenTool size={26} color="#4F46E5" />
            </div>
            <p className="compress-screen__pick-label">Choose PDF to Sign</p>
            <p className="compress-screen__pick-sub">Draw, type, or upload digital signatures with real-time visual PDF placement</p>
          </button>
        ) : (
          <div className="compress-screen__file-card" onClick={() => fileInputRef.current?.click()}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(79, 70, 229, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PenTool size={20} color="#4F46E5" />
            </div>
            <div className="compress-screen__file-info">
              <p className="compress-screen__file-name">{selectedFile.name}</p>
              <p className="compress-screen__file-meta">
                {(selectedFile.size / 1024).toFixed(1)} KB • {totalPages} Page{totalPages > 1 ? 's' : ''} • Ready for digital signature
              </p>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          style={{ display: 'none' }}
          onChange={e => { if (e.target.files?.[0]) setSelectedFile(e.target.files[0]); }}
          id="sign-file-input"
        />

        {/* Signature Mode Tabs */}
        <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
          {[
            { id: 'draw', label: 'Draw Signature', icon: <PenTool size={14} /> },
            { id: 'type', label: 'Type Signature', icon: <Type size={14} /> },
            { id: 'upload', label: 'Upload Image', icon: <ImageIcon size={14} /> },
          ].map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => { setSigMode(t.id); setSignedResult(null); }}
              style={{
                padding: '10px 8px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: sigMode === t.id ? 700 : 500,
                border: sigMode === t.id ? '1px solid var(--color-primary)' : '1px solid var(--color-divider)',
                background: sigMode === t.id ? 'var(--color-primary-soft)' : 'var(--color-surface)',
                color: sigMode === t.id ? 'var(--color-primary)' : 'var(--color-text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Signature Creator Box */}
        <div style={{ marginTop: '14px', background: 'var(--color-surface)', padding: '16px', borderRadius: '14px', border: '1px solid var(--color-divider)' }}>
          {sigMode === 'draw' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  Draw your signature below:
                </span>
                <button
                  type="button"
                  onClick={clearCanvas}
                  style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Trash2 size={13} /> Clear
                </button>
              </div>
              <canvas
                ref={canvasRef}
                width={340}
                height={130}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                style={{
                  width: '100%',
                  height: '130px',
                  background: '#FFFFFF',
                  borderRadius: '10px',
                  border: '1.5px dashed var(--color-divider)',
                  touchAction: 'none',
                  cursor: 'crosshair'
                }}
              />
            </div>
          )}

          {sigMode === 'type' && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                Type your full name:
              </label>
              <input
                type="text"
                placeholder="e.g. Johnathan Doe"
                value={typedName}
                onChange={e => setTypedName(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-divider)', background: 'var(--color-surface)', fontSize: '13px', color: 'var(--color-text)', marginBottom: '10px' }}
              />
              
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                Select Cursive Font Style:
              </label>
              <select
                value={selectedFont}
                onChange={e => setSelectedFont(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-divider)', background: 'var(--color-surface)', fontSize: '13px', color: 'var(--color-text)', marginBottom: '10px' }}
              >
                {FONTS.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>

              <div style={{ padding: '16px', borderRadius: '10px', background: '#FFFFFF', border: '1px solid var(--color-divider)', textAlign: 'center', fontSize: '28px', color: '#1E3A8A', fontFamily: `"${selectedFont}", cursive` }}>
                {typedName.trim() || 'Your Signature'}
              </div>
            </div>
          )}

          {sigMode === 'upload' && (
            <div style={{ textAlign: 'center' }}>
              <input
                ref={sigImgInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                style={{ display: 'none' }}
                onChange={handleUploadSignatureImage}
              />
              <button
                type="button"
                onClick={() => sigImgInputRef.current?.click()}
                style={{ padding: '12px 16px', borderRadius: '10px', background: 'var(--color-primary-soft)', color: 'var(--color-primary)', border: '1px dashed var(--color-primary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', width: '100%' }}
              >
                Upload Signature Image (PNG/JPG)
              </button>
              {signatureDataUrl && (
                <div style={{ marginTop: '12px', padding: '10px', background: '#fff', borderRadius: '8px', border: '1px solid var(--color-divider)' }}>
                  <img src={signatureDataUrl} alt="Signature Preview" style={{ maxHeight: '60px', objectFit: 'contain' }} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Visual PDF Page Preview & Interactive Drag Placement */}
        {selectedFile && (
          <div style={{ marginTop: '16px', background: 'var(--color-surface)', padding: '16px', borderRadius: '14px', border: '1px solid var(--color-divider)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700 }}>
                <Sparkles size={16} color="#4F46E5" /> Page Preview & Placement
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  disabled={pageNum <= 1 || renderingPdf}
                  onClick={() => setPageNum(p => Math.max(1, p - 1))}
                  style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--color-divider)', background: 'var(--color-surface)', cursor: 'pointer', opacity: pageNum <= 1 ? 0.5 : 1 }}
                >
                  <ChevronLeft size={16} />
                </button>
                <span style={{ fontSize: '12px', fontWeight: 600 }}>
                  Page {pageNum} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={pageNum >= totalPages || renderingPdf}
                  onClick={() => setPageNum(p => Math.min(totalPages, p + 1))}
                  style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--color-divider)', background: 'var(--color-surface)', cursor: 'pointer', opacity: pageNum >= totalPages ? 0.5 : 1 }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '10px' }}>
              💡 Click or drag on the page below to position your signature visually.
            </p>

            <div
              ref={previewContainerRef}
              onMouseDown={handlePreviewMouseDown}
              onMouseMove={handlePreviewMouseMove}
              onMouseUp={handlePreviewMouseUp}
              onMouseLeave={handlePreviewMouseUp}
              style={{
                position: 'relative',
                width: '100%',
                maxHeight: '400px',
                overflow: 'hidden',
                borderRadius: '10px',
                border: '1px solid var(--color-divider)',
                background: '#4B5563',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'crosshair',
                userSelect: 'none'
              }}
            >
              <canvas
                ref={pdfRenderCanvasRef}
                style={{
                  maxWidth: '100%',
                  maxHeight: '400px',
                  objectFit: 'contain',
                  display: 'block'
                }}
              />

              {/* Signature Placement Box Overlay */}
              <div
                style={{
                  position: 'absolute',
                  left: `${(posX / pdfPageSize.width) * 100}%`,
                  top: `${(posY / pdfPageSize.height) * 100}%`,
                  width: `${(sigWidth / pdfPageSize.width) * 100}%`,
                  height: `${(sigHeight / pdfPageSize.height) * 100}%`,
                  minWidth: '80px',
                  minHeight: '30px',
                  border: '2px dashed #4F46E5',
                  background: 'rgba(79, 70, 229, 0.15)',
                  borderRadius: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  overflow: 'hidden',
                  padding: '2px'
                }}
              >
                {currentSigImagePreview ? (
                  <img src={currentSigImagePreview} alt="Signature Overlay" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <div style={{ textAlign: 'center', fontSize: '10px', fontWeight: 700, color: '#1E3A8A' }}>
                    {signerName || typedName || 'Signature Here'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Signer Info & Precise Point Coordinates */}
        <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Signer Name</label>
            <input
              type="text"
              placeholder="Signer Name"
              value={signerName}
              onChange={e => setSignerName(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--color-divider)', fontSize: '12px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Page Number</label>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={pageNum}
              onChange={e => setPageNum(Math.min(totalPages, Math.max(1, parseInt(e.target.value) || 1)))}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--color-divider)', fontSize: '12px' }}
            />
          </div>
        </div>

        <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', alignItems: 'center' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600 }}>Pos X (pt)</label>
            <input
              type="number"
              value={posX}
              onChange={e => setPosX(parseInt(e.target.value) || 0)}
              style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--color-divider)', fontSize: '12px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600 }}>Pos Y (pt)</label>
            <input
              type="number"
              value={posY}
              onChange={e => setPosY(parseInt(e.target.value) || 0)}
              style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--color-divider)', fontSize: '12px' }}
            />
          </div>
          <div style={{ paddingTop: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={includeDate}
                onChange={e => setIncludeDate(e.target.checked)}
              />
              Stamp Date
            </label>
          </div>
        </div>

        {/* Results & Download */}
        {signedResult && (
          <div style={{ marginTop: '16px', padding: '16px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Check size={20} color="#10B981" />
              <span style={{ fontWeight: 700, fontSize: '14px', color: '#10B981' }}>
                Digital Signature Applied to Document!
              </span>
            </div>
            <a
              href={signedResult.download_url}
              download={`${selectedFile?.name?.split('.')[0] || 'document'}_signed.pdf`}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none', padding: '12px', borderRadius: '10px', background: '#4F46E5', color: '#fff', fontWeight: 600 }}
            >
              <Download size={16} /> Download Signed PDF
            </a>
          </div>
        )}
      </div>

      {!signedResult && (
        <div className="compress-screen__footer">
          <PrimaryButton
            onClick={handleSignPDF}
            loading={running}
            disabled={running || !selectedFile}
            id="sign-submit-btn"
            style={{ background: '#4F46E5' }}
          >
            {selectedFile ? 'STAMP & SIGN PDF' : 'SELECT PDF TO SIGN'}
          </PrimaryButton>
        </div>
      )}

      <FeatureTipsSwipeStack tips={TOOL_TIPS} />
      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
    </div>
  );
}
