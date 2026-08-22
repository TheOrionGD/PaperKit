import { useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Video, X, Plus } from 'lucide-react';
import { uploadFile } from '../../services/files';
import { runVideoOp } from '../../services/jobs';
import { useJob } from '../../hooks/useJob';
import JobProgressBar from '../../components/ui/JobProgressBar';
import './VideoToolsScreen.css';

const OPS = {
  convert:        { label: 'Convert',        icon: '🔄', desc: 'Convert between MP4, AVI, MKV, MOV, WebM', multi: false },
  transcode:      { label: 'Transcode',      icon: '⚙️', desc: 'Re-encode with custom codecs and quality', multi: false },
  trim:           { label: 'Trim',           icon: '✂️', desc: 'Cut video to a specific time range', multi: false },
  merge:          { label: 'Merge',          icon: '➕', desc: 'Concatenate multiple videos into one', multi: true },
  extract_audio:  { label: 'Extract Audio',  icon: '🎵', desc: 'Extract audio track from video', multi: false },
  normalize_audio:{ label: 'Normalize Audio',icon: '📊', desc: 'Normalize audio loudness', multi: false },
  extract_frames: { label: 'Extract Frames', icon: '🖼️', desc: 'Export frames from video as images', multi: false },
  frames_to_video:{ label: 'Frames to Video',icon: '🎬', desc: 'Assemble image frames into a video', multi: true },
  frames_to_gif:  { label: 'Frames to GIF', icon: '🎞️', desc: 'Create animated GIF from image frames', multi: true },
};

