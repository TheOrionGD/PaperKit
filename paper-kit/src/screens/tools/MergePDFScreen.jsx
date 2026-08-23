/* MergePDFScreen — PDF Merge Flow & Smart Workflow Chaining */
import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { GripVertical, X, Plus, FolderOpen, Eye } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { FileTypeIcon } from '../../components/icons/ToolIcons';
import { PrimaryButton } from '../../components/ui/Button';
import SegmentedControl from '../../components/ui/SegmentedControl';
import SelectField from '../../components/ui/SelectField';
import FilePreviewModal from '../../components/ui/FilePreviewModal';
import CommonResultScreen, { ACTION_PRESETS } from '../../components/common/CommonResultScreen';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/ui/Toast';
import { useProcessing } from '../../context/ProcessingContext';
import { downloadAndOpenFile } from '../../services/native';
import './MergePDFScreen.css';

const PAGE_SIZES = [
  { value: 'original', label: 'Original' },
  { value: 'a4', label: 'A4 (210 × 297 mm)' },
  { value: 'letter', label: 'Letter (215 × 279 mm)' },
  { value: 'legal', label: 'Legal (215 × 356 mm)' },
  { value: 'a3', label: 'A3 (297 × 420 mm)' },
];

const MARGINS = [
  { value: 'none', label: 'None' },
  { value: 'small', label: 'Small' },
  { value: 'normal', label: 'Normal' },
  { value: 'large', label: 'Large' },
];

