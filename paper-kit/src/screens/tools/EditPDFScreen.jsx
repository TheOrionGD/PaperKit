/* EditPDFScreen — Concurrent White A4 Sheet Live Editor with Responsive Design & 3s Auto-Download */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  FileText, Download, RefreshCw, Loader2, Plus, Trash2,
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Table, Minus, RotateCcw, Pencil, Check
} from 'lucide-react';
import { PrimaryButton, SecondaryButton } from '../../components/ui/Button';
import Toast from '../../components/ui/Toast';
import FileUploader from '../../components/common/FileUploader';
import CommonResultScreen, { ACTION_PRESETS } from '../../components/common/CommonResultScreen';
import { useUpload } from '../../hooks/useUpload';
import { useToast } from '../../hooks/useToast';
import { convertFile, convertHtmlToWord } from '../../services/tools';
import { downloadAndOpenFile } from '../../services/native';
import './EditPDFScreen.css';

export default function EditPDFScreen() {
  const navigate = useNavigate();
  const location = useLocation();

  // Workflow steps: 'upload' -> 'converting_to_word' -> 'editor' -> 'converting_to_pdf' -> 'success'
  const [step, setStep] = useState('upload');
  
  // File & conversion state
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadedPdfId, setUploadedPdfId] = useState(null);
  const [editedWordFileId, setEditedWordFileId] = useState(null);
  const [finalPdfResult, setFinalPdfResult] = useState(null);

  // Multi-Page A4 Sheets State
  const [pages, setPages] = useState(['']);
  const pageRefs = useRef([]);
  const [activeHeading, setActiveHeading] = useState('p');
  const [docStats, setDocStats] = useState({ words: 0, chars: 0, paragraphs: 0, readTime: '1 min' });

  // Auto download countdown timer (3 seconds)
  const [countdown, setCountdown] = useState(3);
  const [autoDownloaded, setAutoDownloaded] = useState(false);

  const fileInputRef = useRef(null);
  const { upload, uploading } = useUpload();
  const { toast, showToast, dismissToast } = useToast();

  // Load chained file if passed from smart workflow chaining
  useEffect(() => {
    const incoming = location.state?.chainedFile || location.state?.file;
    if (incoming) {
      const fileObj = incoming instanceof File ? incoming : incoming.file || incoming;
      setSelectedFile(fileObj);
      processAndOpenEditor(fileObj);
    }
  }, [location.state]);

  function sanitizeHtmlForEditor(rawHtml) {
    if (!rawHtml) return '';
    return rawHtml
      .replace(/<!DOCTYPE[^>]*>/gi, '')
      .replace(/<\/?html[^>]*>/gi, '')
      .replace(/<head[\s\S]*?<\/head>/gi, '')
      .replace(/<\/?body[^>]*>/gi, '')
      .trim();
  }

  function splitIntoPages(rawHtml) {
    if (!rawHtml) return [''];
    const parts = rawHtml
      .split(/<!--\s*PAGE_SPLIT\s*-->/g)
      .map(p => sanitizeHtmlForEditor(p))
      .filter(p => p.trim());
    return parts.length > 0 ? parts : [rawHtml];
  }

  // Update document stats across all active A4 page sheets
  const updateStats = useCallback(() => {
    let combinedHtml = '';
    pageRefs.current.forEach(el => {
      if (el) combinedHtml += ' ' + el.innerHTML;
    });

    const text = combinedHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const words = text ? text.split(/\s+/).length : 0;
    const chars = text.length;
    const paragraphs = (combinedHtml.match(/<p/gi) || []).length || (text ? 1 : 0);
    const readTime = Math.max(1, Math.ceil(words / 200)) + ' min read';
    setDocStats({ words, chars, paragraphs, readTime });
  }, []);

  // Populate page sheet DOM innerHTML cleanly without React props resetting cursor selection
  useEffect(() => {
    if (step === 'editor') {
      pages.forEach((pageHtml, index) => {
        const el = pageRefs.current[index];
        if (el && !el.dataset.initialized) {
          el.innerHTML = sanitizeHtmlForEditor(pageHtml);
          el.dataset.initialized = 'true';
        }
      });
      updateStats();
    }
  }, [pages, step, updateStats]);

  // Process PDF into editable Word format & open editor
  async function processAndOpenEditor(file) {
    if (!file) return;
    setSelectedFile(file);
    setStep('converting_to_word');
    try {
      showToast('Preparing document for live editing...', 'info');
      const doc = await upload(file);
      const pdfId = doc._id || doc.id;
      setUploadedPdfId(pdfId);

      // Perform conversion
      const result = await convertFile(pdfId, 'pdf', 'word');

      // Extract HTML/Text content for Web Editor
      let rawHtml = result.html_content ? sanitizeHtmlForEditor(result.html_content) : '';
      if (!rawHtml && result.text_content) {
        rawHtml = result.text_content
          .split('\n')
          .filter(line => line.trim())
          .map(line => `<p>${line.trim()}</p>`)
          .join('');
      }

      if (!rawHtml) {
        const stem = file.name.replace(/\.[^/.]+$/, '');
        rawHtml = `<h1>${stem}</h1><p>Welcome to the Live Editor! Edit text, headings, tables, or add new A4 pages directly.</p><p>When finished, click <strong>SAVE & EXPORT PDF</strong> to generate your updated document.</p>`;
      }

      const pageList = splitIntoPages(rawHtml);
      setPages(pageList);
      setTimeout(updateStats, 100);
      showToast('Document ready for editing ✓', 'success');
      setStep('editor');
    } catch (err) {
      showToast('Could not open document for editing: ' + err.message, 'error');
      setStep('upload');
    }
  }

  // Handle PDF file selection
  function handleFileSelect(fileOrEvent) {
    const file = fileOrEvent?.target?.files?.[0] || fileOrEvent;
    if (!file) return;
    processAndOpenEditor(file);
  }

  // Formatting commands for Web Editor Toolbar
  function execCmd(command, value = null) {
    document.execCommand(command, false, value);
    updateStats();
  }

  function handleHeadingChange(e) {
    const heading = e.target.value;
    setActiveHeading(heading);
    execCmd('formatBlock', `<${heading}>`);
  }

  function handleInsertTable() {
    const tableHtml = `
      <table style="width:100%; border-collapse:collapse; margin:16px 0; border:1px solid #cbd5e1;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="border:1px solid #cbd5e1; padding:8px; text-align:left;">Header 1</th>
            <th style="border:1px solid #cbd5e1; padding:8px; text-align:left;">Header 2</th>
            <th style="border:1px solid #cbd5e1; padding:8px; text-align:left;">Header 3</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border:1px solid #cbd5e1; padding:8px;">Data 1</td>
            <td style="border:1px solid #cbd5e1; padding:8px;">Data 2</td>
            <td style="border:1px solid #cbd5e1; padding:8px;">Data 3</td>
          </tr>
        </tbody>
      </table>
    `;
    execCmd('insertHTML', tableHtml);
  }

  // Add new blank A4 sheet
  function handleAddPage() {
    const newPageHtml = '<p>Start typing on this new A4 page...</p>';
    setPages(prev => [...prev, newPageHtml]);
    showToast('New A4 page added', 'info');
    setTimeout(updateStats, 100);
  }

  // Remove specific A4 page sheet
  function handleRemovePage(index) {
    if (pages.length <= 1) {
      showToast('Document must contain at least one A4 page', 'warning');
      return;
    }
    setPages(prev => prev.filter((_, idx) => idx !== index));
    showToast(`Removed Page ${index + 1}`, 'info');
    setTimeout(updateStats, 100);
  }

  // Save changes: Collect HTML from all A4 sheets -> Word -> PDF & trigger auto download
  async function handleSaveChanges() {
    const combinedPagesHtml = pageRefs.current
      .filter(Boolean)
      .map(el => el.innerHTML.trim())
      .filter(Boolean);

    if (combinedPagesHtml.length === 0) {
      showToast('Document content cannot be empty', 'warning');
      return;
    }

    const fullDocHtml = combinedPagesHtml.join('<div style="page-break-after: always;"></div>');

    setStep('converting_to_pdf');
    try {
      showToast('Compiling updated PDF...', 'info');
      const stem = selectedFile ? selectedFile.name.replace(/\.[^/.]+$/, '') : 'document';
      const editedWordFilename = `${stem}_edited.docx`;

      // Convert Web Editor HTML content back to Word DOCX
      const wordRes = await convertHtmlToWord(fullDocHtml, editedWordFilename);
      const newWordId = wordRes.file_id;
      setEditedWordFileId(newWordId);

      // Convert Word to PDF
      const pdfRes = await convertFile(newWordId, 'word', 'pdf');
      
      const outFilename = pdfRes.filename || `${stem}_edited.pdf`;
      const resultObj = {
        file_id: pdfRes.file_id,
        download_url: pdfRes.download_url,
        filename: outFilename,
        name: outFilename,
        size: pdfRes.size || selectedFile?.size || 0,
        mimeType: 'application/pdf',
      };

      setFinalPdfResult(resultObj);
      setStep('success');
      setCountdown(3);
      setAutoDownloaded(false);
      showToast('Changes saved ✓ Generating PDF...', 'success');
    } catch (err) {
      showToast('Save failed: ' + err.message, 'error');
      setStep('editor');
    }
  }

  // Auto Download Timer (3 seconds countdown)
  useEffect(() => {
    if (step !== 'success' || !finalPdfResult || autoDownloaded) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          triggerPdfDownload();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [step, finalPdfResult, autoDownloaded]);

  function triggerPdfDownload() {
    if (finalPdfResult?.download_url && !autoDownloaded) {
      setAutoDownloaded(true);
      downloadAndOpenFile(
        finalPdfResult.download_url,
        finalPdfResult.filename || finalPdfResult.name || 'edited_document.pdf',
        'application/pdf'
      );
      showToast('Download started ✓', 'success');
    }
  }

  // Render Success Screen with 3s Auto Download
  if (step === 'success' && finalPdfResult) {
    return (
      <div className="edit-pdf-screen">
        <div className="edit-pdf-success__banner">
          <div className="edit-pdf-success__timer-ring">
            <div className="edit-pdf-success__timer-num">{countdown}</div>
          </div>
          <div className="edit-pdf-success__banner-text">
            <h3>{countdown > 0 ? `Downloading PDF in ${countdown}s...` : 'PDF Download Triggered!'}</h3>
            <p>Your changes have been compiled into a high-fidelity PDF document.</p>
          </div>
          <PrimaryButton
            onClick={triggerPdfDownload}
            style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}
          >
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
              id: 're-edit',
              label: 'Re-Edit Document',
              desc: 'Make further edits in the Web Editor',
              icon: Pencil,
              onClick: () => setStep('editor'),
            },
            ACTION_PRESETS.compress,
            ACTION_PRESETS.protect,
            ACTION_PRESETS.watermark,
            ACTION_PRESETS.aiSummary,
          ]}
          primaryAction={{
            label: 'Download Edited PDF',
            onClick: triggerPdfDownload,
          }}
          onReset={() => {
            setStep('upload');
            setSelectedFile(null);
            setUploadedPdfId(null);
            setEditedWordFileId(null);
            setFinalPdfResult(null);
            setPages(['']);
            setCountdown(3);
            setAutoDownloaded(false);
          }}
          sourceWorkflow="pdf-live-editor"
        />
        <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
      </div>
    );
  }

  return (
    <div className="edit-pdf-screen">
      {/* Step 1: Upload PDF */}
      {step === 'upload' && (
        <div className="edit-pdf-step-container">
          <div className="edit-pdf-step-header">
            <h2>Edit PDF Document</h2>
            <p>Select or drop a PDF file to edit its text and formatting directly in your browser.</p>
          </div>

          <FileUploader
            accept=".pdf,application/pdf"
            onFileSelect={handleFileSelect}
            title="Select PDF Document to Edit"
            subtitle="Choose a PDF file to open in the live editor"
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

      {/* Loading State: Opening Web Editor */}
      {step === 'converting_to_word' && (
        <div className="edit-pdf-loading-card">
          <Loader2 className="animate-spin" size={48} color="var(--color-primary)" />
          <h3>Opening Web Editor</h3>
          <p>Converting PDF content into live A4 editable page sheets...</p>
          <div className="loading-bar-track">
            <div className="loading-bar-fill animate-pulse" style={{ width: '65%' }}></div>
          </div>
        </div>
      )}

      {/* Concurrent White A4 Page Sheets Editor Workspace */}
      {step === 'editor' && (
        <div className="edit-pdf-editor-workspace">
          <div className="edit-pdf-editor-header">
            <div>
              <h2>Live Web Editor ({pages.length} {pages.length === 1 ? 'Page' : 'Pages'})</h2>
              <p>Edit your document text below, then click <strong>SAVE & EXPORT PDF</strong>.</p>
            </div>

            <div className="edit-pdf-editor-actions">
              <SecondaryButton onClick={() => setStep('upload')}>
                Cancel
              </SecondaryButton>
              <PrimaryButton onClick={handleSaveChanges}>
                <Check size={18} style={{ marginRight: '6px' }} />
                SAVE & EXPORT PDF
              </PrimaryButton>
            </div>
          </div>

          {/* Web Editor Formatting Toolbar */}
          <div className="editor-toolbar">
            {/* Formatting Group */}
            <div className="toolbar-group">
              <button className="toolbar-btn" onClick={() => execCmd('bold')} title="Bold (Ctrl+B)">
                <Bold size={16} />
              </button>
              <button className="toolbar-btn" onClick={() => execCmd('italic')} title="Italic (Ctrl+I)">
                <Italic size={16} />
              </button>
              <button className="toolbar-btn" onClick={() => execCmd('underline')} title="Underline (Ctrl+U)">
                <Underline size={16} />
              </button>
              <button className="toolbar-btn" onClick={() => execCmd('strikeThrough')} title="Strikethrough">
                <Strikethrough size={16} />
              </button>
            </div>

            <div className="toolbar-divider" />

            {/* Headings Selector */}
            <div className="toolbar-group">
              <select className="toolbar-select" value={activeHeading} onChange={handleHeadingChange}>
                <option value="p">Paragraph Text</option>
                <option value="h1">Heading 1</option>
                <option value="h2">Heading 2</option>
                <option value="h3">Heading 3</option>
              </select>
            </div>

            <div className="toolbar-divider" />

            {/* Alignment Group */}
            <div className="toolbar-group">
              <button className="toolbar-btn" onClick={() => execCmd('justifyLeft')} title="Align Left">
                <AlignLeft size={16} />
              </button>
              <button className="toolbar-btn" onClick={() => execCmd('justifyCenter')} title="Align Center">
                <AlignCenter size={16} />
              </button>
              <button className="toolbar-btn" onClick={() => execCmd('justifyRight')} title="Align Right">
                <AlignRight size={16} />
              </button>
              <button className="toolbar-btn" onClick={() => execCmd('justifyFull')} title="Justify">
                <AlignJustify size={16} />
              </button>
            </div>

            <div className="toolbar-divider" />

            {/* Lists & Table */}
            <div className="toolbar-group">
              <button className="toolbar-btn" onClick={() => execCmd('insertUnorderedList')} title="Bullet List">
                <List size={16} />
              </button>
              <button className="toolbar-btn" onClick={() => execCmd('insertOrderedList')} title="Numbered List">
                <ListOrdered size={16} />
              </button>
              <button className="toolbar-btn" onClick={handleInsertTable} title="Insert Table">
                <Table size={16} />
              </button>
              <button className="toolbar-btn" onClick={() => execCmd('insertHorizontalRule')} title="Horizontal Line">
                <Minus size={16} />
              </button>
            </div>

            <div className="toolbar-divider" />

            {/* History & Page Actions */}
            <div className="toolbar-group toolbar-group--history">
              <button className="toolbar-btn" onClick={() => execCmd('undo')} title="Undo (Ctrl+Z)">
                <RotateCcw size={16} />
              </button>
            </div>
          </div>

          {/* Web Editor Canvas: Concurrent White A4 Sheet Stack */}
          <div className="editor-canvas-container">
            {pages.map((pageHtml, index) => (
              <div key={index} className="editor-page-card">
                <div className="editor-page-card-header">
                  <span className="page-card-badge">Page {index + 1} of {pages.length}</span>
                  <span className="page-card-meta">A4 Sheet • 210 × 297 mm</span>
                  {pages.length > 1 && (
                    <button
                      type="button"
                      className="page-card-delete-btn"
                      onClick={() => handleRemovePage(index)}
                      title="Delete this A4 sheet"
                    >
                      <Trash2 size={14} /> Remove Page
                    </button>
                  )}
                </div>

                <div
                  ref={(el) => (pageRefs.current[index] = el)}
                  className="editor-paper-sheet"
                  contentEditable
                  suppressContentEditableWarning
                  onInput={updateStats}
                />
              </div>
            ))}

            <div className="editor-add-page-bar">
              <button type="button" className="editor-add-page-btn" onClick={handleAddPage}>
                <Plus size={16} style={{ marginRight: '6px' }} />
                Add New A4 Sheet
              </button>
            </div>
          </div>

          {/* Editor Stats Footer Bar */}
          <div className="editor-stats-bar">
            <span><strong>{docStats.words}</strong> words</span>
            <span><strong>{docStats.chars}</strong> characters</span>
            <span><strong>{docStats.paragraphs}</strong> paragraphs</span>
            <span>Est. reading time: <strong>{docStats.readTime}</strong></span>
          </div>
        </div>
      )}

      {/* Loading State: Compiling PDF */}
      {step === 'converting_to_pdf' && (
        <div className="edit-pdf-loading-card">
          <Loader2 className="animate-spin" size={48} color="var(--color-primary)" />
          <h3>Saving Changes & Compiling PDF</h3>
          <p>Generating high-fidelity PDF from your A4 page sheets...</p>
          <div className="loading-bar-track">
            <div className="loading-bar-fill animate-pulse" style={{ width: '85%' }}></div>
          </div>
        </div>
      )}

      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
    </div>
  );
}
