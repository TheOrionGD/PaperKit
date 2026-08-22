import { useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Image, X } from 'lucide-react';
import { uploadFile } from '../../services/files';
import { runImageOp } from '../../services/jobs';
import { useJob } from '../../hooks/useJob';
import JobProgressBar from '../../components/ui/JobProgressBar';
import './ImageToolsScreen.css';

const OPS = {
  convert:            { label: 'Convert',           icon: '🔄', desc: 'Convert image format (JPEG, PNG, WebP, BMP, GIF)' },
  resize:             { label: 'Resize',             icon: '⬛', desc: 'Resize to exact or proportional dimensions' },
  crop:               { label: 'Crop',               icon: '✂️', desc: 'Crop to a specific region' },
  rotate:             { label: 'Rotate',             icon: '🔃', desc: 'Rotate by any angle' },
  flip:               { label: 'Flip',               icon: '↔️', desc: 'Flip horizontally or vertically' },
  brightness:         { label: 'Brightness',         icon: '☀️', desc: 'Adjust image brightness' },
  contrast:           { label: 'Contrast',           icon: '◑',  desc: 'Adjust image contrast' },
  saturation:         { label: 'Saturation',         icon: '🎨', desc: 'Adjust color saturation' },
  sharpness:          { label: 'Sharpness',          icon: '💎', desc: 'Sharpen or blur image' },
  background_removal: { label: 'Remove Background', icon: '🪄', desc: 'Remove background automatically' },
  watermark:          { label: 'Watermark',          icon: '💧', desc: 'Add text watermark to image' },
  vectorize:          { label: 'Vectorize',          icon: '🔷', desc: 'Convert to SVG vector' },
};