export default function MergePDFScreen() {
  const location = useLocation();
  const [addMode, setAddMode] = useState('files');
  const [files, setFiles] = useState([]); // Array of { id, file, pageCount, download_url }
  const [pageSize, setPageSize] = useState('a4');
  const [margin, setMargin] = useState('normal');
  const [merging, setMerging] = useState(false);
  const [mergeError, setMergeError] = useState('');
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [mergeResult, setMergeResult] = useState(null);

  // Individual file preview state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewTarget, setPreviewTarget] = useState(null);

  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const { runProcessing } = useProcessing();
  const { toast, showToast, dismissToast } = useToast();

  useEffect(() => {
    // Handle workflow chaining from Split, Extract, Convert, or Scanner
    const incomingFiles = location.state?.chainedFiles || (location.state?.chainedFile ? [location.state.chainedFile] : null) || location.state?.files;
    if (incomingFiles && Array.isArray(incomingFiles) && incomingFiles.length > 0) {
      async function loadIncoming() {
        const processed = [];
        for (const item of incomingFiles) {
          const fileObj = item instanceof File ? item : item.file || item;
          if (fileObj) {
            let count = null;
            if (fileObj instanceof Blob) {
              count = await getPdfPageCount(fileObj);
            }
            processed.push({
              file: fileObj,
              id: `${fileObj.name || 'doc'}-${Date.now()}-${Math.random()}`,
              pageCount: count || item.pageCount || 1,
              download_url: item.download_url,
            });
          }
        }
        if (processed.length > 0) {
          setFiles(processed);
          showToast(`Loaded ${processed.length} document(s) into Merge module`, 'success');
        }
      }
      loadIncoming();
    }
  }, [location.state, showToast]);

  async function getPdfPageCount(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { updateMetadata: false });
      return pdfDoc.getPageCount();
    } catch (err) {
      console.error('Error reading PDF pages:', err);
      return null;
    }
  }

  async function handleAddFiles(e) {
    const newFiles = Array.from(e.target.files || []);
    const pdfFiles = newFiles.filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    if (pdfFiles.length !== newFiles.length) {
      showToast('Only PDF files are supported', 'warning');
    }
    
    const processed = [];
    for (const file of pdfFiles) {
      const pageCount = await getPdfPageCount(file);
      processed.push({
        file,
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        pageCount,
      });
    }
    setFiles(prev => [...prev, ...processed]);
    setMergeResult(null);
    if (e.target) e.target.value = '';
  }

  async function handleAddFolder(e) {
    const newFiles = Array.from(e.target.files || []);
    const pdfFiles = newFiles.filter(f => f.name.endsWith('.pdf'));
    if (pdfFiles.length === 0) {
      showToast('No PDF files found in folder', 'warning');
      return;
    }
    
    const processed = [];
    for (const file of pdfFiles) {
      const pageCount = await getPdfPageCount(file);
      processed.push({
        file,
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        pageCount,
      });
    }
    setFiles(prev => [...prev, ...processed]);
    setMergeResult(null);
    if (e.target) e.target.value = '';
  }

  function removeFile(id) {
    setFiles(prev => prev.filter(f => f.id !== id));
  }

  function formatSize(bytes) {
    if (!bytes) return '—';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function triggerAdd() {
    if (addMode === 'folder') {
      folderInputRef.current?.click();
    } else {
      fileInputRef.current?.click();
    }
  }

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const updatedFiles = [...files];
    const draggedItem = updatedFiles[draggedIndex];
    updatedFiles.splice(draggedIndex, 1);
    updatedFiles.splice(index, 0, draggedItem);
    setDraggedIndex(index);
    setFiles(updatedFiles);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  async function handleMerge() {
    if (files.length < 2) {
      showToast('Add at least 2 PDF files to merge', 'warning');
      triggerAdd();
      return;
    }
    setMerging(true);
    setMergeError('');
    try {
      const fileObjects = files.map(f => f.file);
      const result = await runProcessing('merge-pdf', { files: fileObjects }, { page_size: pageSize, margin });
      
      const totalCombinedPages = files.reduce((acc, f) => acc + (f.pageCount || 1), 0);
      const outputFilename = files[0]?.file?.name 
        ? `${files[0].file.name.replace(/\.pdf$/i, '')}_merged.pdf`
        : 'PaperKit_Merged.pdf';

      setMergeResult({
        download_url: result.download_url,
        name: outputFilename,
        size: result.size || 0,
        pageCount: totalCombinedPages,
        rawFile: null,
      });

      showToast('PDFs merged successfully!', 'success');
    } catch (err) {
      setMergeError(err.message || 'Merge failed');
      showToast(err.message || 'Merge failed', 'error');
    } finally {
      setMerging(false);
    }
  }

  // If merged, show CommonResultScreen with contextual action cards matching spec:
  // Options: Download PDF, Edit PDF, Compress PDF, Split PDF, Convert PDF, Password Protect, Merge Another PDF, Exit
  if (mergeResult) {
    return (
      <div className="merge-screen">
        <CommonResultScreen
          title="Merge Completed ✓"
          subtitle="Your combined PDF document is ready!"
          file={mergeResult}
          metrics={[
            { label: 'Combined Files', value: `${files.length} PDFs` },
            { label: 'Total Pages', value: `${mergeResult.pageCount} Pages` },
            { label: 'Page Format', value: pageSize.toUpperCase(), badge: 'Ready' },
          ]}
          nextActions={[
            ACTION_PRESETS.compress,
            ACTION_PRESETS.split,
            ACTION_PRESETS.convert,
            ACTION_PRESETS.protect,
          ]}
          primaryAction={{
            label: 'Download Merged PDF',
            onClick: () => {
              if (mergeResult?.download_url) {
                downloadAndOpenFile(mergeResult.download_url, mergeResult.name || 'merged.pdf', 'application/pdf');
              }
            }
          }}
          onReset={() => {
            setMergeResult(null);
            setFiles([]);
          }}
          sourceWorkflow="merge-pdf"
        />
        <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
      </div>
    );
  }

  return (
    <div className="merge-screen">
      <div className="merge-screen__body">
        <SegmentedControl
          options={[{ id: 'files', label: 'Add Files' }, { id: 'folder', label: 'Add Folder' }]}
          activeOption={addMode}
          onSelect={setAddMode}
          id="merge-mode"
        />

        {/* File list */}
        <div className="merge-screen__list">
          {files.length === 0 && (
            <div className="merge-screen__empty">
              <p>No files added yet</p>
            </div>
          )}
          {files.map(({ file, id, pageCount, download_url }, index) => (
            <div
              key={id}
              className={`merge-screen__file-row ${draggedIndex === index ? 'merge-screen__file-row--dragging' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
            >
              <div className="merge-screen__grip" title="Drag to reorder">
                <GripVertical size={18} color="var(--color-text-muted)" />
              </div>
              <FileTypeIcon type="pdf" size={36} />
              <div className="merge-screen__file-info">
                <p className="merge-screen__file-name">{file.name || 'Document.pdf'}</p>
                <p className="merge-screen__file-meta">
                  {file.size ? formatSize(file.size) : 'Ready'} • {pageCount !== null ? `${pageCount} pages` : 'Reading page count...'}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewTarget({
                      rawFile: file instanceof Blob ? file : null,
                      download_url: download_url || (file instanceof Blob ? URL.createObjectURL(file) : null),
                      name: file.name,
                      size: file.size,
                    });
                    setPreviewModalOpen(true);
                  }}
                  title="Preview PDF"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: 'var(--color-primary)' }}
                >
                  <Eye size={16} />
                </button>
                <button
                  className="merge-screen__remove"
                  onClick={() => removeFile(id)}
                  aria-label={`Remove ${file.name}`}
                >
                  <X size={16} color="var(--color-text-muted)" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add file button */}
        <button
          className="merge-screen__add-btn"
          onClick={triggerAdd}
          id="merge-add-files-btn"
        >
          {addMode === 'folder' ? <FolderOpen size={18} color="var(--color-primary)" /> : <Plus size={18} color="var(--color-primary)" />}
          <span>{addMode === 'folder' ? 'Add Folder' : 'Add PDF Files'}</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          style={{ display: 'none' }}
          onChange={handleAddFiles}
          id="merge-file-input"
        />

        <input
          ref={folderInputRef}
          type="file"
          webkitdirectory=""
          directory=""
          multiple
          style={{ display: 'none' }}
          onChange={handleAddFolder}
          id="merge-folder-input"
        />

        {/* Options */}
        <div className="merge-screen__options">
          <div className="merge-screen__options-row">
            <SelectField
              label="Page Size"
              value={pageSize}
              onChange={setPageSize}
              options={PAGE_SIZES}
              id="merge-page-size"
            />
            <SelectField
              label="Margin"
              value={margin}
              onChange={setMargin}
              options={MARGINS}
              id="merge-margin"
            />
          </div>
        </div>

        {mergeError && <p className="merge-screen__error">{mergeError}</p>}
      </div>

      <div className="merge-screen__footer">
        <PrimaryButton
          onClick={handleMerge}
          loading={merging}
          disabled={merging}
          id="merge-submit-btn"
        >
          {files.length >= 2 ? 'MERGE PDF' : files.length === 1 ? 'ADD MORE FILES TO MERGE' : 'ADD PDF FILES TO MERGE'}
        </PrimaryButton>
      </div>

      <FilePreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        fileUrl={previewTarget?.download_url}
        fileName={previewTarget?.name}
        fileSize={previewTarget?.size}
        rawFile={previewTarget?.rawFile}
      />

      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
    </div>
  );
}
