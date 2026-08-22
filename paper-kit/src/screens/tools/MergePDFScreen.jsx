/* MergePDFScreen — matches the reference: Add Files/Add Folder tabs, file list, reorderable drag/drop, options, MERGE PDF */
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GripVertical, X, Plus, FolderOpen } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { FileTypeIcon } from '../../components/icons/ToolIcons';
import { PrimaryButton } from '../../components/ui/Button';
import SegmentedControl from '../../components/ui/SegmentedControl';
import SelectField from '../../components/ui/SelectField';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/ui/Toast';
import { useProcessing } from '../../context/ProcessingContext';
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
  const navigate = useNavigate();
  const [addMode, setAddMode] = useState('files');
  const [files, setFiles] = useState([]); // Array of { id, file, pageCount }
  const [pageSize, setPageSize] = useState('a4');
  const [margin, setMargin] = useState('normal');
  const [merging, setMerging] = useState(false);
  const [mergeError, setMergeError] = useState('');
  const [draggedIndex, setDraggedIndex] = useState(null);

  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const { runProcessing } = useProcessing();
  const { toast, showToast, dismissToast } = useToast();

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
    // Reset input
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
    // Reset input
    if (e.target) e.target.value = '';
  }

  function removeFile(id) {
    setFiles(prev => prev.filter(f => f.id !== id));
  }

  function formatSize(bytes) {
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

  // HTML5 Drag and Drop handlers for reordering
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Make the drag experience nice on some browsers
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
      
      if (result.download_url) {
        const url = result.download_url.startsWith('http') || result.download_url.startsWith('blob:')
          ? result.download_url
          : `${import.meta.env.VITE_API_URL || 'https://paperkit-backend.onrender.com'}${result.download_url}`;
        window.open(url, '_blank');
      }
      navigate('/files', { replace: true });
    } catch (err) {
      setMergeError(err.message || 'Merge failed');
    } finally {
      setMerging(false);
    }
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
          {files.map(({ file, id, pageCount }, index) => (
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
                <p className="merge-screen__file-name">{file.name}</p>
                <p className="merge-screen__file-meta">
                  {formatSize(file.size)} • {pageCount !== null ? `${pageCount} pages` : 'Reading page count...'}
                </p>
              </div>
              <button
                className="merge-screen__remove"
                onClick={() => removeFile(id)}
                aria-label={`Remove ${file.name}`}
              >
                <X size={16} color="var(--color-text-muted)" />
              </button>
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

      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
    </div>
  );
}
