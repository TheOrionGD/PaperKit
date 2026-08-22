/* ConvertScreen — dynamic, registry-driven converter for all conversion tools matching the reference */
import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, Cpu, Eye, Download, CheckCircle, Loader2 } from 'lucide-react';
import { FileTypeIcon } from '../../components/icons/ToolIcons';
import Toggle from '../../components/ui/Toggle';
import { PrimaryButton } from '../../components/ui/Button';
import Toast from '../../components/ui/Toast';
import LoadingState from '../../components/ui/LoadingState';
import FileUploader from '../../components/common/FileUploader';
import FilePreviewModal from '../../components/ui/FilePreviewModal';
import { useUpload } from '../../hooks/useUpload';
import { useToast } from '../../hooks/useToast';
import { convertFile, getToolsRegistry } from '../../services/tools';
import './ConvertScreen.css';

const FORMAT_META = {
  pdf:      { label: 'PDF',      ext: '.pdf',  iconType: 'pdf' },
  word:     { label: 'Word',     ext: '.docx', iconType: 'word' },
  excel:    { label: 'Excel',    ext: '.xlsx', iconType: 'excel' },
  ppt:      { label: 'PPT',      ext: '.pptx', iconType: 'ppt' },
  image:    { label: 'Image',    ext: '.jpg',  iconType: 'image' },
  txt:      { label: 'TXT',      ext: '.txt',  iconType: 'default' },
  html:     { label: 'HTML',     ext: '.html', iconType: 'default' },
  markdown: { label: 'Markdown', ext: '.md',   iconType: 'default' },
};

