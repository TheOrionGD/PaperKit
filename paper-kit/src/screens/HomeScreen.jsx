import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import ToolCategory from '../components/ui/ToolCategory';
import FileCard from '../components/ui/FileCard';
import EmptyState from '../components/ui/EmptyState';
import LoadingState from '../components/ui/LoadingState';
import ErrorState from '../components/ui/ErrorState';
import BottomSheet from '../components/ui/BottomSheet';
import { useRecentFiles } from '../hooks/useFiles';
import { useAuth } from '../hooks/useAuth';
import { SearchContext } from '../components/layout/AppShell';
import { QUICK_TOOLS, CONVERT_TOOLS, EDIT_TOOLS } from '../config/tools-config';
import { getProcessingHistory } from '../services/tools';
import { getStorageUsage } from '../services/jobs';
import { formatFileTimestamp } from '../utils/dateUtils';
import './HomeScreen.css';

export default function HomeScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { query } = useContext(SearchContext);
  const { files: recentFiles, loading, error, refetch, remove } = useRecentFiles(5);
  const [selectedFile, setSelectedFile] = useState(null);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [storageData, setStorageData] = useState(null);

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
  const filteredConvertTools = CONVERT_TOOLS.filter(t =>
    t.label.toLowerCase().includes(query.toLowerCase())
  );
  const filteredEditTools = EDIT_TOOLS.filter(t =>
    t.label.toLowerCase().includes(query.toLowerCase())
  );
  const filteredRecentFiles = recentFiles.filter(f =>
    (f.original_filename || f.filename || '').toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="home-screen">
      <header className="home-screen__header">
        <h1 className="home-screen__greeting">Welcome, {user?.name || 'User'}</h1>
        <p className="home-screen__subtitle">What would you like to do today?</p>
      </header>

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

      {/* Quick Tools */}
      {filteredQuickTools.length > 0 && (
        <section className="home-screen__section" aria-label="Quick Tools">
          <ToolCategory
            title="Quick Tools"
            tools={filteredQuickTools}
            showViewAll
            onViewAll={() => navigate('/tools')}
          />
        </section>
      )}

      {/* Convert */}
      {filteredConvertTools.length > 0 && (
        <section className="home-screen__section" aria-label="Convert">
          <ToolCategory
            title="Convert"
            tools={filteredConvertTools}
            showViewAll
            onViewAll={() => navigate('/tools')}
          />
        </section>
      )}

      {/* Edit & Organize */}
      {filteredEditTools.length > 0 && (
        <section className="home-screen__section" aria-label="Edit and Organize">
          <ToolCategory
            title="Edit &amp; Organize"
            tools={filteredEditTools}
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
                onClick={() => navigate(`/files`)}
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
                      window.open(url, '_blank');
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
                    Open
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
          <button className="home-screen__sheet-action" onClick={() => { setMoreSheetOpen(false); navigate('/files'); }}>
            Open
          </button>
          <button className="home-screen__sheet-action" onClick={() => { setMoreSheetOpen(false); }}>
            Share
          </button>
          <button className="home-screen__sheet-action home-screen__sheet-action--danger" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
