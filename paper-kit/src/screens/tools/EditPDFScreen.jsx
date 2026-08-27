/* EditPDFScreen — PDF → Word → docx-preview Render → Edit → PDF Export */
import { useState, useRef, useEffect, useCallback } from 'react';
import FeatureTipsSwipeStack from '../../components/ui/FeatureTipsSwipeStack';
import { useNavigate, useLocation } from 'react-router-dom';
import { Download, Loader2, Pencil, Check, Edit3, Type, Image, ShieldCheck, Save, FileText, AlertCircle } from 'lucide-react';
import { PrimaryButton, SecondaryButton } from '../../components/ui/Button';
import Toast from '../../components/ui/Toast';
import FileUploader from '../../components/common/FileUploader';
import CommonResultScreen, { ACTION_PRESETS } from '../../components/common/CommonResultScreen';
import { useUpload } from '../../hooks/useUpload';
import { useToast } from '../../hooks/useToast';
import { convertFile } from '../../services/tools';
import { uploadFile } from '../../services/files';
import { downloadAndOpenFile } from '../../services/native';
import { resolveBackendFileUrl } from '../../services/api';
import './EditPDFScreen.css';

const TOOL_TIPS = [
  {
    icon: <Edit3 size={20} />,
    title: 'True Fidelity',
    description: 'PDF renders as an exact Word document preview.'
  },
  {
    icon: <Type size={20} />,
    title: 'Rich Text',
    description: 'Edit text, headings, tables and lists directly.'
  },
  {
    icon: <Image size={20} />,
    title: 'Preserves Layout',
    description: 'Fonts, spacing and images are kept intact.'
  },
  {
    icon: <ShieldCheck size={20} />,
    title: '100% Private',
    description: 'Your documents are processed securely.'
  },
  {
    icon: <Save size={20} />,
    title: 'Export to PDF',
    description: 'One click to save your edits back as a PDF file.'
  },
];