export default function VideoToolsScreen() {
  const [params] = useSearchParams();
  const initialOp = params.get('op') || 'convert';

  const [selectedOp, setSelectedOp]       = useState(initialOp);
  const [uploadedFiles, setUploadedFiles] = useState([]);  // [{id, name}]
  const [uploading, setUploading]         = useState(false);
  const [uploadError, setUploadError]     = useState('');
  const [opParams, setOpParams]           = useState({});
  const [jobId, setJobId]                 = useState(null);
  const fileInputRef = useRef();

  const { job, cancel } = useJob(jobId);
  const op = OPS[selectedOp];

  async function handleFile(e) {
    const files = Array.from(e.target.files || e.dataTransfer?.files || []);
    if (!files.length) return;
    setUploading(true);
    setUploadError('');
    try {
      const results = await Promise.all(files.map(f => uploadFile(f)));
      const newFiles = results.map((r, i) => ({ id: r._id, name: files[i].name }));
      if (op.multi) {
        setUploadedFiles(prev => [...prev, ...newFiles]);
      } else {
        setUploadedFiles([newFiles[0]]);
      }
    } catch (err) {
      setUploadError(err?.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleProcess() {
    if (!uploadedFiles.length) return;
    try {
      const fileIds = uploadedFiles.map(f => f.id);
      const jobDoc = op.multi
        ? await runVideoOp(selectedOp, fileIds, opParams)
        : await runVideoOp(selectedOp, fileIds[0], opParams);
      setJobId(jobDoc.jobId);
    } catch (err) {
      setUploadError(err?.response?.data?.detail || 'Failed to start job');
    }
  }

  function handleReset() {
    setJobId(null);
    setUploadedFiles([]);
    setOpParams({});
    setUploadError('');
  }

  const set = (key, val) => setOpParams(p => ({ ...p, [key]: val }));

  return (
    <div className="vid-tools">
      <aside className="vid-tools__sidebar">
        <h2 className="vid-tools__sidebar-title">Video Tools</h2>
        <nav className="vid-tools__nav">
          {Object.entries(OPS).map(([key, meta]) => (
            <button key={key} id={`vid-op-${key}`}
              className={`vid-tools__nav-btn ${selectedOp === key ? 'vid-tools__nav-btn--active' : ''}`}
              onClick={() => { setSelectedOp(key); setJobId(null); setUploadedFiles([]); setOpParams({}); }}>
              <span>{meta.icon}</span>
              <span>{meta.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="vid-tools__main">
        <div className="vid-tools__op-header">
          <span className="vid-tools__op-icon">{op.icon}</span>
          <div>
            <h1 className="vid-tools__op-title">{op.label}</h1>
            <p className="vid-tools__op-desc">{op.desc}</p>
          </div>
        </div>

        {/* File list */}
        {uploadedFiles.length > 0 && !jobId && (
          <div className="vid-tools__file-list">
            {uploadedFiles.map((f, i) => (
              <div key={f.id} className="vid-tools__file-badge">
                <Video size={14} />
                <span>{f.name}</span>
                <button onClick={() => setUploadedFiles(prev => prev.filter((_, j) => j !== i))}
                  className="vid-tools__file-remove" id={`vid-remove-${i}`}><X size={12} /></button>
              </div>
            ))}
            {op.multi && (
              <button className="vid-tools__add-btn" onClick={() => fileInputRef.current?.click()} id="vid-add-more">
                <Plus size={14} /> Add more
              </button>
            )}
          </div>
        )}

        {/* Drop zone */}
        {uploadedFiles.length === 0 && !jobId && (
          <div className="vid-tools__drop-zone"
            onDragOver={e => e.preventDefault()}
            onDrop={handleFile}
            onClick={() => fileInputRef.current?.click()}
            id="vid-drop-zone" role="button" tabIndex={0}>
            <input ref={fileInputRef} type="file"
              accept={['frames_to_video','frames_to_gif'].includes(selectedOp) ? 'image/*' : 'video/*,audio/*'}
              multiple={op.multi} hidden onChange={handleFile} id="vid-file-input" />
            {uploading ? (
              <div className="vid-tools__uploading"><div className="vid-tools__spinner" /><span>Uploading…</span></div>
            ) : (
              <>
                <div className="vid-tools__drop-icon"><Video size={40} /></div>
                <p className="vid-tools__drop-title">
                  {op.multi ? 'Drop multiple files here' : 'Drop your file here'}
                </p>
                <p className="vid-tools__drop-sub">or click to browse</p>
              </>
            )}
          </div>
        )}

        {uploadError && <div className="vid-tools__error">{uploadError}</div>}

        {/* Params */}
        {uploadedFiles.length > 0 && !jobId && (
          <>
            <VideoParams op={selectedOp} params={opParams} set={set} />
            <button className="vid-tools__process-btn" onClick={handleProcess} id="vid-process-btn">
              {op.label}
            </button>
          </>
        )}

        {/* Job progress */}
        {jobId && (
          <div className="vid-tools__job">
            <JobProgressBar job={job} onCancel={cancel} />
            {['COMPLETED','FAILED','CANCELLED'].includes(job?.status) && (
              <button className="vid-tools__reset-btn" onClick={handleReset} id="vid-new-job">
                {job?.status === 'COMPLETED' ? 'Process Another' : 'Try Again'}
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function VideoParams({ op, params, set }) {
  if (op === 'convert') return (
    <div className="vid-tools__params">
      <label className="vid-tools__param-label">Output Format</label>
      <select className="vid-tools__select" value={params.format || 'mp4'} onChange={e => set('format', e.target.value)} id="vid-format">
        {['mp4','avi','mkv','mov','webm'].map(f => <option key={f} value={f}>{f.toUpperCase()}</option>)}
      </select>
    </div>
  );

  if (op === 'transcode') return (
    <div className="vid-tools__params">
      <label className="vid-tools__param-label">Video Codec</label>
      <select className="vid-tools__select" value={params.video_codec || 'libx264'} onChange={e => set('video_codec', e.target.value)} id="vid-vcodec">
        {['libx264','libx265','vp9','av1'].map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <label className="vid-tools__param-label">Quality (CRF): <strong>{params.crf ?? 23}</strong></label>
      <input type="range" min="0" max="51" value={params.crf ?? 23} onChange={e => set('crf', +e.target.value)}
        className="vid-tools__range" id="vid-crf" />
      <div className="vid-tools__range-labels"><span>0 Best</span><span>23 Default</span><span>51 Worst</span></div>
      <label className="vid-tools__param-label">Preset</label>
      <select className="vid-tools__select" value={params.preset || 'fast'} onChange={e => set('preset', e.target.value)} id="vid-preset">
        {['ultrafast','fast','medium','slow','veryslow'].map(p => <option key={p} value={p}>{p}</option>)}
      </select>
    </div>
  );

  if (op === 'trim') return (
    <div className="vid-tools__params">
      <div className="vid-tools__param-row">
        <label className="vid-tools__param-label">Start (seconds)</label>
        <input type="number" min="0" step="0.1" className="vid-tools__input"
          value={params.start ?? 0} onChange={e => set('start', +e.target.value)} id="vid-start" />
      </div>
      <div className="vid-tools__param-row">
        <label className="vid-tools__param-label">End (seconds)</label>
        <input type="number" min="0" step="0.1" className="vid-tools__input"
          value={params.end ?? 30} onChange={e => set('end', +e.target.value)} id="vid-end" />
      </div>
    </div>
  );

  if (op === 'extract_audio') return (
    <div className="vid-tools__params">
      <label className="vid-tools__param-label">Audio Format</label>
      <select className="vid-tools__select" value={params.format || 'mp3'} onChange={e => set('format', e.target.value)} id="vid-afmt">
        {['mp3','aac','wav'].map(f => <option key={f} value={f}>{f.toUpperCase()}</option>)}
      </select>
    </div>
  );

  if (op === 'extract_frames') return (
    <div className="vid-tools__params">
      <div className="vid-tools__param-row">
        <label className="vid-tools__param-label">Frames per second: <strong>{params.fps ?? 1}</strong></label>
        <input type="range" min="0.1" max="30" step="0.1" value={params.fps ?? 1}
          onChange={e => set('fps', parseFloat(e.target.value))} className="vid-tools__range" id="vid-fps" />
      </div>
      <div className="vid-tools__param-row">
        <label className="vid-tools__param-label">Max frames: <strong>{params.max_frames ?? 30}</strong></label>
        <input type="range" min="1" max="200" value={params.max_frames ?? 30}
          onChange={e => set('max_frames', +e.target.value)} className="vid-tools__range" id="vid-max-frames" />
      </div>
    </div>
  );

  if (op === 'frames_to_video' || op === 'frames_to_gif') return (
    <div className="vid-tools__params">
      <label className="vid-tools__param-label">FPS: <strong>{params.fps ?? (op === 'frames_to_gif' ? 10 : 24)}</strong></label>
      <input type="range" min="1" max="60" value={params.fps ?? (op === 'frames_to_gif' ? 10 : 24)}
        onChange={e => set('fps', +e.target.value)} className="vid-tools__range" id="vid-out-fps" />
    </div>
  );

  return null;
}
