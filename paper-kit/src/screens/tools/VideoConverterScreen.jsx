import { useState, useRef, useEffect } from 'react';
import FeatureTipsSwipeStack from '../../components/ui/FeatureTipsSwipeStack';
import { useSearchParams } from 'react-router-dom';
import { Video, Music, Settings, Zap, ShieldCheck } from 'lucide-react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import Toast from '../../components/ui/Toast';
import CommonResultScreen, { ACTION_PRESETS } from '../../components/common/CommonResultScreen';
import { useToast } from '../../hooks/useToast';
import { downloadAndOpenFile } from '../../services/native';
import '../ai/ai-screen.css';

const TOOL_TIPS = [
  {
    icon: <Video size={20} />,
    title: 'Format Mastery',
    description: 'Convert between MP4, WebM, MOV, and AVI.'
  },
  {
    icon: <Music size={20} />,
    title: 'Extract Audio',
    description: 'Pull MP3 tracks from your videos.'
  },
  {
    icon: <Settings size={20} />,
    title: 'Custom Settings',
    description: 'Adjust resolution and framerate.'
  },
  {
    icon: <Zap size={20} />,
    title: 'Blazing Fast',
    description: 'Powered by WebAssembly technology.'
  },
  {
    icon: <ShieldCheck size={20} />,
    title: '100% Secure',
    description: 'Your footage never hits the cloud.'
  },
];


const VIDEO_FORMATS = [
  { ext: 'mp4', label: 'MP4', mime: 'video/mp4' },
  { ext: 'webm', label: 'WebM', mime: 'video/webm' },
  { ext: 'mov', label: 'MOV', mime: 'video/quicktime' },
  { ext: 'gif', label: 'GIF', mime: 'image/gif' },
];

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function VideoConverterScreen() {
  const [searchParams] = useSearchParams();
  const toParam = searchParams.get('to');

  const [selectedFile, setSelectedFile] = useState(null);
  const [targetFormat, setTargetFormat] = useState(toParam || 'mp4');
  const [converting, setConverting] = useState(false);
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
      showToast('Error loading converter engine', 'error');
    }
  };

  useEffect(() => {
    loadFFmpeg();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleConvert() {
    if (!selectedFile) return;
    setConverting(true);
    setProgress(0);
    
    try {
      const ffmpeg = ffmpegRef.current;
      if (!ffmpeg.loaded) await loadFFmpeg();
      
      const inputExt = selectedFile.name.split('.').pop().toLowerCase();
      const inputName = `input.${inputExt}`;
      const outputName = `output.${targetFormat}`;
      
      await ffmpeg.writeFile(inputName, await fetchFile(selectedFile));
      
      // We limit threads to 1 if COOP/COEP are missing or browser limits it
      // But standard FFmpeg args apply
      await ffmpeg.exec(['-i', inputName, outputName]);
      
      const data = await ffmpeg.readFile(outputName);
      const mime = VIDEO_FORMATS.find(f => f.ext === targetFormat)?.mime || 'video/mp4';
      const blob = new Blob([data.buffer], { type: mime });
      
      const stem = selectedFile.name.replace(/\.[^/.]+$/, '');
      const finalName = `${stem}.${targetFormat}`;
      const blobUrl = URL.createObjectURL(blob);
      
      setResult({
        download_url: blobUrl,
        name: finalName,
        size: blob.size,
        original_size: selectedFile.size,
        rawFile: new File([blob], finalName, { type: mime }),
      });
      
      showToast('Video converted successfully!', 'success');
      
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);
    } catch (err) {
      console.error(err);
      showToast('Conversion failed', 'error');
    } finally {
      setConverting(false);
      setProgress(0);
    }
  }

  if (result) {
    return (
      <div className="media-converter-screen">
        <CommonResultScreen
          title="Video Converted Successfully ✓"
          subtitle={`Converted to ${targetFormat.toUpperCase()}`}
          file={result}
          metrics={[
            { label: 'Original Size', value: formatSize(result.original_size) },
            { label: 'New Size', value: formatSize(result.size) },
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
          sourceWorkflow="video-converter"
        />
        <FeatureTipsSwipeStack tips={TOOL_TIPS} />
      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
      </div>
    );
  }

  return (
    <div className="ai-screen">
      <div className="ai-screen__file-section">
        <span className="ai-screen__file-label">Video File</span>
        <button
          className={`ai-screen__file-picker${selectedFile ? " ai-screen__file-picker--has-file" : ""}`}
          onClick={() => fileInputRef.current?.click()}
        >
          <Video size={20} className="ai-screen__file-icon" />
          {selectedFile ? (
            <span className="ai-screen__file-name">{selectedFile.name} <span style={{fontSize: '12px', color: 'var(--color-text-muted)'}}>({formatSize(selectedFile.size)})</span></span>
          ) : (
            <span className="ai-screen__file-placeholder">Choose Video File (Supports MP4, WebM, MOV, etc.)…</span>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,image/gif"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
          }}
        />
      </div>

      <div className="ai-screen__options-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px', marginBottom: '12px' }}>
        <span className="ai-screen__options-label" style={{ fontWeight: 600, fontSize: '13px' }}>Convert to Format</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px', width: '100%' }}>
          {VIDEO_FORMATS.map(f => (
            <button
              key={f.ext}
              type="button"
              onClick={() => setTargetFormat(f.ext)}
              style={{
                padding: '10px 12px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: targetFormat === f.ext ? 700 : 500,
                border: targetFormat === f.ext ? '2px solid var(--color-primary)' : '1px solid var(--color-divider)',
                background: targetFormat === f.ext ? 'var(--color-primary-soft)' : 'var(--color-surface)',
                color: targetFormat === f.ext ? 'var(--color-primary)' : 'var(--color-text)',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ai-screen__submit-area">
        <button
          className="ai-screen__submit-btn"
          onClick={handleConvert}
          disabled={converting || !selectedFile}
        >
          {converting ? (
            <>
              <span className="ai-screen__submit-spinner" />
              Converting Video ({progress}%)…
            </>
          ) : (
            <>
              <Video size={17} />
              Convert to {targetFormat.toUpperCase()}
            </>
          )}
        </button>
      </div>

      {converting && (
        <div className="ai-screen__loading" style={{ marginTop: '20px' }}>
          <div className="ai-screen__loading-orb">
            <Video size={26} color="#fff" />
          </div>
          <p className="ai-screen__loading-text">Converting Video…</p>
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
