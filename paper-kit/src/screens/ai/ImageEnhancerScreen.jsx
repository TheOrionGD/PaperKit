import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Wand2 } from 'lucide-react';
import { FileTypeIcon } from '../../components/icons/ToolIcons';
import { PrimaryButton } from '../../components/ui/Button';
import Toast from '../../components/ui/Toast';
import CommonResultScreen, { ACTION_PRESETS } from '../../components/common/CommonResultScreen';
import { useToast } from '../../hooks/useToast';
import { downloadAndOpenFile } from '../../services/native';
import './ImageEnhancerScreen.css';

const HF_API_URL = 'https://api-inference.huggingface.co/models/caidas/swin2SR-classical-sr-x2-64';
const HF_TOKEN = import.meta.env.VITE_HF_API_KEY;

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ImageEnhancerScreen() {
  const location = useLocation();

  const [selectedFile, setSelectedFile] = useState(null);
  const [enhancing, setEnhancing] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [result, setResult] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  
  const fileInputRef = useRef(null);
  const { toast, showToast, dismissToast } = useToast();

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

  // Helper to query HF API, with retry logic for model loading
  async function queryHuggingFace(fileBuffer, retries = 3) {
    for (let i = 0; i < retries; i++) {
      setStatusText(i > 0 ? `Waking up AI model (Attempt ${i + 1}/${retries})...` : 'Enhancing with AI...');
      
      const response = await fetch(HF_API_URL, {
        headers: { 
          Authorization: `Bearer ${HF_TOKEN}`,
          'Content-Type': selectedFile.type || 'image/jpeg'
        },
        method: 'POST',
        body: fileBuffer,
      });

      if (response.ok) {
        return await response.blob();
      }

      const errorData = await response.json().catch(() => ({}));
      
      // If the model is loading, wait the estimated time and retry
      if (response.status === 503 && errorData.estimated_time) {
        setStatusText(`Model loading. Waiting ${Math.ceil(errorData.estimated_time)}s...`);
        await new Promise(resolve => setTimeout(resolve, errorData.estimated_time * 1000 + 1000));
        continue; // Retry
      }
      
      throw new Error(errorData.error || `API returned status ${response.status}`);
    }
    throw new Error('Model took too long to load or failed to process.');
  }

  async function handleEnhance() {
    if (!selectedFile) {
      fileInputRef.current?.click();
      return;
    }
    
    setEnhancing(true);
    setResult(null);
    
    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      
      // Call HF Inference API
      const outputBlob = await queryHuggingFace(arrayBuffer);
      
      const ext = outputBlob.type === 'image/png' ? 'png' : 'jpg';
      const stem = selectedFile.name.replace(/\.[^/.]+$/, '');
      const outputFilename = `${stem}_enhanced.${ext}`;
      const blobUrl = URL.createObjectURL(outputBlob);

      setResult({
        download_url: blobUrl,
        name: outputFilename,
        size: outputBlob.size,
        original_size: selectedFile.size,
        rawFile: new File([outputBlob], outputFilename, { type: outputBlob.type }),
      });

      showToast('Image enhanced successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Enhancement failed: ' + err.message, 'error');
    } finally {
      setEnhancing(false);
      setStatusText('');
    }
  }

  if (result) {
    return (
      <div className="ai-image-enhancer-screen">
        <CommonResultScreen
          title="Image Enhanced Successfully ✓"
          subtitle="AI has increased the resolution and reduced noise."
          file={result}
          metrics={[
            { label: 'Original Size', value: formatSize(result.original_size) },
            { label: 'Enhanced Size', value: formatSize(result.size), badge: 'HD' },
          ]}
          nextActions={[
            ACTION_PRESETS.convert,
            ACTION_PRESETS.compress,
          ]}
          primaryAction={{
            label: 'Download Enhanced Image',
            onClick: () => {
              if (result?.download_url) {
                downloadAndOpenFile(result.download_url, result.name, result.rawFile?.type || 'image/jpeg');
              }
            }
          }}
          onReset={() => {
            setResult(null);
            setSelectedFile(null);
          }}
          sourceWorkflow="ai-image-enhancer"
        />
        <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
      </div>
    );
  }

  return (
    <div className="ai-image-enhancer-screen">
      <div className="ai-image-enhancer-screen__body">
        {!selectedFile ? (
          <button
            className="ai-image-enhancer-screen__pick-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="ai-image-enhancer-screen__pick-icon">
              <Wand2 size={36} color="#7C3AED" />
            </div>
            <p className="ai-image-enhancer-screen__pick-label">Select Image to Enhance</p>
            <p className="ai-image-enhancer-screen__pick-sub">Upscale and improve image quality using advanced AI models</p>
          </button>
        ) : (
          <div className="ai-image-enhancer-screen__file-card" onClick={() => fileInputRef.current?.click()}>
            <FileTypeIcon type="image" size={44} />
            <div className="ai-image-enhancer-screen__file-info">
              <p className="ai-image-enhancer-screen__file-name">{selectedFile.name}</p>
              <p className="ai-image-enhancer-screen__file-meta">
                {formatSize(selectedFile.size)}
              </p>
            </div>
          </div>
        )}

        {previewUrl && (
          <img src={previewUrl} alt="Preview" className="ai-image-enhancer-screen__preview" />
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
      </div>

      <div className="ai-image-enhancer-screen__footer">
        <PrimaryButton
          onClick={handleEnhance}
          loading={enhancing}
          disabled={enhancing || !selectedFile}
        >
          {enhancing ? (statusText || 'ENHANCING...') : (selectedFile ? 'ENHANCE IMAGE' : 'SELECT IMAGE')}
        </PrimaryButton>
      </div>

      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
    </div>
  );
}
