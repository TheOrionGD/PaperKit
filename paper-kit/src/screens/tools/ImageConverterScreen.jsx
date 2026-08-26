import { useState, useRef, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { Image as ImageIcon, FileImage, ShieldCheck, Zap, Image, Layers, Maximize } from 'lucide-react';
import Toast from '../../components/ui/Toast';
import CommonResultScreen, { ACTION_PRESETS } from '../../components/common/CommonResultScreen';
import FeatureTipsSwipeStack from '../../components/ui/FeatureTipsSwipeStack';
import { useToast } from '../../hooks/useToast';
import { downloadAndOpenFile } from '../../services/native';
import heic2any from 'heic2any';
import '../ai/ai-screen.css';

const TOOL_TIPS = [
  {
    icon: <Image size={20} />,
    title: 'Universal Formats',
    description: 'Convert between PNG, JPEG, WEBP, and HEIC.'
  },
  {
    icon: <Layers size={20} />,
    title: 'Batch Conversion',
    description: 'Process entire folders of images instantly.'
  },
  {
    icon: <Maximize size={20} />,
    title: 'Auto-Resize',
    description: 'Optionally scale images during conversion.'
  },
  {
    icon: <Zap size={20} />,
    title: 'Hardware Accelerated',
    description: 'Blazing fast conversion speeds.'
  },
  {
    icon: <ShieldCheck size={20} />,
    title: '100% Secure',
    description: 'Everything happens offline.'
  },
];


const FORMATS = [
  { id: 'image/jpeg', label: 'JPG', sublabel: 'Best for photographs' },
  { id: 'image/png', label: 'PNG', sublabel: 'Best for graphics with transparency' },
];

const CONVERTER_TIPS = [
  {
    icon: <FileImage size={20} />,
    title: 'Universal Format Support',
    description: 'Easily convert HEIC, WebP, BMP, and more into widely accepted formats like JPG and PNG.'
  },
  {
    icon: <Zap size={20} />,
    title: 'Lightning Fast',
    description: 'All conversions happen instantly on your device without needing to upload anything.'
  },
  {
    icon: <ShieldCheck size={20} />,
    title: '100% Private',
    description: 'Your images are processed locally and never sent to any external servers, ensuring complete privacy.'
  }
];

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ImageConverterScreen() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');

  const [selectedFile, setSelectedFile] = useState(null);
  const [targetFormat, setTargetFormat] = useState(toParam === 'png' ? 'image/png' : 'image/jpeg');
  const [converting, setConverting] = useState(false);
  const [result, setResult] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  
  const fileInputRef = useRef(null);
  const { toast, showToast, dismissToast } = useToast();

  useEffect(() => {
    if (toParam === 'png') setTargetFormat('image/png');
    else if (toParam === 'jpg') setTargetFormat('image/jpeg');
  }, [toParam]);

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

  async function handleConvert() {
    if (!selectedFile) {
      fileInputRef.current?.click();
      return;
    }
    setConverting(true);
    setResult(null);
    
    try {
      let fileToProcess = selectedFile;
      
      // If HEIC, convert to a format canvas can read (JPEG/PNG)
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
      
      if (targetFormat === 'image/jpeg') {
        // Fill white background for transparent images converting to JPG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      ctx.drawImage(img, 0, 0);

      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, targetFormat, 0.92);
      });

      if (!blob) throw new Error('Conversion failed');

      const ext = targetFormat === 'image/jpeg' ? 'jpg' : 'png';
      const stem = selectedFile.name.replace(/\.[^/.]+$/, '');
      const outputFilename = `${stem}_converted.${ext}`;
      const blobUrl = URL.createObjectURL(blob);

      setResult({
        download_url: blobUrl,
        name: outputFilename,
        size: blob.size,
        original_size: selectedFile.size,
        compressed_size: blob.size,
        reduction_pct: selectedFile.size > 0 ? Math.round(((selectedFile.size - blob.size) / selectedFile.size) * 100) : 0,
        rawFile: new File([blob], outputFilename, { type: targetFormat }),
      });

      showToast('Image converted successfully!', 'success');
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error(err);
      showToast('Conversion failed: ' + err.message, 'error');
    } finally {
      setConverting(false);
    }
  }

  if (result) {
    return (
      <div className="image-tool-screen">
        <CommonResultScreen
          title="Image Converted Successfully ✓"
          subtitle={`Converted to ${targetFormat === 'image/jpeg' ? 'JPG' : 'PNG'}`}
          file={result}
          metrics={[
            { label: 'Original Size', value: formatSize(result.original_size) },
            { label: 'New Size', value: formatSize(result.size) },
          ]}
          nextActions={[
            ACTION_PRESETS.convert,
            ACTION_PRESETS.compress,
          ]}
          primaryAction={{
            label: 'Download Image',
            onClick: () => {
              if (result?.download_url) {
                downloadAndOpenFile(result.download_url, result.name, targetFormat);
              }
            }
          }}
          onReset={() => {
            setResult(null);
            setSelectedFile(null);
          }}
          sourceWorkflow="image-converter"
        />
        <FeatureTipsSwipeStack tips={TOOL_TIPS} />
      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
      </div>
    );
  }

  // Determine accepted file types based on fromParam
  let acceptStr = 'image/jpeg,image/png,image/webp,image/heic,image/bmp';
  if (fromParam) {
    if (fromParam === 'jpg') acceptStr = 'image/jpeg';
    else if (fromParam === 'heic') acceptStr = '.heic,image/heic';
    else acceptStr = `image/${fromParam}`;
  }

  return (
    <div className="ai-screen">
      <div className="ai-screen__file-section">
        <span className="ai-screen__file-label">Image to Convert</span>
        <button
          className={`ai-screen__file-picker${selectedFile ? " ai-screen__file-picker--has-file" : ""}`}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageIcon size={20} className="ai-screen__file-icon" />
          {selectedFile ? (
            <span className="ai-screen__file-name">{selectedFile.name} <span style={{fontSize: '12px', color: 'var(--color-text-muted)'}}>({formatSize(selectedFile.size)})</span></span>
          ) : (
            <span className="ai-screen__file-placeholder">Choose Image File (JPG, PNG, WebP, HEIC, BMP)…</span>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptStr}
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
        <span className="ai-screen__options-label" style={{ fontWeight: 600, fontSize: '13px' }}>Convert To</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px', width: '100%' }}>
          {FORMATS.filter(f => !toParam || f.id === (toParam === 'png' ? 'image/png' : 'image/jpeg')).map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setTargetFormat(f.id)}
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                border: targetFormat === f.id ? '2px solid var(--color-primary)' : '1px solid var(--color-divider)',
                background: targetFormat === f.id ? 'var(--color-primary-soft)' : 'var(--color-surface)',
                color: targetFormat === f.id ? 'var(--color-primary)' : 'var(--color-text)',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '13px' }}>{f.label}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{f.sublabel}</div>
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
              Converting Image…
            </>
          ) : (
            <>
              <ImageIcon size={17} />
              Convert Image
            </>
          )}
        </button>
      </div>

      {converting && (
        <div className="ai-screen__loading" style={{ marginTop: '20px' }}>
          <div className="ai-screen__loading-orb">
            <ImageIcon size={26} color="#fff" />
          </div>
          <p className="ai-screen__loading-text">Converting Image…</p>
        </div>
      )}

      <FeatureTipsSwipeStack tips={TOOL_TIPS} />
      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
    </div>
  );
}