export default function ImageToolsScreen() {
  const [params] = useSearchParams();
  const initialOp = params.get('op') || 'convert';

  const [selectedOp, setSelectedOp]     = useState(initialOp);
  const [uploadedFile, setUploadedFile] = useState(null);  // { id, name }
  const [uploading, setUploading]       = useState(false);
  const [uploadError, setUploadError]   = useState('');
  const [opParams, setOpParams]         = useState({});
  const [jobId, setJobId]               = useState(null);
  const fileInputRef = useRef();

  const { job, cancel } = useJob(jobId);

  async function handleFileDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0] || e.target.files?.[0];
    if (!file) return;
    await doUpload(file);
  }

  async function doUpload(file) {
    setUploading(true);
    setUploadError('');
    try {
      const result = await uploadFile(file);
      setUploadedFile({ id: result._id, name: file.name });
    } catch (err) {
      setUploadError(err?.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleProcess() {
    if (!uploadedFile) return;
    try {
      const jobDoc = await runImageOp(selectedOp, uploadedFile.id, opParams);
      setJobId(jobDoc.jobId);
    } catch (err) {
      setUploadError(err?.response?.data?.detail || 'Failed to start job');
    }
  }

  function handleReset() {
    setJobId(null);
    setUploadedFile(null);
    setOpParams({});
    setUploadError('');
  }

  const op = OPS[selectedOp];

  return (
    <div className="img-tools">
      {/* Sidebar: operation picker */}
      <aside className="img-tools__sidebar">
        <h2 className="img-tools__sidebar-title">Image Tools</h2>
        <nav className="img-tools__nav">
          {Object.entries(OPS).map(([key, meta]) => (
            <button
              key={key}
              id={`img-op-${key}`}
              className={`img-tools__nav-btn ${selectedOp === key ? 'img-tools__nav-btn--active' : ''}`}
              onClick={() => { setSelectedOp(key); setJobId(null); setOpParams({}); }}
            >
              <span className="img-tools__nav-icon">{meta.icon}</span>
              <span>{meta.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main panel */}
      <main className="img-tools__main">
        <div className="img-tools__op-header">
          <span className="img-tools__op-icon">{op.icon}</span>
          <div>
            <h1 className="img-tools__op-title">{op.label}</h1>
            <p className="img-tools__op-desc">{op.desc}</p>
          </div>
        </div>

        {/* Upload area */}
        {!uploadedFile && (
          <div
            className={`img-tools__drop-zone ${uploading ? 'img-tools__drop-zone--loading' : ''}`}
            onDragOver={e => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            id="img-drop-zone"
            role="button"
            tabIndex={0}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleFileDrop}
              id="img-file-input"
            />
            {uploading ? (
              <div className="img-tools__uploading">
                <div className="img-tools__spinner" />
                <span>Uploading…</span>
              </div>
            ) : (
              <>
                <div className="img-tools__drop-icon"><Image size={40} /></div>
                <p className="img-tools__drop-title">Drop your image here</p>
                <p className="img-tools__drop-sub">or click to browse · JPEG, PNG, WebP, BMP, GIF, TIFF</p>
              </>
            )}
          </div>
        )}

        {uploadError && (
          <div className="img-tools__error">{uploadError}</div>
        )}

        {/* File selected */}
        {uploadedFile && !jobId && (
          <>
            <div className="img-tools__file-badge">
              <Image size={16} />
              <span>{uploadedFile.name}</span>
              <button className="img-tools__file-remove" onClick={handleReset} id="img-remove-file"><X size={14} /></button>
            </div>

            {/* Operation-specific parameters */}
            <OpParams op={selectedOp} params={opParams} setParams={setOpParams} />

            <button className="img-tools__process-btn" onClick={handleProcess} id="img-process-btn">
              Process: {op.label}
            </button>
          </>
        )}

        {/* Job progress */}
        {jobId && (
          <div className="img-tools__job">
            <JobProgressBar job={job} onCancel={cancel} />
            {job?.status === 'COMPLETED' && (
              <button className="img-tools__reset-btn" onClick={handleReset} id="img-new-job-btn">
                Process Another
              </button>
            )}
            {(job?.status === 'FAILED' || job?.status === 'CANCELLED') && (
              <button className="img-tools__reset-btn" onClick={handleReset} id="img-retry-btn">
                Try Again
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// ── Operation-specific parameter panels ───────────────────────────────────────

function OpParams({ op, params, setParams }) {
  const set = (key, val) => setParams(p => ({ ...p, [key]: val }));

  if (op === 'convert') return (
    <div className="img-tools__params">
      <label className="img-tools__param-label">Target Format</label>
      <select className="img-tools__select" value={params.format || 'jpeg'} onChange={e => set('format', e.target.value)} id="img-format-select">
        {['jpeg','png','webp','bmp','gif','tiff'].map(f => <option key={f} value={f}>{f.toUpperCase()}</option>)}
      </select>
    </div>
  );

  if (op === 'resize') return (
    <div className="img-tools__params">
      <div className="img-tools__param-row">
        <label className="img-tools__param-label">Width (px)</label>
        <input className="img-tools__input" type="number" min="1" value={params.width || 800} onChange={e => set('width', +e.target.value)} id="img-width" />
      </div>
      <div className="img-tools__param-row">
        <label className="img-tools__param-label">Height (px)</label>
        <input className="img-tools__input" type="number" min="1" value={params.height || 600} onChange={e => set('height', +e.target.value)} id="img-height" />
      </div>
      <label className="img-tools__checkbox-row">
        <input type="checkbox" checked={params.keep_aspect !== false} onChange={e => set('keep_aspect', e.target.checked)} id="img-keep-aspect" />
        Keep aspect ratio
      </label>
    </div>
  );

  if (op === 'crop') return (
    <div className="img-tools__params">
      {['left','top','right','bottom'].map(side => (
        <div key={side} className="img-tools__param-row">
          <label className="img-tools__param-label">{side.charAt(0).toUpperCase() + side.slice(1)} (px)</label>
          <input className="img-tools__input" type="number" min="0" value={params[side] || 0} onChange={e => set(side, +e.target.value)} id={`img-crop-${side}`} />
        </div>
      ))}
    </div>
  );

  if (op === 'rotate') return (
    <div className="img-tools__params">
      <label className="img-tools__param-label">Degrees (counter-clockwise)</label>
      <input className="img-tools__input" type="number" value={params.degrees ?? 90} onChange={e => set('degrees', +e.target.value)} id="img-degrees" />
    </div>
  );

  if (op === 'flip') return (
    <div className="img-tools__params">
      <label className="img-tools__param-label">Direction</label>
      <div className="img-tools__btn-group">
        {['horizontal','vertical'].map(d => (
          <button key={d} id={`img-flip-${d}`}
            className={`img-tools__toggle-btn ${(params.direction || 'horizontal') === d ? 'img-tools__toggle-btn--active' : ''}`}
            onClick={() => set('direction', d)}>
            {d === 'horizontal' ? '↔ Horizontal' : '↕ Vertical'}
          </button>
        ))}
      </div>
    </div>
  );

  if (['brightness','contrast','saturation','sharpness'].includes(op)) {
    const min = 0.1, max = 3.0, step = 0.1;
    const factor = params.factor ?? 1.2;
    return (
      <div className="img-tools__params">
        <label className="img-tools__param-label">Factor: <strong>{factor}</strong> (1.0 = original)</label>
        <input className="img-tools__range" type="range" min={min} max={max} step={step}
          value={factor} onChange={e => set('factor', parseFloat(e.target.value))} id={`img-factor-${op}`} />
        <div className="img-tools__range-labels">
          <span>{min}</span><span>1.0</span><span>{max}</span>
        </div>
      </div>
    );
  }

  if (op === 'watermark') return (
    <div className="img-tools__params">
      <label className="img-tools__param-label">Watermark Text</label>
      <input className="img-tools__input" type="text" placeholder="© 2024 Your Name"
        value={params.text || ''} onChange={e => set('text', e.target.value)} id="img-wm-text" />
      <label className="img-tools__param-label">Opacity: <strong>{params.opacity ?? 0.4}</strong></label>
      <input className="img-tools__range" type="range" min="0.05" max="1.0" step="0.05"
        value={params.opacity ?? 0.4} onChange={e => set('opacity', parseFloat(e.target.value))} id="img-wm-opacity" />
      <label className="img-tools__param-label">Position</label>
      <select className="img-tools__select" value={params.position || 'center'} onChange={e => set('position', e.target.value)} id="img-wm-pos">
        {['center','top-left','top-right','bottom-left','bottom-right'].map(p =>
          <option key={p} value={p}>{p}</option>
        )}
      </select>
    </div>
  );

  return null; // no params needed (e.g. background_removal, vectorize)
}