export default function EditPDFScreen() {
  const _navigate = useNavigate();
  const location  = useLocation();

  // Steps: 'upload' → 'converting_to_word' → 'editor' → 'exporting_pdf' → 'success'
  const [step, setStep] = useState('upload');

  const [selectedFile, setSelectedFile]     = useState(null);
  const [wordResult,   setWordResult]       = useState(null); // { file_id, download_url, filename }
  const [finalPdfResult, setFinalPdfResult] = useState(null);
  const [renderError,  setRenderError]      = useState(null);

  const editorContainerRef = useRef(null);
  const fileInputRef       = useRef(null);

  // Auto-download countdown
  const [countdown, setCountdown]           = useState(3);
  const [autoDownloaded, setAutoDownloaded] = useState(false);

  const { upload }                          = useUpload();
  const { toast, showToast, dismissToast }  = useToast();

  // ── Render DOCX faithfully via docx-preview ──────────────────────────────
  const renderDocx = useCallback(async (docxBlob) => {
    if (!editorContainerRef.current) return;
    try {
      const { renderAsync } = await import('docx-preview');
      editorContainerRef.current.innerHTML = '';
      await renderAsync(docxBlob, editorContainerRef.current, null, {
        className:         'docx-preview-wrapper',
        inWrapper:         true,
        ignoreWidth:       false,
        ignoreHeight:      false,
        ignoreFonts:       false,
        breakPages:        true,
        useBase64URL:      true,
        renderHeaders:     true,
        renderFooters:     true,
        renderFootnotes:   true,
        renderEndnotes:    true,
        experimental:      false,
      });
      // Make the rendered document editable
      editorContainerRef.current.contentEditable = 'true';
      editorContainerRef.current.spellcheck      = true;
      showToast('Document ready for editing ✓', 'success');
    } catch (err) {
      console.error('docx-preview render error:', err);
      setRenderError('Could not render the Word document: ' + err.message);
    }
  }, [showToast]);

  // ── Main workflow: upload PDF → convert → fetch DOCX → render ─────────────
  const processAndOpenEditor = useCallback(async (file) => {
    if (!file) return;
    setSelectedFile(file);
    setRenderError(null);
    setStep('converting_to_word');
    try {
      showToast('Uploading PDF...', 'info');
      const doc   = await upload(file);
      const pdfId = doc._id || doc.id;

      showToast('Converting PDF to Word...', 'info');
      const result = await convertFile(pdfId, 'pdf', 'word');

      // Resolve absolute download URL
      const rawUrl  = result.download_url || result.file_url || '';
      const absUrl  = resolveBackendFileUrl(rawUrl);
      setWordResult({
        file_id:      result.file_id,
        download_url: absUrl,
        filename:     result.filename || file.name.replace(/\.pdf$/i, '.docx'),
      });

      showToast('Fetching Word document...', 'info');
      const response = await fetch(absUrl);
      if (!response.ok) throw new Error(`Failed to fetch Word file (${response.status})`);
      const blob = await response.blob();

      setStep('editor');
      // Give DOM a tick so editorContainerRef mounts
      setTimeout(() => renderDocx(blob), 60);
    } catch (err) {
      showToast('Could not open document for editing: ' + err.message, 'error');
      setStep('upload');
    }
  }, [showToast, upload, renderDocx]);

  // Load chained file from smart workflow chaining
  useEffect(() => {
    const incoming = location.state?.chainedFile || location.state?.file;
    if (incoming) {
      const fileObj = incoming instanceof File ? incoming : incoming.file || incoming;
      processAndOpenEditor(fileObj);
    }
  }, [location.state, processAndOpenEditor]);

  function handleFileSelect(fileOrEvent) {
    const file = fileOrEvent?.target?.files?.[0] || fileOrEvent;
    if (!file) return;
    processAndOpenEditor(file);
  }

  // ── Save: collect edited HTML → upload → convert to PDF ───────────────────
  async function handleSaveChanges() {
    if (!editorContainerRef.current) return;
    const editedHtml = editorContainerRef.current.innerHTML.trim();
    if (!editedHtml) {
      showToast('Document is empty — nothing to save', 'warning');
      return;
    }

    setStep('exporting_pdf');
    try {
      showToast('Saving your edits...', 'info');
      const stem     = selectedFile ? selectedFile.name.replace(/\.[^/.]+$/, '') : 'document';
      const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${stem}</title></head><body>${editedHtml}</body></html>`;

      // Upload edited HTML → backend converts to PDF (existing html→pdf route)
      const htmlBlob = new Blob([fullHtml], { type: 'text/html' });
      const htmlFile = new File([htmlBlob], `${stem}_edited.html`, { type: 'text/html' });

      showToast('Uploading edited content...', 'info');
      const uploaded   = await uploadFile(htmlFile);
      const uploadedId = uploaded._id || uploaded.id;

      showToast('Exporting to PDF...', 'info');
      const pdfRes     = await convertFile(uploadedId, 'html', 'pdf');

      const outFilename = pdfRes.filename || `${stem}_edited.pdf`;
      const pdfAbsUrl   = resolveBackendFileUrl(pdfRes.download_url || '');
      const resultObj   = {
        file_id:      pdfRes.file_id,
        download_url: pdfAbsUrl,
        filename:     outFilename,
        name:         outFilename,
        size:         pdfRes.size || selectedFile?.size || 0,
        mimeType:     'application/pdf',
      };

      setFinalPdfResult(resultObj);
      setStep('success');
      setCountdown(3);
      setAutoDownloaded(false);
      showToast('Changes saved ✓ PDF ready!', 'success');
    } catch (err) {
      showToast('Export failed: ' + err.message, 'error');
      setStep('editor');
    }
  }

  // ── Auto-download countdown ────────────────────────────────────────────────
  const triggerPdfDownload = useCallback(() => {
    if (finalPdfResult?.download_url && !autoDownloaded) {
      setAutoDownloaded(true);
      downloadAndOpenFile(
        finalPdfResult.download_url,
        finalPdfResult.filename || 'edited_document.pdf',
        'application/pdf'
      );
      showToast('Download started ✓', 'success');
    }
  }, [autoDownloaded, finalPdfResult, showToast]);

  useEffect(() => {
    if (step !== 'success' || !finalPdfResult || autoDownloaded) return;
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); triggerPdfDownload(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [step, finalPdfResult, autoDownloaded, triggerPdfDownload]);

  // ── Success Screen ─────────────────────────────────────────────────────────
  if (step === 'success' && finalPdfResult) {
    return (
      <div className="edit-pdf-screen">
        <div className="edit-pdf-success__banner">
          <div className="edit-pdf-success__timer-ring">
            <div className="edit-pdf-success__timer-num">{countdown}</div>
          </div>
          <div className="edit-pdf-success__banner-text">
            <h3>{countdown > 0 ? `Downloading PDF in ${countdown}s...` : 'PDF Download Triggered!'}</h3>
            <p>Your edited document has been exported as a high-quality PDF.</p>
          </div>
          <PrimaryButton onClick={triggerPdfDownload} style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}>
            <Download size={18} style={{ marginRight: '6px' }} />
            Download PDF Now
          </PrimaryButton>
        </div>

        <CommonResultScreen
          title="PDF Editing Complete ✓"
          subtitle="Your edited PDF is ready for view and download"
          file={finalPdfResult}
          nextActions={[
            {
              id: 're-edit', label: 'Re-Edit Document',
              desc: 'Go back to the editor to make more changes',
              icon: Pencil, onClick: () => setStep('editor'),
            },
            ACTION_PRESETS.compress,
            ACTION_PRESETS.protect,
            ACTION_PRESETS.watermark,
            ACTION_PRESETS.aiSummary,
          ]}
          primaryAction={{ label: 'Download Edited PDF', onClick: triggerPdfDownload }}
          onReset={() => {
            setStep('upload');
            setSelectedFile(null);
            setWordResult(null);
            setFinalPdfResult(null);
            setCountdown(3);
            setAutoDownloaded(false);
            setRenderError(null);
          }}
          sourceWorkflow="pdf-live-editor"
        />
        <FeatureTipsSwipeStack tips={TOOL_TIPS} />
        <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
      </div>
    );
  }

  return (
    <div className="edit-pdf-screen">

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="edit-pdf-step-container">
          <div className="edit-pdf-step-header">
            <h2>Edit PDF Document</h2>
            <p>Select a PDF to convert it to Word and display it for editing at exact resolution.</p>
          </div>
          <FileUploader
            accept=".pdf,application/pdf"
            onFileSelect={handleFileSelect}
            title="Select PDF Document to Edit"
            subtitle="Your PDF will be converted to Word and rendered for in-place editing"
            icon="pdf"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
        </div>
      )}

      {/* Loading: Converting PDF → Word */}
      {step === 'converting_to_word' && (
        <div className="edit-pdf-loading-card">
          <Loader2 className="animate-spin" size={48} color="var(--color-primary)" />
          <h3>Converting PDF to Word</h3>
          <p>Extracting document structure, fonts, tables and images...</p>
          <div className="loading-bar-track">
            <div className="loading-bar-fill animate-pulse" style={{ width: '70%' }} />
          </div>
          {selectedFile && (
            <span className="edit-pdf-loading-filename">
              <FileText size={14} style={{ marginRight: 4 }} />
              {selectedFile.name}
            </span>
          )}
        </div>
      )}

      {/* Editor: docx-preview rendered & editable */}
      {step === 'editor' && (
        <div className="edit-pdf-editor-workspace">
          <div className="edit-pdf-editor-header">
            <div>
              <h2>Document Editor</h2>
              <p>
                Rendered from <strong>{wordResult?.filename || 'document.docx'}</strong>
                {' '}— click any text to start editing.
              </p>
            </div>
            <div className="edit-pdf-editor-actions">
              <SecondaryButton onClick={() => setStep('upload')}>Cancel</SecondaryButton>
              <PrimaryButton onClick={handleSaveChanges}>
                <Check size={18} style={{ marginRight: '6px' }} />
                SAVE &amp; EXPORT PDF
              </PrimaryButton>
            </div>
          </div>

          {renderError && (
            <div className="edit-pdf-render-error">
              <AlertCircle size={18} />
              <span>{renderError}</span>
            </div>
          )}

          {/* docx-preview canvas */}
          <div className="edit-pdf-docx-canvas">
            <div
              ref={editorContainerRef}
              className="edit-pdf-docx-body"
              suppressContentEditableWarning
            />
          </div>

          <div className="edit-pdf-editor-hint">
            <span>💡 Click anywhere in the document to edit text, tables, or headings.</span>
            <span>When finished, click <strong>SAVE &amp; EXPORT PDF</strong>.</span>
          </div>
        </div>
      )}

      {/* Loading: Exporting PDF */}
      {step === 'exporting_pdf' && (
        <div className="edit-pdf-loading-card">
          <Loader2 className="animate-spin" size={48} color="var(--color-primary)" />
          <h3>Exporting to PDF</h3>
          <p>Compiling your edits into a high-quality PDF document...</p>
          <div className="loading-bar-track">
            <div className="loading-bar-fill animate-pulse" style={{ width: '85%' }} />
          </div>
        </div>
      )}

      <FeatureTipsSwipeStack tips={TOOL_TIPS} />
      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
    </div>
  );
}
