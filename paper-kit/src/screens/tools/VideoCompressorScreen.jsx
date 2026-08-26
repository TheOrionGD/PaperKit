import { useState, useRef, useEffect } from 'react';
import FeatureTipsSwipeStack from '../../components/ui/FeatureTipsSwipeStack';
import { useSearchParams } from 'react-router-dom';
import { Minimize2, Eye, Share2, Zap, ShieldCheck } from 'lucide-react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import Toast from '../../components/ui/Toast';
import CommonResultScreen, { ACTION_PRESETS } from '../../components/common/CommonResultScreen';
import { useToast } from '../../hooks/useToast';
import { downloadAndOpenFile } from '../../services/native';
import '../ai/ai-screen.css';

const TOOL_TIPS = [
  {
    icon: <Minimize2 size={20} />,
    title: 'Massive Compression',
    description: 'Shrink video size by up to 80%.'
  },
  {
    icon: <Eye size={20} />,
    title: 'Preserve Quality',
    description: 'Smart encoding keeps footage crisp.'
  },
  {
    icon: <Share2 size={20} />,
    title: 'Social Ready',
    description: 'Perfect size for Discord and WhatsApp.'
  },
  {
    icon: <Zap size={20} />,
    title: 'Hardware Accelerated',
    description: 'Uses your GPU for fast encoding.'
  },
  {
    icon: <ShieldCheck size={20} />,
    title: 'Local Processing',
    description: 'Your videos stay strictly on your device.'
  },
];


