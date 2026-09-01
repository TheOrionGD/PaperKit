/* ConvertScreen — Full Bi-Directional Document Converter & Smart Workflow Chaining */
import { useState, useRef, useEffect } from 'react';
import FeatureTipsSwipeStack from '../../components/ui/FeatureTipsSwipeStack';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Cpu, Loader2, Layers, FileCode, RefreshCw, Layout, Zap, ShieldCheck, Smartphone } from 'lucide-react';
import { FileTypeIcon } from '../../components/icons/ToolIcons';
import Toggle from '../../components/ui/Toggle';
import SelectField from '../../components/ui/SelectField';
import { PrimaryButton } from '../../components/ui/Button';
import Toast from '../../components/ui/Toast';
import LoadingState from '../../components/ui/LoadingState';
import FileUploader from '../../components/common/FileUploader';
import FilePreviewModal from '../../components/ui/FilePreviewModal';
import CommonResultScreen, { ACTION_PRESETS } from '../../components/common/CommonResultScreen';
import { useUpload } from '../../hooks/useUpload';
import { useToast } from '../../hooks/useToast';
import { convertFile, getToolsRegistry } from '../../services/tools';
import { downloadAndOpenFile } from '../../services/native';
import './ConvertScreen.css';

const TOOL_TIPS = [
  {
    icon: <RefreshCw size={20} />,
    title: 'Format Mastery',
    description: 'Convert Word, Excel, and images to PDF.'
  },
  {
    icon: <Layout size={20} />,
    title: 'Perfect Layouts',
    description: 'Maintains original formatting perfectly.'
  },
  {
    icon: <Zap size={20} />,
    title: 'Instant Conversion',
    description: 'No waiting in cloud queues.'
  },
  {
    icon: <ShieldCheck size={20} />,
    title: 'Privacy First',
    description: 'Documents are processed securely.'
  },
  {
    icon: <Smartphone size={20} />,
    title: 'Mobile Ready',
    description: 'Works seamlessly on phones and tablets.'
  },
];


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
  const _navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const from = params.get('from') || 'pdf';
  const to = params.get('to') || 'word';
  const fromMeta = FORMAT_META[from] || FORMAT_META.pdf;
  const toMeta = FORMAT_META[to] || FORMAT_META.word;

  const [registry, setRegistry] = useState([]);
  const [loadingRegistry, setLoadingRegistry] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadedId, setUploadedId] = useState(null);
  const [convertedResult, setConvertedResult] = useState(null); // { download_url, filename, name, size }
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  // Options state
  const [ocr, setOcr] = useState(false);
  const [keepFormatting, setKeepFormatting] = useState(true);
  const [dpi, setDpi] = useState('150');
  const [pageSize, setPageSize] = useState('a4');
  const [orientation, setOrientation] = useState('portrait');
  const [imageFormat, setImageFormat] = useState('jpg');

  const [converting, setConverting] = useState(false);
  const fileInputRef = useRef(null);
  const { upload, uploading } = useUpload();
  const { toast, showToast, dismissToast } = useToast();

  useEffect(() => {
    // Load incoming file from Smart Workflow Chaining
    const incoming = location.state?.chainedFile || location.state?.file;
    if (incoming) {
      const fileObj = incoming instanceof File ? incoming : incoming.file || incoming;
      setSelectedFile(fileObj);
      setConvertedResult(null);
      upload(fileObj).then(doc => {
        setUploadedId(doc._id || doc.id);
        showToast(`Loaded ${fileObj.name || 'document'} for conversion`, 'info');
      }).catch(err => {
        console.error('Auto upload error:', err);
      });
    }
  }, [location.state, showToast, upload]);

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

  const currentTool = registry.find(t => 
    t.route.includes(`from=${from}`) && t.route.includes(`to=${to}`)
  );

  const acceptedExts = currentTool?.supportedFormats || [fromMeta.ext];
  const acceptAttr = acceptedExts.join(',');
  const activeEngineKey = currentTool?.defaultEngine || 'python';
  const engineInfo = currentTool?.engines?.[activeEngineKey] || {};
  const engineName = engineInfo.name || 'PaperKit High-Fidelity Engine';

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

      const options = {
        page_size: pageSize,
        orientation,
        image_format: imageFormat,
      };
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
      const outExt = to === 'image' ? `.${imageFormat}` : toMeta.ext;
      const stem = selectedFile.name ? selectedFile.name.rsplit?.('.', 1)?.[0] || selectedFile.name.split('.')[0] : 'document';
      const resFilename = result.filename || `${stem}_converted${outExt}`;

      setConvertedResult({
        download_url: result.download_url,
        name: resFilename,
        filename: resFilename,
        size: result.size || selectedFile.size || 0,
        mimeType: to === 'pdf' ? 'application/pdf' : to === 'word' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/octet-stream',
        rawFile: null,
      });

      showToast('Conversion Completed ✓', 'success');
    } catch (err) {
      showToast('Conversion failed: ' + err.message, 'error');
    } finally {
      setConverting(false);
    }
  }

  // Derive dynamic next actions tailored specifically to the conversion pair:
  function getDynamicNextActions() {
    // Feature 6: PDF -> Word (spec: Download Word, Edit Document, Convert Back to PDF, AI Summary, OCR, Exit)
    if (from === 'pdf' && to === 'word') {
      return [
        {
          id: 'convert-back',
          label: 'Convert Back to PDF',
          desc: 'Turn Word file back to PDF',
          icon: FileCode,
          route: '/tools/convert?from=word&to=pdf',
        },
        ACTION_PRESETS.aiSummary,
        ACTION_PRESETS.ocr,
      ];
    }

    // Feature 7: Word -> PDF (spec: Download PDF, Compress, Password Protect, Add Watermark, Split PDF, Edit PDF, Exit)
    if (from === 'word' && to === 'pdf') {
      return [
        ACTION_PRESETS.compress,
        ACTION_PRESETS.protect,
        ACTION_PRESETS.watermark,
        ACTION_PRESETS.split,
      ];
    }

    // Feature 8: JPG / PNG -> PDF (spec: Download, Merge with Another PDF, Compress, OCR, AI Summary, Password Protect, Exit)
    if (from === 'image' && to === 'pdf') {
      return [
        ACTION_PRESETS.merge,
        ACTION_PRESETS.compress,
        ACTION_PRESETS.ocr,
        ACTION_PRESETS.aiSummary,
        ACTION_PRESETS.protect,
      ];
    }

    // Feature 9: PDF -> JPG / PNG (spec: Download All, Create PDF, OCR, Convert Again, Exit)
    if (from === 'pdf' && to === 'image') {
      return [
        {
          id: 'create-pdf',
          label: 'Create PDF from Images',
          desc: 'Re-assemble images into PDF',
          icon: Layers,
          route: '/tools/convert?from=image&to=pdf',
        },
        ACTION_PRESETS.ocr,
        ACTION_PRESETS.compress,
      ];
    }

    // Default actions
    return [
      ACTION_PRESETS.compress,
      ACTION_PRESETS.protect,
      ACTION_PRESETS.aiSummary,
    ];
  }

  if (convertedResult) {
    return (
      <div className="convert-screen">
        <CommonResultScreen
          title="Conversion Completed ✓"
          subtitle={`Successfully converted ${fromMeta.label} to ${toMeta.label}`}
          file={convertedResult}
          metrics={[
            { label: 'Source Format', value: fromMeta.label },
            { label: 'Target Format', value: toMeta.label, badge: 'Converted' },
            { label: 'Engine', value: 'High-Fidelity' },
          ]}
          nextActions={getDynamicNextActions()}
          primaryAction={{
            label: `Download ${toMeta.label} File`,
            onClick: () => {
              if (convertedResult?.download_url) {
                downloadAndOpenFile(
                  convertedResult.download_url,
                  convertedResult.filename || convertedResult.name || `converted_file.${toMeta.ext}`,
                  convertedResult.mimeType
                );
              }
            }
          }}
          onReset={() => {
            setConvertedResult(null);
            setSelectedFile(null);
            setUploadedId(null);
          }}
          sourceWorkflow={`convert-${from}-to-${to}`}
        />
        <FeatureTipsSwipeStack tips={TOOL_TIPS} />
      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
      </div>
    );
  }

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
          Convert {fromMeta.label} to editable {toMeta.label} format
        </p>

        {/* Engine Banner */}
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

        {/* File picker / Drag & Drop Uploader */}
        {!selectedFile ? (
          <FileUploader
            accept={acceptAttr}
            onFileSelect={handleFileSelect}
            title={`Select ${fromMeta.label} File`}
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
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>Extracting structure & formatting</p>
            </div>
          </div>
        )}

        {/* Dynamic Options based on Conversion Type */}
        <div className="convert-screen__options" style={{ marginTop: '16px' }}>
          <h3 className="convert-screen__options-title">Conversion Settings</h3>
          
          {from === 'image' && to === 'pdf' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <SelectField
                label="Page Size"
                value={pageSize}
                onChange={setPageSize}
                options={[
                  { value: 'a4', label: 'A4 (210 × 297 mm)' },
                  { value: 'letter', label: 'Letter (8.5 × 11 in)' },
                  { value: 'original', label: 'Fit to Image' }
                ]}
              />
              <SelectField
                label="Orientation"
                value={orientation}
                onChange={setOrientation}
                options={[
                  { value: 'portrait', label: 'Portrait' },
                  { value: 'landscape', label: 'Landscape' },
                  { value: 'auto', label: 'Auto Detect' }
                ]}
              />
            </div>
          )}

          {from === 'pdf' && to === 'image' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <SelectField
                label="Image Format"
                value={imageFormat}
                onChange={setImageFormat}
                options={[
                  { value: 'jpg', label: 'JPG (Compressed)' },
                  { value: 'png', label: 'PNG (Lossless High-Res)' },
                ]}
              />
              <SelectField
                label="Resolution"
                value={dpi}
                onChange={setDpi}
                options={[
                  { value: '75', label: '75 DPI (Compact)' },
                  { value: '150', label: '150 DPI (Balanced)' },
                  { value: '300', label: '300 DPI (High-Res)' },
                ]}
              />
            </div>
          )}

          {currentTool?.capabilities?.includes('ocr') && (
            <div className="convert-screen__option-row">
              <span className="convert-screen__option-label">Enable OCR (Text Recognition)</span>
              <Toggle checked={ocr} onChange={setOcr} id="convert-ocr" label="OCR" />
            </div>
          )}
          
          {(currentTool?.capabilities?.includes('layout-preservation') || currentTool?.capabilities?.includes('high-fidelity-layout')) && (
            <div className="convert-screen__option-row">
              <span className="convert-screen__option-label">Preserve Exact Document Layout</span>
              <Toggle checked={keepFormatting} onChange={setKeepFormatting} id="convert-keep-formatting" label="Keep Formatting" />
            </div>
          )}
        </div>
      </div>

      <div className="convert-screen__footer">
        <PrimaryButton
          onClick={handleConvert}
          loading={converting || uploading}
          disabled={converting || uploading}
          id="convert-submit-btn"
        >
          {selectedFile ? `CONVERT TO ${toMeta.label.toUpperCase()}` : 'SELECT FILE TO CONVERT'}
        </PrimaryButton>
      </div>

      <FilePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        fileUrl={convertedResult?.download_url}
        fileName={convertedResult?.filename}
      />

      <FeatureTipsSwipeStack tips={TOOL_TIPS} />
      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
    </div>
  );
}
