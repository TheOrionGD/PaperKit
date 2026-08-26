import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Music } from 'lucide-react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import Toast from '../../components/ui/Toast';
import CommonResultScreen, { ACTION_PRESETS } from '../../components/common/CommonResultScreen';
import { useToast } from '../../hooks/useToast';
import { downloadAndOpenFile } from '../../services/native';
import '../ai/ai-screen.css';

const AUDIO_FORMATS = [
  { ext: 'mp3', label: 'MP3', mime: 'audio/mpeg' },
  { ext: 'wav', label: 'WAV', mime: 'audio/wav' },
  { ext: 'ogg', label: 'OGG', mime: 'audio/ogg' },
  { ext: 'flac', label: 'FLAC', mime: 'audio/flac' },
  { ext: 'aac', label: 'AAC', mime: 'audio/aac' },
  { ext: 'm4a', label: 'M4A', mime: 'audio/mp4' },
];

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AudioConverterScreen() {
  const [searchParams] = useSearchParams();
  const toParam = searchParams.get('to');

  const [selectedFile, setSelectedFile] = useState(null);
  const [targetFormat, setTargetFormat] = useState(toParam || 'mp3');
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
      ffmpeg.on('progress', ({ progress: p }) => {
        setProgress(Math.round(p * 100));
      });
      // Load ffmpeg.wasm from unpkg or local (using unpkg for generic availability)
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
      
      const inputName = `input.${selectedFile.name.split('.').pop()}`;
      const outputName = `output.${targetFormat}`;
      
      await ffmpeg.writeFile(inputName, await fetchFile(selectedFile));
      
      // Run conversion
      await ffmpeg.exec(['-i', inputName, outputName]);
      
      const data = await ffmpeg.readFile(outputName);
      const mime = AUDIO_FORMATS.find(f => f.ext === targetFormat)?.mime || 'audio/mpeg';
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
      
      showToast('Audio converted successfully!', 'success');
      
      // Cleanup
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
          title="Audio Converted Successfully ✓"
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
            label: 'Download Audio',
            onClick: () => downloadAndOpenFile(result.download_url, result.name, result.rawFile.type)
          }}
          onReset={() => {
            setResult(null);
            setSelectedFile(null);
          }}
          sourceWorkflow="audio-converter"
        />
        <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
      </div>
    );
  }

  return (
    <div className="ai-screen">
      <div className="ai-screen__file-section">
        <span className="ai-screen__file-label">Audio File</span>
        <button
          className={`ai-screen__file-picker${selectedFile ? " ai-screen__file-picker--has-file" : ""}`}
          onClick={() => fileInputRef.current?.click()}
        >
          <Music size={20} className="ai-screen__file-icon" />
          {selectedFile ? (
            <span className="ai-screen__file-name">{selectedFile.name} <span style={{fontSize: '12px', color: 'var(--color-text-muted)'}}>({formatSize(selectedFile.size)})</span></span>
          ) : (
            <span className="ai-screen__file-placeholder">Choose Audio File (Supports MP3, WAV, OGG, etc.)…</span>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
          }}
        />
      </div>

      <div className="ai-screen__options-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px', marginBottom: '12px' }}>
        <span className="ai-screen__options-label" style={{ fontWeight: 600, fontSize: '13px' }}>Convert to Format</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px', width: '100%' }}>
          {AUDIO_FORMATS.map(f => (
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
              Converting Audio ({progress}%)…
            </>
          ) : (
            <>
              <Music size={17} />
              Convert to {targetFormat.toUpperCase()}
            </>
          )}
        </button>
      </div>

      {converting && (
        <div className="ai-screen__loading" style={{ marginTop: '20px' }}>
          <div className="ai-screen__loading-orb">
            <Music size={26} color="#fff" />
          </div>
          <p className="ai-screen__loading-text">Converting Audio…</p>
          <div style={{ width: '200px', margin: '10px auto', height: '6px', background: 'var(--color-divider)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'var(--color-primary)', transition: 'width 0.3s ease' }} />
          </div>
        </div>
      )}

      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
    </div>
  );
}