const LEVELS = [
  { id: 'low', label: 'Low Compression', sublabel: 'High quality, larger file size', crf: '18' },
  { id: 'medium', label: 'Medium Compression', sublabel: 'Balanced quality and size', crf: '23' },
  { id: 'high', label: 'High Compression', sublabel: 'Smaller file size, lower quality', crf: '28' },
];

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function VideoCompressorScreen() {
  const [searchParams] = useSearchParams();
  const presetParam = searchParams.get('preset');

  const [selectedFile, setSelectedFile] = useState(null);
  const [level, setLevel] = useState(presetParam || 'medium');
  const [compressing, setCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  
  const ffmpegRef = useRef(new FFmpeg());
  const fileInputRef = useRef(null);
  const { toast, showToast, dismissToast } = useToast();

  const loadFFmpeg = async () => {
    const ffmpeg = ffmpegRef.current;
    if (ffmpeg.loaded) return;
    try {
      ffmpeg.on('progress', ({ progress }) => {
        setProgress(Math.round(progress * 100));
      });
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
    } catch (e) {
      console.error('Error loading ffmpeg', e);
      showToast('Error loading compression engine', 'error');
    }
  };

  useEffect(() => {
    loadFFmpeg();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (presetParam) setLevel(presetParam);
  }, [presetParam]);

  async function handleCompress() {
    if (!selectedFile) {
      fileInputRef.current?.click();
      return;
    }
    setCompressing(true);
    setProgress(0);
    setResult(null);
    
    try {
      const ffmpeg = ffmpegRef.current;
      if (!ffmpeg.loaded) await loadFFmpeg();
      
      const inputName = `input.${selectedFile.name.split('.').pop().toLowerCase()}`;
      const outputName = `output.mp4`; // Always output MP4 for best compression compat
      
      await ffmpeg.writeFile(inputName, await fetchFile(selectedFile));
      
      const targetLevel = LEVELS.find(l => l.id === level) || LEVELS[1];
      
      // H264 compression via CRF
      await ffmpeg.exec(['-i', inputName, '-vcodec', 'libx264', '-crf', targetLevel.crf, outputName]);
      
      const data = await ffmpeg.readFile(outputName);
      const blob = new Blob([data.buffer], { type: 'video/mp4' });
      
      const stem = selectedFile.name.replace(/\.[^/.]+$/, '');
      const finalName = `${stem}_compressed.mp4`;
      const blobUrl = URL.createObjectURL(blob);
      
      setResult({
        download_url: blobUrl,
        name: finalName,
        size: blob.size,
        original_size: selectedFile.size,
        compressed_size: blob.size,
        reduction_pct: selectedFile.size > 0 ? Math.max(0, Math.round(((selectedFile.size - blob.size) / selectedFile.size) * 100)) : 0,
        rawFile: new File([blob], finalName, { type: 'video/mp4' }),
      });
      
      showToast('Video compressed successfully!', 'success');
      
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);
    } catch (err) {
      console.error(err);
      showToast('Compression failed', 'error');
    } finally {
      setCompressing(false);
      setProgress(0);
    }
  }

  if (result) {
    return (
      <div className="media-converter-screen">
        <CommonResultScreen
          title="Video Compressed Successfully ✓"
          subtitle={`Reduced file size by ${result.reduction_pct}%`}
          file={result}
          metrics={[
            { label: 'Original Size', value: formatSize(result.original_size) },
            { label: 'Compressed Size', value: formatSize(result.compressed_size) },
            { label: 'Saved', value: `${result.reduction_pct}%`, badge: `-${result.reduction_pct}%` },
          ]}
          nextActions={[
            ACTION_PRESETS.convert,
          ]}
          primaryAction={{
            label: 'Download Video',
            onClick: () => downloadAndOpenFile(result.download_url, result.name, result.rawFile.type)
          }}
          onReset={() => {
            setResult(null);
            setSelectedFile(null);
          }}
          sourceWorkflow="video-compressor"
        />
        <FeatureTipsSwipeStack tips={TOOL_TIPS} />
      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
      </div>
    );
  }

  return (
    <div className="ai-screen">
      <div className="ai-screen__file-section">
        <span className="ai-screen__file-label">Video to Compress</span>
        <button
          className={`ai-screen__file-picker${selectedFile ? " ai-screen__file-picker--has-file" : ""}`}
          onClick={() => fileInputRef.current?.click()}
        >
          <Minimize2 size={20} className="ai-screen__file-icon" />
          {selectedFile ? (
            <span className="ai-screen__file-name">{selectedFile.name} <span style={{fontSize: '12px', color: 'var(--color-text-muted)'}}>({formatSize(selectedFile.size)})</span></span>
          ) : (
            <span className="ai-screen__file-placeholder">Choose Video File (Supports MP4, WebM, MOV)…</span>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
          }}
        />
      </div>

      <div className="ai-screen__options-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px', marginBottom: '12px' }}>
        <span className="ai-screen__options-label" style={{ fontWeight: 600, fontSize: '13px' }}>Compression Level</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px', width: '100%' }}>
          {LEVELS.map(l => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLevel(l.id)}
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                border: level === l.id ? '2px solid var(--color-primary)' : '1px solid var(--color-divider)',
                background: level === l.id ? 'var(--color-primary-soft)' : 'var(--color-surface)',
                color: level === l.id ? 'var(--color-primary)' : 'var(--color-text)',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '13px' }}>{l.label}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{l.sublabel}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="ai-screen__submit-area">
        <button
          className="ai-screen__submit-btn"
          onClick={handleCompress}
          disabled={compressing || !selectedFile}
        >
          {compressing ? (
            <>
              <span className="ai-screen__submit-spinner" />
              Compressing Video ({progress}%)…
            </>
          ) : (
            <>
              <Minimize2 size={17} />
              Compress Video
            </>
          )}
        </button>
      </div>

      {compressing && (
        <div className="ai-screen__loading" style={{ marginTop: '20px' }}>
          <div className="ai-screen__loading-orb">
            <Minimize2 size={26} color="#fff" />
          </div>
          <p className="ai-screen__loading-text">Compressing Video…</p>
          <p className="ai-screen__loading-sub">This may take a while depending on file size</p>
          <div style={{ width: '200px', margin: '10px auto', height: '6px', background: 'var(--color-divider)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'var(--color-primary)', transition: 'width 0.3s ease' }} />
          </div>
        </div>
      )}

      <FeatureTipsSwipeStack tips={TOOL_TIPS} />
      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
    </div>
  );
}
