import { useState, useRef, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { Minimize2 } from 'lucide-react';
import Toast from '../../components/ui/Toast';
import CommonResultScreen, { ACTION_PRESETS } from '../../components/common/CommonResultScreen';
import { useToast } from '../../hooks/useToast';
import { downloadAndOpenFile } from '../../services/native';
import heic2any from 'heic2any';
import '../ai/ai-screen.css';

const LEVELS = [
  { id: 'low', label: 'Low Compression', sublabel: 'High quality, larger file size', quality: 0.9 },
  { id: 'medium', label: 'Medium Compression', sublabel: 'Balanced quality and file size reduction', quality: 0.6 },
  { id: 'high', label: 'High Compression', sublabel: 'Smaller file size, lower quality', quality: 0.3 },
  { id: 'custom', label: 'Custom Compression', sublabel: 'Manually select compression level', quality: 0.75 },
];

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ImageCompressorScreen() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const presetParam = searchParams.get('preset');

  const [selectedFile, setSelectedFile] = useState(null);
  const [level, setLevel] = useState(presetParam || 'medium');
  const [customQuality, setCustomQuality] = useState(0.75);
  const [compressing, setCompressing] = useState(false);
  const [result, setResult] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  
  const fileInputRef = useRef(null);
  const { toast, showToast, dismissToast } = useToast();

  useEffect(() => {
    if (presetParam) setLevel(presetParam);
  }, [presetParam]);

  useEffect(() => {
    const incoming = location.state?.chainedFile || location.state?.file;
    if (incoming) {
      const fileObj = incoming instanceof File ? incoming : incoming.file || incoming;
      setSelectedFile(fileObj);
      setResult(null);
    }
  }, [location.state]);

  useEffect(() => {
    if (selectedFile instanceof File) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [selectedFile]);

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setResult(null);
  }

  async function handleCompress() {
    if (!selectedFile) {
      fileInputRef.current?.click();
      return;
    }
    setCompressing(true);
    setResult(null);
    
    try {
      let fileToProcess = selectedFile;
      
      // If HEIC, convert to JPEG first to allow canvas processing
      if (selectedFile.type === 'image/heic' || selectedFile.name.toLowerCase().endsWith('.heic')) {
        const convertedBlob = await heic2any({
          blob: selectedFile,
          toType: 'image/jpeg',
        });
        fileToProcess = new File(
          [Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob], 
          selectedFile.name.replace(/\.heic$/i, '.jpg'), 
          { type: 'image/jpeg' }
        );
      }

      const img = new Image();
      const objectUrl = URL.createObjectURL(fileToProcess);
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = objectUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      // We always compress as JPEG since PNG compression in canvas is lossy only for quality not size effectively
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      const targetQuality = level === 'custom' ? customQuality : LEVELS.find(l => l.id === level).quality;

      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/jpeg', targetQuality);
      });

      if (!blob) throw new Error('Compression failed');

      const stem = selectedFile.name.replace(/\.[^/.]+$/, '');
      const outputFilename = `${stem}_compressed.jpg`;
      const blobUrl = URL.createObjectURL(blob);

      setResult({
        download_url: blobUrl,
        name: outputFilename,
        size: blob.size,
        original_size: selectedFile.size,
        compressed_size: blob.size,
        reduction_pct: selectedFile.size > 0 ? Math.max(0, Math.round(((selectedFile.size - blob.size) / selectedFile.size) * 100)) : 0,
        rawFile: new File([blob], outputFilename, { type: 'image/jpeg' }),
      });

      showToast('Image compressed successfully!', 'success');
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error(err);
      showToast('Compression failed: ' + err.message, 'error');
    } finally {
      setCompressing(false);
    }
  }

  if (result) {
    return (
      <div className="image-compressor-screen">
        <CommonResultScreen
          title="Image Compressed Successfully ✓"
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
            label: 'Download Compressed Image',
            onClick: () => {
              if (result?.download_url) {
                downloadAndOpenFile(result.download_url, result.name, 'image/jpeg');
              }
            }
          }}
          onReset={() => {
            setResult(null);
            setSelectedFile(null);
          }}
          sourceWorkflow="image-compressor"
        />
        <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
      </div>
    );
  }

  return (
    <div className="ai-screen">
      <div className="ai-screen__file-section">
        <span className="ai-screen__file-label">Image to Compress</span>
        <button
          className={`ai-screen__file-picker${selectedFile ? " ai-screen__file-picker--has-file" : ""}`}
          onClick={() => fileInputRef.current?.click()}
        >
          <Minimize2 size={20} className="ai-screen__file-icon" />
          {selectedFile ? (
            <span className="ai-screen__file-name">{selectedFile.name} <span style={{fontSize: '12px', color: 'var(--color-text-muted)'}}>({formatSize(selectedFile.size)})</span></span>
          ) : (
            <span className="ai-screen__file-placeholder">Choose Image File (JPG, PNG, WebP, HEIC, BMP)…</span>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/bmp"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
      </div>

      {previewUrl && (
        <div style={{ marginBottom: '16px', textAlign: 'center' }}>
          <img src={previewUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '12px', border: '1px solid var(--color-divider)' }} />
        </div>
      )}

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

      {level === 'custom' && (
        <div style={{ background: 'var(--color-surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--color-divider)', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', fontWeight: 600 }}>
            <span>Custom Quality</span>
            <span>{Math.round(customQuality * 100)}%</span>
          </div>
          <input 
            type="range" 
            min="0.1" 
            max="1.0" 
            step="0.05"
            value={customQuality}
            onChange={(e) => setCustomQuality(parseFloat(e.target.value))}
            style={{ width: '100%', cursor: 'pointer' }}
          />
        </div>
      )}

      <div className="ai-screen__submit-area">
        <button
          className="ai-screen__submit-btn"
          onClick={handleCompress}
          disabled={compressing || !selectedFile}
        >
          {compressing ? (
            <>
              <span className="ai-screen__submit-spinner" />
              Compressing Image…
            </>
          ) : (
            <>
              <Minimize2 size={17} />
              Compress Image
            </>
          )}
        </button>
      </div>

      {compressing && (
        <div className="ai-screen__loading" style={{ marginTop: '20px' }}>
          <div className="ai-screen__loading-orb">
            <Minimize2 size={26} color="#fff" />
          </div>
          <p className="ai-screen__loading-text">Compressing Image…</p>
        </div>
      )}

      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
    </div>
  );
}
