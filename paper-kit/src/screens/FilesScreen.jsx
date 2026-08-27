import { useState, useMemo, useContext, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { SlidersHorizontal, FileText, Upload, ChevronLeft, ChevronRight, Share2, Download, Trash2, Edit2, Eye } from 'lucide-react';
import SearchBar from '../components/ui/SearchBar';
import FilterTabs from '../components/ui/FilterTabs';
import FileCard from '../components/ui/FileCard';
import EmptyState from '../components/ui/EmptyState';
import LoadingState from '../components/ui/LoadingState';
import ErrorState from '../components/ui/ErrorState';
import BottomSheet from '../components/ui/BottomSheet';
import Toast from '../components/ui/Toast';
import FilePreviewModal from '../components/ui/FilePreviewModal';
import { useFiles, useRecentFiles } from '../hooks/useFiles';
import { useUpload } from '../hooks/useUpload';
import { useToast } from '../hooks/useToast';
import { SearchContext } from '../components/layout/AppShell';
import { renameFile, getFileDownloadUrl } from '../services/files';
import { FileTypeIcon } from '../components/icons/ToolIcons';
import { shareFile, downloadAndOpenFile } from '../services/native';
import { formatFileTimestamp } from '../utils/dateUtils';
import './FilesScreen.css';

const FILTER_TABS = [
  { id: 'all',    label: 'All' },
  { id: 'pdf',    label: 'PDF' },
  { id: 'word',   label: 'Word' },
  { id: 'image',  label: 'Image' },
  { id: 'others', label: 'Others' },
];

function getFileType(filename) {
  if (!filename) return 'default';
  const ext = filename.split('.').pop()?.toLowerCase();
  const map = {
    pdf: 'pdf',
    doc: 'word', docx: 'word', odt: 'word', rtf: 'word',
    xls: 'excel', xlsx: 'excel', ods: 'excel', csv: 'csv',
    ppt: 'ppt', pptx: 'ppt', odp: 'ppt',
    txt: 'txt', md: 'txt', log: 'txt',
    html: 'code', htm: 'code', css: 'code', js: 'code', jsx: 'code',
    ts: 'code', tsx: 'code', py: 'code', java: 'code', json: 'code',
    xml: 'code', yaml: 'code', yml: 'code', sh: 'code', sql: 'code',
    jpg: 'image', jpeg: 'image', png: 'image', gif: 'image',
    webp: 'image', svg: 'image', heic: 'image', heif: 'image',
    bmp: 'image', tiff: 'image', tif: 'image', ico: 'image',
    mp4: 'video', mov: 'video', avi: 'video', mkv: 'video',
    webm: 'video', wmv: 'video', flv: 'video', m4v: 'video',
    mp3: 'audio', wav: 'audio', ogg: 'audio', aac: 'audio',
    flac: 'audio', m4a: 'audio', wma: 'audio',
    zip: 'zip', rar: 'zip', tar: 'zip', gz: 'zip', '7z': 'zip', bz2: 'zip',
  };
  return map[ext] || 'default';
}


export default function FilesScreen() {
  const { query: search, setQuery: setSearch } = useContext(SearchContext);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedFile, setSelectedFile] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  
  // File Preview Modal state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewTarget, setPreviewTarget] = useState(null); // { url, name, size, mimeType, fileId }
  
  // Sorting panel & Pagination states
  const [showSortPanel, setShowSortPanel] = useState(false);
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const limit = 10;

  const fileInputRef = useRef(null);
  const { toast, showToast, dismissToast } = useToast();
  const { upload, uploading, progress: uploadProgress } = useUpload();
  
  // Fetch recent files for the top slider
  const { files: recentFiles, refetch: refetchRecents } = useRecentFiles(5);

  const params = useMemo(() => ({
    limit,
    skip: (page - 1) * limit,
    sort: sortField,
    order: sortOrder,
    search: search.trim() || undefined,
    category: activeTab,
  }), [page, sortField, sortOrder, search, activeTab]);

  const { files, total, loading, error, refetch, remove, rename } = useFiles(params);

  // Reset page when category or search changes
  useEffect(() => {
    setPage(1);
  }, [activeTab, search]);

  function openMore(file) {
    setSelectedFile(file);
    setIsEditingName(false);
    setNewName('');
    setSheetOpen(true);
  }

  async function handleDelete() {
    if (!selectedFile) return;
    try {
      await remove(selectedFile._id || selectedFile.id);
      setSheetOpen(false);
      setSelectedFile(null);
      showToast('File deleted successfully', 'success');
      refetchRecents();
    } catch (err) {
      showToast('Failed to delete: ' + err.message, 'error');
    }
  }

  async function handleUpload(e) {
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await FilePicker.pickFiles({ multiple: false });
        if (result.files.length > 0) {
          const pickedFile = result.files[0];
          let fileToUpload;
          if (pickedFile.path) {
            const url = Capacitor.convertFileSrc(pickedFile.path);
            const response = await fetch(url);
            const blob = await response.blob();
            fileToUpload = new File([blob], pickedFile.name, { type: pickedFile.mimeType || 'application/octet-stream' });
          } else if (pickedFile.blob) {
            fileToUpload = new File([pickedFile.blob], pickedFile.name, { type: pickedFile.mimeType || 'application/octet-stream' });
          }
          if (fileToUpload) {
            await upload(fileToUpload);
            showToast('Upload successful!', 'success');
            refetch();
            refetchRecents();
          }
        }
      } catch (err) {
        if (err.message !== 'User cancelled') {
          showToast('Picker error: ' + err.message, 'error');
        }
      }
    } else {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        await upload(file);
        showToast('Upload successful!', 'success');
        refetch();
        refetchRecents();
      } catch (err) {
        showToast('Upload failed: ' + err.message, 'error');
      }
    }
  }

  async function handlePreview(file) {
    if (!file) return;
    setSheetOpen(false);
    try {
      const fid = file._id || file.id;
      const downloadUrl = await getFileDownloadUrl(fid);
      setPreviewTarget({
        url: downloadUrl,
        name: file.original_filename || file.filename || 'Document',
        size: file.size,
        mimeType: file.content_type || file.mime_type,
        fileId: fid,
      });
      setPreviewModalOpen(true);
    } catch (err) {
      showToast('Failed to load file preview: ' + err.message, 'error');
    }
  }

  async function handleOpen(file) {
    setSheetOpen(false);
    if (!file) return;
    try {
      const downloadUrl = await getFileDownloadUrl(file._id);
      const fullUrl = downloadUrl.startsWith('http') ? downloadUrl : `${import.meta.env.VITE_API_URL || 'https://paperkit-backend.onrender.com'}${downloadUrl}`;
      if (window.Capacitor?.isNativePlatform?.()) {
        await downloadAndOpenFile(fullUrl, file.original_filename, file.mime_type || 'application/octet-stream');
      } else {
        window.open(fullUrl, '_blank');
      }
    } catch (err) {
      showToast('Failed to open file: ' + err.message, 'error');
    }
  }

  async function handleDownload(file) {
    setSheetOpen(false);
    if (!file) return;
    try {
      const downloadUrl = await getFileDownloadUrl(file._id);
      const fullUrl = downloadUrl.startsWith('http') ? downloadUrl : `${import.meta.env.VITE_API_URL || 'https://paperkit-backend.onrender.com'}${downloadUrl}`;
      await downloadAndOpenFile(fullUrl, file.original_filename, file.mime_type || 'application/octet-stream');
      showToast('Download started', 'success');
    } catch (err) {
      showToast('Failed to get download URL: ' + err.message, 'error');
    }
  }

  async function handleShare(file) {
    setSheetOpen(false);
    if (!file) return;
    try {
      const downloadUrl = await getFileDownloadUrl(file._id);
      const fullUrl = downloadUrl.startsWith('http') ? downloadUrl : `${import.meta.env.VITE_API_URL || 'https://paperkit-backend.onrender.com'}${downloadUrl}`;
      await shareFile(fullUrl, file.original_filename, file.mime_type || 'application/octet-stream');
    } catch (err) {
      showToast('Sharing failed: ' + err.message, 'error');
    }
  }

  async function submitRename() {
    if (!selectedFile || !newName.trim()) return;
    try {
      const result = await renameFile(selectedFile._id, newName.trim());
      rename(selectedFile._id, result.filename);
      setSheetOpen(false);
      showToast('File renamed to ' + result.filename, 'success');
      refetchRecents();
    } catch (err) {
      showToast('Rename failed: ' + err.message, 'error');
    }
  }

  const totalPages = Math.ceil(total / limit) || 1;
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div className="files-screen">
      {/* Toolbar */}
      <div className="files-screen__toolbar">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search files..."
          id="files-search"
        />
        <button
          className={`files-screen__filter-btn ${showSortPanel ? 'files-screen__filter-btn--active' : ''}`}
          onClick={() => setShowSortPanel(!showSortPanel)}
          aria-label="Sort options"
          id="files-sort-toggle"
        >
          <SlidersHorizontal size={18} />
        </button>
        <button
          className="files-screen__upload-btn"
          onClick={(e) => {
            if (Capacitor.isNativePlatform()) {
              e.preventDefault();
              handleUpload();
            } else {
              fileInputRef.current?.click();
            }
          }}
          id="files-upload-btn"
          disabled={uploading}
        >
          <Upload size={16} style={{ flexShrink: 0 }} />
          <span className="hide-on-compact">Upload</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={handleUpload}
          id="files-hidden-input"
        />
      </div>

      {/* Collapsible sorting panel */}
      {showSortPanel && (
        <div className="files-screen__sort-panel">
          <div className="files-screen__sort-group">
            <label htmlFor="files-sort-by">Sort By</label>
            <select
              id="files-sort-by"
              value={sortField}
              onChange={e => setSortField(e.target.value)}
            >
              <option value="created_at">Date Created</option>
              <option value="original_filename">Name</option>
              <option value="size">Size</option>
            </select>
          </div>
          <div className="files-screen__sort-group">
            <label htmlFor="files-sort-order">Order</label>
            <select
              id="files-sort-order"
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value)}
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>
      )}

      {/* Uploading progress bar */}
      {uploading && (
        <div className="files-screen__upload-progress">
          <div className="files-screen__upload-progress-info">
            <span>Uploading file...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="files-screen__progress-bar-bg">
            <div className="files-screen__progress-bar" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="files-screen__tabs">
        <FilterTabs
          tabs={FILTER_TABS}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          id="files-filter"
        />
      </div>

      {/* Files List */}
      <div className="files-screen__list">
        {/* Recent files slider (Only show on page 1 of "All" tab when no search query is active) */}
        {!search && activeTab === 'all' && page === 1 && recentFiles.length > 0 && (
          <div className="files-screen__recent-section">
            <h3 className="files-screen__section-title">Recent Files</h3>
            <div className="files-screen__recent-scroll">
              {recentFiles.map(rf => (
                <div
                  key={rf._id || rf.id}
                  className="files-screen__recent-card"
                  onClick={() => handlePreview(rf)}
                  id={`recent-file-${rf._id || rf.id}`}
                >
                  {rf.thumbnail_url ? (
                    <img
                      src={rf.thumbnail_url}
                      alt={rf.original_filename}
                      style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }}
                    />
                  ) : (
                    <FileTypeIcon type={getFileType(rf.original_filename)} size={32} />
                  )}
                  <span className="files-screen__recent-name">{rf.original_filename}</span>
                  <span className="files-screen__recent-time">{formatFileTimestamp(rf.created_at || rf.updated_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && <LoadingState text="Loading files..." />}
        {!loading && error && <ErrorState title="Failed to load files" message={error} onRetry={refetch} />}
        
        {!loading && !error && files.length === 0 && (
          <EmptyState
            icon={FileText}
            title={search ? 'No results found' : 'No files yet'}
            description={search ? `Nothing matched "${search}"` : 'Upload a file to get started'}
          />
        )}
        
        {!loading && !error && files.map(file => (
          <FileCard
            key={file._id || file.id}
            file={file}
            onMore={openMore}
            onClick={() => handlePreview(file)}
          />
        ))}
      </div>

      {/* Pagination */}
      {!loading && !error && total > 0 && (
        <div className="files-screen__pagination">
          <div className="files-screen__pagination-info">
            Showing {startItem}-{endItem} of {total}
          </div>
          <div className="files-screen__pagination-actions">
            <button
              className="files-screen__pagination-btn"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Previous page"
              id="files-prev-page"
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ display: 'flex', alignItems: 'center', fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>
              Page {page} of {totalPages}
            </span>
            <button
              className="files-screen__pagination-btn"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label="Next page"
              id="files-next-page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* File Action Sheet */}
      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={selectedFile?.original_filename}
      >
        {isEditingName ? (
          <div className="files-screen__rename-form">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Enter new filename"
              className="files-screen__rename-input"
              id="files-rename-input"
              autoFocus
            />
            <div className="files-screen__rename-buttons">
              <button className="btn-secondary" onClick={() => setIsEditingName(false)}>Cancel</button>
              <button className="btn-primary" onClick={submitRename} id="files-rename-save">Save</button>
            </div>
          </div>
        ) : (
          <div className="files-screen__sheet-actions">
            <button className="home-screen__sheet-action" onClick={() => handlePreview(selectedFile)} style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--color-primary)', fontWeight: 600 }}>
              <Eye size={16} /> Quick Preview
            </button>
            <button className="home-screen__sheet-action" onClick={() => handleOpen(selectedFile)} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <FileText size={16} /> Open / Edit
            </button>
            <button className="home-screen__sheet-action" onClick={() => handleDownload(selectedFile)} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Download size={16} /> Download
            </button>
            <button className="home-screen__sheet-action" onClick={() => handleShare(selectedFile)} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Share2 size={16} /> Share
            </button>
            <button
              className="home-screen__sheet-action"
              onClick={() => {
                setIsEditingName(true);
                const stem = selectedFile?.original_filename.substring(0, selectedFile.original_filename.lastIndexOf('.')) || selectedFile?.original_filename || '';
                setNewName(stem);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 12 }}
            >
              <Edit2 size={16} /> Rename
            </button>
            <button className="home-screen__sheet-action home-screen__sheet-action--danger" onClick={handleDelete} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Trash2 size={16} /> Delete
            </button>
          </div>
        )}
      </BottomSheet>

      <FilePreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        fileUrl={previewTarget?.url}
        fileName={previewTarget?.name}
        fileSize={previewTarget?.size}
        mimeType={previewTarget?.mimeType}
        fileId={previewTarget?.fileId}
      />

      <Toast key={toast?.key} message={toast?.message} type={toast?.type} onDismiss={dismissToast} />
    </div>
  );
}