export default function ConvertScreen() {
  const [params] = useSearchParams();
  const from = params.get('from') || 'pdf';
  const to = params.get('to') || 'word';
  const fromMeta = FORMAT_META[from] || FORMAT_META.pdf;
  const toMeta = FORMAT_META[to] || FORMAT_META.word;

  const [registry, setRegistry] = useState([]);
  const [loadingRegistry, setLoadingRegistry] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadedId, setUploadedId] = useState(null);
  const [convertedResult, setConvertedResult] = useState(null); // { download_url, filename }
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  // Options state
  const [ocr, setOcr] = useState(false);
  const [keepFormatting, setKeepFormatting] = useState(true);
  const [dpi, setDpi] = useState('150');

  const [converting, setConverting] = useState(false);
  const fileInputRef = useRef(null);
  const { upload, uploading } = useUpload();
  const { toast, showToast, dismissToast } = useToast();

  // Load registry on mount
  useEffect(() => {
    getToolsRegistry()
      .then(data => {
        setRegistry(data);
        setLoadingRegistry(false);
      })
      .catch(err => {
        showToast('Failed to load tool configuration: ' + err.message, 'error');
        setLoadingRegistry(false);
      });
  }, [showToast]);

  // Find active tool from registry
  const currentTool = registry.find(t => 
    t.route.includes(`from=${from}`) && t.route.includes(`to=${to}`)
  );

  // Derive accepted extensions
  const acceptedExts = currentTool?.supportedFormats || [fromMeta.ext];
  const acceptAttr = acceptedExts.join(',');

  // Derive active engine
  const activeEngineKey = currentTool?.defaultEngine || 'python';
  const engineInfo = currentTool?.engines?.[activeEngineKey] || {};
  const engineName = engineInfo.name || 'Auto Engine';

  // Handle file select
  async function handleFileSelect(fileOrEvent) {
    const file = fileOrEvent?.target?.files?.[0] || fileOrEvent;
    if (!file) return;
    setSelectedFile(file);
    setConvertedResult(null);
    try {
      const doc = await upload(file);
      setUploadedId(doc._id || doc.id);
      showToast('File ready for conversion', 'success');
    } catch (err) {
      showToast('Upload failed: ' + err.message, 'error');
    }
  }

  // Trigger conversion
  async function handleConvert() {
    if (!selectedFile) {
      fileInputRef.current?.click();
      return;
    }
    
    let activeId = uploadedId;
    setConverting(true);
    try {
      if (!activeId) {
        const doc = await upload(selectedFile);
        activeId = doc._id || doc.id;
        setUploadedId(activeId);
      }

      const options = {};
      if (currentTool?.capabilities?.includes('ocr')) {
        options.ocr = ocr;
      }
      if (currentTool?.capabilities?.includes('layout-preservation') || currentTool?.capabilities?.includes('high-fidelity-layout')) {
        options.keep_formatting = keepFormatting;
      }
      if (currentTool?.capabilities?.includes('dpi-selection')) {
        options.dpi = parseInt(dpi, 10);
      }

      const result = await convertFile(activeId, from, to, options);
      showToast('Conversion complete!', 'success');
      
      const resFilename = result.filename || `converted_doc${toMeta.ext}`;
      setConvertedResult({
        download_url: result.download_url,
        filename: resFilename,
      });
    } catch (err) {
      showToast('Conversion failed: ' + err.message, 'error');
    } finally {
      setConverting(false);
    }
  }

  const handleDownload = () => {
    if (!convertedResult?.download_url) return;
    const a = document.createElement('a');
    a.href = convertedResult.download_url;
    a.download = convertedResult.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loadingRegistry) {
    return <LoadingState text="Loading tool settings..." />;
  }

  return (
    <div className="convert-screen">
      <div className="convert-screen__body">
        {/* Format visual */}
        <div className="convert-screen__format-visual">
          <div className="convert-screen__format-box">
            <FileTypeIcon type={fromMeta.iconType} size={64} />
            <span className="convert-screen__format-label">{fromMeta.label}</span>
          </div>
          <ArrowRight size={28} color="var(--color-text-muted)" />
          <div className="convert-screen__format-box">
            <FileTypeIcon type={toMeta.iconType} size={64} />
            <span className="convert-screen__format-label">{toMeta.label}</span>
          </div>
        </div>

        <p className="convert-screen__caption">
          Convert {fromMeta.label} to editable {toMeta.label} document
        </p>

        {/* Engine Banner */}
        {currentTool && (
          <div className="convert-screen__engine-badge" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--color-primary-soft)',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
            color: 'var(--color-primary)',
            marginTop: '8px',
            marginBottom: '16px'
          }}>
            <Cpu size={14} />
            <span>Engine: {engineName}</span>
          </div>
        )}

        {/* File picker / Drag & Drop Uploader */}
        {!selectedFile ? (
          <FileUploader
            accept={acceptAttr}
            onFileSelect={handleFileSelect}
            title={`Select ${fromMeta.label} Document`}
            subtitle={`Choose a ${fromMeta.ext} file to convert to ${toMeta.label}`}
            icon={fromMeta.iconType}
          />
        ) : (
          <div className="convert-screen__file-card" onClick={() => fileInputRef.current?.click()}>
            <FileTypeIcon type={fromMeta.iconType} size={36} />
            <div className="convert-screen__file-info">
              <p className="convert-screen__file-name">{selectedFile.name}</p>
              {uploading && <p className="convert-screen__file-meta">Uploading file...</p>}
              {!uploading && uploadedId && <p className="convert-screen__file-meta" style={{ color: 'var(--color-success)' }}>Ready to convert</p>}
            </div>
            <button
              className="btn-text-danger"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFile(null);
                setUploadedId(null);
                setConvertedResult(null);
              }}
              style={{ marginLeft: 'auto', fontSize: '13px' }}
            >
              Change
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
          id="convert-file-input"
          accept={acceptAttr}
        />

        {/* Live Progress Indicator */}
        {converting && (
          <div style={{
            margin: '16px 0',
            padding: '16px',
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--color-divider)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <Loader2 className="animate-spin" size={24} color="var(--color-primary)" />
            <div>
              <p style={{ fontWeight: '600', fontSize: '14px', margin: 0 }}>Converting document...</p>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>Engine: {engineName}</p>
            </div>
          </div>
        )}

        {/* Converted Document Success & Actions Container */}
        {convertedResult && (
          <div className="convert-screen__result-box" style={{
            marginTop: '20px',
            padding: '20px',
            background: 'color-mix(in srgb, var(--color-success) 8%, transparent)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid color-mix(in srgb, var(--color-success) 30%, transparent)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle size={24} color="var(--color-success)" />
              <div>
                <h4 style={{ margin: 0, fontWeight: '700', fontSize: '15px' }}>Conversion Complete!</h4>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  {convertedResult.filename}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                className="btn-secondary"
                onClick={() => setIsPreviewOpen(true)}
                style={{ flex: 1, minWidth: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Eye size={18} />
                <span>Preview Document</span>
              </button>
              
              <button
                className="btn-primary"
                onClick={handleDownload}
                style={{ flex: 1, minWidth: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Download size={18} />
                <span>Download File</span>
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Options based on Capabilities */}
        {currentTool && (
          <div className="convert-screen__options" style={{ marginTop: '16px' }}>
            <h3 className="convert-screen__options-title">Options</h3>
            
            {currentTool.capabilities?.includes('ocr') && (
              <div className="convert-screen__option-row">
                <span className="convert-screen__option-label">OCR (Text Recognition)</span>
                <Toggle checked={ocr} onChange={setOcr} id="convert-ocr" label="OCR" />
              </div>
            )}
            
            {(currentTool.capabilities?.includes('layout-preservation') || currentTool.capabilities?.includes('high-fidelity-layout')) && (
              <div className="convert-screen__option-row">
                <span className="convert-screen__option-label">Keep Formatting</span>
                <Toggle checked={keepFormatting} onChange={setKeepFormatting} id="convert-keep-formatting" label="Keep Formatting" />
              </div>
            )}
            
            {currentTool.capabilities?.includes('dpi-selection') && (
              <div className="convert-screen__option-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                <span className="convert-screen__option-label">Image Resolution (DPI)</span>
                <select 
                  value={dpi} 
                  onChange={(e) => setDpi(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--color-divider)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text-primary)'
                  }}
                  id="convert-dpi-select"
                >
                  <option value="75">75 DPI (Low Size)</option>
                  <option value="150">150 DPI (Balanced)</option>
                  <option value="300">300 DPI (High Quality)</option>
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="convert-screen__footer">
        <PrimaryButton
          onClick={handleConvert}
          loading={converting || uploading}
          disabled={converting || uploading}
          id="convert-submit-btn"
        >
          {selectedFile ? 'CONVERT' : 'SELECT FILE TO CONVERT'}
        </PrimaryButton>
      </div>

      <FilePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        fileUrl={convertedResult?.download_url}
        fileName={convertedResult?.filename}
        mimeType={to === 'pdf' ? 'application/pdf' : 'application/octet-stream'}
      />

      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
    </div>
  );
}
