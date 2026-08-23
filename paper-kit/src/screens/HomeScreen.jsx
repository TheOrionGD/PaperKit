import { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Sparkles, Eye } from 'lucide-react';
import ToolCategory from '../components/ui/ToolCategory';
import FileCard from '../components/ui/FileCard';
import EmptyState from '../components/ui/EmptyState';
import LoadingState from '../components/ui/LoadingState';
import ErrorState from '../components/ui/ErrorState';
import BottomSheet from '../components/ui/BottomSheet';
import FilePreviewModal from '../components/ui/FilePreviewModal';
import { useRecentFiles } from '../hooks/useFiles';
import { useAuth } from '../hooks/useAuth';
import { SearchContext } from '../components/layout/AppShell';
import { QUICK_TOOLS, PDF_TOOLS, AI_TOOLS, SECURITY_TOOLS, CONVERT_TOOLS } from '../config/tools-config';
import { getProcessingHistory } from '../services/tools';
import { getStorageUsage } from '../services/jobs';
import { getFileDownloadUrl } from '../services/files';
import { formatFileTimestamp } from '../utils/dateUtils';
import './HomeScreen.css';

export default function HomeScreen() {
  const navigate = useNavigate();
  const fileDropInputRef = useRef(null);
  const { user } = useAuth();
  const { query } = useContext(SearchContext);
  const { files: recentFiles, loading, error, refetch, remove } = useRecentFiles(5);
  const [selectedFile, setSelectedFile] = useState(null);
  const [droppedFile, setDroppedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [storageData, setStorageData] = useState(null);

  // File Preview State
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewTarget, setPreviewTarget] = useState(null);

  useEffect(() => {
    async function loadHomeStats() {
      try {
        const [historyData, storageStats] = await Promise.all([
          getProcessingHistory(),
          getStorageUsage(),
        ]);
        setHistory(historyData || []);
        setStorageData(storageStats);
      } catch (err) {
        console.error('Failed to load home stats:', err);
      } finally {
        setHistoryLoading(false);
      }
    }
    loadHomeStats();
  }, [recentFiles]);

  function handleFileDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0] || e.target?.files?.[0];
    if (file) {
      setDroppedFile(file);
    }
  }

  async function handlePreview(file) {
    if (!file) return;
    setMoreSheetOpen(false);
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
      console.error('Preview error:', err);
    }
  }

  function handlePreviewDropped() {
    if (!droppedFile) return;
    setPreviewTarget({
      rawFile: droppedFile,
      name: droppedFile.name,
      size: droppedFile.size,
      mimeType: droppedFile.type,
    });
    setPreviewModalOpen(true);
  }

  function openMore(file, _e) {
    setSelectedFile(file);
    setMoreSheetOpen(true);
  }

  async function handleDelete() {
    if (!selectedFile) return;
    await remove(selectedFile._id || selectedFile.id);
    setMoreSheetOpen(false);
    setSelectedFile(null);
  }

  const filteredQuickTools = QUICK_TOOLS.filter(t =>
    t.label.toLowerCase().includes(query.toLowerCase())
  );
  const filteredAITools = AI_TOOLS.filter(t =>
    t.label.toLowerCase().includes(query.toLowerCase())
  );
  const filteredPDFTools = PDF_TOOLS.filter(t =>
    t.label.toLowerCase().includes(query.toLowerCase())
  );
  const filteredSecurityTools = SECURITY_TOOLS.filter(t =>
    t.label.toLowerCase().includes(query.toLowerCase())
  );
  const filteredConvertTools = CONVERT_TOOLS.filter(t =>
    t.label.toLowerCase().includes(query.toLowerCase())
  );
  const filteredRecentFiles = recentFiles.filter(f =>
    (f.original_filename || f.filename || '').toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="home-screen">
      <header className="home-screen__header">
        <h1 className="home-screen__greeting">
          {user?.name && user.name !== 'Guest User' ? `Welcome, ${user.name}` : 'PaperKit Intelligent PDF Platform'}
        </h1>
        <p className="home-screen__subtitle">Process, summarize, compare, and protect your documents with zero friction.</p>
      </header>

      {/* ⭐ Smart Document Dropzone & Fast Recommendation Engine */}
      <div
        className="home-screen__dropzone"
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleFileDrop}
        style={{
          background: isDragging ? 'var(--color-primary-soft)' : 'var(--color-surface)',
          border: isDragging ? '2px dashed var(--color-primary)' : '1px dashed var(--color-divider)',
        }}
      >
        <input
          ref={fileDropInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*"
          style={{ display: 'none' }}
          onChange={handleFileDrop}
          id="home-dropzone-input"
        />

        {!droppedFile ? (
          <div
            onClick={() => fileDropInputRef.current?.click()}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', minWidth: 0 }}
          >
            <div style={{ width: 44, height: 44, minWidth: 44, borderRadius: 12, background: 'var(--color-primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Sparkles size={22} color="var(--color-primary)" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                Drop any document here for instant AI &amp; PDF actions
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                Auto-detects document and recommends smart operations
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                <FileText size={18} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                <span className="truncate" style={{ fontSize: '13px', fontWeight: 700 }}>{droppedFile.name}</span>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', flexShrink: 0 }}>({(droppedFile.size / 1024).toFixed(1)} KB)</span>
              </div>
              <button
                type="button"
                onClick={() => setDroppedFile(null)}
                style={{ background: 'none', border: 'none', fontSize: '12px', color: '#EF4444', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
              >
                Clear
              </button>
            </div>

            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
              Recommended 1-Click Operations:
            </div>

            <div className="home-screen__dropzone-grid">
              <button
                type="button"
                onClick={handlePreviewDropped}
                className="home-screen__dropzone-btn"
                style={{ background: 'rgba(37, 99, 235, 0.1)', border: '1px solid rgba(37, 99, 235, 0.25)', color: '#2563EB' }}
              >
                <Eye size={13} style={{ flexShrink: 0 }} /> <span className="truncate">Quick Preview</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/ai/summarize', { state: { file: droppedFile } })}
                className="home-screen__dropzone-btn"
                style={{ background: 'rgba(124, 58, 237, 0.08)', border: '1px solid rgba(124, 58, 237, 0.2)', color: '#7C3AED' }}
              >
                <span className="truncate">✨ AI Summary</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/tools/compress', { state: { file: droppedFile } })}
                className="home-screen__dropzone-btn"
                style={{ background: 'rgba(234, 88, 12, 0.08)', border: '1px solid rgba(234, 88, 12, 0.2)', color: '#EA580C' }}
              >
                <span className="truncate">🗜️ Compress</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/ai/ocr', { state: { file: droppedFile } })}
                className="home-screen__dropzone-btn"
                style={{ background: 'rgba(37, 99, 235, 0.08)', border: '1px solid rgba(37, 99, 235, 0.2)', color: '#2563EB' }}
              >
                <span className="truncate">🔍 OCR Text</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/security/protect', { state: { file: droppedFile } })}
                className="home-screen__dropzone-btn"
                style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#EF4444' }}
              >
                <span className="truncate">🔒 Password Lock</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Storage Summary widget */}
      {storageData && (
        <div className="home-screen__storage-summary" onClick={() => navigate('/storage')} style={{ cursor: 'pointer', background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-3) var(--space-4)', border: '1px solid var(--color-divider)', marginBottom: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Storage Usage: <strong>{storageData.totalMB} MB</strong> used</span>
            <span style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>{storageData.fileCount} Files</span>
          </div>
          <div style={{ height: '6px', background: 'var(--color-divider)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'var(--color-primary)', width: `${Math.min(100, (storageData.totalBytes / (500 * 1024 * 1024)) * 100)}%` }} />
          </div>
        </div>
      )}

      {/* ⭐ Quick Launch Grid */}
      {filteredQuickTools.length > 0 && (
        <section className="home-screen__section" aria-label="Quick Launch">
          <ToolCategory
            title="Featured Tools"
            tools={filteredQuickTools}
            showViewAll
            onViewAll={() => navigate('/tools')}
          />
        </section>
      )}

      {/* ⭐ AI Document Intelligence */}
      {filteredAITools.length > 0 && (
        <section className="home-screen__section" aria-label="AI Document Intelligence">
          <ToolCategory
            title="AI Document Intelligence"
            tools={filteredAITools}
            showViewAll
            onViewAll={() => navigate('/ai')}
          />
        </section>
      )}

      {/* ⭐ PDF Processing & Page Manager */}
      {filteredPDFTools.length > 0 && (
        <section className="home-screen__section" aria-label="PDF Processing & Pages">
          <ToolCategory
            title="PDF Processing & Pages"
            tools={filteredPDFTools}
            showViewAll
            onViewAll={() => navigate('/tools')}
          />
        </section>
      )}

      {/* ⭐ PDF Security & Privacy */}
      {filteredSecurityTools.length > 0 && (
        <section className="home-screen__section" aria-label="Security and Privacy">
          <ToolCategory
            title="Security & Privacy"
            tools={filteredSecurityTools}
            showViewAll
            onViewAll={() => navigate('/tools')}
          />
        </section>
      )}

      {/* ⭐ Conversions */}
      {filteredConvertTools.length > 0 && (
        <section className="home-screen__section" aria-label="Convert Documents">
          <ToolCategory
            title="Conversions"
            tools={filteredConvertTools}
            showViewAll
            onViewAll={() => navigate('/tools')}
          />
        </section>
      )}

      {/* Recent Files */}
      <section className="home-screen__section home-screen__recent" aria-label="Recent Files">
        <div className="tool-category__header">
          <h2 className="tool-category__title">Recent Files</h2>
          {filteredRecentFiles.length > 0 && (
            <button
              className="tool-category__view-all"
              onClick={() => navigate('/files')}
              id="view-all-recent"
            >
              View All
            </button>
          )}
        </div>

        {loading && <LoadingState text="Loading recent files..." />}
        {!loading && error && <ErrorState title="Failed to load files" message={error} onRetry={refetch} />}
        {!loading && !error && filteredRecentFiles.length === 0 && (
          <EmptyState
            icon={FileText}
            title={query ? "No matching files" : "No recent files"}
            description={query ? `No files match "${query}"` : "Files you work with will appear here"}
          />
        )}
        {!loading && !error && filteredRecentFiles.length > 0 && (
          <div className="home-screen__file-list">
            {filteredRecentFiles.map(file => (
              <FileCard
                key={file._id || file.id}
                file={file}
                onMore={openMore}
                onClick={() => handlePreview(file)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Recent Activity (Processing History) */}
      <section className="home-screen__section" aria-label="Recent Activity" style={{ marginTop: 'var(--space-6)' }}>
        <div className="tool-category__header">
          <h2 className="tool-category__title">Recent Activity</h2>
          {history.length > 0 && (
            <button
              className="tool-category__view-all"
              onClick={() => navigate('/history')}
              id="view-all-history"
            >
              View Full History
            </button>
          )}
        </div>

        {historyLoading && <LoadingState text="Loading recent activity..." />}
        {!historyLoading && history.length === 0 && (
          <div className="merge-screen__empty" style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)' }}>
            <p>No recent activity records</p>
          </div>
        )}
        {!historyLoading && history.length > 0 && (
          <div className="home-screen__file-list" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {history.slice(0, 5).map(item => (
              <div 
                key={item.id} 
                style={{ 
                  background: 'var(--color-surface)', 
                  borderRadius: 'var(--radius-lg)', 
                  padding: 'var(--space-3) var(--space-4)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  border: '1px solid var(--color-divider)'
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: 'var(--font-size-base)', margin: 0 }}>
                    {item.action}
                  </p>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', margin: 0 }}>
                    {formatFileTimestamp(item.created_at)}
                  </p>
                </div>
                {item.output_file && item.output_file.storage_url && (
                  <button
                    onClick={() => {
                      const url = item.output_file.storage_url.startsWith('http')
                        ? item.output_file.storage_url
                        : `${import.meta.env.VITE_API_URL || 'https://paperkit-backend.onrender.com'}${item.output_file.storage_url}`;
                      setPreviewTarget({
                        url: url,
                        name: item.output_file.filename || item.action || 'Output Document',
                        size: item.output_file.size,
                        fileId: item.output_file.id,
                      });
                      setPreviewModalOpen(true);
                    }}
                    style={{
                      background: 'var(--color-primary-soft)',
                      border: 'none',
                      color: 'var(--color-primary)',
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Preview
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* File actions bottom sheet */}
      <BottomSheet open={moreSheetOpen} onClose={() => setMoreSheetOpen(false)} title={selectedFile?.original_filename}>
        <div className="home-screen__sheet-actions">
          <button className="home-screen__sheet-action" onClick={() => handlePreview(selectedFile)} style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--color-primary)', fontWeight: 600 }}>
            <Eye size={16} /> Quick Preview
          </button>
          <button className="home-screen__sheet-action" onClick={() => { setMoreSheetOpen(false); navigate('/files'); }}>
            Open in Files
          </button>
          <button className="home-screen__sheet-action" onClick={() => { setMoreSheetOpen(false); }}>
            Share
          </button>
          <button className="home-screen__sheet-action home-screen__sheet-action--danger" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </BottomSheet>

      <FilePreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        fileUrl={previewTarget?.url}
        fileName={previewTarget?.name}
        fileSize={previewTarget?.size}
        mimeType={previewTarget?.mimeType}
        fileId={previewTarget?.fileId}
        rawFile={previewTarget?.rawFile}
      />
    </div>
  );
}
